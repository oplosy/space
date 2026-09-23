/* ------------------------------------------------------------------ *
 *  Voyager 1 & 2 on their real routes, the heliopause, and the
 *  TRAPPIST-1 planetary system
 * ------------------------------------------------------------------ */

/* ------------------------------ Voyager ------------------------------ */
const CRAFTS = [];
const jdU = (y, m, d, h = 12, mi = 0) => jdFromMs(Date.UTC(y, m - 1, d, h, mi));
// Flybys: [planet, UTC date, closest approach from the planet's centre in km]. The route after the last
// flyby is pinned to the probe's measured position on 2025-01-01 (JPL/NASA).
const VOYAGER_CAT = [
  { id: 'voyager1', name: 'Voyager 1', color: '#9FE3FF', launch: jdU(1977, 9, 5, 12, 56),
    flybys: [['jupiter', jdU(1979, 3, 5, 12, 5), 348890], ['saturn', jdU(1980, 11, 12, 23, 46), 184300]],
    now: { jd: jdU(2025, 1, 1, 0), ra: 258.0, dec: 12.1, r: 165.8 }, hp: jdU(2012, 8, 25), hpR: 121.6,
    blurb: 'The most distant human-made object. After Jupiter and a close pass of Titan at Saturn it was flung north out of the planets’ plane, crossed the heliopause in August 2012 and now flies through interstellar space, still sending data with a 22-watt transmitter.',
    facts: [['Launched', '5 Sep 1977, Titan IIIE'], ['Mass', '722 kg'], ['Power', 'Three plutonium RTGs'], ['Jupiter flyby', '5 Mar 1979'], ['Saturn flyby', '12 Nov 1980'], ['Pale Blue Dot', '14 Feb 1990, from 40 AU'], ['Heliopause', '25 Aug 2012 at 121.6 AU'], ['Golden Record', 'Sounds and images of Earth']] },
  { id: 'voyager2', name: 'Voyager 2', color: '#B8F0C8', launch: jdU(1977, 8, 20, 14, 29),
    flybys: [['jupiter', jdU(1979, 7, 9, 22, 29), 721670], ['saturn', jdU(1981, 8, 26, 3, 24), 161000], ['uranus', jdU(1986, 1, 24, 17, 59), 107000], ['neptune', jdU(1989, 8, 25, 3, 56), 29240]],
    now: { jd: jdU(2025, 1, 1, 0), ra: 300.1, dec: -58.9, r: 138.8 }, hp: jdU(2018, 11, 5), hpR: 119.0,
    blurb: 'The only spacecraft to have visited Uranus and Neptune, riding a planetary alignment that recurs every 175 years. After skimming Neptune’s north pole it headed south of the ecliptic and crossed the heliopause in November 2018.',
    facts: [['Launched', '20 Aug 1977, Titan IIIE'], ['Mass', '722 kg'], ['Power', 'Three plutonium RTGs'], ['Jupiter flyby', '9 Jul 1979'], ['Saturn flyby', '26 Aug 1981'], ['Uranus flyby', '24 Jan 1986'], ['Neptune flyby', '25 Aug 1989'], ['Heliopause', '5 Nov 2018 at 119 AU']] },
];

// Heliocentric two-body RK4 between Lambert-solved waypoints; samples are denser near each flyby
function buildCraftRoute(c) {
  const TT = TT_MINUS_UTC, wp = [{ jd: c.launch + TT, p: physAt(BY_ID.earth, c.launch + TT, new V3()) }];
  for (const [id, jd, off] of c.flybys) {
    const b = BY_ID[id], p = physAt(b, jd + TT, new V3());
    p.addScaledVector(p.clone().negate().normalize(), off);         // pass on the sunward side at the real range
    wp.push({ jd: jd + TT, p, body: b, off, jdU: jd });
  }
  wp.push({ jd: c.now.jd + TT, p: raDecToScene(c.now.ra, c.now.dec, new V3()).multiplyScalar(c.now.r * AU) });
  const J = [], P = [];
  let vEnd = new V3();
  const acc = (x, o) => { const r = x.length(); return o.copy(x).multiplyScalar(-GM_SUN / (r * r * r)); };
  const x = new V3(), v = new V3(), k = [new V3(), new V3(), new V3(), new V3(), new V3(), new V3(), new V3(), new V3()], t = new V3();
  for (let i = 0; i < wp.length - 1; i++) {
    const a = wp[i], b = wp[i + 1], T = (b.jd - a.jd) * DAY;
    const lam = lambert(a.p, b.p, T, GM_SUN);
    const N = 4000, raw = [];
    if (lam) {
      x.copy(a.p); v.copy(lam.v1);
      let tPrev = 0;
      for (let s = 0; s <= N; s++) {
        const tn = T * (1 - Math.cos(Math.PI * s / N)) / 2, h = tn - tPrev;
        if (s > 0) {                                                    // RK4 for x'' = −GM x / r³
          acc(x, k[0]); k[1].copy(v);
          t.copy(x).addScaledVector(k[1], h / 2); acc(t, k[2]); k[3].copy(v).addScaledVector(k[0], h / 2);
          t.copy(x).addScaledVector(k[3], h / 2); acc(t, k[4]); k[5].copy(v).addScaledVector(k[2], h / 2);
          t.copy(x).addScaledVector(k[5], h); acc(t, k[6]); k[7].copy(v).addScaledVector(k[4], h);
          x.addScaledVector(k[1].add(k[3].multiplyScalar(2)).add(k[5].multiplyScalar(2)).add(k[7]), h / 6);
          v.addScaledVector(k[0].add(k[2].multiplyScalar(2)).add(k[4].multiplyScalar(2)).add(k[6]), h / 6);
        }
        tPrev = tn;
        if (s % 8 === 0) raw.push([tn, x.clone()]);
      }
      vEnd.copy(lam.v2);
    } else {
      for (let s = 0; s <= 500; s++) raw.push([T * s / 500, a.p.clone().lerp(b.p, s / 500)]);
      vEnd.copy(b.p).sub(a.p).multiplyScalar(1 / T);
    }
    const err = b.p.clone().sub(raw[raw.length - 1][1]);                // close the small integration error
    for (let s = i ? 1 : 0; s < raw.length; s++) {
      const [tn, p] = raw[s];
      J.push(a.jd + tn / DAY); P.push(p.addScaledVector(err, tn / T));
    }
  }
  c.J = Float64Array.from(J);
  c.P = new Float64Array(P.length * 3);
  c.rel = new Float32Array(P.length * 3);
  P.forEach((p, i) => { c.P.set([p.x, p.y, p.z], i * 3); c.rel.set([p.x, p.y, p.z], i * 3); });
  c.vEnd = vEnd;
  c.wp = wp;
}
function craftAt(c, jdTT, out) {
  const J = c.J, P = c.P, n = J.length;
  if (jdTT <= J[0]) return out.set(P[0], P[1], P[2]);
  if (jdTT >= J[n - 1]) { const dt = (jdTT - J[n - 1]) * DAY, i = (n - 1) * 3; return out.set(P[i] + c.vEnd.x * dt, P[i + 1] + c.vEnd.y * dt, P[i + 2] + c.vEnd.z * dt); }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (J[m] <= jdTT) lo = m; else hi = m; }
  const f = (jdTT - J[lo]) / (J[hi] - J[lo]), a = lo * 3, b = hi * 3;
  return out.set(P[a] + (P[b] - P[a]) * f, P[a + 1] + (P[b + 1] - P[a + 1]) * f, P[a + 2] + (P[b + 2] - P[a + 2]) * f);
}

function makeVoyagerModel() {
  const g = new THREE.Group(), m = 0.001;                               // metres → km
  const white = new THREE.MeshStandardMaterial({ color: 0xE6E4DE, metalness: 0.1, roughness: 0.55, side: THREE.DoubleSide });
  const foil = new THREE.MeshStandardMaterial({ color: 0x5A4A30, metalness: 0.9, roughness: 0.4 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x33302C, metalness: 0.6, roughness: 0.5 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xD4A94A, metalness: 1, roughness: 0.25 });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x * m, y * m, z * m); o.rotation.set(rx, 0, rz); g.add(o); return o; };
  add(new THREE.CylinderGeometry(0.95 * m, 0.95 * m, 0.47 * m, 10), foil, 0, 0, 0);                         // ten-sided bus
  add(new THREE.SphereGeometry(2.6 * m, 40, 10, 0, TAU, 0, 0.78), white, 0, 3.35, 0, Math.PI);              // 3.7 m high-gain dish
  add(new THREE.CylinderGeometry(0.05 * m, 0.05 * m, 1.3 * m, 6), dark, 0, 1.05, 0);
  add(new THREE.CylinderGeometry(0.035 * m, 0.035 * m, 3.2 * m, 6), dark, -2.5, -0.1, 0, 0, Math.PI / 2);   // RTG boom
  for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.2 * m, 0.2 * m, 0.5 * m, 12), dark, -2.4 - i * 0.55, -0.1, 0, 0, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.035 * m, 0.035 * m, 2.4 * m, 6), dark, 2.1, -0.1, 0, 0, Math.PI / 2);    // science boom
  add(new THREE.BoxGeometry(0.7 * m, 0.55 * m, 0.55 * m), gold, 3.4, -0.1, 0);                               // scan platform
  add(new THREE.CylinderGeometry(0.015 * m, 0.015 * m, 13 * m, 4), dark, 0, 0.1, -6.8, Math.PI / 2);         // magnetometer boom
  add(new THREE.CylinderGeometry(0.4 * m, 0.4 * m, 0.02 * m, 20), gold, 0.99, 0, 0, 0, Math.PI / 2);         // Golden Record
  g.visible = false;
  scene.add(g);
  return g;
}

for (const c of VOYAGER_CAT) {
  CRAFTS.push(Object.assign({ kind: 'craft', short: c.name, subtitle: 'Spacecraft · launched 1977', dispR: 0.002, radius: 0, children: [], screen: {},
    phys: new V3(), disp: new V3(), minD: 0.008, defD: 0.03 }, c));
}

function buildCrafts() {
  for (const c of CRAFTS) {
    buildCraftRoute(c);
    c.line = makeTrailLine(c.color, 0);
    c.line.material.uniforms.uOpacity.value = 0.75;
    c.model = makeVoyagerModel();
  }
  buildHeliopause();
}

const _cq = new V3(), _cq2 = new V3();
function updateCraftPositions(jdTT) {
  for (const c of CRAFTS) {
    craftAt(c, jdTT, c.phys);
    c.disp.copy(c.phys);
    c.hidden = jdTT < c.J[0];
  }
}
function updateCrafts(O) {
  const jdTT = STATE.jd + TT_MINUS_UTC;
  for (const c of CRAFTS) {
    let n = 0;
    while (n < c.J.length && c.J[n] <= jdTT) n++;
    writeLine(c.line, c.rel, n, null, BY_ID.sun, O, c.hidden ? null : c.phys);
    c.line.visible = !c.hidden && (STATE.show.orbits || CAM.target === c);
    const g = c.model;
    g.position.copy(c.disp).sub(O);
    g.visible = !c.hidden && g.position.distanceTo(camera.position) < 400;
    if (g.visible) g.quaternion.setFromUnitVectors(_cq.set(0, 1, 0), _cq2.copy(BY_ID.earth.disp).sub(c.disp).normalize());   // dish toward Earth
  }
  updateHeliopause(O);
}
function craftSpeed(c, jdTT) { return craftAt(c, jdTT + 0.5, new V3()).sub(craftAt(c, jdTT - 0.5, new V3())).length() / DAY; }

/* ------------------------------ heliopause ------------------------------ */
const HP_NOSE = eclToScene(Math.cos(5.2 * DEG) * Math.cos(255.4 * DEG), Math.cos(5.2 * DEG) * Math.sin(255.4 * DEG), Math.sin(5.2 * DEG), new V3());  // upwind of the interstellar flow
const VERT_HP = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec3 uNose; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 d=normalize(position); float c=dot(d,uNose);
  float r=120.0*(1.0+0.3*(1.0-c)+1.4*pow(max(-c,0.0),2.0));          // blunt nose, long heliotail
  vec4 w=modelMatrix*vec4(d*r,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*d);
  gl_Position=projectionMatrix*viewMatrix*w;
  #include <logdepthbuf_vertex>
}`;
const FRAG_HP = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uI; varying vec3 vN; varying vec3 vW;
void main(){
  #include <logdepthbuf_fragment>
  float f=1.0-abs(dot(normalize(vN),normalize(cameraPosition-vW)));
  gl_FragColor=vec4(vec3(0.3,0.55,1.0)*uI*pow(f,4.0),1.0);
}`;
const HELIO = {};
function buildHeliopause() {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.ShaderMaterial({
    uniforms: { uNose: { value: HP_NOSE }, uI: { value: 0 } }, vertexShader: VERT_HP, fragmentShader: FRAG_HP,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  mesh.scale.setScalar(AU); mesh.frustumCulled = false; mesh.renderOrder = 6;
  scene.add(mesh);
  HELIO.mesh = mesh;
}
function updateHeliopause(O) {
  const m = HELIO.mesh, dS = BY_ID.sun.disp.clone().sub(O).distanceTo(camera.position), l = Math.log10(Math.max(dS, 1) / AU);
  const k = smooth(clamp((l - 1.2) / 0.7, 0, 1)) * (1 - smooth(clamp((l - 4) / 1, 0, 1)));
  m.material.uniforms.uI.value = 0.16 * k;
  m.visible = k > 0.002 && STATE.show.orbits;
  m.position.copy(BY_ID.sun.disp).sub(O);
}

/* ------------------------------ TRAPPIST-1 ------------------------------ */
const TRAPPIST = addStar({ id: 'trappist1', name: 'TRAPPIST-1', short: 'TRAPPIST-1', dist: 40.66, R: 0.1192, T: 2566, V: 18.8, sp: 'M8 V',
  pos: raDecToScene(346.6224, -5.0414, new V3()).multiplyScalar(40.66 * LY), nav: true,
  blurb: 'An ultracool red dwarf barely larger than Jupiter, with seven Earth-sized planets packed closer to it than Mercury is to the Sun. Three of them orbit in the zone where liquid water could exist. The system is edge-on from Earth, so every planet transits its star.' });
TRAPPIST.defD = 2.4e7; TRAPPIST.navDist = '40.7 ly';
// [letter, period d, a AU, radius R⊕, mass M⊕, T_eq K, transit time BJD−2450000, flux S⊕, colour A, colour B, style, crater]  (Agol et al. 2021)
const TRAPPIST_CAT = [
  ['b', 1.51088, 0.01154, 1.116, 1.374, 398, 7257.55044, 4.15, [0.26, 0.2, 0.17], [0.45, 0.33, 0.25], 0, 0.8, 'Probably a bare, scorched rock: JWST measured a dayside near 230 °C with no thick atmosphere.'],
  ['c', 2.42194, 0.0158, 1.097, 1.308, 340, 7258.58728, 2.21, [0.35, 0.3, 0.27], [0.55, 0.47, 0.4], 0, 0.6, 'A Venus-like irradiation. JWST rules out a thick carbon-dioxide atmosphere; it may be bare rock.'],
  ['d', 4.04922, 0.02227, 0.788, 0.388, 286, 7257.06768, 1.12, [0.46, 0.36, 0.3], [0.66, 0.56, 0.48], 0, 0.5, 'Small and on the hot inner edge of the habitable zone.'],
  ['e', 6.10101, 0.02925, 0.92, 0.692, 250, 7257.82771, 0.66, [0.3, 0.42, 0.58], [0.7, 0.72, 0.7], 9, 0, 'The most Earth-like in size and sunlight. If it kept an atmosphere it could hold liquid water.'],
  ['f', 9.20754, 0.03849, 1.045, 1.039, 218, 7257.07426, 0.38, [0.62, 0.7, 0.78], [0.86, 0.9, 0.94], 2, 0, 'In the habitable zone; likely water-rich, perhaps an ice-covered ocean world.'],
  ['g', 12.35295, 0.04683, 1.129, 1.321, 197, 7257.71462, 0.26, [0.72, 0.74, 0.78], [0.5, 0.56, 0.66], 3, 0.3, 'The largest planet, at the cold outer edge of the habitable zone.'],
  ['h', 18.7729, 0.06189, 0.755, 0.326, 172, 7249.60676, 0.14, [0.8, 0.82, 0.86], [0.6, 0.58, 0.6], 4, 0.7, 'The outermost planet, small and frozen, receiving about an eighth of the sunlight Earth gets.'],
];
const HZ = new Set(['e', 'f', 'g']);
const EXO = [];
{
  const b = skyBasis(346.6224, -5.0414), e1 = b.s.clone().negate(), nrm = b.n.clone(), e2 = new V3().crossVectors(nrm, e1);
  TRAPPIST_CAT.forEach(([l, P, a, R, M, Teq, Tc, S, cA, cB, style, cr, note], i) => {
    const hz = HZ.has(l), rk = R * 6371;
    const t = deepTarget({
      id: 'trappist1' + l, name: `TRAPPIST-1 ${l}`, kind: 'exo', color: hz ? '#8FE3A8' : '#C9B8A6', subtitle: `Exoplanet · ${hz ? 'habitable zone · ' : ''}${nf(P, 2)}-day year`,
      navDist: `${nf(P, 1)} d`, distLy: 40.66 + (i + 1) * 1e-6, sub: true, lightAgo: '≈ 40.7 years ago', pos: TRAPPIST.pos.clone(), frameQ: null, localSky: true,
      dispR: rk, minD: rk * 1.03, defD: rk * 3.8,
      blurb: `${note} Like all seven planets it is tidally locked, with one side in permanent day. The surface shown is an illustration: no image of these worlds exists.`,
      facts: [['Radius', `${nf(R, 2)} R⊕ (${nf(rk, 0)} km)`], ['Mass', `${nf(M, 2)} M⊕`], ['Orbital period', `${nf(P, 2)} days`], ['Distance from star', `${nf(a, 4)} AU`],
        ['Starlight', `${nf(S, 2)}× Earth’s`], ['Equilibrium temp.', `${Teq} K (${Teq - 273} °C)`], ['Habitable zone', hz ? 'yes' : 'no']],
    });
    Object.assign(t, { P, a: a * AU, Tc: 2450000 + Tc, S, cA, cB, style, cr, hz, e1, e2 });
    EXO.push(t);
  });
}

function buildExo() {
  const col = tempRGB(TRAPPIST.T), mx = Math.max(...col), sunCol = new V3(...col.map(v => v / mx));
  for (const t of EXO) {
    const u = Object.assign(bodyUniforms({ id: t.id, eqRadius: t.dispR }), {
      uSunPos: { value: new V3() }, uSunR: { value: TRAPPIST.dispR }, uSunI: { value: 1.4 * Math.pow(t.S, 0.35) }, uSunColor: { value: sunCol },
      uColA: { value: new V3(...t.cA) }, uColB: { value: new V3(...t.cB) }, uCrater: { value: t.cr }, uRelief: { value: 0.012 }, uStyle: { value: t.style }, uModel: { value: t.style === 9 ? 3 : 1 },
    });
    const mesh = new THREE.Mesh(GEO.sphereHi, new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT_BODY, fragmentShader: FRAG_PROC }));
    mesh.scale.setScalar(t.dispR); mesh.layers.set(7); mesh.visible = false;
    scene.add(mesh);
    const pts = [];
    for (let k = 0; k <= 256; k++) { const f = TAU * k / 256; pts.push(t.e1.clone().multiplyScalar(Math.cos(f) * t.a).addScaledVector(t.e2, Math.sin(f) * t.a)); }
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: t.hz ? 0x6FD08C : 0x7F95B8, transparent: true, opacity: 0.45, depthWrite: false }));
    orbit.layers.set(7); orbit.frustumCulled = false;
    scene.add(orbit);
    t.obj = { mesh, orbit };
  }
}
function updateExoPositions(jdTT) {
  for (const t of EXO) {
    const f = TAU * (jdTT - t.Tc) / t.P;                                // phase 0 = transit, planet between star and Earth
    t.disp.copy(TRAPPIST.pos).addScaledVector(t.e1, Math.cos(f) * t.a).addScaledVector(t.e2, Math.sin(f) * t.a);
    t.phys.copy(t.disp);
  }
}
const _ex = new V3(), _ey = new V3();
function updateExo(O) {
  const sd = _ey.copy(TRAPPIST.disp).sub(O), near = sd.distanceTo(camera.position) < 2e9;
  for (const t of EXO) {
    const { mesh, orbit } = t.obj, c = _ex.copy(t.disp).sub(O), d = c.distanceTo(camera.position);
    mesh.visible = t.dispR / (d * TAN_HALF) * VIEW_H / 2 > 0.4 && d < 1e12;
    if (mesh.visible) {
      mesh.position.copy(c);
      mesh.material.uniforms.uSunPos.value.copy(sd);
      mesh.quaternion.setFromUnitVectors(_cq.set(1, 0, 0), _cq2.copy(sd).sub(c).normalize());   // tidally locked: same face to the star
    }
    orbit.visible = near && STATE.show.orbits;
    orbit.position.copy(sd);
  }
}
