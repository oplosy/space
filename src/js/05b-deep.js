/* ------------------------------------------------------------------ *
 *  Beyond the Solar System: a particle model of the Milky Way and
 *  Sagittarius A*, ray-traced through Schwarzschild spacetime.
 *  The galaxy sits on layer 1 so a cube camera at the black hole can
 *  capture it as the background that the hole lenses.
 * ------------------------------------------------------------------ */
const R_SUN_GC = 26670;                                   // ly (GRAVITY 2019: 8.178 kpc)
const SGR_M = 4.297e6;                                    // solar masses (GRAVITY 2021)
const SGR_RS = 2 * 6.6743e-20 * SGR_M * 1.98847e30 / (C_KMS * C_KMS);   // km
const BH_PROXY = 1000;                                    // ray-traced region, in Rs

// Galactic axes (IAU 1958, J2000) expressed in the scene frame
const GAL_X = equToScene(-0.0548755604, -0.8734370902, -0.4838350155, new V3());   // toward the centre
const GAL_Y = equToScene(0.4941094279, -0.4448296300, 0.7469822445, new V3());     // l = 90°
const GAL_Z = equToScene(-0.8676661490, -0.1980763734, 0.4559837762, new V3());    // north pole
const GC_POS = GAL_X.clone().multiplyScalar(R_SUN_GC * LY);
const GAL_FRAME = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(GAL_Y, GAL_Z, GAL_X));

const MILKY_WAY = {
  id: 'milkyway', name: 'Milky Way', short: 'Milky Way', kind: 'galaxy', deep: true, color: '#C9B8FF',
  subtitle: 'Our galaxy · barred spiral',
  blurb: 'A statistical model of our galaxy: an old stellar disc, a central bar tilted about 27° to our line of sight, and four logarithmic spiral arms with a 12° pitch (Perseus, Sagittarius–Carina, Scutum–Centaurus and Norma). The Sun sits in the Orion Spur between them. Pink knots are star-forming regions, dark lanes are dust, and each point is a cloud of many stars.',
  facts: [['Type', 'Barred spiral, SBbc'], ['Stellar disc', '≈ 100,000 ly across'], ['Stars', '100–400 billion'], ['Sun to centre', '26,670 ly'], ['Sun’s orbit', '≈ 230 Myr at 230 km/s'], ['Bar half-length', '≈ 15,000 ly']],
  dispR: 1, radius: 0, children: [], frameQ: GAL_FRAME,
  viewDir: GAL_X.clone().multiplyScalar(-0.52).addScaledVector(GAL_Z, 0.85).addScaledVector(GAL_Y, 0.08).normalize(),
};
const SGR_A = {
  id: 'sgra', name: 'Sagittarius A*', short: 'Sgr A*', kind: 'bh', deep: true, color: '#FFB36B',
  subtitle: 'Supermassive black hole · galactic centre',
  blurb: 'The black hole at the centre of the Milky Way. Every pixel near it is ray-traced through Schwarzschild spacetime: light bends around the hole, the shadow is 5.2 Rₛ across, and a thin accretion disc is Doppler-boosted on its approaching side and redshifted by gravity. The real Sgr A* is fed by a faint, hot flow, so the bright disc is an idealised illustration.',
  facts: [['Mass', '4.30 million M☉'], ['Schwarzschild radius', '12.7 million km'], ['Shadow diameter', '≈ 5.2 Rₛ'], ['Distance', '26,670 ly'], ['Innermost stable orbit', '3 Rₛ · period ≈ 33 min'], ['First image', 'Event Horizon Telescope, 2022']],
  dispR: SGR_RS, radius: 0, children: [], frameQ: GAL_FRAME,
  viewDir: GAL_X.clone().multiplyScalar(-Math.cos(7 * DEG)).addScaledVector(GAL_Z, Math.sin(7 * DEG)).normalize(),
};
const DEEP = [MILKY_WAY, SGR_A];
for (const d of DEEP) { d.phys = GC_POS.clone(); d.disp = GC_POS.clone(); d.screen = {}; }

// Fade factors, refreshed every frame from the camera's distance to the Sun
const DEEP_K = { sky: 1, gal: 0, near: 1, sunGlare: 1, lSun: 0, expo: 1 };

/* ------------------------------ shaders ------------------------------ */
const VERT_GAL = /* glsl */`
uniform float uPx, uUnit, uGain, uGlowGain, uFade, uMinPx, uMaxPx, uRef, uPtK;
attribute vec4 aCol;
attribute float aSize;
varying vec3 vCol;
varying float vKind;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = max(-mv.z / uUnit, 1e-3);                  // light years
  float px = aSize / d * uPx;
  float s = clamp(px, uMinPx, uMaxPx);
  float b;
  // Points are star clouds: their flux falls off as 1/d² beyond uRef and is spread over the sprite.
  // Glows are extended: constant surface brightness once resolved, flux-conserving when not.
  if (aCol.a < 0.5) b = uGain * uPtK * min(uRef * uRef / (d * d), 1.0) * 2.56 / (s * s);
  else b = uGlowGain * min(1.0, px * px / (s * s));
  b *= smoothstep(uMaxPx * 1.8, uMaxPx * 0.9, px);
  vCol = aCol.rgb * b * uFade * step(0.0, -mv.z);
  vKind = aCol.a;
  gl_PointSize = s;
}`;
const FRAG_GAL = /* glsl */`
varying vec3 vCol;
varying float vKind;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  float p = vKind < 0.5 ? exp(-r2 * 5.0) : exp(-r2 * 3.2) * (1.0 - r2);
  gl_FragColor = vec4(vCol * p, 1.0);
}`;
const VERT_DUST = /* glsl */`
uniform float uPx, uUnit, uFade, uMinPx, uMaxPx, uOpacity;
attribute float aSize;
attribute float aOp;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = max(-mv.z / uUnit, 1e-3);
  float px = aSize / d * uPx;
  float s = clamp(px, uMinPx, uMaxPx);
  vA = uOpacity * aOp * uFade * min(1.0, px * px / (s * s)) * smoothstep(uMaxPx * 1.8, uMaxPx * 0.9, px) * step(0.0, -mv.z);
  gl_PointSize = s;
}`;
const FRAG_DUST = /* glsl */`
varying float vA;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.0, clamp(vA * exp(-r2 * 2.5) * (1.0 - r2), 0.0, 1.0));
}`;

const VERT_BH = /* glsl */`
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG_BH = /* glsl */`
uniform vec3 uCenter, uN, uE1, uE2;
uniform float uRs, uR, uIn, uOut, uTdisk, uDiskI, uEnvI, uTime;
uniform samplerCube uEnv;
varying vec3 vWorld;

float bhHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bhNoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bhHash(i), bhHash(i + vec3(1, 0, 0)), f.x), mix(bhHash(i + vec3(0, 1, 0)), bhHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(bhHash(i + vec3(0, 0, 1)), bhHash(i + vec3(1, 0, 1)), f.x), mix(bhHash(i + vec3(0, 1, 1)), bhHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float bhFbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * bhNoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }

// Relative blackbody colour, sampled at three wavelengths (R, G, B)
vec3 blackbody(float T) {
  vec3 lam = vec3(0.61, 0.55, 0.465);                    // µm
  vec3 x = 14388.0 / (lam * max(T, 800.0));
  vec3 I = 1.0 / (pow(lam / 0.55, vec3(5.0)) * (exp(min(x, vec3(80.0))) - 1.0));
  return I / max(max(I.r, I.g), max(I.b, 1e-30));
}

// Swirling gas pattern, sheared by Keplerian rotation; two phases cross-fade so it never winds up
float diskPattern(vec3 pc, float r) {
  float phi = atan(dot(pc, uE2), dot(pc, uE1));
  float om = 0.8 * pow(uIn / r, 1.5);
  float T = 7.0, t1 = fract(uTime / T), t2 = fract(uTime / T + 0.5);
  float a1 = phi - om * t1 * T, a2 = phi - om * t2 * T;
  float n1 = bhFbm(vec3(cos(a1) * 6.0, sin(a1) * 6.0, r * 2.2));
  float n2 = bhFbm(vec3(cos(a2) * 6.0 + 11.0, sin(a2) * 6.0, r * 2.2));
  return mix(n1, n2, abs(2.0 * t1 - 1.0));
}

// Emission from the disc where the ray crosses it; dir is the ray's travel direction
vec4 diskHit(vec3 pc, float r, vec3 dir) {
  vec3 phiHat = normalize(cross(uN, pc));
  float beta = sqrt(0.5 / (r - 1.0));                    // Keplerian speed seen by a static observer
  float gam = inversesqrt(1.0 - beta * beta);
  float g = sqrt(1.0 - 1.0 / r) / (gam * (1.0 - beta * dot(phiHat, -dir)));
  float f = pow(max((1.0 - sqrt(uIn / r)) / (r * r * r), 0.0), 0.25) / 0.2140;   // thin-disc temperature profile
  float Tobs = uTdisk * f * g;
  float n = diskPattern(pc, r);
  float I = uDiskI * pow(Tobs / uTdisk, 4.0) * (0.25 + 1.5 * n * n);
  float a = smoothstep(uIn, uIn + 0.4, r) * (1.0 - smoothstep(uOut * 0.55, uOut, r)) * clamp(0.35 + 0.9 * n, 0.0, 0.95);
  return vec4(blackbody(Tobs) * I, a);
}

void main() {
  vec3 rd = normalize(vWorld - cameraPosition);
  vec3 p = (cameraPosition - uCenter) / uRs;
  float fade = 1.0;
  if (dot(p, p) > uR * uR) {
    float B = dot(p, rd), h = B * B - dot(p, p) + uR * uR;
    if (h < 0.0 || B > 0.0) discard;
    fade = 1.0 - smoothstep(0.5, 0.95, length(cross(p, rd)) / uR);
    p += rd * (-B - sqrt(h));
  }
  vec3 v = rd;
  vec3 L = cross(p, v);
  float h2 = dot(L, L);
  vec3 col = vec3(0.0);
  float trans = 1.0;
  bool captured = false;
  float y0 = dot(p, uN);
  for (int i = 0; i < 320; i++) {
    float r = length(p);
    if (r < 1.0) { captured = true; break; }
    if (r > uR * 1.01 && dot(p, v) > 0.0) break;
    float dt = clamp(0.06 * r, 0.02, 60.0);
    // velocity Verlet on x'' = -1.5 h² x / r⁵ (Schwarzschild null geodesics, Rs = 1)
    v += -1.5 * h2 * p / pow(r, 5.0) * 0.5 * dt;
    vec3 pn = p + v * dt;
    float rn = length(pn);
    v += -1.5 * h2 * pn / pow(rn, 5.0) * 0.5 * dt;
    float y1 = dot(pn, uN);
    if (y0 * y1 < 0.0) {
      vec3 pc = mix(p, pn, y0 / (y0 - y1));
      float rc = length(pc);
      if (rc > uIn && rc < uOut && uDiskI > 0.0) {
        vec4 e = diskHit(pc, rc, normalize(v));
        col += trans * e.rgb * e.a;
        trans *= 1.0 - e.a;
      }
    }
    p = pn; y0 = y1;
    if (trans < 0.01) break;
  }
  vec3 bg = captured ? vec3(0.0) : textureCube(uEnv, normalize(v)).rgb * uEnvI;
  vec3 c = col + trans * bg;
  gl_FragColor = vec4(max(c, vec3(0.0)), fade);
}`;

/* ------------------------------ galaxy model ------------------------------ */
const GALAXY = {};
const POINT_MAX = (() => { const r = renderer.getContext().getParameter(renderer.getContext().ALIASED_POINT_SIZE_RANGE); return r ? r[1] : 64; })();
function buildGalaxy() {
  const rnd = mulberry(8178);
  const N = 262000, pos = new Float32Array(N * 3), col = new Float32Array(N * 4), size = new Float32Array(N);
  let n = 0;
  const add = (x, y, z, c, L, s, kind) => {
    if (n >= N) return;
    pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z;
    col[n * 4] = c[0] * L; col[n * 4 + 1] = c[1] * L; col[n * 4 + 2] = c[2] * L; col[n * 4 + 3] = kind;
    size[n] = s; n++;
  };
  const DN = 30000, dpos = new Float32Array(DN * 3), dsize = new Float32Array(DN), dop = new Float32Array(DN);
  let dn = 0;
  const addDust = (x, y, z, s, a) => {
    if (dn >= DN) return;
    dpos[dn * 3] = x; dpos[dn * 3 + 1] = y; dpos[dn * 3 + 2] = z; dsize[dn] = s; dop[dn] = a; dn++;
  };

  // Galactocentric frame, axes parallel to galactic (x, y, z); the Sun is at (−26670, 0, 0).
  // Four logarithmic arms, pitch 12°, spaced 90°: r = 32,600 ly · exp(tan p · (φ − π − kπ/2)).
  const TANP = Math.tan(12 * DEG), R_PER = 32600;
  const vert = z0 => z0 * Math.atanh(clamp(2 * rnd() - 1, -0.9999, 0.9999));
  const flare = r => 1 + Math.max(0, r - 30000) / 25000;
  const ARM_W = [0.31, 0.19, 0.31, 0.19];
  const pickArm = () => { let u = rnd(), k = 0; while (k < 3 && u > ARM_W[k]) { u -= ARM_W[k]; k++; } return k; };
  // A point on arm k (or the Orion Spur, k = 4) with radial scatter of width w(r)
  const armPoint = (k, w0, wk, shift = 0) => {
    let r, phi;
    if (k === 4) {
      phi = Math.PI + (rnd() * 0.75 - 0.4);
      r = 26900 * Math.exp(Math.tan(10 * DEG) * (phi - Math.PI));
    } else {
      do { r = 14000 - 12000 * Math.log(rnd() + 1e-9); } while (r > 60000);
      phi = Math.PI + k * Math.PI / 2 + Math.log(r / R_PER) / TANP;
    }
    const w = w0 + wk * r;
    r += (gauss(rnd) + shift) * w;
    phi += gauss(rnd) * 0.02;
    return [r * Math.cos(phi), r * Math.sin(phi), r];
  };
  const barAxis = [-Math.cos(27 * DEG), Math.sin(27 * DEG)];
  const barPoint = (sa, sb, sz) => {
    const a = clamp(gauss(rnd) * sa, -16000, 16000), b = gauss(rnd) * sb;
    const zk = 0.75 + 0.5 * Math.min(Math.abs(a) / 12000, 1);                // boxy/peanut bulge
    return [a * barAxis[0] - b * barAxis[1], a * barAxis[1] + b * barAxis[0], gauss(rnd) * sz * zk];
  };
  const diskR = () => { let r; do { r = -8500 * Math.log(rnd() * rnd() + 1e-12); } while (r > 62000); return r; };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const OLD = [1.0, 0.84, 0.66], OLD2 = [0.95, 0.93, 0.9], BULGE = [1.0, 0.76, 0.5], YOUNG = [0.58, 0.72, 1.0], YOUNG2 = [0.86, 0.9, 1.0], HII = [1.0, 0.3, 0.42];

  // old thin + thick disc, partly concentrated on the two major arms
  for (let i = 0; i < 82000; i++) {
    let x, y, r;
    if (rnd() < 0.3) { [x, y, r] = armPoint(rnd() < 0.5 ? 0 : 2, 1600, 0.02); }
    else { r = diskR(); const phi = rnd() * TAU; x = r * Math.cos(phi); y = r * Math.sin(phi); }
    const thick = rnd() < 0.12;
    add(x, y, vert((thick ? 2800 : 850) * flare(r)), mixc(OLD, OLD2, rnd()), 0.6 + rnd() * 0.8, 3, 0);
  }
  // bar and bulge
  for (let i = 0; i < 44000; i++) {
    let p;
    if (rnd() < 0.68) p = barPoint(5600, 1900, 1250);
    else { const r = -1700 * Math.log(rnd() + 1e-9), u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u); p = [r * s * Math.cos(t), r * s * Math.sin(t), r * u * 0.72]; }
    add(p[0], p[1], p[2], mixc(BULGE, OLD, rnd() * 0.4), 0.7 + rnd() * 0.7, 3, 0);
  }
  // nuclear star cluster around Sgr A*
  for (let i = 0; i < 3500; i++) {
    const r = -90 * Math.log(rnd() + 1e-9), u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u);
    add(r * s * Math.cos(t), r * s * Math.sin(t), r * u * 0.8, BULGE, 0.5, 2, 0);
  }
  // young stars along the arms and the Orion Spur
  for (let i = 0; i < 46000; i++) {
    const k = rnd() < 0.05 ? 4 : pickArm();
    const [x, y, r] = armPoint(k, 380, 0.012);
    add(x, y, vert(300 * flare(r)), mixc(YOUNG, YOUNG2, rnd()), 0.9 + rnd() * 1.1, 3, 0);
  }
  // star-forming regions (H II): pink glows on the arms
  for (let i = 0; i < 3200; i++) {
    const k = rnd() < 0.06 ? 4 : pickArm();
    const [x, y, r] = armPoint(k, 260, 0.009);
    const s = 90 + 260 * Math.pow(rnd(), 3);
    add(x, y, vert(160 * flare(r)), HII, 1.6, s * 1.4, 1);
  }
  // diffuse light: large soft sprites tracing bulge, disc and arms
  for (let i = 0; i < 6000; i++) { const p = barPoint(5200, 2000, 1300); add(p[0], p[1], p[2], BULGE, 0.0035, 2600 + rnd() * 1800, 1); }
  for (let i = 0; i < 9000; i++) {
    const r = diskR(), phi = rnd() * TAU;
    add(r * Math.cos(phi), r * Math.sin(phi), vert(900 * flare(r)), mixc(OLD, OLD2, 0.5), 0.014, 4200 + rnd() * 2500, 1);
  }
  for (let i = 0; i < 7000; i++) {
    const k = rnd() < 0.05 ? 4 : pickArm();
    const [x, y, r] = armPoint(k, 700, 0.016);
    add(x, y, vert(350 * flare(r)), YOUNG, 0.045, 1800 + rnd() * 1400, 1);
  }
  // globular clusters in the halo
  for (let i = 0; i < 160; i++) {
    const r = Math.min(1500 * Math.pow(rnd() + 0.02, -0.9), 110000), u = 2 * rnd() - 1, t = TAU * rnd(), s = Math.sqrt(1 - u * u);
    add(r * s * Math.cos(t), r * s * Math.sin(t), r * u, [1.0, 0.86, 0.66], 14, 40, 0);
  }
  // dust lanes on the inner (concave) edge of each arm, plus a thin inner-disc layer
  for (let i = 0; i < 24000; i++) {
    const k = rnd() < 0.06 ? 4 : pickArm();
    const [x, y, r] = armPoint(k, 520, 0.016, -0.6);
    addDust(x, y, vert(170 * flare(r)), 600 + rnd() * 900, 0.4 + rnd() * 0.6);
  }
  for (let i = 0; i < 6000; i++) {
    const r = 3000 + diskR() * 0.7, phi = rnd() * TAU;
    if (r > 40000) continue;
    addDust(r * Math.cos(phi), r * Math.sin(phi), vert(140), 1400 + rnd() * 1200, 0.14);
  }

  const common = {
    uPx: { value: 1000 }, uUnit: { value: LY }, uFade: { value: 1 }, uMinPx: { value: 1.6 }, uMaxPx: { value: 160 },
  };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, n * 3), 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(col.subarray(0, n * 4), 4));
  g.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(0, n), 1));
  const stars = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { ...common, uGain: { value: 0.8 }, uGlowGain: { value: 1 }, uRef: { value: 60000 }, uPtK: { value: 1 } },
    vertexShader: VERT_GAL, fragmentShader: FRAG_GAL, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dpos.subarray(0, dn * 3), 3));
  dg.setAttribute('aSize', new THREE.BufferAttribute(dsize.subarray(0, dn), 1));
  dg.setAttribute('aOp', new THREE.BufferAttribute(dop.subarray(0, dn), 1));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    uniforms: { ...common, uOpacity: { value: 0.16 } },
    vertexShader: VERT_DUST, fragmentShader: FRAG_DUST, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  }));
  // uniforms shared by both materials must be the same objects
  for (const k of Object.keys(common)) dust.material.uniforms[k] = stars.material.uniforms[k];
  const group = new THREE.Group();
  for (const o of [stars, dust]) { o.frustumCulled = false; o.layers.set(1); group.add(o); }
  stars.renderOrder = -70; dust.renderOrder = -69;
  group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(GAL_X, GAL_Y, GAL_Z));
  group.scale.setScalar(LY);
  scene.add(group);
  camera.layers.enable(1);
  Object.assign(GALAXY, { group, stars, dust, u: stars.material.uniforms, count: n + dn });
}

/* ------------------------------ black holes ------------------------------ */
// One cube map is shared: only one black hole is ever close enough to fill the screen.
const BHS = [];
const BH_CUBE = {};
function makeBlackHole(o) {
  if (!BH_CUBE.rt) {
    BH_CUBE.res = Math.min(screen.width, screen.height) < 700 ? 512 : 1024;
    BH_CUBE.rt = new THREE.WebGLCubeRenderTarget(BH_CUBE.res, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    BH_CUBE.cam = new THREE.CubeCamera(1, 1e19, BH_CUBE.rt);
    for (const c of BH_CUBE.cam.children) c.layers.set(1);
    BH_CUBE.owner = null; BH_CUBE.t = 0;
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCenter: { value: new V3() }, uN: { value: o.normal.clone() }, uE1: { value: o.e1.clone() }, uE2: { value: new V3().crossVectors(o.normal, o.e1) },
      uRs: { value: o.target.dispR }, uR: { value: BH_PROXY }, uIn: { value: 3 }, uOut: { value: o.outer || 14 }, uTdisk: { value: o.tdisk || 4600 },
      uDiskI: { value: o.diskI ?? 1.3 }, uEnvI: { value: 1 }, uTime: SHARED.uTime, uEnv: { value: BH_CUBE.rt.texture },
    },
    vertexShader: VERT_BH, fragmentShader: FRAG_BH, depthTest: false, depthWrite: false, transparent: true,
  });
  const mesh = new THREE.Mesh(GEO.sphere, mat);
  mesh.frustumCulled = false; mesh.renderOrder = -60; mesh.visible = false;
  mesh.layers.set(3);                                     // never captured by the cube camera
  camera.layers.enable(3);
  scene.add(mesh);
  const bh = { ...o, mesh, mat };
  BHS.push(bh);
  return bh;
}
// Layers: 0 Solar System, 1 galaxies, 3 black-hole lenses, 4 cosmic web, 5 star points, 6 sky dome, 7 star spheres
function buildBlackHole() {
  for (const o of [SKY.mw, SKY.stars, SKY.lines]) o.layers.set(6);
  camera.layers.enable(6);
  makeBlackHole({ target: SGR_A, normal: GAL_Z, e1: GAL_X, core: true });
}

function renderBlackHoleSky(bh, center) {
  const u = GALAXY.u, keep = [u.uPx.value, u.uPtK.value, u.uFade.value, u.uMaxPx.value, u.uMinPx.value];
  u.uPx.value = BH_CUBE.res / 2;
  u.uPtK.value = Math.pow(u.uPx.value / keep[0], 2);
  u.uFade.value = 1; u.uMaxPx.value = Math.min(POINT_MAX, 128); u.uMinPx.value = 1.2;
  // Sgr A* sits in the bulge and sees the galaxy model; a stellar hole inside the disc sees a sky like ours
  const layers = bh.core ? [1, 7] : [6, 7];
  for (const c of BH_CUBE.cam.children) { c.layers.disableAll(); for (const l of layers) c.layers.enable(l); }
  const sk = [SKY.mw.visible, SKY.stars.visible, SKY.stars.material.uniforms.uBright.value, SKY.mw.material.uniforms.uBright.value];
  if (!bh.core) { SKY.mw.visible = STATE.show.milkyway; SKY.stars.visible = true; SKY.stars.material.uniforms.uBright.value = 1; SKY.mw.material.uniforms.uBright.value = 1.25; }
  BH_CUBE.cam.position.copy(center);
  BH_CUBE.cam.updateMatrixWorld(true);
  BH_CUBE.cam.update(renderer, scene);
  [SKY.mw.visible, SKY.stars.visible, SKY.stars.material.uniforms.uBright.value, SKY.mw.material.uniforms.uBright.value] = sk;
  [u.uPx.value, u.uPtK.value, u.uFade.value, u.uMaxPx.value, u.uMinPx.value] = keep;
  BH_CUBE.owner = bh; BH_CUBE.t = performance.now();
}

const _dk = new V3();
function updateDeep(O) {
  const dSun = _dk.copy(BY_ID.sun.disp).sub(O).distanceTo(camera.position);
  const lSun = Math.log10(Math.max(dSun, 1) / LY);
  DEEP_K.lSun = lSun;
  DEEP_K.sky = 1 - smooth(clamp((lSun - 2.2) / 1.1, 0, 1));
  DEEP_K.gal = STATE.show.milkyway ? smooth(clamp((lSun - 2.5) / 1.2, 0, 1)) : 0;
  DEEP_K.near = 1 - smooth(clamp((Math.log10(Math.max(dSun, 1)) - 11.5) / 1.0, 0, 1));
  DEEP_K.sunGlare = 1 - smooth(clamp((lSun + 0.5) / 1.5, 0, 1));
  // Close to a star or stellar black hole inside the disc, the sky looks much like ours, not like the galaxy model
  const t = CAM.target;
  if (t && t.localSky) {
    const lk = 1 - smooth(clamp((Math.log10(Math.max(_dk.copy(t.disp).sub(O).distanceTo(camera.position), 1)) - 12.5) / 1.5, 0, 1));
    DEEP_K.sky = Math.max(DEEP_K.sky, lk);
    DEEP_K.gal *= 1 - lk;
  }

  // Exposure eases down inside the dense core so the lensed sky does not wash out
  const lGC = Math.log10(Math.max(_dk.copy(GC_POS).sub(O).distanceTo(camera.position), 1) / LY);
  DEEP_K.expo = 0.42 + 0.58 * smooth(clamp((lGC - 1.5) / 2.2, 0, 1));
  const u = GALAXY.u;
  GALAXY.group.position.copy(GC_POS).sub(O);
  GALAXY.group.visible = DEEP_K.gal > 0.003;
  u.uFade.value = DEEP_K.gal * DEEP_K.expo;
  u.uPx.value = VIEW_H * DPR / (2 * TAN_HALF);
  u.uMinPx.value = 1.6 * DPR;
  u.uMaxPx.value = Math.min(POINT_MAX, 180 * DPR);

  for (const bh of BHS) {
    const center = _dk.copy(bh.target.disp).sub(O);
    const R = BH_PROXY * bh.target.dispR, dCam = center.distanceTo(camera.position);
    const inside = dCam < R * 1.02;
    const px = inside ? Infinity : R / (dCam * TAN_HALF) * VIEW_H / 2;
    bh.mesh.visible = px > 1.5 && (bh.core ? GALAXY.group.visible : DEEP_K.near === 0);
    if (!bh.mesh.visible) continue;
    // a companion star moves, so its reflection in the lensed sky is refreshed now and then
    if (BH_CUBE.owner !== bh || (bh.companion && performance.now() - BH_CUBE.t > 900)) renderBlackHoleSky(bh, center);
    bh.mesh.position.copy(center);
    bh.mesh.scale.setScalar(R);
    const side = inside ? THREE.BackSide : THREE.FrontSide;
    if (bh.mat.side !== side) bh.mat.side = side;
    bh.mat.uniforms.uCenter.value.copy(center);
    bh.mat.uniforms.uEnvI.value = bh.core ? DEEP_K.expo : 1;
  }
}
