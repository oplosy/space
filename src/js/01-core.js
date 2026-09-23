import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// @@DATA@@  (build.py injects ASSETS, STAR_DATA and SKY_DATA here)

/* ------------------------------------------------------------------ *
 *  Constants & frames
 *  Scene frame: J2000 ecliptic, rotated so +Y is the north ecliptic
 *  pole. 1 scene unit = 1 km. Positions are kept in float64 on the
 *  CPU and re-based on the camera focus every frame (floating origin).
 * ------------------------------------------------------------------ */
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const AU = 149597870.7;
const LY = 9460730472580.8;
const J2000 = 2451545.0;
const DAY = 86400;
const C_KMS = 299792.458;
const TT_MINUS_UTC = 69.184 / DAY;            // TT − UTC (s → d), valid 2017+
const OBL = 23.4392911 * DEG;
const COS_OBL = Math.cos(OBL), SIN_OBL = Math.sin(OBL);
const V3 = THREE.Vector3;

function eclToScene(x, y, z, out) { return out.set(x, z, -y); }
function equToScene(x, y, z, out) {
  const ye = y * COS_OBL + z * SIN_OBL;
  const ze = -y * SIN_OBL + z * COS_OBL;
  return out.set(x, ze, -ye);
}
function raDecToScene(raDeg, decDeg, out) {
  const a = raDeg * DEG, d = decDeg * DEG, cd = Math.cos(d);
  return equToScene(cd * Math.cos(a), cd * Math.sin(a), Math.sin(d), out);
}
const EQ_X = equToScene(1, 0, 0, new V3());
const EQ_Z = equToScene(0, 0, 1, new V3());

const jdFromMs = ms => ms / 86400000 + 2440587.5;
const msFromJd = jd => (jd - 2440587.5) * 86400000;

/* Kepler's equation, robust for 0 ≤ e < 1 */
function solveKepler(M, e) {
  M = M % TAU;
  if (M > Math.PI) M -= TAU; else if (M < -Math.PI) M += TAU;
  let E = e < 0.8 ? M : (M >= 0 ? Math.PI : -Math.PI);
  for (let i = 0; i < 50; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-13) break;
  }
  return E;
}

function orbitalToScene(xp, yp, I, Om, w, out) {
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om);
  const cI = Math.cos(I), sI = Math.sin(I);
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
  const z = (sw * sI) * xp + (cw * sI) * yp;
  return eclToScene(x, y, z, out);
}

function keplerToScene(a, e, I, Om, w, M, out) {
  const E = solveKepler(M, e);
  return orbitalToScene(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), I, Om, w, out);
}

/* ------------------------------ formatting ------------------------------ */
const pad = (n, w = 2) => String(n).padStart(w, '0');
function fmtUTC(jd) {
  const d = new Date(msFromJd(jd));
  if (isNaN(d)) return '—';
  const y = d.getUTCFullYear();
  const ys = y < 0 ? '−' + pad(-y, 4) : pad(y, 4);
  return `${ys}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
function fmtDateShort(jd) {
  const d = new Date(msFromJd(jd));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
const nf = (v, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
function fmtDist(km) {
  const a = Math.abs(km);
  if (a >= 1e9 * LY) return nf(km / LY / 1e9, 2) + ' billion ly';
  if (a >= 1e6 * LY) return nf(km / LY / 1e6, 2) + ' million ly';
  if (a >= 0.05 * LY) return nf(km / LY, a >= 100 * LY ? 0 : 2) + ' ly';
  if (a >= 0.1 * AU) return nf(km / AU, a >= 10 * AU ? 2 : 4) + ' AU';
  if (a >= 1e6) return nf(km / 1e6, 2) + ' M km';
  if (a >= 100) return nf(km, 0) + ' km';
  if (a >= 1) return nf(km, 1) + ' km';
  return nf(km * 1000, 0) + ' m';
}
function fmtDuration(sec) {
  const s = Math.abs(sec);
  if (s < 60) return nf(s, 1) + ' s';
  if (s < 3600) return `${Math.floor(s / 60)} min ${pad(Math.floor(s % 60))} s`;
  if (s < 86400 * 2) return `${Math.floor(s / 3600)} h ${pad(Math.floor((s % 3600) / 60))} min`;
  if (s < 86400 * 730) return nf(s / 86400, 1) + ' days';
  return nf(s / (86400 * 365.25), 2) + ' years';
}
function fmtSpeed(kms) { return Math.abs(kms) < 1 ? nf(kms * 1000, 1) + ' m/s' : nf(kms, 3) + ' km/s'; }
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = x => x * x * (3 - 2 * x);
const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
