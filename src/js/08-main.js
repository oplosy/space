/* ------------------------------------------------------------------ *
 *  Camera: orbits the focus target; the focus is the floating origin
 * ------------------------------------------------------------------ */
const CAM = { target: null, yaw: 0.9, pitch: 0.25, dist: 3e4, goal: 3e4, vy: 0, vp: 0, trans: null, origin: new V3(), frameQ: new THREE.Quaternion() };
const MAX_DIST = 1.7e27;                      // about 180 billion ly: the whole observable universe
const IDENT_Q = new THREE.Quaternion();
const frameOf = t => (t && t.frameQ) || IDENT_Q;
let VIEW_W = 1, VIEW_H = 1, TAN_HALF = Math.tan(25 * DEG);

function minDist(t) {
  if (t.kind === 'craft') return t.minD;
  if (t.kind === 'bh') return t.dispR * 2.2;
  if (t.deep) return t.minD;
  return t.kind === 'probe' ? 0.012 : t.dispR * (t.kind === 'star' ? 1.2 : t.surface && t.surface.irregular ? 1.4 : 1.03);
}
function defaultDist(t) {
  if (t.kind === 'craft') return t.defD;
  if (t.kind === 'probe') return 0.035;
  if (t.kind === 'bh') return t.dispR * 26;
  if (t.deep) return t.defD;
  if (t.kind === 'star') return t.dispR * 6.5;
  if (t.kind === 'comet') return t.dispR * 9;
  return t.dispR * (t.ring ? 6 : 3.8);
}
function focusOn(t, opts = {}) {
  if (!t) return;
  const from = CAM.target;
  const d1 = Math.max(opts.dist ?? defaultDist(t), minDist(t) * 1.02);
  let yaw1 = null, pitch1 = null;
  const dir0 = opts.dir || t.viewDir;
  if (dir0) {
    // yaw and pitch are measured in the target's own frame (galactic for deep-sky targets)
    const dir = dir0.clone().applyQuaternion(frameOf(t).clone().invert());
    pitch1 = Math.asin(clamp(dir.y, -0.98, 0.98));
    yaw1 = Math.atan2(dir.x, dir.z);
    let dy = yaw1 - CAM.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); yaw1 = CAM.yaw + dy;
  }
  if (!from) { CAM.target = t; CAM.dist = CAM.goal = d1; CAM.frameQ.copy(frameOf(t)); if (yaw1 !== null) { CAM.yaw = yaw1; CAM.pitch = pitch1; } }
  else {
    const sep = from.disp.distanceTo(t.disp);
    const dur = clamp(1.3 + 0.55 * Math.log10(1 + sep / Math.max(Math.min(CAM.dist, d1), 1e-3)) * 0.5 + 0.07 * Math.abs(Math.log10(d1 / CAM.dist)), 1.3, 6.5);
    CAM.trans = { from, to: t, t0: performance.now(), dur, d0: CAM.dist, d1, yaw0: CAM.yaw, pitch0: CAM.pitch, yaw1, pitch1, q0: CAM.frameQ.clone() };
    CAM.target = t;
  }
  CAM.vy = CAM.vp = 0;
  syncNavFocus();
  renderDossierStatic(t);
  updateDossierLive();
}

function updateCamera(dt, now) {
  const t = CAM.target;
  if (CAM.trans) {
    const tr = CAM.trans;
    const u = clamp((now - tr.t0) / (tr.dur * 1000), 0, 1), e = easeInOut(u);
    CAM.origin.copy(tr.from.disp).multiplyScalar(1 - e).addScaledVector(tr.to.disp, e);
    const l0 = Math.log(tr.d0), l1 = Math.log(tr.d1);
    let ld = l0 + (l1 - l0) * e;
    const sep = tr.from.disp.distanceTo(tr.to.disp);
    const peak = Math.log(sep * 1.15 + 1e-9), mid = (l0 + l1) / 2;
    if (peak > mid) ld += (peak - mid) * Math.sin(Math.PI * e) * 0.92;
    CAM.dist = Math.exp(ld);
    CAM.frameQ.slerpQuaternions(tr.q0, frameOf(tr.to), e);
    if (tr.yaw1 !== null) { CAM.yaw = tr.yaw0 + (tr.yaw1 - tr.yaw0) * e; CAM.pitch = tr.pitch0 + (tr.pitch1 - tr.pitch0) * e; }
    if (u >= 1) { CAM.trans = null; CAM.dist = CAM.goal = tr.d1; }
  } else if (t) {
    CAM.origin.copy(t.disp);
    CAM.frameQ.copy(frameOf(t));
    const k = 1 - Math.exp(-dt * 9);
    CAM.dist = Math.exp(Math.log(CAM.dist) + (Math.log(CAM.goal) - Math.log(CAM.dist)) * k);
  }
  if (!DRAG.active) {
    CAM.yaw += CAM.vy * dt; CAM.pitch += CAM.vp * dt;
    const damp = Math.exp(-dt * 4);
    CAM.vy *= damp; CAM.vp *= damp;
  }
  CAM.pitch = clamp(CAM.pitch, -1.53, 1.53);
  if (t && !CAM.trans) {
    const md = minDist(t);
    if (CAM.goal < md) CAM.goal = md;
    if (CAM.dist < md) CAM.dist = md;
  }
  CAM.dist = Math.min(CAM.dist, MAX_DIST); CAM.goal = Math.min(CAM.goal, MAX_DIST);
  const cp = Math.cos(CAM.pitch);
  camera.position.set(CAM.dist * cp * Math.sin(CAM.yaw), CAM.dist * Math.sin(CAM.pitch), CAM.dist * cp * Math.cos(CAM.yaw)).applyQuaternion(CAM.frameQ);
  camera.up.set(0, 1, 0).applyQuaternion(CAM.frameQ);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
}

/* ------------------------------ input ------------------------------ */
const DRAG = { active: false, id: null, x: 0, y: 0, moved: 0, pts: new Map(), pinch: 0, lastT: 0 };
function zoomBy(f) {
  const t = CAM.target;
  if (!t) return;
  const R = t.kind === 'probe' ? 0 : t.dispR;
  const alt = Math.max(CAM.goal - R, 1e-6) * f;
  CAM.goal = clamp(R + alt, minDist(t), MAX_DIST);
}
function bindInput() {
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    DRAG.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (DRAG.pts.size === 1) { DRAG.active = true; DRAG.x = e.clientX; DRAG.y = e.clientY; DRAG.moved = 0; DRAG.lastT = performance.now(); CAM.vy = CAM.vp = 0; }
    if (DRAG.pts.size === 2) { const [a, b] = [...DRAG.pts.values()]; DRAG.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', e => {
    if (!DRAG.pts.has(e.pointerId)) return;
    DRAG.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (DRAG.pts.size === 2) {
      const [a, b] = [...DRAG.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (DRAG.pinch > 0) zoomBy(Math.pow(DRAG.pinch / d, 1.6));
      DRAG.pinch = d; DRAG.moved += 10;
      return;
    }
    const dx = e.clientX - DRAG.x, dy = e.clientY - DRAG.y;
    DRAG.x = e.clientX; DRAG.y = e.clientY;
    DRAG.moved += Math.abs(dx) + Math.abs(dy);
    const now = performance.now(), dt = Math.max((now - DRAG.lastT) / 1000, 1 / 240);
    DRAG.lastT = now;
    const k = 0.0055;
    CAM.yaw -= dx * k; CAM.pitch += dy * k;
    CAM.vy = -dx * k / dt * 0.5; CAM.vp = dy * k / dt * 0.5;
  });
  const end = e => {
    if (!DRAG.pts.has(e.pointerId)) return;
    DRAG.pts.delete(e.pointerId);
    if (DRAG.pts.size === 0) {
      DRAG.active = false;
      canvas.classList.remove('dragging');
      if (performance.now() - DRAG.lastT > 80) { CAM.vy = CAM.vp = 0; }
      if (DRAG.moved < 5 && e.type === 'pointerup') pick(e.clientX, e.clientY);
    }
    DRAG.pinch = 0;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(clamp(e.deltaY, -250, 250) * (CAM.goal > 1e11 ? 0.0034 : 0.0016))); }, { passive: false });
  canvas.addEventListener('dblclick', e => e.preventDefault());
  window.addEventListener('resize', resize);
}
function allTargets() { return [...BODIES, ...PROBES, ...CRAFTS, ...DEEP]; }
function pick(x, y) {
  let best = null, bestScore = Infinity;
  for (const o of allTargets()) {
    const s = o.screen;
    if (!s.vis || s.occluded || o.hidden) continue;
    const d = Math.hypot(x - s.x, y - s.y);
    if (d <= s.r) { const score = s.depth * 1e-12; if (score < bestScore) { best = o; bestScore = score; } continue; }
    if (d < 16 && s.labelShown) { const score = 1 + d; if (score < bestScore) { best = o; bestScore = score; } }
  }
  if (best && best !== CAM.target) focusOn(best);
}

/* ------------------------------ labels ------------------------------ */
const LABELS = new Map();
function makeLabel(o, cls) {
  const el = document.createElement('div');
  el.className = 'lbl ' + cls;
  el.style.setProperty('--c', o.color || '#fff');
  el.innerHTML = '<span class="ring"></span><span class="t"></span>';
  el.querySelector('.t').textContent = o.short || o.name;
  el.style.display = 'none';
  el.addEventListener('click', ev => { ev.stopPropagation(); focusOn(o); });
  $('labels').append(el);
  const L = { el, o, shown: false, w: (o.short || o.name).length * 7.4 + 16 };
  LABELS.set(o.id, L);
  return L;
}
function removeLabel(o) { const L = LABELS.get(o.id); if (L) { L.el.remove(); LABELS.delete(o.id); } }
const SKY_LABELS = [];
function buildLabels() {
  for (const b of BODIES) makeLabel(b, b.kind === 'moon' ? 'moon' : b.kind === 'star' ? 'sun' : b.kind);
  for (const d of DEEP) makeLabel(d, 'deep');
  for (const c of CRAFTS) makeLabel(c, 'probe');
  for (const c of SKY.names) {
    const el = document.createElement('div'); el.className = 'lbl sky'; el.textContent = c.name; el.style.display = 'none';
    $('labels').append(el); SKY_LABELS.push({ el, dir: c.dir, shown: false });
  }
  for (const s of SKY.bright) {
    const el = document.createElement('div'); el.className = 'lbl star'; el.textContent = s.name; el.style.display = 'none';
    $('labels').append(el); SKY_LABELS.push({ el, dir: s.dir, shown: false, star: true });
  }
}
function setShown(L, on) { if (L.shown !== on) { L.shown = on; L.el.style.display = on ? '' : 'none'; } }

const _sp = new V3(), _sv = new V3(), _so = new V3();
function projectTarget(o) {
  const s = o.screen;
  _sp.copy(o.disp).sub(CAM.origin);
  _sv.copy(_sp).applyMatrix4(camera.matrixWorldInverse);
  s.depth = _sp.distanceTo(camera.position);
  s.vis = _sv.z < 0;
  if (!s.vis) { s.r = 0; return; }
  _sp.project(camera);
  s.x = (_sp.x * 0.5 + 0.5) * VIEW_W; s.y = (-_sp.y * 0.5 + 0.5) * VIEW_H;
  s.r = (o.dispR || 0) / (s.depth * TAN_HALF) * VIEW_H / 2;
  if (s.x < -200 || s.x > VIEW_W + 200 || s.y < -200 || s.y > VIEW_H + 200) s.vis = false;
}
const BIG = [];
function occludedBy(o) {
  // Is the target hidden behind a large sphere closer to the camera?
  _sp.copy(o.disp).sub(CAM.origin).sub(camera.position);
  const dT = _sp.length(); _sp.multiplyScalar(1 / dT);
  for (const b of BIG) {
    if (b === o) continue;
    _so.copy(b.disp).sub(CAM.origin).sub(camera.position);
    const t = _so.dot(_sp);
    if (t <= 0 || t >= dT) continue;
    if (_so.lengthSq() - t * t < b.dispR * b.dispR * 0.98) return true;
  }
  return false;
}
function priority(o) {
  if (o === CAM.target) return 0;
  if (o.kind === 'star') return 1;
  if (o.kind === 'galaxy') return 1.5;
  if (o.kind === 'bh') return 1.6;
  if (o.kind === 'cluster') return 1.7;
  if (o.kind === 'universe') return 1.8;
  if (o.kind === 'star3d') return 1.9;
  if (o.kind === 'planet' || o.kind === 'probe' || o.kind === 'craft') return 2;
  if (o.kind === 'dwarf' || o.kind === 'comet') return 3;
  return 4 + (3000 - Math.min(o.radius, 2999)) / 3000;
}
function updateLabels() {
  const targets = allTargets();
  BIG.length = 0;
  for (const o of targets) { projectTarget(o); if (o.screen.vis && o.screen.r > 2.5 && o.kind !== 'probe') BIG.push(o); }
  for (const o of targets) o.screen.occluded = o.screen.vis && occludedBy(o);
  for (const pr of PROBES) if (!LABELS.has(pr.id)) makeLabel(pr, 'probe');

  const placed = [];
  const cands = targets.filter(o => o.screen.vis && !o.screen.occluded && !o.hidden).sort((a, b) => priority(a) - priority(b));
  const showAll = STATE.show.labels;
  const shownSet = new Set();
  for (const o of cands) {
    const s = o.screen;
    s.labelShown = false;
    if (!showAll && o !== CAM.target) continue;
    if (o.deep && o !== CAM.target && DEEP_K.near > 0) continue;       // keep Solar-System views uncluttered
    if (s.r > Math.min(VIEW_W, VIEW_H) * 0.16) continue;
    if (o.kind === 'moon' && o !== CAM.target) {
      const p = BY_ID[o.parent];
      if (Math.hypot(s.x - p.screen.x, s.y - p.screen.y) < Math.max(p.screen.r + 16, 22)) continue;
    }
    if (o.kind === 'probe' && o !== CAM.target && o.frame && o.frame.screen.vis && Math.hypot(s.x - o.frame.screen.x, s.y - o.frame.screen.y) < 10) continue;
    const L = LABELS.get(o.id);
    if (!L) continue;
    const off = s.r > 4 ? s.r * 0.72 + 6 : 0;
    const x = s.x + off, y = s.y;
    const rect = [x - 6, y - 9, x + L.w, y + 9];
    if (placed.some(r => rect[0] < r[2] && rect[2] > r[0] && rect[1] < r[3] && rect[3] > r[1])) continue;
    placed.push(rect);
    L.el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 6).toFixed(1)}px, 0)`;
    L.el.classList.toggle('big', s.r > 4);
    L.el.classList.toggle('focus', o === CAM.target);
    shownSet.add(o.id);
    s.labelShown = true;
  }
  for (const [id, L] of LABELS) setShown(L, shownSet.has(id));
  // From interstellar distances the Sun is the marker for home
  const far = DEEP_K.lSun > 1.5, sunL = LABELS.get('sun');
  if (sunL && sunL.far !== far) { sunL.far = far; sunL.el.querySelector('.t').textContent = far ? 'Sun · you are here' : 'Sun'; sunL.el.classList.toggle('home', far); sunL.w = (far ? 18 : 3) * 7.4 + 16; }

  // sky labels
  const skyOn = STATE.show.constellations && DEEP_K.sky > 0.5;
  const rot = camera.matrixWorldInverse;
  for (const L of SKY_LABELS) {
    if (!skyOn) { setShown(L, false); continue; }
    _sv.copy(L.dir).transformDirection(rot);
    if (_sv.z > -0.05) { setShown(L, false); continue; }
    const px = (_sv.x / -_sv.z) / (TAN_HALF * camera.aspect), py = (_sv.y / -_sv.z) / TAN_HALF;
    if (Math.abs(px) > 1.05 || Math.abs(py) > 1.05) { setShown(L, false); continue; }
    const x = (px * 0.5 + 0.5) * VIEW_W, y = (-py * 0.5 + 0.5) * VIEW_H;
    L.el.style.transform = `translate3d(${(x + (L.star ? 5 : -30)).toFixed(1)}px, ${(y - 5).toFixed(1)}px, 0)`;
    setShown(L, true);
  }
}

/* ------------------------------ per-frame state ------------------------------ */
const _tmp = new V3();
function updateBodies(jdTT) {
  const s = STATE.scale;
  for (const b of BODIES) {
    relPos(b, jdTT, b.rel);
    if (!b.parent) { b.phys.set(0, 0, 0); b.disp.set(0, 0, 0); }
    else {
      const p = BY_ID[b.parent];
      b.phys.copy(p.phys).add(b.rel);
      if (b.parent === 'sun') b.disp.copy(b.phys);
      else b.disp.copy(p.disp).add(scaledOffset(p.radius, s, b.rel, _tmp));
    }
    const meshR = b.surface.irregular ? Math.max(...b.surface.irregular) : b.eqRadius;
    b.dispR = meshR * (b.kind === 'star' ? Math.min(s, 18) : s);
  }
}

const ZERO3 = new V3();
const _u1 = new V3(), _u2 = new V3(), _u3 = new V3();
function discCoverJS(rs, ro, d) {
  if (d >= rs + ro) return 0;
  if (d <= Math.abs(rs - ro)) return ro >= rs ? 1 : (ro * ro) / (rs * rs);
  const dd = d / rs, rr = ro / rs;
  const c1 = clamp((dd * dd + 1 - rr * rr) / (2 * dd), -1, 1), c2 = clamp((dd * dd + rr * rr - 1) / (2 * dd * rr), -1, 1);
  const k = Math.max((-dd + 1 + rr) * (dd + 1 - rr) * (dd - 1 + rr) * (dd + 1 + rr), 0);
  return clamp((Math.acos(c1) + rr * rr * Math.acos(c2) - 0.5 * Math.sqrt(k)) / Math.PI, 0, 1);
}
function updateRender(jdTT) {
  const O = CAM.origin, s = STATE.scale, sun = BY_ID.sun;
  SHARED.uSunPos.value.copy(sun.disp).sub(O);
  SHARED.uSunR.value = sun.dispR;
  for (const b of BODIES) {
    const g = b.obj.group, m = b.obj.mesh, u = b.obj.mat.uniforms, R = b.dispR;
    g.position.copy(b.disp).sub(O);
    m.scale.set(R, R * (1 - (b.flat || 0)), R);
    bodyOrientation(b, jdTT, b.quat, b.poleV);
    m.quaternion.copy(b.quat);
    u.uPole.value.copy(b.poleV);
    u.uRadius.value = R;
    let n = 0;
    for (const o of b.occluders) {
      u.uOcc.value[n].set(o.disp.x - O.x, o.disp.y - O.y, o.disp.z - O.z, o.dispR);
      u.uOccLeak.value[n].copy(LEAK[o.id] || ZERO3);
      n++;
    }
    u.uOccN.value = n;
    if (b.kind === 'moon') {
      const p = BY_ID[b.parent];
      _u1.copy(p.disp).sub(b.disp).normalize();
      _u2.copy(sun.disp).sub(p.disp).normalize();
      const frac = (1 - _u2.dot(_u1)) / 2;
      u.uShineDir.value.copy(_u1);
      u.uShineI.value = (b.id === 'moon' ? 0.014 : 0.006) * frac;
    }
    if (b.id === 'earth') u.uCloudShift.value = ((jdTT - J2000) * 0.0023) % 1;
    if (b.ring) {
      u.uCenter.value.copy(g.position); u.uRingIn.value = b.ring.inner * s; u.uRingOut.value = b.ring.outer * s;
      const ru = b.obj.ring.material.uniforms;
      ru.uCenter.value.copy(g.position); ru.uPlanetR.value = R; ru.uPole.value.copy(b.poleV);
    }
    if (b.obj.atmo) {
      const a = b.obj.atmo, top = b.atmosphere.top, au = a.material.uniforms;
      a.scale.setScalar(R * (1 + top));
      au.uCenter.value.copy(g.position); au.uRp.value = R;
      au.uCamLocal.value.copy(camera.position).sub(g.position).multiplyScalar(1 / R);
      const side = au.uCamLocal.value.length() < 1 + top ? THREE.BackSide : THREE.FrontSide;
      if (a.material.side !== side) a.material.side = side;
      for (let i = 0; i < 4; i++) { au.uOcc.value[i].copy(u.uOcc.value[i]); au.uOccLeak.value[i].copy(u.uOccLeak.value[i]); }
      au.uOccN.value = n;
    }
  }

  // Sun: corona billboard + screen-space glare, dimmed by anything eclipsing it
  sun.obj.corona.material.uniforms.uSize.value = sun.dispR * 9;
  const gl = sun.obj.glare.material.uniforms;
  gl.uCenter.value.copy(SHARED.uSunPos.value);
  const toSun = _u1.copy(SHARED.uSunPos.value).sub(camera.position);
  const dSun = toSun.length(); toSun.multiplyScalar(1 / dSun);
  const rs = Math.asin(clamp(sun.dispR / dSun, 0, 1));
  let vis = 1;
  for (const b of BODIES) {
    if (b === sun) continue;
    _u2.copy(b.disp).sub(O).sub(camera.position);
    const d = _u2.length();
    if (d > dSun || d < b.dispR) continue;
    const ca = _u2.dot(toSun) / d; if (ca <= 0) continue;
    const ro = Math.asin(clamp(b.dispR / d, 0, 1));
    const sep = Math.atan2(_u3.crossVectors(_u2, toSun).length() / d, ca);
    vis *= 1 - discCoverJS(rs, ro, sep);
  }
  const sunPx = sun.screen.r;
  const sunK = smooth(clamp((Math.log10(Math.max(sunPx, 1)) - 0.6) / 1.5, 0, 1));
  sun.obj.mat.uniforms.uIntensity.value = 16 + (1.05 - 16) * sunK;
  sun.obj.corona.material.uniforms.uI.value = 5 + (0.7 - 5) * sunK;
  gl.uSizePx.value = clamp(sunPx * 14, 140, 420) * DPR;
  gl.uI.value = vis * (1 - smooth(clamp((sunPx - 6) / 110, 0, 1))) * 0.9 * DEEP_K.sunGlare;
  sun.obj.corona.material.uniforms.uI.value *= DEEP_K.sunGlare;
  sun.obj.group.visible = DEEP_K.near > 0;
  const sunOn = sun.screen.vis ? vis * DEEP_K.sunGlare : 0;
  const adapt = 1 - 0.55 * sunOn * (1 - smooth(clamp((sunPx - 2) / 200, 0, 1)) * 0.3);
  DEEP_K.adapt = adapt;
  SKY.stars.material.uniforms.uBright.value = adapt * DEEP_K.sky;
  SKY.mw.material.uniforms.uBright.value = 1.25 * adapt * DEEP_K.sky;
  SKY.stars.visible = DEEP_K.sky > 0.003;

  // sky
  const mu = SKY.mw.material.uniforms;
  mu.uTan.value.set(TAN_HALF * camera.aspect, TAN_HALF);
  mu.uCamRot.value.setFromMatrix4(camera.matrixWorld);
  SKY.mw.visible = STATE.show.milkyway && DEEP_K.sky > 0.003;
  SKY.lines.visible = STATE.show.constellations && DEEP_K.sky > 0.5;

  // belts fade in once the camera is far enough out to see them as a population
  const lcd = Math.log10(CAM.dist);
  for (const p of BELTS) {
    const bd = p.userData;
    const beltFade = smooth(clamp((lcd - bd.from) / 1.2, 0, 1)) * Math.min(1, Math.pow(bd.ref / CAM.dist, 0.55));
    p.visible = STATE.show.belts && beltFade * DEEP_K.near > 0.01;
    p.material.uniforms.uDays.value = jdTT - J2000;
    p.material.uniforms.uSunPos.value.copy(SHARED.uSunPos.value);
    p.material.uniforms.uOpacity.value = bd.base * beltFade * DEEP_K.near;
  }

  // comet activity
  const h = BY_ID.halley, rAU = h.phys.length() / AU;
  const act = clamp(Math.pow(2.4 / rAU, 4) - 0.004, 0, 1);
  const tu = COMET.mat.uniforms;
  COMET.tail.visible = act > 0.002;
  tu.uNucleus.value.copy(h.obj.group.position);
  tu.uAnti.value.copy(h.phys).normalize();
  helioVel(h, jdTT, tu.uVel.value).normalize();
  tu.uLen.value = 1.8e7 * Math.min(act, 1) * Math.pow(1 / rAU, 0.7);
  tu.uAct.value = act;
  tu.uPxScale.value = VIEW_H * DPR / (2 * TAN_HALF);
  COMET.coma.visible = act > 0.002;
  COMET.coma.material.uniforms.uSize.value = 9e4 * Math.sqrt(act) + 2e3;
  COMET.coma.material.uniforms.uI.value = 2.4 * act;

  // orbits
  for (const b of ORBITS) {
    const o = b.orbitLine;
    let op = 0;
    if (STATE.show.orbits) {
      const camToBody = _u1.copy(b.disp).sub(O).distanceTo(camera.position);
      const own = smooth(clamp((Math.log10(camToBody / b.dispR) - 1.2) / 1.0, 0, 1));
      if (b.kind === 'moon') {
        const p = BY_ID[b.parent];
        const aPx = b.rel.length() * (s === 1 ? 1 : Math.sqrt(s)) / (Math.max(p.screen.depth, 1) * TAN_HALF) * VIEW_H / 2;
        op = 0.24 * smooth(clamp((aPx - 18) / 60, 0, 1)) * own;
        if (CAM.target === b || CAM.target === p) op = Math.max(op, 0.2 * own);
      } else op = 0.5 * own * (CAM.target === b ? 1 : 0.3 + 0.7 * smooth(clamp((Math.log10(CAM.dist) - 6.2) / 1.5, 0, 1)));
    }
    op *= DEEP_K.near;
    o.line.visible = op > 0.01;
    if (o.line.visible) {
      o.mat.uniforms.uOpacity.value = op;
      sampleOrbit(b, jdTT);
      o.line.position.copy(b.disp).sub(O);
    }
  }

  // distant-body glints
  const ga = GLINTS.pts.geometry.attributes;
  GLINTS.list.forEach((b, i) => {
    ga.position.setXYZ(i, b.disp.x - O.x, b.disp.y - O.y, b.disp.z - O.z);
    const sc = b.screen;
    let a = sc.vis && !sc.occluded ? 1 - smooth(clamp((sc.r - 1.0) / 2.5, 0, 1)) : 0;
    if (b.kind === 'moon') { const p = BY_ID[b.parent]; if (Math.hypot(sc.x - p.screen.x, sc.y - p.screen.y) < Math.max(p.screen.r + 6, 8)) a = 0; }
    if (b.kind === 'comet') a *= 0.5;
    a *= DEEP_K.near;
    ga.aAlpha.setX(i, a);
  });
  ga.position.needsUpdate = true; ga.aAlpha.needsUpdate = true;

  // probes
  SUN_LIGHT.position.copy(SHARED.uSunPos.value);
  for (const pr of PROBES) {
    const q = pr.p;
    pr.phys.set(q.s[0], q.s[1], q.s[2]);
    pr.disp.copy(pr.phys);
    const f = frameBodyFor(q.s[0], q.s[1], q.s[2], q.jd);
    if (f !== pr.frame) reframeTrail(pr, f);
    writeLine(pr.line, pr.rel, pr.trailN, { head: pr.trailHead, cap: TRAIL_MAX }, pr.frame, O, q.status === 'coast' ? pr.phys : null);
    pr.line.visible = STATE.show.orbits || CAM.target === pr;
    const c = pr.craft;
    c.position.copy(pr.disp).sub(O);
    c.visible = c.position.distanceTo(camera.position) < 400 && q.status === 'coast';
    if (c.visible) {
      _u1.copy(BY_ID.earth.disp).sub(pr.disp).normalize();            // dish toward Earth
      _u2.copy(sun.disp).sub(pr.disp).normalize();
      _u3.crossVectors(_u1, _u2);
      if (_u3.lengthSq() < 1e-8) _u3.set(1, 0, 0);
      _u3.normalize();                                                  // panel axis ⟂ Sun
      const z = new V3().crossVectors(_u3, _u1);
      c.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(_u3, _u1, z));
      const sl = _u2.clone().applyQuaternion(c.quaternion.clone().invert());
      const ang = Math.atan2(sl.z, sl.y);
      for (const w of c.userData.panels) w.rotation.x = ang;           // wings track the Sun
      SUN_LIGHT.target.position.copy(c.position);
    }
  }
  if (MIS.open && PREVIEW.n) {
    writeLine(PREVIEW.line, PREVIEW.rel, PREVIEW.n, null, PREVIEW.frame, O, null);
    PREVIEW.line.visible = true;
  } else if (PREVIEW.line) PREVIEW.line.visible = false;
  updateDeep(O);
  updateCosmos(O);
  updateStars(O);
  updateCrafts(O);
  updateExo(O);
}


/* ------------------------------ loop ------------------------------ */
function resize() {
  VIEW_W = window.innerWidth; VIEW_H = window.innerHeight;
  renderer.setSize(VIEW_W, VIEW_H, false);
  composer.setPixelRatio(DPR);
  composer.setSize(VIEW_W, VIEW_H);
  camera.aspect = VIEW_W / VIEW_H;
  camera.updateProjectionMatrix();
  TAN_HALF = Math.tan(camera.fov * DEG / 2);
  if (BY_ID.sun.obj) BY_ID.sun.obj.glare.material.uniforms.uRes.value.set(VIEW_W * DPR, VIEW_H * DPR);
}

let lastT = performance.now(), uiT = 0, navT = 0, uiFrames = 0, lastLimited = false;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastT) / 1000, 0.1);
  lastT = now;
  SHARED.uTime.value = now / 1000;
  if (!STATE.paused) {
    STATE.jd = clamp(STATE.jd + dt * RATES[STATE.rateIdx][0] / DAY, JD_MIN, JD_MAX);
    if (STATE.jd === JD_MIN || STATE.jd === JD_MAX) { STATE.paused = true; syncTransport(); toast('The ephemeris covers the years 1000 to 2999'); }
  }
  let limited = false;
  if (PROBES.length) {
    const want = STATE.jd + TT_MINUS_UTC;
    const got = advanceProbes(want);
    if (Math.abs(got - want) > 1e-9) { STATE.jd = got - TT_MINUS_UTC; limited = true; }
  }
  const jdTT = STATE.jd + TT_MINUS_UTC;
  updateBodies(jdTT);
  updateStarSystems(jdTT);
  updateCraftPositions(jdTT);
  updateExoPositions(jdTT);
  for (const pr of PROBES) pr.phys.set(pr.p.s[0], pr.p.s[1], pr.p.s[2]);
  for (const pr of PROBES) pr.disp.set(pr.p.s[0], pr.p.s[1], pr.p.s[2]);
  updateCamera(dt, now);
  updateLabels();
  updateRender(jdTT);
  composer.render();

  // HUD
  $('utc').textContent = fmtUTC(STATE.jd);
  if (now - uiT > 250) {
    uiT = now;
    $('jdLabel').textContent = 'JD ' + STATE.jd.toFixed(4);
    if (limited !== lastLimited) { $('limitFlag').hidden = !limited; lastLimited = limited; }
    updateDossierLive();
    syncDateInput();
    if (MIS.open && !STATE.paused && !MIS.busy && now - MIS.lastPlanReal > 1600) replan();
  }
  if (now - navT > 1000) {
    navT = now;
    updateNavDistances();
    if (MIS.open && PROBES.length) renderProbeList();
  }
  if (++uiFrames === 3) $('loader').classList.add('done');
}

async function init() {
  buildBodyList(); buildTransport(); buildLayers(); buildPopovers(); buildMission(); buildKeys(); bindInput();
  try { await loadTextures(); }
  catch (err) { $('loaderText').textContent = 'Textures failed to load. Reload the page to try again.'; throw err; }
  buildBodies(); buildOrbits(); buildSky(); buildBelts(); buildComet(); buildGlints(); buildGalaxy(); buildBlackHole(); buildLocalGroup(); buildCosmicWeb(); buildStars(); buildExo(); buildCrafts(); initPreview(); buildLabels();
  resize();
  STATE.rateIdx = 9; syncTransport();
  const jdTT = STATE.jd + TT_MINUS_UTC;
  updateBodies(jdTT);
  // Opening view: Earth three-quarter lit, terminator in frame
  const earth = BY_ID.earth;
  const toSun = BY_ID.sun.disp.clone().sub(earth.disp).normalize();
  const side = new V3().crossVectors(new V3(0, 1, 0), toSun).normalize();
  const dir = toSun.clone().multiplyScalar(0.55).addScaledVector(side, 0.8).add(new V3(0, 0.32, 0)).normalize();
  focusOn(earth, { dist: earth.dispR * 3.3 / Math.min(1, camera.aspect * 1.5), dir });
  updateCamera(0, performance.now());
  updateLabels();
  updateRender(jdTT);
  renderer.compile(scene, camera);
  requestAnimationFrame(t => { lastT = t; frame(t); });
  window.ECLIPTIC = { CRAFTS, EXO, HELIO, TRAPPIST, craftAt, GALAXY, GALAXIES, WEB, BHS, STARS3D, STARVIEW, DEEP, DEEP_K, stepTo, physAt, predict, launchState, advanceProbes, TT_MINUS_UTC, scene, composer, bloom, renderer, SKY, BELTS, COMET, GLINTS, STATE, CAM, BY_ID, EVENTS, PROBES, MIS, focusOn, setScale, setLayer, setRate, runEvent, openPop, jumpTime, launch, findWindow, refine };
}
init();
