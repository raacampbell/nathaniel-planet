/* PROTOTYPE: renders one very-high-detail ground patch (tangent-plane tile) for Nathaniel Planet.
   node proto/patch-proto.js  ->  /tmp/patch.rgba + proto/patch.json
   The real thing would do this per tile, in the worker, on demand. */
const G = require('../planet-gen.js');
const fs = require('fs');
const RES = +(process.env.RES || 2048), SPAN = +(process.env.SPAN || 0.5);
const P = G.createPlanet(101), N = G.makeNoise(101 ^ 0x5bd1e995);
const F = [0.5986447466753557, -0.410730691626668, 0.6876952568062966], C = [0.5543393335942213, -0.2924594531928928, 0.779214586278022];
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nz = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
let n0 = nz(F.map((v, i) => v + C[i]));
let u = nz(cr(n0, [0, 1, 0])), w = cr(n0, u);
const n = nz(n0.map((v, i) => v + 0.12 * 1 * u[i]));        // slide the patch toward the coast
u = nz(cr(n, [0, 1, 0])); w = cr(n, u);
const H = Math.tan(SPAN / 2);
const dirAt = (a, b) => nz([n[0] + (a * u[0] + b * w[0]) * H, n[1] + (a * u[1] + b * w[1]) * H, n[2] + (a * u[2] + b * w[2]) * H]);
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const t0 = Date.now(), log = m => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', m);

/* 1. coarse height grid (smooth), then full-res = bilinear + fine octaves, faded to zero at the patch border */
const CG = 257, hc = new Float32Array(CG * CG);
for (let j = 0; j < CG; j++) for (let i = 0; i < CG; i++) { const d = dirAt(i / (CG - 1) * 2 - 1, j / (CG - 1) * 2 - 1); hc[j * CG + i] = P.heightAt(d[0], d[1], d[2]); }
log('coarse grid');
const W = RES, HH = new Float32Array(W * W), HB = new Float32Array(W * W);   // HB = base height (no fine detail)
const border = (a, b) => sm(0.0, 0.16, 1 - Math.max(Math.abs(a), Math.abs(b)));       // 0 at the edge, 1 inside
const DET = [[40, 0.006], [90, 0.0042], [200, 0.0024], [450, 0.0012], [1000, 0.0006]];
for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
  const a = (i + 0.5) / W * 2 - 1, b = (j + 0.5) / W * 2 - 1;
  const fx = (i + 0.5) / W * (CG - 1), fy = (j + 0.5) / W * (CG - 1), x0 = Math.min(CG - 2, Math.floor(fx)), y0 = Math.min(CG - 2, Math.floor(fy)), tx = fx - x0, ty = fy - y0;
  const h = (hc[y0 * CG + x0] * (1 - tx) + hc[y0 * CG + x0 + 1] * tx) * (1 - ty) + (hc[(y0 + 1) * CG + x0] * (1 - tx) + hc[(y0 + 1) * CG + x0 + 1] * tx) * ty;
  HB[j * W + i] = h;
  const d = dirAt(a, b); let add = 0;
  for (const [f, amp] of DET) add += amp * (N.noise(d[0] * f + 3, d[1] * f, d[2] * f + 5) - 0.5);
  HH[j * W + i] = h + add * border(a, b);
}
log('height');
/* 2. distance to the coast in px (sub-pixel seeds + chamfer), like the main texture does */
const sea = P.sea, INF = 65535, ud = new Uint16Array(W * W).fill(INF);
for (let j = 1; j < W - 1; j++) for (let i = 1; i < W - 1; i++) {
  const k = j * W + i, gx = (HH[k + 1] - HH[k - 1]) / 2, gy = (HH[k + W] - HH[k - W]) / 2, g = Math.max(1e-9, Math.hypot(gx, gy)), dd = Math.abs(HH[k] - sea) / g;
  if (dd < 1.8) ud[k] = Math.round(dd * 16);
}
for (let pass = 0; pass < 2; pass++) {
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = j * W + i; let v = ud[k]; if (i > 0) v = Math.min(v, ud[k - 1] + 16); if (j > 0) { v = Math.min(v, ud[k - W] + 16); if (i > 0) v = Math.min(v, ud[k - W - 1] + 23); if (i < W - 1) v = Math.min(v, ud[k - W + 1] + 23); } ud[k] = v; }
  for (let j = W - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; let v = ud[k]; if (i < W - 1) v = Math.min(v, ud[k + 1] + 16); if (j < W - 1) { v = Math.min(v, ud[k + W] + 16); if (i < W - 1) v = Math.min(v, ud[k + W + 1] + 23); if (i > 0) v = Math.min(v, ud[k + W - 1] + 23); } ud[k] = v; }
}
log('distance field');

/* 3. painterly colour */
const PAL = { ice: ['#f3fbff', '#dff3fb', '#c4e6f5'], desert: ['#f6d77f', '#eec45f', '#e0aa45'], savanna: ['#b9dd5a', '#9fcf4c', '#86be42'], green: ['#73d24f', '#58c244', '#3fa83f'] };
for (const k in PAL) PAL[k] = PAL[k].map(hex);
const SEA = [[0, hex('#5fe3e0')], [0.1, hex('#35b9ee')], [0.3, hex('#2a6fe0')], [0.55, hex('#4b2bb0')], [0.8, hex('#2a0f6a')], [1, hex('#0b0322')]];
const seaCol = dn => { for (let i = 1; i < SEA.length; i++) if (dn <= SEA[i][0]) return mixc(SEA[i - 1][1], SEA[i][1], (dn - SEA[i - 1][0]) / (SEA[i][0] - SEA[i - 1][0])); return SEA[SEA.length - 1][1]; };
const band = (p, t1, t2) => { const m = mixc(p[0], p[1], t1); return mixc(m, p[2], t2); };
const INK = [18, 34, 70], FOAM = [236, 250, 255], SAND = [255, 244, 205];
const px = new Uint8ClampedArray(W * W * 4);
const OW = 16;                                   // ink half-width in px: about 1/3 of the old one (finer line work)
const seg = (px_, py_, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px_ - ax) * dx + (py_ - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px_ - ax - dx * t, py_ - ay - dy * t); };
// a little grass tuft: three curved-ish strokes fanning upward. returns 0..1 coverage at (lx, ly) relative to its root
const tuft = (lx, ly, L, wd) => {
  let dmin = 1e9;
  for (const a of [-0.55, 0, 0.5]) { const ex = Math.sin(a) * L, ey = -Math.cos(a) * L * (a === 0 ? 1 : 0.8); dmin = Math.min(dmin, seg(lx, ly, 0, 0, ex, ey)); }
  return 1 - sm(wd - 0.8, wd + 0.8, dmin);
};
// sea wave crest: small arc
const arc = (lx, ly, R, wd) => { const d = Math.hypot(lx, ly + R * 0.55); return (1 - sm(wd - 0.8, wd + 0.8, Math.abs(d - R))) * (ly < -R * 0.55 + R * 0.72 ? 1 : 0) * (ly < R * 0.2 ? 1 : 0); };
for (let j = 0; j < W; j++) {
  if (j % 256 === 0) log('colour row ' + j);
  for (let i = 0; i < W; i++) {
    const k = j * W + i, a = (i + 0.5) / W * 2 - 1, b = (j + 0.5) / W * 2 - 1, d = dirAt(a, b), ay = Math.abs(d[1]), h = HH[k], hb = HB[k], u_ = ud[k] / 16;
    let col, alpha = 255;
    const fade = sm(0, 0.09, 1 - Math.max(Math.abs(a), Math.abs(b)));
    alpha = Math.round(255 * fade);
    if (h > sea) {
      const t = Math.min(1, Math.max(0, (h - sea) / (P.highest - sea))), t1 = sm(0.28 - 0.01, 0.28 + 0.01, t), t2 = sm(0.6 - 0.01, 0.6 + 0.01, t);
      const ie = P.iceEdge(d[0], d[1], d[2]), de = P.desertEdge(d[0], d[1], d[2]);
      const sIce = sm(ie - 0.004, ie + 0.004, ay), sDes = 1 - sm(de - 0.004, de + 0.004, ay), sSav = 1 - sm(de + 0.1 - 0.004, de + 0.1 + 0.004, ay);
      col = band(PAL.green, t1, t2);
      if (sSav > 0) col = mixc(col, band(PAL.savanna, t1, t2), sSav);
      if (sDes > 0) col = mixc(col, band(PAL.desert, t1, t2), sDes);
      if (sIce > 0) col = mixc(col, band(PAL.ice, t1, t2), sIce);
      // soft painterly mottling at three scales
      const m1 = N.noise(d[0] * 40, d[1] * 40, d[2] * 40), m2 = N.noise(d[0] * 160 + 9, d[1] * 160, d[2] * 160), m3 = N.noise(d[0] * 600 + 4, d[1] * 600, d[2] * 600);
      let sh = 1 + 0.07 * (m1 - 0.5) + 0.05 * (m2 - 0.5) + 0.035 * (m3 - 0.5);
      // contour lines every 0.1 of relative height, wobbly
      const cl = Math.abs(((t * 10) % 1) - 0.5) * 2, cw = Math.abs(((t * 10 + 0.5) % 1) - 0.5) * 2;
      const gx = (HH[Math.min(W * W - 1, k + 1)] - HH[Math.max(0, k - 1)]) / 2, gy = (HH[Math.min(W * W - 1, k + W)] - HH[Math.max(0, k - W)]) / 2, gr = Math.max(1e-9, Math.hypot(gx, gy)) / (P.highest - sea) * 10;
      const cdist = Math.min(((t * 10) % 1), 1 - ((t * 10) % 1)) / gr;      // px to the nearest contour
      sh *= 1 - 0.09 * (1 - sm(0.5, 1.5, cdist)) * (t > 0.03 ? 1 : 0) * sm(10, 26, 1 / gr);
      // grass tufts (savanna / green), dune ripples + pebbles (desert), rock hatch (high ground), snow sparkle (ice)
      const veg = (1 - sDes) * (1 - sIce) * (t < 0.6 ? 1 : 0);
      if (veg > 0.5) {
        const CS = 46, cx = Math.floor(i / CS), cy = Math.floor(j / CS);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const gx_ = cx + ox, gy_ = cy + oy, r = hash(gx_, gy_, 11);
          const dens = sSav > 0.5 ? 0.55 : 0.8; if (r > dens) continue;
          const rx = (gx_ + 0.2 + 0.6 * hash(gx_, gy_, 12)) * CS, ry = (gy_ + 0.9 * hash(gx_, gy_, 13) + 0.1) * CS;
          const c = tuft(i - rx, j - ry, 15 + 9 * hash(gx_, gy_, 14), 1.7);
          if (c > 0) { col = mixc(col, sSav > 0.5 ? [120, 150, 40] : [32, 120, 40], c * 0.75); }
        }
        const FS = 64, fx = Math.floor(i / FS), fy = Math.floor(j / FS);   // flowers
        if (sSav < 0.5) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const gx_ = fx + ox, gy_ = fy + oy; if (hash(gx_, gy_, 21) > 0.16) continue;
          const rx = (gx_ + hash(gx_, gy_, 22)) * FS, ry = (gy_ + hash(gx_, gy_, 23)) * FS, dd = Math.hypot(i - rx, j - ry), pick = hash(gx_, gy_, 24);
          const petal = pick < 0.4 ? [255, 255, 255] : pick < 0.7 ? [255, 140, 190] : [255, 220, 70];
          if (dd < 6.5) { const e = 1 - sm(4.6, 6.5, dd); col = mixc(col, dd < 2.4 ? [200, 120, 20] : petal, e); }
        }
      }
      if (sDes > 0.5) {
        const ph = (d[0] * 80 + d[2] * 50 + m1 * 0.6) * Math.PI * 2;          // flowing dune stripes
        const stripe = 1 - sm(0.9, 0.99, Math.abs(Math.sin(ph))), dm = sm(0.55, 0.7, N.noise(d[0] * 22 + 70, d[1] * 22, d[2] * 22));
        sh *= 1 - 0.07 * stripe * dm;
        const PS = 38, px_ = Math.floor(i / PS), py_ = Math.floor(j / PS);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const gx_ = px_ + ox, gy_ = py_ + oy; if (hash(gx_, gy_, 31) > 0.35) continue;
          const rx = (gx_ + hash(gx_, gy_, 32)) * PS, ry = (gy_ + hash(gx_, gy_, 33)) * PS, dd = Math.hypot((i - rx) / 1.5, j - ry), rr = 2.2 + 2.4 * hash(gx_, gy_, 34);
          if (dd < rr + 1) col = mixc(col, [150, 108, 60], (1 - sm(rr - 0.8, rr + 0.8, dd)) * 0.8);
        }
      }
      if (t > 0.55 && sIce < 0.5) {      // rocky hatching
        const hp = ((i + j) / 11 + m2 * 3) % 1, hatch = (1 - sm(0.06, 0.16, Math.abs(hp - 0.5))) * sm(0.45, 0.62, m1);
        sh *= 1 - 0.18 * hatch * sm(0.55, 0.7, t);
      }
      if (sIce > 0.5) { const SS = 30, sx = Math.floor(i / SS), sy = Math.floor(j / SS); for (let oy = 0; oy <= 0; oy++) { if (hash(sx, sy, 41) < 0.3) { const dd = Math.hypot(i - (sx + hash(sx, sy, 42)) * SS, j - (sy + hash(sx, sy, 43)) * SS); if (dd < 2.2) col = mixc(col, [255, 255, 255], 1 - sm(1, 2.2, dd)); } } }
      col = col.map(c => c * sh);
      // sandy lip + stipple just inside the coast
      const lip = (1 - sm(OW + 2, OW + 34, u_)) * 0.55;
      if (lip > 0) {
        const st = hash(Math.floor(i / 5), Math.floor(j / 5), 51);
        col = mixc(col, SAND, lip * (0.55 + 0.45 * (st > 0.82 ? 0 : 1)));
      }
      var ink = 1 - sm(OW - 1.2, OW + 1.2, u_);
    } else {
      const dnS = P.seaDepth01(hb) ;           // depth from the smooth base height
      const dn0 = dnS * 12, fl = Math.floor(dn0), tt = sm(0.78, 1.0, dn0 - fl);
      col = seaCol(Math.min(1, (fl + tt) / 12));
      // shallows get a lighter turquoise glow near the coast
      col = mixc(col, [120, 236, 226], (1 - sm(OW + 20, OW + 190, u_)) * 0.5);
      const wob = (N.noise(d[0] * 260 + 2, d[1] * 260, d[2] * 260) - 0.5) * 9;
      // three foam rings, thinning outward, with wobble
      let f = 0;
      for (const [r0, wd, op] of [[OW + 14, 7.5, 0.95], [OW + 54, 4.2, 0.6], [OW + 98, 3.2, 0.4], [OW + 148, 2.6, 0.26]]) f = Math.max(f, (1 - sm(wd - 1, wd + 1, Math.abs(u_ + wob * (r0 / 100) - r0))) * op);
      col = mixc(col, FOAM, f);
      // fine wave crests in open water: small white arcs
      if (u_ > 120) {
        const CS = 70, cx = Math.floor(i / CS), cy = Math.floor(j / CS);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const gx_ = cx + ox, gy_ = cy + oy; if (hash(gx_, gy_, 61) > 0.5) continue;
          const rx = (gx_ + hash(gx_, gy_, 62)) * CS, ry = (gy_ + hash(gx_, gy_, 63)) * CS, R = 10 + 10 * hash(gx_, gy_, 64);
          const c = arc(i - rx, j - ry, R, 1.7);
          if (c > 0) col = mixc(col, [200, 235, 255], c * 0.55 * sm(120, 260, u_));
        }
      }
      var ink = 1 - sm(OW - 1.2, OW + 1.2, u_);
    }
    px[k * 4] = col[0] * (1 - ink) + INK[0] * ink; px[k * 4 + 1] = col[1] * (1 - ink) + INK[1] * ink; px[k * 4 + 2] = col[2] * (1 - ink) + INK[2] * ink; px[k * 4 + 3] = alpha;
  }
}
fs.writeFileSync('/tmp/patch.rgba', Buffer.from(px.buffer));
fs.writeFileSync(__dirname + '/patch.json', JSON.stringify({ n, span: SPAN, res: W }));
log('done');
