/* ------------------------------------------------------------------ *
 *  Interface
 * ------------------------------------------------------------------ */
const RATES = [
  [-315576000, '−10 yr / s'], [-31557600, '−1 yr / s'], [-2629800, '−1 mo / s'], [-604800, '−1 wk / s'], [-86400, '−1 day / s'],
  [-3600, '−1 h / s'], [-60, '−1 min / s'], [-1, '−1× real'],
  [1, 'Real time'], [60, '1 min / s'], [600, '10 min / s'], [3600, '1 h / s'], [21600, '6 h / s'],
  [86400, '1 day / s'], [604800, '1 wk / s'], [2629800, '1 mo / s'], [31557600, '1 yr / s'], [315576000, '10 yr / s'],
];
const RATE_REAL = 8;
const $ = id => document.getElementById(id);

let toastTimer = 0;
function toast(msg, ms = 3200) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/* ------------------------------ body navigator ------------------------------ */
const ROWS = new Map();
function buildBodyList() {
  const ul = $('bodyList');
  const mkRow = (b, sub) => {
    const btn = document.createElement('button');
    btn.className = 'row' + (sub ? ' sub' : '');
    btn.style.setProperty('--c', b.color);
    btn.innerHTML = `<span class="sw"></span><span class="nm"></span><span class="dv"></span>`;
    btn.querySelector('.nm').textContent = b.short || b.name;
    btn.addEventListener('click', () => { focusOn(b); closeNarrowNav(); });
    ROWS.set(b.id, { btn, dv: btn.querySelector('.dv') });
    return btn;
  };
  for (const b of BODIES.filter(x => !x.parent || x.parent === 'sun')) {
    const li = document.createElement('li');
    li.append(mkRow(b, false));
    ul.append(li);
    if (b.children.length && b.kind !== 'star') {
      const mli = document.createElement('li');
      mli.className = 'moons'; mli.dataset.parent = b.id;
      const sub = document.createElement('ul');
      for (const m of b.children) { const l = document.createElement('li'); l.append(mkRow(m, true)); sub.append(l); }
      mli.append(sub);
      ul.append(mli);
    }
  }
  const csec = document.createElement('li');
  csec.className = 'navsec'; csec.textContent = 'Spacecraft';
  ul.append(csec);
  for (const c of CRAFTS) { const li = document.createElement('li'); li.append(mkRow(c, false)); ul.append(li); }
  const sec = document.createElement('li');
  sec.className = 'navsec'; sec.textContent = 'Beyond the Solar System';
  ul.append(sec);
  for (const d of DEEP.filter(x => x.nav !== false).sort((a, b) => (a.distLy || 0) - (b.distLy || 0))) {
    const li = document.createElement('li');
    li.append(mkRow(d, !!d.sub));
    ul.append(li);
    ROWS.get(d.id).dv.textContent = d.navDist;
  }
}
function syncNavFocus() {
  const f = CAM.target;
  for (const [id, r] of ROWS) r.btn.setAttribute('aria-current', f && f.id === id ? 'true' : 'false');
  const openParent = f && f.kind !== 'probe' ? (f.kind === 'moon' ? f.parent : f.id) : null;
  document.querySelectorAll('li.moons').forEach(li => li.classList.toggle('open', li.dataset.parent === openParent));
}
function updateNavDistances() {
  for (const c of CRAFTS) {
    const r = ROWS.get(c.id), t = c.hidden ? '' : (c.phys.length() / AU).toFixed(1) + ' AU';
    if (r && r.dv.textContent !== t) r.dv.textContent = t;
  }
  for (const b of BODIES) {
    const r = ROWS.get(b.id);
    if (!r) continue;
    let t = '';
    if (b.kind === 'star') t = '';
    else if (b.kind === 'moon') t = compactKm(b.rel.length());
    else t = (b.phys.length() / AU).toFixed(b.phys.length() > 10 * AU ? 1 : 2) + ' AU';
    if (r.dv.textContent !== t) r.dv.textContent = t;
  }
}
function compactKm(km) { return km >= 1e6 ? (km / 1e6).toFixed(2) + ' Mkm' : km >= 1e4 ? Math.round(km / 1000) + 'k km' : Math.round(km) + ' km'; }
function closeNarrowNav() { $('nav').classList.remove('open'); $('btnBodies').setAttribute('aria-expanded', 'false'); }

/* ------------------------------ dossier ------------------------------ */
let dossierFor = null;
function renderDossierStatic(t) {
  dossierFor = t;
  $('dSub').textContent = t.kind === 'probe' ? 'Spacecraft · simulated' : t.subtitle;
  $('dName').textContent = t.name;
  $('dBlurb').textContent = t.kind === 'probe' ? `Launched ${fmtUTC(t.launchJd - TT_MINUS_UTC)} UTC from a ${nf(t.plan.alt)} km orbit around ${t.plan.origin.name}${t.plan.target ? `, bound for ${t.plan.target.name}` : ''}.` : t.blurb;
  const facts = $('dFacts');
  facts.innerHTML = '';
  const list = t.kind === 'probe' ? [['Launch Δv', fmtSpeed(t.dv)], ['Parking orbit', nf(t.plan.alt) + ' km']] : t.facts;
  for (const [k, v] of list) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    facts.append(dt, dd);
  }
  $('dFactsH').textContent = t.kind === 'probe' || t.kind === 'craft' ? 'Mission' : 'Physical';
  const act = $('dActions');
  act.innerHTML = '';
  if (t.kind === 'craft') for (const w of t.wp.filter(w => w.body)) {
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = `${w.body.name} flyby · ${fmtUTC(w.jdU).slice(0, 4)}`;
    b.onclick = () => { jumpTime(w.jdU - 0.5); setRate(11); focusOn(t, { dist: w.off * 3 }); };
    act.append(b);
  }
  if (t.kind === 'probe' && t.encounterJd && t.plan.target) {
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = `Skip to ${t.plan.target.name} flyby`;
    b.onclick = () => skipToEncounter(t);
    act.append(b);
  }
  act.hidden = !act.children.length;
}
function skipToEncounter(pr) {
  if (pr.p.status !== 'coast') { toast(`${pr.name} is no longer flying`); return; }
  const target = pr.plan.target;
  const jd = Math.max(pr.encounterJd - 0.3, STATE.jd + TT_MINUS_UTC) - TT_MINUS_UTC;
  jumpTime(jd);
  setRate(10);
  const jdTT = STATE.jd + TT_MINUS_UTC;
  updateBodies(jdTT);
  // Look at the encounter face-on: camera along the normal of the approach plane
  const q = pr.p, tp = physAt(target, q.jd, new V3()), tv = helioVel(target, q.jd, new V3());
  const rel = new V3(q.s[0] - tp.x, q.s[1] - tp.y, q.s[2] - tp.z), relv = new V3(q.s[3] - tv.x, q.s[4] - tv.y, q.s[5] - tv.z);
  const n = new V3().crossVectors(rel, relv).normalize();
  const dir = n.addScaledVector(rel.clone().normalize(), 0.35).normalize();
  focusOn(target, { dist: Math.max(target.dispR * 30, rel.length() * 1.6), dir });
  toast(`About seven hours before closest approach to ${target.name}. Watch ${pr.name} swing past.`, 4200);
}
const PHASES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
function liveRows(t) {
  const rows = [];
  const jdTT = STATE.jd + TT_MINUS_UTC;
  const earth = BY_ID.earth;
  const camAlt = CAM.dist - (t.dispR || 0);
  if (t.kind === 'craft') {
    const de = t.phys.distanceTo(earth.phys);
    rows.push(['Status', t.hidden ? `launches ${fmtUTC(t.launch).slice(0, 10)}` : jdTT > t.hp + TT_MINUS_UTC ? 'in interstellar space' : 'inside the heliosphere', 'cool']);
    if (t.hidden) return rows;
    rows.push(['Mission time', fmtDuration((jdTT - TT_MINUS_UTC - t.launch) * DAY)]);
    rows.push(['Distance from Sun', fmtDist(t.phys.length()), 'hi']);
    rows.push(['Distance from Earth', fmtDist(de)]);
    rows.push(['Radio signal delay', fmtDuration(de / C_KMS)]);
    rows.push(['Heliocentric speed', fmtSpeed(craftSpeed(t, jdTT))]);
    const nx = t.wp.find(w => w.body && w.jd > jdTT);
    if (nx) rows.push([`${nx.body.name} flyby in`, fmtDuration((nx.jd - jdTT) * DAY)]);
    return rows;
  }
  if (t.deep) {
    const sunCam = BY_ID.sun.disp.clone().sub(CAM.origin).distanceTo(camera.position);
    if (t.kind === 'bh') {
      const r = CAM.dist / t.dispR;
      rows.push(['Light from here left', t.lightAgo || '≈ 26,670 years ago']);
      rows.push(['Camera distance', `${nf(r, r < 100 ? 1 : 0)} Rₛ · ${fmtDist(CAM.dist)}`, 'hi']);
      rows.push(['Clock rate at camera', `${nf(Math.sqrt(Math.max(1 - 1 / r, 0)), 4)}× a distant clock`]);
      rows.push(['Escape speed at camera', `${nf(100 / Math.sqrt(r), 1)}% of light speed`]);
    } else if (t.kind === 'star3d') {
      rows.push(['Light from here left', t.lightAgo]);
      rows.push(['Camera altitude', fmtDist(CAM.dist - t.dispR), 'hi']);
      const m = 4.83 + 5 * Math.log10(Math.max(sunCam / LY, 1e-9) / 3.26156) - 5;
      rows.push(['The Sun from here', m < -5 ? 'blinding' : `magnitude ${nf(m, 1)}${m > 6.5 ? ' (invisible to the eye)' : ''}`]);
    } else if (t.kind === 'universe') {
      rows.push(['Light-travel time to the edge', '13.8 billion years']);
    } else {
      if (t.lightAgo) rows.push(['Light from here left', t.lightAgo]);
      rows.push(['Camera distance from centre', fmtDist(CAM.dist)]);
    }
    rows.push(['Camera distance from Sun', fmtDist(sunCam)]);
    return rows;
  }
  if (t.kind === 'probe') {
    const q = t.p, f = t.frame;
    const fp = physAt(f, q.jd, new V3());
    const fv = f.id === 'sun' ? new V3() : helioVel(f, q.jd, new V3());
    const r = Math.hypot(q.s[0] - fp.x, q.s[1] - fp.y, q.s[2] - fp.z);
    const v = Math.hypot(q.s[3] - fv.x, q.s[4] - fv.y, q.s[5] - fv.z);
    rows.push(['Status', q.status === 'coast' ? 'coasting' : `impacted ${q.hit ? q.hit.name : ''}`, q.status === 'coast' ? 'cool' : 'hi']);
    rows.push(['Mission time', fmtDuration((q.jd - t.launchJd) * DAY)]);
    if (f.id !== 'sun') {
      rows.push([`Altitude above ${f.name}`, fmtDist(r - f.eqRadius)]);
      rows.push([`Speed relative to ${f.name}`, fmtSpeed(v)]);
    }
    rows.push(['Heliocentric speed', fmtSpeed(Math.hypot(q.s[3], q.s[4], q.s[5]))]);
    rows.push(['Distance from Sun', fmtDist(Math.hypot(q.s[0], q.s[1], q.s[2]))]);
    if (t.plan.target && t.closest) rows.push([`Closest to ${t.plan.target.name} so far`, `${fmtDist(t.closest.d - t.plan.target.eqRadius)} alt.`, 'hi'], ['   at', fmtUTC(t.closest.jd - TT_MINUS_UTC).slice(0, 16)]);
    return rows;
  }
  if (t.kind !== 'star') {
    if (t.kind === 'moon') {
      const p = BY_ID[t.parent];
      rows.push([`Distance from ${p.name}`, fmtDist(t.rel.length())]);
      rows.push(['Orbital speed', fmtSpeed(relVel(t, jdTT, new V3()).length())]);
    } else {
      rows.push(['Distance from Sun', fmtDist(t.phys.length())]);
      rows.push(['Orbital speed', fmtSpeed(helioVel(t, jdTT, new V3()).length())]);
    }
  }
  if (t.id !== 'earth' && t.parent !== 'earth') {
    const d = t.phys.distanceTo(earth.phys);
    rows.push(['Distance from Earth', fmtDist(d)]);
    rows.push(['Light time from Earth', fmtDuration(d / C_KMS)]);
  }
  if (t.id === 'moon') {
    const sunDir = new V3().copy(BY_ID.sun.phys).sub(earth.phys);
    const lamS = Math.atan2(-sunDir.z, sunDir.x), lamM = Math.atan2(-t.rel.z, t.rel.x);
    const elong = ((lamM - lamS) / DEG % 360 + 360) % 360;
    const toSun = new V3().copy(BY_ID.sun.phys).sub(t.phys).normalize(), toEarth = new V3().copy(earth.phys).sub(t.phys).normalize();
    const k = (1 + toSun.dot(toEarth)) / 2;
    rows.push(['Phase', `${PHASES[Math.round(elong / 45) % 8]} · ${Math.round(k * 100)}% lit`, 'hi']);
  } else if (t.kind === 'planet' && t.id !== 'earth') {
    const toSun = new V3().copy(BY_ID.sun.phys).sub(t.phys).normalize(), toEarth = new V3().copy(earth.phys).sub(t.phys).normalize();
    const phaseAng = Math.acos(clamp(toSun.dot(toEarth), -1, 1)) / DEG;
    rows.push(['Phase angle from Earth', nf(phaseAng, 1) + '°']);
  }
  if (t.id === 'earth') {
    const d = new V3().copy(BY_ID.sun.phys).sub(t.phys).normalize();
    const X = new V3(1, 0, 0).applyQuaternion(t.quat), Z = new V3(0, 0, 1).applyQuaternion(t.quat);
    const lat = Math.asin(clamp(d.dot(t.poleV), -1, 1)) / DEG, lon = Math.atan2(-d.dot(Z), d.dot(X)) / DEG;
    rows.push(['Subsolar point', `${nf(Math.abs(lat), 2)}° ${lat >= 0 ? 'N' : 'S'}  ${nf(Math.abs(lon), 2)}° ${lon >= 0 ? 'E' : 'W'}`, 'hi']);
    const m = BY_ID.moon;
    rows.push(['Moon distance', fmtDist(m.rel.length())]);
  }
  if (t.kind === 'comet') {
    const r = t.phys.length() / AU;
    rows.push(['Activity', r < 4 ? (r < 1.5 ? 'strong outgassing' : 'coma forming') : 'dormant', r < 4 ? 'hi' : '']);
  }
  rows.push(['Camera altitude', fmtDist(camAlt)]);
  return rows;
}
function updateDossierLive() {
  const t = CAM.target;
  if (!t) return;
  if (t !== dossierFor) renderDossierStatic(t);
  const dl = $('dLive');
  const rows = liveRows(t);
  if (dl.children.length !== rows.length * 2) {
    dl.innerHTML = '';
    for (let i = 0; i < rows.length; i++) dl.append(document.createElement('dt'), document.createElement('dd'));
  }
  rows.forEach(([k, v, cls], i) => {
    const dt = dl.children[i * 2], dd = dl.children[i * 2 + 1];
    if (dt.textContent !== k) dt.textContent = k;
    if (dd.textContent !== v) dd.textContent = v;
    dd.className = cls || '';
  });
}

/* ------------------------------ transport ------------------------------ */
function buildTransport() {
  const sc = $('rateScale');
  RATES.forEach(([r]) => { const i = document.createElement('i'); if (r < 0) i.className = 'neg'; sc.append(i); });
  $('tPlay').onclick = togglePause;
  $('tSlower').onclick = () => setRate(STATE.rateIdx - 1);
  $('tFaster').onclick = () => setRate(STATE.rateIdx + 1);
  $('tNow').onclick = () => { jumpTime(jdFromMs(Date.now())); setRate(RATE_REAL); STATE.paused = false; syncTransport(); toast('Back to the present'); };
  $('tForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('tDate').value;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
    if (!m) { toast('Enter a date and time, e.g. 2030-06-01 12:00 (UTC)'); return; }
    const d = new Date(0); d.setUTCFullYear(+m[1], +m[2] - 1, +m[3]); d.setUTCHours(+m[4], +m[5], 0, 0);
    jumpTime(jdFromMs(d.getTime()));
    toast(`Jumped to ${fmtUTC(STATE.jd).slice(0, 16)} UTC`);
  });
  syncTransport();
}
function setRate(i) { STATE.rateIdx = clamp(i, 0, RATES.length - 1); STATE.paused = false; syncTransport(); }
function togglePause() { STATE.paused = !STATE.paused; syncTransport(); }
function syncTransport() {
  const [r, label] = RATES[STATE.rateIdx];
  $('rateBig').textContent = STATE.paused ? 'Paused' : label;
  $('rateLabel').textContent = STATE.paused ? 'paused' : label.replace(/ /g, '');
  [...$('rateScale').children].forEach((el, i) => el.classList.toggle('on', i === STATE.rateIdx));
  $('tPlayIcon').setAttribute('d', STATE.paused ? 'M6 4l10 6-10 6V4Z' : 'M6 4h3v12H6zM11 4h3v12h-3z');
  $('tPlay').setAttribute('aria-label', STATE.paused ? 'Play (space)' : 'Pause (space)');
}
const JD_MIN = jdFromMs(Date.UTC(1000, 0, 1)), JD_MAX = jdFromMs(Date.UTC(2999, 11, 31));
function jumpTime(jd) {
  STATE.jd = clamp(jd, JD_MIN, JD_MAX);
  if (PROBES.some(p => p.p.status === 'coast')) advanceProbes(STATE.jd + TT_MINUS_UTC, 400000);
}
function syncDateInput() {
  const el = $('tDate');
  if (document.activeElement === el) return;
  const d = new Date(msFromJd(STATE.jd));
  const y = d.getUTCFullYear();
  if (y < 1000 || y > 2999) return;
  el.value = `${pad(y, 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/* ------------------------------ layers & scale ------------------------------ */
function buildLayers() {
  document.querySelectorAll('#layers .toggle').forEach(b => b.addEventListener('click', () => setLayer(b.dataset.layer, !STATE.show[b.dataset.layer])));
  $('scaleRange').addEventListener('input', e => setScale(Math.pow(10, e.target.value / 100 * 2.3)));
}
function setLayer(name, on) {
  STATE.show[name] = on;
  const b = document.querySelector(`#layers .toggle[data-layer="${name}"]`);
  if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
}
function setScale(s, silent) {
  s = s < 1.02 ? 1 : s;
  const old = STATE.scale;
  STATE.scale = s;
  if (CAM.target && CAM.target.kind !== 'probe' && CAM.target.kind !== 'craft' && !CAM.target.deep && !CAM.trans) { CAM.dist *= s / old; CAM.goal *= s / old; }
  $('scaleOut').textContent = s === 1 ? 'true scale' : `× ${s < 10 ? s.toFixed(1) : Math.round(s)}`;
  if (silent) $('scaleRange').value = String(Math.round(Math.log10(s) / 2.3 * 100));
}

/* ------------------------------ popovers ------------------------------ */
const POPS = { events: 'btnEvents', mission: 'btnMission', help: 'btnHelp' };
function openPop(id) {
  for (const [p, b] of Object.entries(POPS)) {
    const on = p === id && $(p).hidden;
    $(p).hidden = !on;
    $(b).setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  MIS.open = !$('mission').hidden;
  if (MIS.open) missionOpened(); else setPreview(null);
}
function buildPopovers() {
  for (const [p, b] of Object.entries(POPS)) $(b).addEventListener('click', () => openPop(p));
  document.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', () => openPop(null)));
  $('btnBodies').addEventListener('click', () => {
    const n = $('nav'), on = !n.classList.contains('open');
    n.classList.toggle('open', on); $('btnBodies').setAttribute('aria-expanded', on ? 'true' : 'false');
  });
  $('dossierToggle').addEventListener('click', () => $('dossier').classList.toggle('open'));
  const list = $('eventList');
  for (const ev of EVENTS) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.innerHTML = `<span class="et"></span><span class="ey"></span><span class="en"></span>`;
    b.querySelector('.et').textContent = ev.title;
    b.querySelector('.ey').textContent = fmtDateShort(ev.jd).slice(0, 4);
    b.querySelector('.en').textContent = ev.note;
    b.addEventListener('click', () => runEvent(ev));
    li.append(b); list.append(li);
  }
}
function runEvent(ev) {
  openPop(null);
  jumpTime(ev.jd);
  STATE.paused = false;
  STATE.rateIdx = ev.focus === 'halley' ? 13 : 9;
  syncTransport();
  updateBodies(STATE.jd + TT_MINUS_UTC);
  const t = BY_ID[ev.focus];
  let dir;
  if (ev.from === 'side') {
    const r = t.phys.clone().normalize();
    dir = new V3().crossVectors(r, new V3(0, 1, 0)).normalize().multiplyScalar(0.8).addScaledVector(r, -0.35).add(new V3(0, 0.45, 0)).normalize();
  } else {
    dir = BY_ID[ev.from].disp.clone().sub(t.disp).normalize();
    dir.add(new V3(0, 0.04, 0)).normalize();
  }
  const s = STATE.scale;
  focusOn(t, { dist: ev.absolute ? ev.dist : t.eqRadius * s * ev.dist, dir });
  toast(`${ev.title} — ${ev.note}`, 4200);
}

/* ------------------------------ mission planner ------------------------------ */
const MIS = {
  open: false, mode: 'transfer', origin: BY_ID.earth, target: BY_ID.mars, alt: 300, busy: false,
  plan: null, transfer: null, result: null, lastPlanReal: 0, debounce: 0,
};
const ORIGINS = ['mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map(id => BY_ID[id]);
const TARGETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].map(id => BY_ID[id]);

function buildMission() {
  const o = $('mOrigin'), tg = $('mTarget');
  for (const b of ORIGINS) o.append(new Option(b.name, b.id));
  o.value = 'earth';
  fillTargets();
  o.addEventListener('change', () => {
    MIS.origin = BY_ID[o.value];
    MIS.alt = Math.round(Math.max(100, MIS.origin.eqRadius * 0.05) / 50) * 50;
    $('mAlt').value = MIS.alt;
    fillTargets();
    if (MIS.origin.kind === 'moon') setMode('free'); else replan();
  });
  tg.addEventListener('change', () => { MIS.target = BY_ID[tg.value]; replan(); });
  $('mAlt').addEventListener('change', e => { MIS.alt = clamp(+e.target.value || 300, 20, 5e6); e.target.value = MIS.alt; replan(); });
  $('mModeTransfer').onclick = () => { if (MIS.origin.kind === 'moon') { toast('Transfers start from a planet. Pick a planet as the departure body.'); return; } setMode('transfer'); };
  $('mModeFree').onclick = () => setMode('free');
  $('mPlanNow').onclick = () => replan();
  $('mWindow').onclick = findWindow;
  $('mRefine').onclick = refine;
  $('mLaunch').onclick = launch;
  for (const id of ['mPro', 'mRad', 'mNor', 'mPhase']) $(id).addEventListener('input', () => { readTrims(); schedulePreview(); });
}
function fillTargets() {
  const tg = $('mTarget');
  tg.innerHTML = '';
  for (const b of TARGETS) if (b !== MIS.origin) tg.append(new Option(b.name, b.id));
  if (MIS.target === MIS.origin || !MIS.target) MIS.target = MIS.origin.id === 'mars' ? BY_ID.jupiter : BY_ID.mars;
  tg.value = MIS.target.id;
}
function setMode(m) {
  MIS.mode = m;
  $('mModeTransfer').setAttribute('aria-selected', m === 'transfer' ? 'true' : 'false');
  $('mModeFree').setAttribute('aria-selected', m === 'free' ? 'true' : 'false');
  $('mTransfer').hidden = m !== 'transfer';
  $('mFree').hidden = m !== 'free';
  $('mRefine').disabled = m !== 'transfer';
  const pro = $('mPro');
  if (m === 'free') { pro.min = -3; pro.max = 12; pro.value = 3.2; $('mProLabel').textContent = 'Prograde Δv'; for (const id of ['mRad', 'mNor']) { $(id).min = -3; $(id).max = 3; } }
  else { pro.min = -0.5; pro.max = 0.5; pro.value = 0; $('mProLabel').textContent = 'Prograde trim'; for (const id of ['mRad', 'mNor']) { $(id).min = -0.5; $(id).max = 0.5; } }
  $('mRad').value = 0; $('mNor').value = 0;
  replan();
}
function readTrims() {
  const f = x => +$(x).value;
  MIS.trim = { pro: f('mPro'), rad: f('mRad'), nor: f('mNor') };
  MIS.phase = f('mPhase');
  $('mProOut').textContent = fmtSigned(MIS.trim.pro);
  $('mRadOut').textContent = fmtSigned(MIS.trim.rad);
  $('mNorOut').textContent = fmtSigned(MIS.trim.nor);
  $('mPhaseOut').textContent = MIS.phase + '°';
}
function fmtSigned(kms) { const s = kms > 0 ? '+' : kms < 0 ? '−' : ''; const a = Math.abs(kms); return s + (a < 1 ? nf(a * 1000, 0) + ' m/s' : nf(a, 3) + ' km/s'); }

function missionOpened() {
  const f = CAM.target;
  if (f && ORIGINS.includes(f) && f !== MIS.origin) {
    MIS.origin = f; $('mOrigin').value = f.id;
    MIS.alt = f.id === 'earth' ? 300 : Math.round(Math.max(100, f.eqRadius * 0.05) / 50) * 50; $('mAlt').value = MIS.alt;
    fillTargets();
  }
  if (MIS.origin.kind === 'moon' && MIS.mode === 'transfer') { setMode('free'); return; }
  replan();
}
function currentPlan() {
  readTrims();
  const p = { origin: MIS.origin, alt: MIS.alt, trim: MIS.trim, phase: MIS.phase };
  if (MIS.mode === 'transfer' && MIS.transfer) Object.assign(p, { target: MIS.target, vinf: MIS.transfer.vinf.clone(), tof: MIS.transfer.tof });
  return p;
}
function replan() {
  if (!MIS.open) return;
  const jdTT = STATE.jd + TT_MINUS_UTC;
  if (MIS.mode === 'transfer') MIS.transfer = bestTofAt(MIS.origin, MIS.target, jdTT);
  else MIS.transfer = null;
  MIS.lastPlanReal = performance.now();
  runPreview();
}
function schedulePreview() { clearTimeout(MIS.debounce); MIS.debounce = setTimeout(runPreview, 90); }
function runPreview() {
  if (!MIS.open) return;
  const plan = currentPlan();
  MIS.plan = plan;
  const jdTT = STATE.jd + TT_MINUS_UTC;
  let days;
  if (plan.vinf) days = plan.tof * 1.3;
  else {
    const st = launchState(plan, jdTT), o = plan.origin;
    const rO = helioPos(o, jdTT, new V3()), vO = helioVel(o, jdTT, new V3());
    const r = Math.hypot(st.s[0] - rO.x, st.s[1] - rO.y, st.s[2] - rO.z), v = Math.hypot(st.s[3] - vO.x, st.s[4] - vO.y, st.s[5] - vO.z);
    const eps = v * v / 2 - o.GM / r;
    if (eps < 0) { const a = -o.GM / (2 * eps); days = Math.min(2.2 * TAU * Math.sqrt(a * a * a / o.GM) / DAY, 90); }
    else days = 420;
  }
  MIS.result = predict(plan, jdTT, days);
  setPreview(MIS.result);
  renderMissionStats();
}
function renderMissionStats() {
  const R = MIS.result, plan = MIS.plan, dl = $('mStats');
  if (!R) { dl.innerHTML = ''; return; }
  const rows = [['Burn from parking orbit', fmtSpeed(R.launch.dv), 'hi']];
  if (plan.vinf) {
    rows.push(['Departure v∞', fmtSpeed(plan.vinf.length())]);
    rows.push(['Time of flight', nf(plan.tof, 1) + ' days']);
    rows.push(['Closest approach on', fmtUTC((R.best.jd || (STATE.jd + TT_MINUS_UTC + plan.tof)) - TT_MINUS_UTC).slice(0, 16)]);
    if (R.status === 'impact' && R.hit === plan.target) rows.push(['Predicted outcome', `impact on ${plan.target.name}`, 'hi']);
    else if (R.best.miss) rows.push([`Closest approach`, `${fmtDist(Math.max(R.best.d - plan.target.eqRadius, 0))} altitude`, R.best.d < plan.target.soi ? 'cool' : '']);
  } else {
    rows.push(['Preview span', fmtDuration((R.end - (STATE.jd + TT_MINUS_UTC)) * DAY)]);
  }
  if (R.status === 'impact' && (!plan.target || R.hit !== plan.target)) rows.push(['Warning', `trajectory hits ${R.hit.name}`, 'hi']);
  rows.push(['Drawn relative to', R.frame.name]);
  dl.innerHTML = '';
  for (const [k, v, c] of rows) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v; if (c) dd.className = c;
    dl.append(dt, dd);
  }
}
function findWindow() {
  if (MIS.busy) return;
  MIS.busy = true;
  $('mStatus').textContent = 'Searching departure dates…';
  STATE.paused = true; syncTransport();
  setTimeout(() => {
    const w = nextWindow(MIS.origin, MIS.target, STATE.jd + TT_MINUS_UTC);
    MIS.busy = false;
    if (!w) { $('mStatus').textContent = 'No transfer found'; return; }
    jumpTime(w.jd - TT_MINUS_UTC);
    $('mStatus').textContent = `Window ${fmtUTC(STATE.jd).slice(0, 10)} · v∞ ${nf(w.c, 2)} km/s`;
    replan();
    focusOn(MIS.origin);
  }, 40);
}
function refine() {
  if (MIS.busy || !MIS.transfer) return;
  MIS.busy = true;
  const plan = currentPlan();
  $('mStatus').textContent = 'Refining…';
  refinePlan(plan, STATE.jd + TT_MINUS_UTC, plan.target.eqRadius * 2.2, 5, (i, d) => { $('mStatus').textContent = `Refining ${i + 1}/5 · miss ${fmtDist(d)}`; })
    .then(res => {
      MIS.busy = false;
      MIS.transfer.vinf = plan.vinf.clone();
      MIS.result = res; MIS.plan = plan;
      setPreview(res);
      renderMissionStats();
      $('mStatus').textContent = res.best.miss ? `Aimed · periapsis ≈ ${fmtDist(Math.max(res.best.d - plan.target.eqRadius, 0))}` : 'Refined';
    });
}
function launch() {
  const plan = currentPlan();
  if (STATE.scale !== 1) { setScale(1, true); toast('Body size reset to true scale for the flight'); }
  const pr = launchProbe(plan, STATE.jd + TT_MINUS_UTC);
  if (plan.target && MIS.result && MIS.result.best.miss && MIS.plan && MIS.plan.target === plan.target) pr.encounterJd = MIS.result.best.jd;
  $('mStatus').textContent = `${pr.name} launched`;
  renderProbeList();
  openPop(null);
  const away = pr.phys.clone().sub(plan.origin.phys).normalize().add(new V3(0, 0.25, 0)).normalize();
  focusOn(pr, { dist: 0.04, dir: away });
  setRate(Math.min(STATE.rateIdx, 9));
  toast(`${pr.name} is away. Speed up time to follow it; its path is drawn relative to whichever body it is closest to.`, 5200);
}
function renderProbeList() {
  const box = $('mProbes');
  box.innerHTML = '';
  for (const pr of PROBES) {
    const d = document.createElement('div');
    d.className = 'probe-item';
    const st = pr.p.status === 'coast' ? `${pr.plan.target ? '→ ' + pr.plan.target.name : 'free flight'} · ${fmtDuration((pr.p.jd - pr.launchJd) * DAY)}` : `impacted ${pr.p.hit.name}`;
    d.innerHTML = `<div><b></b><br><span></span></div><button data-a="view">View</button><button data-a="rm">Remove</button>`;
    d.querySelector('b').textContent = pr.name;
    d.querySelector('span').textContent = st;
    d.querySelector('[data-a="view"]').onclick = () => { openPop(null); focusOn(pr, { dist: 0.035 }); };
    d.querySelector('[data-a="rm"]').onclick = () => { if (CAM.target === pr) focusOn(pr.frame.id === 'sun' ? pr.plan.origin : pr.frame); removeProbe(pr); removeLabel(pr); renderProbeList(); };
    box.append(d);
  }
}

/* ------------------------------ keyboard ------------------------------ */
function toggleUI() {
  const off = document.body.classList.toggle('ui-off');
  const b = $('btnUI');
  b.setAttribute('aria-pressed', off ? 'true' : 'false');
  b.setAttribute('aria-label', off ? 'Show panels' : 'Hide panels');
  b.title = off ? 'Show panels (H)' : 'Hide panels (H)';
}
function buildKeys() {
  $('btnUI').addEventListener('click', toggleUI);
  const order = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  window.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea')) return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); togglePause(); }
    else if (k === ',' || k === '<') setRate(STATE.rateIdx - 1);
    else if (k === '.' || k === '>') setRate(STATE.rateIdx + 1);
    else if (k === 'n' || k === 'N') $('tNow').click();
    else if (k === 'h' || k === 'H') toggleUI();
    else if (/^[0-9]$/.test(k)) focusOn(BY_ID[order[+k]]);
    else if (k === 'o' || k === 'O') setLayer('orbits', !STATE.show.orbits);
    else if (k === 'l' || k === 'L') setLayer('labels', !STATE.show.labels);
    else if (k === 'b' || k === 'B') setLayer('belts', !STATE.show.belts);
    else if (k === 'c' || k === 'C') setLayer('constellations', !STATE.show.constellations);
    else if (k === 'g' || k === 'G') focusOn(MILKY_WAY);
    else if (k === 'x' || k === 'X') focusOn(SGR_A);
    else if (k === 'a' || k === 'A') focusOn(M31);
    else if (k === 'u' || k === 'U') focusOn(UNIVERSE);
    else if (k === 'Escape') openPop(null);
    else if (k === '?') openPop('help');
  });
}
