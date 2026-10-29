'use strict';
/* ===== POTATO PARADISE: SPUD VACATION DEFENSE — vanilla JS, procedural art, Web Audio ===== */
const W = 900, H = 540, X0 = 90, Y0 = 60, CW = 88, CH = 96, COLS = 9, ROWS = 5;
const cv = document.getElementById('c');
let ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- helpers ---------- */
function ell(x, y, rx, ry, fill, stroke, lw) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
function rr(x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}
function ln(x1, y1, x2, y2, col, w) {
  ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function poly(pts, fill, stroke) {
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

/* ---------- sound (Web Audio, no files) ---------- */
let muted = false, ac = null, lastHit = 0;
function sfx(f, d = .1, type = 'square', v = .04, slide = 0, delay = 0) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (e) { /* audio unavailable */ }
}
const S = {
  click: () => sfx(620, .07), collect: () => { sfx(880, .08, 'sine', .06); sfx(1320, .1, 'sine', .05, 0, .06); },
  place: () => sfx(200, .12, 'triangle', .08, -80), shoot: () => sfx(420, .08, 'square', .03, -250),
  hit: () => { if (performance.now() - lastHit > 60) { lastHit = performance.now(); sfx(160, .06, 'sawtooth', .03); } },
  die: () => sfx(300, .25, 'sawtooth', .05, -250), pdie: () => sfx(260, .35, 'triangle', .07, -200),
  wave: () => { sfx(392, .15, 'triangle', .06); sfx(523, .15, 'triangle', .06, 0, .15); sfx(659, .25, 'triangle', .06, 0, .3); },
  boss: () => { sfx(90, .8, 'sawtooth', .09, -30); sfx(70, .8, 'square', .06, -20, .3); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => sfx(f, .3, 'triangle', .07, 0, i * .15)),
  over: () => [400, 320, 240, 160].forEach((f, i) => sfx(f, .35, 'sawtooth', .06, 0, i * .22)),
  ability: () => sfx(300, .3, 'sawtooth', .06, 500)
};

/* ---------- game data ---------- */
const P = {
  sun:     { name: 'SunSpud',      cost: 50,  hp: 100, cd: 5,  rate: 7,   dmg: 0,  abCd: 25, desc: 'Makes Sun Chips. Ability: Sun Burst', key: 1 },
  cannon:  { name: 'Cannon Spud',  cost: 100, hp: 110, cd: 5,  rate: 1.4, dmg: 20, abCd: 22, desc: 'Shoots spud balls. Ability: Super Spud', key: 2 },
  coconut: { name: 'Coconut Spud', cost: 150, hp: 140, cd: 7,  rate: 2.3, dmg: 24, abCd: 26, desc: 'Splash damage. Ability: Coco Barrage', key: 3 },
  ice:     { name: 'Ice Spud',     cost: 125, hp: 100, cd: 6,  rate: 1.6, dmg: 9,  abCd: 28, desc: 'Slows zombies. Ability: Freeze Party', key: 4 },
  surfer:  { name: 'Surfer Spud',  cost: 125, hp: 90,  cd: 7,  rate: .55, dmg: 7,  abCd: 25, desc: 'Rapid fire. Ability: Wipeout Burst', key: 5 },
  bunker:  { name: 'Bunker Spud',  cost: 75,  hp: 700, cd: 9,  rate: 0,   dmg: 0,  abCd: 24, desc: 'Super tough wall. Ability: Beach Fort', key: 6 }
};
const E = {
  beach:     { hp: 100, sp: 20, pts: 50,  sc: 1,    dps: 20, name: 'Beach Zombie' },
  lifeguard: { hp: 380, sp: 13, pts: 150, sc: 1.12, dps: 24, name: 'Lifeguard Zombie' },
  surfer:    { hp: 75,  sp: 44, pts: 80,  sc: 1,    dps: 18, name: 'Surfer Zombie' },
  bucket:    { hp: 90,  sp: 20, pts: 120, sc: 1,    dps: 20, armor: 260, name: 'Bucket Zombie' },
  seagull:   { hp: 120, sp: 24, pts: 120, sc: 1,    dps: 18, name: 'Seagull Zombie' },
  tourist:   { hp: 850, sp: 8,  pts: 250, sc: 1.2,  dps: 28, name: 'Tourist Zombie' },
  boss:      { hp: 2200, sp: 7, pts: 1000, sc: 2.1, dps: 110, name: 'GIANT VACATION ZOMBIE' }
};
const TIERS = ['Grumpy', 'Chill', 'Happy', 'VACATION MODE!'];
const tierOf = m => m < 30 ? 0 : m < 70 ? 1 : m < 90 ? 2 : 3;
const FIRE = [1, 1.12, 1.3, 1.6], DMGM = [1, 1, 1.15, 1.4];
const ALL = ['beach', 'bucket', 'lifeguard', 'surfer', 'seagull', 'tourist'];
const POOLS = { 1: ['beach'], 2: ['beach'], 3: ['beach', 'beach', 'surfer'], 4: ['beach', 'bucket', 'lifeguard', 'surfer'], 5: ['beach', 'bucket'],
  6: ['beach', 'bucket', 'surfer', 'seagull'], 7: ['beach', 'bucket', 'lifeguard', 'seagull', 'tourist'], 8: ALL, 9: ALL, 10: ALL };

/* ---------- character art: potatoes ---------- */
function blob(w, h, col, dark) {
  ctx.beginPath(); ctx.moveTo(-w * .45, -h * .1);
  ctx.bezierCurveTo(-w * .55, -h * .5, -w * .1, -h * .55, w * .15, -h * .5);
  ctx.bezierCurveTo(w * .5, -h * .5, w * .58, -h * .1, w * .5, h * .15);
  ctx.bezierCurveTo(w * .48, h * .5, w * .1, h * .52, -w * .15, h * .5);
  ctx.bezierCurveTo(-w * .55, h * .5, -w * .58, h * .1, -w * .45, -h * .1); ctx.closePath();
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, col); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5a3a1a'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-w * .2, -h * .25, w * .12, h * .07, -.6, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(90,58,26,.3)'; ctx.beginPath(); ctx.ellipse(0, h * .42, w * .35, h * .07, 0, 0, 7); ctx.fill(); // darker underside
  ctx.fillStyle = 'rgba(90,58,26,.35)';
  [[.15, .1], [-.22, .2], [.26, -.18], [-.05, -.05]].forEach(p => { ctx.beginPath(); ctx.arc(p[0] * w, p[1] * h, 2, 0, 7); ctx.fill(); });
}
function eyes(sp, y, o, big) {
  [-sp, sp].forEach(x => {
    if (o.blink) ln(x - 5, y, x + 5, y, '#3a2410', 2.5);
    else { ell(x, y, big || 6, (big || 6) + 1.5, '#fff', '#3a2410'); ell(x - 1.5, y + 1, 3, 4, '#222'); ell(x - 2.5, y - 1, 1.2, 1.2, '#fff'); }
  });
}
function mouth(y, tier, hurt) {
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2.5; ctx.beginPath();
  if (hurt) { ctx.ellipse(0, y + 2, 4, 5, 0, 0, 7); ctx.fillStyle = '#6b1f1f'; ctx.fill(); }
  else if (tier >= 2) { ctx.arc(0, y - 3, 9, .1, Math.PI - .1); ctx.closePath(); ctx.fillStyle = '#8b2d2d'; ctx.fill(); }
  else if (tier === 1) ctx.arc(0, y - 3, 6, .2, Math.PI - .2);
  else ctx.arc(0, y + 6, 6, Math.PI + .3, -.3);
  ctx.stroke();
}
const brow = (x, y, s) => ln(x - 6, y + s * 3, x + 6, y - s * 3, '#3a2410', 3);
const FEET = (w, c) => { ell(-w, 34, 10, 5, c, '#5a3a1a'); ell(w, 34, 10, 5, c, '#5a3a1a'); };

const POT = {
  sun(o) {
    FEET(12, '#c98a45'); const w = Math.sin(o.ph * 4) * 4;
    ln(-26, 2, -40, -8 + w, '#d79a4c', 6); ln(26, 2, 40, -8 - w, '#d79a4c', 6);
    blob(56, 64, '#f6d894', '#d79a4c');
    rr(-23, -12, 19, 12, 5, '#1a1a1a'); rr(4, -12, 19, 12, 5, '#1a1a1a'); ln(-5, -8, 5, -8, '#1a1a1a', 3);
    ell(-17, -9, 3, 2, 'rgba(255,255,255,.7)'); ell(11, -9, 3, 2, 'rgba(255,255,255,.7)');
    mouth(14, o.tier, o.hurt);
    ell(0, -30, 36, 8, '#ffcc33', '#b8860b'); ctx.beginPath(); ctx.arc(0, -32, 18, Math.PI, 0); ctx.fillStyle = '#ffd54f'; ctx.fill(); ctx.stroke();
    rr(-18, -36, 36, 6, 2, '#e53935');
    if (o.t > 5.5 || o.cheer > 0) for (let i = 0; i < 8; i++) { const a = o.ph * 2 + i * .785; ln(Math.cos(a) * 42, Math.sin(a) * 42 - 4, Math.cos(a) * 52, Math.sin(a) * 52 - 4, '#ffee58', 3); }
  },
  cannon(o) {
    FEET(16, '#c08040'); ln(-32, 2, -42, 8, '#c08040', 6);
    blob(72, 56, '#eab97a', '#bf8440');
    rr(18, -6, 38, 18, 6, '#455a64', '#263238'); ell(56, 3, 5, 9, '#263238'); ell(24, 16, 9, 9, '#6d4c41', '#3e2723');
    if (o.fire > .1) { ell(64, 3, 4 + o.fire * 6, 3 + o.fire * 5, 'rgba(255,214,102,' + clamp(o.fire, 0, 1) + ')'); }
    eyes(-12 + 0, -8, o, 5); brow(-12, -17, -.3); brow(12, -17, .3);
    eyes(12, -8, o, 5); mouth(10, o.tier, o.hurt);
    rr(-34, -24, 68, 8, 4, '#e53935', '#8e1b1b'); ln(34, -20, 44, -12, '#e53935', 5);
  },
  coconut(o) {
    FEET(16, '#c9954f'); const w = Math.sin(o.ph * 4) * 3;
    ln(-32, 0, -44, -6 + w, '#c9954f', 7); ln(32, 0, 44, -6 - w, '#c9954f', 7);
    blob(68, 70, '#e0b070', '#b88540');
    ctx.beginPath(); ctx.moveTo(-34, -6); ctx.bezierCurveTo(-34, -48, 34, -48, 34, -6); ctx.quadraticCurveTo(0, -18, -34, -6);
    ctx.fillStyle = '#7a4a24'; ctx.fill(); ctx.strokeStyle = '#3e2410'; ctx.lineWidth = 2.5; ctx.stroke();
    for (let i = 0; i < 6; i++) ln(-24 + i * 10, -28, -22 + i * 10, -18, '#4e2c14', 2);
    ell(-8, -30, 4, 2, 'rgba(255,255,255,.4)');
    eyes(-12, -2, o, 6); eyes(12, -2, o, 6); mouth(18, 2, o.hurt); ell(4, 22, 4, 3, '#e57373');
    if (o.fire > 0) ell(40, -12 - o.fire * 8, 8, 8, '#6d4c41', '#3e2410');
  },
  ice(o) {
    FEET(12, '#9fd0ee'); ln(-26, 4, -38, 10, '#9fd0ee', 6); ln(26, 4, 38, 10, '#9fd0ee', 6);
    blob(54, 62, '#e3f6ff', '#86c1e6');
    for (let i = 0; i < 4; i++) ell(-18 + i * 12, -28 + (i % 2) * 3, 8, 6, '#fff', '#bfe3f5');
    eyes(-10, -6, o, 5.5); eyes(10, -6, o, 5.5); poly([[-17, -17], [-3, -13], [-16, -11]], '#7fd1ff', '#3a90c8'); poly([[17, -17], [3, -13], [16, -11]], '#7fd1ff', '#3a90c8');
    mouth(12, o.tier === 0 ? 1 : o.tier, o.hurt);
    rr(-27, 14, 54, 10, 5, '#ef5350', '#8e1b1b'); for (let i = 0; i < 5; i++) ln(-20 + i * 10, 14, -17 + i * 10, 24, '#fff', 3);
    rr(8, 20, 10, 20, 4, '#ef5350', '#8e1b1b');
    for (let i = 0; i < 3; i++) { const k = (o.ph * .8 + i / 3) % 1; ctx.globalAlpha = 1 - k; ell(-22 - k * 22, 8 - k * 10, 3 + k * 4, 3 + k * 4, '#fff'); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText('*', -34 + Math.sin(o.ph * 3) * 4, -34); ctx.fillText('*', 28, -20 + Math.cos(o.ph * 3) * 4);
  },
  surfer(o) {
    ctx.rotate(Math.sin(o.ph * 3) * .07);
    ctx.save(); ctx.translate(20, 0); ctx.rotate(.18); ell(0, 0, 13, 48, '#26c6da', '#006064'); ln(0, -44, 0, 44, '#ffeb3b', 5); ctx.restore();
    FEET(8, '#d9a85c'); ln(-18, 4, -34, -8 + Math.sin(o.ph * 5) * 5, '#d9a85c', 6); ln(18, 4, 34, -12 - Math.sin(o.ph * 5) * 5, '#d9a85c', 6);
    blob(42, 78, '#f2c882', '#c98b45');
    poly([[-14, -38], [-8, -52], [-2, -38], [4, -54], [10, -38], [16, -48], [16, -34], [-14, -34]], '#ffd54f', '#b8860b');
    rr(-16, -18, 14, 9, 4, '#111'); rr(2, -18, 14, 9, 4, '#111'); ln(-2, -14, 2, -14, '#111', 3);
    ctx.beginPath(); ctx.arc(0, 4, 9, .1, Math.PI - .1); ctx.closePath(); ctx.fillStyle = '#8b2d2d'; ctx.fill(); ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.stroke(); ell(3, 11, 3, 3, '#ef5350');
  },
  bunker(o) {
    FEET(18, '#a8743c'); ln(-38, 6, -46, 16, '#a8743c', 8); ln(38, 6, 46, 16, '#a8743c', 8);
    blob(78, 72, '#d6a46c', '#9c6a35');
    ell(0, 14, 36, 12, null, '#ffeb3b', 10); ctx.beginPath(); ctx.ellipse(0, 14, 36, 12, 0, .2, 1.4); ctx.strokeStyle = '#e53935'; ctx.lineWidth = 10; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 14, 36, 12, 0, Math.PI + .2, Math.PI + 1.4); ctx.stroke();
    eyes(-14, -6, o, 6); eyes(14, -6, o, 6); brow(-14, -17, -.45); brow(14, -17, .45);
    ln(-8, 6, 8, 6, '#3a2410', 3);
    ctx.beginPath(); ctx.arc(0, -22, 30, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#e53935'; ctx.fill(); ctx.strokeStyle = '#8e1b1b'; ctx.lineWidth = 2.5; ctx.stroke();
    rr(-6, -52, 12, 30, 3, '#fff'); rr(-32, -24, 64, 6, 3, '#fff', '#8e1b1b');
    if (o.fort > 0) { ell(0, 0, 52, 56, 'rgba(100,220,255,.25)', '#4dd0e1', 3); }
  }
};
function drawPotato(type, x, y, o) {
  ctx.save(); ctx.translate(x, y);
  ell(0, 0, 32, 8, 'rgba(0,0,0,.25)');
  if (o.tier === 3) { const g = ctx.createRadialGradient(0, -36, 5, 0, -36, 60); g.addColorStop(0, 'rgba(255,240,120,.8)'); g.addColorStop(1, 'rgba(255,240,120,0)'); ctx.fillStyle = g; ctx.fillRect(-60, -100, 120, 120); }
  let f = '';
  if (o.flash > 0) f += 'brightness(1.8) ';
  if (o.dis > 0 || o.sleep) f += 'grayscale(.9) brightness(.8)';
  if (f) ctx.filter = f;
  const bob = Math.sin(o.ph * 3) * 2 - (o.cheer > 0 ? Math.abs(Math.sin(o.ph * 14)) * 9 : 0);
  ctx.translate(0, -36 + bob); ctx.scale(1 + Math.sin(o.ph * 3) * .02, 1 - Math.sin(o.ph * 3) * .02);
  o.blink = (o.ph % 3.7) < .12; o.hurt = o.flash > 0;
  POT[type](o);
  ctx.restore();
  if (o.tier === 3) { ctx.fillStyle = '#fff59d'; ctx.font = 'bold 14px sans-serif'; for (let i = 0; i < 3; i++) { const a = o.ph * 2 + i * 2.1; ctx.fillText('✦', x + Math.cos(a) * 34 - 5, y - 40 + Math.sin(a) * 30); } }
  if (o.dis > 0 || o.sleep) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.font = 'bold 18px sans-serif'; ctx.strokeText('zZ', x - 8, y - 80); ctx.fillText('zZ', x - 8, y - 80); }
}

/* ---------- character art: zombies ---------- */
function zb(z, o) {
  const sw = Math.sin(z.ph) * 9, at = z.eating ? Math.sin(z.t * 12) * 7 : 0, k = o.tw / 2;
  ln(-9, 16, -9 + sw, 38, o.pants, 11); ln(9, 16, 9 - sw, 38, o.pants, 11);
  ell(-12 + sw, 40, 10, 5, o.shoe || '#555'); ell(6 - sw, 40, 10, 5, o.shoe || '#555');
  if (o.back) o.back();
  rr(-k, -20, o.tw, 42, 12, o.shirt, '#33402a');
  if (o.deco) o.deco(k);
  ln(-k + 3, -10, -32 - at, -6 + sw * .4 + at * .5, o.skin, 9); ln(k - 3, -8, -28 - at, 2 - sw * .4, o.skin, 9);
  ell(-33 - at, -6 + sw * .4 + at * .5, 6, 6, o.skin, '#33402a', 1.5);
  ell(-2, -36, 19, 18, o.skin, '#33402a'); ell(-8, -44, 7, 3, 'rgba(255,255,255,.25)');
  ell(-10, -38, 6.5, 7, '#fff', '#222'); ell(-11.5, -37, 2.5, 2.5, '#c00'); ell(4, -39, 4.5, 5, '#fff', '#222'); ell(3, -38, 2, 2, '#222');
  rr(-14, -28, 20, 8, 3, '#4a1d1d'); ctx.fillStyle = '#fff'; ctx.fillRect(-12, -28, 4, 4); ctx.fillRect(-5, -28, 4, 4); ctx.fillRect(2, -28, 3, 4);
  ln(3, -52, 9, -46, '#33402a', 2); ln(5, -52, 7, -45, '#33402a', 1.5);
}
const ZOM = {
  beach(z) { zb(z, { skin: '#9ccf7a', shirt: '#ff8a50', pants: '#29b6f6', tw: 40, deco: () => [[-8, -8], [8, 4], [-4, 12]].forEach(p => ell(p[0], p[1], 4, 4, '#ffee58')) });
    rr(-16, -54, 24, 7, 3, '#222'); ln(-12, -50, -4, -50, '#666', 2); },
  lifeguard(z) { zb(z, { skin: '#8fc48a', shirt: '#e53935', pants: '#eceff1', tw: 52, deco: () => { rr(-4, -10, 8, 22, 2, '#fff'); rr(-10, -3, 20, 8, 2, '#fff'); } });
    ctx.beginPath(); ctx.ellipse(0, 12, 33, 13, 0, 0, 7); ctx.strokeStyle = '#ff9800'; ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 12, 33, 13, 0, .3, 1.2); ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 12, 33, 13, 0, Math.PI + .3, Math.PI + 1.2); ctx.stroke();
    rr(-24, -58, 38, 9, 4, '#ef5350', '#8e1b1b'); },
  surfer(z) { zb(z, { skin: '#a5d68a', shirt: '#26c6da', pants: '#37474f', tw: 34, back: () => { ctx.save(); ctx.translate(14, -4); ctx.rotate(.15); ell(0, 0, 11, 48, '#ffeb3b', '#e65100'); ln(0, -42, 0, 42, '#e53935', 4); ctx.restore(); } });
    poly([[-18, -48], [-10, -62], [-2, -50], [6, -60], [14, -46], [-2, -42]], '#ffe082', '#b8860b'); },
  bucket(z) { zb(z, { skin: '#9ccf7a', shirt: '#8bc34a', pants: '#8d6e63', tw: 40, deco: () => { for (let i = 0; i < 3; i++) ln(-18, -10 + i * 12, 18, -10 + i * 12, '#fff', 3); } });
    if (z.armor > 0) { poly([[-23, -70], [19, -70], [14, -42], [-18, -42]], '#ef5350', '#8e1b1b'); rr(-22, -62, 40, 6, 2, '#ffeb3b');
      ctx.beginPath(); ctx.arc(-2, -70, 18, Math.PI, 0); ctx.strokeStyle = '#666'; ctx.lineWidth = 3; ctx.stroke();
      const d = 1 - z.armor / z.maxArmor; for (let i = 0; i < d * 4; i++) ln(-12 + i * 8, -68, -8 + i * 8, -50, '#4a0d0d', 2); } },
  seagull(z) { zb(z, { skin: '#a4d48a', shirt: '#eceff1', pants: '#90a4ae', tw: 38, shoe: '#ff9800' });
    ctx.save(); ctx.translate(14, -8); ctx.rotate(Math.sin(z.ph * 2) * .3 - .4); ell(14, -4, 26, 9, '#fff', '#90a4ae'); ctx.restore();
    poly([[-18, -36], [-36, -30], [-18, -26]], '#ffb300', '#e65100');
    ell(-4, -56, 6, 10, '#fff', '#90a4ae'); ell(4, -54, 5, 8, '#cfd8dc', '#90a4ae'); },
  tourist(z) { zb(z, { skin: '#98c98a', shirt: '#ffee58', pants: '#bcaaa4', tw: 54, back: () => rr(12, -18, 24, 42, 7, '#43a047', '#1b5e20'),
      deco: () => { [[-14, -10], [14, 6], [-6, 14]].forEach(p => ell(p[0], p[1], 5, 5, '#e53935')); rr(-18, -4, 26, 16, 3, '#222'); ell(-5, 4, 5.5, 5.5, '#7fb3ff', '#fff'); } });
    ell(-2, -52, 32, 7, '#d7b377', '#8d6e3a'); rr(-14, -68, 24, 18, 7, '#d7b377', '#8d6e3a'); rr(-52, -16, 14, 18, 2, '#fff59d', '#8d6e3a'); },
  boss(z) { zb(z, { skin: '#7bbf5a', shirt: '#ff7043', pants: '#5d4037', tw: 58, shoe: '#3e2723', deco: () => { for (let i = 0; i < 4; i++) ell(-20 + i * 13, -2 + (i % 2) * 14, 5, 5, '#ffee58'); } });
    ctx.beginPath(); ctx.ellipse(0, 14, 40, 15, 0, 0, 7); ctx.strokeStyle = '#ff80ab'; ctx.lineWidth = 11; ctx.stroke();
    rr(-26, -46, 44, 13, 6, '#111'); ell(-14, -42, 5, 2.5, 'rgba(255,255,255,.7)');
    ln(10, -34, 22, -70, '#26c6da', 4); ell(-2, -58, 40, 9, '#f2c94c', '#8d6e3a'); rr(-20, -80, 36, 24, 9, '#f2c94c', '#8d6e3a'); rr(-20, -64, 36, 6, 2, '#e53935'); }
};
function drawZombie(z, x, y) {
  const T = E[z.type], s = T.sc * .9;
  ctx.save(); ctx.translate(x, y);
  ell(0, 0, 26 * s, 7 * s, 'rgba(0,0,0,.25)');
  let f = '';
  if (z.flash > 0) f = 'brightness(2.2) ';
  if (z.freeze > 0) f += 'hue-rotate(150deg) saturate(1.5) brightness(1.2)'; else if (z.slow > 0) f += 'hue-rotate(110deg) brightness(1.1)';
  if (f) ctx.filter = f;
  let rot = 0;
  if (z.dying > 0) { const k = 1 - z.dying / .5; ctx.globalAlpha = 1 - k; rot = k * 1.4; }
  ctx.translate(0, -40 * s); ctx.scale(s, s); ctx.rotate(rot);
  ctx.translate(0, -Math.abs(Math.sin(z.ph)) * 3);
  ZOM[z.type](z);
  ctx.restore();
}

/* ---------- entities ---------- */
class Particle {
  constructor(x, y, o) { Object.assign(this, { x, y, vx: 0, vy: 0, g: 0, life: .6, max: .6, col: '#fff', size: 3, txt: null, ring: 0 }, o); this.max = this.life; }
  update(dt) { this.life -= dt; this.x += this.vx * dt; this.y += this.vy * dt; this.vy += this.g * dt; if (this.ring) this.size += this.ring * dt; }
  draw() {
    ctx.globalAlpha = clamp(this.life / this.max, 0, 1);
    if (this.txt) { ctx.font = 'bold ' + this.size + 'px sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#3a2410'; ctx.fillStyle = this.col; ctx.textAlign = 'center'; ctx.strokeText(this.txt, this.x, this.y); ctx.fillText(this.txt, this.x, this.y); ctx.textAlign = 'left'; }
    else if (this.ring) { ctx.strokeStyle = this.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, 7); ctx.stroke(); }
    else { ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
function burst(x, y, col, n = 8, sp = 120) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = rnd(sp * .3, sp); G.parts.push(new Particle(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, g: 200, col, size: rnd(2, 5), life: rnd(.3, .7) })); } }
function ftext(x, y, txt, col = '#fff', size = 16) { G.parts.push(new Particle(x, y, { txt, col, size, vy: -40, life: 1 })); }
function ring(x, y, col, max = 90) { G.parts.push(new Particle(x, y, { ring: max * 2.2, size: 5, col, life: .45 })); }

class Sun {
  constructor(x, y, val, sky, ty) { Object.assign(this, { x, y, val, sky, ty, life: sky ? 12 : 10, vy: sky ? 45 : -110, ph: Math.random() * 6, dead: false }); }
  update(dt) {
    this.life -= dt; this.ph += dt * 4;
    if (this.sky) { if (this.y < this.ty) this.y += this.vy * dt; }
    else { this.vy += 320 * dt; this.y += this.vy * dt; if (this.y > this.ty) { this.y = this.ty; this.vy = 0; } }
    if (this.life <= 0) this.dead = true;
  }
  draw() {
    const r = 17 + Math.sin(this.ph) * 2; ctx.save(); ctx.translate(this.x, this.y); if (this.life < 3 && Math.floor(this.life * 6) % 2) ctx.globalAlpha = .5;
    for (let i = 0; i < 10; i++) { const a = this.ph * .5 + i * .628; ln(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * (r + 8), Math.sin(a) * (r + 8), '#ffca28', 3); }
    const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, r); g.addColorStop(0, '#fff9c4'); g.addColorStop(1, '#ffb300'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#e65100'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e65100'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(this.val, 0, 4); ctx.restore();
  }
}

class Proj {
  constructor(x, y, r, type, dmg, src, big) { Object.assign(this, { x, y, x0: x, r, type, dmg, src, big, pierce: big, hit: new Set(), dead: false, trail: [], spin: 0, vx: type === 'coconut' ? 250 : type === 'surfer' ? 540 : 420 }); }
  update(dt) {
    this.x += this.vx * dt; this.spin += dt * 10; this.trail.push([this.x, this.y]); if (this.trail.length > 6) this.trail.shift();
    if (this.x > W + 30 || (this.type === 'glow' && this.x - this.x0 > 330)) { this.dead = true; return; }
    for (const e of G.enemies) {
      if (e.r !== this.r || e.dying > 0 || this.hit.has(e) || Math.abs(e.x - this.x) > 26 * E[e.type].sc) continue;
      this.hit.add(e); dmgEnemy(e, this.dmg, this.src); S.hit(); burst(this.x, this.y, this.type === 'ice' ? '#bfeaff' : '#e8b878', 5, 90);
      if (this.type === 'ice') { e.slow = 3.5; burst(e.x, this.y, '#e0f7ff', 6, 80); }
      if (this.type === 'coconut') { ring(this.x, this.y, '#fff3c4', 90); for (const o of G.enemies) if (o !== e && o.dying <= 0 && Math.abs(o.r - this.r) <= 1 && Math.abs(o.x - this.x) < 95) dmgEnemy(o, this.dmg * .6, this.src); }
      if (!this.pierce) { this.dead = true; break; }
    }
  }
  draw() {
    const col = this.type === 'glow' ? '#b388ff' : this.type === 'flame' ? '#ff7043' : this.type === 'ice' ? '#bfeaff' : this.type === 'coconut' ? '#6d4c41' : this.big ? '#ffb300' : '#e8b878';
    this.trail.forEach((p, i) => { ctx.globalAlpha = i / 12; ell(p[0], p[1], 5, 4, col); }); ctx.globalAlpha = 1;
    const s = this.big ? 2 : this.type === 'surfer' ? .6 : 1;
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.spin);
    if (this.type === 'ice') poly([[0, -9], [7, 0], [0, 9], [-7, 0]], '#d9f4ff', '#3a90c8');
    else { ell(0, 0, 8 * s, 7 * s, col, '#5a3a1a'); ell(-2 * s, -2 * s, 2 * s, 2 * s, 'rgba(255,255,255,.6)'); }
    ctx.restore();
  }
}

function dmgEnemy(e, d, src) {
  if (e.dying > 0) return;
  if (e.armor > 0) { e.armor -= d; if (e.armor <= 0) { e.hp += e.armor; e.armor = 0; burst(e.x, e.yy() - 60, '#ef5350', 10); ftext(e.x, e.yy() - 80, 'CLANG!', '#ffeb3b', 14); } }
  else e.hp -= d;
  e.flash = .1; e.hits++;
  if (e.hp <= 0) e.die(src);
}

class Enemy {
  constructor(type, r, wave) {
    const d = E[type], hs = type === 'boss' ? 1 + G.li * .08 : 1 + .05 * wave + .045 * G.li;
    Object.assign(this, { type, r, x: W + 40, hp: d.hp * hs, armor: (d.armor || 0) * hs, flash: 0, slow: 0, freeze: 0, ph: Math.random() * 6, t: 0, eating: false, dying: 0, used: false, bt: 5, hits: 0, boost: 0, jumped: false, heal: 0 });
    this.maxhp = this.hp; this.maxArmor = this.armor;
  }
  yy() { return Y0 + this.r * CH + CH - 12; }
  die(src) {
    this.dying = .5; G.kills++; onZombieDie(this); G.score += E[this.type].pts; S.die();
    burst(this.x, this.yy() - 40, '#9ccf7a', 14, 160); burst(this.x, this.yy() - 40, '#fff', 6, 100);
    ftext(this.x, this.yy() - 70, '+' + E[this.type].pts, '#ffeb3b');
    for (const p of G.potatoes) if (p.r === this.r) p.addMood(6, true);
    if (src) { src.addMood(4); src.cheer = .8; }
    if (this.type === 'boss') { G.shake = 1.2; G.score += 0; ring(this.x, this.yy() - 60, '#fff', 300); }
  }
  update(dt) {
    this.flash -= dt; this.slow -= dt; this.freeze -= dt;
    if (this.dying > 0) { this.dying -= dt; if (this.dying <= 0) this.gone = true; return; }
    const d = E[this.type]; let sp = d.sp * G.speedScale;
    if (this.slow > 0) sp *= .5; if (this.freeze > 0) sp = 0;
    if (this.type === 'surfer' && this.x < X0 + 3 * CW) sp *= 1.6;
    if (this.boost > 0) sp *= 1.4; this.boost -= dt; zombieAbilities(this, dt);
    let tgt = null;
    for (const p of G.potatoes) if (p.r === this.r && this.x - p.x < 42 * d.sc && this.x - p.x > -30) { tgt = p; break; }
    if (tgt && this.type === 'pogo' && !this.jumped) { this.jumped = true; this.x = tgt.x - 52; ftext(this.x, this.yy() - 90, 'BOING!', '#ffee58', 14); tgt = null; }
    this.eating = !!tgt && this.freeze <= 0;
    if (tgt && this.freeze <= 0) {
      this.t += dt; tgt.eaten = true; tgt.damage(d.dps * dt, false); if (tgt.type === 'tiki') dmgEnemy(this, 45 * dt, null);
      if (this.type === 'seagull' && !this.used) { this.used = true; tgt.dis = 5; ftext(tgt.x, tgt.y - 90, 'DISTRACTED!', '#ff8a80', 15); burst(tgt.x, tgt.y - 50, '#fff', 8); }
    } else { this.x -= sp * dt; this.ph += dt * Math.max(2, sp / 5); }
    if (this.type === 'boss') {
      this.bt -= dt;
      if (this.bt <= 0 && G.potatoes.length) {
        this.bt = 8; const v = pick(G.potatoes); v.dis = 5; G.shake = .8; S.boss(); ring(this.x, this.yy(), '#ff7043', 200);
        ftext(v.x, v.y - 90, 'BOSS BEACH SLAM!', '#ff8a80', 16);
      }
    }
    if (this.x < X0 - 10) { this.gone = true; G.hitResort(this); }
  }
  draw() {
    drawZombie(this, this.x, this.yy());
    if (this.dying > 0 || this.type === 'boss') return;
    const s = E[this.type].sc, w = 40, y = this.yy() - 95 * s * .9;
    rr(this.x - w / 2, y, w, 5, 2, '#444'); rr(this.x - w / 2, y, w * clamp(this.hp / this.maxhp, 0, 1), 5, 2, '#e53935');
    if (this.armor > 0) rr(this.x - w / 2, y - 6, w * this.armor / this.maxArmor, 4, 2, '#cfd8dc');
  }
}

class Potato {
  constructor(type, r, c) {
    Object.assign(this, { type, r, c, x: X0 + c * CW + CW / 2, y: Y0 + r * CH + CH - 12, hp: P[type].hp, max: P[type].hp, mood: 25, t: 0, ab: 8, fort: 0, dis: 0, flash: 0, fire: 0, cheer: 0, vm: false, ph: Math.random() * 6, dead: false, eaten: false, tier: 1 });
  }
  addMood(n, nearby) { this.mood = clamp(this.mood + n, 0, 100); }
  damage(d, flashy) { this.hp -= d * (this.fort > 0 ? .2 : 1); this.flash = Math.max(this.flash, .08); if (this.hp <= 0 && !this.dead) this.kill(); }
  kill() {
    this.dead = true; G.grid[this.r][this.c] = null; S.pdie(); burst(this.x, this.y - 40, '#e8b878', 16, 170); ring(this.x, this.y - 40, '#fff', 60);
    ftext(this.x, this.y - 60, 'Bye bye, spud!', '#ffccbc', 14);
    for (const p of G.potatoes) if (p !== this) p.addMood(-10);
  }
  update(dt) {
    const d = P[this.type]; this.ph += dt; this.flash -= dt; this.fire -= dt * 5; this.cheer -= dt; this.ab = Math.max(0, this.ab - dt); this.fort -= dt;
    this.mood = clamp(this.mood + ((this.mood < 55 ? 1.2 : -0.4) - (this.eaten ? 5 : 0) - (G.danger ? 3 : 0)) * dt, 0, 100); this.eaten = false;
    this.tier = tierOf(this.mood);
    if (this.tier === 3 && !this.vm) { this.vm = true; burst(this.x, this.y - 40, '#fff59d', 20, 200); ring(this.x, this.y - 40, '#ffeb3b', 70); ftext(this.x, this.y - 95, 'VACATION MODE!', '#ffeb3b', 15); S.collect(); G.score += 25; }
    if (this.mood < 85) this.vm = false;
    if (this.tier === 3 && Math.random() < dt * 4) burst(this.x, this.y - 50, '#fff59d', 1, 50);
    if (potatoSpecial(this, dt)) return;
    if (this.dis > 0) { this.dis -= dt; return; }
    const f = FIRE[this.tier];
    if (this.type === 'sun' || this.type === 'moon') { this.t += dt * f; if (this.t >= d.rate) { this.t = 0; this.cheer = .6; G.suns.push(new Sun(this.x + rnd(-18, 18), this.y - 60, 25, false, this.y - 8)); if (this.up) G.suns.push(new Sun(this.x + rnd(-18, 18), this.y - 60, 25, false, this.y - 8)); } }
    else if (d.dmg > 0 && !d.on) {
      if (G.enemies.some(e => e.r === this.r && e.dying <= 0 && e.x > this.x - 10 && e.x < Math.min(W + 10, this.x + (this.type === 'glow' ? 330 : 9999)))) { this.t += dt * f; if (this.t >= d.rate * (this.up === 'gatling' ? .4 : 1)) { this.t = 0; this.shoot(0, false); } }
      else this.t = Math.min(this.t, d.rate * .6);
    }
  }
  shoot(off, big) {
    const d = P[this.type]; G.proj.push(new Proj(this.x + 32 - off, this.y - 34, this.r, this.type, d.dmg * DMGM[this.tier] * (big ? 8 : 1), this, big));
    this.fire = 1; this.mood = clamp(this.mood + .5, 0, 100); S.shoot();
    if (G.perfBurst && !big) burst(this.x + 40, this.y - 34, '#fff', 1, 40);
  }
  useAbility() { return false;
    if (this.ab > 0 || this.dis > 0 || this.dead) return false;
    const d = P[this.type]; this.ab = d.abCd; this.cheer = .8; S.ability(); ring(this.x, this.y - 40, '#ffeb3b', 70);
    ftext(this.x, this.y - 95, ({ sun: 'SUN BURST!', cannon: 'SUPER SPUD!', coconut: 'COCO BARRAGE!', ice: 'FREEZE PARTY!', surfer: 'WIPEOUT!', bunker: 'BEACH FORT!' })[this.type], '#fff', 15);
    if (this.type === 'sun') for (let i = 0; i < 3; i++) G.suns.push(new Sun(this.x + rnd(-30, 30), this.y - 60, 25, false, this.y + rnd(-14, 0)));
    if (this.type === 'cannon') this.shoot(0, true);
    if (this.type === 'coconut') for (let i = 0; i < 3; i++) this.shoot(i * 40, false);
    if (this.type === 'surfer') for (let i = 0; i < 6; i++) this.shoot(i * 30, false);
    if (this.type === 'bunker') this.fort = 6;
    if (this.type === 'ice') for (const e of G.enemies) if (e.r === this.r && e.x < W) { e.freeze = 3; e.slow = 6; burst(e.x, e.yy() - 40, '#e0f7ff', 12, 120); }
    return true;
  }
  draw() {
    const x = this.x, y = this.y;
    drawPotato(this.type, x, y, this); if (this.up) drawCrown(x, y, this.ph);
    const w = 44;
    rr(x - w / 2, y - 108, w, 5, 2, '#444'); rr(x - w / 2, y - 108, w * clamp(this.hp / this.max, 0, 1), 5, 2, this.hp / this.max > .35 ? '#66bb6a' : '#ef5350');
    rr(x - w / 2, y - 101, w, 5, 2, '#444'); rr(x - w / 2, y - 101, w * this.mood / 100, 5, 2, ['#9e9e9e', '#4fc3f7', '#ffca28', '#ff4081'][this.tier]);
    if (false) {
      if (this.ab <= 0) { ctx.fillStyle = '#ffeb3b'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2; ctx.font = 'bold 14px sans-serif'; const bx = x + 28, by = y - 100 + Math.sin(this.ph * 6) * 2; ctx.beginPath(); ctx.arc(bx, by, 8, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d84315'; ctx.fillText('!', bx - 2.5, by + 5); }
      else { ctx.strokeStyle = '#81d4fa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 28, y - 100, 7, -1.57, -1.57 + 6.28 * (1 - this.ab / P[this.type].abCd)); ctx.stroke(); }
    }
  }
}

/* ---------- waves ---------- */
/* ---------- game ---------- */
let G = null, state = 'title', T = 0, mouse = { x: -99, y: -99 }, hover = null;
function newGame() {
  G = { score: 0, sun: 150, resort: 100, kills: 0, collected: 0, potatoes: [], enemies: [], proj: [], suns: [], parts: [], grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    sel: null, cd: {}, sky: 3, shake: 0, banner: null, danger: false, speedScale: 1.02, wm: new WaveManager(), resortFlash: 0, maxWave: 0 };
  Object.keys(P).forEach(k => G.cd[k] = 0);
  G.hitResort = function (e) {
    this.resort -= e.type === 'boss' ? 60 : 15; this.shake = .6; this.resortFlash = .5; S.pdie(); ring(X0, e.yy() - 40, '#ff5252', 100); ftext(X0 + 10, e.yy() - 70, 'RESORT HIT!', '#ff8a80', 18);
    for (const p of this.potatoes) p.addMood(-8);
    if (this.resort <= 0) { this.resort = 0; endGame(false); }
  };
}
function endGame(win) {
  state = win ? 'win' : 'over'; win ? S.win() : S.over();
  const el = $('end'); el.classList.remove('hidden');
  el.innerHTML = '<h1>' + (win ? 'VACATION SAVED!' : 'GAME OVER') + '</h1><div class="stats">' + (win ? 'The potatoes are sipping lemonade again!' : 'The zombies stormed the Potato Resort!') +
    '<br>FINAL SCORE: <b>' + G.score + '</b><br>' + (win ? 'HIGHEST WAVE' : 'WAVE REACHED') + ': <b>' + G.wm.wave + '</b><br>ENEMIES DEFEATED: <b>' + G.kills + '</b>' +
    (win ? '<br>SUN CHIPS COLLECTED: <b>' + G.collected + '</b>' : '') + '</div><button class="big" id="againBtn">PLAY AGAIN</button>';
  $('againBtn').onclick = () => { S.click(); startGame(); };
}
function startGame() { newGame(); state = 'play'; ['title', 'how', 'end'].forEach(i => $(i).classList.add('hidden')); updateCards(); }

function update(dt) {
  G.danger = G.enemies.some(e => e.x < X0 + 1.5 * CW && e.dying <= 0);
  G.wm.update(dt); if (state !== 'play') return;
  G.maxWave = G.wm.wave;
  G.sky -= dt; if (G.sky <= 0) { G.sky = rnd(6, 9); if (!isNight() && !G.conv) G.suns.push(new Sun(X0 + rnd(30, COLS * CW - 30), -20, 25, true, Y0 + rnd(40, ROWS * CH - 40))); }
  for (const k in G.cd) G.cd[k] = Math.max(0, G.cd[k] - dt);
  G.potatoes.forEach(p => p.update(dt)); G.enemies.forEach(e => e.update(dt)); G.proj.forEach(p => p.update(dt)); G.suns.forEach(s => s.update(dt)); G.coins.forEach(c => c.update(dt)); G.parts.forEach(p => p.update(dt));
  G.potatoes = G.potatoes.filter(p => !p.dead); G.enemies = G.enemies.filter(e => !e.gone); G.proj = G.proj.filter(p => !p.dead);
  G.suns = G.suns.filter(s => !s.dead); G.coins = G.coins.filter(c => !c.dead); G.rakes = G.rakes.filter(r => !r.used); G.parts = G.parts.filter(p => p.life > 0);
  G.shake = Math.max(0, G.shake - dt * 1.5); G.resortFlash -= dt; if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (state === 'play') updateHud();
}

/* ---------- rendering ---------- */
const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
function buildBg() {
  const c = bg.getContext('2d'), old = ctx; ctx = c;
  let g = c.createLinearGradient(0, 0, 0, Y0); g.addColorStop(0, '#5bc8f5'); g.addColorStop(1, '#bfeaff'); c.fillStyle = g; c.fillRect(0, 0, W, Y0);
  g = c.createLinearGradient(0, Y0, 0, H); g.addColorStop(0, '#f6dc9a'); g.addColorStop(1, '#e8c070'); c.fillStyle = g; c.fillRect(0, Y0, W, H - Y0);
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) { c.fillStyle = (r + q) % 2 ? 'rgba(255,255,255,.18)' : 'rgba(180,120,40,.12)'; c.fillRect(X0 + q * CW, Y0 + r * CH, CW, CH); }
  c.strokeStyle = 'rgba(140,90,30,.35)'; c.lineWidth = 2; for (let r = 0; r <= ROWS; r++) { c.beginPath(); c.moveTo(X0, Y0 + r * CH); c.lineTo(X0 + COLS * CW, Y0 + r * CH); c.stroke(); }
  for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(150,100,40,.25)'; c.fillRect(X0 + Math.random() * COLS * CW, Y0 + Math.random() * ROWS * CH, 2, 2); }
  // ocean strip on the right
  g = c.createLinearGradient(X0 + COLS * CW, 0, W, 0); g.addColorStop(0, '#fff'); g.addColorStop(.25, '#4fc3f7'); g.addColorStop(1, '#0288d1'); c.fillStyle = g; c.fillRect(X0 + COLS * CW, Y0 - 10, W - X0 - COLS * CW, H);
  // resort building
  c.fillStyle = '#ffab91'; c.fillRect(0, Y0, X0 - 8, H - Y0); c.fillStyle = '#ff7043'; c.fillRect(0, Y0, X0 - 8, 14);
  for (let r = 0; r < ROWS; r++) { rr(10, Y0 + 24 + r * CH, 50, 50, 8, '#81d4fa', '#5d4037'); ln(35, Y0 + 24 + r * CH, 35, Y0 + 74 + r * CH, '#5d4037', 3); ln(10, Y0 + 49 + r * CH, 60, Y0 + 49 + r * CH, '#5d4037', 3); rr(8, Y0 + 80 + r * CH, 54, 8, 3, '#e53935'); }
  c.strokeStyle = '#5d4037'; c.lineWidth = 4; c.strokeRect(0, Y0, X0 - 8, H - Y0);
  // top decor: palms, umbrella, beach ball, towel, shells
  [140, 520, 760].forEach((x, i) => { ln(x, Y0 + 6, x + (i % 2 ? 8 : -8), 12, '#8d6e3a', 7); for (let k = 0; k < 5; k++) { c.save(); c.translate(x + (i % 2 ? 8 : -8), 14); c.rotate(-1.2 + k * .6); ell(18, 0, 22, 6, '#2e9e4a', '#1b5e20'); c.restore(); } });
  ln(300, Y0, 300, 20, '#6d4c41', 3); c.beginPath(); c.arc(300, 22, 26, Math.PI, 0); c.fillStyle = '#ef5350'; c.fill(); c.beginPath(); c.arc(300, 22, 26, Math.PI * 1.34, Math.PI * 1.67); c.lineTo(300, 22); c.fillStyle = '#fff'; c.fill();
  ell(420, Y0 - 12, 11, 11, '#fff', '#333'); c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(420, Y0 - 12); c.arc(420, Y0 - 12, 11, 0, 1.2); c.fill(); c.fillStyle = '#1e88e5'; c.beginPath(); c.moveTo(420, Y0 - 12); c.arc(420, Y0 - 12, 11, 2.2, 3.4); c.fill();
  rr(620, Y0 - 16, 40, 12, 3, '#ab47bc'); [0, 1, 2, 3].forEach(i => ln(626 + i * 9, Y0 - 16, 626 + i * 9, Y0 - 4, '#fff', 2));
  ell(850, Y0 - 8, 7, 5, '#ffccbc', '#bf7a60'); ell(200, Y0 - 6, 6, 4, '#f8bbd0', '#c2185b');
  ctx = old;
}
function drawClouds() { [[0, 14], [350, 26], [650, 10]].forEach((c, i) => { const x = ((c[0] + T * (6 + i * 3)) % (W + 160)) - 80; ell(x, c[1], 30, 10, 'rgba(255,255,255,.9)'); ell(x + 18, c[1] - 6, 18, 9, 'rgba(255,255,255,.9)'); }); ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(870, 22, 16, 0, 7); ctx.fill(); }
function drawWater() { for (let r = 0; r < ROWS * 3; r++) { const y = Y0 + 10 + r * 32; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X0 + COLS * CW + 12 + Math.sin(T * 2 + r) * 3, y, 8, 1.6, 4.7); ctx.stroke(); } }

function render() {
  ctx.save();
  if (G && G.shake > 0) ctx.translate(rnd(-1, 1) * G.shake * 8, rnd(-1, 1) * G.shake * 8);
  ctx.drawImage(bg, 0, 0); drawClouds(); drawWater();
  if (!G) { ctx.restore(); return; }
  if (G.resortFlash > 0) { ctx.fillStyle = 'rgba(255,0,0,' + G.resortFlash * .5 + ')'; ctx.fillRect(0, Y0, X0 - 8, H - Y0); }
  if (hover && G.sel && G.sel !== 'rake' && G.sel !== 'shovel' && !P[G.sel].on && !G.grid[hover.r][hover.c]) { ctx.fillStyle = G.sun >= P[G.sel].cost ? 'rgba(255,255,255,.4)' : 'rgba(255,0,0,.3)'; ctx.fillRect(X0 + hover.c * CW, Y0 + hover.r * CH, CW, CH); ctx.globalAlpha = .5; drawPotato(G.sel, X0 + hover.c * CW + CW / 2, Y0 + hover.r * CH + CH - 12, { ph: T, tier: 1, fire: 0, flash: 0, dis: 0, fort: 0, cheer: 0, t: 0 }); ctx.globalAlpha = 1; }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 3; ctx.font = 'bold 12px sans-serif';
  rr(8, H - 14, X0 - 24, 8, 4, '#444'); rr(8, H - 14, (X0 - 24) * G.resort / 100, 8, 4, G.resort > 35 ? '#66bb6a' : '#ef5350');
  for (let r = 0; r < ROWS; r++) {
    G.potatoes.filter(p => p.r === r).forEach(p => p.draw());
    G.enemies.filter(e => e.r === r).sort((a, b) => b.x - a.x).forEach(e => e.draw());
  }
  G.proj.forEach(p => p.draw()); G.parts.forEach(p => p.draw()); G.suns.forEach(s => s.draw()); G.rakes.forEach(drawRake); G.coins.forEach(c => c.draw());
  const boss = G.enemies.find(e => e.type === 'boss' && e.dying <= 0);
  if (boss) { rr(250, 66, 400, 18, 9, '#222', '#fff'); rr(252, 68, 396 * clamp(boss.hp / boss.maxhp, 0, 1), 14, 7, '#e53935'); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GIANT VACATION ZOMBIE', 450, 79); ctx.textAlign = 'left'; }
  if (G.banner) { const k = Math.min(1, (2.6 - G.banner.t) * 4), s = .6 + .4 * k; ctx.save(); ctx.translate(W / 2, 270); ctx.scale(s, s); ctx.globalAlpha = Math.min(1, G.banner.t * 2); ctx.font = 'bold 54px "Trebuchet MS",sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = '#d84315'; ctx.strokeText(G.banner.text, 0, 0); ctx.fillStyle = '#fff'; ctx.fillText(G.banner.text, 0, 0); ctx.restore(); }
  if (!G.wm.active && state === 'play' && G.wm.wave < G.lv.waves) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#3a2410'; const t = 'Next wave in ' + Math.ceil(G.wm.rest) + 's — build your defenses!'; ctx.strokeText(t, W / 2, H - 14); ctx.fillStyle = '#fff'; ctx.fillText(t, W / 2, H - 14); ctx.textAlign = 'left'; }
  ctx.restore();
}

/* ---------- HUD & cards ---------- */
function buildCards() {
  const box = $('cards'); box.innerHTML = '';
  Object.keys(P).forEach(k => {
    const d = P[k], el = document.createElement('div'); el.className = 'card'; el.id = 'card-' + k; el.title = d.name + ' (' + d.cost + ' chips): ' + d.desc;
    const c = document.createElement('canvas'); c.width = 64; c.height = 72; el.appendChild(c);
    el.insertAdjacentHTML('beforeend', '<span class="k">' + d.key + '</span><b>' + d.name + '</b><span class="cost">' + d.cost + '</span><small>' + d.desc.split('.')[0] + '</small><div class="cd"></div>');
    el.onclick = () => selectCard(k); box.appendChild(el);
    const old = ctx; ctx = c.getContext('2d'); ctx.translate(32, 68); ctx.scale(.62, .62); drawPotato(k, 0, 0, { ph: 1, tier: 2, fire: 0, flash: 0, dis: 0, fort: 0, cheer: 0, t: 0 }); ctx = old;
  });
}
function selectCard(k) { if (state !== 'play') return; S.click(); G.sel = G.sel === k ? null : k; updateCards(); }
function updateCards() {
  Object.keys(P).forEach(k => {
    const el = $('card-' + k); if (!el || !G) return;
    el.classList.toggle('sel', G.sel === k); el.classList.toggle('poor', G.sun < P[k].cost);
    el.querySelector('.cd').style.height = (G.cd[k] / P[k].cd * 100) + '%';
  });
}
function updateHud() {
  $('sScore').textContent = G.score; $('sSun').textContent = G.sun; $('sWave').textContent = Math.max(1, G.wm.wave);
  $('sHp').style.width = G.resort + '%'; $('sEnemies').textContent = G.wm.active ? G.wm.remaining() : 0;
  $('sProg').style.width = (G.wm.active ? (1 - G.wm.remaining() / G.wm.total) * 100 : 100) + '%'; updateCards();
}

/* ---------- input ---------- */
function canvasPos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
function cellAt(m) { const c = Math.floor((m.x - X0) / CW), r = Math.floor((m.y - Y0) / CH); return (c >= 0 && c < COLS && r >= 0 && r < ROWS) ? { r, c } : null; }
cv.addEventListener('mousemove', e => { mouse = canvasPos(e); hover = cellAt(mouse); });
cv.addEventListener('mouseleave', () => hover = null);
cv.addEventListener('contextmenu', e => { e.preventDefault(); if (G) { G.sel = null; updateCards(); } });
cv.addEventListener('mousedown', e => {
  if (state !== 'play') return; const m = canvasPos(e);
  for (const c of G.coins) if (!c.dead && Math.hypot(c.x - m.x, c.y - m.y) < 28) { collectCoin(c); return; }
  for (const s of G.suns) if (Math.hypot(s.x - m.x, s.y - m.y) < 30) { // collect resource
    s.dead = true; G.sun += s.val; G.collected += s.val; G.score += 5; S.collect(); burst(s.x, s.y, '#fff59d', 10, 140); ftext(s.x, s.y - 20, '+' + s.val, '#ffeb3b');
    for (const p of G.potatoes) if (Math.hypot(p.x - s.x, p.y - s.y) < 140) p.addMood(2); return;
  }
  const cell = cellAt(m); if (!cell) return; const here = G.grid[cell.r][cell.c];
  if (G.sel && placeSpecial(G.sel, cell, here, m)) return;
  if (G.sel) {
    const d = P[G.sel];
    if (here) { ftext(m.x, m.y, 'Occupied!', '#ffccbc', 14); return; }
    if (G.sun < d.cost) { ftext(m.x, m.y, 'Need more Sun Chips!', '#ffccbc', 14); return; }
    if (G.cd[G.sel] > 0) { ftext(m.x, m.y, 'Recharging...', '#ffccbc', 14); return; }
    const p = new Potato(G.sel, cell.r, cell.c); G.grid[cell.r][cell.c] = p; G.potatoes.push(p); G.sun -= d.cost; G.cd[G.sel] = d.cd; S.place();
    burst(p.x, p.y, '#e8c070', 10, 100); G.sel = null; updateCards();
  } else if (here && here.dis > 0) { ftext(here.x, here.y - 100, 'Disabled!', '#ffccbc', 12); }
});
document.addEventListener('keydown', e => {
  if (state !== 'play') return;
  if (e.key >= '1' && e.key <= '8' && G.deck[+e.key - 1]) selectCard(G.deck[+e.key - 1]);
  else if (e.key === 's' || e.key === 'S') selectCard('shovel');
  else if (e.key === 'Escape') { G.sel = null; updateCards(); }
  else if (e.code === 'Space') { e.preventDefault(); if (hover) { const p = G.grid[hover.r][hover.c]; if (p) p.useAbility(); } }
});
$('playBtn').onclick = () => { S.click(); startGame(); };
$('howBtn').onclick = () => { S.click(); $('how').classList.remove('hidden'); };
$('backBtn').onclick = () => { S.click(); $('how').classList.add('hidden'); };
$('muteBtn').onclick = () => { muted = !muted; $('muteBtn').textContent = muted ? 'Sound OFF' : 'Sound ON'; if (!muted) S.click(); };

/* ---------- main loop ---------- */
let last = 0;
function loop(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; T += dt;
  if (G && state === 'play') { if (!paused) for (let i = 0; i < gameSpeed && state === 'play'; i++) update(dt); } else if (G) { G.parts.forEach(p => p.update(dt)); }
  render(); postFx(); drawTitleIfVisible(); requestAnimationFrame(loop);
}
/* init is at the end of the file (v2) */

/* ================= V2: LEVELS, WORLDS, COINS, SHOP, DECK PICKER ================= */
/* Later function declarations intentionally replace the v1 versions of the same name. */

/* ---------- save data (localStorage, fails safely) ---------- */
let save = loadSave();
function loadSave() {
  const d = { coins: 0, unlocked: ['sun', 'cannon'], cleared: 0, rakes: 0, sunLvl: 0, fort: false, owned: [], deck: [] };
  try { return Object.assign(d, JSON.parse(localStorage.getItem('pp_save2') || '{}')); } catch (e) { return d; }
}
function persist() { try { localStorage.setItem('pp_save2', JSON.stringify(save)); } catch (e) { /* ignore */ } }

/* ---------- new data: potatoes, upgrade cards, zombies ---------- */
Object.assign(P, {
  pepper:     { name: 'Pepper Spud',  cost: 125, hp: 60,  cd: 25, rate: 0, dmg: 0, abCd: 0, desc: 'BOOM! Explodes 3x3 shortly after planting' },
  tiki:       { name: 'Tiki Spud',    cost: 100, hp: 550, cd: 9,  rate: 0, dmg: 0, abCd: 0, desc: 'Tough wall that hurts zombies biting it' },
  volcano:    { name: 'Volcano Spud', cost: 250, hp: 100, cd: 35, rate: 0, dmg: 0, abCd: 0, desc: 'Erupts a huge lava blast down the lane, then leaves' },
  twinsun:    { name: 'Twin Sun',     cost: 150, hp: 220, cd: 12, on: 'sun',    desc: 'UPGRADE: plant on a SunSpud for double chips' },
  gatling:    { name: 'Gatling Spud', cost: 250, hp: 260, cd: 15, on: 'cannon', desc: 'UPGRADE: plant on a Cannon Spud for rapid fire' },
  megabunker: { name: 'Mega Bunker',  cost: 200, hp: 2100, cd: 20, on: 'bunker', desc: 'UPGRADE: plant on a Bunker Spud for triple HP' },
  shovel:     { name: 'Shovel', cost: 0, hp: 1, cd: 0, desc: 'Dig up a potato you no longer want' },
  rake:       { name: 'Rake', cost: 0, hp: 1, cd: 0, desc: 'Kills the first zombie that walks over it' }
});
Object.assign(E, {
  dj:    { hp: 140, sp: 18, pts: 130, sc: 1,   dps: 20, name: 'DJ Zombie' },
  pogo:  { hp: 110, sp: 26, pts: 110, sc: 1,   dps: 20, name: 'Pogo Zombie' },
  medic: { hp: 160, sp: 19, pts: 140, sc: 1,   dps: 18, name: 'Medic Zombie' },
  lava:  { hp: 260, sp: 17, pts: 160, sc: 1.05, dps: 30, name: 'Lava Zombie' }
});
const ZDESC = { beach: 'Basic zombie.', surfer: 'Fast, and speeds up near the resort.', bucket: 'Bucket armor soaks damage first.', lifeguard: 'Slow and tanky.', seagull: 'Disables a potato for 5s.',
  dj: 'Boombox speeds up zombies nearby!', pogo: 'Hops over your first potato.', tourist: 'Very slow, huge HP.', medic: 'Heals nearby zombies.', lava: 'Explodes when defeated, burning potatoes!', boss: 'BOSS! Slams to disable potatoes.' };

/* ---------- new art ---------- */
POT.pepper = o => { FEET(8, '#c62828'); ln(-22, 4, -32, -6, '#d84315', 5); ln(22, 4, 32, -6, '#d84315', 5); blob(46, 66, '#ff6b4a', '#b71c1c');
  rr(-5, -42, 10, 10, 3, '#43a047', '#1b5e20'); brow(-9, -12, -.5); brow(9, -12, .5); eyes(9, -5, o, 5); mouth(12, 0, o.hurt);
  if (o.fuse > 0) { ell(0, -54, 9 + Math.sin(o.ph * 40) * 3, 13, '#ffeb3b', '#ff6d00'); ell(0, -50, 14 * o.fuse, 14 * o.fuse, 'rgba(255,100,0,.25)'); } };
POT.tiki = o => { FEET(14, '#7a4a24'); blob(62, 78, '#c28a52', '#7a4a24');
  [-22, -11, 0, 11, 22].forEach((x, i) => poly([[x - 5, -34], [x, -58 + (i % 2) * 7], [x + 5, -34]], ['#e53935', '#ffb300', '#43a047', '#1e88e5', '#e53935'][i], '#333'));
  rr(-19, -20, 13, 11, 2, '#2b1a0d'); rr(6, -20, 13, 11, 2, '#2b1a0d'); ell(-12, -14, 3, 3, '#ffeb3b'); ell(12, -14, 3, 3, '#ffeb3b');
  rr(-17, 6, 34, 15, 3, '#2b1a0d'); ctx.fillStyle = '#fff'; [-12, -4, 4, 12].forEach(x => ctx.fillRect(x - 2, 6, 4, 6));
  poly([[-31, 0], [-42, -4], [-31, 8]], '#8d6e3a', '#3e2723'); poly([[31, 0], [42, -4], [31, 8]], '#8d6e3a', '#3e2723'); };
POT.volcano = o => { poly([[-36, 38], [-15, -20], [15, -20], [36, 38]], '#6d4c41', '#3e2723'); ell(0, -20, 15, 6, '#ff7043', '#ffeb3b');
  ln(-6, -20, -10, 0, '#ff7043', 4); ln(8, -20, 12, -2, '#ff7043', 4); eyes(8, 8, o, 5); mouth(22, 1, o.hurt);
  const k = (o.ph * 10) % 20; ell(-4 + Math.sin(o.ph * 3) * 3, -32 - k, 6 + k * .2, 5 + k * .2, 'rgba(160,160,160,' + (1 - k / 20) + ')');
  if (o.fuse > .5) for (let i = 0; i < 8; i++) ell(rnd(-14, 14), -20 - rnd(0, 50), rnd(3, 8), rnd(5, 12), pick(['#ff7043', '#ffeb3b', '#ff5722'])); };
function baseOf(k) { return P[k].on || k; }
function drawCrown(x, y, ph) { ell(x, y, 38, 10, null, 'rgba(255,215,0,.85)', 3); ctx.save(); ctx.translate(x, y - 92 + Math.sin(ph * 4) * 2); poly([[-12, 8], [-14, -6], [-6, 0], [0, -9], [6, 0], [14, -6], [12, 8]], '#ffd54f', '#b8860b'); ctx.restore(); }
const ZR = f => ZOM[f];
ZOM.dj = z => { zb(z, { skin: '#b39ddb', shirt: '#7e57c2', pants: '#311b92', tw: 40, back: () => rr(8, -14, 28, 24, 4, '#212121', '#000'), deco: () => { ell(22, -2, 6, 6, '#ff4081'); ell(22, -2, 3, 3, '#fff'); } });
  ctx.beginPath(); ctx.arc(-2, -40, 21, Math.PI * 1.05, Math.PI * 1.95); ctx.strokeStyle = '#212121'; ctx.lineWidth = 4; ctx.stroke(); ell(-22, -38, 6, 8, '#ff4081', '#880e4f'); ell(18, -38, 6, 8, '#ff4081', '#880e4f'); };
ZOM.pogo = z => { ctx.save(); ctx.translate(0, -Math.abs(Math.sin(z.ph * 1.5)) * 14);
  ln(-2, 30, -2, 54, '#9e9e9e', 4); for (let i = 0; i < 4; i++) ln(-8, 32 + i * 6, 4, 35 + i * 6, '#e53935', 3);
  zb(z, { skin: '#ffe082', shirt: '#ff7043', pants: '#6a1b9a', tw: 36 }); rr(-18, -58, 30, 12, 6, '#00bcd4', '#006064'); ctx.restore(); };
ZOM.medic = z => { zb(z, { skin: '#a5d6a7', shirt: '#fafafa', pants: '#90caf9', tw: 42, deco: () => { rr(-3, -10, 6, 20, 1, '#e53935'); rr(-10, -3, 20, 6, 1, '#e53935'); } });
  rr(-18, -60, 32, 12, 5, '#fff', '#90a4ae'); rr(-3, -59, 4, 9, 1, '#e53935'); ctx.beginPath(); ctx.arc(-2, -14, 12, 0, Math.PI); ctx.strokeStyle = '#37474f'; ctx.lineWidth = 3; ctx.stroke(); };
ZOM.lava = z => { zb(z, { skin: '#ff8a50', shirt: '#bf360c', pants: '#3e2723', tw: 44, deco: () => { ln(-10, -12, 0, 2, '#ffeb3b', 3); ln(0, 2, 12, -6, '#ffeb3b', 3); } });
  const f = Math.sin(z.ph * 3) * 3; poly([[-14, -50], [-10, -66 + f], [-4, -54], [0, -72 - f], [6, -54], [12, -64 + f], [14, -50]], '#ff9800', '#e65100'); poly([[-6, -50], [0, -62], [6, -50]], '#ffee58'); };

/* ---------- NEW UNITS: data + art ---------- */
Object.assign(P, {
  sprout:   { name: 'Sprout Spud',   cost: 25,  hp: 70,  cd: 5,  rate: 9,   dmg: 0,  abCd: 0, desc: 'Cheap helper that makes small Sun Chips' },
  mine:     { name: 'Mine Spud',     cost: 25,  hp: 40,  cd: 18, rate: 0,   dmg: 0,  abCd: 0, desc: 'Arms in 6s then blasts zombies that step close' },
  lifebuoy: { name: 'Lifebuoy Spud', cost: 100, hp: 130, cd: 8,  rate: 4,   dmg: 0,  abCd: 0, desc: 'Heals the potatoes around it' },
  squash:   { name: 'Slam Spud',     cost: 50,  hp: 90,  cd: 14, rate: 0,   dmg: 0,  abCd: 0, desc: 'Leaps onto the nearest zombie and flattens it' },
  triple:   { name: 'Triple Spud',   cost: 175, hp: 110, cd: 7,  rate: 1.6, dmg: 14, abCd: 0, desc: 'Shoots down three lanes at once' },
  magnet:   { name: 'Magnet Spud',   cost: 75,  hp: 100, cd: 10, rate: 5,   dmg: 0,  abCd: 0, desc: 'Rips armor off zombies in its lane' },
  wave:     { name: 'Wave Spud',     cost: 150, hp: 100, cd: 20, rate: 10,  dmg: 0,  abCd: 0, desc: 'Washes zombies back down its lane' },
  party:    { name: 'Party Spud',    cost: 75,  hp: 100, cd: 8,  rate: 0,   dmg: 0,  abCd: 0, desc: 'Its dancing cheers up nearby potatoes' }
});
POT.sprout = o => { FEET(9, '#c9a060'); blob(40, 46, '#efd49a', '#c9a060'); const s = Math.sin(o.ph * 3) * 3;
  ln(0, -24, 0, -36, '#43a047', 4); poly([[0, -36], [16 + s, -47], [19 + s, -34]], '#66bb6a', '#2e7d32'); poly([[0, -36], [-16 - s, -47], [-19 - s, -34]], '#66bb6a', '#2e7d32');
  eyes(8, -4, o, 4.5); mouth(10, o.tier, o.hurt); };
POT.mine = o => { const armed = !(o.arm > 0);
  blob(40, 34, '#d8b27a', '#a67c3d'); ln(0, -14, 0, -26, '#607d8b', 3); ell(0, -29, 5, 5, armed && Math.sin(o.ph * 8) > 0 ? '#ff1744' : '#555', '#263238');
  eyes(8, -3, o, 4.5); ell(0, 20, 40, 11, '#c9a66b', '#7a5a2c'); [[-22, 18], [-6, 22], [14, 19], [26, 22]].forEach(p => ell(p[0], p[1], 3, 2, '#a5844a')); };
POT.lifebuoy = o => { FEET(12, '#d9a85c'); blob(54, 62, '#f4d08c', '#cf9a4a');
  ctx.beginPath(); ctx.ellipse(0, 18, 33, 12, 0, 0, 7); ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 10; ctx.stroke();
  [0, 1.57, 3.14, 4.71].forEach(a => { ctx.beginPath(); ctx.ellipse(0, 18, 33, 12, 0, a - .3, a + .3); ctx.strokeStyle = '#fff'; ctx.stroke(); });
  eyes(10, -8, o, 5.5); mouth(2, o.tier, o.hurt); rr(-18, -36, 36, 9, 4, '#fff', '#90a4ae'); rr(-3, -35, 6, 7, 1, '#e53935'); rr(-6, -33, 12, 3, 1, '#e53935'); };
POT.squash = o => { FEET(14, '#c08a4a'); ln(-30, -2, -42, -22, '#c08a4a', 7); ln(30, -2, 42, -22, '#c08a4a', 7); ell(-42, -24, 7, 7, '#c08a4a', '#5a3a1a'); ell(42, -24, 7, 7, '#c08a4a', '#5a3a1a');
  blob(68, 56, '#e6b878', '#b9803c'); ell(-26, 6, 6, 4, 'rgba(239,83,80,.5)'); ell(26, 6, 6, 4, 'rgba(239,83,80,.5)');
  brow(-13, -17, -.5); brow(13, -17, .5); eyes(13, -6, o, 5); mouth(14, 0, o.hurt); };
POT.triple = o => { FEET(14, '#c08040'); blob(66, 56, '#e9b878', '#bd8240');
  [-.5, 0, .5].forEach(a => { ctx.save(); ctx.translate(22, 0); ctx.rotate(a); rr(0, -6, 36, 12, 5, '#455a64', '#263238'); ell(36, 0, 4, 7, '#263238'); if (o.fire > .1) ell(42, 0, 3 + o.fire * 5, 3 + o.fire * 4, 'rgba(255,214,102,' + clamp(o.fire, 0, 1) + ')'); ctx.restore(); });
  eyes(9, -8, o, 5); mouth(10, o.tier, o.hurt); rr(-34, -24, 68, 7, 3, '#1e88e5', '#0d47a1'); };
POT.magnet = o => { FEET(12, '#b9a07a'); blob(54, 60, '#e4cfa4', '#b59a68');
  ctx.beginPath(); ctx.arc(0, -30, 18, Math.PI, 0); ctx.strokeStyle = '#e53935'; ctx.lineWidth = 9; ctx.stroke(); rr(-23, -32, 9, 10, 1, '#cfd8dc', '#607d8b'); rr(14, -32, 9, 10, 1, '#cfd8dc', '#607d8b');
  eyes(10, -6, o, 5.5); mouth(12, o.tier, o.hurt);
  if (o.cheer > 0) { ln(-28, -50, -20, -42, '#ffee58', 3); ln(-20, -42, -26, -38, '#ffee58', 3); ln(28, -50, 20, -42, '#ffee58', 3); ln(20, -42, 26, -38, '#ffee58', 3); } };
POT.wave = o => { FEET(12, '#9fd0ee'); blob(56, 62, '#c7ecff', '#57b6e8');
  ctx.beginPath(); ctx.moveTo(-28, -16); ctx.bezierCurveTo(-30, -52, 8, -62, 24, -40); ctx.bezierCurveTo(12, -44, 8, -34, 14, -26); ctx.quadraticCurveTo(-8, -14, -28, -16); ctx.fillStyle = '#0288d1'; ctx.fill(); ctx.strokeStyle = '#01579b'; ctx.lineWidth = 2.5; ctx.stroke();
  ell(18, -42, 5, 5, '#fff'); ell(10, -48, 4, 4, '#fff'); eyes(10, -4, o, 5.5); mouth(12, o.tier, o.hurt);
  for (let i = 0; i < 3; i++) { const k = (o.ph * .8 + i / 3) % 1; ctx.globalAlpha = 1 - k; ell(-30 - k * 12, 6 + k * 18, 3, 4, '#81d4fa'); ctx.globalAlpha = 1; } };
POT.party = o => { FEET(12, '#d9a0c8'); const w = Math.sin(o.ph * 5) * 5;
  ln(-26, 2, -40, -12 + w, '#e0a0cc', 6); ln(26, 2, 40, -12 - w, '#e0a0cc', 6); blob(56, 62, '#ffd1f0', '#e083c0');
  rr(-23, -12, 19, 12, 5, '#1a1a1a'); rr(4, -12, 19, 12, 5, '#1a1a1a'); ln(-5, -8, 5, -8, '#1a1a1a', 3); mouth(14, 3, o.hurt);
  poly([[-14, -30], [0, -60], [14, -30]], '#7c4dff', '#311b92'); ell(0, -61, 5, 5, '#ffeb3b');
  for (let i = 0; i < 4; i++) { const a = o.ph * 3 + i * 1.57; ell(Math.cos(a) * 46, Math.sin(a) * 22 - 10, 4, 4, ['#ff4081', '#ffeb3b', '#40c4ff', '#69f0ae'][i]); } };

/* ---------- MORE UNITS + ZOMBIES: data + art ---------- */
Object.assign(P, {
  sloth:    { name: 'Sloth Spud',    cost: 125, hp: 420, cd: 12, rate: 0,   dmg: 0,  abCd: 0, desc: 'Lazy aura slows every zombie near it' },
  flame:    { name: 'Flame Spud',    cost: 150, hp: 100, cd: 7,  rate: 1.5, dmg: 10, abCd: 0, desc: 'Fire shots that keep burning zombies' },
  crab:     { name: 'Crab Spud',     cost: 150, hp: 140, cd: 12, rate: 0,   dmg: 0,  abCd: 0, desc: 'Snaps up a zombie whole then chews for a while' },
  firework: { name: 'Firework Spud', cost: 200, hp: 50,  cd: 40, rate: 0,   dmg: 0,  abCd: 0, desc: 'BOOM! Hits every zombie on the lawn' },
  umbrella: { name: 'Umbrella Spud', cost: 100, hp: 150, cd: 9,  rate: 0,   dmg: 0,  abCd: 0, desc: 'Shades neighbors so they take less damage' }
});
Object.assign(E, {
  imp:     { hp: 55,   sp: 36, pts: 70,  sc: .72, dps: 12, name: 'Imp Zombie' },
  pirate:  { hp: 240,  sp: 17, pts: 170, sc: 1.05, dps: 24, name: 'Pirate Zombie' },
  sumo:    { hp: 1500, sp: 9,  pts: 300, sc: 1.35, dps: 46, name: 'Sumo Zombie' },
  balloon: { hp: 160,  sp: 21, pts: 140, sc: 1,   dps: 18, name: 'Balloon Zombie' }
});
Object.assign(ZDESC, { imp: 'Tiny and fast. Comes in swarms.', pirate: 'Fires cannonballs at your potatoes from range.', sumo: 'Massive HP and a crushing bite.', balloon: 'Floats over potatoes until it takes enough damage.' });
POT.sloth = o => { const sw = Math.sin(o.ph * 1.5) * 2;
  ln(-46, -34, 46, -34, '#6d4c41', 6); ln(-30, -2, -42 - sw, -30, '#8a6a45', 8); ln(30, -2, 42 + sw, -30, '#8a6a45', 8);
  [-42 - sw, 42 + sw].forEach(x => { ln(x - 4, -34, x - 4, -27, '#3a2410', 2.5); ln(x, -34, x, -26, '#3a2410', 2.5); ln(x + 4, -34, x + 4, -27, '#3a2410', 2.5); });
  FEET(14, '#8a6a45'); blob(66, 66, '#b8926a', '#8a6a45'); ell(0, -6, 25, 20, '#ead7bb', '#8a6a45', 1.5); ell(-11, -8, 8, 6, '#5a3f2a'); ell(11, -8, 8, 6, '#5a3f2a');
  if (o.blink || o.tier < 2) { ln(-15, -8, -7, -7, '#fff', 2.5); ln(7, -7, 15, -8, '#fff', 2.5); } else { ell(-11, -8, 3, 3, '#fff'); ell(11, -8, 3, 3, '#fff'); }
  ell(0, 3, 5, 3.5, '#3a2410'); ctx.beginPath(); ctx.arc(0, 7, 6, .2, Math.PI - .2); ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('z', 26 + Math.sin(o.ph * 2) * 3, -36 - ((o.ph * 10) % 14)); };
POT.flame = o => { FEET(14, '#c4622a'); blob(56, 62, '#f5a35c', '#c4622a'); const f = Math.sin(o.ph * 9) * 3;
  poly([[-16, -26], [-20, -46 + f], [-8, -34], [-3, -58 - f], [4, -34], [14, -50 + f], [18, -26]], '#ff7043', '#bf360c'); poly([[-8, -28], [-3, -44], [3, -28]], '#ffee58');
  rr(18, -4, 26, 13, 5, '#8d6e63', '#3e2723'); if (o.fire > .1) ell(48, 2, 6 + o.fire * 8, 4 + o.fire * 5, 'rgba(255,152,0,' + clamp(o.fire, 0, 1) + ')');
  brow(-9, -14, -.4); brow(9, -14, .4); eyes(9, -4, o, 5); mouth(14, o.tier, o.hurt); };
POT.crab = o => { const chew = o.chew > 0, open = chew ? 0 : .5 + Math.sin(o.ph * 3) * .1;
  ln(-12, -26, -14, -42, '#c0392b', 3); ln(12, -26, 14, -42, '#c0392b', 3); ell(-14, -45, 6, 6, '#fff', '#3a2410'); ell(14, -45, 6, 6, '#fff', '#3a2410'); ell(-13, -44, 2.5, 2.5, '#111'); ell(15, -44, 2.5, 2.5, '#111');
  [-1, 1].forEach(sx => { ln(sx * 22, 24, sx * 38, 30, '#c0392b', 4); ln(sx * 14, 28, sx * 28, 38, '#c0392b', 4); });
  blob(62, 54, '#f26b5b', '#b03a2e');
  [-1, 1].forEach(sx => { ctx.save(); ctx.translate(sx * 34, -2); ctx.scale(sx, 1); ln(0, 0, 8, -10, '#c0392b', 5);
    ctx.save(); ctx.translate(8, -10); ctx.rotate(-open); poly([[0, 0], [22, -4], [18, 6], [2, 8]], '#e74c3c', '#7b241c'); ctx.restore();
    ctx.save(); ctx.translate(8, -10); ctx.rotate(open); poly([[0, 0], [22, 4], [16, 12], [2, 8]], '#e74c3c', '#7b241c'); ctx.restore(); ctx.restore(); });
  mouth(10, chew ? 2 : o.tier, o.hurt); if (chew) ell(0, 12 + Math.abs(Math.sin(o.ph * 8)) * 3, 6, 3, '#7b241c'); };
POT.firework = o => { const lit = o.fw > 0;
  poly([[-26, 18], [-38, 38], [-14, 30]], '#e53935', '#8e1b1b'); poly([[26, 18], [38, 38], [14, 30]], '#e53935', '#8e1b1b'); blob(46, 70, '#f6dc9a', '#d1a24d');
  poly([[-20, -26], [0, -62], [20, -26]], '#e53935', '#8e1b1b'); rr(-20, -28, 40, 8, 3, '#fff', '#8e1b1b'); ell(0, 6, 11, 11, '#4fc3f7', '#01579b'); eyes(10, -12, o, 4.5); mouth(22, lit ? 0 : o.tier, o.hurt);
  if (lit) { ell(0, -66, 5 + Math.sin(o.ph * 40) * 3, 8, '#ffeb3b', '#ff6d00'); ell(0, 44, 10 + Math.sin(o.ph * 30) * 3, 14, 'rgba(255,152,0,.85)'); } else ln(0, -62, 2, -68, '#6d4c41', 3); };
POT.umbrella = o => { FEET(12, '#d9a85c'); ln(-26, 6, -36, 12, '#d9a85c', 6); ln(26, 6, 36, 12, '#d9a85c', 6); blob(52, 60, '#f2d29a', '#cd9a52'); eyes(10, -2, o, 5.5); mouth(12, o.tier, o.hurt);
  const cols = ['#ef5350', '#fff', '#42a5f5', '#fff', '#ef5350'];
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, -26); ctx.arc(0, -26, 36, Math.PI + i * Math.PI / 5, Math.PI + (i + 1) * Math.PI / 5); ctx.closePath(); ctx.fillStyle = cols[i]; ctx.fill(); ctx.strokeStyle = '#8e1b1b'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ln(0, -62, 0, -68, '#6d4c41', 3); };
ZOM.imp = z => { zb(z, { skin: '#c5e1a5', shirt: '#ff5252', pants: '#6d4c41', tw: 32, deco: () => ell(0, -2, 5, 5, '#ffee58') });
  poly([[-14, -50], [-10, -64], [-5, -52]], '#d32f2f', '#7f0000'); poly([[2, -52], [8, -64], [12, -50]], '#d32f2f', '#7f0000'); };
ZOM.pirate = z => { zb(z, { skin: '#9ccf7a', shirt: '#fafafa', pants: '#37474f', tw: 44, deco: () => { for (let i = 0; i < 3; i++) rr(-20, -14 + i * 12, 40, 5, 1, '#1e88e5'); } });
  poly([[-26, -52], [-2, -78], [18, -52]], '#212121', '#000'); ell(-6, -62, 4, 4, '#fff'); ln(-14, -50, 8, -50, '#fafafa', 3); rr(-14, -40, 11, 9, 3, '#111'); ln(-14, -38, -22, -52, '#111', 2); };
ZOM.sumo = z => { zb(z, { skin: '#a5d68a', shirt: '#f5e6c8', pants: '#e53935', tw: 64, deco: () => rr(-32, 8, 64, 12, 4, '#e53935', '#8e1b1b') }); ell(-2, -58, 9, 9, '#212121'); ell(-2, -63, 5, 5, '#212121'); };
ZOM.balloon = z => { const fl = z.fly !== false; ctx.save(); if (fl) ctx.translate(0, -16 + Math.sin(z.ph * 1.2) * 3);
  zb(z, { skin: '#a4d48a', shirt: '#ce93d8', pants: '#5c6bc0', tw: 40 });
  if (fl) { ln(-2, -52, -4, -80, '#eee', 2); ell(-4, -98, 22, 26, '#ff5252', '#b71c1c'); ell(-11, -106, 6, 9, 'rgba(255,255,255,.5)'); poly([[-8, -73], [0, -73], [-4, -68]], '#b71c1c'); }
  ctx.restore(); };

/* ---------- levels ---------- */
const NEWZ = ['beach', 'surfer', 'bucket', 'lifeguard', 'seagull', 'dj', 'pogo', 'tourist', 'medic', null, 'lava', null, null, null, null, 'ghost', null, 'mummy', null, null, null, 'yeti', null, null, null];
const UNL = ['bunker', 'ice', 'coconut', 'surfer', 'sprout', 'pepper', 'mine', 'tiki', 'lifebuoy', 'squash', 'volcano', 'sloth', 'triple', 'glow', 'moon', 'magnet', 'wave', 'party', 'flame', 'crab', 'umbrella', 'firework', null, null, null];
const POOL = [['beach'], ['beach', 'surfer'], ['beach', 'surfer', 'bucket'], ['beach', 'bucket', 'lifeguard', 'surfer'], ['beach', 'bucket', 'lifeguard', 'seagull'],
  ['beach', 'bucket', 'dj', 'surfer'], ['beach', 'bucket', 'pogo', 'dj', 'seagull'], ['bucket', 'lifeguard', 'pogo', 'tourist', 'dj'], ['bucket', 'pogo', 'dj', 'seagull', 'tourist', 'medic'], ['bucket', 'lifeguard', 'pogo', 'dj', 'medic', 'tourist'],
  ['beach', 'lava', 'bucket', 'surfer'], ['lava', 'medic', 'bucket', 'pogo', 'lifeguard'], ['lava', 'medic', 'tourist', 'dj', 'pogo', 'seagull'], ['lava', 'medic', 'tourist', 'lifeguard', 'bucket', 'pogo', 'dj'], ['lava', 'medic', 'tourist', 'lifeguard', 'bucket', 'pogo', 'dj', 'seagull', 'surfer'],
  ['beach', 'ghost', 'bucket'], ['ghost', 'beach', 'pogo', 'bucket'], ['ghost', 'mummy', 'bucket', 'dj'], ['ghost', 'mummy', 'medic', 'lifeguard', 'pogo'], ['ghost', 'mummy', 'medic', 'tourist', 'dj', 'lava', 'bucket'],
  ['bucket', 'lifeguard', 'ghost', 'surfer', 'seagull'], ['yeti', 'bucket', 'pogo', 'ghost', 'dj'], ['yeti', 'mummy', 'medic', 'lava', 'pogo', 'surfer'], ['yeti', 'mummy', 'medic', 'tourist', 'lava', 'ghost', 'dj'], ['yeti', 'mummy', 'medic', 'tourist', 'lava', 'lifeguard', 'pogo', 'dj', 'ghost', 'bucket']];
NEWZ[9] = 'imp'; NEWZ[11] = 'pirate'; NEWZ[13] = 'sumo'; NEWZ[16] = 'balloon';
[5, 7, 9, 20, 21, 22, 23, 24].forEach(i => POOL[i].push('imp'));
[11, 12, 13, 14, 24].forEach(i => POOL[i].push('pirate'));
[13, 14, 19, 22, 23, 24].forEach(i => POOL[i].push('sumo'));
[16, 17, 18, 19, 23, 24].forEach(i => POOL[i].push('balloon'));
const LV = POOL.map((pool, i) => ({ pool, world: Math.floor(i / 5), waves: Math.min(5, 3 + Math.floor(i / 3)), boss: i % 5 === 4, newZ: NEWZ[i], unlock: UNL[i], diff: i }));
const THEMES = [
  { name: 'Sunny Beach', sky: ['#5bc8f5', '#bfeaff'], ground: ['#f6dc9a', '#e8c070'], a: 'rgba(255,255,255,.18)', b: 'rgba(180,120,40,.12)', line: 'rgba(140,90,30,.35)', edge: ['#fff', '#4fc3f7', '#0288d1'], cloud: 'rgba(255,255,255,.9)', sun: '#ffeb3b', wave: 'rgba(255,255,255,.6)' },
  { name: 'Rooftop Resort', sky: ['#ff8a65', '#ffe0b2'], ground: ['#a7b0ba', '#7b858f'], a: 'rgba(255,255,255,.14)', b: 'rgba(0,0,0,.10)', line: 'rgba(40,40,60,.4)', edge: ['#ccc', '#666', '#333'], cloud: 'rgba(255,240,230,.9)', sun: '#ffd54f', wave: 'rgba(255,255,255,.2)' },
  { name: 'Volcano Island', sky: ['#2b1115', '#9a3412'], ground: ['#6b5a52', '#3f302c'], a: 'rgba(255,160,80,.10)', b: 'rgba(0,0,0,.18)', line: 'rgba(255,120,40,.35)', edge: ['#ffcc80', '#ff5722', '#7f1d0f'], cloud: 'rgba(90,65,65,.85)', sun: '#ff7043', wave: 'rgba(255,170,60,.7)' },
  { name: 'Moonlit Lagoon', night: true, sky: ['#0b1038', '#2a2f6b'], ground: ['#2f4a5a', '#1b2e3b'], a: 'rgba(120,160,255,.10)', b: 'rgba(0,0,0,.20)', line: 'rgba(150,190,255,.25)', edge: ['#9fb4ff', '#2b3a8a', '#0a1040'], cloud: 'rgba(120,130,190,.55)', sun: '#fff8d6', wave: 'rgba(170,200,255,.5)' },
  { name: 'Frostbite Peak', snow: true, sky: ['#7fb6ff', '#e8f6ff'], ground: ['#e3f3fb', '#b4d4e6'], a: 'rgba(255,255,255,.35)', b: 'rgba(120,170,210,.15)', line: 'rgba(90,140,180,.4)', edge: ['#fff', '#9ad7f5', '#3a7ea8'], cloud: 'rgba(255,255,255,.95)', sun: '#fffde7', wave: 'rgba(255,255,255,.7)' }];
let TH = THEMES[0];

class WaveManager {
  constructor() { this.wave = 0; this.queue = []; this.spawnT = 0; this.rest = 8; this.total = 1; this.active = false; }
  build(w) {
    const lv = G.lv, n = 3 + Math.round(w * 1.3 + G.li * .7), q = [];
    for (let i = 0; i < n; i++) q.push(pick(lv.pool));
    if (lv.newZ && w === 2) q.unshift(lv.newZ);                       // make sure the new zombie is seen
    if (lv.boss && w === lv.waves) q.splice(Math.min(2, q.length), 0, 'boss');
    return q;
  }
  remaining() { return this.queue.length + G.enemies.filter(e => e.dying <= 0).length; }
  start() {
    this.wave++; this.queue = this.build(this.wave); this.total = this.queue.length; this.active = true; this.spawnT = 2.5;
    G.speedScale = 1 + .015 * G.li + .01 * this.wave; const bw = G.lv.boss && this.wave === G.lv.waves;
    G.banner = { text: bw ? 'BOSS WAVE!' : 'WAVE ' + this.wave, t: 2.6 }; bw ? S.boss() : S.wave();
  }
  update(dt) {
    if (!this.active) { this.rest -= dt; if (this.rest <= 0) this.start(); return; }
    this.spawnT -= dt;
    if (this.queue.length && this.spawnT <= 0) {
      const type = this.queue.shift(); G.enemies.push(new Enemy(type, Math.floor(Math.random() * ROWS), this.wave));
      if (type === 'boss') G.banner = { text: 'THE GIANT VACATION ZOMBIE!', t: 2.6 };
      this.spawnT = Math.max(1.2, 5 - this.wave * .25 - G.li * .1) * rnd(.7, 1.3);
    }
    if (!this.queue.length && G.enemies.length === 0) {
      const vm = G.potatoes.filter(p => p.tier === 3).length, bonus = 100 * this.wave + G.potatoes.length * 10 + vm * 25;
      G.score += bonus; ftext(W / 2, 130, 'Wave cleared! +' + bonus, '#fff', 24);
      if (this.wave >= G.lv.waves) { endGame(true); return; }
      G.sun += 75; this.active = false; this.rest = 7; S.collect();
    }
  }
}

/* ---------- coins, rakes, special potatoes, zombie abilities ---------- */
class Coin {
  constructor(x, y, val) { Object.assign(this, { x, y, val, vy: -150, ty: y + 24, life: 9, ph: Math.random() * 6, dead: false }); }
  update(dt) { this.life -= dt; this.ph += dt * 6; this.vy += 520 * dt; this.y += this.vy * dt; if (this.y > this.ty) { this.y = this.ty; this.vy = 0; } if (this.life <= 0) this.dead = true; }
  draw() { ctx.save(); ctx.translate(this.x, this.y); if (this.life < 3 && Math.floor(this.life * 6) % 2) ctx.globalAlpha = .5;
    ell(0, 0, 12 * (.35 + .65 * Math.abs(Math.cos(this.ph))), 12, this.val >= 25 ? '#ffd54f' : '#cfd8dc', '#8d6e00', 2.5);
    ctx.fillStyle = '#8d6e00'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', 0, 4); ctx.restore(); }
}
function collectCoin(c) { c.dead = true; save.coins += c.val; G.coinsEarned += c.val; G.score += 3; S.collect(); burst(c.x, c.y, '#ffd54f', 8, 130); ftext(c.x, c.y - 20, '+' + c.val + ' coins', '#ffd54f', 14); persist(); }
function onZombieDie(z) {
  const n = z.type === 'boss' ? 6 : Math.random() < .14 ? 1 : 0;
  for (let i = 0; i < n; i++) G.coins.push(new Coin(z.x + rnd(-24, 24), z.yy() - 30, (z.type === 'boss' || Math.random() < .2) ? 25 : 10));
  if (z.type === 'lava') { ring(z.x, z.yy() - 40, '#ff7043', 110); burst(z.x, z.yy() - 40, '#ff7043', 20, 200); G.shake = Math.max(G.shake, .4);
    for (const p of G.potatoes) if (Math.abs(p.r - z.r) <= 1 && Math.abs(p.x - z.x) < 110) { p.damage(90, true); p.addMood(-5); } }
}
function zombieAbilities(z, dt) {
  for (const rk of G.rakes) if (!rk.used && rk.r === z.r && z.dying <= 0 && Math.abs(z.x - rk.x) < 26) {
    rk.used = true; burst(rk.x, rk.y, '#c9a066', 12, 150); ftext(rk.x, rk.y - 40, 'WHACK!', '#ffeb3b', 18); S.hit(); dmgEnemy(z, z.type === 'boss' ? 500 : 99999, null);
  }
  if (z.type === 'dj') { for (const o of G.enemies) if (o !== z && Math.abs(o.x - z.x) < 170) o.boost = .3; if (Math.random() < dt * 2) G.parts.push(new Particle(z.x - 20, z.yy() - 90, { txt: '♪', col: '#ff80ab', size: 16, vy: -30, life: .8 })); }
  if (z.type === 'medic') { z.heal -= dt; if (z.heal <= 0) { z.heal = .6; for (const o of G.enemies) if (o !== z && o.dying <= 0 && Math.abs(o.x - z.x) < 150 && o.hp < o.maxhp) { o.hp = Math.min(o.maxhp, o.hp + 14); G.parts.push(new Particle(o.x, o.yy() - 80, { txt: '+', col: '#69f0ae', size: 16, vy: -30, life: .6 })); } } }
}
function potatoSpecial(p, dt) {
  if (p.type === 'pepper') {
    p.fuse = (p.fuse || 0) + dt;
    if (p.fuse >= .9) { for (const e of G.enemies) if (e.dying <= 0 && Math.abs(e.r - p.r) <= 1 && Math.abs(e.x - p.x) < 135) dmgEnemy(e, 450, p);
      ring(p.x, p.y - 40, '#ff7043', 140); burst(p.x, p.y - 40, '#ff7043', 30, 260); G.shake = .5; S.die(); p.dead = true; G.grid[p.r][p.c] = null; }
    return true;
  }
  if (p.type === 'volcano') {
    p.fuse = (p.fuse || 0) + dt;
    if (!p.erupted && p.fuse >= .8) { p.erupted = true; G.proj.push(new Proj(p.x + 20, p.y - 34, p.r, 'cannon', 700, p, true)); G.shake = .6; burst(p.x, p.y - 60, '#ff7043', 30, 260); S.boss(); }
    if (p.fuse >= 2.2) { p.dead = true; G.grid[p.r][p.c] = null; }
    return true;
  }
  return false;
}
function placeSpecial(k, cell, here, m) {
  const d = P[k];
  if (k === 'rake') {
    if (save.rakes <= 0) return true;
    if (G.rakes.some(r => r.r === cell.r && r.c === cell.c)) { ftext(m.x, m.y, 'Rake already here', '#ffccbc', 14); return true; }
    save.rakes--; persist(); G.rakes.push({ r: cell.r, c: cell.c, x: X0 + cell.c * CW + CW / 2, y: Y0 + cell.r * CH + CH - 14, used: false }); S.place(); if (save.rakes <= 0) G.sel = null; return true;
  }
  if (k === 'shovel') {
    if (!here) { ftext(m.x, m.y, 'Click a potato to dig it up', '#ffccbc', 14); return true; }
    here.dead = true; G.grid[here.r][here.c] = null; burst(here.x, here.y - 20, '#8d6e3a', 14, 150); ftext(here.x, here.y - 70, 'Dug up!', '#fff', 14); S.place(); G.sel = null; updateCards(); return true;
  }
  if (d.on) {
    if (!here || here.type !== d.on || here.up) { ftext(m.x, m.y, 'Plant on a ' + P[d.on].name + '!', '#ffccbc', 14); return true; }
    if (G.sun < d.cost) { ftext(m.x, m.y, 'Need more Sun Chips!', '#ffccbc', 14); return true; }
    if (G.cd[k] > 0) { ftext(m.x, m.y, 'Recharging...', '#ffccbc', 14); return true; }
    here.up = k; here.max = here.hp = d.hp; G.sun -= d.cost; G.cd[k] = d.cd; G.sel = null; S.ability();
    burst(here.x, here.y - 40, '#ffd54f', 20, 200); ring(here.x, here.y - 40, '#ffd54f', 80); ftext(here.x, here.y - 100, 'UPGRADED!', '#ffd54f', 16); updateCards(); return true;
  }
  return false;
}
function drawRake(r) { const x = r.x, y = r.y; ln(x - 10, y - 24, x + 14, y - 4, '#8d6e3a', 4); rr(x - 15, y - 6, 30, 6, 2, '#9e9e9e', '#555'); for (let i = 0; i < 4; i++) ln(x - 12 + i * 8, y, x - 12 + i * 8, y + 7, '#757575', 2.5); }

/* ---------- backgrounds per world ---------- */
function buildBg(w) {
  TH = THEMES[w || 0]; const c = bg.getContext('2d'), old = ctx; ctx = c; c.clearRect(0, 0, W, H);
  let g = c.createLinearGradient(0, 0, 0, Y0); g.addColorStop(0, TH.sky[0]); g.addColorStop(1, TH.sky[1]); c.fillStyle = g; c.fillRect(0, 0, W, Y0);
  g = c.createLinearGradient(0, Y0, 0, H); g.addColorStop(0, TH.ground[0]); g.addColorStop(1, TH.ground[1]); c.fillStyle = g; c.fillRect(0, Y0, W, H - Y0);
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) { c.fillStyle = (r + q) % 2 ? TH.a : TH.b; c.fillRect(X0 + q * CW, Y0 + r * CH, CW, CH); }
  c.strokeStyle = TH.line; c.lineWidth = 2; for (let r = 0; r <= ROWS; r++) { c.beginPath(); c.moveTo(X0, Y0 + r * CH); c.lineTo(X0 + COLS * CW, Y0 + r * CH); c.stroke(); }
  for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(X0 + Math.random() * COLS * CW, Y0 + Math.random() * ROWS * CH, 2, 2); }
  g = c.createLinearGradient(X0 + COLS * CW, 0, W, 0); g.addColorStop(0, TH.edge[0]); g.addColorStop(.25, TH.edge[1]); g.addColorStop(1, TH.edge[2]); c.fillStyle = g; c.fillRect(X0 + COLS * CW, Y0 - 10, W - X0 - COLS * CW, H);
  c.fillStyle = '#ffab91'; c.fillRect(0, Y0, X0 - 8, H - Y0); c.fillStyle = '#ff7043'; c.fillRect(0, Y0, X0 - 8, 14);
  for (let r = 0; r < ROWS; r++) { rr(10, Y0 + 24 + r * CH, 50, 50, 8, '#81d4fa', '#5d4037'); ln(35, Y0 + 24 + r * CH, 35, Y0 + 74 + r * CH, '#5d4037', 3); ln(10, Y0 + 49 + r * CH, 60, Y0 + 49 + r * CH, '#5d4037', 3); rr(8, Y0 + 80 + r * CH, 54, 8, 3, '#e53935'); }
  c.strokeStyle = '#5d4037'; c.lineWidth = 4; c.strokeRect(0, Y0, X0 - 8, H - Y0);
  if (w === 1) { for (let i = 0; i < 11; i++) { const h = 18 + (i * 37) % 30; c.fillStyle = i % 2 ? '#7a5a7a' : '#8d6a8d'; c.fillRect(100 + i * 70, Y0 - h, 52, h); c.fillStyle = '#ffe082'; for (let k = 0; k < 3; k++) c.fillRect(106 + i * 70 + k * 15, Y0 - h + 5, 6, 6); }
    ln(300, Y0, 300, 6, '#555', 3); rr(560, Y0 - 24, 40, 24, 4, '#8d6e63', '#3e2723'); }
  else if (w === 2) { poly([[500, Y0], [610, 4], [720, Y0]], '#4e342e', '#2b1a14'); ell(610, 6, 16, 6, '#ff7043', '#ffeb3b'); ln(606, 8, 598, Y0, '#ff7043', 4); ln(616, 8, 626, Y0, '#ff5722', 4);
    for (let i = 0; i < 4; i++) ln(X0 + 60 + i * 200, Y0 + 8, X0 + 90 + i * 200, Y0 + 8, 'rgba(255,100,30,.6)', 3); }
  else if (w === 3) nightDecor();
  else if (w === 4) frostDecor();
  else { [140, 520, 760].forEach((x, i) => { ln(x, Y0 + 6, x + (i % 2 ? 8 : -8), 12, '#8d6e3a', 7); for (let k = 0; k < 5; k++) { c.save(); c.translate(x + (i % 2 ? 8 : -8), 14); c.rotate(-1.2 + k * .6); ell(18, 0, 22, 6, '#2e9e4a', '#1b5e20'); c.restore(); } });
    ln(300, Y0, 300, 20, '#6d4c41', 3); c.beginPath(); c.arc(300, 22, 26, Math.PI, 0); c.fillStyle = '#ef5350'; c.fill(); ell(420, Y0 - 12, 11, 11, '#fff', '#333'); c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(420, Y0 - 12); c.arc(420, Y0 - 12, 11, 0, 1.2); c.fill();
    rr(620, Y0 - 16, 40, 12, 3, '#ab47bc'); ell(850, Y0 - 8, 7, 5, '#ffccbc', '#bf7a60'); }
  polish(w || 0);
  ctx = old;
}
function drawClouds() { [[0, 14], [350, 26], [650, 10]].forEach((c, i) => { const x = ((c[0] + T * (6 + i * 3)) % (W + 160)) - 80; ell(x, c[1], 30, 10, TH.cloud); ell(x + 18, c[1] - 6, 18, 9, TH.cloud); }); ctx.fillStyle = TH.sun; ctx.beginPath(); ctx.arc(870, 22, 16, 0, 7); ctx.fill(); if (TH.night) nightFx(); if (TH.snow) snowFx(); }
function drawWater() { for (let r = 0; r < ROWS * 3; r++) { const y = Y0 + 10 + r * 32; ctx.strokeStyle = TH.wave; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X0 + COLS * CW + 12 + Math.sin(T * 2 + r) * 3, y, 8, 1.6, 4.7); ctx.stroke(); } }

/* ---------- game setup / end ---------- */
function newGame(li) {
  li = li || 0; const lv = LV[li];
  G = { li, lv, world: lv.world, deck: [], coins: [], rakes: [], coinsEarned: 0, score: 0, sun: 150 + 50 * save.sunLvl + (THEMES[lv.world].night ? 100 : 0), resort: 100, kills: 0, collected: 0, potatoes: [], enemies: [], proj: [], suns: [], parts: [],
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), sel: null, cd: {}, sky: 3, shake: 0, banner: null, danger: false, speedScale: 1.02, wm: new WaveManager(), resortFlash: 0, maxWave: 0 };
  Object.keys(P).forEach(k => G.cd[k] = 0);
  G.hitResort = function (e) {
    this.resort -= (e.type === 'boss' ? 60 : 15) * (save.fort ? .75 : 1); this.shake = .6; this.resortFlash = .5; S.pdie(); ring(X0, e.yy() - 40, '#ff5252', 100); ftext(X0 + 10, e.yy() - 70, 'RESORT HIT!', '#ff8a80', 18);
    for (const p of this.potatoes) p.addMood(-8);
    if (this.resort <= 0) { this.resort = 0; endGame(false); }
  };
}
function startLevel(li, deck) {
  newGame(li); G.deck = deck.slice(0, deckMax()); save.deck = G.deck.slice(); persist(); buildBg(G.lv.world); state = 'play'; show(null); buildCards(); updateCards(); paused = false; if (isNight()) G.banner = { text: 'NIGHT FALLS...', t: 3 };
}
function endGame(win) {
  state = win ? 'win' : 'over'; win ? S.win() : S.over(); let extra = '', bonus = 0;
  if (win) {
    bonus = 40 + 15 * G.li + (G.lv.boss ? 100 : 0); save.coins += bonus; G.coinsEarned += bonus; if (G.li + 1 > save.cleared) save.cleared = G.li + 1;
    const u = G.lv.unlock; if (u && !save.unlocked.includes(u)) { save.unlocked.push(u); extra = '<br>NEW POTATO UNLOCKED: <b>' + P[u].name + '</b>!'; }
    if (G.li === LV.length - 1) extra += '<br><b>YOU SAVED THE WHOLE VACATION!</b>'; else if (G.li % 5 === 4) extra += '<br><b>NEW WORLD UNLOCKED: ' + THEMES[G.world + 1].name + '!</b>';
    persist();
  }
  const el = $('end'); el.classList.remove('hidden'); const lab = (G.world + 1) + '-' + (G.li % 5 + 1);
  el.innerHTML = '<h1>' + (win ? 'VACATION SAVED!' : 'GAME OVER') + '</h1><div class="stats">Level ' + lab + (win ? ' complete!' : ': the zombies stormed the resort!') + extra +
    '<br>FINAL SCORE: <b>' + G.score + '</b><br>' + (win ? 'HIGHEST WAVE' : 'WAVE REACHED') + ': <b>' + G.wm.wave + '</b><br>ENEMIES DEFEATED: <b>' + G.kills + '</b><br>COINS EARNED: <b>' + G.coinsEarned + '</b></div>' +
    '<div class="row">' + (win && G.li < LV.length - 1 ? '<button class="big" id="nextBtn">NEXT LEVEL</button>' : '') + '<button class="big alt" id="againBtn">PLAY AGAIN</button><button class="big sm" id="mapBtn">LEVEL MAP</button></div>';
  if ($('nextBtn')) $('nextBtn').onclick = () => { S.click(); showBrief(G.li + 1); };
  $('againBtn').onclick = () => { S.click(); startLevel(G.li, G.deck); };
  $('mapBtn').onclick = () => { S.click(); showMap(); };
}

/* ---------- cards ---------- */
function cardEl(k, inGame) {
  const d = P[k], el = document.createElement('div'); el.className = 'card'; if (inGame) el.id = 'card-' + k; el.title = d.name + (d.cost ? ' (' + d.cost + ' chips)' : '') + ': ' + d.desc;
  const c = document.createElement('canvas'); c.width = 64; c.height = 72; el.appendChild(c);
  const idx = inGame ? (G.deck.indexOf(k) + 1) : 0;
  el.insertAdjacentHTML('beforeend', (idx > 0 ? '<span class="k">' + idx + '</span>' : '') + '<b>' + d.name + '</b><span class="cost">' + (k === 'rake' ? 'x' + save.rakes : k === 'shovel' ? 'Free' : d.cost) + '</span><small>' + d.desc.split('.')[0].split(':').pop() + '</small><div class="cd"></div>');
  const old = ctx; ctx = c.getContext('2d'); ctx.translate(32, 68); ctx.scale(.62, .62);
  if (k === 'shovel') drawShovel(0, 0); else if (k === 'rake') drawRake({ x: 0, y: 0 }); else { drawPotato(baseOf(k), 0, 0, { ph: 1, tier: 2, fire: 0, flash: 0, dis: 0, fort: 0, cheer: 0, t: 0, fuse: 0 }); if (d.on) drawCrown(0, 0, 1); }
  ctx = old; return el;
}
function buildCards() {
  const box = $('cards'); box.innerHTML = '';
  [...G.deck, ...(save.rakes > 0 ? ['rake'] : []), 'shovel'].forEach(k => { const el = cardEl(k, true); el.onclick = () => selectCard(k); box.appendChild(el); });
}
function updateCards() {
  if (!G || !G.deck) return;
  [...G.deck, 'rake', 'shovel'].forEach(k => {
    const el = $('card-' + k); if (!el) return; el.classList.toggle('sel', G.sel === k);
    if (k === 'shovel') return;
    if (k === 'rake') { el.querySelector('.cost').textContent = 'x' + save.rakes; el.classList.toggle('poor', save.rakes <= 0); return; }
    el.classList.toggle('poor', G.sun < P[k].cost); el.classList.toggle('sleepy', isSleepKind(k, isNight())); el.querySelector('.cd').style.height = (G.cd[k] / P[k].cd * 100) + '%';
  });
}
function updateHud() {
  $('sScore').textContent = G.score; $('sSun').textContent = G.sun; $('sWave').textContent = Math.max(1, G.wm.wave); $('sWaves').textContent = G.lv.waves; $('sCoins').textContent = save.coins;
  $('sHp').style.width = G.resort + '%'; $('sEnemies').textContent = G.wm.active ? G.wm.remaining() : 0;
  $('sProg').style.width = (G.wm.active ? (1 - G.wm.remaining() / G.wm.total) * 100 : 100) + '%'; updateCards();
}

/* ---------- menus: map, briefing + deck picker, shop ---------- */
function show(id) { ['title', 'how', 'map', 'brief', 'shop', 'end'].forEach(i => $(i).classList.toggle('hidden', i !== id)); }
const availCards = () => ['sun', 'cannon', 'bunker', 'ice', 'coconut', 'surfer', 'pepper', 'tiki', 'volcano', 'glow', 'moon', 'sprout', 'mine', 'lifebuoy', 'squash', 'triple', 'magnet', 'wave', 'party', 'sloth', 'flame', 'crab', 'firework', 'umbrella', 'twinsun', 'gatling', 'megabunker'].filter(k => save.unlocked.includes(k) || save.owned.includes(k));
function showMap() {
  state = 'menu'; let h = '<h2>SELECT LEVEL</h2><div class="row"><span class="coin">Coins: ' + save.coins + '</span><button class="big alt sm" id="shopBtn">SHOP</button><button class="big sm" id="mapBack">BACK</button></div>';
  THEMES.forEach((t, w) => { h += '<h3>World ' + (w + 1) + ': ' + t.name + '</h3><div class="lvgrid">';
    for (let j = 0; j < 5; j++) { const i = w * 5 + j, open = i <= save.cleared; h += '<button class="lvb' + (open ? '' : ' lock') + (i < save.cleared ? ' done' : '') + '" data-i="' + i + '">' + (w + 1) + '-' + (j + 1) + (LV[i].boss ? '<br>BOSS' : '') + (i < save.cleared ? '<br>done' : '') + (!open ? '<br>locked' : '') + '</button>'; }
    h += '</div>'; });
  const m = $('map'); m.innerHTML = h; show('map');
  m.querySelectorAll('.lvb').forEach(b => b.onclick = () => { if (!b.classList.contains('lock')) { S.click(); showBrief(+b.dataset.i); } });
  $('shopBtn').onclick = () => { S.click(); showShop(); }; $('mapBack').onclick = () => { S.click(); show('title'); };
}
let pick7 = [], briefLv = 0;
function showBrief(i) {
  briefLv = i; state = 'menu'; const lv = LV[i], zs = [...new Set(lv.pool)].concat(lv.boss ? ['boss'] : []), av = availCards();
  pick7 = save.deck.filter(k => av.includes(k)).slice(0, deckMax()); if (!pick7.length) pick7 = av.slice(0, 2);
  let h = '<h2>LEVEL ' + (lv.world + 1) + '-' + (i % 5 + 1) + ' &mdash; ' + THEMES[lv.world].name + '</h2><div class="sub">' + lv.waves + ' waves' + (lv.boss ? ' + BOSS' : '') + (lv.unlock ? ' &bull; Reward: ' + P[lv.unlock].name : '') + '</div><div class="zrow">';
  zs.forEach(t => { h += '<div class="zc"><canvas width="90" height="110" data-z="' + t + '"></canvas><b>' + E[t].name + '</b><small>' + ZDESC[t] + '</small></div>'; });
  h += '</div><div class="sub">Choose up to ' + deckMax() + ' potatoes (click a slot to remove):</div><div id="slots" class="prow"></div><div id="avail" class="prow"></div><div class="row"><button class="big" id="goBtn">LET\'S ROCK!</button><button class="big sm" id="bBack">BACK</button></div>';
  $('brief').innerHTML = h; show('brief');
  document.querySelectorAll('#brief canvas[data-z]').forEach(cn => { const t = cn.dataset.z, old = ctx; ctx = cn.getContext('2d'); const k = t === 'boss' ? .42 : .8; ctx.translate(45, 102); ctx.scale(k, k);
    drawZombie({ type: t, ph: 0, t: 0, armor: E[t].armor || 0, maxArmor: E[t].armor || 1, flash: 0, slow: 0, freeze: 0, dying: 0, eating: false }, 0, 0); ctx = old; });
  renderPicker(); $('goBtn').onclick = () => { if (pick7.length) { S.click(); startLevel(briefLv, pick7); } }; $('bBack').onclick = () => { S.click(); showMap(); };
}
function renderPicker() {
  const s = $('slots'), a = $('avail'); s.innerHTML = ''; a.innerHTML = '';
  for (let i = 0; i < deckMax(); i++) { const k = pick7[i], slot = document.createElement('div'); slot.className = 'slot';
    if (k) { const el = cardEl(k, false); el.onclick = () => { S.click(); pick7.splice(i, 1); renderPicker(); }; slot.appendChild(el); } else slot.textContent = i + 1; s.appendChild(slot); }
  availCards().forEach(k => { const el = cardEl(k, false); if (pick7.includes(k)) el.classList.add('poor');
    el.onclick = () => { if (!pick7.includes(k) && pick7.length < deckMax()) { S.click(); pick7.push(k); renderPicker(); } }; a.appendChild(el); });
  $('goBtn').classList.toggle('dis', !pick7.length);
}
function showShop() {
  const items = [
    { n: 'Rake (x1)', d: 'Place on the lawn: kills the first zombie that walks over it (bosses take heavy damage). You own ' + save.rakes + '.', c: 40, buy: () => save.rakes++, ok: () => true },
    { n: 'Sun Stash +50', d: 'Start every level with +50 Sun Chips. Level ' + save.sunLvl + '/4.', c: 100 * (save.sunLvl + 1), buy: () => save.sunLvl++, ok: () => save.sunLvl < 4 },
    { n: 'Resort Fortify', d: 'The resort takes 25% less damage from zombies. Permanent.', c: 250, buy: () => save.fort = true, ok: () => !save.fort },
    { n: 'Twin Sun card', d: 'Upgrade card: plant on a SunSpud to double its chips.', c: 300, buy: () => save.owned.push('twinsun'), ok: () => !save.owned.includes('twinsun') },
    { n: 'Gatling Spud card', d: 'Upgrade card: plant on a Cannon Spud for rapid fire. (needs a Cannon Spud)', c: 500, buy: () => save.owned.push('gatling'), ok: () => !save.owned.includes('gatling') },
    { n: 'Mega Bunker card', d: 'Upgrade card: plant on a Bunker Spud for triple HP. (needs a Bunker Spud)', c: 400, buy: () => save.owned.push('megabunker'), ok: () => !save.owned.includes('megabunker') }];
  let h = '<h2>BEACH SHOP</h2><div class="row"><span class="coin">Coins: ' + save.coins + '</span><button class="big sm" id="shopBack">BACK</button></div><div class="shoplist">';
  items.forEach((it, i) => { const ok = it.ok(); h += '<div class="item"><div><b>' + it.n + '</b><br><small>' + it.d + '</small></div><button class="big sm' + (ok && save.coins >= it.c ? '' : ' dis') + '" data-i="' + i + '">' + (ok ? it.c + ' coins' : 'OWNED') + '</button></div>'; });
  $('shop').innerHTML = h + '</div><small>Zombies drop coins sometimes. Click them fast!</small>'; show('shop');
  $('shop').querySelectorAll('button[data-i]').forEach(b => b.onclick = () => { const it = items[+b.dataset.i]; if (it.ok() && save.coins >= it.c) { save.coins -= it.c; it.buy(); persist(); S.collect(); showShop(); } });
  $('shopBack').onclick = () => { S.click(); showMap(); };
}

/* ---------- wiring + init ---------- */
$('playBtn').onclick = () => { S.click(); showMap(); };
$('menuBtn').onclick = () => { if (state === 'play') { S.click(); showMap(); } };
buildBg(0); newGame(0); state = 'title'; requestAnimationFrame(loop);

function drawShovel(x, y) { ln(x - 14, y - 34, x + 8, y - 6, '#8d6e3a', 5); rr(x - 20, y - 40, 14, 6, 2, '#6d4c41'); poly([[x + 2, y - 8], [x + 16, y - 4], [x + 12, y + 8], [x - 2, y + 2]], '#b0bec5', '#455a64'); }

/* ================= V3: NIGHT WORLD, PRO TITLE SCREEN, WORLD MAP, POLISH ================= */
const isNight = () => !!(G && THEMES[G.world] && THEMES[G.world].night);
const isSleepKind = (k, night) => { const b = P[baseOf(k)]; return night ? !!b.day : !!b.nightOnly; };
let paused = false, gameSpeed = 1;

/* ---------- night potatoes (sleep by day) + day potatoes (sleep at night) ---------- */
Object.assign(P, {
  glow: { name: 'Glow Spud', cost: 50, hp: 90, cd: 5, rate: 1.5, dmg: 15, abCd: 0, desc: 'NIGHT ONLY. Cheap glowing shots, short range', nightOnly: true },
  moon: { name: 'Moon Spud', cost: 75, hp: 100, cd: 5, rate: 6, dmg: 0, abCd: 0, desc: 'NIGHT ONLY. Makes Sun Chips under the moon', nightOnly: true }
});
P.coconut.day = P.surfer.day = P.ice.day = true;

/* ---------- night zombies ---------- */
Object.assign(E, {
  ghost: { hp: 130, sp: 27, pts: 150, sc: 1, dps: 18, name: 'Ghost Zombie' },
  mummy: { hp: 700, sp: 11, pts: 220, sc: 1.1, dps: 26, name: 'Mummy Zombie' }
});
Object.assign(ZDESC, { ghost: 'Floats along, fast and spooky.', mummy: 'Wrapped up tight. Very tough and slow.' });

POT.glow = o => {
  FEET(10, '#7e57c2'); ln(-24, 4, -34, -4, '#9575cd', 5); ln(24, 4, 34, -4, '#9575cd', 5);
  const g = ctx.createRadialGradient(0, -8, 6, 0, -8, 62); g.addColorStop(0, 'rgba(179,136,255,.55)'); g.addColorStop(1, 'rgba(179,136,255,0)'); ctx.fillStyle = g; ctx.fillRect(-64, -70, 128, 128);
  blob(50, 60, '#d1c4e9', '#7e57c2');
  ctx.beginPath(); ctx.arc(0, -24, 26, Math.PI, 0); ctx.fillStyle = '#7c4dff'; ctx.fill(); ctx.strokeStyle = '#311b92'; ctx.lineWidth = 2.5; ctx.stroke();
  [[-12, -34], [8, -40], [14, -28]].forEach(p => ell(p[0], p[1], 4, 4, '#e1bee7'));
  eyes(10, -6, o, 5.5); mouth(12, o.tier, o.hurt);
};
POT.moon = o => {
  const w = Math.sin(o.ph * 4) * 4;
  FEET(10, '#90a4ae'); ln(-24, 4, -36, -6 + w, '#b0bec5', 5); ln(24, 4, 36, -6 - w, '#b0bec5', 5);
  blob(54, 62, '#eceff1', '#90a4ae');
  poly([[-26, -16], [26, -16], [12, -52], [-8, -48]], '#3949ab', '#1a237e'); ell(0, -16, 28, 6, '#5c6bc0', '#1a237e'); ell(12, -52, 6, 6, '#fff59d', '#fbc02d');
  ctx.fillStyle = '#fff59d'; ctx.beginPath(); ctx.arc(-2, -32, 8, .5, 5.8); ctx.fill();
  eyes(10, -4, o, 5); mouth(14, o.tier, o.hurt);
  if (o.t > 4.5 || o.cheer > 0) for (let i = 0; i < 6; i++) { const a = o.ph * 2 + i * 1.05; ln(Math.cos(a) * 42, Math.sin(a) * 42 - 4, Math.cos(a) * 52, Math.sin(a) * 52 - 4, '#fff59d', 3); }
};
ZOM.ghost = z => {
  ell(0, -10, 34, 52, 'rgba(160,180,255,.18)'); ctx.globalAlpha = .55 + .25 * Math.sin(z.ph * 1.3);
  zb(z, { skin: '#cfd8ff', shirt: '#b0bcff', pants: '#8c9eff', tw: 38, shoe: '#8c9eff' }); ctx.globalAlpha = 1;
};
ZOM.mummy = z => {
  zb(z, { skin: '#e6d7b0', shirt: '#efe3c2', pants: '#d8c898', tw: 46, shoe: '#bfae80', deco: () => { for (let i = 0; i < 4; i++) ln(-22, -14 + i * 9, 22, -8 + i * 9, '#cbb98a', 3); } });
  for (let i = 0; i < 4; i++) ln(-20, -48 + i * 6, 16, -42 + i * 6, '#cbb98a', 3);
};

/* ---------- sleeping logic ---------- */
const _pu = Potato.prototype.update;
Potato.prototype.update = function (dt) {
  this.sleep = isSleepKind(this.type, isNight());
  if (this.sleep) { this.ph += dt; this.flash -= dt; this.cheer -= dt; this.t = 0; this.eaten = false; this.dis = 0; return; }
  _pu.call(this, dt);
};

/* ---------- cards: badges + sleepy marks ---------- */
const _ce = cardEl;
cardEl = function (k, inGame) {
  const el = _ce(k, inGame), b = P[baseOf(k)]; el.dataset.k = k;
  if (b.day) el.insertAdjacentHTML('beforeend', '<span class="bd" title="Sleeps at night">&#9728;</span>');
  if (b.nightOnly) el.insertAdjacentHTML('beforeend', '<span class="bd" title="Sleeps by day">&#9790;</span>');
  if (!inGame && isSleepKind(k, !!THEMES[LV[briefLv].world].night)) el.classList.add('sleepy');
  return el;
};
const _sb = showBrief;
showBrief = function (i) {
  _sb(i); const night = !!THEMES[LV[i].world].night, b = $('brief'); b.classList.toggle('night', night);
  if (night) { const s = b.querySelector('.sub'); if (s) s.insertAdjacentHTML('afterend', '<div class="nightnote">NIGHT LEVEL: no Sun Chips fall from the sky! &#9728; Day spuds (Surfer, Coconut, Ice) fall asleep. &#9790; Glow and Moon Spuds wake up!</div>'); }
};
const _show = show;
show = function (id) { _show(id); ['modes', 'cheat'].forEach(i => $(i).classList.toggle('hidden', i !== id)); if (id) paused = false; if (id === 'title') updateTitle(); };

/* ---------- night scenery ---------- */
function nightDecor() {
  const c = ctx;
  c.fillStyle = '#10143f'; c.beginPath(); c.moveTo(0, Y0); for (let x = 0; x <= W; x += 30) c.lineTo(x, Y0 - 12 - 10 * Math.sin(x * .02) - 8 * Math.sin(x * .07)); c.lineTo(W, Y0); c.fill();
  [180, 410, 690].forEach(x => { ln(x, Y0 - 4, x, Y0 - 34, '#0a0d2a', 5); ln(x, Y0 - 22, x + 12, Y0 - 34, '#0a0d2a', 3); ln(x, Y0 - 18, x - 11, Y0 - 30, '#0a0d2a', 3); });
  for (let r = 0; r < ROWS; r++) { rr(10, Y0 + 24 + r * CH, 50, 50, 8, '#ffe082', '#5d4037'); ln(35, Y0 + 24 + r * CH, 35, Y0 + 74 + r * CH, '#5d4037', 3); ln(10, Y0 + 49 + r * CH, 60, Y0 + 49 + r * CH, '#5d4037', 3); }
  [0, 2, 4].forEach(r => { const x = X0 + COLS * CW - 20, y = Y0 + r * CH + CH - 8; rr(x - 13, y - 40, 26, 40, [13, 13, 2, 2], '#7e8aa8', '#3b4468'); ln(x, y - 30, x, y - 14, '#3b4468', 3); ln(x - 6, y - 24, x + 6, y - 24, '#3b4468', 3); });
}
function nightFx() {
  for (let i = 0; i < 26; i++) { ctx.globalAlpha = .35 + .5 * Math.abs(Math.sin(T * 1.7 + i * 2.3)); ctx.fillStyle = '#fff'; ctx.fillRect((i * 83 + 17) % W, (i * 29) % (Y0 - 14), 2, 2); }
  ctx.globalAlpha = 1; ctx.fillStyle = '#1a2050'; ctx.beginPath(); ctx.arc(877, 18, 13, 0, 7); ctx.fill();
  for (let k = 0; k < 4; k++) { const x = ((T * 10 + k * 260) % (W + 300)) - 150; ell(x, Y0 + 90 + k * 105, 150, 22, 'rgba(180,200,255,.07)'); }
  for (let i = 0; i < 14; i++) { const x = X0 + ((i * 131 + T * (8 + i % 5)) % (COLS * CW)), y = Y0 + 30 + ((i * 77) % (ROWS * CH - 60)) + Math.sin(T * 2 + i) * 14, a = .5 + .5 * Math.sin(T * 3 + i); ell(x, y, 8, 8, 'rgba(255,255,150,' + (.12 * a) + ')'); ell(x, y, 2.2, 2.2, 'rgba(255,255,170,' + (.4 + .6 * a) + ')'); }
}

/* ---------- lawn polish for every world ---------- */
function polish(w) {
  const c = ctx, night = !!TH.night, rx = () => X0 + Math.random() * COLS * CW, ry = () => Y0 + Math.random() * ROWS * CH;
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) { const x = X0 + q * CW, y = Y0 + r * CH;
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x, y, CW, 3); c.fillRect(x, y, 3, CH); c.fillStyle = 'rgba(0,0,0,.07)'; c.fillRect(x, y + CH - 3, CW, 3); c.fillRect(x + CW - 3, y, 3, CH); }
  if (w === 0) for (let i = 0; i < 46; i++) { c.fillStyle = i % 3 ? 'rgba(255,255,255,.4)' : 'rgba(255,150,170,.5)'; c.beginPath(); c.ellipse(rx(), ry(), 3, 2, Math.random() * 3, 0, 7); c.fill(); }
  else if (w === 2) { c.strokeStyle = 'rgba(255,110,30,.55)'; c.lineWidth = 2; for (let i = 0; i < 16; i++) { let x = rx(), y = ry(); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rnd(-14, 14); y += rnd(4, 14); c.lineTo(x, y); } c.stroke(); } }
  else if (w === 4) { c.strokeStyle = 'rgba(120,170,210,.4)'; c.lineWidth = 1.5; for (let i = 0; i < 18; i++) { let x = rx(), y = ry(); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 3; k++) { x += rnd(-12, 12); y += rnd(4, 12); c.lineTo(x, y); } c.stroke(); } for (let i = 0; i < 50; i++) { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(rx(), ry(), 2, 2); } }
  else if (w === 3) { c.strokeStyle = 'rgba(120,200,255,.28)'; c.lineWidth = 1.5; for (let i = 0; i < 70; i++) { const x = rx(), y = ry(); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 7); c.moveTo(x, y); c.lineTo(x + 3, y - 6); c.stroke(); } c.fillStyle = 'rgba(15,25,95,.30)'; c.fillRect(X0, Y0, COLS * CW, ROWS * CH); }
  let g = c.createLinearGradient(0, Y0, 0, Y0 + 26); g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, Y0, W, 26);
  g = c.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, night ? 'rgba(0,0,20,.5)' : 'rgba(40,20,0,.26)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
}

/* ---------- pause, speed, overlays ---------- */
function togglePause() { if (state !== 'play') return; paused = !paused; $('pauseBtn').textContent = paused ? 'Resume' : 'Pause'; }
function postFx() {
  if (!G || state !== 'play') return;
  if (isNight()) { ctx.save(); ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(220,230,255,.85)'; ctx.fillText('NIGHT: no Sun Chips from the sky', W - 10, H - 8); ctx.restore(); }
  if (paused) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 56px "Trebuchet MS",sans-serif'; ctx.fillText('PAUSED', W / 2, H / 2); ctx.font = 'bold 18px sans-serif'; ctx.fillText('Press P or click Resume', W / 2, H / 2 + 34); ctx.restore(); }
}
cv.addEventListener('mousedown', e => { if (paused) e.stopImmediatePropagation(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') togglePause(); });
$('pauseBtn').onclick = togglePause;
$('speedBtn').onclick = () => { gameSpeed = gameSpeed === 1 ? 2 : 1; $('speedBtn').textContent = 'Speed x' + gameSpeed; S.click(); };

/* ---------- animated title screen ---------- */
const tcv = $('tc'), tctx = tcv.getContext('2d');
function palm(x, y, s, d) {
  const sw = Math.sin(T * 1.2 + x) * 4, tx = x + 20 * d + sw, ty = y - 170 * s;
  ctx.strokeStyle = '#7a4f24'; ctx.lineWidth = 12 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30 * d, y - 90 * s, tx, ty); ctx.stroke();
  for (let k = 0; k < 7; k++) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(-2.6 + k * .6 + Math.sin(T * 1.5 + k) * .05); ell(34 * s, 0, 40 * s, 9 * s, k % 2 ? '#2e9e4a' : '#43b05c', '#1b5e20'); ctx.restore(); }
  ell(tx - 6, ty + 8, 7 * s, 7 * s, '#6d4c41'); ell(tx + 6, ty + 10, 7 * s, 7 * s, '#6d4c41');
}
function drawTitleIfVisible() {
  if ($('title').classList.contains('hidden')) return;
  const old = ctx, c = tctx; ctx = c; const t = T, sx = 450, sy = 300;
  let g = c.createLinearGradient(0, 0, 0, 340); g.addColorStop(0, '#1d1457'); g.addColorStop(.45, '#c2417a'); g.addColorStop(.8, '#ff8a50'); g.addColorStop(1, '#ffd27a'); c.fillStyle = g; c.fillRect(0, 0, W, 340);
  for (let i = 0; i < 40; i++) { c.globalAlpha = .3 + .4 * Math.abs(Math.sin(t * 2 + i * 7)); c.fillStyle = '#fff'; c.fillRect((i * 97) % W, (i * 53) % 150, 2, 2); } c.globalAlpha = 1;
  g = c.createRadialGradient(sx, sy, 20, sx, sy, 260); g.addColorStop(0, 'rgba(255,240,170,.95)'); g.addColorStop(.3, 'rgba(255,190,90,.5)'); g.addColorStop(1, 'rgba(255,120,60,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 340);
  for (let i = 0; i < 16; i++) { const a = t * .1 + i * .3927; c.fillStyle = 'rgba(255,230,150,.10)'; c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, 400, a, a + .12); c.closePath(); c.fill(); }
  ell(sx, sy, 70, 70, '#fff3b0', '#ffd54f', 4);
  [[0, 70], [300, 110], [620, 50], [820, 130]].forEach((k, i) => { const x = ((k[0] + t * (7 + i * 2)) % (W + 200)) - 100; ell(x, k[1], 46, 13, 'rgba(255,220,220,.55)'); ell(x + 24, k[1] - 9, 28, 11, 'rgba(255,220,220,.55)'); });
  g = c.createLinearGradient(0, 335, 0, 410); g.addColorStop(0, '#1fa2c9'); g.addColorStop(1, '#0b5e86'); c.fillStyle = g; c.fillRect(0, 335, W, 80);
  for (let i = 0; i < 26; i++) { const y = 345 + (i % 5) * 14; c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo((i * 71 + t * 14) % (W + 60) - 30, y); c.lineTo((i * 71 + t * 14) % (W + 60) - 6, y); c.stroke(); }
  for (let i = 0; i < 12; i++) ell(sx + Math.sin(t * 2 + i) * 20, 342 + i * 6, 50 - i * 3, 2, 'rgba(255,236,150,' + (.5 - i * .035) + ')');
  g = c.createLinearGradient(0, 400, 0, H); g.addColorStop(0, '#f6dc9a'); g.addColorStop(1, '#d9a95b'); c.fillStyle = g; c.fillRect(0, 400, W, H - 400);
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 5; c.beginPath(); for (let x = 0; x <= W; x += 10) { const y = 402 + Math.sin(x * .03 + t * 2) * 4; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  palm(60, 470, 1.2, 1); palm(850, 480, 1.1, -1);
  const zt = ['beach', 'bucket', 'dj'];
  zt.forEach((ty, k) => { const x = W + 80 - ((t * 16 + k * 330) % (W + 260)); drawZombie({ type: ty, ph: t * 3 + k, t, armor: 1, maxArmor: 1, flash: 0, slow: 0, freeze: 0, dying: 0, eating: false }, x, 470); });
  ['sun', 'cannon', 'coconut', 'ice', 'surfer', 'bunker'].forEach((k, i) => drawPotato(k, 130 + i * 128, 520 + (i % 2) * 8, { ph: t + i, tier: 2, fire: 0, flash: 0, dis: 0, fort: 0, cheer: (t * .6 + i) % 3 < .35 ? .5 : 0, t: 0, fuse: 0 }));
  g = c.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, W * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,0,40,.45)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  ctx = old;
}
function updateTitle() { $('tstats').innerHTML = 'Coins: <b>' + save.coins + '</b> &nbsp;|&nbsp; Levels cleared: <b>' + save.cleared + '/' + LV.length + '</b>'; $('playBtn').textContent = save.cleared > 0 ? 'CONTINUE' : 'PLAY'; }

/* ---------- illustrated world map ---------- */
function showMap() {
  state = 'menu'; const ICON = ['&#127796;', '&#127750;', '&#127755;', '&#127769;', '&#10052;'], PX = [6, 28, 50, 72, 92], PY = [48, 18, 62, 24, 50];
  let h = '<div class="mapbar"><button class="big sm" id="mapBack">&lsaquo; BACK</button><h2>WORLD MAP</h2><span class="coin">Coins: ' + save.coins + '</span><button class="big alt sm" id="shopBtn">SHOP</button></div>';
  THEMES.forEach((t, w) => {
    h += '<div class="world w' + w + (w * 5 > save.cleared ? ' wlock' : '') + '"><div class="wname">' + ICON[w] + ' World ' + (w + 1) + ': ' + t.name + (t.night ? ' <small>(night)</small>' : '') + '</div>' +
      '<svg class="wpath" viewBox="0 0 500 100" preserveAspectRatio="none"><path d="M30,48 C85,48 85,18 140,18 S195,62 250,62 S305,24 360,24 S405,50 460,50" /></svg>';
    for (let j = 0; j < 5; j++) { const i = w * 5 + j, open = i <= save.cleared, done = i < save.cleared;
      h += '<button class="node' + (LV[i].boss ? ' boss' : '') + (done ? ' done' : '') + (i === save.cleared ? ' cur' : '') + (open ? '' : ' lock') + '" data-i="' + i + '" style="left:' + PX[j] + '%;top:' + PY[j] + '%" title="Level ' + (w + 1) + '-' + (j + 1) + '">' +
        (!open ? '&#128274;' : LV[i].boss ? '&#9760;' : done ? '&#9733;' : j + 1) + '<i>' + (w + 1) + '-' + (j + 1) + '</i></button>'; }
    h += '</div>'; });
  const m = $('map'); m.innerHTML = h; show('map');
  m.querySelectorAll('.node').forEach(b => b.onclick = () => { if (!b.classList.contains('lock')) { S.click(); showBrief(+b.dataset.i); } });
  $('shopBtn').onclick = () => { S.click(); showShop(); }; $('mapBack').onclick = () => { S.click(); show('title'); };
}

/* ---------- gentle procedural music (day = bright, night = slow and spooky) ---------- */
let mstep = 0;
setInterval(() => {
  if (muted || paused || !ac || ac.state !== 'running') return;
  const night = state === 'play' && isNight(), sc = night ? [220, 262, 330, 392, 330, 262, 247, 196] : [392, 440, 523, 659, 523, 440, 392, 330, 349, 392, 440, 523, 440, 392, 349, 294];
  sfx(sc[mstep % sc.length] * (night ? .5 : 1), night ? .9 : .45, night ? 'sine' : 'triangle', .016);
  if (mstep % 4 === 0) sfx(night ? 110 : 130, .6, 'sine', .02);
  mstep++;
}, 430);

/* ---------- wiring ---------- */
$('tsound').onclick = () => { $('muteBtn').click(); $('tsound').textContent = muted ? 'Sound: OFF' : 'Sound: ON'; };
updateTitle();

/* ================= V4: WORLD 5, GAME MODES, CONVEYOR, SECRET CHEATS ================= */
save.best = save.best || {}; save.cheats = save.cheats || {};
const ch = k => !!(save.cheats && save.cheats[k]);
const VOLCANO_SLOT_AT = 10;   // level index where the Volcano world starts: reaching it unlocks one extra deck slot
const deckMax = () => 8;   // hard cap: never more than 8 potatoes per deck

/* ---------- frost world ---------- */
Object.assign(E, { yeti: { hp: 900, sp: 12, pts: 260, sc: 1.25, dps: 32, name: 'Yeti Zombie' } });
Object.assign(ZDESC, { yeti: 'Huge, furry and slow. Bites very hard.' });
ZOM.yeti = z => {
  zb(z, { skin: '#e3f2fd', shirt: '#fafafa', pants: '#cfd8dc', tw: 58, shoe: '#90a4ae', deco: () => { for (let i = 0; i < 5; i++) ln(-22 + i * 11, -14 + (i % 2) * 14, -18 + i * 11, -6 + (i % 2) * 14, '#cfd8dc', 3); } });
  poly([[-20, -54], [-14, -70], [-6, -56], [2, -72], [10, -56], [18, -68], [18, -50]], '#eceff1', '#90a4ae');
};
function frostDecor() {
  const c = ctx;
  [[40, 34], [170, 48], [330, 30], [480, 52], [640, 38], [790, 46]].forEach(m => { poly([[m[0] - 70, Y0], [m[0], Y0 - m[1] - 8], [m[0] + 70, Y0]], '#b8d4ea', '#7aa3c4'); poly([[m[0] - 16, Y0 - m[1] + 10], [m[0], Y0 - m[1] - 8], [m[0] + 16, Y0 - m[1] + 10]], '#fff'); });
  c.fillStyle = '#fff'; c.fillRect(0, Y0, X0 - 8, 10);
  [[120, Y0 - 4], [560, Y0 - 3]].forEach(p => ell(p[0], p[1], 20, 10, '#e3f2fd', '#90caf9'));
}
function snowFx() { for (let i = 0; i < 44; i++) { const x = (i * 53 + T * (12 + (i % 4) * 3) + Math.sin(T + i) * 14) % W, y = (i * 37 + T * (30 + (i % 5) * 8)) % H; ell(x, y, 2.2, 2.2, 'rgba(255,255,255,.85)'); } }

/* ---------- difficulty scaling for endless-style modes ---------- */
const _wb = WaveManager.prototype.build;
WaveManager.prototype.build = function (w) {
  const q = _wb.call(this, w);
  if (G.endless) { for (let i = 0; i < Math.floor(w / 3); i++) q.push(pick(G.lv.pool)); if (w % 10 === 0) q.splice(Math.min(2, q.length), 0, 'boss'); }
  return q;
};

/* ---------- starting a mode ---------- */
let modeWorld = 0;
function randomDeck(world) {
  const night = !!THEMES[world].night, av = availCards().filter(k => !P[k].on && k !== 'sun' && !isSleepKind(k, night)), out = ['sun'];
  while (out.length < deckMax() && av.length) out.push(av.splice(Math.floor(Math.random() * av.length), 1)[0]);
  return out;
}
function beltItem() {
  const night = isNight(), av = availCards().filter(k => k !== 'sun' && k !== 'moon' && k !== 'sprout' && !isSleepKind(k, night));
  return pick(av.length ? av : ['cannon']);
}
function startMode(mode, world, deck) {
  newGame(0); const pool = [...new Set(LV.slice(world * 5, world * 5 + 5).flatMap(l => l.pool))], night = !!THEMES[world].night;
  Object.assign(G, { mode, endless: true, world, li: 6, lv: { pool, world, waves: Infinity, boss: false, newZ: null, unlock: null, diff: 6 }, conv: mode === 'conveyor', convSel: null, convWas: null });
  G.sun = 150 + 50 * save.sunLvl + (night ? 100 : 0);
  if (mode === 'random') deck = randomDeck(world);
  G.deck = (mode === 'conveyor' ? [] : deck || []).slice(0, deckMax()); G.modeDeck = G.deck.slice();
  if (G.conv) { G.sun = 1e9; G.belt = [beltItem(), beltItem(), beltItem()]; G.beltT = 3; }
  buildBg(world); state = 'play'; show(null); buildCards(); updateCards(); paused = false;
  if (G.conv) renderBelt();
  if (night) G.banner = { text: 'NIGHT FALLS...', t: 3 };
}
function renderBelt() {
  let b = $('belt'); if (!b) { b = document.createElement('div'); b.id = 'belt'; $('cards').prepend(b); }
  b.innerHTML = '<span class="blabel">CONVEYOR</span>';
  G.belt.forEach((k, i) => { const el = cardEl(k, true); el.removeAttribute('id'); el.classList.remove('poor'); const c = el.querySelector('.cost'); if (c) c.textContent = 'FREE'; if (G.convSel === i) el.classList.add('sel'); el.onclick = () => beltPick(i); b.appendChild(el); });
}
function beltPick(i) { if (state !== 'play' || !G.conv || i >= G.belt.length) return; S.click(); G.convSel = G.convSel === i ? null : i; G.sel = G.convSel === null ? null : G.belt[i]; renderBelt(); }
function beltTick(dt) {
  G.sun = 1e9; for (const k in G.cd) G.cd[k] = 0; G.beltT -= dt;
  if (G.beltT <= 0) { if (G.belt.length < 6) { G.belt.push(beltItem()); G.beltT = 4.2; renderBelt(); } else G.beltT = 1; }
}
cv.addEventListener('mousedown', () => { if (G && G.conv) { G.convWas = G.sel; for (const k in G.cd) G.cd[k] = 0; } }, true);
cv.addEventListener('mousedown', () => {
  if (!G || !G.conv || G.convSel == null) return;
  if (G.convWas && G.sel === null && G.belt[G.convSel] === G.convWas) { G.belt.splice(G.convSel, 1); G.convSel = null; for (const k in G.cd) G.cd[k] = 0; renderBelt(); }
});
document.addEventListener('keydown', e => { if (G && G.conv && state === 'play' && e.key >= '1' && e.key <= '6') beltPick(+e.key - 1); });

/* ---------- per-frame hooks (cheats + conveyor) ---------- */
const _up = update;
update = function (dt) {
  if (G && state === 'play') {
    if (ch('god')) G.resort = 100;
    if (ch('sun')) G.sun = Math.max(G.sun, 9999);
    if (ch('cd')) for (const k in G.cd) G.cd[k] = 0;
    if (ch('mood')) G.potatoes.forEach(p => { p.mood = 100; });
    if (ch('autosun')) G.suns.forEach(s => { if (!s.dead) { s.dead = true; G.sun += s.val; G.collected += s.val; G.score += 5; burst(s.x, s.y, '#fff59d', 6, 100); } });
    if (ch('autocoin')) G.coins.forEach(c => { if (!c.dead) collectCoin(c); });
    if (G.conv) beltTick(dt);
  }
  _up(dt);
};
const _de = dmgEnemy;
dmgEnemy = function (e, d, src) { _de(e, ch('dmg') ? d * 10 : d, src); };
const _uh = updateHud;
updateHud = function () { _uh(); if (G.endless) $('sWaves').textContent = '\u221E'; if (G.conv) $('sSun').textContent = '\u221E'; };

/* ---------- mode end screen ---------- */
const _eg = endGame;
endGame = function (win) {
  if (!G.mode) return _eg(win);
  if (state === 'over') return;
  state = 'over'; S.over(); const surv = Math.max(0, G.wm.active ? G.wm.wave - 1 : G.wm.wave), reward = surv * 6, mode = G.mode, world = G.world, md = G.modeDeck;
  const nb = surv > (save.best[mode] || 0); if (nb) save.best[mode] = surv; save.coins += reward; persist();
  const el = $('end'); el.classList.remove('hidden');
  el.innerHTML = '<h1>RESORT OVERRUN!</h1><div class="stats">' + ({ endless: 'ENDLESS', random: 'RANDOM UNITS', conveyor: 'RANDOMIZER' })[mode] + ' &mdash; ' + THEMES[world].name + '<br>WAVES SURVIVED: <b>' + surv + '</b>' + (nb ? ' &#127942; NEW BEST!' : '') +
    '<br>SCORE: <b>' + G.score + '</b><br>ENEMIES DEFEATED: <b>' + G.kills + '</b><br>COINS EARNED: <b>' + (G.coinsEarned + reward) + '</b></div><div class="row"><button class="big" id="againBtn">PLAY AGAIN</button><button class="big alt sm" id="mapBtn">GAME MODES</button></div>';
  $('againBtn').onclick = () => { S.click(); startMode(mode, world, md); };
  $('mapBtn').onclick = () => { S.click(); showModes(); };
};
$('menuBtn').onclick = () => { if (state !== 'play') return; S.click(); (G && G.mode) ? showModes() : showMap(); };

/* ---------- game modes screens ---------- */
function showModes() {
  state = 'menu'; modeWorld = Math.min(modeWorld, Math.floor(save.cleared / 5), THEMES.length - 1);
  let h = '<div class="mapbar"><button class="big sm" id="mBack">&lsaquo; BACK</button><h2>GAME MODES</h2><span class="coin">Coins: ' + save.coins + '</span></div><div class="sub">Pick an arena:</div><div class="row" id="worldPick">';
  THEMES.forEach((t, w) => { h += '<button class="big sm' + (w === modeWorld ? '' : ' alt') + (w * 5 <= save.cleared ? '' : ' dis') + '" data-w="' + w + '">' + (w + 1) + '. ' + t.name + '</button>'; });
  h += '</div><div class="modes">';
  [['endless', '&infin;', 'ENDLESS', 'Choose your units and survive as many waves as you can. A boss comes every 10 waves.'],
   ['random', '&#127922;', 'RANDOM UNITS', 'You are dealt 5 random units, always with a Sun maker. Adapt and survive!'],
   ['conveyor', '&#9881;', 'RANDOMIZER', 'No Sun Chips! Units ride a conveyor belt, one use each. Place them as they come.']].forEach(m => {
    h += '<div class="modecard"><div class="mi">' + m[1] + '</div><b>' + m[2] + '</b><small>' + m[3] + '</small><div class="best">Best: wave ' + (save.best[m[0]] || 0) + '</div><button class="big sm" data-m="' + m[0] + '">PLAY</button></div>'; });
  $('modes').innerHTML = h + '</div>'; show('modes');
  $('modes').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { if (b.classList.contains('dis')) return; S.click(); modeWorld = +b.dataset.w; showModes(); });
  $('modes').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { S.click(); const m = b.dataset.m; if (m === 'endless') endlessPick(); else startMode(m, modeWorld); });
  $('mBack').onclick = () => { S.click(); show('title'); };
}
function endlessPick() {
  briefLv = modeWorld * 5; const av = availCards(); pick7 = save.deck.filter(k => av.includes(k)).slice(0, deckMax()); if (!pick7.length) pick7 = av.slice(0, 2);
  $('brief').innerHTML = '<h2>ENDLESS &mdash; ' + THEMES[modeWorld].name + '</h2><div class="sub">Choose up to ' + deckMax() + ' potatoes (click a slot to remove):</div><div id="slots" class="prow"></div><div id="avail" class="prow"></div><div class="row"><button class="big" id="goBtn">START!</button><button class="big sm" id="bBack">BACK</button></div>';
  $('brief').classList.toggle('night', !!THEMES[modeWorld].night); show('brief'); renderPicker();
  $('goBtn').onclick = () => { if (pick7.length) { S.click(); save.deck = pick7.slice(); persist(); startMode('endless', modeWorld, pick7.slice()); } };
  $('bBack').onclick = () => { S.click(); showModes(); };
}
$('modesBtn').onclick = () => { S.click(); showModes(); };

/* ---------- secret cheat menu ---------- */
const CHEATS = [['autosun', 'Auto-collect Sun Chips', 'Every Sun Chip collects itself.'], ['autocoin', 'Auto-collect Coins', 'Coins jump straight into your wallet.'], ['sun', 'Infinite Sun', 'Sun Chips never run out.'],
  ['cd', 'No Cooldowns', 'Cards recharge instantly.'], ['mood', 'Max Vacation Mood', 'Every potato stays in VACATION MODE.'], ['dmg', 'Super Damage x10', 'Potatoes hit ten times harder.'], ['god', 'Resort Invincible', 'The resort cannot be damaged.']];
function showCheats() {
  state = 'menu'; let h = '<h2>SECRET CHEAT MENU</h2><div class="sub">Shh! Your toggles are saved.</div><div class="shoplist">';
  CHEATS.forEach(c => { const on = ch(c[0]); h += '<div class="item"><div><b>' + c[1] + '</b><br><small>' + c[2] + '</small></div><button class="big sm' + (on ? '' : ' alt') + '" data-c="' + c[0] + '">' + (on ? 'ON' : 'OFF') + '</button></div>'; });
  h += '<div class="item"><div><b>+1000 Coins</b></div><button class="big sm" id="chCoins">GET</button></div><div class="item"><div><b>Unlock Everything</b><br><small>All 25 levels, every potato and every upgrade card.</small></div><button class="big sm" id="chUnlock">DO IT</button></div></div><div class="row"><button class="big sm" id="chBack">BACK</button></div>';
  $('cheat').innerHTML = h; show('cheat');
  $('cheat').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { S.click(); save.cheats[b.dataset.c] = !save.cheats[b.dataset.c]; persist(); showCheats(); });
  $('chCoins').onclick = () => { save.coins += 1000; persist(); S.collect(); };
  $('chUnlock').onclick = () => { save.cleared = LV.length; save.unlocked = ['sun', 'cannon', 'bunker', 'ice', 'coconut', 'surfer', 'pepper', 'tiki', 'volcano', 'glow', 'moon', 'sprout', 'mine', 'lifebuoy', 'squash', 'triple', 'magnet', 'wave', 'party', 'sloth', 'flame', 'crab', 'firework', 'umbrella']; save.owned = ['twinsun', 'gatling', 'megabunker']; save.slot6 = true; persist(); S.collect(); };
  $('chBack').onclick = () => { S.click(); show('title'); };
}
let tagClicks = 0, tagT = 0, armed = 0, cbuf = '';
$('tag').onclick = () => {
  const n = performance.now(); if (n - tagT > 3000) tagClicks = 0; tagT = n; tagClicks++; sfx(300 + tagClicks * 90, .08, 'sine', .05);
  if (tagClicks >= 7) { tagClicks = 0; armed = n + 12000; cbuf = ''; $('tag').style.filter = 'hue-rotate(180deg) brightness(1.5)'; setTimeout(() => { $('tag').style.filter = ''; }, 700); sfx(880, .3, 'triangle', .06); }
};
document.addEventListener('keydown', e => {
  if (performance.now() > armed || $('title').classList.contains('hidden') || e.key.length !== 1) return;
  cbuf = (cbuf + e.key.toLowerCase()).slice(-5); if (cbuf === 'tater') { armed = 0; showCheats(); }
});

/* ================= NEW UNIT BEHAVIOUR ================= */
const flying = e => e.type === 'balloon' && e.fly !== false;
const _ps2 = potatoSpecial;
potatoSpecial = function (p, dt) {
  if (_ps2(p, dt)) return true;
  if (p.dis > 0) return false;
  const f = FIRE[p.tier] || 1, near = q => !q.dead && Math.abs(q.r - p.r) <= 1 && Math.abs(q.c - p.c) <= 1, remove = () => { p.dead = true; G.grid[p.r][p.c] = null; };
  switch (p.type) {
    case 'sprout':
      p.sp = (p.sp || 0) + dt * f;
      if (p.sp >= P.sprout.rate) { p.sp = 0; p.cheer = .5; G.suns.push(new Sun(p.x + rnd(-18, 18), p.y - 60, 15, false, p.y - 8)); }
      return true;
    case 'mine': {
      if (p.arm === undefined) p.arm = 6;
      if (p.arm > 0) { p.arm -= dt; if (p.arm <= 0) { ftext(p.x, p.y - 50, 'ARMED!', '#ff8a80', 14); ring(p.x, p.y - 10, '#ff5252', 40); } return true; }
      const trig = G.enemies.some(e => e.r === p.r && e.dying <= 0 && !flying(e) && e.x - p.x < 66 && e.x - p.x > -40);
      if (trig) {
        for (const e of G.enemies) if (e.r === p.r && e.dying <= 0 && Math.abs(e.x - p.x) < 90) dmgEnemy(e, 700, p);
        ring(p.x, p.y - 20, '#ff7043', 110); burst(p.x, p.y - 20, '#ffb74d', 26, 260); G.shake = Math.max(G.shake, .4); S.die(); remove();
      }
      return true;
    }
    case 'lifebuoy':
      p.hl = (p.hl || 0) + dt * f;
      if (p.hl >= P.lifebuoy.rate) {
        p.hl = 0; let any = false;
        for (const q of G.potatoes) if (near(q) && q.hp < q.max) { q.hp = Math.min(q.max, q.hp + 30); any = true; G.parts.push(new Particle(q.x, q.y - 70, { txt: '+', col: '#69f0ae', size: 18, vy: -35, life: .7 })); }
        if (any) { p.cheer = .5; ring(p.x, p.y - 40, '#69f0ae', 80); }
      }
      return true;
    case 'squash': {
      const j = p.jmp;
      if (j) {
        j.t += dt; const k = Math.min(1, j.t / .45); p.x = j.x0 + (j.tx - j.x0) * k; p.y = j.y0 - Math.sin(Math.PI * k) * 70;
        if (k >= 1) {
          p.y = j.y0;
          for (const e of G.enemies) if (e.r === p.r && e.dying <= 0 && Math.abs(e.x - p.x) < 60) dmgEnemy(e, 2000, p);
          ring(p.x, p.y - 10, '#fff3c4', 100); burst(p.x, p.y - 10, '#e8b878', 22, 240); G.shake = Math.max(G.shake, .5); S.die(); remove();
        }
        return true;
      }
      const t = G.enemies.find(e => e.r === p.r && e.dying <= 0 && !flying(e) && e.x > p.x - 20 && e.x - p.x < 130);
      if (t) { p.jmp = { t: 0, x0: p.x, y0: p.y, tx: t.x - 10 }; ftext(p.x, p.y - 90, 'SLAM!', '#ffeb3b', 15); S.ability(); }
      return true;
    }
    case 'triple': {
      const d = P.triple, rows = [p.r - 1, p.r, p.r + 1].filter(r => r >= 0 && r < ROWS);
      if (G.enemies.some(e => rows.includes(e.r) && e.dying <= 0 && e.x > p.x - 10 && e.x < W + 10)) {
        p.t += dt * f;
        if (p.t >= d.rate) { p.t = 0; rows.forEach(r => G.proj.push(new Proj(p.x + 32, Y0 + r * CH + CH - 12 - 34, r, 'triple', d.dmg * DMGM[p.tier], p, false))); p.fire = 1; p.mood = clamp(p.mood + .5, 0, 100); S.shoot(); }
      } else p.t = Math.min(p.t, d.rate * .6);
      return true;
    }
    case 'magnet': {
      p.mg = (p.mg === undefined ? P.magnet.rate : p.mg) + dt * f;
      if (p.mg >= P.magnet.rate) {
        const arm = G.enemies.filter(e => e.r === p.r && e.dying <= 0 && e.armor > 0 && e.x > p.x - 10 && e.x < W + 10);
        if (arm.length) { p.mg = 0; p.cheer = .6; S.hit(); for (const e of arm) { e.armor = 0; e.flash = .15; burst(e.x, e.yy() - 60, '#cfd8dc', 12, 160); ftext(e.x, e.yy() - 90, 'CLANK!', '#ffeb3b', 14); } }
        else p.mg = P.magnet.rate;
      }
      return true;
    }
    case 'wave': {
      p.wv = (p.wv === undefined ? P.wave.rate : p.wv) + dt * f;
      if (p.wv >= P.wave.rate) {
        const tg = G.enemies.filter(e => e.r === p.r && e.dying <= 0 && e.x > p.x && e.x < p.x + 330);
        if (tg.length) {
          p.wv = 0; p.cheer = .8; S.ability(); G.shake = Math.max(G.shake, .3);
          for (const e of tg) { e.knock = (e.knock || 0) + (e.type === 'boss' ? 40 : 110); e.slow = 3; dmgEnemy(e, 25, p); }
          ring(p.x + 40, p.y - 30, '#81d4fa', 90); for (let i = 0; i < 10; i++) burst(p.x + 40 + i * 30, p.y - 30, '#81d4fa', 3, 90);
        } else p.wv = P.wave.rate;
      }
      return true;
    }
    case 'sloth':
      for (const e of G.enemies) if (e.r === p.r && e.dying <= 0 && e.x > p.x - 30 && e.x < p.x + 150) e.slow = Math.max(e.slow, .25);
      return true;
    case 'flame': {
      const d = P.flame;
      if (G.enemies.some(e => e.r === p.r && e.dying <= 0 && e.x > p.x - 10 && e.x < W + 10)) {
        p.t += dt * f;
        if (p.t >= d.rate) { p.t = 0; G.proj.push(new Proj(p.x + 40, p.y - 34, p.r, 'flame', d.dmg * DMGM[p.tier], p, false)); p.fire = 1; p.mood = clamp(p.mood + .5, 0, 100); S.shoot(); }
      } else p.t = Math.min(p.t, d.rate * .6);
      return true;
    }
    case 'crab': {
      if (p.chew > 0) { p.chew -= dt; return true; }
      const t = G.enemies.find(e => e.r === p.r && e.dying <= 0 && !flying(e) && e.x - p.x < 80 && e.x - p.x > -15);
      if (t) { const boss = t.type === 'boss'; dmgEnemy(t, boss ? 450 : 99999, p); p.chew = boss ? 8 : 12; p.cheer = .6; ftext(p.x, p.y - 90, 'SNAP!', '#ffeb3b', 16); burst(p.x + 30, p.y - 30, '#ff8a65', 14, 180); S.hit(); }
      return true;
    }
    case 'firework':
      p.fw = (p.fw || 0) + dt;
      if (p.fw >= 1.2) {
        for (const e of G.enemies) if (e.dying <= 0 && e.x < W + 10) { dmgEnemy(e, 260, p); burst(e.x, e.yy() - 60, pick(['#ff4081', '#ffeb3b', '#40c4ff']), 10, 200); }
        for (let i = 0; i < 4; i++) ring(rnd(X0, W - 60), rnd(Y0 + 40, H - 80), pick(['#ff4081', '#ffeb3b', '#40c4ff', '#69f0ae']), 80);
        G.shake = Math.max(G.shake, .7); S.boss(); remove();
      }
      return true;
    case 'umbrella':
      return true;
    case 'party':
      for (const q of G.potatoes) if (near(q)) q.mood = clamp(q.mood + 4 * dt, 0, 100);
      if (Math.random() < dt * 2) G.parts.push(new Particle(p.x + rnd(-30, 30), p.y - 80, { txt: pick(['\u266A', '\u266B']), col: pick(['#ff80ab', '#80d8ff', '#ffff8d']), size: 16, vy: -35, life: .8 }));
      return true;
  }
  return false;
};

/* smooth knock-back (Wave Spud) */
const _eu = Enemy.prototype.update;
Enemy.prototype.update = function (dt) {
  if (this.knock > 0 && this.dying <= 0) { const s = Math.min(this.knock, 300 * dt); this.x = Math.min(W + 40, this.x + s); this.knock -= s; }
  _eu.call(this, dt);
};

/* umbrella shade + burn + pirate cannon + balloon flight */
const _pd = Potato.prototype.damage;
Potato.prototype.damage = function (d, flashy) {
  if (G.potatoes.some(u => u !== this && u.type === 'umbrella' && !u.dead && !(u.dis > 0) && Math.abs(u.r - this.r) <= 1 && Math.abs(u.c - this.c) <= 1)) d *= .6;
  _pd.call(this, d, flashy);
};
const _de2 = dmgEnemy;
dmgEnemy = function (e, d, src) { if (src && src.type === 'flame' && e.dying <= 0) e.burn = 4; _de2(e, d, src); };
const _eu2 = Enemy.prototype.update;
Enemy.prototype.update = function (dt) {
  if (this.dying <= 0) {
    if (this.burn > 0) {
      this.burn -= dt; this.hp -= 9 * dt; if (Math.random() < dt * 8) burst(this.x, this.yy() - 50, pick(['#ff7043', '#ffca28']), 1, 50);
      if (this.hp <= 0) { this.die(null); return; }
    }
    if (this.type === 'pirate') {
      this.pt = (this.pt === undefined ? 5 : this.pt) - dt;
      if (this.pt <= 0 && this.x < W - 20) {
        const tg = G.potatoes.filter(q => q.r === this.r && !q.dead && q.x < this.x - 25).sort((a, b) => b.x - a.x)[0];
        if (tg) { this.pt = 7; tg.damage(40, true); ftext(this.x - 30, this.yy() - 80, 'CANNONBALL!', '#ffcc80', 13); ring(tg.x, tg.y - 40, '#ff8a65', 50); burst(tg.x, tg.y - 40, '#8d6e63', 8, 140); S.hit(); }
      }
    }
    if (this.type === 'balloon' && this.fly !== false) {
      this.flash -= dt; this.slow -= dt; this.freeze -= dt;
      let sp = E.balloon.sp * G.speedScale; if (this.slow > 0) sp *= .5; if (this.freeze > 0) sp = 0;
      this.x -= sp * dt; this.ph += dt * 2;
      if (this.knock > 0) { const k = Math.min(this.knock, 300 * dt); this.x = Math.min(W + 40, this.x + k); this.knock -= k; }
      if (this.hp < this.maxhp * .55) { this.fly = false; ftext(this.x, this.yy() - 90, 'POP!', '#ff8a80', 16); burst(this.x, this.yy() - 90, '#ff5252', 12, 160); }
      if (this.x < X0 - 10) { this.gone = true; G.hitResort(this); }
      return;
    }
  }
  _eu2.call(this, dt);
};

/* make sure saves that already passed a level own its reward (unlock order changed) */
LV.forEach((l, i) => { if (l.unlock && i < save.cleared && !save.unlocked.includes(l.unlock)) save.unlocked.push(l.unlock); });
persist();

/* up to 7 cards + rake + shovel: let the in-game card bar shrink to fit */
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '#cards{flex-wrap:nowrap}#cards>.card{flex:1 1 0;min-width:0;max-width:122px}' }));

/* ================= V5: LANGUAGE SWITCHER (EN / FR) + RICHER POTATO ART ================= */
let LANG = 'en'; try { LANG = localStorage.getItem('pp_lang') === 'fr' ? 'fr' : 'en'; } catch (e) { /* ignore */ }
const FR = {
  'Score': 'Score', 'Sun Chips': 'Chips solaires', 'Wave': 'Vague', 'Coins': 'Pièces', 'Resort HP': 'PV du resort', 'Enemies': 'Ennemis', 'Pause': 'Pause', 'Resume': 'Reprendre', 'Menu': 'Menu',
  'Sound ON': 'Son activé', 'Sound OFF': 'Son coupé', 'Sound: ON': 'Son : activé', 'Sound: OFF': 'Son : coupé', 'Coins:': 'Pièces :', '| Levels cleared:': '| Niveaux terminés :',
  'Pick a potato card, then click a lawn square. Click falling Sun Chips to collect them. Keys 1-8 pick cards, S = shovel, R = rake, P = pause, ESC cancels. Click coins too! At night, day spuds sleep.': 'Choisis une carte patate, puis clique sur une case de la pelouse. Clique sur les Chips solaires qui tombent pour les ramasser. Touches 1-8 : cartes, S : pelle, R : râteau, P : pause, ÉCHAP : annuler. Clique aussi sur les pièces ! La nuit, les patates de jour dorment.',
  'POTATO': 'PATATE', 'PARADISE': 'PARADIS', 'SPUD VACATION DEFENSE': 'DÉFENSE DES PATATES EN VACANCES', 'Save the vacation. Defend the resort.': 'Sauve les vacances. Défends le resort.',
  'PLAY': 'JOUER', 'CONTINUE': 'CONTINUER', 'GAME MODES': 'MODES DE JEU', 'HOW TO PLAY': 'COMMENT JOUER', 'BACK': 'RETOUR', '‹ BACK': '‹ RETOUR', 'WORLD MAP': 'CARTE DU MONDE', 'SELECT LEVEL': 'CHOISIR UN NIVEAU', 'SHOP': 'BOUTIQUE', '(night)': '(nuit)',
  'BOSS': 'BOSS', 'done': 'fini', 'locked': 'verrouillé', "LET'S ROCK!": 'C’EST PARTI !', 'START!': 'DÉMARRER !', 'CONVEYOR': 'CONVOYEUR', 'FREE': 'GRATUIT', 'Free': 'Gratuit',
  'Sleeps at night': 'Dort la nuit', 'Sleeps by day': 'Dort le jour', 'Pick an arena:': 'Choisis une arène :',
  'NIGHT LEVEL: no Sun Chips fall from the sky! ☀ Day spuds (Surfer, Coconut, Ice) fall asleep. ☾ Glow and Moon Spuds wake up!': 'NIVEAU DE NUIT : aucun Sun Chip ne tombe du ciel ! ☀ Les patates de jour (Surfeuse, Coco, Glacée) s’endorment. ☾ Les Patates Lumineuse et Lune se réveillent !',
  'ENDLESS': 'INFINI', 'RANDOM UNITS': 'UNITÉS ALÉATOIRES', 'RANDOMIZER': 'RANDOMISEUR',
  'Choose your units and survive as many waves as you can. A boss comes every 10 waves.': 'Choisis tes unités et survis au plus de vagues possible. Un boss arrive toutes les 10 vagues.',
  'You are dealt 5 random units, always with a Sun maker. Adapt and survive!': 'Tu reçois 5 unités aléatoires, toujours avec un producteur de soleil. Adapte-toi et survis !',
  'No Sun Chips! Units ride a conveyor belt, one use each. Place them as they come.': 'Pas de Sun Chips ! Les unités arrivent sur un tapis roulant, un seul usage chacune. Place-les à mesure qu’elles arrivent.',
  'BEACH SHOP': 'BOUTIQUE DE PLAGE', 'Zombies drop coins sometimes. Click them fast!': 'Les zombies lâchent parfois des pièces. Clique vite dessus !', 'OWNED': 'ACQUIS',
  'Rake (x1)': 'Râteau (x1)', 'Sun Stash +50': 'Réserve de soleil +50', 'Resort Fortify': 'Resort fortifié', 'Twin Sun card': 'Carte Double Soleil', 'Gatling Spud card': 'Carte Patate Gatling', 'Mega Bunker card': 'Carte Méga Bunker', '6th Deck Slot': '6e emplacement de deck',
  'The resort takes 25% less damage from zombies. Permanent.': 'Le resort subit 25 % de dégâts en moins. Permanent.',
  'Upgrade card: plant on a SunSpud to double its chips.': 'Carte d’amélioration : à planter sur une PatateSoleil pour doubler ses chips.',
  'Upgrade card: plant on a Cannon Spud for rapid fire. (needs a Cannon Spud)': 'Carte d’amélioration : à planter sur une Patate Canon pour un tir rapide. (il faut une Patate Canon)',
  'Upgrade card: plant on a Bunker Spud for triple HP. (needs a Bunker Spud)': 'Carte d’amélioration : à planter sur une Patate Bunker pour tripler ses PV. (il faut une Patate Bunker)',
  'Bring 6 potatoes into every level and mode instead of 5. You also get one more slot for free when you reach the Volcano world.': 'Emmène 6 patates dans chaque niveau et mode au lieu de 5. Tu gagnes aussi un emplacement gratuit en atteignant le monde du Volcan.',
  'VACATION SAVED!': 'VACANCES SAUVÉES !', 'GAME OVER': 'PARTIE PERDUE', 'RESORT OVERRUN!': 'RESORT ENVAHI !', 'NEXT LEVEL': 'NIVEAU SUIVANT', 'PLAY AGAIN': 'REJOUER', 'LEVEL MAP': 'CARTE DES NIVEAUX',
  'FINAL SCORE:': 'SCORE FINAL :', 'SCORE:': 'SCORE :', 'HIGHEST WAVE:': 'MEILLEURE VAGUE :', 'WAVE REACHED:': 'VAGUE ATTEINTE :', 'WAVES SURVIVED:': 'VAGUES SURVÉCUES :', 'ENEMIES DEFEATED:': 'ENNEMIS VAINCUS :', 'COINS EARNED:': 'PIÈCES GAGNÉES :',
  'NEW POTATO UNLOCKED:': 'NOUVELLE PATATE DÉBLOQUÉE :', 'YOU SAVED THE WHOLE VACATION!': 'TU AS SAUVÉ TOUTES LES VACANCES !', '🏆 NEW BEST!': '🏆 NOUVEAU RECORD !', '!': '!',
  'SECRET CHEAT MENU': 'MENU SECRET DES TRICHES', 'Shh! Your toggles are saved.': 'Chut ! Tes réglages sont sauvegardés.', 'ON': 'OUI', 'OFF': 'NON', 'GET': 'PRENDRE', 'DO IT': 'ALLEZ !', '+1000 Coins': '+1000 pièces', 'Unlock Everything': 'Tout débloquer',
  'All 25 levels, every potato and every upgrade card.': 'Les 25 niveaux, toutes les patates et toutes les cartes d’amélioration.',
  'Auto-collect Sun Chips': 'Ramassage auto des Sun Chips', 'Every Sun Chip collects itself.': 'Chaque Sun Chip se ramasse tout seul.', 'Auto-collect Coins': 'Ramassage auto des pièces', 'Coins jump straight into your wallet.': 'Les pièces sautent directement dans ta bourse.',
  'Infinite Sun': 'Soleil infini', 'Sun Chips never run out.': 'Les Sun Chips ne s’épuisent jamais.', 'No Cooldowns': 'Sans recharge', 'Cards recharge instantly.': 'Les cartes se rechargent instantanément.',
  'Max Vacation Mood': 'Humeur vacances max', 'Every potato stays in VACATION MODE.': 'Toutes les patates restent en MODE VACANCES.', 'Super Damage x10': 'Super dégâts x10', 'Potatoes hit ten times harder.': 'Les patates frappent dix fois plus fort.',
  'Resort Invincible': 'Resort invincible', 'The resort cannot be damaged.': 'Le resort est indestructible.',
  'BOSS WAVE!': 'VAGUE DE BOSS !', 'THE GIANT VACATION ZOMBIE!': 'LE ZOMBIE GÉANT DES VACANCES !', 'NIGHT FALLS...': 'LA NUIT TOMBE...', 'GIANT VACATION ZOMBIE': 'ZOMBIE GÉANT DES VACANCES', 'PAUSED': 'PAUSE', 'Press P or click Resume': 'Appuie sur P ou clique sur Reprendre',
  'NIGHT: no Sun Chips from the sky': 'NUIT : pas de Sun Chips du ciel', 'CLANG!': 'CLANG !', 'RESORT HIT!': 'RESORT TOUCHÉ !', 'Occupied!': 'Occupé !', 'Need more Sun Chips!': 'Pas assez de Sun Chips !', 'Recharging...': 'Recharge...', 'Disabled!': 'Désactivée !',
  'Bye bye, spud!': 'Adieu, patate !', 'VACATION MODE!': 'MODE VACANCES !', 'SUN BURST!': 'ÉCLAT SOLAIRE !', 'SUPER SPUD!': 'SUPER PATATE !', 'COCO BARRAGE!': 'TIR DE COCOS !', 'FREEZE PARTY!': 'FÊTE GIVRÉE !', 'WIPEOUT!': 'CHUTE LIBRE !', 'BEACH FORT!': 'FORT DE PLAGE !',
  'ARMED!': 'ARMÉE !', 'SLAM!': 'BAM !', 'CLANK!': 'CLONK !', 'SNAP!': 'CROC !', 'CANNONBALL!': 'BOULET !', 'POP!': 'POP !', 'BOING!': 'BOING !', 'DISTRACTED!': 'DISTRAITE !', 'BOSS BEACH SLAM!': 'CLAQUE DU BOSS !',
  'Sunny Beach': 'Plage ensoleillée', 'Rooftop Resort': 'Resort sur le toit', 'Volcano Island': 'Île du Volcan', 'Moonlit Lagoon': 'Lagon au clair de lune', 'Frostbite Peak': 'Pic glacial'
};
const FRP = {
  sun: ['PatateSoleil', 'Produit des Sun Chips. Capacité : Éclat solaire'], cannon: ['Patate Canon', 'Tire des boulets de patate. Capacité : Super patate'], coconut: ['Patate Coco', 'Dégâts de zone. Capacité : Tir de cocos'],
  ice: ['Patate Glacée', 'Ralentit les zombies. Capacité : Fête givrée'], surfer: ['Patate Surfeuse', 'Tir rapide. Capacité : Rafale de la vague'], bunker: ['Patate Bunker', 'Mur ultra solide. Capacité : Fort de plage'],
  pepper: ['Patate Piment', 'BOUM ! Explose en 3x3 peu après la plantation'], tiki: ['Patate Tiki', 'Mur solide qui blesse les zombies qui la mordent'], volcano: ['Patate Volcan', 'Déclenche une énorme coulée de lave dans la rangée, puis s’en va'],
  twinsun: ['Double Soleil', 'AMÉLIORATION : à planter sur une PatateSoleil pour doubler les chips'], gatling: ['Patate Gatling', 'AMÉLIORATION : à planter sur une Patate Canon pour un tir rapide'], megabunker: ['Méga Bunker', 'AMÉLIORATION : à planter sur une Patate Bunker pour tripler les PV'],
  shovel: ['Pelle', 'Déterre une patate dont tu ne veux plus'], rake: ['Râteau', 'Tue le premier zombie qui marche dessus'], sprout: ['Patate Pousse', 'Petite aide qui fait de petits Sun Chips'], mine: ['Patate Mine', 'S’arme en 6 s puis fait exploser les zombies proches'],
  lifebuoy: ['Patate Bouée', 'Soigne les patates autour d’elle'], squash: ['Patate Écrasante', 'Bondit sur le zombie le plus proche et l’aplatit'], triple: ['Patate Triple', 'Tire dans trois rangées à la fois'], magnet: ['Patate Aimant', 'Arrache l’armure des zombies de sa rangée'],
  wave: ['Patate Vague', 'Repousse les zombies le long de sa rangée'], party: ['Patate Fêtarde', 'Sa danse réjouit les patates voisines'], sloth: ['Patate Paresseuse', 'Son aura paresseuse ralentit les zombies proches'], flame: ['Patate Flamme', 'Tirs de feu qui continuent de brûler les zombies'],
  crab: ['Patate Crabe', 'Gobe un zombie entier puis mâche un bon moment'], firework: ['Patate Feu d’Artifice', 'BOUM ! Frappe tous les zombies de la pelouse'], umbrella: ['Patate Parasol', 'Fait de l’ombre aux voisines : elles subissent moins de dégâts'],
  glow: ['Patate Lumineuse', 'UNIQUEMENT LA NUIT. Tirs lumineux bon marché, courte portée'], moon: ['Patate Lune', 'UNIQUEMENT LA NUIT. Produit des Sun Chips sous la lune']
};
const FRE = {
  beach: ['Zombie de plage', 'Zombie de base.'], lifeguard: ['Zombie maître-nageur', 'Lent et résistant.'], surfer: ['Zombie surfeur', 'Rapide, et accélère près du resort.'], bucket: ['Zombie seau', 'L’armure de seau absorbe les dégâts en premier.'],
  seagull: ['Zombie mouette', 'Désactive une patate pendant 5 s.'], tourist: ['Zombie touriste', 'Très lent, énormément de PV.'], boss: ['ZOMBIE GÉANT DES VACANCES', 'BOSS ! Frappe le sol et désactive les patates.'],
  dj: ['Zombie DJ', 'Sa radio accélère les zombies proches !'], pogo: ['Zombie pogo', 'Saute par-dessus ta première patate.'], medic: ['Zombie infirmier', 'Soigne les zombies proches.'], lava: ['Zombie lave', 'Explose à sa défaite et brûle les patates !'],
  imp: ['Zombie lutin', 'Minuscule et rapide. Arrive en essaim.'], pirate: ['Zombie pirate', 'Tire des boulets sur tes patates à distance.'], sumo: ['Zombie sumo', 'Énormément de PV et une morsure écrasante.'], balloon: ['Zombie ballon', 'Flotte au-dessus des patates jusqu’à subir assez de dégâts.'],
  ghost: ['Zombie fantôme', 'Flotte, rapide et effrayant.'], mummy: ['Zombie momie', 'Bien emmailloté. Très résistant et lent.'], yeti: ['Zombie yéti', 'Énorme, poilu et lent. Mord très fort.']
};
const frag = d => d.split('.')[0].split(':').pop().trim();
Object.keys(FRP).forEach(k => { const d = P[k]; if (!d) return; FR[d.name] = FRP[k][0]; FR[d.desc] = FRP[k][1]; FR[frag(d.desc)] = frag(FRP[k][1]); });
Object.keys(FRE).forEach(k => { if (E[k]) FR[E[k].name] = FRE[k][0]; if (ZDESC[k]) FR[ZDESC[k]] = FRE[k][1]; });
const RX = [
  [/^Speed x(\d)$/, n => 'Vitesse x' + n], [/^(.*)World (\d+): (.+)$/, (p, n, m) => p + 'Monde ' + n + ' : ' + tr(m)], [/^Level (\d+)-(\d+)$/, (a, b) => 'Niveau ' + a + '-' + b],
  [/^LEVEL (\d+)-(\d+) — (.+)$/, (a, b, m) => 'NIVEAU ' + a + '-' + b + ' — ' + tr(m)], [/^Level (\d+)-(\d+) complete!$/, (a, b) => 'Niveau ' + a + '-' + b + ' terminé !'],
  [/^Level (\d+)-(\d+): the zombies stormed the resort!$/, (a, b) => 'Niveau ' + a + '-' + b + ' : les zombies ont pris d’assaut le resort !'],
  [/^(\d+) waves( \+ BOSS)?(?: • Reward: (.+))?$/, (n, b, r) => n + ' vagues' + (b || '') + (r ? ' • Récompense : ' + tr(r) : '')],
  [/^Choose up to (\d+) potatoes \(click a slot to remove\):$/, n => 'Choisis jusqu’à ' + n + ' patates (clique sur un emplacement pour retirer) :'],
  [/^Coins: (\d+)$/, n => 'Pièces : ' + n], [/^(\d+) coins$/, n => n + ' pièces'], [/^\+(\d+) coins$/, n => '+' + n + ' pièces'], [/^Best: wave (\d+)$/, n => 'Record : vague ' + n], [/^WAVE (\d+)$/, n => 'VAGUE ' + n],
  [/^Wave cleared! \+(\d+)$/, n => 'Vague terminée ! +' + n], [/^Next wave in (\d+)s — build your defenses!$/, n => 'Prochaine vague dans ' + n + ' s — prépare tes défenses !'],
  [/^NEW WORLD UNLOCKED: (.+)!$/, m => 'NOUVEAU MONDE DÉBLOQUÉ : ' + tr(m) + ' !'], [/^(ENDLESS|RANDOM UNITS|RANDOMIZER) — (.+)$/, (a, m) => tr(a) + ' — ' + tr(m)], [/^(\d+)\. (.+)$/, (n, m) => n + '. ' + tr(m)],
  [/^Place on the lawn: .*You own (\d+)\.$/, n => 'À poser sur la pelouse : tue le premier zombie qui marche dessus (les boss subissent de gros dégâts). Tu en possèdes ' + n + '.'],
  [/^Start every level with \+50 Sun Chips\. Level (\d+)\/4\.$/, n => 'Commence chaque niveau avec +50 Sun Chips. Niveau ' + n + '/4.']
];
const HOW_FR = '<li><b>Sun Chips :</b> ils paient les patates. Ils tombent du ciel et les PatateSoleil en produisent. Clique dessus !</li><li><b>Niveaux :</b> 25 niveaux dans 5 mondes. Avant chaque niveau, tu vois les zombies à venir et tu choisis jusqu’à <b>8 patates</b>. Gagner débloque de nouvelles patates et le niveau suivant.</li><li><b>Modes de jeu :</b> <b>Infini</b> (choisis tes unités, survis sans fin), <b>Unités aléatoires</b> (un deck aléatoire avec toujours un producteur de soleil) et <b>Randomiseur</b> (pas de soleil : place des unités gratuites à usage unique venues d’un tapis roulant).</li><li><b>Rangées :</b> les zombies marchent de droite à gauche ; les patates ne tirent que dans leur rangée.</li><li><b>Pièces :</b> les zombies lâchent parfois des pièces. Dépense-les à la <b>Boutique</b> : râteaux, soleil de départ, armure du resort et <b>cartes d’amélioration</b> (Double Soleil, Gatling, Méga Bunker).</li><li><b>Humeur vacances :</b> les victoires et la sécurité font monter l’humeur d’une patate ; morsures, coups au resort et amies tombées la font baisser. Plus d’humeur = plus rapide et plus fort !</li><li><b>Monde de nuit :</b> aucun Sun Chip ne tombe du ciel ! Les patates de jour (&#9728; Surfeuse, Coco, Glacée) s’endorment, tandis que les patates de nuit (&#9790; Lumineuse, Lune) se réveillent. Les Patates Lune produisent tes Sun Chips.</li><li><b>Commandes :</b> P met en pause, le bouton Vitesse accélère, S est la pelle.</li><li><b>Défaite</b> si le resort tombe à 0 PV. <b>Victoire</b> en survivant à toutes les vagues. Un boss tous les 5 niveaux !</li>';
const HOW_EN = $('how').querySelector('ul').innerHTML, trc = new Map(), orig = new WeakMap(), NOL = /[A-Za-zÀ-ÿ]/;
function tr(s) {
  if (LANG !== 'fr' || !s || !NOL.test(s)) return s;
  let o = trc.get(s); if (o !== undefined) return o;
  const m = s.replace(/\u00a0/g, ' ').match(/^(\s*)([\s\S]*?)(\s*)$/), c = m[2]; let r = FR[c];
  if (r === undefined) for (const x of RX) { const k = c.match(x[0]); if (k) { r = x[1](...k.slice(1)); break; } }
  o = r === undefined ? s : m[1] + r + m[3]; if (trc.size > 600) trc.clear(); trc.set(s, o); return o;
}
function trTitle(s) {
  let m = s.match(/^(.+?) \((\d+) chips\): ([\s\S]*)$/); if (m) return tr(m[1]) + ' (' + m[2] + ' puces) : ' + tr(m[3]);
  m = s.match(/^(Shovel|Rake): ([\s\S]*)$/); return m ? tr(m[1]) + ' : ' + tr(m[2]) : tr(s);
}
function trNode(n) {
  const r = orig.get(n), v = n.nodeValue; if (LANG === 'en' && !r) return; if (/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName)) return;
  const en = r && v === r.out ? r.en : v, out = tr(en); orig.set(n, { en, out }); if (out !== v) n.nodeValue = out;
}
function trEl(el) {
  const t = el.getAttribute('title'); if (t == null) return;
  const en = el.dataset.t0 !== undefined && t === el.dataset.t1 ? el.dataset.t0 : t, out = LANG === 'fr' ? trTitle(en) : en;
  el.dataset.t0 = en; el.dataset.t1 = out; if (out !== t) el.setAttribute('title', out);
}
function walk(root) {
  if (root.nodeType === 3) { trNode(root); return; } if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) trNode(n);
  if (root.hasAttribute('title')) trEl(root); root.querySelectorAll('[title]').forEach(trEl);
}
new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') trNode(m.target); else if (m.type === 'attributes') trEl(m.target); else m.addedNodes.forEach(walk); } })
  .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title'] });
['fillText', 'strokeText'].forEach(f => { const o = CanvasRenderingContext2D.prototype[f]; CanvasRenderingContext2D.prototype[f] = function (t, ...a) { return o.call(this, LANG === 'fr' ? tr(String(t)) : t, ...a); }; });
function setLang(l) {
  LANG = l; try { localStorage.setItem('pp_lang', l); } catch (e) { /* ignore */ }
  document.documentElement.lang = l; trc.clear(); $('how').querySelector('ul').innerHTML = l === 'fr' ? HOW_FR : HOW_EN;
  document.title = l === 'fr' ? 'Potato Paradise : Défense des patates en vacances' : 'Potato Paradise: Spud Vacation Defense';
  document.querySelectorAll('#lang button').forEach(b => b.classList.toggle('on', b.dataset.l === l)); walk(document.body);
}
document.querySelectorAll('#lang button').forEach(b => b.onclick = () => { S.click(); setLang(b.dataset.l); b.blur(); });
setLang(LANG);

/* ---------- V5 potato art: shaded skin, glossy eyes, blush, toothy smiles ---------- */
const hx = c => [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16));
const mixc = (a, b, t) => { const p = hx(a), q = hx(b); return 'rgb(' + p.map((v, i) => Math.round(v + (q[i] - v) * t)).join() + ')'; };
blob = function (w, h, col, dark) {
  const p = new Path2D();
  p.moveTo(-w * .45, -h * .1); p.bezierCurveTo(-w * .55, -h * .5, -w * .1, -h * .55, w * .15, -h * .5); p.bezierCurveTo(w * .5, -h * .5, w * .58, -h * .1, w * .5, h * .15);
  p.bezierCurveTo(w * .48, h * .5, w * .1, h * .52, -w * .15, h * .5); p.bezierCurveTo(-w * .55, h * .5, -w * .58, h * .1, -w * .45, -h * .1); p.closePath();
  ctx.save(); const g = ctx.createRadialGradient(-w * .18, -h * .25, 2, 0, 0, Math.max(w, h) * .7);
  g.addColorStop(0, mixc(col, '#ffffff', .45)); g.addColorStop(.45, col); g.addColorStop(1, dark); ctx.fillStyle = g; ctx.fill(p); ctx.clip(p);
  const rim = ctx.createRadialGradient(0, 0, Math.min(w, h) * .3, 0, 0, Math.max(w, h) * .62); rim.addColorStop(0, 'rgba(70,35,10,0)'); rim.addColorStop(1, 'rgba(70,35,10,.32)'); ctx.fillStyle = rim; ctx.fillRect(-w, -h, w * 2, h * 2);
  ell(0, h * .12, w * .3, h * .26, 'rgba(255,248,225,.22)');
  [[.15, .1, 2.2], [-.24, .2, 1.8], [.27, -.18, 2], [-.08, -.3, 1.6], [.2, .3, 1.7]].forEach(s => { ell(s[0] * w, s[1] * h, s[2] + 1, s[2], 'rgba(70,35,10,.35)'); ell(s[0] * w, s[1] * h + 1.4, s[2], s[2] * .6, 'rgba(255,255,255,.22)'); });
  ell(-w * .2, -h * .27, w * .13, h * .07, 'rgba(255,255,255,.55)'); ell(-w * .31, -h * .15, w * .035, h * .035, 'rgba(255,255,255,.6)');
  ctx.restore(); ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.strokeStyle = mixc(dark, '#2a1608', .62); ctx.stroke(p);
};
eyes = function (sp, y, o, big) {
  const r = big || 6;
  [-sp, sp].forEach(x => {
    if (o.blink) { ctx.beginPath(); ctx.arc(x, y - 1, r * .8, .15, Math.PI - .15); ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2.5; ctx.stroke(); }
    else { ell(x, y, r, r * 1.3, '#fff', '#3a2410', 2); ell(x + 1.3, y + 1, r * .62, r * .86, '#7a4a1e'); ell(x + 1.5, y + 1.3, r * .36, r * .5, '#150a02'); ell(x + .2, y - r * .35, r * .26, r * .26, '#fff'); ell(x + 2.6, y + r * .5, r * .13, r * .13, 'rgba(255,255,255,.8)'); }
    if (o.tier > 0) ell(x + Math.sign(x || 1) * r * .35, y + r * 1.5 + 3, r * .75, r * .42, 'rgba(255,100,120,.33)');
  });
};
mouth = function (y, tier, hurt) {
  ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.strokeStyle = '#3a2410'; ctx.beginPath();
  if (hurt) { ctx.ellipse(0, y + 2, 4.5, 5.5, 0, 0, 7); ctx.fillStyle = '#5a1515'; ctx.fill(); ctx.stroke(); ell(0, y + 5, 2.6, 1.8, '#e57373'); return; }
  if (tier >= 2) {
    ctx.arc(0, y - 3, 9.5, .05, Math.PI - .05); ctx.closePath(); ctx.fillStyle = '#7a1f2a'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(-10, y - 5, 20, 4.5); ell(0, y + 8, 5.5, 3.6, '#ff8a80'); ctx.restore();
    ctx.beginPath(); ctx.arc(0, y - 3, 9.5, .05, Math.PI - .05); ctx.closePath(); ctx.stroke();
  } else if (tier === 1) { ctx.arc(0, y - 3, 6.5, .25, Math.PI - .25); ctx.stroke(); }
  else { ctx.arc(0, y + 7, 6.5, Math.PI + .3, -.3); ctx.stroke(); }
};
POT.sun = o => {
  FEET(12, '#c98a45'); const w = Math.sin(o.ph * 4) * 4;
  ln(-26, 2, -40, -8 + w, '#d79a4c', 6); ln(26, 2, 40, -8 - w, '#d79a4c', 6); ell(-41, -9 + w, 5, 5, '#e3ac5e', '#5a3a1a', 1.5); ell(41, -9 - w, 5, 5, '#e3ac5e', '#5a3a1a', 1.5);
  blob(56, 64, '#f6d894', '#d79a4c');
  ctx.beginPath(); ctx.moveTo(-25, 12); ctx.quadraticCurveTo(0, 5, 25, 12); ctx.lineTo(23, 29); ctx.quadraticCurveTo(0, 36, -23, 29); ctx.closePath(); ctx.fillStyle = '#ff7043'; ctx.fill(); ctx.strokeStyle = '#8e2b0e'; ctx.lineWidth = 2; ctx.stroke();
  [[-12, 20], [3, 25], [15, 18]].forEach(p => { ell(p[0], p[1], 4, 4, '#fff59d'); ell(p[0], p[1], 1.5, 1.5, '#e53935'); });
  const lg = ctx.createLinearGradient(0, -14, 0, -1); lg.addColorStop(0, '#455a64'); lg.addColorStop(1, '#10151a');
  rr(-23, -14, 19, 13, 5, lg, '#000'); rr(4, -14, 19, 13, 5, lg, '#000'); ln(-5, -9, 5, -9, '#000', 3); ln(-20, -11, -14, -11, 'rgba(255,255,255,.75)', 2); ln(7, -11, 13, -11, 'rgba(255,255,255,.75)', 2);
  mouth(10, o.tier, o.hurt);
  ell(0, -30, 40, 9, '#f2c94c', '#8d6e1c'); ctx.beginPath(); ctx.arc(0, -32, 19, Math.PI, 0); ctx.fillStyle = '#ffd95e'; ctx.fill(); ctx.strokeStyle = '#8d6e1c'; ctx.lineWidth = 2; ctx.stroke();
  for (let i = -3; i <= 3; i++) ln(i * 5, -31, i * 4.2, -48 + Math.abs(i), 'rgba(141,110,28,.35)', 1.2);
  rr(-19, -38, 38, 7, 2, '#e53935', '#8e1b1b');
  for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(15, -36); ctx.rotate(i * 1.257); ell(0, -5, 3.2, 5, '#ff80ab', '#c2185b', 1); ctx.restore(); } ell(15, -36, 2.5, 2.5, '#ffeb3b');
  if (o.t > 5.5 || o.cheer > 0) for (let i = 0; i < 8; i++) { const a = o.ph * 2 + i * .785; ln(Math.cos(a) * 44, Math.sin(a) * 44 - 4, Math.cos(a) * 54, Math.sin(a) * 54 - 4, '#ffee58', 3); }
};
POT.cannon = o => {
  FEET(16, '#c08040'); ln(-32, 2, -42, 8, '#c08040', 6); ell(-43, 9, 5, 5, '#d09a58', '#5a3a1a', 1.5);
  blob(72, 56, '#eab97a', '#bf8440');
  const bg = ctx.createLinearGradient(0, -8, 0, 12); bg.addColorStop(0, '#90a4ae'); bg.addColorStop(.5, '#546e7a'); bg.addColorStop(1, '#263238');
  rr(16, -8, 42, 20, 7, bg, '#1c262b'); rr(27, -8, 5, 20, 2, '#37474f'); rr(46, -8, 5, 20, 2, '#37474f'); ell(58, 2, 6, 11, '#263238', '#0c1114', 1.5); ell(59, 2, 3.5, 7, '#000');
  ell(24, 17, 10, 10, '#6d4c41', '#3e2723'); for (let i = 0; i < 4; i++) ln(24, 17, 24 + Math.cos(i * 1.57 + o.ph) * 8, 17 + Math.sin(i * 1.57 + o.ph) * 8, '#3e2723', 1.5);
  if (o.fire > .1) { const f = clamp(o.fire, 0, 1); ell(68, 2, 4 + o.fire * 7, 3 + o.fire * 6, 'rgba(255,214,102,' + f + ')'); ell(66, 2, 2 + o.fire * 3, 2 + o.fire * 3, 'rgba(255,255,255,' + f + ')'); }
  brow(-12, -17, -.3); brow(12, -17, .3); eyes(12, -8, o, 5); mouth(10, o.tier, o.hurt);
  ell(-12, -8, 8, 7.5, '#14100c'); ln(-19, -11, -33, -20, '#14100c', 2); ell(-31, 5, 3, 4.5, null, '#ffd54f', 2);
  rr(-34, -26, 68, 10, 5, '#e53935', '#8e1b1b'); [-24, -10, 4, 18, 30].forEach(x => ell(x, -21, 1.8, 1.8, '#fff')); poly([[34, -24], [48, -30 + Math.sin(o.ph * 6) * 2], [46, -18], [34, -18]], '#e53935', '#8e1b1b');
};
POT.coconut = o => {
  FEET(16, '#c9954f'); const w = Math.sin(o.ph * 4) * 3;
  ln(-32, 0, -44, -6 + w, '#c9954f', 7); ln(32, 0, 44, -6 - w, '#c9954f', 7); ell(-45, -7 + w, 5.5, 5.5, '#d8a65e', '#5a3a1a', 1.5); ell(45, -7 - w, 5.5, 5.5, '#d8a65e', '#5a3a1a', 1.5);
  blob(68, 70, '#e0b070', '#b88540');
  for (let i = -5; i <= 5; i++) ln(i * 6, 22, i * 6 + Math.sin(o.ph * 3 + i) * 2.5, 38, i % 2 ? '#43a047' : '#2e7d32', 4);
  const sg = ctx.createLinearGradient(0, -48, 0, -6); sg.addColorStop(0, '#9a6234'); sg.addColorStop(1, '#5a3418');
  ctx.beginPath(); ctx.moveTo(-35, -6); ctx.bezierCurveTo(-35, -50, 35, -50, 35, -6); ctx.quadraticCurveTo(0, -18, -35, -6); ctx.fillStyle = sg; ctx.fill(); ctx.strokeStyle = '#3e2410'; ctx.lineWidth = 2.5; ctx.stroke();
  for (let i = 0; i < 9; i++) ln(-28 + i * 7, -14 - Math.sin(i * .7) * 14, -29 + i * 7, -24 - Math.sin(i * .7) * 18, 'rgba(40,20,8,.5)', 1.6);
  ell(-10, -34, 7, 3, 'rgba(255,255,255,.3)'); ln(14, -40, 26, -66, '#fff', 3); ln(14, -40, 26, -66, '#ef5350', 1); poly([[16, -62], [34, -60], [25, -72]], '#ffca28', '#e65100');
  eyes(12, -2, o, 6); mouth(18, 2, o.hurt);
  if (o.fire > 0) ell(40, -12 - o.fire * 8, 8, 8, '#6d4c41', '#3e2410');
};
POT.ice = o => {
  FEET(12, '#9fd0ee'); ln(-26, 4, -38, 10, '#9fd0ee', 6); ln(26, 4, 38, 10, '#9fd0ee', 6); ell(-39, 11, 5, 5, '#b9e0f5', '#3a90c8', 1.5); ell(39, 11, 5, 5, '#b9e0f5', '#3a90c8', 1.5);
  blob(54, 62, '#e3f6ff', '#86c1e6');
  eyes(10, -6, o, 5.5); mouth(12, o.tier === 0 ? 1 : o.tier, o.hurt);
  ctx.beginPath(); ctx.arc(0, -22, 26, Math.PI, 0); ctx.fillStyle = '#29b6f6'; ctx.fill(); ctx.strokeStyle = '#01579b'; ctx.lineWidth = 2.2; ctx.stroke();
  for (let i = -3; i <= 3; i++) ln(i * 7, -22, i * 6, -46 + Math.abs(i) * 2, 'rgba(1,87,155,.35)', 1.5);
  rr(-28, -27, 56, 9, 4, '#fff', '#90caf9'); ell(0, -50, 8, 8, '#fff', '#b3e5fc');
  rr(-27, 14, 54, 10, 5, '#ef5350', '#8e1b1b'); for (let i = 0; i < 5; i++) ln(-20 + i * 10, 14, -17 + i * 10, 24, '#fff', 3); rr(8, 20, 10, 20, 4, '#ef5350', '#8e1b1b');
  for (let i = 0; i < 3; i++) { const k = (o.ph * .8 + i / 3) % 1; ctx.globalAlpha = 1 - k; ell(-22 - k * 22, 8 - k * 10, 3 + k * 4, 3 + k * 4, '#fff'); ctx.globalAlpha = 1; }
};

/* ---------- V5: hotkeys R = rake, S = shovel (badges on the cards) ---------- */
document.addEventListener('keydown', e => {
  if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && G && state === 'play' && !paused && $('card-rake')) selectCard('rake');
});
const _bc5 = buildCards;
buildCards = function () {
  _bc5();
  [['shovel', 'S'], ['rake', 'R']].forEach(a => { const el = $('card-' + a[0]); if (el && !el.querySelector('.k')) el.insertAdjacentHTML('afterbegin', '<span class="k">' + a[1] + '</span>'); });
};

/* ================= V5: PAUSE MENU + SETTINGS + SAVE & RESUME ================= */
Object.assign(FR, { 'RESUME': 'REPRENDRE', 'SETTINGS': 'PARAMÈTRES', 'RESTART': 'RECOMMENCER', 'SAVE & EXIT': 'SAUVEGARDER ET QUITTER', 'Progress is kept until you return.': 'Ta partie est gardée jusqu’à ton retour.',
  'Game in progress — pick it again to continue where you left off.': 'Partie en cours — choisis-la à nouveau pour reprendre où tu t’es arrêté.', 'Settings / pause menu': 'Paramètres / menu pause' });
let suspended = null;
function syncPause() { const on = paused && state === 'play'; $('pausemenu').classList.toggle('hidden', !on); if (on) renderPause(); }
const _tp5 = togglePause; togglePause = function () { _tp5(); syncPause(); }; $('pauseBtn').onclick = togglePause;
const _sh5 = show; show = function (id) { _sh5(id); $('pausemenu').classList.add('hidden'); };
function renderPause() {
  const nm = THEMES[G.world].name, lv = G.mode ? ({ endless: 'ENDLESS', random: 'RANDOM UNITS', conveyor: 'RANDOMIZER' })[G.mode] + ' \u2014 ' + nm : 'LEVEL ' + (G.world + 1) + '-' + (G.li % 5 + 1) + ' \u2014 ' + nm, pm = $('pausemenu');
  pm.innerHTML = '<div class="pbox"><h2>PAUSED</h2><div class="sub">' + lv + '</div><button class="big" id="pmResume">RESUME</button><h3>SETTINGS</h3><div class="row"><button class="big sm alt" id="pmSound">' + (muted ? 'Sound: OFF' : 'Sound: ON') +
    '</button><button class="big sm alt" id="pmSpeed">Speed x' + gameSpeed + '</button><button class="big sm' + (LANG === 'en' ? '' : ' alt') + '" data-l="en">EN</button><button class="big sm' + (LANG === 'fr' ? '' : ' alt') + '" data-l="fr">FR</button></div>' +
    '<div class="row"><button class="big sm" id="pmRestart">RESTART</button><button class="big sm alt" id="pmExit">SAVE &amp; EXIT</button></div><small>Progress is kept until you return.</small></div>';
  $('pmResume').onclick = () => { S.click(); togglePause(); };
  $('pmSound').onclick = () => { $('tsound').click(); renderPause(); };
  $('pmSpeed').onclick = () => { $('speedBtn').click(); renderPause(); };
  pm.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { S.click(); setLang(b.dataset.l); renderPause(); });
  $('pmRestart').onclick = () => { S.click(); const g = G; suspended = null; paused = false; $('pauseBtn').textContent = 'Pause'; pm.classList.add('hidden'); g.mode ? startMode(g.mode, g.world, g.modeDeck) : startLevel(g.li, g.deck); };
  $('pmExit').onclick = () => { S.click(); suspended = { G, mode: G.mode, world: G.world, li: G.li }; paused = false; $('pauseBtn').textContent = 'Pause'; pm.classList.add('hidden'); state = 'menu'; G.mode ? showModes() : showMap(); };
}
function resumeSuspended() {
  const s = suspended; suspended = null; G = s.G; buildBg(G.world); state = 'play'; show(null); buildCards(); if (G.conv) renderBelt(); updateHud(); paused = false; togglePause();
}
const _sl5 = startLevel; startLevel = function (li, deck) { if (suspended && !suspended.mode && suspended.li === li) return resumeSuspended(); suspended = null; _sl5(li, deck); };
const _sb5 = showBrief; showBrief = function (i) { if (suspended && !suspended.mode && suspended.li === i) return resumeSuspended(); _sb5(i); };
const _sm5 = startMode; startMode = function (m, w, d) { if (suspended && suspended.mode === m && suspended.world === w) return resumeSuspended(); suspended = null; _sm5(m, w, d); };
const _ep5 = endlessPick; endlessPick = function () { if (suspended && suspended.mode === 'endless' && suspended.world === modeWorld) return resumeSuspended(); _ep5(); };
const susNote = el => { if (suspended) el.insertAdjacentHTML('afterbegin', '<div class="susnote">Game in progress \u2014 pick it again to continue where you left off.</div>'); };
const _smap5 = showMap; showMap = function () { _smap5(); susNote($('map')); };
const _smod5 = showModes; showModes = function () { _smod5(); susNote($('modes')); };
$('menuBtn').onclick = () => { if (state !== 'play') return; S.click(); if (!paused) togglePause(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && paused && state === 'play') togglePause(); });
setLang(LANG);
