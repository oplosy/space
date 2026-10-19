/* ------------------------------------------------------------------ *
 *  Filling in the way out: the Oort Cloud, Laniakea and the Great
 *  Attractor, the great walls and the Boötes Void, and the most distant
 *  beacons: quasars 3C 273 and TON 618 and galaxy JADES-GS-z14-0.
 *  Distances beyond ~1 billion ly are comoving (today's distance).
 * ------------------------------------------------------------------ */

/* ------------------------------ targets ------------------------------ */
const OORT = deepTarget({
  id: 'oort', name: 'Oort Cloud', short: 'Oort Cloud', kind: 'region', color: '#B9CCFF',
  subtitle: 'The Solar System’s outer shell of comets', navDist: '0.03–1.6 ly', distLy: 0.03, pos: new V3(), frameQ: null,
  viewDir: new V3(0.55, 0.45, 0.7).normalize(), minD: 800 * AU, defD: 3.4 * LY,
  blurb: 'A vast, sparse cloud of perhaps a trillion icy bodies, loosely bound to the Sun out to about a quarter of the way to Alpha Centauri. Passing stars nudge some inward, where they become long-period comets. No Oort Cloud object has ever been seen there directly, so its shape here follows the models: a flattened inner Hills cloud and a spherical outer cloud.',
  facts: [['Inner edge', '≈ 2,000 AU'], ['Outer edge', '≈ 100,000 AU (1.6 ly)'], ['Objects', '≈ 10¹¹–10¹² bigger than 1 km'], ['Total mass', 'A few Earth masses'], ['Light time from the Sun', 'up to 1.6 years'], ['Voyager 1 reaches it in', '≈ 300 years']],
});
const GA_POS = raDecToScene(243.9, -60.9, new V3()).multiplyScalar(220 * MLY);         // Norma Cluster, at the Great Attractor
const LANIAKEA = deepTarget({
  id: 'laniakea', name: 'Laniakea Supercluster', short: 'Laniakea', kind: 'cluster', color: '#FFE08A',
  subtitle: 'Our home supercluster', navDist: '520M ly wide', distLy: 1.5e8, pos: GA_POS.clone().multiplyScalar(0.62), minD: 20 * MLY, defD: 900 * MLY,
  blurb: 'Laniakea, “immeasurable heaven” in Hawaiian, was defined in 2014 by mapping how 8,000 galaxies move. Everything inside it, including the Virgo Cluster and the Milky Way near its edge, flows toward the Great Attractor. The streamlines show that flow; they are illustrative, not measured paths.',
  facts: [['Diameter', '≈ 520 million ly'], ['Galaxies', '≈ 100,000'], ['Mass', '≈ 10¹⁷ M☉'], ['Contains', 'Virgo, Hydra, Centaurus, Norma'], ['Defined', '2014, Tully et al.']],
});
const GREAT_ATTRACTOR = deepTarget({
  id: 'greatattractor', name: 'Great Attractor', short: 'Great Attractor', kind: 'cluster', color: '#FFE08A',
  subtitle: 'The centre of Laniakea’s flow', navDist: '220M ly', distLy: 2.2e8, lightAgo: '≈ 220 million years ago', pos: GA_POS.clone(), minD: 3 * MLY, defD: 110 * MLY,
  blurb: 'A concentration of mass tens of thousands of times the Milky Way’s, around the Norma Cluster. It lies behind the dusty plane of our own galaxy, so it was found in the 1980s from the motions of galaxies before it could be seen.',
  facts: [['Distance', '≈ 220 million ly'], ['Direction', 'Norma, behind the Milky Way'], ['Central cluster', 'Norma (Abell 3627)'], ['Our speed toward it', '≈ 600 km/s (with Laniakea’s flow)']],
});
const BOOTES = { c: raDecToScene(222.5, 46, new V3()).multiplyScalar(700 * MLY), r: 160 * MLY };
const BOOTES_VOID = deepTarget({
  id: 'bootes', name: 'Boötes Void', short: 'Boötes Void', kind: 'region', color: '#9AA8C8',
  subtitle: 'The Great Nothing', navDist: '700M ly', distLy: 7e8, lightAgo: '≈ 700 million years ago', pos: BOOTES.c.clone(), minD: 20 * MLY, defD: 520 * MLY,
  blurb: 'A sphere 330 million light years across with only about 60 galaxies, where the cosmic web would put thousands. Had the Milky Way been at its centre, we would not have known other galaxies existed until the 1960s.',
  facts: [['Diameter', '≈ 330 million ly'], ['Galaxies found inside', '≈ 60'], ['Discovered', '1981, Kirshner et al.'], ['Direction', 'Boötes']],
});
const SLOAN = { ra: [148, 218], dec: [-1, 6], d: 1000 };
const SLOAN_WALL = deepTarget({
  id: 'sloanwall', name: 'Sloan Great Wall', short: 'Sloan Great Wall', kind: 'cluster', color: '#FFD9A0',
  subtitle: 'A 1.4-billion-light-year wall of galaxies', navDist: '1.0B ly', distLy: 1e9, lightAgo: '≈ 1 billion years ago',
  pos: raDecToScene(183, 2.5, new V3()).multiplyScalar(1000 * MLY), minD: 50 * MLY, defD: 1900 * MLY,
  blurb: 'One of the largest known structures, found in 2003 in the Sloan Digital Sky Survey: a chain of superclusters stretching across 1.4 billion light years. It is not gravitationally bound and will slowly come apart.',
  facts: [['Length', '≈ 1.37 billion ly'], ['Distance', '≈ 1 billion ly'], ['Discovered', '2003, SDSS'], ['Bound?', 'No']],
});
const HERC = { dir: galDir(45, 47, new V3()), d: 16000 };
const HERC_WALL = deepTarget({
  id: 'hercwall', name: 'Hercules–Corona Borealis Great Wall', short: 'Hercules–CrB Great Wall', kind: 'cluster', color: '#C8C0FF',
  subtitle: 'Possibly the largest structure known', navDist: '16B ly', distLy: 1.6e10, lightAgo: '≈ 10 billion years ago',
  pos: HERC.dir.clone().multiplyScalar(HERC.d * MLY), minD: 500 * MLY, defD: 26000 * MLY,
  blurb: 'An excess of gamma-ray bursts in one patch of sky, reported in 2013, hints at a structure about 10 billion light years long. Its reality is debated: it is inferred from a few dozen bursts, not mapped galaxies, so its shape here is an illustration.',
  facts: [['Length', '≈ 10 billion ly (debated)'], ['Redshift', 'z ≈ 1.6–2.1'], ['Light left it', '≈ 10 billion years ago'], ['Evidence', 'Clustering of gamma-ray bursts'], ['Status', 'Debated']],
});
// Distant beacons: [target, colour, point size]
const BEACONS = [
  [deepTarget({ id: '3c273', name: '3C 273', short: '3C 273', kind: 'galaxy', color: '#BFD8FF',
    subtitle: 'The first quasar identified', navDist: '2.2B ly', distLy: 2.15e9, lightAgo: '≈ 2.4 billion years ago', minD: 20 * MLY, defD: 400 * MLY,
    pos: raDecToScene(187.2779, 2.0524, new V3()).multiplyScalar(2150 * MLY),
    blurb: 'In 1963 Maarten Schmidt realised this “star” was receding at 16% of the speed of light: a galaxy core shining like 4 trillion Suns, powered by gas falling into a black hole. It is the brightest quasar in our sky, visible in amateur telescopes.',
    facts: [['Black hole', '≈ 890 million M☉'], ['Luminosity', '≈ 4 × 10¹² Suns'], ['Redshift', 'z = 0.158'], ['Jet length', '≈ 200,000 ly'], ['Discovered', '1963']] }), [0.75, 0.85, 1.0], 9],
  [deepTarget({ id: 'ton618', name: 'TON 618', short: 'TON 618', kind: 'galaxy', color: '#BFD8FF',
    subtitle: 'Quasar with one of the largest black holes known', navDist: '18B ly', distLy: 1.82e10, lightAgo: '≈ 10.8 billion years ago', minD: 50 * MLY, defD: 1500 * MLY,
    pos: raDecToScene(187.1037, 31.4773, new V3()).multiplyScalar(18200 * MLY),
    blurb: 'A quasar so luminous it outshines the whole Milky Way 100,000 times. Its central black hole is estimated at about 40 billion solar masses; its event horizon would swallow the Solar System dozens of times over.',
    facts: [['Black hole', '≈ 40 billion M☉'], ['Event horizon', '≈ 1,600 AU across'], ['Redshift', 'z = 2.219'], ['Light left it', '≈ 10.8 billion years ago'], ['Today it is', '≈ 18 billion ly away']] }), [0.8, 0.88, 1.0], 11],
  [deepTarget({ id: 'jadesz14', name: 'JADES-GS-z14-0', short: 'JADES-GS-z14-0', kind: 'galaxy', color: '#FF9C8A',
    subtitle: 'Galaxy seen 290 million years after the Big Bang', navDist: '33.8B ly', distLy: 3.38e10, lightAgo: '≈ 13.5 billion years ago', minD: 50 * MLY, defD: 2500 * MLY,
    pos: raDecToScene(53.0830, -27.8559, new V3()).multiplyScalar(33800 * MLY),
    blurb: 'Confirmed by JWST in 2024, this galaxy is seen as it was when the universe was 2% of its current age. It is surprisingly large and bright, already rich in oxygen, a sign that the first stars formed very quickly. MoM-z14 (z = 14.44, 2025) has since edged it out as the most distant known.',
    facts: [['Redshift', 'z = 14.32'], ['Seen at', '290 million years after the Big Bang'], ['Light travelled', '≈ 13.5 billion years'], ['Today it is', '≈ 33.8 billion ly away'], ['Size', '≈ 1,600 ly across'], ['Found by', 'JWST, 2024']] }), [1.0, 0.55, 0.4], 7],
];

/* ------------------------------ cosmic-web shaping (used by buildCosmicWeb) ------------------------------ */
const _bv = new V3();
// Galactic-frame Mly coordinates: is the point inside the Boötes Void?
function inBootes(x, y, z) {
  _bv.copy(GAL_X).multiplyScalar(x * MLY).addScaledVector(GAL_Y, y * MLY).addScaledVector(GAL_Z, z * MLY);
  return _bv.distanceToSquared(BOOTES.c) < BOOTES.r * BOOTES.r;
}
// Superclusters of the Sloan Great Wall as extra cosmic-web nodes
function sloanNodes() {
  const out = [], v = new V3();
  for (let i = 0; i < 10; i++) {
    const f = i / 9, ra = SLOAN.ra[0] + (SLOAN.ra[1] - SLOAN.ra[0]) * f, dec = SLOAN.dec[0] + (SLOAN.dec[1] - SLOAN.dec[0]) * Math.sin(f * Math.PI);
    const d = SLOAN.d * (1 + 0.06 * Math.sin(f * 7));
    out.push({ p: toGal(raDecToScene(ra, dec, v)).map(c => c * d), rich: 1.3 + 0.5 * Math.sin(f * 11), n: 380 });
  }
  return out;
}
// The Hercules–Corona Borealis wall as a thick sheet of far-tier glows
function hercPoints(rnd, add, WEBC) {
  const r = new V3(...toGal(HERC.dir)), a = new V3().crossVectors(r, new V3(0, 0, 1)).normalize(), b = new V3().crossVectors(r, a);
  for (let i = 0; i < 9000; i++) {
    const u = gauss(rnd) * 0.45, w = gauss(rnd) * 0.32, h = gauss(rnd) * 0.08;
    const p = r.clone().multiplyScalar(HERC.d * (1 + h)).addScaledVector(a, u * 5000).addScaledVector(b, w * 3500);
    add(p.x, p.y, p.z, WEBC, 0.008, 380 + rnd() * 520, 1);
  }
}

/* ------------------------------ rendering ------------------------------ */
const VERT_DOT = /* glsl */`
attribute vec3 aColor; attribute float aSize; uniform float uScale, uI; varying vec3 vC;
void main(){
  vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv;
  gl_PointSize=aSize*uScale; vC=aColor*uI;
}`;
const FRAG_DOT = /* glsl */`
varying vec3 vC;
void main(){
  vec2 q=gl_PointCoord*2.0-1.0; float r=dot(q,q); if(r>1.0)discard;
  gl_FragColor=vec4(vC*(exp(-r*5.0)+0.25*exp(-r*1.2)),1.0);
}`;
function dotPoints(pos, col, size, layer) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const p = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uScale: SHARED.uScale, uI: { value: 0 } }, vertexShader: VERT_DOT, fragmentShader: FRAG_DOT,
    depthTest: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending,
  }));
  p.frustumCulled = false; p.layers.set(layer); p.visible = false;
  scene.add(p);
  return p;
}

const OUTER = {};
function buildOuter() {
  const rnd = mulberry(1950);
  // Oort Cloud (AU units): flattened inner Hills cloud and spherical outer cloud, density falling as r^-3.5
  {
    const N = 70000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const inner = i < N * 0.4, r0 = inner ? 2000 : 20000, r1 = inner ? 20000 : 100000;
      const r = r0 * Math.pow(1 - rnd() * (1 - Math.pow(r1 / r0, -0.5)), -2);          // number density ∝ r^-3.5
      const u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u), fl = inner ? 0.35 + 0.65 * (r - 2000) / 18000 : 1;
      pos.set([r * s * Math.cos(t), r * u * fl, r * s * Math.sin(t)], i * 3);
      const k = 0.5 + rnd() * 0.5;
      col.set([0.7 * k, 0.8 * k, 1.0 * k], i * 3); size[i] = 0.9 + rnd() * 0.8;
    }
    OUTER.oort = dotPoints(pos, col, size, 5);
    OUTER.oort.scale.setScalar(AU); OUTER.oort.renderOrder = -88;
  }
  // Laniakea flow lines (galactic-frame Mly), converging on the Great Attractor
  {
    const ga = new V3(...toGal(GA_POS)).multiplyScalar(1 / MLY), P = [], C = [], p = new V3(), d = new V3(), sw = new V3();
    const cen = ga.clone().multiplyScalar(0.62), axis = new V3(0.3, 0.2, 1).normalize();
    for (let i = 0; i < 420; i++) {
      const r = 260 * Math.cbrt(rnd()), u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u);
      p.set(r * s * Math.cos(t), r * s * Math.sin(t), r * u).add(cen);
      for (let k = 0; k < 40; k++) {
        const dist = p.distanceTo(ga);
        if (dist < 14) break;
        d.copy(ga).sub(p).normalize();
        sw.crossVectors(axis, d).multiplyScalar(0.45 * Math.min(dist / 150, 1));
        d.add(sw).normalize();
        const q = p.clone().addScaledVector(d, Math.min(9, dist * 0.2));
        const f0 = 1 - Math.min(dist / 300, 1), f1 = 1 - Math.min(q.distanceTo(ga) / 300, 1);
        P.push(p.x, p.y, p.z, q.x, q.y, q.z);
        for (const f of [f0, f1]) C.push(0.35 + 0.65 * f, 0.45 + 0.45 * f, 0.9 - 0.45 * f);
        p.copy(q);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending }));
    lines.frustumCulled = false; lines.layers.set(4); lines.renderOrder = -70; lines.visible = false;
    lines.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(GAL_X, GAL_Y, GAL_Z));
    lines.scale.setScalar(MLY);
    scene.add(lines);
    OUTER.flow = lines;
  }
  // Quasars and the most distant galaxy: bright point beacons
  OUTER.beacons = BEACONS.map(([t, c, s]) => {
    const p = dotPoints(new Float32Array(3), new Float32Array(c), new Float32Array([s]), 4);
    p.renderOrder = -69;
    return { t, p };
  });
}

function updateOuter(O) {
  const l = DEEP_K.lSun, sun = BY_ID.sun.disp;
  // Oort Cloud: from a few hundred AU out to tens of light years
  const lAU = l + Math.log10(LY / AU);
  const ko = smooth(clamp((lAU - 2.6) / 0.8, 0, 1)) * (1 - smooth(clamp((l - 1.0) / 0.8, 0, 1)));
  OUTER.oort.visible = ko > 0.003;
  OUTER.oort.material.uniforms.uI.value = 0.2 * ko;
  OUTER.oort.position.copy(sun).sub(O);
  // Laniakea streamlines when looking at the local universe
  const kf = smooth(clamp((l - 7.6) / 0.6, 0, 1)) * (1 - smooth(clamp((l - 9.6) / 0.6, 0, 1))) * DEEP_K.web;
  const tf = CAM.target === LANIAKEA || CAM.target === GREAT_ATTRACTOR ? 1 : 0.4;
  OUTER.flow.visible = kf > 0.003;
  OUTER.flow.material.opacity = 0.16 * kf * tf;
  OUTER.flow.position.copy(sun).sub(O);
  // Beacons appear with the cosmic web; the far ones with its outer tier or when targeted
  for (const { t, p } of OUTER.beacons) {
    const k = DEEP_K.web * Math.min(t.id === '3c273' ? 1 : DEEP_K.far + (CAM.target === t ? 1 : 0), 1);
    p.visible = k > 0.003;
    p.material.uniforms.uI.value = 1.6 * k;
    p.position.copy(t.disp).sub(O);
  }
}
