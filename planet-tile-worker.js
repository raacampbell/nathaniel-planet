/* Draws high-detail ground tiles off the main thread (see planet-tile.js), and the political-map overlay. */
importScripts('planet-gen.js', 'planet-tile.js');
let P = null, N = null, seed = null;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function political(m) {
  const { W, H, GW, GH, ids, cols } = m, Hw = W >> 1, Hh = H >> 1, hs = new Float32Array(Hw * Hh);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < Hw; i++) { const d = P.dirFromUV((i + 0.5) / Hw, (j + 0.5) / Hh); hs[j * Hw + i] = P.heightAt(d[0], d[1], d[2]); }
  // soften the blocky grid: each cell keeps its three strongest countries after a small gaussian blur
  const tops = new Int16Array(GW * GH * 3).fill(-1), topw = new Float32Array(GW * GH * 3), tmp = new Map(), RB = 2;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    tmp.clear();
    for (let dj = -RB; dj <= RB; dj++) { const jj = j + dj; if (jj < 0 || jj >= GH) continue; for (let di = -RB; di <= RB; di++) { const id = ids[jj * GW + (i + di + GW) % GW]; if (id < 0) continue; const w = Math.exp(-(di * di + dj * dj) / 2.2); tmp.set(id, (tmp.get(id) || 0) + w); } }
    const arr = [...tmp].sort((a, b) => b[1] - a[1]), k = (j * GW + i) * 3;
    for (let t = 0; t < 3 && t < arr.length; t++) { tops[k + t] = arr[t][0]; topw[k + t] = arr[t][1]; }
  }
  const out = new Uint8ClampedArray(W * H * 4), acc = new Map();
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    // land? (bilinear height from the half-res grid)
    const fx = (i + 0.5) / W * Hw - 0.5, fy = (j + 0.5) / H * Hh - 0.5, x0 = Math.floor(fx), y0 = Math.max(0, Math.min(Hh - 2, Math.floor(fy))), tx = fx - x0, ty = Math.min(1, Math.max(0, fy - y0));
    const xa = (x0 + Hw) % Hw, xb = (x0 + 1) % Hw;
    const h = (hs[y0 * Hw + xa] * (1 - tx) + hs[y0 * Hw + xb] * tx) * (1 - ty) + (hs[(y0 + 1) * Hw + xa] * (1 - tx) + hs[(y0 + 1) * Hw + xb] * tx) * ty;
    const land = sm(P.sea - 0.0015, P.sea + 0.0015, h);
    if (land <= 0) continue;
    // country membership: bilinear blend of the four surrounding grid cells
    const gx = (i + 0.5) / W * GW - 0.5, gy = (j + 0.5) / H * GH - 0.5, g0 = Math.floor(gx), h0 = Math.max(0, Math.min(GH - 2, Math.floor(gy))), u = gx - g0, v = Math.min(1, Math.max(0, gy - h0));
    acc.clear();
    const add = (ci, cj, w) => { const k = (cj * GW + ((ci + GW) % GW)) * 3; if (w <= 0) return; for (let t = 0; t < 3; t++) { const id = tops[k + t]; if (id < 0) break; acc.set(id, (acc.get(id) || 0) + w * topw[k + t]); } };
    add(g0, h0, (1 - u) * (1 - v)); add(g0 + 1, h0, u * (1 - v)); add(g0, h0 + 1, (1 - u) * v); add(g0 + 1, h0 + 1, u * v);
    let b = -1, bw = 0, sw = 0;
    for (const [id, w] of acc) { if (w > bw) { sw = bw; bw = w; b = id; } else if (w > sw) sw = w; }
    if (b < 0) continue;
    const tot = bw + sw || 1, margin = (bw - sw) / tot;            // 1 deep inside, 0 on the border
    const line = acc.size > 1 ? 1 - sm(0.035, 0.075, margin) : 0, edge = acc.size > 1 ? 1 - sm(0.08, 0.55, margin) : 0;
    const c = cols[b], q = (j * W + i) * 4;
    const a = (0.3 + 0.4 * edge) * (1 - line) + 0.9 * line;
    out[q] = c[0] * (1 - line) + 50 * line; out[q + 1] = c[1] * (1 - line) + 20 * line; out[q + 2] = c[2] * (1 - line) + 70 * line; out[q + 3] = 255 * a * land;
  }
  return out;
}
onmessage = e => {
  const m = e.data;
  if (seed !== m.seed) { seed = m.seed; P = PlanetGen.createPlanet(seed); N = PlanetGen.makeNoise(seed ^ 0x5bd1e995); }
  if (m.type === 'political') { const px = political(m); postMessage({ type: 'political', W: m.W, H: m.H, data: px.buffer }, [px.buffer]); return; }
  const px = PlanetTile.buildTile(P, N, m.n, m.span, m.res);
  postMessage({ res: m.res, data: px.buffer }, [px.buffer]);
};
