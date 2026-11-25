/* From One Voice to a Movement: full scroll story */
gsap.registerPlugin(ScrollTrigger);
const RED = "#E10600", G1 = "#2A2A2A", G2 = "#6E6E6E", G3 = "#B9B9B9", INK = "#0B0B0B", PAPER = "#EDEDEA";
const DPR = Math.min(2, window.devicePixelRatio || 1);
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = d3.format(",");
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => 1 - Math.pow(1 - t, 3);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = id => document.getElementById(id);
const SVGNS = "http://www.w3.org/2000/svg";
const MOBILE = () => window.innerWidth < 760;

function sizeCanvas(c) {
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, Math.round(r.width * DPR)); c.height = Math.max(1, Math.round(r.height * DPR));
  const ctx = c.getContext("2d"); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
function dot(ctx, x, y, r, col) { if (r <= 0.15) return; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function svgEl(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function svgSize(svg) { const r = svg.getBoundingClientRect(); svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`); return { w: r.width, h: r.height }; }
function shapeSVG(id, fill) { const s = SH[id]; if (!s) return ""; return `<svg viewBox="0 0 ${s.w} ${s.h}" aria-hidden="true"><path d="${s.d}" fill="${fill}" fill-rule="evenodd"/></svg>`; }

/* paper grain made in code */
(function grain() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  const im = x.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.random() < 0.5 ? 0 : 255; }
  x.putImageData(im, 0, 0); $("grain").style.backgroundImage = `url(${c.toDataURL()})`;
})();

let DATA, WORLD, SH, IMG = {};

/* ================= halftone image component ================= */
function sampleImage(img, mask, w, h, s, focus, redDark) {
  // cover-fit img to w×h, sample on a hex grid of pitch s; returns dots
  const cols = Math.ceil(w / s) + 1, rows = Math.ceil(h / s) + 1;
  const iw = img.naturalWidth, ih = img.naturalHeight, sc = Math.max(w / iw, h / ih);
  const vw = w / sc, vh = h / sc, sx = clamp(focus[0] * iw - vw / 2, 0, iw - vw), sy = clamp(focus[1] * ih - vh / 2, 0, ih - vh);
  const oc = document.createElement("canvas"); oc.width = cols; oc.height = rows; const ox = oc.getContext("2d", { willReadFrequently: true });
  const vw2 = Math.min(iw - sx, cols * s / sc), vh2 = Math.min(ih - sy, rows * s / sc);
  ox.drawImage(img, sx, sy, vw2, vh2, 0, 0, cols * vw2 / (cols * s / sc), rows * vh2 / (rows * s / sc));
  const px = ox.getImageData(0, 0, cols, rows).data; let mx = null;
  if (mask) { ox.clearRect(0, 0, cols, rows); ox.drawImage(mask, sx, sy, vw2, vh2, 0, 0, cols * vw2 / (cols * s / sc), rows * vh2 / (rows * s / sc)); mx = ox.getImageData(0, 0, cols, rows).data; }
  const dots = [], R = rng(7);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * s + (j % 2 ? s / 2 : 0), y = j * s, k = (j * cols + i) * 4;
    const b = Math.pow(clamp((px[k] / 255 - 0.06) / 0.86), 1.25), red = mx && mx[k] > 110 && (!redDark || (redDark > 0 ? b < 0.5 : b > 0.62));
    if (b < 0.04 && !red) continue;
    dots.push({ x, y, r: s * 0.6 * Math.sqrt(b), red, k: 0.75 * R() + 0.25 * (x / w) });
  }
  return dots;
}
function makePhoto(id, key, opt = {}) {
  const S = { c: $(id), focus: opt.focus || [0.5, 0.5] };
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h });
    const img = IMG[key]; if (!img) { S.dots = []; return; }
    S.s = Math.max(MOBILE() ? 4.5 : 5.5, Math.min(w, h) / (MOBILE() ? 80 : 128));
    S.dots = sampleImage(img, IMG[key + "_red"], w, h, S.s, S.focus, opt.redDark);
  };
  const cp = S.c.closest(".stage").querySelector(".copy");
  S.render = p => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h); if (cp) cp.classList.toggle("in", p > 0.1);
    const a = ease(seg(p, 0, 0.42)) * 1.25, z = 1.06 - 0.06 * ease(p);
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(z, z); ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = "#C9C9C5"; ctx.beginPath();
    const reds = [];
    for (const d of S.dots) {
      const t = clamp((a - d.k) / 0.25); if (t <= 0) continue;
      if (d.red) { reds.push([d, t]); continue; }
      const r = d.r * t; if (r < 0.2) continue; ctx.moveTo(d.x + r, d.y); ctx.arc(d.x, d.y, r, 0, 6.2832);
    }
    ctx.fill();
    ctx.fillStyle = RED; ctx.beginPath();
    for (const [d, t] of reds) { const r = Math.max(d.r, S.s * 0.36) * t; ctx.moveTo(d.x + r, d.y); ctx.arc(d.x, d.y, r, 0, 6.2832); }
    ctx.fill(); ctx.restore();
  };
  return S;
}

/* ================= people drawn in code (opening crowd, laws field) ================= */
// A person seen from above and behind, walking. Origin = feet. H = height. ph = stride phase.
function drawPerson(ctx, x, y, H, ph, col, opt = {}) {
  const s = Math.sin(ph), c = Math.cos(ph), st = s * 0.15 * H, lift = Math.max(0, c) * 0.03 * H, lean = (opt.lean || 0.04) * H;
  if (opt.shadow !== false) { ctx.fillStyle = opt.shadowCol || "rgba(120,120,120,.26)"; ctx.beginPath(); ctx.ellipse(x - 0.26 * H, y + 0.015 * H, 0.36 * H, 0.06 * H, -0.32, 0, 6.2832); ctx.fill(); }
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const hx = x + lean * 0.4, hy = y - 0.46 * H; // hips
  // legs: hip, knee, foot
  ctx.lineWidth = 0.085 * H; ctx.beginPath();
  ctx.moveTo(hx - 0.04 * H, hy); ctx.lineTo(x - 0.03 * H + st * 0.55 + 0.02 * H, y - 0.24 * H - lift); ctx.lineTo(x - 0.03 * H + st, y - lift);
  ctx.moveTo(hx + 0.04 * H, hy); ctx.lineTo(x + 0.03 * H - st * 0.55 + 0.02 * H, y - 0.24 * H); ctx.lineTo(x + 0.03 * H - st, y);
  ctx.stroke();
  const sx = x + lean, sy = y - 0.78 * H; // shoulders
  // arms: shoulder, elbow, hand, swinging against the legs
  ctx.lineWidth = 0.062 * H; ctx.beginPath();
  ctx.moveTo(sx - 0.15 * H, sy + 0.02 * H); ctx.lineTo(sx - 0.18 * H - st * 0.35, sy + 0.18 * H); ctx.lineTo(sx - 0.17 * H - st * 0.75, sy + 0.32 * H);
  ctx.moveTo(sx + 0.15 * H, sy + 0.02 * H); ctx.lineTo(sx + 0.18 * H + st * 0.35, sy + 0.18 * H); ctx.lineTo(sx + 0.17 * H + st * 0.75, sy + 0.32 * H);
  ctx.stroke();
  // kurta: round shoulders, in at the waist, loose at the hem
  ctx.beginPath(); ctx.moveTo(sx - 0.16 * H, sy + 0.03 * H);
  ctx.bezierCurveTo(sx - 0.15 * H, sy - 0.04 * H, sx + 0.15 * H, sy - 0.04 * H, sx + 0.16 * H, sy + 0.03 * H);
  ctx.bezierCurveTo(sx + 0.13 * H, sy + 0.2 * H, hx + 0.17 * H, hy, hx + 0.16 * H, hy + 0.1 * H);
  ctx.quadraticCurveTo(hx, hy + 0.14 * H, hx - 0.16 * H, hy + 0.1 * H);
  ctx.bezierCurveTo(hx - 0.17 * H, hy, sx - 0.13 * H, sy + 0.2 * H, sx - 0.16 * H, sy + 0.03 * H); ctx.fill();
  // neck and head
  ctx.lineWidth = 0.06 * H; ctx.beginPath(); ctx.moveTo(sx, sy - 0.01 * H); ctx.lineTo(sx + lean * 0.3, sy - 0.06 * H); ctx.stroke();
  const qx = sx + lean * 0.5, qy = y - 0.92 * H; ctx.beginPath(); ctx.arc(qx, qy, 0.082 * H, 0, 6.2832); ctx.fill();
  if (opt.turban) { ctx.beginPath(); ctx.moveTo(qx - 0.1 * H, qy + 0.005 * H); ctx.quadraticCurveTo(qx - 0.11 * H, qy - 0.12 * H, qx + 0.01 * H, qy - 0.115 * H); ctx.quadraticCurveTo(qx + 0.11 * H, qy - 0.1 * H, qx + 0.095 * H, qy + 0.01 * H); ctx.closePath(); ctx.fill(); }
  if (opt.shawl) { ctx.beginPath(); ctx.moveTo(sx - 0.17 * H, sy + 0.04 * H); ctx.quadraticCurveTo(sx, sy - 0.02 * H, sx + 0.17 * H, sy + 0.04 * H); ctx.lineTo(sx + 0.2 * H, sy + 0.22 * H); ctx.lineTo(sx - 0.2 * H, sy + 0.22 * H); ctx.closePath(); ctx.fill(); }
  if (opt.stick) { ctx.lineWidth = 0.03 * H; ctx.beginPath(); ctx.moveTo(sx + 0.17 * H + st * 0.75, sy + 0.1 * H); ctx.lineTo(sx + 0.24 * H + st * 0.75, y + 0.01 * H); ctx.stroke(); }
}

/* ================= scene 0: the farmer becomes Alex's lone red figure; Alex's crowd circles him ================= */
function makeS0() {
  const S = { c: $("c0"), live: true };
  const FX = 961, FY = 513, OX = 915, OY = 468; // in Alex's "people" frame: centre of the lone figure, and where its sprite was cut
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h });
    const mob = MOBILE(), C = IMG.O_crowd;
    S.box = mob ? { x: 0, y: 0, w, h: h * 0.62 } : { x: w * 0.36, y: 0, w: w * 0.64, h };
    S.cx = mob ? w * 0.33 : w * 0.636; S.cy = mob ? h * 0.3 : h * 0.522;
    S.sc = C ? (mob ? Math.max(h * 0.56, w * 1.25) / C.naturalHeight : Math.max(w / C.naturalWidth, h / C.naturalHeight)) : 1;
    S.s = Math.max(5, Math.min(S.box.w, S.box.h) / (mob ? 64 : 82));
    const raw = IMG.A02 ? sampleImage(IMG.A02, null, S.box.w, S.box.h, S.s, [0.32, 0.4]) : [];
    raw.forEach(d => { d.x += S.box.x; d.y += S.box.y; });
    S.pc = [S.box.x + S.box.w * 0.5, S.box.y + S.box.h * 0.45]; S.dots = raw;
    S.kEnd = (64 * S.sc) / (S.box.h * 0.8); // the portrait shrinks until it is the size of the figure
  };
  S.render = (p, tm = 0) => {
    const { ctx, w, h, sc } = S; ctx.clearRect(0, 0, w, h);
    const shrink = eio(seg(p, 0.14, 0.36)), one = seg(p, 0.27, 0.36), crowdT = seg(p, 0.52, 0.86);
    const ill = S.c.closest(".stage").querySelector(".ill"); if (ill) ill.style.opacity = 1 - one;
    // 1. the farmer's portrait; 2. the camera pulls up and he becomes the lone red figure
    if (one < 1 && S.dots.length) {
      const k = lerp(1, S.kEnd, shrink), grey = [201, 201, 197], red = [225, 6, 0];
      const col = grey.map((v, j) => Math.round(lerp(v, red[j], clamp(shrink * 1.4)))).join(",");
      ctx.globalAlpha = 1 - one; ctx.fillStyle = `rgb(${col})`;
      for (const d of S.dots) {
        const x = S.cx + (d.x - S.pc[0]) * k, y = S.cy + (d.y - S.pc[1]) * k, r = Math.max(0.35, d.r * Math.pow(k, 0.8));
        if (d.r < 0.2) continue; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const glow = crowdT > 0.6 ? 0.14 + 0.07 * Math.sin(tm / 420) : 0;
    if (glow) { const g = ctx.createRadialGradient(S.cx, S.cy, 0, S.cx, S.cy, 260 * sc); g.addColorStop(0, `rgba(225,6,0,${glow})`); g.addColorStop(1, "rgba(225,6,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    // 3. the crowd from Alex's frame walks in and circles him
    const C = IMG.O_crowd;
    if (C && crowdT > 0) {
      const e = eio(crowdT), turn = (1 - e) * 0.85 + Math.sin(tm / 2600) * 0.01, z = lerp(1.7, 1, e) * (1 + 0.006 * Math.sin(tm / 900));
      const draw = flip => { ctx.save(); ctx.translate(S.cx, S.cy); ctx.rotate(flip ? -turn : turn); ctx.scale(z * sc * (flip ? -1 : 1), z * sc); ctx.drawImage(C, -FX, -FY); ctx.restore(); };
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = clamp(e * 1.25);
      draw(false);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    // the lone figure, walking on the spot
    const O = IMG.O_one;
    if (O && one > 0) {
      const bob = Math.sin(tm / 230) * 0.9 * sc, sway = Math.sin(tm / 460) * 0.035;
      ctx.save(); ctx.globalAlpha = one; ctx.translate(S.cx, S.cy + bob); ctx.rotate(sway); ctx.scale(sc, sc); ctx.drawImage(O, OX - FX, OY - FY); ctx.restore();
    }
  };
  return S;
}

/* ================= world helpers ================= */
function worldBase(w, h, pad) {
  const feats = WORLD.features.filter(f => f.properties.n !== "Antarctica");
  const fc = { type: "FeatureCollection", features: feats };
  const proj = d3.geoEqualEarth().fitExtent([[pad, pad], [w - pad, h - pad]], fc);
  const oc = document.createElement("canvas"); oc.width = Math.ceil(w); oc.height = Math.ceil(h);
  const ox = oc.getContext("2d", { willReadFrequently: true }); const path = d3.geoPath(proj, ox);
  ox.fillStyle = "#fff"; ox.beginPath(); path(fc); ox.fill();
  const im = ox.getImageData(0, 0, oc.width, oc.height).data;
  const s = Math.max(4, w / (MOBILE() ? 70 : 120)), land = [];
  for (let j = 0, y = s / 2; y < h; j++, y += s * 0.866) for (let x = s / 2 + (j % 2 ? s / 2 : 0); x < w; x += s) {
    if (im[(Math.floor(y) * oc.width + Math.floor(x)) * 4 + 3] > 100) land.push([x, y]);
  }
  const P = DATA.protests, byC = {}, pos = P.map((p, i) => {
    const [x, y] = proj([p[10], p[9]]); const n = (byC[p[1]] = (byC[p[1]] || 0) + 1) - 1;
    const a = n * 2.39996, r = Math.sqrt(n) * Math.max(3, w / 190) * 1.25; return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  });
  return { proj, land, s, pos };
}
function drawLand(ctx, land, s, col, alpha) { if (alpha <= 0) return; ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.beginPath(); const r = s * 0.2; for (const [x, y] of land) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); } ctx.fill(); ctx.globalAlpha = 1; }
const monthIdx = m => (+m.slice(0, 4) - 2020) * 12 + (+m.slice(5, 7) - 1);

/* ================= Acts 1–2: the world ================= */
function makeWorld() {
  const S = { c: $("cw") }; const MOT = ["Political", "Economic", "Corruption", "Gender"];
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h });
    const B = worldBase(w, h, 6); Object.assign(S, B);
    const P = DATA.protests, N = P.length; S.rd = Math.max(2.6, w / 190);
    S.L0 = B.pos;
    // L1 timeline: all 821 stacked by month (selected first)
    const pad = 28, base = h - 40, cw = (w - pad * 2) / 72, stack = {};
    const r1 = Math.min(cw * 0.46, (h - 120) / 26 / 2.1); S.r1 = r1; S.cw = cw; S.base = base; S.pad = pad;
    const slot = m => { const n = (stack[m] = (stack[m] || 0) + 1) - 1; return [pad + (monthIdx(m) + .5) * cw, base - r1 - n * r1 * 2.15]; };
    S.L1 = P.map(p => slot(p[3]));
    S.others = DATA.all.filter(a => !a[1]).map(a => ({ pos: slot(a[0]), eco: a[2] }));
    // L2 motivations: four halftone bars, filled first then hollow copies
    const colW = (w - 40) / 4, per = 10, sp = Math.min(colW * 0.8 / per, (h - 150) / 15), base2 = h - 46; S.r2 = sp * 0.42;
    const cnt = [0, 0, 0, 0]; S.L2 = []; S.copies = []; S.motN = [0, 0, 0, 0];
    const place = c => { const n = cnt[c]++; return [20 + colW * c + colW / 2 - (per - 1) * sp / 2 + (n % per) * sp, base2 - Math.floor(n / per) * sp - sp / 2]; };
    P.forEach((p, i) => { let prim = p[7].findIndex((v, k) => v && k < 4); if (prim < 0) prim = 0; S.L2[i] = place(prim); S.motN[prim]++; });
    P.forEach((p, i) => p[7].forEach((v, k) => { if (v && k < 4 && k !== P[i][7].findIndex((vv, kk) => vv && kk < 4)) { S.copies.push({ i, pos: place(k) }); S.motN[k]++; } }));
    S.motX = c => 20 + colW * c + colW / 2; S.base2 = base2;
    // L3 strip: band (x) × outcome (y)
    const bands = DATA.bands, bw = (w - 60) / 3, top = 70, rowH = (h - top - 60) / 2, maxD = d3.max(P, p => p[6]);
    const cells = {}; S.L3 = []; S.r3 = [];
    const order = d3.range(N).sort((a, b) => P[b][6] - P[a][6]);
    const sp3 = Math.min(bw / 12, rowH / 7);
    order.forEach(i => { const p = P[i], bx = bands.indexOf(p[5]), by = p[8] ? 0 : 1, key = bx + "," + by; const n = (cells[key] = (cells[key] || 0) + 1) - 1;
      const per3 = Math.max(4, Math.floor(bw * 0.86 / sp3));
      S.L3[i] = [60 + bx * bw + bw / 2 - (Math.min(per3, 10) - 1) * sp3 / 2 + (n % Math.min(per3, 10)) * sp3, top + by * rowH + 26 + Math.floor(n / Math.min(per3, 10)) * sp3 + sp3 / 2];
      S.r3[i] = sp3 * 0.47 * (0.28 + 0.72 * Math.log1p(p[6]) / Math.log1p(maxD)); });
    S.cells3 = cells; S.bw = bw; S.top3 = top; S.rowH = rowH;
    S.fi = P.findIndex(p => p[11]);
  };
  const T = [0, .22, .42, .62, .82];
  S.render = p => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h);
    const P = DATA.protests, N = P.length;
    const tAB = eio(seg(p, .22, .3)), tBC = eio(seg(p, .42, .5)), tCD = eio(seg(p, .62, .7)), tDE = eio(seg(p, .82, .9)), zoom = eio(seg(p, .9, 1));
    const step = p < .22 ? 0 : p < .42 ? 1 : p < .62 ? 2 : p < .82 ? 3 : 4;
    const landA = 1 - tAB + tDE;
    // zoom on India dot in the last stretch
    const fd = S.L0[S.fi];
    ctx.save();
    if (zoom > 0) { const z = 1 + zoom * 7; ctx.translate(lerp(fd[0], w / 2, zoom), lerp(fd[1], h / 2, zoom)); ctx.scale(z, z); ctx.translate(-fd[0], -fd[1]); }
    drawLand(ctx, S.land, S.s, "#3a3a3a", landA);
    // year counter for step 0
    const tm = seg(p, .02, .18) * 72;
    if (step === 0) $("wyear").textContent = 2020 + Math.min(5, Math.floor(tm / 12));
    // other protests (grey) in timeline
    const oa = tAB * (1 - tBC);
    if (oa > 0) { ctx.globalAlpha = oa; for (const o of S.others) dot(ctx, o.pos[0], o.pos[1], S.r1 * 0.85, o.eco ? "#7a7a7a" : "#4a4a4a"); ctx.globalAlpha = 1; }
    // hollow copies (motivations)
    const ca = tBC * (1 - tCD);
    if (ca > 0) { ctx.globalAlpha = ca; ctx.strokeStyle = RED; ctx.lineWidth = 1.2; for (const c of S.copies) { const a = S.L1[c.i], x = lerp(a[0], c.pos[0], tBC), y = lerp(a[1], c.pos[1], tBC); ctx.beginPath(); ctx.arc(x, y, S.r2 * .85, 0, 6.2832); ctx.stroke(); } ctx.globalAlpha = 1; }
    for (let i = 0; i < N; i++) {
      let x, y, r = S.rd;
      const a0 = S.L0[i], a1 = S.L1[i], a2 = S.L2[i], a3 = S.L3[i];
      if (p < .42) { x = lerp(a0[0], a1[0], tAB); y = lerp(a0[1], a1[1], tAB); r = lerp(S.rd, S.r1, tAB); }
      else if (p < .62) { x = lerp(a1[0], a2[0], tBC); y = lerp(a1[1], a2[1], tBC); r = lerp(S.r1, S.r2, tBC); }
      else if (p < .82) { x = lerp(a2[0], a3[0], tCD); y = lerp(a2[1], a3[1], tCD); r = lerp(S.r2, S.r3[i], tCD); }
      else { x = lerp(a3[0], a0[0], tDE); y = lerp(a3[1], a0[1], tDE); r = lerp(S.r3[i], S.rd, tDE); }
      let col = RED, al = 1;
      if (step === 0) { const mi = monthIdx(P[i][3]); const t = clamp((tm - mi) / 3); if (t <= 0) continue; r *= ease(t); al = t; }
      if (step === 3 && P[i][8] === 0) col = "#8a8a8a";
      if (step === 4 && i !== S.fi) { col = tDE > .5 ? "#555" : (P[i][8] ? RED : "#8a8a8a"); al = 1 - 0.4 * tDE; }
      ctx.globalAlpha = al; dot(ctx, x, y, r, col);
    }
    ctx.globalAlpha = 1;
    if (step === 4) { const f = S.L0[S.fi], pr = S.rd * (1.4 + 0.5 * Math.sin(p * 90)) * (1 + tDE); ctx.globalAlpha = .25; dot(ctx, f[0], f[1], pr * 2.4, RED); ctx.globalAlpha = 1; dot(ctx, f[0], f[1], pr, RED); }
    ctx.restore();
    // labels
    ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "center";
    if (tAB > 0 && tBC < 1) { ctx.globalAlpha = tAB * (1 - tBC); ctx.fillStyle = G1; ctx.fillRect(S.pad, S.base + 2, w - S.pad * 2, 1); ctx.fillStyle = G3;
      for (let y = 0; y < 6; y++) ctx.fillText(2020 + y, S.pad + (y * 12 + 6) * S.cw, S.base + 20);
      ctx.fillStyle = RED; ctx.textAlign = "left";
      const x22 = S.pad + 27 * S.cw; ctx.fillText("2022 · COST OF LIVING", x22, 80); ctx.fillStyle = G2; ctx.fillRect(x22 - 4, 70, 1, S.base - 70);
      ctx.fillText("PANDEMIC YEARS", S.pad, 80); ctx.globalAlpha = 1; ctx.textAlign = "center"; }
    if (tBC > 0 && tCD < 1) { ctx.globalAlpha = tBC * (1 - tCD);
      MOT.forEach((m, k) => { const x = S.motX(k); ctx.fillStyle = PAPER; ctx.font = `800 20px "Bricolage Grotesque", sans-serif`; ctx.fillText(m.toUpperCase(), x, S.base2 + 24);
        ctx.fillStyle = RED; ctx.font = `600 12px "Bricolage Grotesque", sans-serif`; ctx.fillText(S.motN[k], x, S.base2 + 40); });
      ctx.globalAlpha = 1; }
    if (tCD > 0 && tDE < 1) { ctx.globalAlpha = tCD * (1 - tDE); ctx.font = `800 18px "Bricolage Grotesque", sans-serif`;
      DATA.bands.forEach((b, k) => { const x = 60 + k * S.bw + S.bw / 2; ctx.fillStyle = PAPER; ctx.fillText(MOBILE() ? ["10,000+", "100,000+", "1,000,000+"][k] : b.toUpperCase(), x, 40);
        const yes = S.cells3[k + ",0"] || 0, no = S.cells3[k + ",1"] || 0; ctx.fillStyle = RED; ctx.font = `600 12px "Bricolage Grotesque", sans-serif`;
        ctx.fillText(Math.round(100 * yes / (yes + no)) + (MOBILE() ? "%" : "% changed something"), x, 58); ctx.font = `800 18px "Bricolage Grotesque", sans-serif`; });
      ctx.save(); ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = G3;
      [["CHANGED SOMETHING", 0], ["NO CHANGE", 1]].forEach(([t, k]) => { ctx.save(); ctx.translate(18, S.top3 + k * S.rowH + S.rowH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(t, 0, 0); ctx.restore(); });
      ctx.fillStyle = G1; ctx.fillRect(40, S.top3 + S.rowH + 8, w - 50, 1); ctx.restore(); ctx.globalAlpha = 1; }
  };
  S.hit = (mx, my, p) => {
    if (!(p < .2 || (p > .7 && p < .82))) return null; const L = p < .2 ? S.L0 : S.L3; let best = null, bd = 12;
    L.forEach((a, i) => { const d = Math.hypot(a[0] - mx, a[1] - my); if (d < bd) { bd = d; best = i; } }); return best;
  };
  return S;
}

/* ================= scene 5: the land (waffles) ================= */
function renderLand() {
  const svg = $("vland"); svg.innerHTML = ""; const { w, h } = svgSize(svg);
  const items = [[50, "More than half", "of Indians depend on farming to live", true], [86, "86 in 100", "farm holdings are under 2 hectares", true], [6, "About 6 in 100", "farmers sell at the guaranteed price (MSP)"]];
  const mob = w < 520, n = 3, gw = mob ? Math.min(w / 3 - 8, h * .3) : Math.min((w - 40) / 3, h * 0.55), cs = gw / 10, top = mob ? 30 : h / 2 - gw / 2;
  S_LAND.rects = [];
  items.forEach((it, k) => {
    const gx = (w - (gw * 3 + 24 * 2)) / 2 + k * (gw + 24); const g = svgEl("g", {}, svg);
    for (let i = 0; i < 100; i++) { const r = svgEl("rect", { x: gx + (i % 10) * cs + cs * .12, y: top + (9 - Math.floor(i / 10)) * cs + cs * .12, width: cs * .76, height: cs * .76, fill: G1 }, g); S_LAND.rects.push([r, k, i < it[0]]); }
    const t1 = svgEl("text", { x: gx, y: top + gw + 30, class: "lbl big" }, svg); t1.textContent = mob ? ["Over half", "86 in 100", "6 in 100"][k] : it[1] + (it[4] ? " †" : "");
    const fo = svgEl("text", { x: gx, y: top + gw + 48, class: "sm" }, svg); fo.textContent = mob ? "" : it[2];
    if (mob) { t1.setAttribute("style", "font-size:15px"); }
  });
  if (mob) ["depend on farming", "holdings under 2 ha", "sell at MSP"].forEach((t, k) => { const gx = (w - (gw * 3 + 48)) / 2 + k * (gw + 24); const e = svgEl("text", { x: gx, y: top + gw + 48, class: "sm", style: "font-size:11px" }, svg); e.textContent = t; });
}
const S_LAND = { rects: [] };
function renderLandP(p) { S_LAND.rects.forEach(([r, k, on]) => { const t = seg(p, 0.08 + k * 0.25, 0.3 + k * 0.25); r.setAttribute("fill", on && t > 0.02 ? (k === 2 ? RED : (k === 0 ? G3 : G2)) : G1); r.style.opacity = on ? 0.35 + 0.65 * t : 1; }); }

/* ================= laws: a field of gavels, then the four hammer blows ================= */
// A gavel lying flat, seen from above at an angle. Origin = centre of the head. U = head length.
function drawMallet(ctx, U, fill, shade) {
  const D = U * 0.5, L = U * 1.9, hw = U * 0.12;
  ctx.fillStyle = fill; // handle
  ctx.beginPath(); ctx.roundRect(0, -hw / 2, L, hw, hw / 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(L, 0, hw * 0.9, hw * 0.75, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-D * 0.28, -hw * 0.7, D * 0.7, hw * 1.4, 3); ctx.fill(); // collar
  // head: a drum, flat end facing the viewer
  ctx.beginPath(); ctx.roundRect(-D / 2, -U / 2, D, U, D * 0.12); ctx.fill();
  if (shade) { const g = ctx.createLinearGradient(-D / 2, 0, D / 2, 0); g.addColorStop(0, shade[0]); g.addColorStop(0.45, shade[1]); g.addColorStop(1, shade[2]); ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-D / 2, -U / 2, D, U, D * 0.12); ctx.fill(); ctx.fillStyle = fill; }
  ctx.beginPath(); ctx.ellipse(0, -U / 2, D / 2, D * 0.18, 0, 0, 6.2832); ctx.fill();
}
function makeLawField() {
  const S = { c: $("claws"), live: true };
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h });
    const F = IMG.L_field; if (!F) return; const sc = Math.max(w / F.naturalWidth, h / F.naturalHeight) * 1.08;
    Object.assign(S, { sc, iw: F.naturalWidth, ih: F.naturalHeight });
  };
  S.render = (p, tm = 0) => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h); const F = IMG.L_field, PJ = IMG.L_peopleJ, PA = IMG.L_people;
    if (F) {
      const z = S.sc * (1.06 - 0.06 * ease(seg(p, 0, 0.35))), dw = S.iw * z, dh = S.ih * z;
      const ox = (w - dw) / 2 - (dw - w) * 0.25 * (p - 0.3), oy = (h - dh) / 2 + (dh - h) * 0.2 * (p - 0.3);
      ctx.drawImage(F, ox, oy, dw, dh);
      // the farmers walk away from us, between the gavels
      if (PJ && PA) PJ.p.forEach(([x0, y0, ax, ay, pw, ph], i) => {
        const sp = 0.8 + (i * 37 % 10) / 25, d = (p * 150 + tm / 1000 * 7) * sp, cyc = tm / 1000 * 1.9 * sp + p * 24 + i;
        let y = y0 - d; while (y + ph < -10) y += S.ih + ph; const bob = Math.abs(Math.sin(cyc * Math.PI)) * 2.2, sway = Math.sin(cyc * Math.PI) * 1.2;
        const cx = ox + (x0 + pw / 2 + sway) * z, cy = oy + (y + ph - bob) * z;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(cyc * Math.PI) * 0.025); ctx.drawImage(PA, ax, ay, pw, ph, -pw / 2 * z, -ph * z, pw * z, ph * z); ctx.restore();
      });
    }
    const dark = ease(seg(p, 0.2, 0.36)) * 0.8 + ease(seg(p, 0.42, 0.55)) * 0.17;
    ctx.fillStyle = `rgba(11,11,11,${dark})`; ctx.fillRect(0, 0, w, h);
    const lc = $("lawcopy"); lc.classList.toggle("on", p > 0.24); lc.classList.toggle("left", p > 0.46);
    S.gav.forEach((G, i) => G.render(p, tm, i));
  };
  // four pointers: Alex's red gavel and its block; each strikes once when its row arrives
  S.gav = [...$("gavels").children].map((li, i) => {
    const c = li.querySelector("canvas"), G = { li, c, last: null };
    G.layout = () => { Object.assign(G, sizeCanvas(c)); G.last = null; };
    G.render = (p, tm, i) => {
      const t0 = 0.5 + i * 0.1, on = p > t0 - 0.04, hit = seg(p, t0, t0 + 0.03), back = seg(p, t0 + 0.03, t0 + 0.08);
      li.classList.toggle("on", on); const Hm = IMG.L_gavel_h, Bk = IMG.L_gavel_b; if (!Hm || !Bk) return;
      // raised higher, swings down past rest onto the block, settles back
      const a = hit < 1 ? -0.32 * (1 - Math.pow(hit, 2.2)) + 0.13 * Math.pow(hit, 2.2) : 0.13 * (1 - ease(back));
      const key = Math.round(a * 500); if (key === G.last) return; G.last = key;
      const { ctx, w, h } = G; ctx.clearRect(0, 0, w, h);
      const k = Math.min(w / 1100, h / 900) * 0.92, ox = (w - 1054 * k) / 2 - 288 * k, oy = (h - 880 * k) / 2 - 70 * k;
      ctx.drawImage(Bk, ox + 620 * k, oy + 640 * k, 722 * k, 305 * k);
      const px = ox + 330 * k, py = oy + 880 * k; ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.drawImage(Hm, (288 - 330) * k, (80 - 880) * k, 858 * k, 876 * k); ctx.restore();
      if (hit >= 1 && back < 1) { ctx.strokeStyle = `rgba(225,6,0,${1 - back})`; ctx.lineWidth = 1.5; const bx = ox + 1000 * k, by = oy + 660 * k;
        for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.ellipse(bx, by, (380 + back * 220 + r * 70) * k, (70 + back * 40 + r * 14) * k, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); } }
    };
    return G;
  });
  const lay = S.layout; S.layout = () => { lay(); S.gav.forEach(G => G.layout()); };
  return S;
}

/* ================= march map (scenes 9–10) ================= */
function makeMarch() {
  const S = { c: $("cmarch") };
  const SITES = [["Singhu", 77.10, 28.81], ["Tikri", 76.93, 28.69], ["Ghazipur", 77.33, 28.63]];
  const BARS = [["Water cannon", 76.80, 30.37], ["Tear gas", 76.98, 29.68], ["Dug-up roads", 76.60, 28.95], ["Barricades, sand trucks", 77.55, 29.05]];
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h });
    const bbox = { type: "MultiPoint", coordinates: [[73.9, 32.5], [79.0, 27.9]] };
    const proj = d3.geoMercator().fitExtent([[10, 10], [w - 10, h - 10]], bbox); S.proj = proj;
    const oc = document.createElement("canvas"); oc.width = Math.ceil(w); oc.height = Math.ceil(h); const ox = oc.getContext("2d", { willReadFrequently: true });
    ox.fillStyle = "#fff"; ox.beginPath(); d3.geoPath(proj, ox)(DATA.india); ox.fill(); const im = ox.getImageData(0, 0, oc.width, oc.height).data;
    const s = Math.max(6, Math.min(w, h) / 55); S.s = s; S.land = [];
    for (let j = 0, y = s / 2; y < h; j++, y += s * .866) for (let x = s / 2 + (j % 2 ? s / 2 : 0); x < w; x += s) if (im[(Math.floor(y) * oc.width + Math.floor(x)) * 4 + 3] > 100) S.land.push([x, y]);
    S.sites = SITES.map(([n, lo, la]) => ({ n, xy: proj([lo, la]) }));
    S.bars = BARS.map(([n, lo, la]) => ({ n, xy: proj([lo, la]) }));
    const early = DATA.districts.filter(d => ["Punjab", "Haryana", "Uttar Pradesh", "Rajasthan", "Uttarakhand"].includes(d[2]) && d[4].slice(0, 4).reduce((a, b) => a + b, 0) > 0)
      .map(d => ({ xy: proj([d[1], d[0]]), wgt: d[4].slice(0, 4).reduce((a, b) => a + b, 0), st: d[2] })).filter(d => d.xy[0] > -20 && d.xy[0] < w + 20 && d.xy[1] > -20 && d.xy[1] < h + 20);
    S.origins = early; const R = rng(11); const tot = d3.sum(early, d => d.wgt);
    const N = MOBILE() ? 380 : 700; S.parts = [];
    for (let i = 0; i < N; i++) {
      let u = R() * tot, o = early[0]; for (const e of early) { u -= e.wgt; if (u <= 0) { o = e; break; } }
      const site = o.st === "Uttar Pradesh" || o.st === "Uttarakhand" ? 2 : (o.xy[1] < S.sites[0].xy[1] - h * 0.25 && R() < .78 ? 0 : (R() < .5 ? 1 : 0));
      const dst = S.sites[site].xy, ang = R() * 6.283, rr = Math.sqrt(R()) * s * (site === 2 ? 1.6 : 2.4);
      const ox2 = o.xy[0] + (R() - .5) * s, oy2 = o.xy[1] + (R() - .5) * s;
      const mx = (ox2 + dst[0]) / 2 + (R() - .5) * s * 3, my = (oy2 + dst[1]) / 2 + (R() - .5) * s * 3;
      S.parts.push({ o: [ox2, oy2], c: [mx, my], d: [dst[0] + Math.cos(ang) * rr, dst[1] + Math.sin(ang) * rr], del: R() * 0.5, hold: 0.62 + R() * 0.14 });
    }
    barrLayout();
  };
  /* "Met with barricades": drawn over the matrix map itself. The crowd runs down NH44 from Shambhu to Singhu */
  const GSP = [[76.66, 30.52, 120, .4], [76.78, 30.38, 240, .9], [76.85, 29.97, 270, 1.2], [76.98, 29.69, 210, 1.05], [76.97, 29.39, 150, .7], [77.02, 28.99, 105, .45], [77.10, 28.81, 70, .28]];
  const SPINE = GSP.map(g => [0, 0, g[2], g[3]]);
  const B2 = { truck: [79, 127, 714, 371], spray: [440, 127, 353, 193], can: [938, 360, 122, 152], smoke: [938, 49, 496, 371], barr: [41, 608, 668, 363], road: [763, 634, 731, 329] };
  // [label, spine t, side, gap, group anchor in sheet px, sheet px -> frame units]
  const OBST = [[["WATER", "CANNON"], 0.1, 1, 60, [436, 470], 0.42], [["TEAR", "GAS"], 0.4, 1, 70, [1000, 500], 0.36], [["DUG-UP", "ROADS"], 0.66, -1, 40, [1128, 960], 0.36], [["BARRICADES,", "SAND TRUCKS"], 0.9, 1, 40, [375, 960], 0.36]];
  const spineAt = t => { const n = SPINE.length - 1, f = clamp(t) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i, A = SPINE[i], B = SPINE[i + 1];
    return [lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u), lerp(A[3], B[3], u), Math.atan2(B[1] - A[1], B[0] - A[0])]; };
  const barrLayout = () => {
    const R = rng(29), N = MOBILE() ? 900 : 1500; S.cd = [];
    for (let i = 0; i < N; i++) {
      let t; do { t = R(); } while (R() > spineAt(t)[3] / 1.25);
      const gx = (R() + R() + R() - 1.5) / 1.5, gy = (R() + R() + R() - 1.5) / 1.5;
      S.cd.push({ t, gx, gy, dens: Math.exp(-(gx * gx) * 2.2) * spineAt(t)[3] / 1.25, sp: 0.006 + R() * 0.01, sz: 0.7 + R() * 0.6, ph: R() * 6.28 });
    }
    S.deb = Array.from({ length: 14 }, () => [R(), R(), R()]);
  };
  const drawBarr = (p, tm) => {
    const cin = eio(seg(p, 0.27, 0.35)), cout = eio(seg(p, 0.58, 0.66)), cmp = cin * (1 - cout); if (cmp <= 0) return;
    const { ctx } = S, mob = MOBILE(), sec = tm / 1000;
    GSP.forEach((g, i) => { const [x, y] = S.toS([g[0], g[1]]); SPINE[i][0] = x; SPINE[i][1] = y; });
    const k = Math.hypot(SPINE[6][0] - SPINE[0][0], SPINE[6][1] - SPINE[0][1]) / 900; // screen px per frame unit
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = cmp;
    const grow = ease(seg(p, 0.3, 0.46));
    for (let i = 0; i <= 16; i++) { const [x, y, wd, d] = spineAt(i / 16); if (i / 16 > grow + 0.05) break; const r = wd * 1.6 * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(190,0,0,${0.09 * d})`); g.addColorStop(1, "rgba(200,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    for (const c of S.cd) {
      const t = (c.t + sec * c.sp * 0.25) % 1; if (t > grow) continue;
      const [x, y, wd, , ang] = spineAt(t), nx = -Math.sin(ang), ny = Math.cos(ang), off = c.gx * wd * k, along = c.gy * wd * 0.35 * k;
      const px = x + nx * off + Math.cos(ang) * along, py = y + ny * off + Math.sin(ang) * along, d = c.dens;
      const r = (2.4 + 2.4 * d) * c.sz * k * (mob ? 1.3 : 1) + 0.5, a = 0.3 + 0.7 * d;
      ctx.fillStyle = d > 0.62 ? `rgba(255,${50 + Math.round(40 * d)},${40 + Math.round(30 * d)},${a})` : `rgba(${150 + Math.round(105 * d)},0,0,${a})`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();
    }
    const spr = (key, ax, ay, sx, sy, sc, alpha = 1, clip) => { const I = IMG["B2_" + key], b = B2[key]; if (!I) return; const x = sx + (b[0] - ax) * sc, y = sy + (b[1] - ay) * sc, ww = b[2] * sc, hh = b[3] * sc;
      ctx.save(); ctx.globalAlpha *= alpha; if (clip) { ctx.beginPath(); ctx.rect(...clip(x, y, ww, hh)); ctx.clip(); } ctx.drawImage(I, x, y, ww, hh); ctx.restore(); };
    OBST.forEach(([lab, t, side, gap, [ax, ay], fu], i) => {
      const a = ease(seg(p, 0.34 + i * 0.045, 0.39 + i * 0.045)); if (a <= 0) return;
      const [x0, y0, wd, , ang] = spineAt(t), nx = Math.sin(ang) * side, ny = -Math.cos(ang) * side, sc = fu * k * (mob ? 1.7 : 1.35);
      const ext = [[357, 357, 343], [434, 80, 451], [366, 365, 326], [334, 334, 352]][i];
      let gx = x0 + side * (wd * 0.42 * k + ext[side > 0 ? 1 : 0] * sc + 6), gy = y0 + ext[2] * sc * 0.45;
      ctx.globalAlpha = cmp;
      const ph = sec + i * 1.7;
      if (i === 0) { // the truck drives in, then the cannon sprays
        const dx = (1 - a) * -90 * k; spr("truck", ax, ay, gx + dx, gy, sc, a);
        const on = clamp((a - 0.6) / 0.4); if (on > 0) { const pulse = 0.78 + 0.22 * Math.sin(sec * 7);
          spr("spray", ax, ay, gx + dx, gy, sc, on * pulse, (x, y, w2, h2) => [x, y - 4, w2 * (0.25 + 0.75 * on) * (0.92 + 0.08 * Math.sin(sec * 5)), h2 + 8]);
          const nzx = gx + dx + (455 - ax) * sc, nzy = gy + (238 - ay) * sc;
          for (let j = 0; j < 5; j++) for (let m = 0; m < 5; m++) { const f = ((sec * 0.6 + m / 5 + j * 0.17) % 1), ex = (330 - j * 25) * sc, ey = (-60 + j * 45) * sc;
            const bx = nzx + 2 * (1 - f) * f * ex * 0.6 + f * f * ex, by = nzy + 2 * (1 - f) * f * (-90 * sc) + f * f * ey;
            ctx.fillStyle = `rgba(237,237,234,${0.85 * (1 - f) * on})`; ctx.beginPath(); ctx.arc(bx, by, Math.max(0.8, 5 * sc), 0, 6.2832); ctx.fill(); } }
      } else if (i === 1) { // a canister lands, smoke billows
        const land = clamp(a / 0.6), cx = gx + (1 - land) * 160 * k, cy = gy - Math.sin(land * Math.PI) * 120 * k;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate((1 - land) * 4 + Math.sin(sec * 3) * 0.03); spr("can", B2.can[0], B2.can[1], (B2.can[0] - ax) * sc, (B2.can[1] - ay) * sc, sc, 1); ctx.restore();
        const sm = clamp((a - 0.5) / 0.5); if (sm > 0) for (let m = 0; m < 3; m++) { const f = (sec * 0.09 + m / 3) % 1, s2 = sc * (0.55 + 0.6 * f) * (0.4 + 0.6 * sm);
          ctx.save(); ctx.translate(gx + (1005 - ax) * sc, gy + (395 - ay) * sc); spr("smoke", 1005, 395, f * 40 * sc, -f * 70 * sc, s2 / sc * sc, sm * Math.sin(f * Math.PI) * 0.9); ctx.restore(); }
      } else if (i === 2) { // the road is dug open from the middle out
        const dig = clamp(a * 1.2); spr("road", ax, ay, gx, gy, sc, 1, (x, y, w2, h2) => [x + w2 * 0.5 * (1 - dig), y - 10, w2 * dig, h2 + 20]);
        S.deb.forEach(([u, v, z]) => { const f = (sec * (0.5 + z * 0.5) + u) % 1, bx = gx + (-220 + u * 440) * sc + f * (v - 0.5) * 120 * sc, by = gy - 120 * sc - Math.sin(f * Math.PI) * (60 + v * 80) * sc;
          ctx.fillStyle = `rgba(150,140,130,${0.8 * (1 - f) * dig})`; ctx.fillRect(bx, by, 6 * sc + 1, 5 * sc + 1); });
      } else { // the barricade drops into place, the wire shivers
        const drop = (1 - a) * -80 * k + (a < 1 ? Math.sin(a * 9) * (1 - a) * 12 * k : 0);
        spr("barr", ax, ay, gx + Math.sin(sec * 22) * 0.4, gy + drop, sc, a);
      }
      // label
      const fs = Math.max(11, 25 * k * (mob ? 1.1 : 1));
      ctx.font = `800 ${fs}px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "left"; ctx.globalAlpha = cmp * a;
      const tw = Math.max(...lab.map(s => ctx.measureText(s).width)), ly = gy - ext[2] * sc * (i === 2 ? 1.25 : 0.75);
      let tx = side > 0 ? gx + ext[0] * sc + 16 : gx - ext[1] * sc - tw - 16; tx = clamp(tx, 6, S.w - tw - 6);
      ctx.fillStyle = RED; ctx.fillRect(tx - 10, ly, 3, fs * 2.15); ctx.fillStyle = PAPER;
      ctx.strokeStyle = "#0B0B0B"; ctx.lineWidth = 4; ctx.lineJoin = "round";
      lab.forEach((s, j) => { ctx.strokeText(s, tx, ly + fs * (0.9 + j * 1.05)); ctx.fillText(s, tx, ly + fs * (0.9 + j * 1.05)); });
    });
    ctx.globalAlpha = cmp * ease(seg(p, 0.5, 0.56)); const lf = Math.max(10, 13);
    const gx0 = 16, gy0 = S.h - (mob ? 30 : 110);
    ctx.font = `800 ${lf}px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = PAPER; ctx.textAlign = "left"; ctx.fillText("CROWD DENSITY", gx0 + (mob ? 0 : S.w * 0.0), gy0);
    [["High", "rgba(255,80,70,1)"], ["Medium", "rgba(190,10,10,.9)"], ["Low", "rgba(110,0,0,.8)"]].forEach(([t, c], i) => {
      const cx = mob ? gx0 + 6 + i * 84 : gx0 + 8, cy = mob ? gy0 + 18 : gy0 + 22 + i * 24, rr = 6;
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.fill(); ctx.font = `500 ${lf}px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = G3; ctx.fillText(t, cx + rr + 8, cy + lf * 0.35); });
    ctx.restore();
  };
  const bez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  S.render = (p, tm = 0) => {
    const { ctx, w, h, s } = S; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
    // camera: wide on the roads, closer on the barricades, closest on Delhi's borders
    const z1 = eio(seg(p, 0.26, 0.38)), z2 = eio(seg(p, 0.6, 0.72));
    const c0 = [w / 2, h / 2], c1 = S.proj([76.95, 29.75]), c2 = S.proj([77.12, 28.74]);
    const k = lerp(lerp(1, 1.55, z1), 2.6, z2), cx = lerp(lerp(c0[0], c1[0], z1), c2[0], z2), cy = lerp(lerp(c0[1], c1[1], z1), c2[1], z2);
    const X = x => w / 2 + (x - cx) * k, Y = y => h / 2 + (y - cy) * k;
    ctx.setTransform(DPR * k, 0, 0, DPR * k, DPR * (w / 2 - cx * k), DPR * (h / 2 - cy * k));
    drawLand(ctx, S.land, s * 1.4 / Math.sqrt(k), "#2c2c2c", 1);
    ctx.fillStyle = "#4a4a4a"; for (const o of S.origins) { ctx.beginPath(); ctx.arc(o.xy[0], o.xy[1], Math.max(1.4, Math.sqrt(o.wgt) * 1.1) / Math.sqrt(k), 0, 6.283); ctx.fill(); }
    const dl = S.proj([77.2, 28.62]); ctx.strokeStyle = G2; ctx.lineWidth = 1 / k; ctx.setLineDash([3 / k, 4 / k]); ctx.beginPath(); ctx.arc(dl[0], dl[1], s * 2.4, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
    const go = seg(p, 0.02, 0.3), held = p < .62, fin = ease(seg(p, .62, .9));
    // marchers, each with a short tail
    const pr = 1.5 / Math.sqrt(k); ctx.lineCap = "round";
    for (const q of S.parts) {
      let t = ease(clamp((go * 1.5 - q.del) / 1)) * q.hold;
      if (!held) t = lerp(q.hold, 1, clamp((fin * 1.3 - q.del * 0.6)));
      if (t <= 0) continue;
      const jig = (t >= q.hold - 0.001 && held) ? Math.sin(tm / 300 + q.del * 40) * 0.004 : 0;
      const [x, y] = bez(q.o, q.c, q.d, t + jig), moving = held ? t < q.hold - 0.01 : t < 0.995;
      if (moving) { const [x0, y0] = bez(q.o, q.c, q.d, Math.max(0, t - 0.05)); ctx.strokeStyle = "rgba(225,6,0,.35)"; ctx.lineWidth = pr * 1.3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); }
      ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(x, y, pr, 0, 6.283); ctx.fill();
    }
    // labels are drawn unscaled
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = G2; ctx.textAlign = "left";
    [["PUNJAB", 75.2, 31.6], ["HARYANA", 75.9, 29.4], ["UTTAR PRADESH", 78.2, 28.4]].forEach(([n, lo, la]) => { const [x, y] = S.proj([lo, la]); ctx.fillText(n, clamp(X(x), 8, w - 110), Y(y)); });
    ctx.fillStyle = G3; ctx.textAlign = "center"; ctx.fillText("DELHI", X(dl[0]), Y(dl[1] + s * 2.4) + 14);
    S.toS = ll => { const [x, y] = S.proj(ll); return [X(x), Y(y)]; };
    drawBarr(p, tm);
    if (fin > 0) { ctx.globalAlpha = fin; ctx.font = `800 ${MOBILE() ? 20 : 26}px "Bricolage Grotesque", sans-serif`;
      for (const st of S.sites) { const x = X(st.xy[0]), y = Y(st.xy[1]); const off = st.n === "Ghazipur" ? [26, 30] : st.n === "Tikri" ? [-26, 8] : [-24, -16];
        ctx.textAlign = off[0] > 0 ? "left" : "right"; ctx.fillStyle = PAPER; ctx.fillText(st.n.toUpperCase(), x + off[0], y + off[1]); }
      ctx.globalAlpha = 1; }
  };
  return S;
}

/* ================= camp, people, precautions (DOM builds) ================= */
function buildCamp() {
  const items = [["A07_02", "Langar", "Free kitchens, day and night"], ["A07_08", "Trolley homes", "Tractor trolleys turned into bedrooms"], ["A07_01", "Tents", "Tarpaulin roofs along the highway"], ["A07_05", "Solar charging", "Phone charging points run on solar"], ["A07_06", "Laundry", "Washing services run by volunteers"], ["A07_03", "Library", "Books at the protest site"], ["A07_04", "Medical camps", "Volunteer doctors, some from abroad"], ["", "Dental", "Cleaning, fillings, extractions"], ["", "School", "Classes for children at the camps"], ["A07_10", "Trolley Times", "The camps' own newspaper"], ["", "CCTV", "Eight cameras at Singhu, run by SKM"], ["", "Massage", "Foot-massage chairs for the elderly"]];
  $("camp").innerHTML = items.map(([k, t, s]) => `<div class="cell">${k ? shapeSVG(k, G3) : `<span class="stamp">${t.split(" ")[0]}</span>`}<span class="t">${t}<small>${s}</small></span></div>`).join("");
}
function buildPeople() {
  const figs = [["A09_01", "Elderly"], ["A09_02", "Women"], ["A09_03", "Students"], ["A09_04", "Children"], ["A09_06", "Youth"], ["A09_07", "Volunteers"]];
  $("people").innerHTML = figs.map(([k, t]) => `<figure>${shapeSVG(k, RED)}<figcaption>${t}</figcaption></figure>`).join("");
  const others = [["Landless Dalit labourers", "marched and camped beside landowners"], ["Muslim volunteers", "ran a langar at Singhu"], ["Punjabi singers", "made the protest its soundtrack"], ["The diaspora", "rallies in about 50 cities on 17 Dec 2020; money, tents, doctors"], ["Doctors", "volunteer medical and dental camps"], ["Students", "petitions, supplies and hashtags"]];
  $("others").innerHTML = others.map(([a, b]) => `<div><b>${a}</b> ${b}</div>`).join("");
}
function buildSafe() {
  const st = { PR1: "Peace", PR2: "11–3", PR3: "CCTV", PR4: "IT cell", PR5: "", PR6: "Condemn", PR7: "Night", PR8: "Shifts" };
  $("safe").innerHTML = DATA.precautions.filter(r => r[3] !== "verify").map(r => `<div class="cell">${r[0] === "PR5" ? shapeSVG("A07_04", G3) : `<span class="stamp">${st[r[0]] || ""}</span>`}<span class="t"><span class="${r[3] === "verify" ? "v" : ""}">${r[1]}</span><small>${r[2]}</small></span></div>`).join("");
}
function revealCells(id, p, a = 0.06, b = 0.85) { const cs = $(id).children; const n = cs.length; for (let i = 0; i < n; i++) cs[i].classList.toggle("on", p > a + (b - a) * i / n); }

/* ================= camp: a town plan along the highway; precautions: rings of care ================= */
const ICON = { // simple flat icons for the services with no asset yet
  tooth: "M6 4c4-3 8 1 10 1s6-4 10-1c4 3 2 11 0 16-1 4-1 12-4 12s-2-9-6-9-3 9-6 9-3-8-4-12C4 15 2 7 6 4z",
  school: "M3 4h26v16H3zM6 7v10h20V7zM9 10h9v2H9zM9 13h6v2H9zM10 20l-3 9h3l2-6h8l2 6h3l-3-9z",
  cctv: "M2 9l20-5 3 7-20 5zM24 8l5-1 1 4-5 1zM9 15l3 6H7v6H4V18h4z",
  massage: "M8 3a3 3 0 110 6 3 3 0 010-6zM5 11h6l2 9h9l3 7h-3l-2-5H11zM20 14h8v3h-8zM6 21h3v8H6z"
};
function iconSVG(key, fill, size) {
  if (ICON[key]) return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" x="${-size / 2}" y="${-size / 2}"><path d="${ICON[key]}" fill="${fill}" fill-rule="evenodd"/></svg>`;
  const s = SH[key]; if (!s) return ""; const sc = size / Math.max(s.w, s.h);
  return `<svg viewBox="0 0 ${s.w} ${s.h}" width="${s.w * sc}" height="${s.h * sc}" x="${-s.w * sc / 2}" y="${-s.h * sc / 2}"><path d="${s.d}" fill="${fill}" fill-rule="evenodd"/></svg>`;
}
const S_CAMP = {};
const CAMP = [ // [icon, name, from the Camp_infrastructure sheet: what, run by]
  ["A07_08", "Trolley homes", "Tractor trolleys turned into homes", "Farmers"],
  ["A07_02", "Langar", "Free kitchens round the clock: rotis, lentils, tea, buttermilk, even pizza. Mechanical roti makers", "Gurdwara committees, Khalsa Aid, student groups, NRI NGOs"],
  ["A07_01", "Tents", "Tents along the highway, beside the trolleys", "Farmers, NGOs incl. Khalsa Aid"],
  ["A07_05", "Solar charging", "Solar-powered phone charging points", "NGOs"],
  ["A07_06", "Laundry", "Laundry services", "NGOs"],
  ["A07_04", "Clinics", "Medical stalls and free medical camps", "Volunteer doctors, incl. diaspora doctors"],
  ["tooth", "Dentists", "Dental camps: cleaning, filling, extraction", "Volunteer dentists"],
  ["A07_03", "Library", "A library at the protest site", "Volunteers"],
  ["massage", "Foot massage", "Foot-massage chairs for the elderly", "Volunteers"],
  ["school", "School", "Makeshift schools for the children", "Volunteers"],
  ["A07_10", "Trolley Times", "The camp's own newspaper; an IT cell from Dec 2020 to counter misinformation", "Protesters, SKM"],
  ["cctv", "CCTV", "Eight CCTV cameras at Singhu", "SKM's CCTV team"]];
function renderCampMap() {
  const svg = $("vcamp"); const { w, h: h0 } = svgSize(svg); const mob = w < 520, h = mob ? h0 - 48 : h0;
  const vx = w * 0.5, vy = h * (mob ? 0.27 : 0.3), hwN = w * (mob ? 0.27 : 0.33), Y = f => vy + (h - vy) * f, HW = f => hwN * f;
  S_CAMP.g = { vx, vy, hwN, Y, HW, mob, w, h };
  let o = `<defs>
    <linearGradient id="croad" x1="0" y1="${vy}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5a5a56"/><stop offset=".35" stop-color="#2c2c2a"/><stop offset="1" stop-color="#121212"/></linearGradient>
    <radialGradient id="cside" cx="${vx}" cy="${vy}" r="${w * 0.62}" gradientTransform="translate(${vx} ${vy}) scale(1 .75) translate(${-vx} ${-vy})" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a3a37"/><stop offset=".5" stop-color="#1c1c1b" stop-opacity=".8"/><stop offset="1" stop-color="#0B0B0B" stop-opacity="0"/></radialGradient><linearGradient id="chor" x1="0" x2="${w}" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#EDEDEA" stop-opacity="0"/><stop offset=".5" stop-color="#EDEDEA" stop-opacity=".35"/><stop offset="1" stop-color="#EDEDEA" stop-opacity="0"/></linearGradient>
    <radialGradient id="csky" cx="${vx}" cy="${vy}" r="${Math.max(w, h) * 0.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E10600" stop-opacity=".35"/><stop offset=".25" stop-color="#E10600" stop-opacity=".08"/><stop offset="1" stop-color="#0B0B0B" stop-opacity="0"/></radialGradient>
    <pattern id="ctex" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".8" fill="#EDEDEA" opacity=".12"/></pattern>
    <pattern id="ctent" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#6E6E6E"/><circle cx="1.5" cy="1.5" r=".8" fill="#B9B9B9"/></pattern></defs>`;
  o += `<rect x="0" y="${vy}" width="${w}" height="${h - vy}" fill="url(#cside)"/><rect x="0" y="0" width="${w}" height="${h}" fill="url(#csky)"/>`;
  o += `<line x1="0" x2="${w}" y1="${vy}" y2="${vy}" stroke="url(#chor)"/>`;
  const fE = mob ? 1 : 1.08, road = `M${vx - HW(fE)} ${Y(fE)} L${vx - 1.5} ${vy} L${vx + 1.5} ${vy} L${vx + HW(fE)} ${Y(fE)}Z`;
  o += `<path d="${road}" fill="url(#croad)"/><path d="${road}" fill="url(#ctex)"/>`;
  [-1, 1].forEach(s => o += `<line x1="${vx + s * HW(fE) * 0.94}" y1="${Y(fE)}" x2="${vx + s * 1.2}" y2="${vy}" stroke="#B9B9B9" stroke-width="${mob ? 1.5 : 2.5}" opacity=".7"/>`);
  for (let d = 0; d < 30; d += 0.55) { const f0 = 1 / (1 + d), f1 = 1 / (1 + d + 0.28); if (f0 < 0.05) break; const a = HW(f0) * 0.018 + 0.3, b = HW(f1) * 0.018 + 0.3;
    o += `<path d="M${vx - a} ${Y(f0)} L${vx + a} ${Y(f0)} L${vx + b} ${Y(f1)} L${vx - b} ${Y(f1)}Z" fill="#EDEDEA" opacity=".75"/>`; }
  o += `<text x="${vx}" y="${vy - 10}" text-anchor="middle" class="lbl" style="fill:#B9B9B9;font-size:${mob ? 8 : 10}px">DELHI · BARRICADED</text>`;
  o += `<text x="${mob ? 8 : vx - HW(1) - 8}" y="${h - 10}" text-anchor="${mob ? "start" : "end"}" class="lbl" style="font-size:${mob ? 8 : 10}px">NH44 · SINGHU BORDER</text>`;
  // the town: trolleys and tents fill both shoulders as the farmer passes
  const R = rng(21); let town = "";
  for (let k = 0; k < (mob ? 38 : 60); k++) { const f = 0.96 - Math.pow(R(), 0.8) * 0.8, s = R() < 0.5 ? -1 : 1, sz = (mob ? 34 : 60) * f, x = vx + s * (HW(f) + sz * (0.25 + R() * 1.6)), y = Y(f);
    if (x < -sz || x > w + sz) continue;
    const pick = R(), [src, iw, ih] = pick < 0.4 ? ["C_tent", 420, 272] : pick < 0.75 ? ["C_trolley", 420, 188] : ["C_tractor", 420, 319], ww = sz * (src === "C_tent" ? 1.1 : 1.4), hh = ww * ih / iw, flip = s < 0 && src !== "C_tent" ? -1 : 1;
    const shp = `<image href="img/${src}.png" width="${ww}" height="${hh}" x="${-ww / 2}" y="${-hh}" transform="scale(${flip},1)"/>`;
    town += `<g class="tw" data-f="${f}" transform="translate(${x},${y})" style="opacity:0;transition:opacity .5s">${shp}</g>`; }
  // order back to front
  o += town.split("</g>").filter(Boolean).map(t => t + "</g>").sort((a, b) => +a.match(/data-f="([^"]+)"/)[1] - +b.match(/data-f="([^"]+)"/)[1]).join("");
  // the services, one by one along the road
  const n = CAMP.length, fs = CAMP.map((_, i) => 0.84 - i * (0.66 / (n - 1)));
  CAMP.forEach(([k, t], i) => {
    const f = fs[i], s = i % 2 ? 1 : -1, y = Y(f), xs = vx + s * (HW(f) + 6), r = Math.max(mob ? 9 : 12, (mob ? 22 : 30) * Math.sqrt(f)), pole = Math.max(18, (mob ? 60 : 110) * f);
    const lx = s < 0 ? Math.min(xs - 10, vx - HW(f) - 40) : Math.max(xs + 10, vx + HW(f) + 40);
    o += `<g class="pin" style="opacity:0;transition:opacity .4s">
      <line x1="${xs}" y1="${y}" x2="${xs}" y2="${y - pole}" stroke="#E10600" stroke-width="1.2"/>
      <g transform="translate(${xs},${y - pole - r})" ><g class="pop" style="transform:scale(.3);transition:transform .5s cubic-bezier(.3,1.6,.5,1)"><circle r="${r}" fill="#151515" stroke="#E10600" stroke-width="1.5"/>${iconSVG(k, "#EDEDEA", r * 1.25)}</g></g>
      <text x="${xs + s * (r + 6)}" y="${y - pole - r + 4}" text-anchor="${s < 0 ? "end" : "start"}" style="font:700 ${mob ? 10 : 13}px 'Bricolage Grotesque',sans-serif;fill:#EDEDEA;stroke:#0B0B0B;stroke-width:5px;paint-order:stroke;stroke-linejoin:round">${t}</text></g>`;
  });
  // the walker: Alex's farmer, seen from behind
  o += `<g id="cwalk"><image href="img/C_walker.png" width="73" height="153" x="-36.5" y="-150" preserveAspectRatio="none"/></g>`;
  // readout
  o += `<text id="ccount" x="${w - (mob ? 8 : 24)}" y="${mob ? 30 : 56}" text-anchor="end" style="font:800 ${mob ? 28 : 50}px 'Bricolage Grotesque',sans-serif;font-stretch:75%;fill:#EDEDEA">0 / ${n}</text>
    <text x="${w - (mob ? 8 : 24)}" y="${mob ? 44 : 76}" text-anchor="end" class="lbl" style="font-size:${mob ? 8 : 10}px">SERVICES THE CAMP RUNS ITSELF</text>
    <foreignObject id="ccard" x="${mob ? 8 : 24}" y="${mob ? 10 : 36}" width="${mob ? w - 130 : Math.min(w * 0.48, 360)}" height="${mob ? 90 : 110}"></foreignObject>`;
  svg.innerHTML = o;
  S_CAMP.pins = [...svg.querySelectorAll(".pin")]; S_CAMP.tw = [...svg.querySelectorAll(".tw")]; S_CAMP.fs = fs; S_CAMP.walk = svg.querySelector("#cwalk"); S_CAMP.count = svg.querySelector("#ccount"); S_CAMP.card = svg.querySelector("#ccard"); S_CAMP.last = -2;
}
function renderCampMapP(p) {
  const G = S_CAMP.g; if (!G) return;
  const tr = seg(p, 0.05, 0.9), fw = lerp(0.97, 0.13, tr), steps = tr * 46, bob = Math.abs(Math.sin(steps * Math.PI)), sway = Math.sin(steps * Math.PI) * 2;
  const sz = (G.h * (G.mob ? 0.3 : 0.34)) * fw / 153, x = G.vx - G.HW(fw) * 0.28, y = G.Y(fw) - bob * 3 * sz;
  S_CAMP.walk.setAttribute("transform", `translate(${x},${y}) scale(${sz}) rotate(${sway})`); S_CAMP.walk.style.opacity = tr > 0.995 ? 0 : 1;
  S_CAMP.tw.forEach(t => t.style.opacity = fw <= +t.dataset.f + 0.01 ? 1 : 0);
  let last = -1; S_CAMP.pins.forEach((g, i) => { const on = fw <= S_CAMP.fs[i] + 0.015; if (on) last = i; g.style.opacity = on ? 1 : 0; g.querySelector(".pop").style.transform = on ? "scale(1)" : "scale(.3)"; });
  S_CAMP.count.textContent = `${last + 1} / ${CAMP.length}`;
  if (last !== S_CAMP.last) { S_CAMP.last = last; const fz = G.mob ? 12 : 15;
    S_CAMP.card.innerHTML = last < 0 ? `<div xmlns="http://www.w3.org/1999/xhtml" style="font:400 ${fz}px/1.35 'Bricolage Grotesque',sans-serif;color:#EDEDEA">November 2020. The march is stopped at the Delhi border. So the farmers stay, and the highway starts to become a town.</div>`
      : `<div xmlns="http://www.w3.org/1999/xhtml" style="font:400 ${fz}px/1.35 'Bricolage Grotesque',sans-serif;color:#EDEDEA"><div style="font:700 ${G.mob ? 9 : 11}px 'Bricolage Grotesque',sans-serif;letter-spacing:.14em;color:#E10600;margin-bottom:4px">${CAMP[last][1].toUpperCase()}</div>${CAMP[last][2]}.<br><span style="color:#9a9a96">Run by: ${CAMP[last][3]}</span></div>`; }
}
const S_SAFE = {};
function renderSafeRings() {
  const svg = $("vsafe"); const { w, h } = svgSize(svg); const mob = w < 520;
  const rows = DATA.precautions.filter(r => r[3] !== "verify"), n = rows.length;
  const cx = mob ? 26 : 40, cy = h - (mob ? 20 : 30), r0 = mob ? 34 : 54, gap = (Math.min(h - 50, w * 0.95) - r0) / n;
  let html = "";
  const R = rng(3); for (let i = 0; i < 90; i++) { const a = -Math.PI / 2 * R(), r = Math.sqrt(R()) * r0 * 0.85; html += `<circle cx="${cx + Math.cos(a) * r}" cy="${cy + Math.sin(a) * r}" r="${mob ? 1.8 : 2.4}" fill="#E10600"/>`; }
  html += `<text x="${cx}" y="${cy + (mob ? 14 : 20)}" class="lbl">THE CAMP</text>`;
  rows.forEach((r, i) => {
    const rr = r0 + gap * (i + 1), len = Math.PI / 2 * rr;
    html += `<g class="ring" style="opacity:0;transition:opacity .4s"><path d="M${cx} ${cy - rr} A${rr} ${rr} 0 0 1 ${cx + rr} ${cy}" fill="none" stroke="${i % 2 ? "#6E6E6E" : "#B9B9B9"}" stroke-width="${mob ? 1.4 : 2}" stroke-dasharray="${len}" stroke-dashoffset="${len}" style="transition:stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)"/>
      <circle cx="${cx}" cy="${cy - rr}" r="${mob ? 3 : 4}" fill="#E10600"/>
      <text x="${cx + 10}" y="${cy - rr + 4}" style="font:600 ${mob ? 12 : 15}px 'Bricolage Grotesque',sans-serif;fill:#EDEDEA;stroke:#0B0B0B;stroke-width:7px;paint-order:stroke;stroke-linejoin:round">${r[1]}</text>
      ${mob ? "" : `<text x="${cx + 10}" y="${cy - rr + 21}" style="font:400 12px 'Bricolage Grotesque',sans-serif;fill:#9a9a96;stroke:#0B0B0B;stroke-width:6px;paint-order:stroke;stroke-linejoin:round">${r[2].length > 70 ? r[2].slice(0, 68) + "…" : r[2]}</text>`}</g>`;
  });
  svg.innerHTML = html; S_SAFE.rings = [...svg.querySelectorAll(".ring")];
}
function renderSafeRingsP(p) { S_SAFE.rings.forEach((g, i) => { const on = p > 0.08 + i * 0.1; g.style.opacity = on ? 1 : 0; g.querySelector("path").style.strokeDashoffset = on ? 0 : ""; }); }

/* ================= who runs it: forty unions as tall illustrated figures ================= */
// one elongated standing figure, engraved style. Box: width W, height H, feet at bottom.
function councilFigure(g, x, y0, W, H, fill, R, id) {
  const u = W, k = H / 6.2, ink = "#0B0B0B", e = (t, a) => svgEl(t, a, g), Y = v => y0 + v * k;
  const turban = R() < 0.72, cap = !turban && R() < 0.5, beard = R() < 0.7, shawl = R() < 0.8, hold = R();
  const pat = ["url(#p-dots)", "url(#p-hatch)", "url(#p-check)"][Math.floor(R() * 3)];
  const sw = u * (0.92 + R() * 0.1), cx = x + W / 2;
  // robe
  e("path", { d: `M${cx - sw / 2} ${Y(1.05)} Q${cx} ${Y(0.92)} ${cx + sw / 2} ${Y(1.05)} L${cx + sw * 0.42} ${Y(5.85)} L${cx - sw * 0.42} ${Y(5.85)} Z`, fill });
  e("path", { d: `M${cx - sw * 0.12} ${Y(2.9)} L${cx - sw * 0.16} ${Y(5.8)} M${cx + sw * 0.14} ${Y(3.2)} L${cx + sw * 0.18} ${Y(5.8)} M${cx} ${Y(3.6)} L${cx + sw * 0.02} ${Y(5.8)}`, stroke: ink, "stroke-width": Math.max(0.6, u * 0.025), fill: "none", opacity: 0.55 });
  if (shawl) { e("path", { d: `M${cx - sw / 2} ${Y(1.05)} Q${cx} ${Y(0.92)} ${cx + sw / 2} ${Y(1.05)} L${cx + sw * 0.47} ${Y(2.7)} Q${cx} ${Y(2.95)} ${cx - sw * 0.47} ${Y(2.7)} Z`, fill: pat }); }
  // folded arms, or a hand holding something
  e("path", { d: `M${cx - sw * 0.44} ${Y(2.25)} Q${cx} ${Y(2.05)} ${cx + sw * 0.44} ${Y(2.25)} L${cx + sw * 0.42} ${Y(2.55)} Q${cx} ${Y(2.38)} ${cx - sw * 0.42} ${Y(2.55)} Z`, fill, stroke: ink, "stroke-width": Math.max(0.6, u * 0.03) });
  if (hold < 0.25) e("rect", { x: cx - sw * 0.15, y: Y(1.9), width: sw * 0.3, height: k * 0.55, fill: "#EDEDEA", stroke: ink, "stroke-width": 0.6 }); // a paper
  else if (hold < 0.4) { e("line", { x1: cx + sw * 0.3, y1: Y(0.2), x2: cx + sw * 0.3, y2: Y(5.9), stroke: ink, "stroke-width": Math.max(1, u * 0.06) }); } // a lathi
  // feet
  e("ellipse", { cx: cx - sw * 0.16, cy: Y(5.92), rx: sw * 0.16, ry: k * 0.08, fill: ink }); e("ellipse", { cx: cx + sw * 0.16, cy: Y(5.92), rx: sw * 0.16, ry: k * 0.08, fill: ink });
  // head
  e("ellipse", { cx, cy: Y(0.58), rx: u * 0.27, ry: k * 0.36, fill });
  e("path", { d: `M${cx - u * 0.1} ${Y(0.55)} h${u * 0.06} M${cx + u * 0.05} ${Y(0.55)} h${u * 0.06}`, stroke: ink, "stroke-width": Math.max(0.7, u * 0.035) });
  if (beard) e("path", { d: `M${cx - u * 0.25} ${Y(0.62)} Q${cx - u * 0.2} ${Y(1.25)} ${cx} ${Y(1.3)} Q${cx + u * 0.2} ${Y(1.25)} ${cx + u * 0.25} ${Y(0.62)} Q${cx} ${Y(0.82)} ${cx - u * 0.25} ${Y(0.62)} Z`, fill: "url(#p-hatch)", stroke: ink, "stroke-width": 0.5 });
  if (turban) { e("path", { d: `M${cx - u * 0.31} ${Y(0.5)} Q${cx - u * 0.36} ${Y(-0.05)} ${cx} ${Y(0.02)} Q${cx + u * 0.38} ${Y(0.0)} ${cx + u * 0.31} ${Y(0.5)} Q${cx} ${Y(0.36)} ${cx - u * 0.31} ${Y(0.5)} Z`, fill, stroke: ink, "stroke-width": Math.max(0.6, u * 0.03) });
    e("path", { d: `M${cx - u * 0.26} ${Y(0.34)} Q${cx} ${Y(0.12)} ${cx + u * 0.27} ${Y(0.28)} M${cx - u * 0.22} ${Y(0.2)} Q${cx + u * 0.05} ${Y(0.02)} ${cx + u * 0.26} ${Y(0.16)}`, stroke: ink, "stroke-width": Math.max(0.5, u * 0.022), fill: "none" }); }
  else if (cap) e("path", { d: `M${cx - u * 0.27} ${Y(0.4)} L${cx - u * 0.22} ${Y(0.18)} L${cx + u * 0.22} ${Y(0.18)} L${cx + u * 0.27} ${Y(0.4)} Z`, fill: "#EDEDEA", stroke: ink, "stroke-width": 0.6 });
}
const UNIONS = [ // [name, leader, base, note] named where news reports name them; the rest are unnamed members of the 32
  ["BKU (Ekta Ugrahan)", "Joginder Singh Ugrahan", "Punjab · Malwa, 12 districts", "Punjab's largest farm union by cadre (TOI)"],
  ["BKU (Ekta Dakaunda)", "Buta Singh Burjgill", "Punjab · Barnala, Bathinda, Mansa", ""],
  ["BKU (Lakhowal)", "Ajmer Singh Lakhowal", "Punjab · Ludhiana", "One of the oldest farm unions in Punjab"],
  ["BKU (Rajewal)", "Balbir Singh Rajewal", "Punjab", ""],
  ["BKU (Sidhupur)", "Jagjit Singh Dallewal", "Punjab · cotton belt", ""],
  ["Krantikari Kisan Union", "Darshan Pal", "Punjab", "A key negotiator for the unions"],
  ["BKU (Krantikari)", "Surjit Singh Phool", "Punjab · Rampura Phool, Bathinda", ""],
  ["Kirti Kisan Union", "Nirbhai Singh", "Punjab · Faridkot", "Mainly small farmers and farm labourers"],
  ["Kisan Sangharsh Committee Punjab", "Kanwalpreet Singh Pannu", "Punjab", "Founded in 2000 against land acquisition"],
  ["Punjab Kisan Union", "Ruldu Singh Mansa", "Punjab · Mansa", ""],
  ["BKU (Kadian)", "Harmeet Singh Kadian", "Punjab · Malwa", ""],
  ["BKU (Mansa)", "Bogh Singh Mansa", "Punjab", ""],
  ["Azad Kisan Committee Doaba", "", "Punjab · Doaba", ""],
  ["Jai Kisan Andolan", "", "Punjab", ""],
  ["Dasuha Ganna Sangharsh Committee", "", "Punjab · Dasuya", "Sugarcane growers"],
  ["Lok Bhalai Insaaf Welfare Society", "", "Punjab", ""],
  ["Jamhoori Kisan Sabha", "", "Punjab", ""]];
const UNIONS_OTHER = [
  ["BKU (Tikait)", "Rakesh Tikait", "Uttar Pradesh", "Held the Ghazipur camp"],
  ["BKU (Chaduni)", "Gurnam Singh Chaduni", "Haryana", ""],
  ["All India Kisan Sabha", "", "National", ""],
  ["Karnataka Rajya Raitha Sangha", "", "Karnataka", ""],
  ["Swabhimani Shetkari Sanghatana", "Raju Shetti", "Maharashtra", ""],
  ["Terai Kisan Sabha", "", "Uttarakhand", ""],
  ["Rashtriya Kisan Mazdoor Sangathan", "V. M. Singh", "Uttar Pradesh", ""],
  ["All India Kisan Sangharsh Coordination Committee", "", "National", "Coordinated the first protests, Aug 2020"]];
const S_ORG = {};
function renderOrg() {
  // Alex's illustration, sliced into one strip per figure so each can rise in, and be hovered for its union
  const svg = $("vorg"); svg.innerHTML = ""; const { w, h } = svgSize(svg); const mob = w < 520;
  const IW = 1430, IH = 762, X0 = 60, Y0 = 20; // the art was cut from Alex's file at (60,20)
  const BACK = [180, 262, 345, 422, 500, 575, 655, 735, 812, 887, 950, 1025, 1103, 1180, 1257, 1335].map(x => x - X0);
  const FRONT = [118, 200, 278, 355, 425, 505, 570, 655, 740, 818, 890, 963, 1040, 1120, 1200, 1270, 1340, 1405].map(x => x - X0);
  const top = mob ? 34 : 44, k = Math.min((w - 8) / IW, (h - top - 16) / IH), ox = (w - IW * k) / 2, oy = top + Math.max(0, (h - top - 16 - IH * k) / 2);
  const root = svgEl("g", { transform: `translate(${ox} ${oy}) scale(${k})` }, svg), defs = svgEl("defs", {}, svg);
  const cuts = xs => xs.map((x, i) => [i ? (xs[i - 1] + x) / 2 : 0, i < xs.length - 1 ? (xs[i + 1] + x) / 2 : IW]);
  const R = rng(17), pool = [...UNIONS.map(u => [u, 1]), ...d3.range(9).map(() => [["A Punjab farm union", "", "Punjab", "One of the 32 Punjab unions; not named in our sources"], 1]), ...UNIONS_OTHER.map(u => [u, 0])];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  S_ORG.figs = []; let n = 0;
  [[BACK, 0, 300], [FRONT, 276, IH]].forEach(([xs, y0, y1], row) => cuts(xs).forEach(([x0, x1], i) => {
    const id = "uc" + n, cp = svgEl("clipPath", { id }, defs); svgEl("rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, cp);
    const g = svgEl("g", { opacity: 0, "data-k": n, style: "cursor:pointer;transition:filter .2s" }, root);
    svgEl("image", { href: "img/U_figs.png", width: IW, height: IH, "clip-path": `url(#${id})` }, g);
    svgEl("rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: "transparent" }, g);
    const [info, pun] = pool[n]; S_ORG.figs.push({ g, row, i, info, pun }); n++;
  }));
  const t3 = svgEl("text", { x: w / 2, y: top - 16, class: "lbl", "text-anchor": "middle", opacity: 0 }, svg);
  t3.textContent = mob ? "Tap a figure for its union" : "One figure per union at the talks table · hover a figure for its union"; S_ORG.hint = t3;
  const tip = $("tip");
  const show = (e, f) => { const [nm, l, b, note] = f.info; S_ORG.figs.forEach(o => o.g.style.filter = o === f ? "" : "brightness(.42)");
    tip.innerHTML = `<b>${nm}</b>${l ? l + "<br>" : ""}${b}${note ? "<br><i>" + note + "</i>" : ""}`;
    tip.style.left = Math.min(window.innerWidth - 270, e.clientX + 14) + "px"; tip.style.top = Math.min(window.innerHeight - 110, e.clientY + 14) + "px"; tip.style.opacity = 1; };
  const hide = () => { tip.style.opacity = 0; S_ORG.figs.forEach(f => f.g.style.filter = ""); };
  svg.onpointermove = e => { const g = e.target.closest("g[data-k]"); g ? show(e, S_ORG.figs[+g.dataset.k]) : hide(); };
  svg.onpointerdown = svg.onpointermove; svg.onpointerleave = hide;
}
function renderOrgP(p) {
  S_ORG.figs.forEach(f => { const a = 0.04 + f.i * 0.014 + (f.row ? 0.16 : 0), t = ease(seg(p, a, a + 0.12));
    f.g.setAttribute("opacity", t); f.g.setAttribute("transform", `translate(0 ${(1 - t) * 120})`); });
  S_ORG.hint.setAttribute("opacity", ease(seg(p, 0.5, 0.6)));
}

/* ================= talks step chart ================= */
const TALKS = [["R1", "14 Oct", 0, "Officials only"], ["R2", "13 Nov", 1, ""], ["R3", "1 Dec", 1, ""], ["R4", "3 Dec", 2, "Clause by clause"], ["R5", "5 Dec", 2, ""], ["W", "9 Dec", 3, "Written amendments + MSP note"], ["R6", "30 Dec", 4, "2 demands agreed"], ["R7", "4 Jan", 4, ""], ["R8", "8 Jan", 4, ""], ["SC", "12 Jan", 5, "Court suspends laws", 0, 1], ["R9", "15 Jan", 4, ""], ["R10", "20 Jan", 5.5, "18-month freeze"], ["R11", "22 Jan", 5.5, "Talks end"]];
const TALK_STEP = [0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 3];
const S_T = {};
const TALK_INFO = { // what each round offered and how the farmers answered (talks sheet)
  R1: ["Officials meet the unions; no minister present", "Unions walk out", "No progress"], R2: ["First meeting with ministers Tomar and Goyal", "Repeal", "Inconclusive"],
  R3: ["Hours of talks at Vigyan Bhawan", "Repeal", "Deadlock"], R4: ["Objections taken clause by clause", "A special session of Parliament", "No progress"],
  R5: ["Amendments discussed", "A yes or no on repeal", "No progress"], W: ["Written proposal: amendments plus an assurance on MSP", "Rejected", "No progress"],
  R6: ["Gives way on stubble-burning fines and the electricity bill", "Two demands won; repeal and MSP still open", "Partial"], R7: ["Discussion", "Two minutes' silence for the dead; repeal", "No progress"],
  R8: ["The Centre says it can't and won't repeal", "Repeal", "Inconclusive"], SC: ["The Supreme Court suspends the three laws and names a committee", "Unions refuse to appear before it", "The camps stay"],
  R9: ["Discussion", "Repeal", "No progress"], R10: ["Offer to suspend the laws for up to 18 months", "Rejected on 21 Jan", "No progress"], R11: ["The 18-month offer, repeated", "Rejected", "Talks break down"] };
function renderTalks() {
  // a calendar arc around the talks table: one spoke per round, as long as the offer went; the red ring, repeal, is never reached
  const svg = $("vtalks"); svg.innerHTML = ""; const { w, h } = svgSize(svg); const mob = w < 520;
  // the whole table must be visible: centre it one radius in from the bottom-left corner
  const k0 = mob ? 0.27 : 0.22, pad = mob ? 14 : 22, Rr = Math.min(w - pad - (mob ? 34 : 90), h - pad - (mob ? 30 : 40)) / (1 + k0);
  const cx = pad + Rr * k0, cy = h - pad - Rr * k0, R = Math.min(w - cx - (mob ? 34 : 90), cy - (mob ? 30 : 40));
  const r0 = Rr * k0, rRep = R * 0.86, rCal = rRep + (mob ? 8 : 12);
  const T0 = Date.UTC(2020, 9, 8), T1 = Date.UTC(2021, 0, 28), A0 = -Math.PI / 2 + 0.06, A1 = -0.06;
  const ang = d => lerp(A0, A1, (d - T0) / (T1 - T0)), P = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  const dOf = s => { const [dd, mm] = s.split(" "); return Date.UTC(mm === "Jan" ? 2021 : 2020, MON.indexOf(mm), +dd); };
  const arcD = (r, a0 = A0 - 0.02, a1 = A1 + 0.02) => { const [x0, y0] = P(a0, r), [x1, y1] = P(a1, r); return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`; };
  const defs = svgEl("defs", {}, svg);
  const glow = svgEl("filter", { id: "tglow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs); svgEl("feGaussianBlur", { stdDeviation: 4 }, glow);
  // faint orbits = how far towards repeal
  for (let k = 1; k <= 5; k++) svgEl("path", { d: arcD(r0 + (rRep - r0) * k / 6), fill: "none", stroke: "rgba(237,237,234,.07)", "stroke-dasharray": "1 6" }, svg);
  // repeal ring, with a soft red glow
  S_T.rep = svgEl("g", { opacity: 0 }, svg);
  svgEl("path", { d: arcD(rRep), fill: "none", stroke: RED, "stroke-width": 8, opacity: 0.25, filter: "url(#tglow)" }, S_T.rep);
  svgEl("path", { id: "trep", d: arcD(rRep), fill: "none", stroke: RED, "stroke-width": mob ? 1.6 : 2.2, "stroke-dasharray": "5 5" }, S_T.rep);
  const rl = svgEl("text", { dy: mob ? 14 : 18, style: `fill:${RED};font:700 ${mob ? 9 : 11}px 'Bricolage Grotesque',sans-serif;letter-spacing:.16em` }, S_T.rep);
  const tp = svgEl("textPath", { href: "#trep", startOffset: "3%" }, rl); tp.textContent = "REPEAL · THE FARMERS' ONLY DEMAND";
  // calendar: a light tick per day outside the ring, months named outside
  const cal = svgEl("g", { opacity: 0 }, svg); S_T.cal = cal;
  for (let t = T0; t <= T1; t += 864e5) { const d = new Date(t), first = d.getUTCDate() === 1, a = ang(t), [x0, y0] = P(a, rCal), [x1, y1] = P(a, rCal + (first ? 10 : 4));
    svgEl("line", { x1: x0, y1: y0, x2: x1, y2: y1, stroke: first ? "rgba(237,237,234,.8)" : "rgba(237,237,234,.22)", "stroke-width": first ? 1.2 : 0.7 }, cal); }
  [["OCT", Date.UTC(2020, 9, 18)], ["NOV", Date.UTC(2020, 10, 15)], ["DEC", Date.UTC(2020, 11, 15)], ["JAN", Date.UTC(2021, 0, 14)]].forEach(([m, t]) => {
    const a = ang(t), [tx, ty] = P(a, rCal + (mob ? 18 : 26)); const mt = svgEl("text", { x: tx, y: ty, "text-anchor": "middle", transform: `rotate(${a * 180 / Math.PI + 90} ${tx} ${ty})`, style: `font:800 ${mob ? 9 : 12}px 'Bricolage Grotesque',sans-serif;letter-spacing:.2em;fill:${G3}` }, cal); mt.textContent = m; });
  // the table: Alex's overhead round-table illustration, farmers and officials around one table
  const sph = svgEl("g", {}, svg), tr = r0 * 1.12;
  svgEl("image", { href: "img/T_table.png", x: cx - tr, y: cy - tr, width: tr * 2, height: tr * 2 }, sph);
  const tl = svgEl("text", { x: cx + r0 + 12, y: cy + r0 * 0.55, style: `font:700 ${mob ? 9 : 10}px 'Bricolage Grotesque',sans-serif;letter-spacing:.16em;fill:${G3}` }, svg); tl.textContent = "THE TALKS TABLE";
  // readout card, inside the arc
  const card = svgEl("g", {}, svg), kTop = cy - R - 30 - 106, kAbove = mob && kTop > 22;
  const kx = kAbove ? 16 : cx + R * 0.2, ky = kAbove ? kTop : cy - R * 0.6;
  const kw = kAbove ? Math.min(w - 32, 340) : Math.min(R * (mob ? 0.4 : 0.38), 300);
  S_T.k = { n: svgEl("text", { x: kx, y: ky, style: `font:800 ${mob ? 22 : 34}px 'Bricolage Grotesque',sans-serif;font-stretch:75%;fill:${PAPER}` }, card),
    d: svgEl("text", { x: kx, y: ky + (mob ? 15 : 22), style: `font:600 ${mob ? 9 : 11}px 'Bricolage Grotesque',sans-serif;letter-spacing:.12em;fill:${G3}` }, card),
    o: svgEl("foreignObject", { x: kx, y: ky + (mob ? 22 : 32), width: kw, height: mob ? 64 : 70 }, card), bar: svgEl("rect", { x: kx, y: ky + (mob ? 88 : 108), width: 0, height: 3, fill: PAPER }, card) };
  svgEl("rect", { x: kx, y: ky + (mob ? 88 : 108), width: kw, height: 3, fill: "rgba(237,237,234,.12)" }, card);
  const bl = svgEl("text", { x: kx + kw, y: ky + (mob ? 101 : 124), "text-anchor": "end", style: `font:600 ${mob ? 8 : 10}px 'Bricolage Grotesque',sans-serif;letter-spacing:.12em;fill:${RED}` }, card); bl.textContent = "HOW FAR TOWARDS REPEAL";
  S_T.kw = kw; S_T.card = card;
  // the rounds
  S_T.items = TALKS.map((t, i) => {
    const d = dOf(t[1]), a = ang(d), court = !!t[5], letter = t[0] === "W", len = r0 + 6 + (rRep - r0 - 6) * (t[2] + 0.5) / 6.6;
    const g = svgEl("g", { opacity: 0, style: "cursor:pointer" }, svg), [x0, y0] = P(a, r0 + 3), [x1, y1] = P(a, len), [c0x, c0y] = P(a, rCal - 1);
    const col = court ? "#B9B9B9" : PAPER;
    svgEl("line", { x1: x1, y1: y1, x2: c0x, y2: c0y, stroke: "rgba(237,237,234,.16)", "stroke-dasharray": "1 3" }, g);
    const ln = svgEl("line", { x1: x0, y1: y0, x2: x0, y2: y0, stroke: col, "stroke-width": mob ? 1.4 : 2, "stroke-linecap": "round", "stroke-dasharray": court ? "4 4" : "none", opacity: 0.55 }, g);
    const tip = svgEl("circle", { cx: x0, cy: y0, r: mob ? 3.5 : 5, fill: letter || court ? INK : col, stroke: col, "stroke-width": 1.6 }, g);
    svgEl("circle", { cx: c0x, cy: c0y, r: 2, fill: col }, g);
    svgEl("line", { x1: x0, y1: y0, x2: c0x, y2: c0y, stroke: "transparent", "stroke-width": 16 }, g); // easy to hover
    g.addEventListener("pointerenter", () => { S_T.hover = i; talkFocus(); }); g.addEventListener("pointerdown", () => { S_T.hover = i; talkFocus(); });
    return { g, ln, tip, x0, y0, x1, y1, t, a };
  });
  svg.onpointerleave = () => { S_T.hover = null; talkFocus(); };
  // the gap that never closed
  const last = S_T.items[S_T.items.length - 1], [gx, gy] = P(last.a + 0.035, rRep), [hx, hy] = P(last.a + 0.035, Math.hypot(last.x1 - cx, last.y1 - cy));
  S_T.gap = svgEl("g", { opacity: 0 }, svg);
  svgEl("line", { x1: hx, y1: hy, x2: gx, y2: gy, stroke: RED, "stroke-width": 2 }, S_T.gap);
  const gt = svgEl("text", { x: gx + 6, y: gy + 22, "text-anchor": "end", style: `font:700 ${mob ? 9 : 11}px 'Bricolage Grotesque',sans-serif;letter-spacing:.14em;fill:${RED}` }, S_T.gap); gt.textContent = "THE GAP NEVER CLOSED";
  S_T.active = -1; S_T.hover = null; S_T.grow = TALKS.map(() => 0);
}
function talkFocus() {
  const k = S_T.hover != null ? S_T.hover : S_T.active; if (!S_T.items) return;
  S_T.items.forEach((it, i) => { const on = i === k; it.ln.setAttribute("opacity", on ? 1 : (k < 0 ? 0.55 : 0.28)); it.tip.setAttribute("r", (MOBILE() ? 3.5 : 5) * (on ? 1.6 : 1)); });
  if (k < 0) { S_T.card.setAttribute("opacity", 0); return; } S_T.card.setAttribute("opacity", 1);
  const t = TALKS[k], inf = TALK_INFO[t[0]] || ["", "", ""], yr = t[1].includes("Jan") ? "2021" : "2020";
  S_T.k.n.textContent = t[0] === "W" ? "Written offer" : t[0] === "SC" ? "Supreme Court" : "Round " + t[0].slice(1);
  S_T.k.d.textContent = (t[1] + " " + yr).toUpperCase() + " · " + inf[2].toUpperCase();
  S_T.k.o.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" style="font:400 ${MOBILE() ? 11 : 14}px/1.35 'Bricolage Grotesque',sans-serif;color:#EDEDEA">${inf[0]}.<br><span style="color:#9a9a96">Farmers: ${inf[1]}.</span></div>`;
  S_T.k.bar.setAttribute("width", S_T.kw * (t[2] + 0.5) / 6.6);
}
function renderTalksP(p) {
  const show = ease(seg(p, 0, 0.06)); S_T.rep.setAttribute("opacity", show); S_T.cal.setAttribute("opacity", show);
  const n = TALKS.length, prog = seg(p, 0.05, 0.86) * n;
  S_T.items.forEach((it, i) => { const g = ease(clamp(prog - i)); it.g.setAttribute("opacity", g > 0 ? 1 : 0);
    const x = lerp(it.x0, it.x1, g), y = lerp(it.y0, it.y1, g); it.ln.setAttribute("x2", x); it.ln.setAttribute("y2", y); it.tip.setAttribute("cx", x); it.tip.setAttribute("cy", y); });
  const act = Math.min(n - 1, Math.floor(prog - 0.15)); if (act !== S_T.active) { S_T.active = act; talkFocus(); }
  S_T.gap.setAttribute("opacity", seg(p, .88, .96));
}


/* ================= winter ================= */
// Delhi nightly minimum, 26 Nov 2020 to 28 Feb 2021 (Open-Meteo historical weather API, ERA5 reanalysis, central Delhi)
const TMIN = [13.4, 12.2, 11.2, 9.7, 10.0, 10.1, 10.9, 11.5, 11.3, 13.0, 13.5, 12.9, 11.7, 12.3, 12.9, 13.0, 14.4, 10.2, 8.0, 6.3, 6.6, 5.2, 5.7, 6.2, 6.9, 7.7, 7.9, 6.0, 6.7, 6.1, 6.4, 9.3, 6.7, 5.3, 4.9, 4.8, 3.5, 9.7, 12.3, 12.9, 13.9, 14.4, 10.2, 9.0, 11.1, 8.4, 7.3, 6.7, 5.8, 4.5, 8.0, 5.3, 6.7, 10.3, 10.0, 10.0, 9.2, 7.3, 8.8, 8.7, 6.5, 7.0, 6.5, 5.4, 5.8, 6.4, 5.1, 6.8, 7.6, 11.8, 10.2, 8.4, 8.6, 9.4, 8.5, 10.0, 11.8, 11.3, 11.2, 11.6, 12.2, 12.1, 12.2, 11.6, 11.3, 11.1, 11.8, 11.7, 12.7, 13.1, 13.6, 13.6, 15.5, 18.5, 16.3];
function makeWinter() {
  const S = { c: $("cwinter"), live: true }, N = TMIN.length, D0 = Date.UTC(2020, 10, 26), day = i => new Date(D0 + i * 864e5);
  const fmtD = i => { const d = day(i); return d.getUTCDate() + " " + MON[d.getUTCMonth()]; };
  const cold = t => Math.max(0, 16 - t) / 14; // taller = colder
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h }); const mob = MOBILE(), R = rng(9);
    S.L = mob ? 28 : 54; S.Rr = mob ? 8 : 190; S.base = h * (mob ? 0.8 : 0.78); S.H = h * (mob ? 0.5 : 0.56); S.rows = mob ? 26 : 38;
    // a mountain range of dots: the middle row is the data; rows in front and behind are lower, with a little noise
    const pts = [], sm = (arr, i) => { let t = 0, n = 0; for (let k = -2; k <= 2; k++) { const v = arr[i + k]; if (v != null) { t += v * (3 - Math.abs(k)); n += 3 - Math.abs(k); } } return t / n; };
    const C = TMIN.map(cold), Cs = C.map((v, i) => sm(C, i)), ph = d3.range(6).map(() => R() * 6.28);
    const step = mob ? 2.6 : 2.2;
    for (let j = 0; j < S.rows; j++) {
      const z = j / (S.rows - 1) - 0.5, env = Math.exp(-z * z * 9), mix = Math.abs(z) * 1.6;
      const W = (w - S.L - S.Rr) * (1 - (z + 0.5) * 0.16), x0 = S.L + ((w - S.L - S.Rr) - W) / 2, yb = S.base - (z + 0.5) * h * (mob ? 0.16 : 0.2);
      for (let x = 0; x <= W; x += step * (0.7 + R() * 0.6)) {
        const f = x / W * (N - 1), i = Math.floor(f), u = f - i, v = lerp(C[i], C[Math.min(N - 1, i + 1)], u), vs = lerp(Cs[i], Cs[Math.min(N - 1, i + 1)], u);
        const noise = 0.04 * Math.sin(f * 0.7 + ph[0] + j) + 0.03 * Math.sin(f * 1.9 + ph[1] * j) + (R() - 0.5) * 0.03;
        const ht = Math.max(0, lerp(v, vs, Math.min(1, mix)) * env + noise * env) * S.H;
        pts.push([x0 + x, yb, ht, j, f, env]);
        const fill = Math.floor(ht / 9 * (0.25 + 0.5 * env)); for (let k = 0; k < fill; k++) pts.push([x0 + x + (R() - 0.5) * step, yb, ht * Math.pow(R(), 0.6), j, f, env * 0.5, 1]);
      }
    }
    pts.sort((a, b) => b[3] - a[3]); S.pts = pts; S.tw = pts.map(() => R() * 6.28);
    const Wm = (w - S.L - S.Rr) * 0.92; S.mid = S.base - 0.5 * h * (mob ? 0.16 : 0.2);
    S.xOf = i => S.L + ((w - S.L - S.Rr) - Wm) / 2 + i / (N - 1) * Wm;
    S.coldest = d3.range(N).sort((a, b) => TMIN[a] - TMIN[b]).slice(0, 6);
  };
  S.render = (p, tm = 0) => {
    const { ctx, w, h } = S, mob = MOBILE(); ctx.clearRect(0, 0, w, h);
    const rise = ease(seg(p, 0.05, 0.45)), reveal = seg(p, 0.02, 0.55) * 1.15 * (N - 1), hud = ease(seg(p, 0.45, 0.62));
    // HUD grid: temperature lines
    ctx.font = `500 ${mob ? 9 : 10}px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "left";
    [14, 10, 6, 2].forEach(t => { const y = S.mid - cold(t) * S.H * rise; ctx.strokeStyle = "rgba(237,237,234,.08)"; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(S.L, y); ctx.lineTo(w - S.Rr, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = "rgba(237,237,234,.45)"; ctx.fillText(t + "°C", 2, y + 3); });
    // the range of dots
    for (let k = 0; k < S.pts.length; k++) {
      const [x, yb, ht, j, f, env, isFill] = S.pts[k]; if (f > reveal) continue;
      const y = yb - ht * rise, br = clamp(0.35 + 0.9 * (ht / S.H) * (0.6 + 0.4 * env)), tw = 0.8 + 0.2 * Math.sin(tm / 600 + S.tw[k]), sz = isFill ? 1.1 : 1.2 + 0.8 * br;
      ctx.fillStyle = `rgba(245,245,240,${Math.min(1, (isFill ? 0.5 : 1) * br * tw)})`; ctx.fillRect(x, y, sz, sz);
    }
    // time axis
    ctx.fillStyle = "rgba(237,237,234,.5)"; ctx.textAlign = "center";
    [["DEC", 5], ["JAN", 36], ["FEB", 67]].forEach(([m, i]) => { const x = S.xOf(i); ctx.fillRect(x, S.base + 8, 1, 6); ctx.fillText(m + (i === 5 ? " 2020" : i === 36 ? " 2021" : ""), x, S.base + 26); });
    if (hud <= 0) return;
    ctx.globalAlpha = hud;
    // the peak: the coldest night
    const pk = 36, px = S.xOf(pk), py = S.mid - cold(TMIN[pk]) * S.H;
    ctx.strokeStyle = RED; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px, Math.max(18, py - h * 0.16)); ctx.lineTo(px + 14, Math.max(18, py - h * 0.16)); ctx.stroke();
    dot(ctx, px, py, 3.5, RED);
    const ly = Math.max(18, py - h * 0.16);
    ctx.textAlign = "left"; ctx.fillStyle = PAPER; ctx.font = `800 ${mob ? 30 : 46}px "Bricolage Grotesque", sans-serif`; ctx.fontStretch = "condensed"; ctx.fillText("1.1°C", px + 20, ly + (mob ? 10 : 15)); ctx.fontStretch = "normal";
    ctx.font = `600 ${mob ? 10 : 12}px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = G3; ctx.fillText(mob ? "1 JAN 2021 · COLDEST IN 15 YEARS" : "1 JAN 2021 · DELHI'S COLDEST NIGHT IN 15 YEARS", px + 20, ly + (mob ? 26 : 34));
    ctx.font = `500 ${mob ? 9 : 11}px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = "#8a8a86"; ctx.fillText("Safdarjung station, IMD", px + 20, ly + (mob ? 39 : 50));
    // 20 Dec: the unions mourn 41 dead
    const mx = S.xOf(24), my = S.mid - cold(TMIN[24]) * S.H;
    ctx.strokeStyle = G2; ctx.beginPath(); ctx.moveTo(mx, my - 6); ctx.lineTo(mx, my - h * 0.1); ctx.stroke(); dot(ctx, mx, my, 2.5, PAPER);
    ctx.font = `700 ${mob ? 10 : 12}px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = PAPER; ctx.textAlign = "right"; const ml = mob ? ["20 DEC", "41 DEAD", "MOURNED"] : ["20 DEC · 41 DEAD MOURNED"]; ml.forEach((t, j) => ctx.fillText(t, mx - 6, my - h * 0.1 + 4 + j * 12));
    // side table: the coldest nights in the model data
    if (!mob) {
      const tx = w - S.Rr + 22, ty = h * 0.14; ctx.textAlign = "left"; ctx.font = `700 11px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = PAPER; ctx.fillText("COLDEST NIGHTS", tx, ty);
      ctx.font = `500 10px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = "#8a8a86"; ctx.fillText("model minimum, central Delhi", tx, ty + 14);
      ctx.strokeStyle = "rgba(237,237,234,.2)"; ctx.beginPath(); ctx.moveTo(tx, ty + 22); ctx.lineTo(w - 10, ty + 22); ctx.stroke();
      S.coldest.forEach((i, r) => { const y = ty + 40 + r * 18; ctx.fillStyle = r ? G3 : RED; ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "left"; ctx.fillText(fmtD(i) + (day(i).getUTCFullYear() === 2021 ? " 21" : " 20"), tx, y); ctx.textAlign = "right"; ctx.fillText(TMIN[i].toFixed(1) + "°C", w - 10, y); });
    }
    ctx.globalAlpha = 1;
  };
  return S;
}

/* ================= Republic Day: the fort, the tractors, the tear ================= */
function drawTractor(ctx, x, y, s, col) { // origin = ground under the rear wheel; faces right
  ctx.fillStyle = col; ctx.strokeStyle = col;
  ctx.beginPath(); ctx.arc(x, y - s * 0.42, s * 0.42, 0, 6.2832); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y - s * 0.42, s * 0.16, 0, 6.2832); ctx.fill(); ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x + s * 0.95, y - s * 0.2, s * 0.2, 0, 6.2832); ctx.fill();
  ctx.fillRect(x + s * 0.1, y - s * 0.62, s * 0.95, s * 0.3); // bonnet
  ctx.fillRect(x - s * 0.18, y - s * 1.12, s * 0.08, s * 0.55); ctx.fillRect(x - s * 0.18, y - s * 1.12, s * 0.5, s * 0.07); // cab frame
  ctx.fillRect(x + s * 0.72, y - s * 0.9, s * 0.07, s * 0.3); // exhaust
}
function tractorImg(ctx, im, x, y, s) { if (!im) return; const hh = s * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, x - s * 0.1, y - hh, s, hh); }
function makeRday() {
  const S = { c: $("crday"), live: true };
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h }); const A = SH.A12, mob = MOBILE();
    S.fs = Math.min(w / A.w, h * 0.4 / A.h); S.fx = (w - A.w * S.fs) / 2; S.fy = h * 0.04; S.fort = new Path2D(A.d);
    // tractor units: each icon is 1,000 tractors
    const cols = 20; S.ts = Math.min((w - 20) / cols / 1.35, 26); S.cols = cols;
    S.ty = S.fy + A.h * S.fs + (mob ? 34 : 48);
    // the tear: dots that fill a drop shape as people pour back
    const r = Math.min(w, h) * (mob ? 0.2 : 0.17), cx = w / 2, cy = h * 0.58, oc = document.createElement("canvas"); oc.width = Math.ceil(w); oc.height = Math.ceil(h);
    const ox = oc.getContext("2d", { willReadFrequently: true }); ox.fillStyle = "#fff"; ox.beginPath(); ox.moveTo(cx, cy - r * 2.3);
    ox.bezierCurveTo(cx + r * 0.25, cy - r * 1.4, cx + r, cy - r * 0.8, cx + r, cy); ox.arc(cx, cy, r, 0, Math.PI); ox.bezierCurveTo(cx - r, cy - r * 0.8, cx - r * 0.25, cy - r * 1.4, cx, cy - r * 2.3); ox.fill();
    const im = ox.getImageData(0, 0, oc.width, oc.height).data, s = mob ? 5 : 5.5, R = rng(29), pts = [];
    for (let j = 0, y = 0; y < h; j++, y += s * 0.866) for (let x = (j % 2) * s / 2; x < w; x += s) if (im[(Math.floor(y) * oc.width + Math.floor(x)) * 4 + 3] > 100) pts.push({ x, y });
    pts.forEach(q => { const fromLeft = R() < 0.62, a = R(); q.sx = fromLeft ? -20 - R() * 80 : w * (0.1 + a * 0.5); q.sy = fromLeft ? h * (0.2 + a * 0.7) : h + 20 + R() * 60; q.dl = (1 - (q.y - (cy - r * 2.3)) / (r * 3.3)) * 0.5 + R() * 0.4; q.stay = R() < 0.06; });
    S.tear = pts; S.tr = r; S.tcx = cx; S.tcy = cy; S.ds = s;
    // a light line drawing of the Ghazipur camp: the flyover at the Delhi–UP border, tents and trolleys beneath it
    const gc = document.createElement("canvas"); gc.width = Math.ceil(w * DPR); gc.height = Math.ceil(h * DPR); const g = gc.getContext("2d"); g.scale(DPR, DPR);
    g.strokeStyle = "#8a8a86"; g.lineWidth = 1.1; g.lineJoin = "round";
    const deck = cy - r * 1.05, gnd = cy + r * 1.25, Rg = rng(41);
    g.beginPath(); g.moveTo(0, deck); g.lineTo(w, deck - r * 0.25); g.moveTo(0, deck + 14); g.lineTo(w, deck - r * 0.25 + 14); g.moveTo(0, deck - 10); g.lineTo(w, deck - r * 0.25 - 10); g.stroke();
    for (let x = 30; x < w; x += 22) { const y = deck - r * 0.25 * x / w; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x, y - 2); g.stroke(); }
    for (let x = w * 0.08; x < w; x += w * 0.2) { const y = deck - r * 0.25 * x / w + 14; g.strokeRect(x - 9, y, 18, gnd - y); }
    g.beginPath(); g.moveTo(0, gnd); g.lineTo(w, gnd); g.stroke();
    for (let x = 6; x < w - 30; x += 34 + Rg() * 22) { const t = Rg() < 0.55, bw = t ? 26 + Rg() * 10 : 34;
      if (t) { g.beginPath(); g.moveTo(x, gnd); g.lineTo(x + bw / 2, gnd - 20 - Rg() * 8); g.lineTo(x + bw, gnd); g.moveTo(x + bw / 2, gnd - 18); g.lineTo(x + bw / 2, gnd); g.stroke(); }
      else { g.strokeRect(x, gnd - 20, bw, 13); g.beginPath(); g.arc(x + 8, gnd - 4, 4, 0, 6.283); g.arc(x + bw - 8, gnd - 4, 4, 0, 6.283); g.stroke(); g.beginPath(); g.moveTo(x, gnd - 20); g.quadraticCurveTo(x + bw / 2, gnd - 32, x + bw, gnd - 20); g.stroke(); } }
    // the border sign
    const sx = w * 0.78, sy = deck - r * 0.2 - 70; g.strokeRect(sx, sy, 92, 30); g.beginPath(); g.moveTo(sx + 20, sy + 30); g.lineTo(sx + 20, sy + 52); g.moveTo(sx + 72, sy + 30); g.lineTo(sx + 72, sy + 52); g.stroke();
    g.fillStyle = "#8a8a86"; g.font = `700 10px "Bricolage Grotesque", sans-serif`; g.textAlign = "center"; g.fillText("GHAZIPUR", sx + 46, sy + 13); g.fillText("UP BORDER · NH 9", sx + 46, sy + 25);
    S.gz = gc;
  };
  S.render = (p, tm = 0) => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h); const mob = MOBILE();
    const draw = ease(seg(p, 0, 0.22)), shake = seg(p, 0.4, 0.5), fortOut = seg(p, 0.7, 0.78), tearIn = seg(p, 0.74, 0.98);
    // the fort, revealed left to right, then cracked, then gone
    if (fortOut < 1) {
      ctx.save(); ctx.globalAlpha = (1 - fortOut) * (1 - 0.55 * shake); ctx.beginPath(); ctx.rect(0, 0, w * draw, h); ctx.clip();
      const jx = shake > 0 && shake < 1 ? Math.sin(tm / 30) * 2 * (1 - shake) : 0;
      ctx.translate(S.fx + jx, S.fy); ctx.scale(S.fs, S.fs); ctx.fillStyle = "#cfcfcb"; ctx.fill(S.fort, "evenodd"); ctx.restore();
      // the flag raised on 26 January
      const fl = seg(p, 0.2, 0.28) * (1 - fortOut); if (fl > 0) { const x = w / 2, y = S.fy + 4, H = S.fy + 60;
        ctx.globalAlpha = fl; ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x, y + 30 - 50 * fl); ctx.stroke();
        ctx.fillStyle = RED; const wv = Math.sin(tm / 260) * 3; ctx.beginPath(); ctx.moveTo(x, y + 30 - 50 * fl); ctx.quadraticCurveTo(x + 14, y + 22 - 50 * fl + wv, x + 28, y + 30 - 50 * fl + 6); ctx.lineTo(x, y + 30 - 50 * fl + 16); ctx.fill(); ctx.globalAlpha = 1; }
      // the crack
      if (shake > 0) { ctx.globalAlpha = 1 - fortOut; ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.beginPath(); const R = rng(4); const fh = SH.A12.h * S.fs; let x = S.fx, y = S.fy + fh * 0.35; ctx.moveTo(x, y);
        const n = 12; for (let i = 0; i < n * ease(shake); i++) { x += (w - 2 * S.fx) / n; y = S.fy + fh * (0.3 + R() * 0.55); ctx.lineTo(x, y); } ctx.stroke(); ctx.globalAlpha = 1; }
    }
    // tractors on 26 January: it depends who counted
    const tIn = seg(p, 0.06, 0.34), tOut = 1 - seg(p, 0.42, 0.56);
    if (tIn > 0 && tOut > 0) {
      ctx.globalAlpha = tOut; const ts = S.ts, gx = (w - S.cols * ts * 1.35) / 2; let y = S.ty;
      ctx.font = `700 13px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "left";
      ctx.fillStyle = G3; ctx.fillText("POLICE: 7,000", gx, y); y += ts * 1.4;
      for (let i = 0; i < 7; i++) { const t = ease(clamp(tIn * 3 - i * 0.05)); if (t <= 0) continue; tractorImg(ctx, IMG.T_grey, lerp(w + 40, gx + (i % S.cols) * ts * 1.35, t), y, ts * 1.25); }
      y += ts * 0.9; ctx.fillStyle = PAPER; ctx.fillText("REUTERS: ABOUT 200,000", gx, y); y += ts * 1.4;
      for (let i = 0; i < 200; i++) { const t = ease(clamp(tIn * 1.6 - i / 200 * 0.6)); if (t <= 0) continue; const c = i % S.cols, r = Math.floor(i / S.cols);
        tractorImg(ctx, IMG.T_red, lerp(w + 40 + r * 30, gx + c * ts * 1.35, t), y + r * ts * 1.15, ts * 1.25); }
      ctx.fillStyle = G2; ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.fillText("EACH TRACTOR = 1,000 TRACTORS", gx, y + Math.ceil(200 / S.cols) * ts * 1.15 + 8);
      ctx.globalAlpha = 1;
    }
    // internet cut: a signal mark that goes dark
    const net = seg(p, 0.46, 0.52) * (1 - fortOut);
    if (net > 0) { const x = w / 2 - 30, y = S.ty + 90; ctx.globalAlpha = net;
      for (let i = 0; i < 4; i++) { ctx.fillStyle = G1; ctx.fillRect(x + i * 16, y - (i + 1) * 14, 11, (i + 1) * 14); }
      ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 6, y - 60); ctx.lineTo(x + 66, y + 6); ctx.stroke();
      ctx.fillStyle = G3; ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "center"; ctx.fillText("INTERNET SUSPENDED IN PARTS OF DELHI", x + 30, y + 24); ctx.globalAlpha = 1; }
    // the tear at Ghazipur: a few stay, then the camp refills overnight
    if (tearIn > 0 || p > 0.72) {
      ctx.globalAlpha = 0.55 * seg(p, 0.72, 0.8); ctx.drawImage(S.gz, 0, 0, w, h); ctx.globalAlpha = 1;
      const thin = seg(p, 0.72, 0.76), r = S.ds * 0.36;
      for (const q of S.tear) {
        if (q.stay) { dot(ctx, q.x, q.y, r * thin, RED); continue; }
        const t = ease(clamp((tearIn * 1.5 - q.dl) / 0.5)); if (t <= 0) continue;
        const x = lerp(q.sx, q.x, t), y = lerp(q.sy, q.y, t); if (t < 1) { ctx.globalAlpha = 0.35; ctx.strokeStyle = RED; ctx.lineWidth = r; ctx.beginPath(); ctx.moveTo(lerp(q.sx, q.x, Math.max(0, t - 0.08)), lerp(q.sy, q.y, Math.max(0, t - 0.08))); ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha = 1; }
        dot(ctx, x, y, r, RED);
      }
      ctx.globalAlpha = thin; ctx.fillStyle = G3; ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "center";
      ctx.fillText("GHAZIPUR CAMP, NIGHT OF 28 JANUARY", S.tcx, S.tcy + S.tr * 1.25 + 24);
      ctx.fillStyle = G2; ctx.fillText(mob ? "Dots show the return, not a count" : "Farmers pour back from western UP and Haryana · dots show the return, not a count", S.tcx, S.tcy + S.tr * 1.25 + 42); ctx.globalAlpha = 1;
    }
    const k = ease(seg(p, .42, .6)); $("rd1").textContent = Math.round(394 * k); $("rd2").textContent = Math.round(200 * k); $("rd3").textContent = Math.round(19 * k);
  };
  return S;
}

/* ================= fortress ================= */
function buildFort() {
  const L = [["A13c", "Barbed and concertina wire"], ["A13b", "Iron nails set in the road"], ["A13a", "Cement barricades"], ["A13d", "Trenches dug across the highway"]];
  $("fort").innerHTML = L.map(([k, t]) => `<div class="layer">${shapeSVG(k, k === "A13d" ? G2 : G3)}<span>${t}</span></div>`).join("");
  const words = [["Anti-national", 6, 12], ["Khalistani", 52, 26], ["Urban naxal", 14, 46], ["Foreign-backed", 50, 64], ["Tukde-tukde gang", 4, 84], ["#IndiaTogether", 30, 4, 1], ["Rihanna · 2 Feb", 58, 90, 2], ["Greta Thunberg · 3 Feb", 20, 70, 2]];
  $("words").innerHTML = words.map(([t, x, y, k]) => `<span data-k="${k || 0}" style="left:${x}%;top:${y}%;${k === 2 ? "color:var(--red)" : k === 1 ? "color:var(--paper)" : ""}">${t}</span>`).join("");
}
function renderFortP(p) {
  [...$("fort").children].forEach((l, i, a) => { l.classList.toggle("on", p > 0.04 + (a.length - 1 - i) * 0.08); l.style.opacity = p > .45 ? .35 : ""; });
  [...$("words").children].forEach((s, i) => { const k = +s.dataset.k; const on = k === 0 ? p > .47 + i * .03 : p > .74 + i * .015; s.classList.toggle("on", on); s.style.opacity = on ? (k === 0 && p > .72 ? .35 : "") : ""; });
}

/* ================= spread map + daily strip (from prototype) ================= */
const NOTES = {
  "2020-08": "Three ordinances, not yet law. The first protests reach 23 districts, most of them in Punjab.",
  "2020-09": "Parliament passes the laws. On 25 September farmers call a Bharat Bandh: 230 events in one day.",
  "2020-10": "Rail roko: in Punjab, farmers sit on the railway tracks for weeks.",
  "2020-11": "26 November, Dilli Chalo. Stopped at Delhi's borders, the farmers set up camp and stay.",
  "2020-12": "8 December: a second Bharat Bandh. The map reaches 456 districts.",
  "2021-01": "26 January, Republic Day: the tractor parade, and the clashes at the Red Fort.",
  "2021-02": "6 February: a nationwide chakka jam, 229 events in a day. 507 districts.",
  "2021-03": "From here the map barely widens. The movement grows deeper instead of wider.",
  "2021-04": "The second Covid wave. The border camps stay.",
  "2021-05": "26 May: six months at the borders, marked as a black day. 184 events.",
  "2021-06": "Summer at the camps. Fewer events, but the sit-ins never stop.",
  "2021-07": "Kisan Sansad: a farmers' parliament meets near Parliament during its monsoon session.",
  "2021-08": "Karnal, 28 August: police beat farmers with canes. Protests follow across Haryana and Punjab.",
  "2021-09": "5 September, Muzaffarnagar. 27 September: a third Bharat Bandh, the busiest day of all, with 281 events.",
  "2021-10": "3 October, Lakhimpur Kheri: vehicles drive into marching farmers. The map reaches 543 districts.",
  "2021-11": "19 November: the Prime Minister announces the three laws will be repealed.",
  "2021-12": "11 December: the camps come down. The farmers go home."
};
function makeSpread() {
  const S = { c: $("c1") }; let lastM = -1;
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h }); lastM = -1;
    const pts = { type: "MultiPoint", coordinates: DATA.districts.map(d => [d[1], d[0]]) };
    const fc = { type: "FeatureCollection", features: [DATA.india, { type: "Feature", geometry: pts }] };
    const proj = d3.geoMercator().fitExtent([[8, 8], [w - 8, h - 8]], fc);
    const s = Math.max(5, Math.min(w, h) / 64); S.s = s;
    const oc = document.createElement("canvas"); oc.width = Math.ceil(w); oc.height = Math.ceil(h); const ox = oc.getContext("2d", { willReadFrequently: true });
    ox.fillStyle = "#fff"; ox.beginPath(); d3.geoPath(proj, ox)(DATA.india); ox.fill(); const im = ox.getImageData(0, 0, oc.width, oc.height).data;
    const key = (i, j) => i + "," + j, cells = new Map(), cols = Math.ceil(w / s), rows = Math.ceil(h / s);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = i * s + s / 2 + (j % 2 ? s / 2 : 0), y = j * s + s / 2; if (im[(Math.floor(y) * oc.width + Math.floor(x)) * 4 + 3] > 100) cells.set(key(i, j), { x, y, m: new Array(17).fill(0) }); }
    // small islands (Lakshadweep, Andaman and Nicobar) get at least one dot each
    const gp = d3.geoPath(proj); for (const poly of DATA.india.geometry.coordinates) { const [x, y] = gp.centroid({ type: "Polygon", coordinates: poly }); if (!isFinite(x)) continue;
      const j = Math.round((y - s / 2) / s), i = Math.round((x - s / 2 - (j % 2 ? s / 2 : 0)) / s); if (!cells.has(key(i, j))) cells.set(key(i, j), { x: i * s + s / 2 + (j % 2 ? s / 2 : 0), y: j * s + s / 2, m: new Array(17).fill(0) }); }
    for (const d of DATA.districts) { const [x, y] = proj([d[1], d[0]]); const j = Math.round((y - s / 2) / s), i = Math.round((x - s / 2 - (j % 2 ? s / 2 : 0)) / s);
      let c = cells.get(key(i, j)); if (!c) { c = { x: i * s + s / 2 + (j % 2 ? s / 2 : 0), y: j * s + s / 2, m: new Array(17).fill(0) }; cells.set(key(i, j), c); } d[4].forEach((v, k) => c.m[k] += v); }
    S.cells = [...cells.values()];
    for (const c of S.cells) { c.cum = []; let a = 0; for (let k = 0; k < 17; k++) { a += c.m[k]; c.cum.push(a); } }
    const cumAll = S.cells.map(c => c.cum[16]).filter(v => v).sort(d3.ascending), curAll = S.cells.flatMap(c => c.m).filter(v => v).sort(d3.ascending);
    S.maxCum = d3.quantile(cumAll, 0.95); S.maxCur = d3.quantile(curAll, 0.95);
  };
  S.render = p => {
    const { ctx, w, h, s } = S; ctx.clearRect(0, 0, w, h);
    const t = clamp(p * 1.06 - 0.02) * 16, mi = Math.floor(t), f = t - mi, mn = Math.min(16, mi + 1);
    for (const c of S.cells) {
      const cum = c.cum[mi] + (c.cum[mn] - c.cum[mi]) * f, cur = c.m[mi] * (1 - f) + c.m[mn] * f;
      dot(ctx, c.x, c.y, s * 0.17, "#333333");
      if (cum > 0) dot(ctx, c.x, c.y, s * (0.16 + 0.32 * Math.sqrt(clamp(cum / S.maxCum))), G2);
      if (cur > 0.05) dot(ctx, c.x, c.y, s * (0.14 + 0.36 * Math.sqrt(clamp(cur / S.maxCur))), RED);
    }
    const k = Math.round(t);
    if (k !== lastM) { lastM = k; const r = DATA.spread[k], [yy, mm] = r[0].split("-");
      $("m1").textContent = MON[+mm - 1] + " " + yy; $("n1").textContent = NOTES[r[0]] || ""; $("d1").textContent = fmt(r[4]); $("st1").textContent = r[5]; $("e1").textContent = fmt(r[1]); }
  };
  return S;
}
const CALLS = [["2020-09-25", "Bharat Bandh"], ["2020-12-08", "Bharat Bandh"], ["2021-02-06", "Chakka jam"], ["2021-03-26", "Bharat Bandh"], ["2021-05-26", "Black day"], ["2021-09-27", "Bharat Bandh"]];
function makeDays() {
  const S = { c: $("c2") };
  const D0 = new Date(DATA.dayStart + "T00:00:00Z"), dayIdx = s => Math.round((new Date(s + "T00:00:00Z") - D0) / 864e5);
  const callIdx = new Map(CALLS.map(([d, l]) => [dayIdx(d), l]));
  const cumDays = []; { let a = 0, b = 0; DATA.days.forEach(v => { a += v; b += v > 0 ? 1 : 0; cumDays.push([a, b]); }); }
  S.layout = () => { const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h }); };
  S.render = p => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h);
    const N = DATA.days.length, top = 84, bot = 30, L = 4, R = 4, dx = (w - L - R) / N, H = h - top - bot;
    const upto = Math.floor(ease(seg(p, 0.04, 0.92)) * (N - 1));
    ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillStyle = G2; ctx.strokeStyle = G1; ctx.lineWidth = 1;
    for (let i = 0; i < N; i++) { const d = new Date(D0.getTime() + i * 864e5); if (d.getUTCDate() === 1) {
      const x = L + i * dx; ctx.beginPath(); ctx.moveTo(x, h - bot + 4); ctx.lineTo(x, h - bot + 9); ctx.stroke();
      const mo = d.getUTCMonth(); if (mo % (w < 600 ? 4 : 2) === 0) ctx.fillText(MON[mo] + (mo === 0 || i === 0 ? " " + d.getUTCFullYear() : ""), x + 2, h - 8); } }
    ctx.fillStyle = G1; ctx.fillRect(L, h - bot, w - L - R, 1);
    const scaleH = H / 281, small = w < 700, gap = 1, sqw = Math.max(1, dx - (dx > 2 ? 1 : 0.35)); let lab = 0;
    for (let i = 0; i <= upto; i++) {
      const v = DATA.days[i]; if (!v) continue;
      const isCall = callIdx.has(i), x = L + i * dx, hh = Math.max(2, v * scaleH), sh = 2;
      ctx.fillStyle = isCall ? RED : G2; const bw = isCall ? Math.max(3, sqw) : sqw, bx = x + (sqw - bw) / 2;
      for (let yy = 0; yy < hh; yy += sh + gap) ctx.fillRect(bx, h - bot - 1 - yy - sh, bw, sh);
      if (isCall && (!small || v >= 230)) {
        const y = h - bot - hh - 6, row = lab++ % 2, ty = 16 + row * 30;
        ctx.strokeStyle = RED; ctx.globalAlpha = 0.35; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x + sqw / 2, y); ctx.lineTo(x + sqw / 2, ty + 18); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        const d = new Date(D0.getTime() + i * 864e5), t1 = `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)} · ${v}`, t2 = callIdx.get(i);
        const tw = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width), tx = clamp(x - tw / 2, 0, w - tw);
        ctx.fillStyle = INK; ctx.fillRect(tx - 3, ty - 11, tw + 6, 27); ctx.fillStyle = PAPER; ctx.fillText(t2, tx, ty); ctx.fillStyle = G3; ctx.fillText(t1, tx, ty + 12);
      }
    }
    if (upto < N - 1) { ctx.fillStyle = RED; ctx.fillRect(L + upto * dx + dx, top - 8, 1, H + 8); }
    $("dy").textContent = fmt(cumDays[upto][1]); $("ev2").textContent = fmt(cumDays[upto][0]);
  };
  return S;
}

/* ================= the cost: who counted the dead, and a tally wall of 789 marks ================= */
function makeCost() {
  const S = { c: $("ccost") };
  const PTS = [["2020-12-20", 41, "41 · unions"], ["2021-03-05", 248, "248 · reported"], ["2021-07-10", 537, "537 · SKM"], ["2021-11-15", 750, "~750 · Rakesh Tikait"], ["2021-12-20", 789, "789 · later count", 1]];
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h }); const mob = MOBILE();
    S.x = d3.scaleUtc().domain([new Date("2020-11-26"), new Date("2021-12-31")]).range([8, w - (mob ? 8 : 120)]);
    S.chartTop = 26; S.chartH = h * (mob ? 0.34 : 0.38); S.y = d3.scaleLinear().domain([0, 800]).range([S.chartTop + S.chartH, S.chartTop]);
    // tally wall below
    const top = S.chartTop + S.chartH + (mob ? 44 : 56), avail = h - top - 8, G = 158;
    let mh = 30; let gw, gpr, rows; while (mh > 8) { gw = mh * 0.95; gpr = Math.floor((w - 8) / gw); rows = Math.ceil(G / gpr); if (rows * mh * 1.25 <= avail) break; mh -= 1; }
    Object.assign(S, { mh, gw, gpr, top, ox: (w - gpr * gw) / 2 });
  };
  const markPos = i => { const g = Math.floor(i / 5), k = i % 5, gx = S.ox + (g % S.gpr) * S.gw, gy = S.top + Math.floor(g / S.gpr) * S.mh * 1.25; return [gx, gy, k]; };
  S.render = p => {
    const { ctx, w, h, x, y } = S; ctx.clearRect(0, 0, w, h); const mob = MOBILE();
    const draw = ease(seg(p, 0.04, 0.5)), lk = seg(p, 0.55, 0.66);
    const T = d3.timeDay.offset(new Date("2020-11-26"), Math.round(draw * 400));
    // axis
    ctx.strokeStyle = G1; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x.range()[0], y(0) + 0.5); ctx.lineTo(x.range()[1], y(0) + 0.5); ctx.stroke();
    ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = G2; ctx.textAlign = "left";
    ["2021-01-01", "2021-04-01", "2021-07-01", "2021-10-01"].forEach(d => { const xx = x(new Date(d)); ctx.fillRect(xx, y(0), 1, 5); ctx.fillText(d3.utcFormat(mob ? "%b %y" : "%b %Y")(new Date(d)).toUpperCase(), xx + 3, y(0) + 16); });
    // the step line of claimed totals
    let cur = 0; ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x.range()[0], y(0));
    for (const [d, v, , later] of PTS) { const dt = new Date(d); if (dt > T) break; if (later) continue; ctx.lineTo(x(dt), y(cur)); ctx.lineTo(x(dt), y(v)); cur = v; }
    ctx.lineTo(x(T < x.domain()[1] ? T : x.domain()[1]), y(cur)); ctx.stroke();
    // labels
    for (const [d, v, t, later] of PTS) { const dt = new Date(d); if (dt > T) continue; const xx = x(dt), yy = y(v);
      if (later) { ctx.setLineDash([3, 3]); ctx.strokeStyle = RED; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xx - 30, yy); ctx.lineTo(xx, yy); ctx.stroke(); ctx.setLineDash([]); }
      dot(ctx, xx, yy, 4.5, RED); ctx.fillStyle = PAPER; ctx.font = `700 ${mob ? 11 : 13}px "Bricolage Grotesque", sans-serif`;
      const right = xx > w * 0.72; ctx.textAlign = right ? "right" : "left"; if (mob && !(v === 41 || v === 537 || v === 789)) continue;
      ctx.fillText(mob ? String(v) : t, xx + (right ? -10 : 8), later ? yy + 18 : yy - 8); }
    // the government's answer: a flat line at zero
    if (T > new Date("2021-12-01")) { const g = clamp((T - new Date("2021-12-01")) / 864e5 / 12), xx = x(new Date("2021-12-01"));
      ctx.globalAlpha = g; ctx.strokeStyle = G3; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(x.range()[0], y(0) - 1); ctx.lineTo(x.range()[1], y(0) - 1); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = "right"; ctx.fillStyle = PAPER; ctx.font = `700 13px "Bricolage Grotesque", sans-serif`; ctx.fillText("GOVERNMENT, 1 DEC 2021: “NO RECORD”", x.range()[1], y(0) - 10); ctx.globalAlpha = 1; }
    // tally wall: one mark per death, in fives
    const n = Math.round(clamp(draw * 1.08) * 789), mh = S.mh;
    ctx.lineCap = "round"; ctx.lineWidth = Math.max(1.4, mh * 0.075);
    for (let i = 0; i < 789; i++) {
      const [gx, gy, k] = markPos(i), lak = i >= 600 && i < 608, on = i < n;
      ctx.strokeStyle = !on ? "#1c1c1c" : lak && lk > 0 ? RED : "#9a9a96";
      ctx.beginPath(); if (k < 4) { const xx = gx + mh * 0.12 + k * mh * 0.17; ctx.moveTo(xx, gy); ctx.lineTo(xx, gy + mh * 0.8); } else { ctx.moveTo(gx + mh * 0.02, gy + mh * 0.62); ctx.lineTo(gx + mh * 0.72, gy + mh * 0.16); } ctx.stroke();
    }
    ctx.fillStyle = G2; ctx.font = `600 11px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "left";
    ctx.fillText(mob ? "ONE MARK PER DEATH · 789" : "ONE MARK PER DEATH, UP TO THE HIGHEST COUNT: 789", S.ox, S.top - 14);
    if (lk > 0) { const [gx, gy] = markPos(600); ctx.globalAlpha = lk; ctx.fillStyle = RED; ctx.textAlign = "left"; ctx.fillText("LAKHIMPUR KHERI · 8", gx, gy - 4); ctx.globalAlpha = 1; }
  };
  return S;
}

/* ================= repeal: laws shatter ================= */
function makeRepeal() {
  const S = { c: $("crepeal") };
  const NAMES = ["Produce Trade", "Price Assurance", "Essential Commodities"];
  S.layout = () => { const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h });
    const bw = (w - 40) / 3, bh = Math.min(h * .5, bw * 1.3), s = Math.max(5, bw / 18), R = rng(9); S.dots = []; S.bw = bw; S.bh = bh; S.by = h / 2 - bh / 2;
    for (let k = 0; k < 3; k++) { const bx = 10 + k * (bw + 10); for (let y = S.by + s / 2; y < S.by + bh; y += s) for (let x = bx + s / 2; x < bx + bw; x += s) { const a = R() * 6.283, v = (0.4 + R()) * Math.min(w, h) * .6; S.dots.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - h * .1, r: s * .36, k: R() }); } }
  };
  S.render = p => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h);
    const sh = ease(seg(p, .3, .85)), show = ease(seg(p, 0, .12));
    ctx.fillStyle = G3; ctx.beginPath();
    for (const d of S.dots) { const t = clamp(sh * 1.3 - d.k * .3); const x = d.x + d.vx * t, y = d.y + d.vy * t + 0.5 * h * t * t; const r = d.r * show * (1 - t * .8); if (r < .2) continue; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.283); }
    ctx.fill();
    ctx.font = `800 20px "Bricolage Grotesque", sans-serif`; ctx.textAlign = "center";
    if (MOBILE()) ctx.font = `800 13px "Bricolage Grotesque", sans-serif`;
    NAMES.forEach((n, k) => { const x = 10 + k * (S.bw + 10) + S.bw / 2; ctx.fillStyle = PAPER; ctx.globalAlpha = show * (1 - sh * .7); ctx.fillText((MOBILE() ? ["Trade", "Contracts", "Stock limits"][k] : n).toUpperCase(), x, S.by - 12);
      if (sh > .6) { ctx.globalAlpha = seg(sh, .6, 1); ctx.strokeStyle = RED; ctx.setLineDash([4, 4]); ctx.strokeRect(10 + k * (S.bw + 10), S.by, S.bw, S.bh); ctx.setLineDash([]); ctx.fillStyle = RED; ctx.font = `600 12px "Bricolage Grotesque", sans-serif`; ctx.fillText("REPEALED", x, S.by + S.bh / 2); ctx.font = MOBILE() ? `800 13px "Bricolage Grotesque", sans-serif` : `800 20px "Bricolage Grotesque", sans-serif`; } });
    ctx.globalAlpha = 1;
  };
  return S;
}

/* ================= demands ladder (prototype) ================= */
const SMAP = { "met": "met", "met (agreed)": "met", "partly": "part", "promised": "part", "not met": "no", "not met as asked": "no", "verify": "check" };
const SLBL = { met: "Met", part: "Partly", no: "Not met", check: "To check" };
let rungs = [];
/* ================= demands: eleven stalks of wheat; each ripens on the day its demand was won ================= */
const DEM_SHORT = { D01: "Repeal the three laws", D02: "Legal guarantee of MSP", D03: "Special session to repeal", D04: "No fines for stubble burning", D05: "Withdraw the electricity bill",
  D06: "Drop cases against protesters", D07: "Justice for Lakhimpur Kheri", D08: "MSP at cost + 50%", D09: "Halve farm diesel prices", D10: "Free those held for stubble", D11: "Pay families of the dead" };
const DEM_ORDER = [["WON", ["D04", "D01"]], ["PROMISED ON PAPER", ["D05", "D06", "D11", "D10", "D07"]], ["STILL WAITING", ["D02", "D08", "D09", "D03"]]];
const DEM_WHEN = { D04: "2020-12-30", D07: "2021-10-09", D01: "2021-11-29", D05: "2021-12-09", D06: "2021-12-09", D10: "2021-12-09", D11: "2021-12-09" };
const S_D = {};
function buildDemands() {}
function renderDem() {
  const svg = $("vdem"); svg.innerHTML = ""; const { w, h } = svgSize(svg); const mob = w < 520;
  const byId = {}; DATA.demands.forEach(r => byId[r[0]] = { id: r[0], t: r[1], s: SMAP[r[2]] || "check", raw: r[2], how: r[4] || "" });
  const defs = svgEl("defs", {}, svg);
  const pat = svgEl("pattern", { id: "dhalf", width: 3, height: 3, patternUnits: "userSpaceOnUse" }, defs); svgEl("circle", { cx: 1.5, cy: 1.5, r: 0.9, fill: RED }, pat);
  const soil = svgEl("pattern", { id: "dsoil", width: 7, height: 6, patternUnits: "userSpaceOnUse" }, defs); svgEl("circle", { cx: 2, cy: 2, r: 1.1, fill: "#4a4a48" }, soil); svgEl("circle", { cx: 5.5, cy: 5, r: 0.7, fill: "#2c2c2a" }, soil);
  const sg = svgEl("linearGradient", { id: "dsoilfade", x1: 0, y1: 0, x2: 0, y2: 1 }, defs); svgEl("stop", { offset: 0, "stop-color": "#0B0B0B", "stop-opacity": 0 }, sg); svgEl("stop", { offset: 1, "stop-color": "#0B0B0B", "stop-opacity": 1 }, sg);
  const gy = h * (mob ? 0.66 : 0.68), H = Math.min(h * (mob ? 0.36 : 0.4), mob ? 230 : 330), L = mob ? 6 : 24, Rr = w - (mob ? 6 : 24);
  const n = 11, gaps = 2, step = (Rr - L) / (n + gaps * 0.9), R = rng(11);
  // soil
  svgEl("rect", { x: 0, y: gy, width: w, height: h - gy, fill: "url(#dsoil)" }, svg); svgEl("rect", { x: 0, y: gy, width: w, height: h - gy, fill: "url(#dsoilfade)" }, svg);
  svgEl("line", { x1: 0, x2: w, y1: gy, y2: gy, stroke: "rgba(237,237,234,.35)" }, svg);
  // date ticker
  S_D.tick = svgEl("text", { x: w - (mob ? 8 : 24), y: mob ? 44 : 64, "text-anchor": "end", style: `font:800 ${mob ? 30 : 54}px 'Bricolage Grotesque',sans-serif;font-stretch:75%;fill:${PAPER}` }, svg);
  const tl = svgEl("text", { x: w - (mob ? 8 : 24), y: mob ? 60 : 86, "text-anchor": "end", style: `font:600 ${mob ? 9 : 11}px 'Bricolage Grotesque',sans-serif;letter-spacing:.14em;fill:${G3}` }, svg); tl.textContent = "THE HARVEST SO FAR";
  // event card
  const card = svgEl("g", {}, svg), cw = mob ? w - 132 : Math.min(w * 0.5, 360);
  S_D.cd = svgEl("text", { x: mob ? 8 : 24, y: mob ? 24 : 40, style: `font:700 ${mob ? 9 : 11}px 'Bricolage Grotesque',sans-serif;letter-spacing:.14em;fill:${RED}` }, card);
  S_D.cb = svgEl("foreignObject", { x: mob ? 8 : 24, y: mob ? 30 : 50, width: cw, height: mob ? 80 : 96 }, card);
  // stalks
  let x = L + step / 2; S_D.items = [];
  DEM_ORDER.forEach(([grp, ids], gi) => {
    const x0 = x - step / 2;
    ids.forEach(id => {
      const d = byId[id], hh = H * (0.86 + R() * 0.14), sw = (R() - 0.5) * 10, g = svgEl("g", { transform: `translate(${x},${gy})`, style: "cursor:pointer" }, svg);
      const grow = svgEl("g", {}, g), col = "#8d8d88";
      svgEl("path", { d: `M0 0 Q${sw * 0.2} ${-hh * 0.5} ${sw} ${-hh}`, fill: "none", stroke: col, "stroke-width": mob ? 1.4 : 2 }, grow);
      [[0.3, 1], [0.52, -1]].forEach(([k, s]) => { const ly = -hh * k, lx = sw * k * k; svgEl("path", { d: `M${lx} ${ly} q${s * step * 0.28} ${-hh * 0.06} ${s * step * 0.42} ${hh * 0.08} q${-s * step * 0.2} ${-hh * 0.02} ${-s * step * 0.42} ${-hh * 0.05}z`, fill: "#5f5f5b" }, grow); });
      const ear = svgEl("g", { transform: `translate(${sw},${-hh})` }, grow), E = hh * 0.24, gr = [];
      const rows = 7, rx = Math.max(1.6, step * 0.07), ry = Math.max(2.8, E / rows * 0.75);
      for (let k = 0; k < rows; k++) for (const s of [-1, 1]) {
        const yy = -E + (k + 0.5) * E / rows, xx = s * rx * 1.15;
        svgEl("line", { x1: xx, y1: yy, x2: xx + s * rx * 2.2, y2: yy - ry * 2.6, stroke: "rgba(185,185,185,.45)", "stroke-width": 0.6 }, ear);
        gr.push(svgEl("ellipse", { cx: xx, cy: yy, rx, ry, transform: `rotate(${s * 22} ${xx} ${yy})`, fill: INK, stroke: G2, "stroke-width": 1 }, ear)); }
      gr.push(svgEl("ellipse", { cx: 0, cy: -E - ry * 0.6, rx, ry, fill: INK, stroke: G2, "stroke-width": 1 }, ear));
      // label under the ground
      const lab = svgEl("text", { x: 0, y: mob ? 14 : 20, "text-anchor": "middle", style: `font:600 ${mob ? 8 : 10.5}px 'Bricolage Grotesque',sans-serif;fill:${G3};stroke:#0B0B0B;stroke-width:4px;paint-order:stroke;stroke-linejoin:round` }, g);
      if (mob) lab.textContent = "";
      else { const words = DEM_SHORT[id].split(" "), lines = []; let cur = ""; words.forEach(wd => { if ((cur + " " + wd).trim().length > Math.max(8, step / 7.2) && cur) { lines.push(cur); cur = wd; } else cur = (cur + " " + wd).trim(); }); lines.push(cur);
        lines.forEach((ln, j) => { const ts = svgEl("tspan", { x: 0, dy: j ? 13 : 0 }, lab); ts.textContent = ln; }); }
      svgEl("rect", { x: -step / 2, y: -hh - E - 10, width: step, height: hh + E + 60, fill: "transparent" }, g);
      const it = { id, d, g, grow, ear, gr, hh, sw, when: DEM_WHEN[id] ? Date.parse(DEM_WHEN[id]) : null, lab, gi };
      g.addEventListener("pointerenter", () => { S_D.hover = it; demCard(); }); g.addEventListener("pointerdown", () => { S_D.hover = it; demCard(); });
      S_D.items.push(it); x += step;
    });
    const x1 = x - step / 2;
    const gg = svgEl("g", { opacity: 0 }, svg), by = gy + (mob ? 26 : 66);
    svgEl("path", { d: `M${x0 + 4} ${by - 5} V${by} H${x1 - 4} V${by - 5}`, fill: "none", stroke: gi === 2 ? RED : G2 }, gg);
    const gt = svgEl("text", { x: (x0 + x1) / 2, y: by + (mob ? 12 : 16), "text-anchor": "middle", style: `font:700 ${mob ? 8 : 11}px 'Bricolage Grotesque',sans-serif;letter-spacing:.14em;fill:${gi === 2 ? RED : gi === 0 ? PAPER : G3}` }, gg); gt.textContent = grp;
    S_D["grp" + gi] = gg; x += step * gaps * 0.9 / 2;
  });
  svg.onpointerleave = () => { S_D.hover = null; demCard(); };
  S_D.coda = svgEl("text", { x: w - (mob ? 8 : 24), y: h - (mob ? 10 : 22), "text-anchor": "end", opacity: 0, style: `font:600 ${mob ? 10 : 13}px 'Bricolage Grotesque',sans-serif;fill:${PAPER}` }, svg);
  S_D.coda.innerHTML = `<tspan fill="${RED}">FEB 2024</tspan> · farmers march again for the MSP law`;
  S_D.mob = mob; S_D.hover = null; S_D.last = null;
}
function demState(it, t) { if (!it.when || t < it.when) return "wait"; return it.d.s; }
function demCard() {
  const it = S_D.hover || S_D.last;
  if (!it) { S_D.cd.textContent = "AUGUST 2020"; S_D.cb.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" style="font:400 ${S_D.mob ? 12 : 15}px/1.35 'Bricolage Grotesque',sans-serif;color:#EDEDEA">Eleven demands are sown. Each stalk ripens on the day its demand is won.</div>`; return; }
  const st = it.d.raw === "promised" ? "PROMISED" : SLBL[it.d.s].toUpperCase(), dt = it.when ? new Date(it.when).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase() + " · " : "";
  S_D.cd.textContent = dt + st;
  S_D.cb.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" style="font:400 ${S_D.mob ? 12 : 15}px/1.35 'Bricolage Grotesque',sans-serif;color:#EDEDEA"><b style="font-weight:700">${it.d.t}.</b><br><span style="color:#9a9a96">${(it.d.how || "No date, no law.").replace(/: verify/g, "")}</span></div>`;
}
function renderDemP(p) {
  if (!S_D.items) return;
  const grow = eio(seg(p, 0.02, 0.2)), T0 = Date.UTC(2020, 7, 1), T1 = Date.UTC(2021, 11, 11), t = lerp(T0, T1, seg(p, 0.2, 0.78)), end = seg(p, 0.8, 0.9);
  S_D.tick.textContent = new Date(t).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
  let last = null;
  S_D.items.forEach((it, i) => {
    const gk = clamp(grow * 1.6 - i * 0.05); it.grow.setAttribute("transform", `scale(1,${Math.max(0.001, gk)})`);
    const s = demState(it, t); if (it.when && t >= it.when && (!last || it.when >= last.when)) last = it;
    if (s !== it.s) { it.s = s; it.gr.forEach((e, k) => {
      const f = s === "met" ? RED : s === "part" ? (it.d.raw === "promised" ? "url(#dhalf)" : (k % 4 < 2 ? RED : INK)) : INK;
      e.setAttribute("fill", f); e.setAttribute("stroke", s === "wait" ? G2 : RED); }); it.lab.style.fill = s === "met" || s === "part" ? PAPER : G3; }
    const droop = !it.when ? end : 0; it.ear.setAttribute("transform", `translate(${it.sw},${-it.hh}) rotate(${droop * 150})`);
    if (!it.when) it.lab.style.fill = end > 0.5 ? RED : G3;
  });
  [0, 1, 2].forEach(gi => S_D["grp" + gi].setAttribute("opacity", gi === 2 ? end : seg(p, 0.3 + gi * 0.35, 0.36 + gi * 0.35) > 0 ? 1 : 0));
  S_D.coda.setAttribute("opacity", seg(p, 0.88, 0.95));
  if (last !== S_D.last || S_D.first !== true) { S_D.last = last; S_D.first = true; if (!S_D.hover) demCard(); }
}

/* ================= radar ================= */
const S_RA = {}; const AX = ["numbers", "places", "people", "organisation", "pressure"];
const MOMN = { "2020-08": "Aug 2020", "2020-09": "Sep 2020", "2020-12": "Dec 2020", "2021-01-27": "27 Jan 2021", "2021-02": "Feb 2021", "2021-09": "Sep 2021", "2021-11": "Nov 2021" };
function renderRadar() {
  const svg = $("vradar"); svg.innerHTML = ""; const { w, h } = svgSize(svg); const cx = w / 2, cy = h / 2 + 8, R = Math.min(w, h) * 0.36;
  const defs = svgEl("defs", {}, svg), pat = svgEl("pattern", { id: "ht", width: 7, height: 7, patternUnits: "userSpaceOnUse" }, defs); svgEl("circle", { cx: 3.5, cy: 3.5, r: 2.3, fill: RED }, pat);
  const pt = (k, v) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return [cx + Math.cos(a) * R * v / 5, cy + Math.sin(a) * R * v / 5]; };
  for (let v = 1; v <= 5; v++) svgEl("polygon", { points: d3.range(5).map(k => pt(k, v).join(",")).join(" "), fill: "none", stroke: G1 }, svg);
  AX.forEach((a, k) => { const [x, y] = pt(k, 5); svgEl("line", { x1: cx, y1: cy, x2: x, y2: y, stroke: G1 }, svg); const [lx, ly] = pt(k, 5.9); const t = svgEl("text", { x: lx, y: ly + 4, class: "lbl", "text-anchor": "middle" }, svg); t.textContent = a; });
  S_RA.ghosts = DATA.growth.map(() => svgEl("polygon", { fill: "none", stroke: G2, "stroke-width": 1, opacity: 0 }, svg));
  S_RA.shape = svgEl("polygon", { fill: "url(#ht)", stroke: RED, "stroke-width": 2 }, svg); S_RA.pt = pt;
}
function renderRadarP(p) {
  const G = DATA.growth, t = clamp(p * 1.1) * (G.length - 1), i = Math.floor(t), f = ease(t - i), j = Math.min(G.length - 1, i + 1);
  const vals = AX.map((a, k) => lerp(G[i][2 + k], G[j][2 + k], f));
  S_RA.shape.setAttribute("points", vals.map((v, k) => S_RA.pt(k, v).join(",")).join(" "));
  S_RA.ghosts.forEach((g, k) => { g.setAttribute("opacity", k < Math.round(t) ? .5 : 0); g.setAttribute("points", AX.map((a, q) => S_RA.pt(q, G[k][2 + q]).join(",")).join(" ")); });
  const r = G[Math.round(t)]; $("radm").textContent = MOMN[r[0]] || r[0]; $("radn").textContent = r[1] + ".";
}

/* ================= back to the world ================= */
function makeBack() {
  const S = { c: $("cback") };
  S.layout = () => { const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h }, worldBase(w, h, 6)); S.rd = Math.max(2.6, w / 190); S.fi = DATA.protests.findIndex(p => p[11]); };
  S.render = (p, tm = 0) => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h);
    const col = ease(seg(p, .4, .55)), conv = eio(seg(p, .76, .86)), pulse = Math.sin(p * 120), fig = ease(seg(p, .84, .9)), crowdT = seg(p, .88, .99);
    drawLand(ctx, S.land, S.s, "#3a3a3a", 1 - conv);
    DATA.protests.forEach((q, i) => { const [x0, y0] = S.pos[i], x = lerp(x0, w / 2, conv), y = lerp(y0, h / 2, conv);
      let c = i === S.fi ? RED : (col > .5 ? (q[8] ? RED : "#777") : "#555");
      let r = S.rd * (i === S.fi ? 1.5 + .4 * pulse : 1) * (col > .5 && p < .78 ? 1 + .25 * Math.max(0, Math.sin(p * 60 + i)) : 1);
      ctx.globalAlpha = 1 - conv * .9; dot(ctx, x, y, r, c); });
    ctx.globalAlpha = 1;
    // the dots gather into one red dot, the dot becomes a person, and a crowd gathers round them, as at the start
    const cx = w / 2, cy = h / 2, sc = Math.min(w, h) * (MOBILE() ? 1.25 : 1.05) / 982;
    if (conv > 0 && fig < 1) { const r = lerp(S.rd, Math.min(w, h) * .03, conv); ctx.globalAlpha = (.2 * conv) * (1 - fig); dot(ctx, cx, cy, r * 2.6, RED); ctx.globalAlpha = 1 - fig; dot(ctx, cx, cy, r, RED); ctx.globalAlpha = 1; }
    if (fig > 0) {
      const br = 1 + 0.08 * Math.sin(tm / 600), hr = 120 * sc * br, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, hr * 2.2);
      g.addColorStop(0, `rgba(255,110,100,${0.42 * fig})`); g.addColorStop(0.35, `rgba(240,60,50,${0.18 * fig})`); g.addColorStop(1, "rgba(225,6,0,0)");
      ctx.fillStyle = g; ctx.fillRect(cx - hr * 2.2, cy - hr * 2.2, hr * 4.4, hr * 4.4);
      const C = IMG.O_crowd_a, FX = 961, FY = 513, OX = 915, OY = 468;
      if (C && crowdT > 0) { const e = eio(crowdT), turn = (1 - e) * 0.85, z = lerp(1.7, 1, e);
        ctx.save(); ctx.globalAlpha = clamp(e * 1.25); ctx.translate(cx, cy); ctx.rotate(turn); ctx.scale(z * sc, z * sc); ctx.drawImage(C, -FX, -FY); ctx.restore(); }
      const O = IMG.O_one; if (O) { const bob = Math.sin(tm / 230) * 0.9 * sc, k = sc * lerp(0.5, 1.9, fig);
        ctx.save(); ctx.globalAlpha = fig; ctx.translate(cx, cy + bob); ctx.rotate(Math.sin(tm / 460) * 0.035); ctx.scale(k, k); ctx.drawImage(O, OX - FX, OY - FY); ctx.restore(); }
    }
  };
  return S;
}


/* ================= staying safe: a tree's rings. One ring per month, ring width = protest events; red wood = months a precaution ran ================= */
function makeSafeTree() {
  const S = { c: $("csafe") };
  // [precaution id, short label, when, first month, last month]: dates from the precautions sheet
  const SP = [["PR1", "Peaceful conduct", "throughout", "2020-08", "2021-12"], ["PR2", "Strike only 11 am–3 pm", "8 Dec 2020", "2020-12", "2020-12"], ["PR3", "Their own CCTV", "from Dec 2020", "2020-12", "2021-12"],
    ["PR4", "IT cell vs. rumours", "from Dec 2020", "2020-12", "2021-12"], ["PR5", "Medical camps", "at the border camps", "2020-11", "2021-12"], ["PR6", "Condemned the violence", "26–27 Jan 2021", "2021-01", "2021-01"], ["PR8", "Villages sent shifts", "at the border camps", "2020-12", "2021-12"]];
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h }); const mob = MOBILE();
    const M = DATA.spread.map(r => r[1]), n = M.length; S.n = n;
    S.R = Math.min(w * (mob ? 0.235 : 0.29), h * (mob ? 0.36 : 0.4)); S.cx = w / 2; S.cy = h / 2 + (mob ? 6 : 0);
    const wd = M.map(v => 0.35 + Math.sqrt(v)), tot = d3.sum(wd); let acc = 0; S.rad = wd.map(v => (acc += v) / tot); // outer edge of each ring, 0..1
    const R = rng(41), harm = d3.range(2, 8).map(k => [k, (0.028 + R() * 0.02) / Math.sqrt(k), R() * 6.28]);
    S.shape = a => 1 + harm.reduce((t, [k, am, ph]) => t + am * Math.sin(k * a + ph), 0);
    const ringPath = (ctx, rr, jit = 0) => { ctx.beginPath(); for (let i = 0; i <= 180; i++) { const a = i / 180 * 6.2832, r = rr * S.R * S.shape(a) * (1 + jit * Math.sin(a * 23 + rr * 40)); i ? ctx.lineTo(S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r) : ctx.moveTo(S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r); } ctx.closePath(); };
    S.ringPath = ringPath;
    const oc = document.createElement("canvas"); oc.width = Math.ceil(w * DPR); oc.height = Math.ceil(h * DPR); const o = oc.getContext("2d"); o.scale(DPR, DPR);
    // wood: rings from the bark inwards, the centre lighter, like a cut log
    for (let i = n - 1; i >= 0; i--) { const t = i / (n - 1), g = Math.round(lerp(150, 72, Math.pow(t, 0.6)) + (i % 2 ? -7 : 5)); o.fillStyle = `rgb(${g},${g},${g - 2})`; ringPath(o, S.rad[i]); o.fill(); }
    // latewood: a darker band at the outer edge of each ring
    for (let i = n - 1; i >= 0; i--) { o.strokeStyle = "rgba(15,15,15,.32)"; o.lineWidth = Math.max(1.5, (S.rad[i] - (i ? S.rad[i - 1] : 0)) * S.R * 0.28); S.ringPath(o, S.rad[i] - (S.rad[i] - (i ? S.rad[i - 1] : 0)) * 0.12); o.stroke(); }
    // fine grain between the rings
    o.lineWidth = 0.7; for (let i = 0; i < n; i++) { const r0 = i ? S.rad[i - 1] : 0.02, r1 = S.rad[i], k = Math.max(1, Math.round((r1 - r0) * 110)); for (let j = 1; j <= k; j++) { o.strokeStyle = R() < 0.3 ? `rgba(220,220,215,${0.06 + R() * 0.08})` : `rgba(15,15,15,${0.12 + R() * 0.16})`; ringPath(o, lerp(r0, r1, j / (k + 1)), 0.006); o.stroke(); } }
    // speckle and a few radial cracks
    for (let i = 0; i < 14000; i++) { const a = R() * 6.2832, r = Math.sqrt(R()) * S.R * S.shape(a), L = 2 + R() * 7; o.strokeStyle = R() < 0.55 ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.08)"; o.lineWidth = 0.6; o.beginPath(); o.arc(S.cx, S.cy, r, a, a + L / Math.max(r, 1)); o.stroke(); }
    o.strokeStyle = "rgba(10,10,10,.45)"; for (let c = 0; c < 7; c++) { let a = R() * 6.2832, r = S.R * (0.15 + R() * 0.2); o.lineWidth = 0.6 + R() * 1.2; o.beginPath(); o.moveTo(S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r); const end = S.R * (0.5 + R() * 0.4); while (r < end) { r += 6; a += (R() - 0.5) * 0.03; o.lineTo(S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r); } o.stroke(); }
    S.wood = oc;
    // the same wood, stained red, used inside each precaution's wedge
    const rc = document.createElement("canvas"); rc.width = oc.width; rc.height = oc.height; const rx = rc.getContext("2d"); rx.drawImage(oc, 0, 0);
    rx.globalCompositeOperation = "multiply"; rx.fillStyle = "#E3241B"; rx.fillRect(0, 0, rc.width, rc.height); rx.globalCompositeOperation = "screen"; rx.fillStyle = "rgba(70,0,0,.35)"; rx.fillRect(0, 0, rc.width, rc.height);
    S.red = rc; S.sp = SP.map((d, i) => ({ d, a0: -Math.PI / 2 + i * 6.2832 / SP.length, a1: -Math.PI / 2 + (i + 1) * 6.2832 / SP.length, m0: DATA.months.indexOf(d[3]), m1: DATA.months.indexOf(d[4]) }));
  };
  const wedge = (ctx, a0, a1, r0, r1) => { ctx.beginPath(); const N = 40; for (let i = 0; i <= N; i++) { const a = lerp(a0, a1, i / N), r = r1 * S.R * S.shape(a); i ? ctx.lineTo(S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r) : ctx.moveTo(S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r); }
    for (let i = N; i >= 0; i--) { const a = lerp(a0, a1, i / N), r = r0 * S.R * S.shape(a); ctx.lineTo(S.cx + Math.cos(a) * r, S.cy + Math.sin(a) * r); } ctx.closePath(); };
  S.render = p => {
    const { ctx, w, h, n } = S; ctx.clearRect(0, 0, w, h); const mob = MOBILE();
    const grow = ease(seg(p, 0.04, 0.62)) * n, shown = Math.min(n - 1, Math.floor(grow)), part = grow - Math.floor(grow), rOut = grow >= n ? S.rad[n - 1] : lerp(shown ? S.rad[shown - 1] : 0, S.rad[shown], part);
    if (rOut <= 0.001) return;
    ctx.save(); S.ringPath(ctx, rOut); ctx.clip(); ctx.drawImage(S.wood, 0, 0, w, h);
    // red wood: each precaution, in the months it ran
    for (const q of S.sp) { if (q.m0 < 0) continue; const r0 = q.m0 ? S.rad[q.m0 - 1] : 0.0, r1 = S.rad[q.m1]; ctx.save(); wedge(ctx, q.a0 + 0.004, q.a1 - 0.004, r0, r1); ctx.clip(); ctx.drawImage(S.red, 0, 0, w, h); ctx.restore(); }
    // ring lines and wedge edges
    ctx.strokeStyle = "rgba(237,237,234,.55)"; ctx.lineWidth = 0.9; for (let i = 0; i < n; i++) { if (S.rad[i] > rOut + 1e-6) break; S.ringPath(ctx, S.rad[i]); ctx.stroke(); }
    ctx.strokeStyle = "rgba(11,11,11,.8)"; ctx.lineWidth = 1.4; for (const q of S.sp) { ctx.beginPath(); ctx.moveTo(S.cx, S.cy); const r = S.R * S.shape(q.a0) * 1.01; ctx.lineTo(S.cx + Math.cos(q.a0) * r, S.cy + Math.sin(q.a0) * r); ctx.stroke(); }
    ctx.restore();
    // bark
    ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = Math.max(3, S.R * 0.035); S.ringPath(ctx, rOut, 0.006); ctx.stroke();
    // month labels along one radius, like the years on a log
    ctx.font = `600 ${mob ? 9 : 10}px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = PAPER; ctx.textAlign = "left";
    const la = -Math.PI / 2 + 6.2832 / S.sp.length * 0.5; // middle of the first wedge has room? use a gap between wedges instead
    const LBL = { "2020-08": "Aug 2020", "2020-12": "Dec 2020", "2021-06": "Jun 2021", "2021-12": "Dec 2021" };
    // the labels
    for (const q of S.sp) {
      const vis = clamp((grow - q.m0) / 1.2); if (vis <= 0) continue;
      const am = (q.a0 + q.a1) / 2, rr = S.R * S.shape(am) * S.rad[n - 1], x0 = S.cx + Math.cos(am) * rr * 1.02, y0 = S.cy + Math.sin(am) * rr * 1.02, L = mob ? 8 : 26;
      const x1 = S.cx + Math.cos(am) * (rr + L), y1 = S.cy + Math.sin(am) * (rr + L), right = Math.cos(am) >= 0;
      ctx.globalAlpha = vis; ctx.strokeStyle = G2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1 + (right ? 10 : -10), y1); ctx.stroke();
      ctx.font = `700 ${mob ? 10 : 14}px "Bricolage Grotesque", sans-serif`; ctx.textAlign = right ? "left" : "right";
      const room = right ? w - x1 - 18 : x1 - 18; let lines = [q.d[1]];
      if (ctx.measureText(q.d[1]).width > room) { const wds = q.d[1].split(" "), hlf = Math.ceil(wds.length / 2); lines = [wds.slice(0, hlf).join(" "), wds.slice(hlf).join(" ")]; }
      const tw = Math.max(...lines.map(t => ctx.measureText(t).width)), tx = right ? Math.min(x1 + 14, w - tw - 4) : Math.max(x1 - 14, tw + 4), lh = mob ? 12 : 17;
      ctx.fillStyle = PAPER; lines.forEach((t, j) => ctx.fillText(t, tx, y1 + 1 + j * lh));
      ctx.font = `500 ${mob ? 9 : 12}px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = "#9a9a96"; ctx.fillText(q.d[2], tx, y1 + 1 + lines.length * lh - (mob ? 1 : 2));
    }
    ctx.globalAlpha = 1;
    // month ticks along the cut between the last and first wedge (straight up)
    ctx.font = `600 ${mob ? 8 : 10}px "Bricolage Grotesque", sans-serif`; ctx.fillStyle = "rgba(237,237,234,.85)"; ctx.textAlign = "left";
    DATA.months.forEach((m, i) => { if (!LBL[m] || i >= grow) return; const a = -Math.PI / 2, r = S.rad[i] * S.R * S.shape(a) - 3;
      ctx.save(); ctx.translate(S.cx + 3, S.cy - r); ctx.fillText(LBL[m], 2, 3); ctx.restore(); });
  };
  return S;
}

/* ================= prologue: a protest banner in dots; Pash's line is painted on, then turns into English ================= */
function makeBanner() {
  const S = { c: $("cq") };
  const IW = 1672, IH = 941, BAN = [60, 515, 1610, 912], TXT = [262, 548, 1430, 880]; // banner cloth and lettering box, image px
  const PA = ["ਸਭ ਤੋਂ ਖ਼ਤਰਨਾਕ ਹੁੰਦਾ ਹੈ", "ਸਾਡੇ ਸੁਪਨਿਆਂ ਦਾ ਮਰ ਜਾਣਾ"], EN = ["\u201CTHE MOST DANGEROUS THING", "IS THE DEATH OF OUR DREAMS\u201D"];
  const PAm = ["ਸਭ ਤੋਂ ਖ਼ਤਰਨਾਕ", "ਹੁੰਦਾ ਹੈ", "ਸਾਡੇ ਸੁਪਨਿਆਂ", "ਦਾ ਮਰ ਜਾਣਾ"], ENm = ["\u201CTHE MOST", "DANGEROUS THING", "IS THE DEATH OF", "OUR DREAMS\u201D"];
  const fit = (ctx, lines, font, maxW, maxH) => { let f = maxH / (lines.length * 1.18); ctx.font = font(f); const wmax = Math.max(...lines.map(l => ctx.measureText(l).width)); if (wmax > maxW) f *= maxW / wmax; return f; };
  const textMask = (w, h, lines, font, box, col) => { const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h); const x = c.getContext("2d", { willReadFrequently: true });
    const [x0, y0, x1, y1] = box, f = fit(x, lines, font, (x1 - x0), (y1 - y0)); x.font = font(f); x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
    lines.forEach((l, i) => x.fillText(l, (x0 + x1) / 2, y0 + (y1 - y0) * (i + 0.5) / lines.length)); return x.getImageData(0, 0, c.width, c.height).data; };
  S.layout = () => {
    const { ctx, w, h } = sizeCanvas(S.c); Object.assign(S, { ctx, w, h }); const mob = MOBILE(), I = IMG.P_banner; if (!I) return;
    const sc = mob ? Math.max(w / 860, 0.3) : Math.max(w / IW, (h - 130) / IH), cxI = mob ? 846 : IW / 2, cyI = mob ? 560 : IH / 2;
    const ox = w / 2 - cxI * sc, oy = mob ? h * 0.42 - cyI * sc : Math.min(0, h - 130 - IH * sc), T = ([a, b, c, d]) => [ox + a * sc, oy + b * sc, ox + c * sc, oy + d * sc];
    S.ban = T(BAN); S.txt = T(TXT); if (mob) { S.txt = [12, S.ban[1] + (S.ban[3] - S.ban[1]) * 0.08, w - 12, S.ban[3] - (S.ban[3] - S.ban[1]) * 0.1]; S.ban[0] = Math.max(S.ban[0], 0); S.ban[2] = Math.min(S.ban[2], w); }
    const pa = mob ? PAm : PA, en = mob ? ENm : EN; S.nl = pa.length; S.img = [ox, oy, IW * sc, IH * sc];
    const oc = document.createElement("canvas"); oc.width = Math.ceil(w); oc.height = Math.ceil(h); const o2 = oc.getContext("2d", { willReadFrequently: true });
    o2.fillStyle = "#000"; o2.fillRect(0, 0, w, h); o2.drawImage(I, ox, oy, IW * sc, IH * sc); const px = o2.getImageData(0, 0, oc.width, oc.height).data;
    const [tx0, ty0, tx1, ty1] = S.txt, pad = (tx1 - tx0) * 0.02, box = [tx0 + pad, ty0, tx1 - pad, ty1];
    const mP = textMask(w, h, pa, f => `800 ${f}px "Noto Sans Gurmukhi", sans-serif`, box), mE = textMask(w, h, en, f => `800 ${f}px "Bricolage Grotesque", sans-serif`, [box[0], box[1] + (ty1 - ty0) * 0.06, box[2], box[3] - (ty1 - ty0) * 0.06]);
    const st = mob ? 3.1 : Math.max(5, w / 230), R = rng(4); S.st = st; S.cells = [];
    for (let j = 0, y = st / 2; y < h; j++, y += st * 0.866) for (let x = st / 2 + (j % 2 ? st / 2 : 0); x < w; x += st) {
      const i = (Math.floor(y) * oc.width + Math.floor(x)) * 4, lum = px[i] / 255, inB = x > S.ban[0] && x < S.ban[2] && y > S.ban[1] && y < S.ban[3];
      if (lum < 0.05 && !inB) continue;
      S.cells.push({ x, y, lum, inB, pa: mP[i + 3] > 110, en: mE[i + 3] > 110, line: clamp(Math.floor((y - ty0) / (ty1 - ty0) * S.nl), 0, S.nl - 1), u: (x - tx0) / (tx1 - tx0), r: R() });
    }
  };
  S.render = (p, tm = 0) => {
    const { ctx, w, h, st } = S; if (!S.cells) return; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, w, h);
    const intro = 1, r1 = seg(p, 0.08, 0.26), r2 = seg(p, 0.25, 0.43), dis = seg(p, 0.55, 0.74), echo = seg(p, 0.43, 0.6), sec = tm / 1000;
    const bins = [[], [], [], []], red = [], glow = [];
    for (const c of S.cells) {
      const rl = seg(p, 0.08 + c.line * 0.35 / S.nl, 0.08 + (c.line + 1) * 0.35 / S.nl), shown = c.u < rl * 1.08, txt = dis > c.r ? c.en : (c.pa && shown);
      if (txt) { red.push(c); continue; }
      const lum = c.inB ? Math.max(c.lum, 0.62) : c.lum, rr = st * 0.5 * Math.sqrt(lum) * (c.inB ? 0.9 : 1); if (rr < 0.35) continue;
      bins[Math.min(3, Math.floor(lum * 4))].push([c.x, c.y, rr]);
    }
    ctx.globalAlpha = intro;
    const cols = ["rgba(140,140,138,.45)", "rgba(170,170,166,.6)", "rgba(200,200,196,.75)", "rgba(230,230,226,.9)"];
    bins.forEach((b, i) => { ctx.fillStyle = cols[i]; ctx.beginPath(); for (const [x, y, r] of b) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); } ctx.fill(); });
    // the painted words, in red; a slow echo ripples out once the whole line has been said
    const pulse = 1 + 0.06 * Math.sin(sec * 2.2);
    ctx.fillStyle = RED; ctx.beginPath(); for (const c of red) { const r = st * 0.5 * pulse; ctx.moveTo(c.x + r, c.y); ctx.arc(c.x, c.y, r, 0, 6.2832); } ctx.fill();
    if (echo > 0 && echo < 1) { const [bx0, by0, bx1, by1] = S.ban, cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, R0 = (bx1 - bx0) * 0.55 * (0.6 + echo * 1.2);
      ctx.strokeStyle = `rgba(225,6,0,${0.5 * (1 - echo)})`; ctx.lineWidth = st * 0.8; ctx.setLineDash([1, st * 1.2]); ctx.lineCap = "round";
      ctx.beginPath(); ctx.ellipse(cx, cy, R0, R0 * 0.45, 0, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); }
    ctx.globalAlpha = 1;
  };
  return S;
}

/* ================= wiring ================= */
async function main() {
  const [d, wd, sh] = await Promise.all(["data/story.json", "data/world.json", "data/shapes.json"].map(u => fetch(u).then(r => r.json())));
  DATA = d; WORLD = wd; SH = sh;
  const keys = ["A02", "A03", "A04", "A05", "A06", "A08", "A10", "A14", "A15"], masks = ["A03", "A04", "A14", "A15"];
  const imgs = await Promise.all([...keys.map(k => loadImg(`img/${k}.jpg`)), ...masks.map(k => loadImg(`img/${k}_red.png`))]);
  keys.forEach((k, i) => IMG[k] = imgs[i]); masks.forEach((k, i) => IMG[k + "_red"] = imgs[keys.length + i]);
  const extra = ["L_field.jpg", "L_people.png", "L_gavel_h.png", "L_gavel_b.png", "T_red.png", "T_grey.png", "O_crowd.jpg", "O_crowd_a.png", "O_one.png", "U_figs.png", "B2_truck.png", "B2_spray.png", "B2_can.png", "B2_smoke.png", "B2_barr.png", "B2_road.png", "C_tent.png", "C_tractor.png", "C_trolley.png", "P_banner.jpg"];
  const [ex, pj] = await Promise.all([Promise.all(extra.map(f => loadImg("img/" + f))), fetch("img/L_people.json").then(r => r.json()).catch(() => null)]);
  extra.forEach((f, i) => IMG[f.split(".")[0]] = ex[i]); IMG.L_peopleJ = pj;
  buildPeople(); buildFort(); buildDemands();
  const Sf = makeSafeTree(), Rd = makeRday(), s0 = makeS0(), La = makeLawField(), W = makeWorld(), M = makeMarch(), Wi = makeWinter(), Sp = makeSpread(), Dy = makeDays(), Co = makeCost(), Re = makeRepeal(), Bk = makeBack(), BAN = makeBanner();
  const ph = { a03: makePhoto("ca03", "A03", { focus: [.5, .45], redDark: 1 }), a04: makePhoto("ca04", "A04", { focus: [.5, .55], redDark: 1 }), a05: makePhoto("ca05", "A05"), a06: makePhoto("ca06", "A06", { focus: [.45, .62] }), a08: makePhoto("ca08", "A08", { focus: [.5, .4] }), a10: makePhoto("ca10", "A10", { focus: [.4, .5] }), a14: makePhoto("ca14", "A14", { focus: [.5, .4] }), a15: makePhoto("ca15", "A15", { focus: [.4, .5], redDark: -1 }) };
  const scenes = [
    ["sq", BAN.layout, (p, tm) => { BAN.render(p, tm); { const q = $("qcap"); q.classList.toggle("on", p > 0.72); q.classList.toggle("in", p > 0.72); } }, true],
    ["s0", s0.layout, s0.render, 1], ["sw", W.layout, W.render],
    ["sland", renderLand, renderLandP],
    ["slaws", La.layout, La.render, 1],
    ["pa03", ph.a03.layout, ph.a03.render], ["pa04", ph.a04.layout, ph.a04.render], ["smarch", M.layout, M.render, 1], ["pa05", ph.a05.layout, ph.a05.render],
    ["pa06", ph.a06.layout, ph.a06.render], ["scamp", renderCampMap, renderCampMapP], ["sorg", renderOrg, renderOrgP], ["pa08", ph.a08.layout, ph.a08.render],
    ["speople", () => {}, p => { [...$("people").children].forEach((f, i) => f.classList.toggle("on", p > .05 + i * .07)); [...$("others").children].forEach((f, i) => f.classList.toggle("on", p > .5 + i * .06)); }],
    ["ssafe", Sf.layout, Sf.render], ["pa10", ph.a10.layout, ph.a10.render], ["stalks", renderTalks, renderTalksP],
    ["swinter", Wi.layout, Wi.render, 1], ["srday", Rd.layout, Rd.render, 1], ["sfort", () => {}, renderFortP], ["pa14", ph.a14.layout, ph.a14.render],
    ["s1", Sp.layout, Sp.render], ["s2", Dy.layout, Dy.render], ["scost", Co.layout, Co.render], ["srepeal", Re.layout, Re.render],
    ["s3", renderDem, renderDemP],
    ["pa15", ph.a15.layout, ph.a15.render], ["sradar", renderRadar, renderRadarP], ["sback", Bk.layout, Bk.render, true]
  ];
  const prog = {};
  const stepper = id => { const box = $(id).querySelector(".steps"); if (!box) return null; const th = box.dataset.steps.split(",").map(Number), kids = [...box.children]; const fit = () => { box.style.minHeight = Math.max(...kids.map(c => c.offsetHeight)) + "px"; }; fit(); window.addEventListener("resize", fit); if (document.fonts) document.fonts.ready.then(fit); return p => { let k = 0; th.forEach((t, i) => { if (p >= t) k = i; }); kids.forEach((c, i) => c.classList.toggle("on", i === k)); }; };
  scenes.forEach(([id, lay, ren]) => {
    prog[id] = 0; const stp = stepper(id); if (stp) stp(0);
    ScrollTrigger.create({ trigger: "#" + id, start: "top top", end: "bottom bottom", onUpdate: st => { prog[id] = st.progress; ren(st.progress); if (stp) stp(st.progress); } });
  });
  const chap = $("chap");
  document.querySelectorAll("[data-label]").forEach(el => ScrollTrigger.create({ trigger: el, start: "top 50%", end: "bottom 50%", onToggle: st => { if (st.isActive) chap.textContent = el.dataset.label; } }));
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: st => $("bar").style.width = (st.progress * 100) + "%" });
  const active = new Set(), LIVE = scenes.filter(sc => sc[3]);
  LIVE.forEach(([id]) => ScrollTrigger.create({ trigger: "#" + id, start: "top bottom", end: "bottom top", onToggle: st => st.isActive ? active.add(id) : active.delete(id) }));
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loop = tm => { if (!RM) LIVE.forEach(([id, , ren]) => { if (active.has(id)) ren(prog[id], tm); }); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  const layoutAll = () => scenes.forEach(([id, lay, ren]) => { lay(); ren(prog[id]); });
  let rt, lastW = window.innerWidth; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (MOBILE() && Math.abs(window.innerWidth - lastW) < 2) return; lastW = window.innerWidth; layoutAll(); ScrollTrigger.refresh(); }, 180); });
  layoutAll();
  if (document.fonts) document.fonts.ready.then(() => layoutAll());
  if (document.fonts) Promise.all([document.fonts.load('800 60px "Noto Sans Gurmukhi"', "ਸਭ"), document.fonts.load('800 60px "Bricolage Grotesque"', "THE")]).then(() => { BAN.layout(); BAN.render(prog.sq || 0); }).catch(() => {});
  // tooltip on the world map
  const tip = $("tip"), cw = $("cw");
  cw.addEventListener("pointermove", e => { const r = cw.getBoundingClientRect(), i = W.hit(e.clientX - r.left, e.clientY - r.top, prog.sw);
    if (i == null) { tip.style.opacity = 0; return; } const q = DATA.protests[i];
    tip.innerHTML = `<b>${q[2]}</b>${q[1]} · ${q[3].slice(0, 4)}<br>Peak: ${q[5].toLowerCase()} · ${q[6] >= 365 ? Math.round(q[6] / 365) + "+ yr" : q[6] + " days"}<br>${q[8] ? "<i>Forced a change</i>" : "No change recorded"}`;
    tip.style.left = Math.min(window.innerWidth - 270, e.clientX + 14) + "px"; tip.style.top = (e.clientY + 14) + "px"; tip.style.opacity = 1; });
  cw.addEventListener("pointerleave", () => tip.style.opacity = 0);
  // keyboard: arrows step through scenes and their steps (for the live presentation)
  const stops = () => { const out = []; const vh = window.innerHeight;
    document.querySelectorAll("section").forEach(sec => { const top = sec.offsetTop; out.push(top); const box = sec.querySelector(".steps");
      if (box && sec.classList.contains("scene")) box.dataset.steps.split(",").map(Number).slice(1).forEach(t => out.push(top + (sec.offsetHeight - vh) * (t + 0.06))); });
    return [...new Set(out.map(Math.round))].sort((a, b) => a - b); };
  window.addEventListener("keydown", e => { if (e.target.closest && e.target.closest("input,textarea")) return; const fw = e.key === "ArrowRight" || e.key === "PageDown", bw = e.key === "ArrowLeft" || e.key === "PageUp"; if (!fw && !bw) return;
    e.preventDefault(); const y = window.scrollY, S = stops(); const t = fw ? S.find(v => v > y + 4) : [...S].reverse().find(v => v < y - 4); if (t != null) window.scrollTo({ top: t, behavior: "smooth" }); });
}
main();
