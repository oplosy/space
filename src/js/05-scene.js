/* ------------------------------------------------------------------ *
 *  Renderer & scene graph
 * ------------------------------------------------------------------ */
const STATE = {
  jd: jdFromMs(Date.now()),       // UTC Julian date
  rateIdx: 9, paused: false,
  scale: 1,
  show: { orbits: true, labels: true, belts: true, constellations: false, milkyway: true },
};

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 1e-5, 1e28);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 1.35);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* Uniforms shared by every lit material */
const SHARED = {
  uSunPos: { value: new V3() },
  uSunR: { value: 695700 },
  uSunI: { value: 1.4 },
  uSunColor: { value: new V3(1.0, 0.975, 0.94) },
  uTime: { value: 0 },
  uScale: { value: DPR },
};

const TEX = {};
function loadTextures() {
  const loader = new THREE.TextureLoader();
  const linear = new Set(['earthClouds', 'earthSpec']);
  const jobs = Object.keys(ASSETS).map(key => new Promise((res, rej) => loader.load(ASSETS[key], t => {
    t.colorSpace = linear.has(key) ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = MAX_ANISO;
    if (key === 'milkyWay') { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.wrapS = THREE.RepeatWrapping; }
    else if (key === 'saturnRing') { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; }
    else { t.wrapS = THREE.RepeatWrapping; }
    TEX[key] = t; res();
  }, undefined, rej)));
  return Promise.all(jobs);
}

const GEO = {
  sphereHi: new THREE.SphereGeometry(1, 160, 80),
  sphere: new THREE.SphereGeometry(1, 72, 36),
  ico: new THREE.IcosahedronGeometry(1, 6),
  quad: new THREE.PlaneGeometry(2, 2),
};

function linColor(hex, k = 1) { const c = new THREE.Color(hex); return new V3(c.r * k, c.g * k, c.b * k); }

function bodyUniforms(b) {
  return {
    uSunPos: SHARED.uSunPos, uSunR: SHARED.uSunR, uSunI: SHARED.uSunI, uSunColor: SHARED.uSunColor,
    uAmbient: { value: 0.0022 },
    uOcc: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    uOccLeak: { value: [0, 1, 2, 3].map(() => new V3()) },
    uOccN: { value: 0 },
    uShineDir: { value: new V3(0, 1, 0) }, uShineI: { value: 0 },
    uPole: { value: new V3(0, 1, 0) },
    uNormalScale: { value: new V3(1, 1, 1) },
    uAxes: { value: new V3(1, 1, 1) }, uIrregular: { value: 0 }, uSeed: { value: hashStr(b.id) * 50 },
    uRadius: { value: b.eqRadius },
  };
}

function makeBodyMaterial(b) {
  const s = b.surface, u = bodyUniforms(b);
  let frag;
  if (s.type === 'earth') {
    Object.assign(u, { uDay: { value: TEX.earthDay }, uNight: { value: TEX.earthNight }, uClouds: { value: TEX.earthClouds }, uSpec: { value: TEX.earthSpec }, uCloudShift: { value: 0 } });
    frag = FRAG_EARTH;
  } else if (s.type === 'tex' || s.type === 'gas') {
    Object.assign(u, {
      uMap: { value: TEX[s.map] }, uBump: { value: s.bump || 0 }, uModel: { value: s.type === 'gas' ? 2 : ({ lambert: 0, regolith: 1, cloud: 3 })[s.model] },
      uTint: { value: new V3(...(s.tint || [1, 1, 1])) }, uRim: { value: new V3(...(s.rim || [0, 0, 0])) }, uBands: { value: s.bands || 0 },
      uHasRing: { value: b.ring ? 1 : 0 }, uRingTex: { value: TEX.saturnRing }, uCenter: { value: new V3() },
      uRingIn: { value: 0 }, uRingOut: { value: 1 },
    });
    frag = FRAG_TEX;
  } else if (s.type === 'proc') {
    Object.assign(u, {
      uColA: { value: new V3(...s.a) }, uColB: { value: new V3(...s.b) }, uCrater: { value: s.crater || 0 },
      uRelief: { value: s.relief ?? 0.01 }, uStyle: { value: s.style || 0 }, uModel: { value: s.style === 9 ? 3 : 1 },
    });
    if (s.irregular) {
      const m = Math.max(...s.irregular);
      u.uIrregular.value = 1;
      u.uAxes.value.set(s.irregular[0] / m, s.irregular[2] / m, s.irregular[1] / m);
    }
    frag = FRAG_PROC;
  } else if (s.type === 'sun') {
    Object.assign(u, { uTime: SHARED.uTime, uIntensity: { value: 16 } });
    frag = FRAG_SUN;
  }
  return new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT_BODY, fragmentShader: frag });
}

function makeAtmosphere(b) {
  const a = b.atmosphere, R = b.radius;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uSunPos: SHARED.uSunPos, uSunR: SHARED.uSunR,
      uOcc: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uOccLeak: { value: [0, 1, 2, 3].map(() => new V3()) }, uOccN: { value: 0 },
      uCenter: { value: new V3() }, uRp: { value: R }, uTop: { value: a.top }, uCamLocal: { value: new V3() },
      uBetaR: { value: new V3(a.betaR[0] * R, a.betaR[1] * R, a.betaR[2] * R) }, uBetaM: { value: a.betaM * R },
      uHR: { value: a.hR }, uHM: { value: a.hM }, uG: { value: a.g }, uIntensity: { value: a.intensity },
    },
    vertexShader: VERT_ATMO, fragmentShader: FRAG_ATMO,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const m = new THREE.Mesh(GEO.sphere, mat);
  m.renderOrder = 2;
  return m;
}

function makeRing(b) {
  const R = b.eqRadius, g = new THREE.RingGeometry(b.ring.inner / R, b.ring.outer / R, 256, 2);
  g.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uRingTex: { value: TEX.saturnRing }, uRin: { value: b.ring.inner / R }, uRout: { value: b.ring.outer / R },
      uCenter: { value: new V3() }, uPlanetR: { value: R }, uPole: { value: new V3(0, 1, 0) },
      uSunPos: SHARED.uSunPos, uSunI: SHARED.uSunI,
    },
    vertexShader: VERT_RING, fragmentShader: FRAG_RING, side: THREE.DoubleSide,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 3;
  return m;
}

/* Runtime body state */
for (const b of BODIES) {
  b.phys = new V3(); b.disp = new V3(); b.rel = new V3();
  b.quat = new THREE.Quaternion(); b.poleV = new V3(0, 1, 0);
  b.dispR = b.eqRadius; b.screen = { x: 0, y: 0, r: 0, vis: false, depth: 0 };
  b.occluders = [];
}
// Shadow casters for each body (largest first)
for (const b of BODIES) {
  if (b.kind === 'star') continue;
  const list = [];
  if (b.parent && b.parent !== 'sun') list.push(BY_ID[b.parent]);
  list.push(...b.children.slice().sort((x, y) => y.radius - x.radius));
  if (b.parent && b.parent !== 'sun' && BY_ID[b.parent].id !== 'earth') list.push(...BY_ID[b.parent].children.filter(c => c !== b && c.radius > 500));
  b.occluders = list.slice(0, 4);
}
const LEAK = { earth: new V3(0.16, 0.045, 0.012), venus: new V3(0.05, 0.035, 0.015), titan: new V3(0.04, 0.02, 0.0), mars: new V3(0.02, 0.008, 0.004) };

function buildBodies() {
  for (const b of BODIES) {
    const group = new THREE.Group();
    const irregular = !!b.surface.irregular;
    const geo = irregular ? GEO.ico : (b.kind === 'star' || b.radius > 20000 || b.id === 'earth' ? GEO.sphereHi : GEO.sphere);
    const mat = makeBodyMaterial(b);
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    b.obj = { group, mesh, mat };
    if (b.flat) mat.uniforms.uNormalScale.value.set(1, 1 / ((1 - b.flat) * (1 - b.flat)), 1);
    if (b.atmosphere) { b.obj.atmo = makeAtmosphere(b); group.add(b.obj.atmo); }
    if (b.ring) { b.obj.ring = makeRing(b); mesh.add(b.obj.ring); }
    scene.add(group);
  }
  // Sun extras
  const sun = BY_ID.sun;
  const corona = new THREE.Mesh(GEO.quad, new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 1 }, uK: { value: 9 }, uTime: SHARED.uTime, uI: { value: 5.0 }, uColor: { value: new V3(1.0, 0.78, 0.5) } },
    vertexShader: VERT_BILLBOARD, fragmentShader: FRAG_CORONA, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  corona.frustumCulled = false; corona.renderOrder = 4;
  sun.obj.group.add(corona);
  sun.obj.corona = corona;
  const glare = new THREE.Mesh(GEO.quad, new THREE.ShaderMaterial({
    uniforms: { uCenter: { value: new V3() }, uRes: { value: new THREE.Vector2(1, 1) }, uSizePx: { value: 300 }, uI: { value: 1 } },
    vertexShader: VERT_GLARE, fragmentShader: FRAG_GLARE, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  glare.frustumCulled = false; glare.renderOrder = 1000;
  scene.add(glare);
  sun.obj.glare = glare;
}

/* ------------------------------ orbit lines ------------------------------ */
const ORBITS = [];
function buildOrbits() {
  for (const b of BODIES) {
    if (b.kind === 'star') continue;
    const N = b.kind === 'comet' ? 1400 : b.kind === 'moon' ? 300 : 720;
    const pos = new Float32Array(N * 3), fade = new Float32Array(N);
    const warp = b.kind === 'comet' ? 1 : 1.7;
    for (let k = 0; k < N; k++) fade[k] = Math.pow(k / (N - 1), warp);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
    const col = new THREE.Color(b.kind === 'moon' ? '#9AA7BA' : b.color);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new V3(col.r, col.g, col.b) }, uOpacity: { value: 0.6 }, uDash: { value: 0 } },
      vertexShader: VERT_LINE, fragmentShader: FRAG_LINE, transparent: true, depthWrite: false,
    });
    const line = new THREE.Line(g, mat);
    line.frustumCulled = false; line.renderOrder = 1;
    scene.add(line);
    b.orbitLine = { line, pos, fade, N, mat };
    ORBITS.push(b);
  }
}

const _oa = new V3(), _ob = new V3(), _oc = new V3();
function sampleOrbit(b, jdTT) {
  const o = b.orbitLine, N = o.N, pos = o.pos;
  if (b.eph === 'jpl') {
    const P = b.periodDays;
    planetHelio(b.id, jdTT, _oa);
    for (let k = 0; k < N; k++) {
      planetHelio(b.id, jdTT - o.fade[k] * P * 0.995, _ob);
      pos[k * 3] = _ob.x - _oa.x; pos[k * 3 + 1] = _ob.y - _oa.y; pos[k * 3 + 2] = _ob.z - _oa.z;
    }
  } else if (b.eph === 'comet') {
    const c = b.comet, a = c.q / (1 - c.e);
    const M = Math.sqrt(GM_SUN / (a * a * a)) * (jdTT - c.tp) * DAY;
    const E0 = solveKepler(M, c.e), sq = Math.sqrt(1 - c.e * c.e);
    orbitalToScene(a * (Math.cos(E0) - c.e), a * sq * Math.sin(E0), c.i * DEG, c.node * DEG, c.peri * DEG, _oa);
    for (let k = 0; k < N; k++) {
      const E = E0 - o.fade[k] * TAU * 0.998;
      orbitalToScene(a * (Math.cos(E) - c.e), a * sq * Math.sin(E), c.i * DEG, c.node * DEG, c.peri * DEG, _ob);
      pos[k * 3] = _ob.x - _oa.x; pos[k * 3 + 1] = _ob.y - _oa.y; pos[k * 3 + 2] = _ob.z - _oa.z;
    }
  } else {
    const P = b.periodDays, par = BY_ID[b.parent], s = STATE.scale;
    scaledOffset(par.radius, s, relPos(b, jdTT, _oc), _oa);
    for (let k = 0; k < N; k++) {
      scaledOffset(par.radius, s, relPos(b, jdTT - o.fade[k] * P * 0.995, _oc), _ob);
      pos[k * 3] = _ob.x - _oa.x; pos[k * 3 + 1] = _ob.y - _oa.y; pos[k * 3 + 2] = _ob.z - _oa.z;
    }
  }
  o.line.geometry.attributes.position.needsUpdate = true;
}

/* ------------------------------ star sky ------------------------------ */
function bvToRGB(bv) {
  bv = clamp(bv, -0.4, 2.0);
  const T = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  // Tanner Helland blackbody approximation (sRGB 0..1)
  const t = T / 100;
  let r = t <= 66 ? 1 : clamp(1.29293618606 * Math.pow(t - 60, -0.1332047592), 0, 1);
  let g = t <= 66 ? clamp(0.39008157876 * Math.log(t) - 0.63184144378, 0, 1) : clamp(1.12989086089 * Math.pow(t - 60, -0.0755148492), 0, 1);
  let bl = t >= 66 ? 1 : t <= 19 ? 0 : clamp(0.54320678911 * Math.log(t - 10) - 1.19625408914, 0, 1);
  // stars look mostly white to the eye: desaturate toward white
  const k = 0.55;
  r = r * k + (1 - k); g = g * k + (1 - k); bl = bl * k + (1 - k);
  const c = new THREE.Color().setRGB(r, g, bl, THREE.SRGBColorSpace);
  return c;
}

const SKY = {};
function buildSky() {
  // Milky Way panorama (galactic coordinates)
  const toEq = new THREE.Matrix3();
  {
    const cols = [];
    for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      // scene → ecliptic → equatorial
      const xe = v[0], ye = -v[2], ze = v[1];
      cols.push([xe, ye * COS_OBL - ze * SIN_OBL, ye * SIN_OBL + ze * COS_OBL]);
    }
    toEq.set(cols[0][0], cols[1][0], cols[2][0], cols[0][1], cols[1][1], cols[2][1], cols[0][2], cols[1][2], cols[2][2]);
  }
  const eqToGal = new THREE.Matrix3().set(
    -0.0548755604, -0.8734370902, -0.4838350155,
    0.4941094279, -0.4448296300, 0.7469822445,
    -0.8676661490, -0.1980763734, 0.4559837762);
  const gal = new THREE.Matrix3().multiplyMatrices(eqToGal, toEq);
  const mw = new THREE.Mesh(GEO.quad, new THREE.ShaderMaterial({
    uniforms: { uTex: { value: TEX.milkyWay }, uTan: { value: new THREE.Vector2(1, 1) }, uCamRot: { value: new THREE.Matrix3() }, uGal: { value: gal }, uBright: { value: 1.25 } },
    vertexShader: VERT_MW, fragmentShader: FRAG_MW, depthTest: false, depthWrite: false,
  }));
  mw.frustumCulled = false; mw.renderOrder = -100;
  // orient the panorama from whichever camera draws it (the main view or a black hole's cube camera)
  mw.onBeforeRender = (r, s, cam) => {
    const u = mw.material.uniforms, t = Math.tan(cam.fov * DEG / 2);
    u.uTan.value.set(t * cam.aspect, t); u.uCamRot.value.setFromMatrix4(cam.matrixWorld);
  };
  scene.add(mw);
  SKY.mw = mw;

  // Catalogue stars
  const raw = Uint8Array.from(atob(STAR_DATA), c => c.charCodeAt(0));
  const dv = new DataView(raw.buffer), n = raw.length / 6;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), mag = new Float32Array(n);
  const v = new V3();
  for (let i = 0; i < n; i++) {
    const ra = dv.getUint16(i * 6, true) / 65535 * 360;
    const dec = dv.getInt16(i * 6 + 2, true) / 32767 * 90;
    const m = dv.getUint8(i * 6 + 4) / 20 - 2;
    const bv = dv.getUint8(i * 6 + 5) / 100 - 0.4;
    raDecToScene(ra, dec, v);
    pos.set([v.x, v.y, v.z], i * 3);
    const c = bvToRGB(bv);
    col.set([c.r, c.g, c.b], i * 3);
    mag[i] = m;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
  const stars = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uScale: SHARED.uScale, uBright: { value: 1 } },
    vertexShader: VERT_STARS, fragmentShader: FRAG_STARS, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  stars.frustumCulled = false; stars.renderOrder = -90;
  scene.add(stars);
  SKY.stars = stars;
  SKY.starCount = n;

  // Constellation figures
  const L = SKY_DATA.lines, lp = new Float32Array(L.length / 2 * 3);
  for (let i = 0; i < L.length / 2; i++) {
    raDecToScene(L[i * 2], L[i * 2 + 1], v);
    lp.set([v.x, v.y, v.z], i * 3);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new V3(0.35, 0.55, 0.9) }, uOpacity: { value: 0.22 } },
    vertexShader: VERT_SKYLINE, fragmentShader: FRAG_SKYLINE, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  lines.frustumCulled = false; lines.renderOrder = -80; lines.visible = false;
  scene.add(lines);
  SKY.lines = lines;
  SKY.names = SKY_DATA.names.map(([name, ra, dec, rank]) => ({ name, rank, dir: raDecToScene(ra, dec, new V3()) }));
  SKY.bright = SKY_DATA.bright.map(([name, ra, dec, mag]) => ({ name, mag, dir: raDecToScene(ra, dec, new V3()) }));
}

/* ------------------------------ small-body belts ------------------------------ */
const BELTS = [];
function gauss(rnd) { return Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(TAU * rnd()); }
function rayleigh(rnd, s) { return s * Math.sqrt(-2 * Math.log(rnd() + 1e-12)); }
function buildBelts() {
  const rnd = mulberry(20260923);
  const make = (count, gen, color, color2, opacity, size, belt) => {
    const o1 = new Float32Array(count * 4), o2 = new Float32Array(count * 4);
    for (let k = 0; k < count; k++) {
      const [a, e, i, Om, w, M0, n, tint] = gen();
      o1.set([a, e, i, Om], k * 4); o2.set([w, M0, n, tint], k * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aOrb1', new THREE.BufferAttribute(o1, 4));
    g.setAttribute('aOrb2', new THREE.BufferAttribute(o2, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uDays: { value: 0 }, uSunPos: { value: new V3() }, uSize: { value: size }, uScale: SHARED.uScale, uColor: { value: color }, uColor2: { value: color2 }, uOpacity: { value: opacity } },
      vertexShader: VERT_BELT, fragmentShader: FRAG_BELT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.userData = belt;
    scene.add(pts);
    BELTS.push(pts);
  };
  const nOf = aKm => Math.sqrt(GM_SUN / (aKm * aKm * aKm)) * DAY;
  const gaps = [[2.502, 0.03], [2.825, 0.022], [2.958, 0.014], [3.279, 0.04], [2.065, 0.03]];
  // Main belt with Kirkwood gaps
  make(34000, () => {
    let a;
    for (;;) {
      a = 2.1 + Math.pow(rnd(), 1.15) * 1.25 + gauss(rnd) * 0.04;
      if (a < 2.08 || a > 3.45) continue;
      if (gaps.some(([g, w]) => Math.abs(a - g) < w * (0.6 + 0.4 * rnd()))) continue;
      break;
    }
    const aKm = a * AU;
    return [aKm, clamp(Math.abs(0.13 + gauss(rnd) * 0.07), 0, 0.33), rayleigh(rnd, 7.5) * DEG, rnd() * TAU, rnd() * TAU, rnd() * TAU, nOf(aKm), rnd()];
  }, new V3(0.36, 0.33, 0.30), new V3(0.46, 0.37, 0.28), 0.9, 1.35, { base: 0.8, from: 7.3, ref: 2.5 * AU });
  // Hildas (3:2 with Jupiter)
  make(1800, () => {
    const aKm = (3.97 + gauss(rnd) * 0.04) * AU;
    return [aKm, 0.08 + rnd() * 0.22, rayleigh(rnd, 6) * DEG, rnd() * TAU, rnd() * TAU, rnd() * TAU, nOf(aKm), rnd()];
  }, new V3(0.34, 0.30, 0.28), new V3(0.40, 0.33, 0.27), 0.8, 1.3, { base: 0.75, from: 7.5, ref: 4 * AU });
  // Jupiter trojans around L4 / L5 — co-orbital, so they share Jupiter's mean motion
  const lamJ = 34.39644051 * DEG, nJ = 3034.74612775 * DEG / 36525;
  make(5200, () => {
    const Om = rnd() * TAU, w = rnd() * TAU;
    const lam = lamJ + (rnd() < 0.55 ? 1 : -1) * 60 * DEG + gauss(rnd) * 13 * DEG;
    return [5.2026 * AU * (1 + gauss(rnd) * 0.012), rnd() * 0.11, rayleigh(rnd, 11) * DEG, Om, w, lam - Om - w, nJ, rnd()];
  }, new V3(0.36, 0.30, 0.26), new V3(0.44, 0.34, 0.26), 0.85, 1.3, { base: 0.75, from: 7.6, ref: 5 * AU });
  // Kuiper belt: cold classicals, hot classicals and plutinos
  make(16000, () => {
    const r = rnd();
    let a, e, i;
    if (r < 0.5) { a = 42 + rnd() * 5; e = rnd() * 0.08; i = rayleigh(rnd, 2); }
    else if (r < 0.82) { a = 38 + rnd() * 12; e = rnd() * 0.2; i = rayleigh(rnd, 12); }
    else { a = 39.45 + gauss(rnd) * 0.2; e = 0.1 + rnd() * 0.2; i = rayleigh(rnd, 10); }
    const aKm = a * AU;
    return [aKm, e, i * DEG, rnd() * TAU, rnd() * TAU, rnd() * TAU, nOf(aKm), rnd()];
  }, new V3(0.30, 0.33, 0.40), new V3(0.40, 0.36, 0.36), 0.8, 1.3, { base: 0.7, from: 8.9, ref: 45 * AU });
}

/* ------------------------------ comet tails ------------------------------ */
const COMET = {};
function buildComet() {
  const n = 9000, a = new Float32Array(n * 4), rnd = mulberry(1986);
  for (let k = 0; k < n; k++) {
    const type = k < n * 0.45 ? 0 : 1;
    a.set([Math.pow(rnd(), 1.6), gauss(rnd), gauss(rnd), type], k * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aP', new THREE.BufferAttribute(a, 4));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uNucleus: { value: new V3() }, uAnti: { value: new V3(1, 0, 0) }, uVel: { value: new V3(0, 0, 1) }, uLen: { value: 1 }, uAct: { value: 0 }, uScale: SHARED.uScale, uTime: SHARED.uTime, uPxScale: { value: 500 } },
    vertexShader: VERT_TAIL, fragmentShader: FRAG_TAIL, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const tail = new THREE.Points(g, mat);
  tail.frustumCulled = false;
  scene.add(tail);
  const coma = new THREE.Mesh(GEO.quad, new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 1 }, uK: { value: 12 }, uTime: SHARED.uTime, uI: { value: 1 }, uColor: { value: new V3(0.55, 0.8, 1.0) } },
    vertexShader: VERT_BILLBOARD, fragmentShader: FRAG_CORONA, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  coma.frustumCulled = false; coma.renderOrder = 5;
  BY_ID.halley.obj.group.add(coma);
  Object.assign(COMET, { tail, coma, mat });
}

/* ------------------------------ distant-body glints ------------------------------ */
const GLINTS = {};
function buildGlints() {
  const list = BODIES.filter(b => b.kind !== 'star');
  const n = list.length;
  const g = new THREE.BufferGeometry();
  const col = new Float32Array(n * 3), size = new Float32Array(n);
  list.forEach((b, i) => {
    const c = new THREE.Color(b.color);
    col.set([c.r * 1.3, c.g * 1.3, c.b * 1.3], i * 3);
    size[i] = b.kind === 'moon' ? 3.2 : 4.5;
  });
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uScale: SHARED.uScale }, vertexShader: VERT_POINTS, fragmentShader: FRAG_POINTS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  pts.frustumCulled = false; pts.renderOrder = 6;
  scene.add(pts);
  Object.assign(GLINTS, { pts, list });
}
