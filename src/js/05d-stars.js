/* ------------------------------------------------------------------ *
 *  Nearby and famous stars in 3D at their measured distances, and two
 *  stellar-mass black holes with their companion stars. From the
 *  Solar System the stars stand in for their catalogue points, so the
 *  sky looks unchanged until you leave.
 * ------------------------------------------------------------------ */
const R_SUN_KM = 695700;

// id, name, short, RA°, Dec°, distance (ly), radius (R☉), Teff (K), V mag, spectral type, blurb
const STAR_CAT = [
  ['proxima', 'Proxima Centauri', 'Proxima', 217.4290, -62.6795, 4.2465, 0.154, 3042, 11.13, 'M5.5 Ve', 'The closest star to the Sun: a small, flaring red dwarf with a planet, Proxima b, in its habitable zone.'],
  ['alphacena', 'Alpha Centauri A', 'α Centauri A', 219.9021, -60.8340, 4.344, 1.2234, 5790, 0.01, 'G2 V', 'Nearly a twin of the Sun. With Alpha Centauri B it forms the nearest star system; the pair circle each other every 80 years.'],
  ['alphacenb', 'Alpha Centauri B', 'α Centauri B', 0, 0, 0, 0.8632, 5260, 1.33, 'K1 V', 'The smaller, orange partner of Alpha Centauri A, drawn here about 11 AU from it.', { of: 'alphacena', off: [9, 6, 0] }],
  ['barnard', 'Barnard’s Star', 'Barnard’s Star', 269.4521, 4.6934, 5.96, 0.187, 3134, 9.51, 'M4 V', 'An old red dwarf with the largest proper motion of any star: it crosses the width of the Moon in the sky every 180 years.'],
  ['wolf359', 'Wolf 359', 'Wolf 359', 164.1203, 7.0147, 7.86, 0.144, 2800, 13.5, 'M6 V', 'One of the faintest and lowest-mass stars known nearby, a dim red dwarf in Leo.'],
  ['lalande', 'Lalande 21185', 'Lalande 21185', 165.8342, 35.9699, 8.31, 0.39, 3547, 7.52, 'M2 V', 'The brightest red dwarf in the northern sky, yet still too faint to see without binoculars.'],
  ['sirius', 'Sirius', 'Sirius', 101.2872, -16.7161, 8.60, 1.711, 9940, -1.46, 'A1 V', 'The brightest star in the night sky: a hot white star twice the Sun’s mass, with a white-dwarf companion.'],
  ['siriusb', 'Sirius B', 'Sirius B', 0, 0, 0, 0.0084, 25200, 8.44, 'DA2', 'A white dwarf: the Sun’s mass packed into a ball the size of Earth. A teaspoon of it would weigh tonnes.', { of: 'sirius', off: [-14, 15, 0] }],
  ['epseri', 'Epsilon Eridani', 'ε Eridani', 53.2327, -9.4583, 10.47, 0.735, 5084, 3.73, 'K2 V', 'A young orange star surrounded by dusty debris belts, like the Solar System in its youth.'],
  ['procyon', 'Procyon', 'Procyon', 114.8255, 5.2250, 11.46, 2.048, 6530, 0.34, 'F5 IV–V', 'A star beginning to swell off the main sequence, with a white-dwarf companion of its own.'],
  ['61cyg', '61 Cygni A', '61 Cygni', 316.7248, 38.7494, 11.40, 0.665, 4526, 5.21, 'K5 V', 'The first star to have its distance measured, by Friedrich Bessel in 1838.'],
  ['tauceti', 'Tau Ceti', 'τ Ceti', 26.0170, -15.9375, 11.91, 0.793, 5344, 3.50, 'G8 V', 'The nearest single Sun-like star, a favourite target in the search for life.'],
  ['altair', 'Altair', 'Altair', 297.6958, 8.8683, 16.73, 1.79, 7700, 0.76, 'A7 V', 'It spins once every nine hours, so fast that its equator bulges 20% wider than its poles.'],
  ['vega', 'Vega', 'Vega', 279.2347, 38.7837, 25.04, 2.36, 9602, 0.03, 'A0 V', 'The standard star of astronomy: magnitudes were once defined so that Vega is zero. It was the pole star 12,000 years ago.'],
  ['fomalhaut', 'Fomalhaut', 'Fomalhaut', 344.4127, -29.6222, 25.13, 1.84, 8590, 1.16, 'A3 V', 'A young white star ringed by a sharp belt of icy debris.'],
  ['pollux', 'Pollux', 'Pollux', 116.3290, 28.0262, 33.78, 9.06, 4666, 1.14, 'K0 III', 'The nearest giant star to the Sun, with a gas-giant planet.'],
  ['arcturus', 'Arcturus', 'Arcturus', 213.9153, 19.1824, 36.7, 25.4, 4286, -0.05, 'K1.5 III', 'An orange giant and the brightest star north of the celestial equator; the Sun will look like this in about 5 billion years.'],
  ['capella', 'Capella', 'Capella', 79.1723, 45.9980, 42.9, 11.98, 4970, 0.08, 'G8 III', 'A pair of yellow giants orbiting each other every 104 days, seen as one bright star.'],
  ['castor', 'Castor', 'Castor', 113.6494, 31.8883, 51, 2.4, 10286, 1.58, 'A1 V', 'Six stars in one: three binary pairs bound together.'],
  ['aldebaran', 'Aldebaran', 'Aldebaran', 68.9802, 16.5093, 65.3, 44.2, 3910, 0.86, 'K5 III', 'The orange eye of Taurus, a red giant 44 times the Sun’s radius.'],
  ['regulus', 'Regulus', 'Regulus', 152.0930, 11.9672, 79.3, 4.35, 12460, 1.40, 'B8 IVn', 'A hot blue-white star spinning close to break-up speed.'],
  ['achernar', 'Achernar', 'Achernar', 24.4285, -57.2368, 139, 7.3, 15000, 0.46, 'B6 Vep', 'The flattest star known: its rapid spin stretches its equator half again wider than its poles.'],
  ['spica', 'Spica', 'Spica', 201.2983, -11.1613, 250, 7.47, 25300, 0.97, 'B1 III–IV', 'A close pair of hot blue stars whirling around each other every four days.'],
  ['canopus', 'Canopus', 'Canopus', 95.9880, -52.6957, 310, 71, 7400, -0.74, 'A9 II', 'The second-brightest star in the night sky, a luminous bright giant used by spacecraft for navigation.'],
  ['polaris', 'Polaris', 'Polaris', 37.9546, 89.2641, 433, 37.5, 6015, 1.98, 'F7 Ib', 'The North Star, sitting within a degree of the celestial pole. It is a pulsating Cepheid variable.'],
  ['betelgeuse', 'Betelgeuse', 'Betelgeuse', 88.7929, 7.4071, 548, 764, 3600, 0.50, 'M1–M2 Ia–Iab', 'A red supergiant nearing the end of its life. Put in place of the Sun, it would swallow Mercury, Venus, Earth and Mars. It will explode as a supernova within the next 100,000 years.'],
  ['antares', 'Antares', 'Antares', 247.3519, -26.4320, 550, 680, 3660, 1.09, 'M1.5 Iab', 'The red heart of Scorpius, a supergiant nearly as large as Betelgeuse. Its name means “rival of Mars”.'],
  ['rigel', 'Rigel', 'Rigel', 78.6345, -8.2016, 860, 78.9, 12100, 0.13, 'B8 Ia', 'A blue supergiant about 120,000 times as luminous as the Sun.'],
  ['deneb', 'Deneb', 'Deneb', 310.3580, 45.2803, 2600, 203, 8525, 1.25, 'A2 Ia', 'One of the most luminous stars visible to the naked eye, shining from 2,600 light years away.'],
  ['vycma', 'VY Canis Majoris', 'VY CMa', 110.7430, -25.7675, 3900, 1420, 3490, 7.9, 'M5e Ia', 'One of the largest stars known, about 1,400 times the Sun’s radius. Put in place of the Sun, its surface would lie beyond Jupiter.'],
];

// Stellar-mass black holes and their companions
const BH_CAT = [
  { id: 'gaiabh1', name: 'Gaia BH1', short: 'Gaia BH1', ra: 262.1712, dec: -0.5809, dist: 1560, mass: 9.62, inc: 126.6, pa: 97,
    blurb: 'The nearest known black hole, found in 2022 by the wobble of its Sun-like companion in Gaia data. It is dormant: with no gas to feed on it has no disc, only a shadow and the lensed sky around it.',
    facts: [['Mass', '9.6 M☉'], ['Schwarzschild radius', '28 km'], ['Distance', '1,560 ly'], ['Companion', 'Sun-like G star'], ['Orbit', '186 days, 1.4 AU'], ['Discovered', '2022, Gaia']],
    disc: null, comp: { id: 'gaiabh1b', name: 'Gaia BH1 companion', short: 'Gaia BH1 star', R: 1.0, T: 5850, V: 13.8, sp: 'G V', P: 185.59, a: 1.40, e: 0.45 } },
  { id: 'cygx1', name: 'Cygnus X-1', short: 'Cygnus X-1', ra: 299.5903, dec: 35.2016, dist: 7240, mass: 21.2, inc: 27.5, pa: 20,
    blurb: 'The first object widely accepted as a black hole (1972). It pulls gas from its blue supergiant companion, which looms across a quarter of the sky from here. The real disc glows mainly in X-rays at millions of degrees.',
    facts: [['Mass', '21.2 M☉'], ['Schwarzschild radius', '63 km'], ['Distance', '7,240 ly'], ['Companion', 'HDE 226868, blue supergiant'], ['Orbit', '5.6 days, 0.24 AU'], ['Discovered', '1964 (X-rays)']],
    disc: { tdisk: 9500, diskI: 1.5, outer: 16 }, comp: { id: 'hde226868', name: 'HDE 226868', short: 'HDE 226868', R: 22.2, T: 31000, V: 8.95, sp: 'O9.7 Iab', P: 5.5998, a: 0.244, e: 0.02 } },
];

const STARS3D = [];
function tempRGB(T) {
  const lam = [0.61, 0.55, 0.465], I = lam.map(l => 1 / (Math.pow(l / 0.55, 5) * (Math.exp(14388 / (l * T)) - 1)));
  const m = Math.max(...I);
  return I.map(v => Math.pow(0.12 + 0.88 * v / m, 2.2));          // display-referred tint, linearised
}
function skyBasis(ra, dec) {
  const s = raDecToScene(ra, dec, new V3());
  const e = new V3().crossVectors(EQ_Z, s).normalize(), n = new V3().crossVectors(s, e);
  return { s, e, n };
}
function starFacts(d) {
  const f = [['Spectral type', d.sp], ['Radius', d.R < 0.1 ? `${nf(d.R * R_SUN_KM, 0)} km` : `${nf(d.R, d.R < 10 ? 2 : 0)} R☉`], ['Surface temperature', `${nf(d.T, 0)} K`], ['Distance', `${nf(d.dist, d.dist < 20 ? 2 : 0)} ly`]];
  f.push(['Apparent magnitude', nf(d.V, 2)]);
  return f;
}
function addStar(d) {
  const t = deepTarget({
    id: d.id, name: d.name, short: d.short, kind: 'star3d', color: '#FFE7B0', subtitle: `${d.sp} star · ${nf(d.dist, d.dist < 20 ? 1 : 0)} ly`,
    navDist: d.dist < 1000 ? `${nf(d.dist, d.dist < 20 ? 1 : 0)} ly` : `${nf(d.dist / 1000, 2)}k ly`, distLy: d.dist,
    lightAgo: `≈ ${nf(d.dist, d.dist < 20 ? 1 : 0)} years ago`, pos: d.pos, frameQ: null, nav: !!d.nav, localSky: true,
    blurb: d.blurb, facts: starFacts(d), dispR: d.R * R_SUN_KM, minD: d.R * R_SUN_KM * 1.15, defD: d.R * R_SUN_KM * (d.R < 0.05 ? 12 : 6),
  });
  // absolute magnitude from the catalogue brightness and distance
  t.absMag = d.V - 5 * Math.log10(d.dist / 3.26156) + 5;
  t.T = d.T; t.R = d.R;
  STARS3D.push(t);
  return t;
}

// Build targets now so the navigator and labels see them; meshes are made in buildStars()
{
  const byId = {};
  for (let [id, name, short, ra, dec, dist, R, T, V, sp, blurb, rel] of STAR_CAT) {
    let pos, d = dist;
    if (rel) {
      const p = byId[rel.of], b = skyBasis(p.ra, p.dec);
      pos = p.t.pos.clone().addScaledVector(b.e, rel.off[0] * AU).addScaledVector(b.n, rel.off[1] * AU);
      d = p.dist; ra = p.ra; dec = p.dec;
    } else pos = raDecToScene(ra, dec, new V3()).multiplyScalar(dist * LY);
    const t = addStar({ id, name, short, dist: d, R, T, V, sp, blurb, pos, nav: ['alphacena', 'sirius', 'betelgeuse', 'vycma'].includes(id) });
    byId[id] = { t, ra, dec, dist: d };
  }
  for (const c of BH_CAT) {
    const rs = 2 * 6.6743e-20 * c.mass * 1.98847e30 / (C_KMS * C_KMS);
    const f = diskFrame(c.ra, c.dec, c.pa, c.inc);
    const pos = f.s.clone().multiplyScalar(c.dist * LY);
    const bh = deepTarget({
      id: c.id, name: c.name, short: c.short, kind: 'bh', color: '#FFB36B', subtitle: `Stellar black hole · ${nf(c.dist, 0)} ly`,
      navDist: `${nf(c.dist / 1000, 2)}k ly`, distLy: c.dist, lightAgo: `≈ ${nf(c.dist, 0)} years ago`, pos, frameQ: f.cam,
      viewDir: f.view, dispR: rs, blurb: c.blurb, facts: c.facts, localSky: true,
    });
    const nrm = new V3(0, 1, 0).applyQuaternion(f.cam), e1 = new V3(1, 0, 0).applyQuaternion(f.cam);
    const k = c.comp, star = addStar({ id: k.id, name: k.name, short: k.short, dist: c.dist, R: k.R, T: k.T, V: k.V, sp: k.sp, pos: pos.clone(),
      blurb: `The companion star of ${c.name}, orbiting it every ${k.P < 10 ? nf(k.P, 1) : nf(k.P, 0)} days.` });
    star.orbit = { bh, P: k.P, a: k.a * AU, e: k.e, nrm, e1, e2: new V3().crossVectors(nrm, e1) };
    c.bhTarget = bh; c.nrm = nrm; c.e1 = e1; c.star = star;
  }
}

/* ------------------------------ rendering ------------------------------ */
const FRAG_STAR = FRAG_SUN
  .replace('uniform float uTime, uIntensity;', 'uniform float uTime, uIntensity, uGran; uniform vec3 uBase;')
  .replace('vec3 q=p*95.0;', 'vec3 q=p*uGran;')
  .replace('vec3 base=vec3(1.0,0.84,0.62);', 'vec3 base=uBase;')
  .replace('uniform float uTime, uIntensity, uGran;', 'uniform float uTime, uIntensity, uGran; uniform vec3 uOff;')
  .replace('vec3 p=vObj;', 'vec3 p=vObj+uOff;');
const VERT_STAR3D = /* glsl */`
attribute vec3 aColor; attribute float aMag;
uniform float uScale, uBright; varying vec3 vC;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_Position=projectionMatrix*mv;
  float s=pow(10.0,-0.4*(aMag-6.5));
  gl_PointSize=clamp(1.25*pow(s,0.2),1.2,10.0)*uScale;
  vC=aColor*clamp(0.11*pow(s,0.5),0.0,5.0)*uBright;
}`;

const STARVIEW = {};
function buildStars() {
  for (const t of STARS3D) {
    const col = tempRGB(t.T);
    const u = Object.assign(bodyUniforms(t), {
      uTime: SHARED.uTime, uIntensity: { value: 16 }, uGran: { value: t.R < 3 ? 95 : t.R < 100 ? 40 : 9 }, uBase: { value: new V3(...col) }, uOff: { value: new V3(hashStr(t.id) * 40, hashStr(t.id + 'y') * 40, 0) },
    });
    u.uRadius.value = t.dispR;
    const mesh = new THREE.Mesh(GEO.sphereHi, new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT_BODY, fragmentShader: FRAG_STAR }));
    const corona = new THREE.Mesh(GEO.quad, new THREE.ShaderMaterial({
      uniforms: { uSize: { value: t.dispR * 9 }, uK: { value: 9 }, uTime: SHARED.uTime, uI: { value: 5 }, uColor: { value: new V3(...col).multiplyScalar(0.9) } },
      vertexShader: VERT_BILLBOARD, fragmentShader: FRAG_CORONA, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    corona.frustumCulled = false; corona.renderOrder = 4;
    mesh.scale.setScalar(t.dispR);
    const group = new THREE.Group();
    group.add(mesh, corona);
    for (const o of [group, mesh, corona]) o.layers.set(7);             // companions show up in a black hole's lensed sky
    group.visible = false;
    scene.add(group);
    t.obj = { group, mesh, corona, mat: mesh.material, col };
  }
  // Point sprites stand in for the stars until they are resolved; they replace the matching catalogue stars
  const n = STARS3D.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), mag = new Float32Array(n).fill(30);
  STARS3D.forEach((t, i) => { const c = t.obj.col; col.set([c[0], c[1], c[2]], i * 3); });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uScale: SHARED.uScale, uBright: { value: 1 } }, vertexShader: VERT_STAR3D, fragmentShader: FRAG_STARS,
    depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  pts.frustumCulled = false; pts.renderOrder = -89; pts.layers.set(5);
  camera.layers.enable(5); camera.layers.enable(7);
  scene.add(pts);
  STARVIEW.pts = pts;

  // Hide the catalogue points these stars replace
  const sp = SKY.stars.geometry.attributes.position, sm = SKY.stars.geometry.attributes.aMag, v = new V3();
  let hidden = 0;
  for (const t of STARS3D) {
    if (t.orbit || t.absMag + 5 * Math.log10(t.pos.length() / LY / 3.26156) - 5 > 7.6) continue;
    const dir = t.pos.clone().normalize(), m = t.absMag + 5 * Math.log10(t.pos.length() / LY / 3.26156) - 5;
    for (let i = 0; i < sp.count; i++) {
      v.fromBufferAttribute(sp, i);
      if (v.dot(dir) > Math.cos(0.3 * DEG) && Math.abs(sm.getX(i) - m) < 1.3) { sm.setX(i, 30); hidden++; }
    }
  }
  sm.needsUpdate = true;
  STARVIEW.hidden = hidden;

  // Stellar black holes use the same ray tracer as Sgr A*
  for (const c of BH_CAT) {
    makeBlackHole({ target: c.bhTarget, normal: c.nrm, e1: c.e1, companion: c.star, tdisk: c.disc ? c.disc.tdisk : 5000, diskI: c.disc ? c.disc.diskI : 0, outer: c.disc ? c.disc.outer : 14 });
  }
}

// Companion stars follow Keplerian orbits around their black holes
function updateStarSystems(jdTT) {
  for (const t of STARS3D) {
    const o = t.orbit;
    if (!o) continue;
    const M = TAU * (jdTT - J2000) / o.P, E = solveKepler(M, o.e);
    const x = o.a * (Math.cos(E) - o.e), y = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
    t.disp.copy(o.bh.disp).addScaledVector(o.e1, x).addScaledVector(o.e2, y);
    t.phys.copy(t.disp);
  }
}

const _st = new V3();
function updateStars(O) {
  const pa = STARVIEW.pts.geometry.attributes, far = 1 - smooth(clamp((DEEP_K.lSun - 3.4) / 0.8, 0, 1));
  STARVIEW.pts.material.uniforms.uBright.value = (DEEP_K.adapt ?? 1) * far;
  STARVIEW.pts.visible = far > 0.003;
  STARS3D.forEach((t, i) => {
    const c = _st.copy(t.disp).sub(O);
    pa.position.setXYZ(i, c.x, c.y, c.z);
    const d = Math.max(c.distanceTo(camera.position), 1);
    const px = t.dispR / (d * TAN_HALF) * VIEW_H / 2;
    const g = t.obj.group;
    // only draw the sphere once it is resolved: at larger ranges its shaders would run out of float precision
    g.visible = px > 0.6 && d < 1e16;
    pa.aMag.setX(i, px > 2 ? 30 : t.absMag + 5 * Math.log10(d / LY / 3.26156) - 5);
    if (!g.visible) return;
    g.position.copy(c);
    const k = smooth(clamp((Math.log10(Math.max(px, 1)) - 0.6) / 1.5, 0, 1)), tk = clamp(t.T / 5772, 0.6, 2.2);
    t.obj.mat.uniforms.uIntensity.value = (16 + (1.05 - 16) * k) * tk;
    // the corona fades when very close, where a billboard this large would wash out the view
    t.obj.corona.material.uniforms.uI.value = (5 + (0.7 - 5) * k) * tk * clamp(px / 3, 0, 1) * smooth(clamp((d / t.dispR - 2) / 10, 0, 1));
  });
  pa.position.needsUpdate = true; pa.aMag.needsUpdate = true;
}
