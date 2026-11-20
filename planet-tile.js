/* High-detail ground tiles for Nathaniel Planet. Pure functions: works in a worker and in Node.
   buildTile(P, N, n, span, res) renders a res x res RGBA picture of the ground around direction n (unit vector),
   `span` radians wide, as seen through a gnomonic (flat) projection. Everything that depends on the world (coast
   wiggles, noise, grass tuft positions) is a function of world direction only, so neighbouring tiles and different
   resolutions agree with each other. Open sea far from land is left transparent so the animated waves show through. */
(function (root) {
  'use strict';
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hash = (x, y, s) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nz = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const PAL = { ice: ['#f3fbff', '#dff3fb', '#c4e6f5'], desert: ['#f6d77f', '#eec45f', '#e0aa45'], savanna: ['#b9dd5a', '#9fcf4c', '#86be42'], green: ['#73d24f', '#58c244', '#3fa83f'] };
  for (const k in PAL) PAL[k] = PAL[k].map(hex);
  const SEA = [[0, hex('#5fe3e0')], [0.1, hex('#35b9ee')], [0.3, hex('#2a6fe0')], [0.55, hex('#4b2bb0')], [0.8, hex('#2a0f6a')], [1, hex('#0b0322')]];
  const seaCol = dn => { for (let i = 1; i < SEA.length; i++) if (dn <= SEA[i][0]) return mixc(SEA[i - 1][1], SEA[i][1], (dn - SEA[i - 1][0]) / (SEA[i][0] - SEA[i - 1][0])); return SEA[SEA.length - 1][1]; };
  const band = (p, t1, t2) => mixc(mixc(p[0], p[1], t1), p[2], t2);
  const INK = [18, 34, 70], FOAM = [236, 250, 255], SAND = [255, 244, 205];
  const DET = [[40, 0.006], [90, 0.0042], [200, 0.0024], [450, 0.0012], [1000, 0.0006]];

  function buildTile(P, N, n, span, res) {
    const W = res, pr = res / span, s = pr / 4096, s2 = Math.max(0.7, s);        // px per rad; scale relative to the prototype
    let u = nz(cr(n, [0, 1, 0])); const w = cr(n, u); const Hh = Math.tan(span / 2);
    const dirAt = (a, b) => nz([n[0] + (a * u[0] + b * w[0]) * Hh, n[1] + (a * u[1] + b * w[1]) * Hh, n[2] + (a * u[2] + b * w[2]) * Hh]);
    // 1. heights: coarse grid (smooth), bilinear, plus fine octaves that live in world space
    const CG = 129, hc = new Float32Array(CG * CG);
    for (let j = 0; j < CG; j++) for (let i = 0; i < CG; i++) { const d = dirAt(i / (CG - 1) * 2 - 1, j / (CG - 1) * 2 - 1); hc[j * CG + i] = P.heightAt(d[0], d[1], d[2]); }
    const HH = new Float32Array(W * W), HB = new Float32Array(W * W);
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const fx = (i + 0.5) / W * (CG - 1), fy = (j + 0.5) / W * (CG - 1), x0 = Math.min(CG - 2, Math.floor(fx)), y0 = Math.min(CG - 2, Math.floor(fy)), tx = fx - x0, ty = fy - y0;
      const h = (hc[y0 * CG + x0] * (1 - tx) + hc[y0 * CG + x0 + 1] * tx) * (1 - ty) + (hc[(y0 + 1) * CG + x0] * (1 - tx) + hc[(y0 + 1) * CG + x0 + 1] * tx) * ty;
      HB[j * W + i] = h;
      const d = dirAt((i + 0.5) / W * 2 - 1, (j + 0.5) / W * 2 - 1); let add = 0;
      for (const [f, amp] of DET) add += amp * (N.noise(d[0] * f + 3, d[1] * f, d[2] * f + 5) - 0.5);
      HH[j * W + i] = h + add;
    }
    // 2. distance to the coast in px
    const sea = P.sea, INF = 65535, ud = new Uint16Array(W * W).fill(INF);
    for (let j = 1; j < W - 1; j++) for (let i = 1; i < W - 1; i++) {
      const k = j * W + i, gx = (HH[k + 1] - HH[k - 1]) / 2, gy = (HH[k + W] - HH[k - W]) / 2, g = Math.max(1e-9, Math.hypot(gx, gy)), dd = Math.abs(HH[k] - sea) / g;
      if (dd < 1.8) ud[k] = Math.round(dd * 16);
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = j * W + i; let v = ud[k]; if (i > 0) v = Math.min(v, ud[k - 1] + 16); if (j > 0) { v = Math.min(v, ud[k - W] + 16); if (i > 0) v = Math.min(v, ud[k - W - 1] + 23); if (i < W - 1) v = Math.min(v, ud[k - W + 1] + 23); } ud[k] = v; }
      for (let j = W - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; let v = ud[k]; if (i < W - 1) v = Math.min(v, ud[k + 1] + 16); if (j < W - 1) { v = Math.min(v, ud[k + W] + 16); if (i < W - 1) v = Math.min(v, ud[k + W + 1] + 23); if (i > 0) v = Math.min(v, ud[k + W - 1] + 23); } ud[k] = v; }
    }
    // 3. base colour
    const px = new Uint8ClampedArray(W * W * 4), OW = Math.max(4, 16 * s), range = P.highest - sea;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i, a = (i + 0.5) / W * 2 - 1, b = (j + 0.5) / W * 2 - 1, d = dirAt(a, b), ay = Math.abs(d[1]), h = HH[k], hb = HB[k], u_ = ud[k] / 16;
      let col, alpha = Math.round(255 * sm(0, 0.1, 1 - Math.max(Math.abs(a), Math.abs(b)))), ink;
      if (h > sea) {
        const t = Math.min(1, Math.max(0, (h - sea) / range)), t1 = sm(0.27, 0.29, t), t2 = sm(0.59, 0.61, t);
        const ie = P.iceEdge(d[0], d[1], d[2]), de = P.desertEdge(d[0], d[1], d[2]);
        const sIce = sm(ie - 0.004, ie + 0.004, ay), sDes = 1 - sm(de - 0.004, de + 0.004, ay), sSav = 1 - sm(de + 0.096, de + 0.104, ay);
        col = band(PAL.green, t1, t2);
        if (sSav > 0) col = mixc(col, band(PAL.savanna, t1, t2), sSav);
        if (sDes > 0) col = mixc(col, band(PAL.desert, t1, t2), sDes);
        if (sIce > 0) col = mixc(col, band(PAL.ice, t1, t2), sIce);
        const m1 = N.noise(d[0] * 40, d[1] * 40, d[2] * 40), m2 = N.noise(d[0] * 160 + 9, d[1] * 160, d[2] * 160), m3 = N.noise(d[0] * 600 + 4, d[1] * 600, d[2] * 600);
        let sh = 1 + 0.07 * (m1 - 0.5) + 0.05 * (m2 - 0.5) + 0.035 * (m3 - 0.5);
        const gx = (HH[Math.min(W * W - 1, k + 1)] - HH[Math.max(0, k - 1)]) / 2, gy = (HH[Math.min(W * W - 1, k + W)] - HH[Math.max(0, k - W)]) / 2, gr = Math.max(1e-9, Math.hypot(gx, gy)) / range * 10;
        const cdist = Math.min((t * 10) % 1, 1 - (t * 10) % 1) / gr;
        sh *= 1 - 0.09 * (1 - sm(0.5 * s2, 1.5 * s2, cdist)) * (t > 0.03 ? 1 : 0) * sm(10 * s, 26 * s, 1 / gr);
        if (sDes > 0.5) {
          const ph = (d[0] * 80 + d[2] * 50 + m1 * 0.6) * Math.PI * 2, stripe = 1 - sm(0.9, 0.99, Math.abs(Math.sin(ph))), dm = sm(0.55, 0.7, N.noise(d[0] * 22 + 70, d[1] * 22, d[2] * 22));
          sh *= 1 - 0.07 * stripe * dm;
        }
        if (t > 0.55 && sIce < 0.5) {
          const hp = ((i + j) / Math.max(4, 11 * s) + m2 * 3) % 1, hatch = (1 - sm(0.06, 0.16, Math.abs(hp - 0.5))) * sm(0.45, 0.62, m1);
          sh *= 1 - 0.18 * hatch * sm(0.55, 0.7, t);
        }
        col = col.map(c => c * sh);
        const lip = (1 - sm(OW + 2 * s, OW + 34 * s, u_)) * 0.55;
        if (lip > 0) col = mixc(col, SAND, lip * (N.noise(d[0] * 1400, d[1] * 1400, d[2] * 1400) > 0.8 ? 0.55 : 1));
        ink = 1 - sm(OW - 1.2, OW + 1.2, u_);
      } else {
        const dn0 = P.seaDepth01(hb) * 12, fl = Math.floor(dn0), tt = sm(0.78, 1.0, dn0 - fl);
        col = seaCol(Math.min(1, (fl + tt) / 12));
        col = mixc(col, [120, 236, 226], (1 - sm(OW + 20 * s, OW + 190 * s, u_)) * 0.5);
        const wob = (N.noise(d[0] * 260 + 2, d[1] * 260, d[2] * 260) - 0.5) * 9 * s;
        let f = 0;
        for (const [r0, wd, op] of [[14, 7.5, 0.95], [54, 4.2, 0.6], [98, 3.2, 0.4], [148, 2.6, 0.26]])
          f = Math.max(f, (1 - sm(Math.max(1.1, wd * s) - 1, Math.max(1.1, wd * s) + 1, Math.abs(u_ + wob * (r0 / 100) - (OW + r0 * s)))) * op);
        col = mixc(col, FOAM, f);
        ink = 1 - sm(OW - 1.2, OW + 1.2, u_);
        alpha = Math.round(alpha * (1 - sm(215 * s, 330 * s, u_)));        // far from the coast: let the animated base waves show
      }
      px[k * 4] = col[0] * (1 - ink) + INK[0] * ink; px[k * 4 + 1] = col[1] * (1 - ink) + INK[1] * ink; px[k * 4 + 2] = col[2] * (1 - ink) + INK[2] * ink; px[k * 4 + 3] = alpha;
    }
    // 4. hand-drawn marks (grass tufts, flowers, pebbles, snow sparkle): world-anchored cells, splatted into the picture
    const bl = (x, y, c, a) => { if (a <= 0 || x < 0 || y < 0 || x >= W || y >= W) return; const q = (y * W + x) * 4, A = a > 1 ? 1 : a; px[q] += (c[0] - px[q]) * A; px[q + 1] += (c[1] - px[q + 1]) * A; px[q + 2] += (c[2] - px[q + 2]) * A; };
    const segd = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
    let latMin = 9, latMax = -9, lonMin = 9, lonMax = -9; const lon0 = Math.atan2(n[2], n[0]), wrap = x => { while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; };
    for (let q = 0; q <= 16; q++) for (const [a, b] of [[-1, q / 8 - 1], [1, q / 8 - 1], [q / 8 - 1, -1], [q / 8 - 1, 1]]) {
      const d = dirAt(a, b), lat = Math.asin(d[1]), lon = wrap(Math.atan2(d[2], d[0]) - lon0);
      latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat); lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
    }
    const polar = latMax > 1.45 || latMin < -1.45;
    const eachCell = (dl, seed, prob, fn) => {
      for (let iy = Math.floor(latMin / dl); iy <= Math.floor(latMax / dl); iy++) {
        const latc = (iy + 0.5) * dl; if (Math.abs(latc) > 1.2) continue;
        const dlon = dl / Math.max(0.25, Math.cos(latc)), a0 = polar ? 0 : lon0 + lonMin, a1 = polar ? Math.PI * 2 : lon0 + lonMax;
        for (let ix = Math.floor(a0 / dlon) - 1; ix <= Math.floor(a1 / dlon) + 1; ix++) {
          if (hash(ix, iy, seed) > prob) continue;
          const lat = (iy + 0.15 + 0.7 * hash(ix, iy, seed + 1)) * dl, lon = (ix + 0.15 + 0.7 * hash(ix, iy, seed + 2)) * dlon, cl = Math.cos(lat);
          const r = [cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon)], dn = r[0] * n[0] + r[1] * n[1] + r[2] * n[2]; if (dn < 0.5) continue;
          const a = (r[0] * u[0] + r[1] * u[1] + r[2] * u[2]) / dn / Hh, b = (r[0] * w[0] + r[1] * w[1] + r[2] * w[2]) / dn / Hh;
          const x = (a + 1) / 2 * W, y = (b + 1) / 2 * W; if (x < -40 || y < -40 || x > W + 40 || y > W + 40) continue;
          const xi = Math.min(W - 1, Math.max(0, Math.round(x))), yi = Math.min(W - 1, Math.max(0, Math.round(y))), k = yi * W + xi;
          const north = nz([-r[0] * r[1], 1 - r[1] * r[1], -r[2] * r[1]]);                    // local "up" for drawings: toward the north pole
          fn(ix, iy, r, x, y, k, [north[0] * u[0] + north[1] * u[1] + north[2] * u[2], north[0] * w[0] + north[1] * w[1] + north[2] * w[2]]);
        }
      }
    };
    const landAt = (k, minU) => HH[k] > sea && ud[k] / 16 > minU;
    const wd = Math.max(1.15, 1.7 * s);
    eachCell(0.0112, 11, 0.85, (ix, iy, r, x, y, k, up) => {         // grass tufts
      if (!landAt(k, OW + 14 * s)) return;
      const t = (HH[k] - sea) / range, ay = Math.abs(r[1]), ie = P.iceEdge(r[0], r[1], r[2]), de = P.desertEdge(r[0], r[1], r[2]);
      if (t > 0.6 || ay > ie - 0.01 || ay < de - 0.01) return;
      const sav = ay < de + 0.1; if (hash(ix, iy, 15) > (sav ? 0.65 : 0.95)) return;
      const L = (15 + 9 * hash(ix, iy, 14)) * s, col = sav ? [120, 150, 40] : [32, 120, 40], ul = Math.hypot(up[0], up[1]) || 1, ux = up[0] / ul, uy = up[1] / ul;
      const ends = [-0.55, 0, 0.5].map(an => { const c = Math.cos(an), sn = Math.sin(an), l = L * (an === 0 ? 1 : 0.8); return [x + (ux * c - uy * sn) * l, y + (uy * c + ux * sn) * l]; });
      const x0 = Math.floor(Math.min(x, ...ends.map(e => e[0])) - 3), x1 = Math.ceil(Math.max(x, ...ends.map(e => e[0])) + 3), y0 = Math.floor(Math.min(y, ...ends.map(e => e[1])) - 3), y1 = Math.ceil(Math.max(y, ...ends.map(e => e[1])) + 3);
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
        let dm = 1e9; for (const e of ends) dm = Math.min(dm, segd(xx, yy, x, y, e[0], e[1]));
        bl(xx, yy, col, (1 - sm(wd - 0.8, wd + 0.8, dm)) * 0.75);
      }
    });
    eachCell(0.0156, 21, 0.16, (ix, iy, r, x, y, k) => {             // flowers
      if (!landAt(k, OW + 14 * s)) return;
      const t = (HH[k] - sea) / range, ay = Math.abs(r[1]), de = P.desertEdge(r[0], r[1], r[2]), ie = P.iceEdge(r[0], r[1], r[2]);
      if (t > 0.5 || ay > ie - 0.01 || ay < de + 0.1) return;
      const pk = hash(ix, iy, 24), petal = pk < 0.4 ? [255, 255, 255] : pk < 0.7 ? [255, 140, 190] : [255, 220, 70], R = Math.max(2.4, 6.5 * s);
      for (let yy = Math.floor(y - R - 1); yy <= y + R + 1; yy++) for (let xx = Math.floor(x - R - 1); xx <= x + R + 1; xx++) {
        const dd = Math.hypot(xx - x, yy - y); if (dd < R) bl(xx, yy, dd < R * 0.37 ? [200, 120, 20] : petal, 1 - sm(R * 0.7, R, dd));
      }
    });
    eachCell(0.0093, 31, 0.35, (ix, iy, r, x, y, k) => {             // desert pebbles
      if (!landAt(k, OW + 14 * s)) return;
      const ay = Math.abs(r[1]), de = P.desertEdge(r[0], r[1], r[2]); if (ay > de - 0.01 || (HH[k] - sea) / range > 0.5) return;
      const rr = Math.max(1.4, (2.2 + 2.4 * hash(ix, iy, 34)) * s);
      for (let yy = Math.floor(y - rr - 1); yy <= y + rr + 1; yy++) for (let xx = Math.floor(x - rr * 1.6 - 1); xx <= x + rr * 1.6 + 1; xx++) {
        const dd = Math.hypot((xx - x) / 1.5, yy - y); if (dd < rr + 1) bl(xx, yy, [150, 108, 60], (1 - sm(rr - 0.8, rr + 0.8, dd)) * 0.8);
      }
    });
    eachCell(0.0073, 41, 0.3, (ix, iy, r, x, y, k) => {              // snow sparkle
      if (!landAt(k, OW + 8 * s) || Math.abs(r[1]) < P.iceEdge(r[0], r[1], r[2]) + 0.004) return;
      const R = Math.max(1.6, 2.2 * s);
      for (let yy = Math.floor(y - R - 1); yy <= y + R + 1; yy++) for (let xx = Math.floor(x - R - 1); xx <= x + R + 1; xx++) { const dd = Math.hypot(xx - x, yy - y); if (dd < R) bl(xx, yy, [255, 255, 255], 1 - sm(R * 0.45, R, dd)); }
    });
    return px;
  }
  const api = { buildTile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlanetTile = api;
})(typeof window !== 'undefined' ? window : globalThis);
