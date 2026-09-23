/* ------------------------------------------------------------------ *
 *  Ephemerides. All functions take a TT Julian date and return
 *  physical positions in km in the scene frame.
 * ------------------------------------------------------------------ */
const _eA = new V3(), _eB = new V3(), _e1 = new V3(), _e2 = new V3(), _e3 = new V3();

function planetHelio(key, jdTT, out) {
  const el = JPL[key], T = (jdTT - J2000) / 36525;
  const a = (el[0] + el[1] * T) * AU, e = el[2] + el[3] * T, I = (el[4] + el[5] * T) * DEG;
  const L = (el[6] + el[7] * T) * DEG, vp = (el[8] + el[9] * T) * DEG, Om = (el[10] + el[11] * T) * DEG;
  return keplerToScene(a, e, I, Om, vp - Om, L - vp, out);
}

/* Geocentric Moon — Meeus, Astronomical Algorithms ch. 47 (main terms), ecliptic of date → J2000 */
function moonGeo(jdTT, out) {
  const T = (jdTT - J2000) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = (297.8501921 + 445267.1114034 * T) * DEG;
  const M = (357.5291092 + 35999.0502909 * T) * DEG;
  const Mp = (134.9633964 + 477198.8675055 * T) * DEG;
  const F = (93.2720950 + 483202.0175233 * T) * DEG;
  const E = 1 - 0.002516 * T;
  const s = Math.sin, c = Math.cos;
  const lon = Lp + 6.288774 * s(Mp) + 1.274027 * s(2 * D - Mp) + 0.658314 * s(2 * D) + 0.213618 * s(2 * Mp)
    - 0.185116 * E * s(M) - 0.114332 * s(2 * F) + 0.058793 * s(2 * D - 2 * Mp) + 0.057066 * E * s(2 * D - M - Mp)
    + 0.053322 * s(2 * D + Mp) + 0.045758 * E * s(2 * D - M) - 0.040923 * E * s(M - Mp) - 0.034720 * s(D)
    - 0.030383 * E * s(M + Mp) + 0.015327 * s(2 * D - 2 * F) - 0.012528 * s(Mp + 2 * F) + 0.010980 * s(Mp - 2 * F)
    + 0.010675 * s(4 * D - Mp) + 0.010034 * s(3 * Mp) + 0.008548 * s(4 * D - 2 * Mp) - 0.007888 * E * s(2 * D + M - Mp)
    - 0.006766 * E * s(2 * D + M) - 0.005163 * s(D - Mp) + 0.004987 * E * s(D + M) + 0.004036 * E * s(2 * D - M + Mp);
  const lat = 5.128122 * s(F) + 0.280602 * s(Mp + F) + 0.277693 * s(Mp - F) + 0.173237 * s(2 * D - F)
    + 0.055413 * s(2 * D - Mp + F) + 0.046271 * s(2 * D - Mp - F) + 0.032573 * s(2 * D + F) + 0.017198 * s(2 * Mp + F)
    + 0.009266 * s(2 * D + Mp - F) + 0.008822 * s(2 * Mp - F);
  const r = 385000.56 - 20905.355 * c(Mp) - 3699.111 * c(2 * D - Mp) - 2955.968 * c(2 * D) - 569.925 * c(2 * Mp)
    + 48.888 * E * c(M) - 3.149 * c(2 * F) + 246.158 * c(2 * D - 2 * Mp) - 152.138 * E * c(2 * D - M - Mp)
    - 170.733 * c(2 * D + Mp) - 204.586 * E * c(2 * D - M) - 129.620 * E * c(M - Mp) + 108.743 * c(D)
    + 104.755 * E * c(M + Mp) + 10.321 * c(2 * D - 2 * F) + 79.661 * c(Mp - 2 * F) - 34.782 * c(4 * D - Mp)
    - 23.210 * c(3 * Mp) - 21.636 * c(4 * D - 2 * Mp) + 24.208 * E * c(2 * D + M - Mp) + 30.824 * E * c(2 * D + M)
    - 8.379 * c(D - Mp) - 16.675 * E * c(D + M) - 12.831 * E * c(2 * D - M + Mp);
  const L = (lon - 1.3969713 * T) * DEG, B = lat * DEG, cb = Math.cos(B);
  return eclToScene(r * cb * Math.cos(L), r * cb * Math.sin(L), r * Math.sin(B), out);
}

/* Non-rotating equatorial frame of a body from its IAU pole: E1 = node Q, E2 = pole × Q, E3 = pole */
function equatorFrame(b, jdTT, E1, E2, E3) {
  const T = (jdTT - J2000) / 36525, p = b.pole;
  const ra = (p[0] + p[1] * T) * DEG, de = p[2] + p[3] * T;
  raDecToScene(ra / DEG, de, E3);
  equToScene(-Math.sin(ra), Math.cos(ra), 0, E1);
  E2.crossVectors(E3, E1);
}

function circPos(b, jdTT, out) {
  const o = b.orbit;
  equatorFrame(BY_ID[b.parent], jdTT, _e1, _e2, _e3);
  const u = (o.L0 + 360 * (jdTT - J2000) / o.P) * DEG;
  const Om = o.node * DEG, inc = o.i * DEG;
  const cO = Math.cos(Om), sO = Math.sin(Om), ci = Math.cos(inc), si = Math.sin(inc);
  const cu = Math.cos(u) * o.a, su = Math.sin(u) * o.a;
  const x = cu * cO - su * ci * sO, y = cu * sO + su * ci * cO, z = su * si;
  return out.set(0, 0, 0).addScaledVector(_e1, x).addScaledVector(_e2, y).addScaledVector(_e3, z);
}

function cometPos(b, jdTT, out) {
  const c = b.comet, a = c.q / (1 - c.e);
  const M = Math.sqrt(GM_SUN / (a * a * a)) * (jdTT - c.tp) * DAY;
  return keplerToScene(a, c.e, c.i * DEG, c.node * DEG, c.peri * DEG, M, out);
}

/* Position relative to the parent body (heliocentric for planets). */
function relPos(b, jdTT, out) {
  switch (b.eph) {
    case 'sun': return out.set(0, 0, 0);
    case 'jpl':
      planetHelio(b.id, jdTT, out);
      if (b.id === 'earth') out.addScaledVector(moonGeo(jdTT, _eA), -MU_MOON);          // EMB → Earth
      else if (b.id === 'pluto') out.addScaledVector(circPos(BY_ID.charon, jdTT, _eA), -CHARON_FRAC); // barycentre → Pluto
      return out;
    case 'moon': return moonGeo(jdTT, out);
    case 'circ': return circPos(b, jdTT, out);
    case 'comet': return cometPos(b, jdTT, out);
  }
  return out.set(0, 0, 0);
}

function helioPos(b, jdTT, out) {
  relPos(b, jdTT, out);
  let p = b.parent ? BY_ID[b.parent] : null;
  while (p) { out.add(relPos(p, jdTT, _eB)); p = p.parent ? BY_ID[p.parent] : null; }
  return out;
}

function helioVel(b, jdTT, out) {
  const h = 20 / DAY;
  helioPos(b, jdTT + h, out);
  const t = helioPos(b, jdTT - h, new V3());
  return out.sub(t).multiplyScalar(1 / 40);
}
function relVel(b, jdTT, out) {
  const h = 20 / DAY;
  relPos(b, jdTT + h, out);
  const t = relPos(b, jdTT - h, new V3());
  return out.sub(t).multiplyScalar(1 / 40);
}

/* Orientation of the body-fixed frame (+X prime meridian, +Y north pole). */
const _oX = new V3(), _oY = new V3(), _oZ = new V3(), _oM = new THREE.Matrix4();
function bodyOrientation(b, jdTT, quatOut, poleOut) {
  if (b.tidal) {
    relPos(b, jdTT, _eA);
    relPos(b, jdTT + 0.002 * b.periodDays, _eB);
    _oY.crossVectors(_eA, _eB).normalize();
    _oX.copy(_eA).negate().normalize();
    _oX.addScaledVector(_oY, -_oX.dot(_oY)).normalize();
  } else {
    equatorFrame(b, jdTT, _e1, _e2, _oY);
    const W = ((b.W[0] + b.W[1] * (jdTT - J2000)) % 360) * DEG;
    _oX.copy(_e1).multiplyScalar(Math.cos(W)).addScaledVector(_e2, Math.sin(W));
  }
  _oZ.crossVectors(_oX, _oY);
  _oM.makeBasis(_oX, _oY, _oZ);
  quatOut.setFromRotationMatrix(_oM);
  if (poleOut) poleOut.copy(_oY);
}

/* Display scaling: bodies can be enlarged; moon distances grow with √s so systems stay readable. */
function scaledOffset(parentR, s, rel, out) {
  if (s === 1) return out.copy(rel);
  const d = rel.length();
  if (d === 0) return out.set(0, 0, 0);
  const dd = parentR * s + Math.max(d - parentR, 0) * Math.sqrt(s);
  return out.copy(rel).multiplyScalar(dd / d);
}
