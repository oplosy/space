/* ------------------------------------------------------------------ *
 *  Out to the edge: the Local Group (Magellanic Clouds, Andromeda,
 *  Triangulum), the cosmic web with real nearby galaxy clusters, and
 *  the cosmic microwave background at the edge of the observable
 *  universe. Distances are measured values; the web between the named
 *  clusters is statistical.
 * ------------------------------------------------------------------ */
const MLY = 1e6 * LY;
const R_UNIVERSE = 46.5e9 * LY;                           // comoving radius of the observable universe

// Scene direction of a galactic longitude/latitude, and galactic coordinates of a scene vector
function galDir(lDeg, bDeg, out) {
  const l = lDeg * DEG, b = bDeg * DEG;
  return out.copy(GAL_X).multiplyScalar(Math.cos(b) * Math.cos(l)).addScaledVector(GAL_Y, Math.cos(b) * Math.sin(l)).addScaledVector(GAL_Z, Math.sin(b));
}
const toGal = v => [v.dot(GAL_X), v.dot(GAL_Y), v.dot(GAL_Z)];

// Disc orientation of an external galaxy from its sky position, position angle and inclination
function diskFrame(ra, dec, pa, inc) {
  const s = raDecToScene(ra, dec, new V3());
  const e = new V3().crossVectors(EQ_Z, s).normalize(), n = new V3().crossVectors(s, e);
  const a = n.clone().multiplyScalar(Math.cos(pa * DEG)).addScaledVector(e, Math.sin(pa * DEG));
  const m = new V3().crossVectors(s, a);
  const nrm = s.clone().multiplyScalar(Math.cos(inc * DEG)).addScaledVector(m, Math.sin(inc * DEG)).normalize();
  if (nrm.dot(s) > 0) nrm.negate();                        // the face turned toward us
  const b = new V3().crossVectors(nrm, a);
  return {
    s, model: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, b, nrm)),
    cam: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(a, nrm, b.clone().negate())),
    view: nrm.clone().multiplyScalar(0.8).addScaledVector(s, -0.6).normalize(),
  };
}

function deepTarget(o) {
  const t = { deep: true, dispR: 1, radius: 0, children: [], screen: {}, frameQ: GAL_FRAME, ...o };
  t.phys = t.pos.clone(); t.disp = t.pos.clone();
  DEEP.push(t);
  return t;
}
Object.assign(MILKY_WAY, { minD: 3000 * LY, defD: 118000 * LY, navDist: '26.7k ly' });
Object.assign(SGR_A, { navDist: '26.7k ly', distLy: 26670 });
Object.assign(MILKY_WAY, { distLy: 26670 });

const LMC_F = diskFrame(80.894, -69.756, 122.5, 34.7), SMC_F = diskFrame(13.187, -72.829, 45, 65);
const M31_F = diskFrame(10.6847, 41.2690, 38, 77), M33_F = diskFrame(23.4621, 30.6599, 23, 55);
const LMC = deepTarget({
  id: 'lmc', name: 'Large Magellanic Cloud', short: 'LMC', kind: 'galaxy', color: '#B9D4FF',
  subtitle: 'Satellite galaxy · 162,000 ly', navDist: '162k ly', lightAgo: '≈ 162,000 years ago',
  pos: LMC_F.s.clone().multiplyScalar(161700 * LY), frameQ: LMC_F.cam, viewDir: LMC_F.view, minD: 2000 * LY, defD: 70000 * LY,
  blurb: 'The largest of the Milky Way’s satellites: a barred irregular galaxy with an off-centre bar and a single spiral arm. The pink knot is the Tarantula Nebula, the most active star-forming region in the Local Group. Distance from eclipsing binaries (Pietrzyński et al. 2019).',
  facts: [['Distance', '162,000 ly (49.6 kpc)'], ['Diameter', '≈ 32,000 ly'], ['Mass', '≈ 10% of the Milky Way'], ['Type', 'Magellanic spiral, SB(s)m'], ['Visible from', 'Southern hemisphere']],
});
const SMC = deepTarget({
  id: 'smc', name: 'Small Magellanic Cloud', short: 'SMC', kind: 'galaxy', color: '#B9D4FF',
  subtitle: 'Satellite galaxy · 204,000 ly', navDist: '204k ly', lightAgo: '≈ 204,000 years ago',
  pos: SMC_F.s.clone().multiplyScalar(203700 * LY), frameQ: SMC_F.cam, viewDir: SMC_F.view, minD: 2000 * LY, defD: 55000 * LY,
  blurb: 'A dwarf irregular galaxy being torn apart by the Large Magellanic Cloud and the Milky Way. It is stretched along our line of sight, and a bridge of gas links it to its larger companion.',
  facts: [['Distance', '204,000 ly (62.4 kpc)'], ['Diameter', '≈ 19,000 ly'], ['Type', 'Dwarf irregular'], ['Stars', '≈ a few hundred million']],
});
const M31 = deepTarget({
  id: 'm31', name: 'Andromeda Galaxy', short: 'Andromeda', kind: 'galaxy', color: '#E7C9FF',
  subtitle: 'Nearest large galaxy · M31', navDist: '2.54M ly', lightAgo: '≈ 2.5 million years ago',
  pos: M31_F.s.clone().multiplyScalar(2.537e6 * LY), frameQ: M31_F.cam, viewDir: M31_F.s.clone().negate().addScaledVector(M31_F.view, 0.35).normalize(), minD: 4000 * LY, defD: 260000 * LY,
  blurb: 'The largest member of the Local Group, seen from Earth 77° from face-on. Its star formation is concentrated in a ring 33,000 light years from the centre. Andromeda is approaching at about 110 km/s and will merge with the Milky Way in roughly 4–5 billion years.',
  facts: [['Distance', '2.54 million ly'], ['Diameter', '≈ 150,000 ly'], ['Stars', '≈ 1 trillion'], ['Type', 'Spiral, SA(s)b'], ['Approach speed', '≈ 110 km/s'], ['Naked-eye', 'Yes, mag 3.4']],
});
const M33 = deepTarget({
  id: 'm33', name: 'Triangulum Galaxy', short: 'Triangulum', kind: 'galaxy', color: '#C9D8FF',
  subtitle: 'Local Group spiral · M33', navDist: '2.73M ly', lightAgo: '≈ 2.7 million years ago',
  pos: M33_F.s.clone().multiplyScalar(2.73e6 * LY), frameQ: M33_F.cam, viewDir: M33_F.view, minD: 2500 * LY, defD: 110000 * LY,
  blurb: 'The third-largest galaxy of the Local Group, a loosely wound spiral rich in gas. Its giant H II region NGC 604 is some 40 times the size of the Orion Nebula.',
  facts: [['Distance', '2.73 million ly'], ['Diameter', '≈ 60,000 ly'], ['Stars', '≈ 40 billion'], ['Type', 'Spiral, SA(s)cd']],
});
const LOCAL_GROUP = deepTarget({
  id: 'localgroup', name: 'Local Group', short: 'Local Group', kind: 'cluster', color: '#9FE3C8',
  subtitle: 'Our group of galaxies', navDist: '1.5M ly', pos: GC_POS.clone().lerp(M31.pos, 0.55),
  viewDir: GAL_Z.clone().multiplyScalar(0.7).addScaledVector(GAL_X, -0.5).addScaledVector(GAL_Y, 0.5).normalize(), minD: 200000 * LY, defD: 5.2 * MLY,
  blurb: 'More than 80 galaxies bound by gravity, dominated by the Milky Way and Andromeda. Most members are faint dwarfs; the group spans about 10 million light years and sits in a filament of the cosmic web pointing toward the Virgo Cluster.',
  facts: [['Diameter', '≈ 10 million ly'], ['Members', '80+ galaxies'], ['Largest', 'Andromeda, Milky Way, Triangulum'], ['Mass', '≈ 2–3 trillion M☉']],
});
const VIRGO = deepTarget({
  id: 'virgo', name: 'Virgo Cluster', short: 'Virgo Cluster', kind: 'cluster', color: '#FFD9A0',
  subtitle: 'Nearest large galaxy cluster', navDist: '54M ly', lightAgo: '≈ 54 million years ago',
  pos: raDecToScene(187.7059, 12.3911, new V3()).multiplyScalar(53.8 * MLY), minD: 1.5 * MLY, defD: 42 * MLY,
  blurb: 'About 1,500 galaxies around the giant elliptical M87, whose black hole was the first ever imaged. Virgo is the heart of the Virgo Supercluster, itself part of Laniakea, the 500-million-light-year basin of galaxies that includes the Milky Way.',
  facts: [['Distance', '54 million ly'], ['Galaxies', '≈ 1,300–2,000'], ['Central galaxy', 'M87'], ['Diameter', '≈ 15 million ly'], ['Supercluster', 'Laniakea']],
});
const COMA = deepTarget({
  id: 'coma', name: 'Coma Cluster', short: 'Coma Cluster', kind: 'cluster', color: '#FFD9A0',
  subtitle: 'Rich galaxy cluster', navDist: '321M ly', lightAgo: '≈ 320 million years ago',
  pos: raDecToScene(194.953, 27.981, new V3()).multiplyScalar(321 * MLY), minD: 3 * MLY, defD: 70 * MLY,
  blurb: 'More than 1,000 galaxies, mostly ellipticals. In 1933 Fritz Zwicky found its galaxies moving far too fast for their visible mass: the first evidence for dark matter.',
  facts: [['Distance', '321 million ly'], ['Galaxies', '1,000+'], ['Diameter', '≈ 20 million ly'], ['Famous for', 'First evidence of dark matter']],
});
const UNIVERSE = deepTarget({
  id: 'universe', name: 'Observable universe', short: 'Observable universe', kind: 'universe', color: '#FF9E7A',
  subtitle: 'Everything light has had time to reach us from', navDist: '46.5B ly', pos: new V3(),
  viewDir: GAL_Z.clone().multiplyScalar(0.45).addScaledVector(GAL_X, 0.8).normalize(), minD: 200 * MLY, defD: 150e9 * LY,
  blurb: 'A sphere 93 billion light years across, centred on us because it is defined by how far light has travelled in 13.8 billion years of cosmic expansion. Its edge is the cosmic microwave background, shown here in false colour. The named clusters within a billion light years are at their measured positions; the web beyond them is a statistical illustration.',
  facts: [['Radius (comoving)', '46.5 billion ly'], ['Age of the universe', '13.8 billion years'], ['Galaxies', '≈ 200 billion–2 trillion'], ['Edge', 'Cosmic microwave background, 2.725 K']],
});

for (const [t, d] of [[LMC, 161700], [SMC, 203700], [M31, 2.537e6], [M33, 2.73e6], [LOCAL_GROUP, 1.5e6], [VIRGO, 53.8e6], [COMA, 321e6], [UNIVERSE, 46.5e9]]) t.distLy = d;

/* ------------------------------ external galaxy models ------------------------------ */
const GALAXIES = [];
function makeGalaxyModel(P) {
  const rnd = mulberry(P.seed), C = P.counts;
  const N = C.old + C.bulge + C.young + C.hii + C.glow * 3 + 16, Nd = C.dust + 4;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4), size = new Float32Array(N);
  const dpos = new Float32Array(Nd * 3), dsize = new Float32Array(Nd), dop = new Float32Array(Nd);
  let n = 0, dn = 0;
  const add = (x, y, z, c, L, s, kind) => {
    if (n >= N) return;
    pos.set([x, y, z], n * 3); col.set([c[0] * L, c[1] * L, c[2] * L, kind], n * 4); size[n++] = s;
  };
  const addDust = (x, y, z, s, a) => { if (dn >= Nd) return; dpos.set([x, y, z], dn * 3); dsize[dn] = s; dop[dn++] = a; };
  const vert = z0 => z0 * Math.atanh(clamp(2 * rnd() - 1, -0.9999, 0.9999));
  const diskR = () => { let r; do { r = -P.h * Math.log(rnd() * rnd() + 1e-12); } while (r > P.rMax); return r; };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const clumps = P.clumps ? Array.from({ length: P.clumps.n }, () => [gauss(rnd) * P.clumps.sx, gauss(rnd) * P.clumps.sy, gauss(rnd) * P.clumps.sz]) : null;
  // A point on the galaxy's young structure: spiral arms, star-forming rings or clumps
  const struct = (w0, wk, shift = 0) => {
    if (clumps) {
      const c = clumps[Math.floor(rnd() * clumps.length)], s = w0 * 2.5;
      return [c[0] + gauss(rnd) * s, c[1] + gauss(rnd) * s, Math.hypot(c[0], c[1]), c[2]];
    }
    let r, phi;
    if (P.rings && (!P.arms || rnd() < P.ringFrac)) {
      const g = P.rings[rnd() < P.rings[0].w8 ? 0 : P.rings.length - 1];
      r = g.r + (gauss(rnd) + shift) * g.w; phi = rnd() * TAU;
    } else {
      const A = P.arms, k = Math.floor(rnd() * A.n);
      do { r = A.r0 - A.rs * Math.log(rnd() + 1e-9); } while (r > P.rMax);
      phi = A.phase + k * TAU / A.n + Math.log(r / A.r0) / Math.tan(A.pitch * DEG);
      r += (gauss(rnd) + shift) * (w0 + wk * r);
      phi += gauss(rnd) * 0.03;
    }
    return [r * Math.cos(phi), r * Math.sin(phi), r, 0];
  };
  const OLD = [1.0, 0.84, 0.66], OLD2 = [0.95, 0.93, 0.9], BULGE = [1.0, 0.76, 0.5], YOUNG = [0.58, 0.72, 1.0], YOUNG2 = [0.86, 0.9, 1.0], HII = [1.0, 0.3, 0.42];
  const bulgeP = () => {
    if (P.bar && rnd() < 0.7) {
      const B = P.bar, a = clamp(gauss(rnd) * B.sa, -B.sa * 2.6, B.sa * 2.6), b = gauss(rnd) * B.sb;
      const ca = Math.cos(B.angle * DEG), sa = Math.sin(B.angle * DEG);
      return [B.x + a * ca - b * sa, B.y + a * sa + b * ca, gauss(rnd) * B.sz];
    }
    const r = -P.bulgeR * Math.log(rnd() + 1e-9), u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u);
    return [r * s * Math.cos(t), r * s * Math.sin(t), r * u * P.bulgeFlat];
  };
  for (let i = 0; i < C.old; i++) {
    let x, y, r, z0 = P.zOld;
    if (clumps) { const c = clumps[Math.floor(rnd() * clumps.length)]; x = c[0] + gauss(rnd) * P.h; y = c[1] + gauss(rnd) * P.h; z0 = P.zOld; }
    else { r = diskR(); const phi = rnd() * TAU; x = r * Math.cos(phi); y = r * Math.sin(phi); }
    add(x, y, vert(z0), mixc(OLD, OLD2, rnd()), 0.6 + rnd() * 0.8, 3, 0);
  }
  for (let i = 0; i < C.bulge; i++) { const p = bulgeP(); add(p[0], p[1], p[2], mixc(BULGE, OLD, rnd() * 0.4), 0.7 + rnd() * 0.7, 3, 0); }
  for (let i = 0; i < C.young; i++) { const [x, y, , z] = struct(P.w0, P.wk); add(x, y, z + vert(P.zYoung), mixc(YOUNG, YOUNG2, rnd()), 0.9 + rnd() * 1.1, 3, 0); }
  for (let i = 0; i < C.hii; i++) { const [x, y, , z] = struct(P.w0 * 0.7, P.wk * 0.7); add(x, y, z + vert(P.zYoung * 0.5), HII, 1.6, (90 + 260 * Math.pow(rnd(), 3)) * 1.4, 1); }
  for (let i = 0; i < C.glow; i++) {
    const p = bulgeP(); add(p[0], p[1], p[2], BULGE, P.sb.bulge, P.bulgeR * 1.6 + rnd() * P.bulgeR, 1);
    let x, y, z;
    if (clumps) { const c = clumps[Math.floor(rnd() * clumps.length)]; x = c[0] + gauss(rnd) * P.h; y = c[1] + gauss(rnd) * P.h; z = c[2] + vert(P.zOld); }
    else { const r = diskR(), phi = rnd() * TAU; x = r * Math.cos(phi); y = r * Math.sin(phi); z = vert(P.zOld); }
    add(x, y, z, mixc(OLD, OLD2, 0.5), P.sb.disk, P.h * 0.5 + rnd() * P.h * 0.35, 1);
    const [ax, ay, , az] = struct(P.w0 * 1.8, P.wk * 1.3);
    add(ax, ay, az + vert(P.zYoung), YOUNG, P.sb.arm, P.w0 * 4 + rnd() * P.w0 * 3, 1);
  }
  for (let i = 0; i < C.dust; i++) { const [x, y, , z] = struct(P.w0 * 1.3, P.wk * 1.2, -0.6); addDust(x, y, z + vert(P.zYoung * 0.6), P.w0 * 1.6 + rnd() * P.w0 * 2.2, 0.4 + rnd() * 0.6); }
  if (P.extra) P.extra(add, rnd, HII);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, n * 3), 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(col.subarray(0, n * 4), 4));
  g.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(0, n), 1));
  const stars = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: GALAXY.u, vertexShader: VERT_GAL, fragmentShader: FRAG_GAL, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dpos.subarray(0, dn * 3), 3));
  dg.setAttribute('aSize', new THREE.BufferAttribute(dsize.subarray(0, dn), 1));
  dg.setAttribute('aOp', new THREE.BufferAttribute(dop.subarray(0, dn), 1));
  const dust = new THREE.Points(dg, GALAXY.dust.material);
  const group = new THREE.Group();
  for (const o of [stars, dust]) { o.frustumCulled = false; o.layers.set(1); group.add(o); }
  stars.renderOrder = -70; dust.renderOrder = -69;
  group.quaternion.copy(P.frame.model);
  group.scale.setScalar(LY);
  scene.add(group);
  GALAXIES.push({ group, pos: P.pos, radius: P.rMax * LY, count: n + dn });
}

function buildLocalGroup() {
  GALAXIES.push({ group: GALAXY.group, pos: GC_POS, radius: 60000 * LY, count: GALAXY.count });
  const k = (a, b, c, d, e, f, g, h) => ({ old: a, bulge: b, young: c, hii: d, glow: e, dust: f });
  makeGalaxyModel({
    seed: 31, pos: M31.pos, frame: M31_F, h: 17000, rMax: 105000, zOld: 1300, zYoung: 450, bulgeR: 2600, bulgeFlat: 0.8,
    arms: { n: 2, pitch: 8, r0: 24000, rs: 26000, phase: 0.6 }, rings: [{ r: 33000, w: 2600, w8: 0.72 }, { r: 49000, w: 3000 }], ringFrac: 0.6,
    w0: 900, wk: 0.012, counts: k(52000, 30000, 24000, 1400, 6000, 12000), sb: { bulge: 0.006, disk: 0.011, arm: 0.03 },
  });
  makeGalaxyModel({
    seed: 33, pos: M33.pos, frame: M33_F, h: 5600, rMax: 32000, zOld: 500, zYoung: 220, bulgeR: 500, bulgeFlat: 0.8,
    arms: { n: 2, pitch: 24, r0: 2500, rs: 7000, phase: 0.0 }, w0: 700, wk: 0.05,
    counts: k(14000, 1500, 14000, 1100, 2500, 3500), sb: { bulge: 0.004, disk: 0.016, arm: 0.05 },
    extra: (add, rnd, HII) => { for (let i = 0; i < 40; i++) add(7000 + gauss(rnd) * 250, 9000 + gauss(rnd) * 250, gauss(rnd) * 80, HII, 2.2, 500 + rnd() * 500, 1); },   // NGC 604
  });
  makeGalaxyModel({
    seed: 50, pos: LMC.pos, frame: LMC_F, h: 4900, rMax: 22000, zOld: 800, zYoung: 300, bulgeR: 900, bulgeFlat: 0.6,
    bar: { sa: 2800, sb: 900, sz: 700, angle: 20, x: -1800, y: 600 },
    arms: { n: 1, pitch: 22, r0: 4000, rs: 6000, phase: 1.2 }, w0: 900, wk: 0.06,
    counts: k(15000, 7000, 9000, 700, 2200, 700), sb: { bulge: 0.012, disk: 0.022, arm: 0.022 },
    extra: (add, rnd, HII) => { for (let i = 0; i < 70; i++) add(3600 + gauss(rnd) * 300, 2600 + gauss(rnd) * 300, gauss(rnd) * 120, HII, 0.7, 300 + rnd() * 500, 1); },   // Tarantula Nebula
  });
  makeGalaxyModel({
    seed: 62, pos: SMC.pos, frame: SMC_F, h: 2200, rMax: 14000, zOld: 2200, zYoung: 500, bulgeR: 1400, bulgeFlat: 1,
    clumps: { n: 14, sx: 3800, sy: 1500, sz: 1800 }, w0: 350, wk: 0,
    counts: k(8000, 2500, 4500, 300, 1200, 800), sb: { bulge: 0.01, disk: 0.02, arm: 0.04 },
  });
}

/* ------------------------------ cosmic web ------------------------------ */
const WEB = {};
function valueNoise3(seed) {
  const h = (x, y, z) => { let t = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ seed; t = Math.imul(t ^ (t >>> 13), 1274126177); return ((t ^ (t >>> 16)) >>> 0) / 4294967296; };
  const f = t => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = f(x - X), v = f(y - Y), w = f(z - Z);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(X, Y, Z), h(X + 1, Y, Z), u), l(h(X, Y + 1, Z), h(X + 1, Y + 1, Z), u), v),
             l(l(h(X, Y, Z + 1), h(X + 1, Y, Z + 1), u), l(h(X, Y + 1, Z + 1), h(X + 1, Y + 1, Z + 1), u), v), w);
  };
}
function buildCosmicWeb() {
  const rnd = mulberry(13800), N = 330000;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 4), size = new Float32Array(N);
  let n = 0;
  const add = (x, y, z, c, L, s, kind) => { if (n >= N) return; pos.set([x, y, z], n * 3); col.set([c[0] * L, c[1] * L, c[2] * L, kind], n * 4); size[n++] = s; };
  const ELL = [1.0, 0.82, 0.6], SPI = [0.75, 0.83, 1.0], WEBC = [0.72, 0.7, 1.0];
  const LOCAL = 7;                                          // Mly: the Local Group is drawn from real models

  // Nodes: real clusters at measured positions (Mly, galactic frame) plus random ones
  const nodes = [];
  const named = [[187.71, 12.39, 53.8, 3.2], [54.62, -35.45, 62, 1.6], [192.2, -41.31, 170, 2.2], [243.9, -60.9, 220, 2.6], [49.95, 41.51, 240, 2.8],
    [159.18, -27.52, 158, 1.8], [201.99, -31.5, 650, 5], [194.95, 27.98, 321, 3.4], [241.3, 17.7, 500, 2.4], [176.1, 19.8, 330, 2]];
  const v = new V3();
  for (const [ra, dec, d, rich] of named) { const g = toGal(raDecToScene(ra, dec, v)); nodes.push({ p: g.map(c => c * d), rich, n: Math.round(rich * 480) }); }
  nodes.push({ p: [0, 0, 0], rich: 0 });                    // the Local Group sits on a filament
  const RA = 1200;
  while (nodes.length < 1500) {
    const r = RA * Math.cbrt(rnd()), u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u);
    if (r < 25) continue;
    nodes.push({ p: [r * s * Math.cos(t), r * s * Math.sin(t), r * u], rich: Math.exp(gauss(rnd) * 0.8) * 0.5 });
  }
  // Filaments join each node to its three nearest neighbours
  const edges = new Set(), E = [];
  for (let i = 0; i < nodes.length; i++) {
    const best = [];
    const a = nodes[i].p;
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue;
      const b = nodes[j].p, d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      if (best.length < 3 || d < best[2][0]) { best.push([d, j]); best.sort((p, q) => p[0] - q[0]); if (best.length > 3) best.pop(); }
    }
    for (const [d, j] of best) { const key = i < j ? i * 4096 + j : j * 4096 + i; if (!edges.has(key)) { edges.add(key); E.push([i, j, Math.sqrt(d)]); } }
  }
  const put = (x, y, z, c, L, s, kind) => { if (x * x + y * y + z * z > LOCAL * LOCAL) add(x, y, z, c, L, s, kind); };
  const totalLen = E.reduce((s, e) => s + e[2], 0);
  // galaxies along filaments
  for (let i = 0; i < 125000; i++) {
    let e = E[Math.floor(rnd() * E.length)];
    if (rnd() > e[2] / 260) e = E[Math.floor(rnd() * E.length)];
    const a = nodes[e[0]].p, b = nodes[e[1]].p, t = rnd(), w = 2.2 + 3 * rnd();
    put(a[0] + (b[0] - a[0]) * t + gauss(rnd) * w, a[1] + (b[1] - a[1]) * t + gauss(rnd) * w, a[2] + (b[2] - a[2]) * t + gauss(rnd) * w, rnd() < 0.8 ? SPI : ELL, 0.5 + rnd(), 0.08, 0);
  }
  // clusters at the nodes, and their hot-gas glow
  const richSum = nodes.reduce((s, q) => s + q.rich, 0);
  for (const q of nodes) {
    if (!q.rich) continue;
    // named clusters get their catalogued richness; the core is concentrated like a real cluster profile
    const cnt = q.n || Math.round(52000 * q.rich / richSum), sig = 1.2 + 1.3 * Math.sqrt(q.rich);
    for (let i = 0; i < cnt; i++) { const k = rnd() < 0.35 ? 0.35 : 1; put(q.p[0] + gauss(rnd) * sig * k, q.p[1] + gauss(rnd) * sig * k, q.p[2] + gauss(rnd) * sig * k, rnd() < 0.7 ? ELL : SPI, 0.9 + 1.2 * rnd(), 0.12, 0); }
    put(q.p[0], q.p[1], q.p[2], ELL, 0.06 * Math.min(q.rich, 3), sig * 4, 1);
  }
  // field galaxies in the walls between filaments
  for (let i = 0; i < 18000; i++) {
    const r = RA * Math.cbrt(rnd()), u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u);
    put(r * s * Math.cos(t), r * s * Math.sin(t), r * u, SPI, 0.4 + rnd() * 0.6, 0.08, 0);
  }
  // Beyond ~1 billion ly: a statistical web to the edge, drawn as glowing superclusters
  const nz = valueNoise3(4242);
  const ridge = (x, y, z) => {
    let s = 0, a = 0.55, f = 1;
    for (let o = 0; o < 3; o++) { s += a * (1 - Math.abs(2 * nz(x * f, y * f, z * f) - 1)); f *= 2.1; a *= 0.5; }
    return s / 0.9625;
  };
  const nNear = n;
  let tries = 0;
  while (n - nNear < 90000 && tries < 800000) {
    tries++;
    const r = Math.cbrt(RA ** 3 + rnd() * (46500 ** 3 - RA ** 3)), u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u);
    const x = r * s * Math.cos(t), y = r * s * Math.sin(t), z = r * u;
    const d = ridge(x / 2600, y / 2600, z / 2600);
    if (Math.pow(d, 4) < rnd()) continue;
    add(x, y, z, WEBC, 0.02, 500 + rnd() * 700, 1);
  }

  const makePts = (a, b, fade) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(a * 3, b * 3), 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(col.subarray(a * 4, b * 4), 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(a, b), 1));
    const u = {
      uPx: GALAXY.u.uPx, uMinPx: GALAXY.u.uMinPx, uMaxPx: GALAXY.u.uMaxPx, uUnit: { value: MLY }, uFade: fade,
      uGain: { value: 0.9 }, uGlowGain: { value: 1 }, uRef: { value: 55 }, uPtK: { value: 1 },
    };
    const p = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: u, vertexShader: VERT_GAL, fragmentShader: FRAG_GAL, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    p.frustumCulled = false; p.renderOrder = -72; p.layers.set(4);
    p.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(GAL_X, GAL_Y, GAL_Z));
    p.scale.setScalar(MLY);
    scene.add(p);
    return p;
  };
  const u = { uFade: { value: 0 } }, uFar = { uFade: { value: 0 } };
  const pts = makePts(0, nNear, u.uFade), far = makePts(nNear, n, uFar.uFade);
  camera.layers.enable(4);

  // Cosmic microwave background at the edge, in false colour
  const cmb = new THREE.Mesh(GEO.sphere, new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 }, uInside: { value: 0 } },
    vertexShader: VERT_CMB, fragmentShader: FRAG_CMB, depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  }));
  cmb.frustumCulled = false; cmb.renderOrder = -76; cmb.scale.setScalar(R_UNIVERSE); cmb.layers.set(4);
  scene.add(cmb);
  Object.assign(WEB, { pts, far, u, uFar, cmb, count: n, edges: E.length });
}

const VERT_CMB = /* glsl */`
varying vec3 vP;
varying float vF;
// Rescale before normalising: at 10^23 km a plain length() overflows float32
vec3 unit(vec3 v) { return normalize(v / max(max(abs(v.x), abs(v.y)), max(abs(v.z), 1e-30))); }
void main() {
  vP = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 c = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vF = clamp(abs(dot(unit(mv.xyz - c), unit(-mv.xyz))), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG_CMB = /* glsl */`
uniform float uI, uInside;
varying vec3 vP;
varying float vF;
float cHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cHash(i), cHash(i + vec3(1, 0, 0)), f.x), mix(cHash(i + vec3(0, 1, 0)), cHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(cHash(i + vec3(0, 0, 1)), cHash(i + vec3(1, 0, 1)), f.x), mix(cHash(i + vec3(0, 1, 1)), cHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// Planck-style colour map for temperature fluctuations
vec3 planckMap(float t) {
  t = clamp(t, 0.0, 1.0) * 4.0;
  vec3 c0 = vec3(0.0, 0.03, 0.3), c1 = vec3(0.05, 0.4, 0.85), c2 = vec3(0.95, 0.92, 0.8), c3 = vec3(1.0, 0.5, 0.08), c4 = vec3(0.6, 0.05, 0.03);
  return t < 1.0 ? mix(c0, c1, t) : t < 2.0 ? mix(c1, c2, t - 1.0) : t < 3.0 ? mix(c2, c3, t - 2.0) : mix(c3, c4, t - 3.0);
}
void main() {
  float n = 0.0, a = 0.5;
  vec3 p = vP * 7.0;
  for (int i = 0; i < 5; i++) { n += a * cNoise(p); p = p * 2.07 + 3.1; a *= 0.55; }
  vec3 c = planckMap((n - 0.22) / 0.62);
  float k = uInside > 0.5 ? 0.12 : mix(0.9, 0.012, pow(max(vF, 1e-4), 0.35));
  c *= uI * k;
  gl_FragColor = vec4(any(isnan(c)) || any(isinf(c)) ? vec3(0.0) : max(c, vec3(0.0)), 1.0);
}`;

const _ck = new V3();
function updateCosmos(O) {
  const lSun = DEEP_K.lSun;
  const pxs = GALAXY.u.uPx.value;
  for (const g of GALAXIES) {
    const c = _ck.copy(g.pos).sub(O);
    g.group.position.copy(c);
    const pxR = g.radius / Math.max(c.distanceTo(camera.position), 1) * pxs;
    g.group.visible = DEEP_K.gal > 0.003 && pxR > 0.35;
  }
  DEEP_K.web = STATE.show.milkyway ? smooth(clamp((lSun - 6.25) / 0.9, 0, 1)) : 0;
  DEEP_K.cmb = smooth(clamp((lSun - 9.4) / 0.9, 0, 1));
  DEEP_K.far = smooth(clamp((lSun - 8.9) / 1.0, 0, 1));
  WEB.pts.visible = DEEP_K.web > 0.003;
  WEB.far.visible = DEEP_K.far * DEEP_K.web > 0.003;
  WEB.pts.position.copy(BY_ID.sun.disp).sub(O);
  WEB.far.position.copy(WEB.pts.position);
  WEB.u.uFade.value = DEEP_K.web;
  WEB.uFar.uFade.value = DEEP_K.web * DEEP_K.far;
  // Beyond a third of a light year the Solar System is sub-pixel: drop its layer so no shader runs at absurd range
  if (DEEP_K.near > 0) camera.layers.enable(0); else camera.layers.disable(0);
  const cmb = WEB.cmb;
  cmb.visible = DEEP_K.cmb > 0.003;
  if (cmb.visible) {
    cmb.position.copy(BY_ID.sun.disp).sub(O);
    const inside = cmb.position.distanceTo(camera.position) < R_UNIVERSE;
    const side = inside ? THREE.BackSide : THREE.FrontSide;
    if (cmb.material.side !== side) cmb.material.side = side;
    cmb.material.uniforms.uInside.value = inside ? 1 : 0;
    cmb.material.uniforms.uI.value = 0.55 * DEEP_K.cmb;
  }
}
