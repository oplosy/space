/* ------------------------------------------------------------------ *
 *  Spacecraft dynamics
 *  Test particles integrated with adaptive RK4 in the heliocentric
 *  frame under the Sun, eight planets, the Moon and Pluto (with the
 *  indirect term for the Sun's own acceleration).
 * ------------------------------------------------------------------ */
const PERTURB = ['mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].map(id => BY_ID[id]);
const PERT_GM = PERTURB.map(b => b.GM);
const PERT_R = PERTURB.map(b => b.eqRadius);
const ETA = 0.022;
const EPH_CACHE = new Map();
const _pv = new V3(), _pm = new V3();

function perturbers(jdTT) {
  let e = EPH_CACHE.get(jdTT);
  if (e) return e;
  e = new Float64Array(PERTURB.length * 3);
  for (let i = 0; i < PERTURB.length; i++) {
    const b = PERTURB[i];
    if (b.id === 'earth') {
      planetHelio('earth', jdTT, _pv); moonGeo(jdTT, _pm);
      e[i * 3] = _pv.x - _pm.x * MU_MOON; e[i * 3 + 1] = _pv.y - _pm.y * MU_MOON; e[i * 3 + 2] = _pv.z - _pm.z * MU_MOON;
      const j = i + 1; // moon follows earth
      e[j * 3] = _pv.x + _pm.x * (1 - MU_MOON); e[j * 3 + 1] = _pv.y + _pm.y * (1 - MU_MOON); e[j * 3 + 2] = _pv.z + _pm.z * (1 - MU_MOON);
      i++;
    } else {
      planetHelio(b.id, jdTT, _pv);
      e[i * 3] = _pv.x; e[i * 3 + 1] = _pv.y; e[i * 3 + 2] = _pv.z;
    }
  }
  if (EPH_CACHE.size > 12) EPH_CACHE.delete(EPH_CACHE.keys().next().value);
  EPH_CACHE.set(jdTT, e);
  return e;
}

/* derivative of state s at time jdTT → out (vx,vy,vz,ax,ay,az); returns local dynamical time [s] */
const HIT = { idx: -2, d: 0 };
function deriv(s, jdTT, out) {
  const px = s[0], py = s[1], pz = s[2];
  const r2 = px * px + py * py + pz * pz, r = Math.sqrt(r2);
  let k = -GM_SUN / (r2 * r);
  let ax = k * px, ay = k * py, az = k * pz;
  let tmin = Math.sqrt(r2 * r / GM_SUN);
  HIT.idx = r < 695700 ? -1 : -2;
  const e = perturbers(jdTT);
  for (let i = 0; i < PERTURB.length; i++) {
    const bx = e[i * 3], by = e[i * 3 + 1], bz = e[i * 3 + 2], GM = PERT_GM[i];
    const dx = bx - px, dy = by - py, dz = bz - pz;
    const d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
    const kk = GM / (d2 * d);
    const b2 = bx * bx + by * by + bz * bz, kb = GM / (b2 * Math.sqrt(b2));
    ax += kk * dx - kb * bx; ay += kk * dy - kb * by; az += kk * dz - kb * bz;
    const t = Math.sqrt(d2 * d / GM);
    if (t < tmin) tmin = t;
    if (d < PERT_R[i]) { HIT.idx = i; HIT.d = d; }
  }
  out[0] = s[3]; out[1] = s[4]; out[2] = s[5]; out[3] = ax; out[4] = ay; out[5] = az;
  return tmin;
}

const K1 = new Float64Array(6), K2 = new Float64Array(6), K3 = new Float64Array(6), K4 = new Float64Array(6), ST = new Float64Array(6);
function rk4(s, jdTT, h) {
  const hd = h / DAY;
  const tmin = deriv(s, jdTT, K1);
  for (let i = 0; i < 6; i++) ST[i] = s[i] + K1[i] * h * 0.5;
  deriv(ST, jdTT + hd * 0.5, K2);
  for (let i = 0; i < 6; i++) ST[i] = s[i] + K2[i] * h * 0.5;
  deriv(ST, jdTT + hd * 0.5, K3);
  for (let i = 0; i < 6; i++) ST[i] = s[i] + K3[i] * h;
  deriv(ST, jdTT + hd, K4);
  for (let i = 0; i < 6; i++) s[i] += h / 6 * (K1[i] + 2 * K2[i] + 2 * K3[i] + K4[i]);
  return tmin;
}

/* A propagating particle: { s: Float64Array(6), jd (TT), tmin, status } */
function stepTo(p, jdTarget, maxSteps, onStep) {
  let steps = 0;
  const dir = jdTarget >= p.jd ? 1 : -1;
  while ((jdTarget - p.jd) * dir > 1e-11 && steps < maxSteps && p.status === 'coast') {
    let h = ETA * p.tmin;
    if (h > 5 * DAY) h = 5 * DAY;
    if (h < 0.5) h = 0.5;
    const remain = (jdTarget - p.jd) * dir * DAY;
    if (h > remain) h = remain;
    p.tmin = rk4(p.s, p.jd, h * dir);
    p.jd += h * dir / DAY;
    steps++;
    deriv(p.s, p.jd, K1);          // refreshes HIT for the new position
    if (HIT.idx !== -2) { p.status = 'impact'; p.hit = HIT.idx === -1 ? BY_ID.sun : PERTURB[HIT.idx]; }
    if (onStep) onStep(p);
  }
  return steps;
}

/* Frame body: innermost sphere of influence containing the point */
function frameBodyFor(x, y, z, jdTT) {
  const e = perturbers(jdTT);
  let best = BY_ID.sun, bestSoi = Infinity;
  for (let i = 0; i < PERTURB.length; i++) {
    const b = PERTURB[i];
    const dx = e[i * 3] - x, dy = e[i * 3 + 1] - y, dz = e[i * 3 + 2] - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < b.soi && b.soi < bestSoi) { best = b; bestSoi = b.soi; }
  }
  return best;
}
function physAt(b, jdTT, out) {
  if (b.id === 'sun') return out.set(0, 0, 0);
  const i = PERTURB.indexOf(b);
  if (i >= 0) { const e = perturbers(jdTT); return out.set(e[i * 3], e[i * 3 + 1], e[i * 3 + 2]); }
  return helioPos(b, jdTT, out);
}

/* ------------------------------ Lambert (universal variables) ------------------------------ */
function stumpC(z) { if (z > 1e-6) { const s = Math.sqrt(z); return (1 - Math.cos(s)) / z; } if (z < -1e-6) { const s = Math.sqrt(-z); return (Math.cosh(s) - 1) / (-z); } return 0.5 - z / 24; }
function stumpS(z) { if (z > 1e-6) { const s = Math.sqrt(z); return (s - Math.sin(s)) / (s * s * s); } if (z < -1e-6) { const s = Math.sqrt(-z); return (Math.sinh(s) - s) / (s * s * s); } return 1 / 6 - z / 120; }
function lambert(r1, r2, tof, mu) {
  const R1 = r1.length(), R2 = r2.length();
  let dth = Math.acos(clamp(r1.dot(r2) / (R1 * R2), -1, 1));
  if (r1.z * r2.x - r1.x * r2.z < 0) dth = TAU - dth;       // prograde about +Y (ecliptic north)
  const A = Math.sin(dth) * Math.sqrt(R1 * R2 / (1 - Math.cos(dth)));
  if (!isFinite(A) || Math.abs(A) < 1e-6) return null;
  const smu = Math.sqrt(mu);
  const yf = z => R1 + R2 + A * (z * stumpS(z) - 1) / Math.sqrt(stumpC(z));
  const F = z => { const y = yf(z); if (y < 0) return -Infinity; return Math.pow(y / stumpC(z), 1.5) * stumpS(z) + A * Math.sqrt(y) - smu * tof; };
  let lo = -60, hi = 4 * Math.PI * Math.PI - 1e-7;
  if (F(lo) > 0) { lo = -600; if (F(lo) > 0) return null; }
  for (let i = 0; i < 90; i++) {
    const m = (lo + hi) / 2;
    if (F(m) < 0) lo = m; else hi = m;
  }
  const z = (lo + hi) / 2, y = yf(z);
  const f = 1 - y / R1, g = A * Math.sqrt(y / mu), gd = 1 - y / R2;
  const v1 = r2.clone().addScaledVector(r1, -f).multiplyScalar(1 / g);
  const v2 = r2.clone().multiplyScalar(gd).sub(r1).multiplyScalar(1 / g);
  return { v1, v2 };
}

function transferAt(origin, target, jdTT, tofDays) {
  const r1 = helioPos(origin, jdTT, new V3()), r2 = helioPos(target, jdTT + tofDays, new V3());
  const sol = lambert(r1, r2, tofDays * DAY, GM_SUN);
  if (!sol) return null;
  const vo = helioVel(origin, jdTT, new V3()), vt = helioVel(target, jdTT + tofDays, new V3());
  const vinf = sol.v1.clone().sub(vo), vinfArr = sol.v2.clone().sub(vt);
  return { jd: jdTT, tof: tofDays, vinf, vinfArr, c: vinf.length() };
}
function hohmannDays(origin, target) {
  const a = (origin.aKm + target.aKm) / 2;
  return Math.PI * Math.sqrt(a * a * a / GM_SUN) / DAY;
}
function bestTofAt(origin, target, jdTT) {
  const th = hohmannDays(origin, target);
  let best = null;
  for (let k = 0; k <= 24; k++) {
    const tof = th * (0.55 + k * 0.045);
    const t = transferAt(origin, target, jdTT, tof);
    if (t && (!best || t.c < best.c)) best = t;
  }
  if (!best) return null;
  // golden-section polish on TOF
  let a = best.tof - th * 0.045, b = best.tof + th * 0.045;
  for (let i = 0; i < 18; i++) {
    const m1 = a + (b - a) * 0.382, m2 = a + (b - a) * 0.618;
    const t1 = transferAt(origin, target, jdTT, m1), t2 = transferAt(origin, target, jdTT, m2);
    if ((t1 ? t1.c : 1e9) < (t2 ? t2.c : 1e9)) b = m2; else a = m1;
  }
  return transferAt(origin, target, jdTT, (a + b) / 2) || best;
}
function nextWindow(origin, target, jdTT) {
  const syn = 1 / Math.abs(1 / origin.periodDays - 1 / target.periodDays);
  const span = Math.min(syn * 1.15, 1200), step = Math.max(span / 200, 1);
  let best = null;
  for (let t = 0; t <= span; t += step) {
    const r = bestTofAt(origin, target, jdTT + t);
    if (r && (!best || r.c < best.c)) best = r;
  }
  if (!best) return null;
  let lo = best.jd - step, hi = best.jd + step;
  for (let i = 0; i < 16; i++) {
    const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618;
    const a = bestTofAt(origin, target, m1), b = bestTofAt(origin, target, m2);
    if ((a ? a.c : 1e9) < (b ? b.c : 1e9)) hi = m2; else lo = m1;
  }
  return bestTofAt(origin, target, Math.max(jdTT, (lo + hi) / 2)) || best;
}

/* ------------------------------ launch geometry ------------------------------ */
/* Plan: { origin, target?, alt, vinf?, trim:{pro,rad,nor}, phase (deg, free mode) } */
function launchState(plan, jdTT) {
  const o = plan.origin, mu = o.GM, rp = o.eqRadius + plan.alt;
  const rO = helioPos(o, jdTT, new V3()), vO = helioVel(o, jdTT, new V3());
  const rel = relPos(o, jdTT, new V3()), relV = relVel(o, jdTT, new V3());
  const hOrb = new V3().crossVectors(rel, relV).normalize();
  let p, n, vp;
  if (plan.vinf) {
    const vinf = plan.vinf.length(), vh = plan.vinf.clone().normalize();
    const ecc = 1 + rp * vinf * vinf / mu, th = Math.acos(-1 / ecc);
    n = hOrb.clone().addScaledVector(vh, -hOrb.dot(vh)).normalize();
    p = vh.clone().multiplyScalar(Math.cos(th)).addScaledVector(new V3().crossVectors(n, vh), -Math.sin(th));
    vp = Math.sqrt(vinf * vinf + 2 * mu / rp);
  } else {
    n = hOrb.clone();
    const x = relV.clone().normalize(), yv = new V3().crossVectors(n, x);
    const ph = plan.phase * DEG;
    p = x.multiplyScalar(Math.cos(ph)).addScaledVector(yv, Math.sin(ph));
    vp = Math.sqrt(mu / rp);
  }
  const t = new V3().crossVectors(n, p);
  const pos = rO.clone().addScaledVector(p, rp);
  const vel = vO.clone().addScaledVector(t, vp + plan.trim.pro).addScaledVector(p, plan.trim.rad).addScaledVector(n, plan.trim.nor);
  const vcirc = Math.sqrt(mu / rp);
  const dv = Math.hypot(vp + plan.trim.pro - vcirc, plan.trim.rad, plan.trim.nor);
  return { s: Float64Array.of(pos.x, pos.y, pos.z, vel.x, vel.y, vel.z), dv, vcirc, rp };
}

/* Propagate a plan and collect a polyline + closest approach to the target */
function predict(plan, jdTT, days, maxSteps = 70000) {
  const st = launchState(plan, jdTT);
  const p = { s: st.s, jd: jdTT, tmin: 60, status: 'coast' };
  const pts = [];
  let lastRec = -1e9, best = { d: Infinity, jd: 0 }, stop = false;
  const tgt = plan.target, tv = new V3();
  const record = q => {
    if ((q.jd - lastRec) * DAY >= q.tmin / 40) { pts.push(q.jd, q.s[0], q.s[1], q.s[2]); lastRec = q.jd; }
    if (tgt) {
      physAt(tgt, q.jd, tv);
      const d = Math.hypot(q.s[0] - tv.x, q.s[1] - tv.y, q.s[2] - tv.z);
      if (d < best.d) best = { d, jd: q.jd, miss: new V3(q.s[0] - tv.x, q.s[1] - tv.y, q.s[2] - tv.z) };
      else if (best.d < tgt.soi && d > best.d * 3 && q.jd > best.jd) stop = true;
    }
  };
  record(p);
  const end = jdTT + days;
  let steps = 0;
  while (p.jd < end && steps < maxSteps && p.status === 'coast' && !stop) steps += stepTo(p, end, Math.min(400, maxSteps - steps), record);
  pts.push(p.jd, p.s[0], p.s[1], p.s[2]);
  // Frame: the origin while the path stays bound to it, otherwise the Sun
  const o = plan.origin, ov = new V3();
  let escaped = false;
  for (let i = 0; i < pts.length; i += 4) {
    physAt(o, pts[i], ov);
    if (Math.hypot(pts[i + 1] - ov.x, pts[i + 2] - ov.y, pts[i + 3] - ov.z) > (o.soi || 1e9)) { escaped = true; break; }
  }
  return { pts, best, status: p.status, hit: p.hit, end: p.jd, frame: escaped ? (o.kind === 'moon' ? BY_ID.earth : BY_ID.sun) : o, launch: st, steps };
}

/* Differential correction of the departure asymptote to hit an aim radius at the target */
function refinePlan(plan, jdTT, aimR, iterations, onProgress) {
  return new Promise(resolve => {
    const days = plan.tof * 1.5;
    let it = 0;
    const once = () => {
      const base = predict(plan, jdTT, days, 60000);
      if (!base.best.miss) { resolve(base); return; }
      const d0 = base.best.miss.clone();
      const aim = d0.clone().normalize().multiplyScalar(aimR);
      const err = d0.clone().sub(aim);
      onProgress && onProgress(it, base.best.d);
      if (err.length() < aimR * 0.05 || it >= iterations) { resolve(base); return; }
      const J = [], h = 0.0004;
      for (let k = 0; k < 3; k++) {
        const v = plan.vinf.clone(); v.setComponent(k, v.getComponent(k) + h);
        const r = predict(Object.assign({}, plan, { vinf: v }), jdTT, days, 60000);
        const dm = r.best.miss ? r.best.miss.clone() : d0.clone();
        J.push(dm.sub(d0).multiplyScalar(1 / h));
      }
      // damped least squares: (JᵀJ + λI) Δ = −Jᵀ err
      const M = new THREE.Matrix3(), JT = [[J[0].x, J[0].y, J[0].z], [J[1].x, J[1].y, J[1].z], [J[2].x, J[2].y, J[2].z]];
      const JTJ = [0, 1, 2].map(i => [0, 1, 2].map(j => JT[i][0] * JT[j][0] + JT[i][1] * JT[j][1] + JT[i][2] * JT[j][2]));
      const lam = 1e-6 * (JTJ[0][0] + JTJ[1][1] + JTJ[2][2]);
      M.set(JTJ[0][0] + lam, JTJ[0][1], JTJ[0][2], JTJ[1][0], JTJ[1][1] + lam, JTJ[1][2], JTJ[2][0], JTJ[2][1], JTJ[2][2] + lam);
      const rhs = new V3(-(JT[0][0] * err.x + JT[0][1] * err.y + JT[0][2] * err.z), -(JT[1][0] * err.x + JT[1][1] * err.y + JT[1][2] * err.z), -(JT[2][0] * err.x + JT[2][1] * err.y + JT[2][2] * err.z));
      const delta = rhs.applyMatrix3(M.invert());
      if (delta.length() > 0.5) delta.setLength(0.5);
      plan.vinf.add(delta);
      it++;
      setTimeout(once, 0);
    };
    setTimeout(once, 30);
  });
}

/* ------------------------------ probes in flight ------------------------------ */
const PROBES = [];
let probeSerial = 0;
const TRAIL_MAX = 5000;

function makeTrailLine(color, dash) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3 * 2), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aFade', new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 2), 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: linColor(color) }, uOpacity: { value: 0.9 }, uDash: { value: dash } },
    vertexShader: VERT_LINE, fragmentShader: FRAG_LINE, transparent: true, depthWrite: false,
  });
  const line = new THREE.Line(g, mat);
  line.frustumCulled = false; line.renderOrder = 7; line.visible = false;
  scene.add(line);
  return line;
}

function makeSpacecraft() {
  const g = new THREE.Group();
  const foil = new THREE.MeshStandardMaterial({ color: 0xC89B3C, metalness: 1.0, roughness: 0.32 });
  const white = new THREE.MeshStandardMaterial({ color: 0xE8E8E4, metalness: 0.1, roughness: 0.6 });
  const cell = new THREE.MeshStandardMaterial({ color: 0x1B2A55, metalness: 0.6, roughness: 0.25, emissive: 0x020410 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2A2A2E, metalness: 0.5, roughness: 0.5 });
  const m = 0.001; // metres → km
  const bus = new THREE.Mesh(new THREE.BoxGeometry(2.2 * m, 1.8 * m, 2.2 * m), foil); g.add(bus);
  g.userData.panels = [];
  for (const s of [-1, 1]) {
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * m, 0.05 * m, 1.6 * m, 8), dark);
    boom.rotation.z = Math.PI / 2; boom.position.x = s * 1.9 * m; g.add(boom);
    const wing = new THREE.Group(); wing.position.x = s * 5.7 * m;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(6 * m, 0.06 * m, 2.1 * m), cell);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.1 * m, 0.04 * m, 2.2 * m), dark); frame.position.y = -0.04 * m;
    wing.add(panel, frame); g.add(wing); g.userData.panels.push(wing);
  }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.6 * m, 32, 12, 0, TAU, 0, 0.55), white);
  dish.material.side = THREE.DoubleSide;
  dish.rotation.x = Math.PI; dish.position.y = 2.35 * m; g.add(dish);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * m, 0.1 * m, 1.1 * m, 8), white); feed.position.y = 1.7 * m; g.add(feed);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.45 * m, 0.9 * m, 16, 1, true), dark); nozzle.position.y = -1.3 * m; g.add(nozzle);
  g.visible = false;
  scene.add(g);
  return g;
}
const SUN_LIGHT = new THREE.DirectionalLight(0xfff6ec, 3.2);
scene.add(SUN_LIGHT, SUN_LIGHT.target, new THREE.AmbientLight(0x404858, 0.15));

function launchProbe(plan, jdTT) {
  const st = launchState(plan, jdTT);
  const id = 'probe' + (++probeSerial);
  const pr = {
    id, name: `Probe ${probeSerial}`, kind: 'probe', plan: Object.assign({}, plan, { vinf: plan.vinf && plan.vinf.clone(), trim: Object.assign({}, plan.trim) }),
    p: { s: st.s, jd: jdTT, tmin: 30, status: 'coast' },
    launchJd: jdTT, dv: st.dv,
    trail: new Float64Array(TRAIL_MAX * 4), rel: new Float32Array(TRAIL_MAX * 3), trailN: 0, trailHead: 0, lastRec: -1e9,
    frame: plan.origin,
    phys: new V3(st.s[0], st.s[1], st.s[2]), disp: new V3(), dispR: 0.006, eqRadius: 0.006, radius: 0.006,
    color: '#8FD3FF', screen: { x: 0, y: 0, r: 0, vis: false, depth: 0 },
    line: makeTrailLine('#8FD3FF', 0), craft: makeSpacecraft(),
  };
  recordTrail(pr, pr.p);
  PROBES.push(pr);
  return pr;
}
const _rv = new V3();
function recordTrail(pr, q) {
  if (Math.abs(q.jd - pr.lastRec) * DAY < q.tmin / 40) return;
  const i = pr.trailHead;
  pr.trail[i * 4] = q.jd; pr.trail[i * 4 + 1] = q.s[0]; pr.trail[i * 4 + 2] = q.s[1]; pr.trail[i * 4 + 3] = q.s[2];
  physAt(pr.frame, q.jd, _rv);
  pr.rel[i * 3] = q.s[0] - _rv.x; pr.rel[i * 3 + 1] = q.s[1] - _rv.y; pr.rel[i * 3 + 2] = q.s[2] - _rv.z;
  pr.trailHead = (i + 1) % TRAIL_MAX;
  pr.trailN = Math.min(pr.trailN + 1, TRAIL_MAX);
  pr.lastRec = q.jd;
}
const _cv = new V3();
function trackClosest(pr, q) {
  const t = pr.plan.target;
  if (!t) return;
  physAt(t, q.jd, _cv);
  const d = Math.hypot(q.s[0] - _cv.x, q.s[1] - _cv.y, q.s[2] - _cv.z);
  if (!pr.closest || d < pr.closest.d) pr.closest = { d, jd: q.jd };
}
function reframeTrail(pr, frame) {
  pr.frame = frame;
  for (let k = 0; k < pr.trailN; k++) {
    const i = (pr.trailHead - pr.trailN + k + TRAIL_MAX) % TRAIL_MAX;
    physAt(frame, pr.trail[i * 4], _rv);
    pr.rel[i * 3] = pr.trail[i * 4 + 1] - _rv.x; pr.rel[i * 3 + 1] = pr.trail[i * 4 + 2] - _rv.y; pr.rel[i * 3 + 2] = pr.trail[i * 4 + 3] - _rv.z;
  }
}
function removeProbe(pr) {
  scene.remove(pr.line, pr.craft);
  pr.line.geometry.dispose();
  PROBES.splice(PROBES.indexOf(pr), 1);
}

/* Advance every probe to jdTT. Returns the TT date actually reached (clock is held back if the integrator falls behind). */
function advanceProbes(jdTT, budget = 2600) {
  let reached = jdTT;
  for (const pr of PROBES) {
    const q = pr.p;
    if (q.status !== 'coast') continue;
    if (jdTT < pr.launchJd) { // rewound past launch: reset to launch state
      const st = launchState(pr.plan, pr.launchJd);
      q.s.set(st.s); q.jd = pr.launchJd; q.tmin = 30; pr.trailN = 0; pr.trailHead = 0; pr.lastRec = -1e9;
      continue;
    }
    if (jdTT < q.jd) { // time reversed: step back and drop newer trail points
      stepTo(q, jdTT, budget, null);
      while (pr.trailN > 0) {
        const last = (pr.trailHead - 1 + TRAIL_MAX) % TRAIL_MAX;
        if (pr.trail[last * 4] <= q.jd) break;
        pr.trailHead = last; pr.trailN--;
      }
      pr.lastRec = pr.trailN ? pr.trail[((pr.trailHead - 1 + TRAIL_MAX) % TRAIL_MAX) * 4] : -1e9;
    } else {
      stepTo(q, jdTT, budget, qq => { recordTrail(pr, qq); trackClosest(pr, qq); });
    }
    if (q.status === 'coast' && Math.abs(q.jd - jdTT) > 1e-9) reached = jdTT > q.jd ? Math.min(reached, q.jd) : Math.max(reached, q.jd);
  }
  return reached;
}

/* ------------------------------ drawing trajectories ------------------------------ */
const PREVIEW = { line: null, rel: null, n: 0, frame: null, result: null };
function initPreview() { PREVIEW.line = makeTrailLine('#FFC46B', 90); PREVIEW.line.material.uniforms.uOpacity.value = 0.95; }

function setPreview(result) {
  PREVIEW.result = result;
  if (!result) { PREVIEW.n = 0; PREVIEW.line.visible = false; return; }
  const pts = result.pts, n = Math.min(pts.length / 4, TRAIL_MAX * 2 - 1), stride = (pts.length / 4) / n;
  const rel = new Float32Array(n * 3), fv = new V3();
  for (let k = 0; k < n; k++) {
    const i = Math.min(Math.round(k * stride), pts.length / 4 - 1) * 4;
    physAt(result.frame, pts[i], fv);
    rel[k * 3] = pts[i + 1] - fv.x; rel[k * 3 + 1] = pts[i + 2] - fv.y; rel[k * 3 + 2] = pts[i + 3] - fv.z;
  }
  Object.assign(PREVIEW, { rel, n, frame: result.frame });
}

const _fn = new V3();
/* Upload a relative polyline; `ring` describes a ring buffer (head, count, capacity) or null for a flat array */
function writeLine(line, rel, count, ring, frame, origin, head) {
  const posA = line.geometry.attributes.position, fadeA = line.geometry.attributes.aFade;
  const P = posA.array, F = fadeA.array;
  const n = Math.min(count, P.length / 3 - 1);
  for (let k = 0; k < n; k++) {
    const i = ring ? (ring.head - n + k + ring.cap) % ring.cap : k;
    P[k * 3] = rel[i * 3]; P[k * 3 + 1] = rel[i * 3 + 1]; P[k * 3 + 2] = rel[i * 3 + 2];
  }
  let m = n;
  if (head) {
    physAt(frame, STATE.jd + TT_MINUS_UTC, _fn);
    P[m * 3] = head.x - _fn.x; P[m * 3 + 1] = head.y - _fn.y; P[m * 3 + 2] = head.z - _fn.z; m++;
  }
  for (let i = 0; i < m; i++) F[i] = head ? (m - 1 - i) / Math.max(m - 1, 1) * 0.85 : i / Math.max(m - 1, 1);
  posA.needsUpdate = true; fadeA.needsUpdate = true;
  line.geometry.setDrawRange(0, m);
  line.position.copy(frame.disp).sub(origin);
}
