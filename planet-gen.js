/* Procedural map for Nathaniel Planet. Pure functions, works in browser and Node. */
(function (root) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoise(seed) {
    function h(x, y, z) {
      let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + seed) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    }
    const fade = t => t * t * (3 - 2 * t);
    function noise(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
      const l = (a, b, t) => a + (b - a) * t;
      return l(
        l(l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
        l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf),
        zf);
    }
    function fbm(x, y, z, oct) {
      let s = 0, a = 1, f = 1, n = 0;
      for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; }
      return s / n;
    }
    return { noise, fbm };
  }

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  const LAND_FRACTION = 0.47;

  function createPlanet(seed) {
    seed = seed | 0;
    const N = makeNoise(seed);
    const off = [seed * 0.0013 % 50, seed * 0.0029 % 50, seed * 0.0007 % 50];

    function rawHeight(x, y, z) {
      // gentle domain warp makes blobby, hand-drawn coastlines
      const wx = N.noise(x * 2.2 + 7, y * 2.2, z * 2.2) - 0.5;
      const wy = N.noise(x * 2.2, y * 2.2 + 13, z * 2.2) - 0.5;
      const wz = N.noise(x * 2.2, y * 2.2, z * 2.2 + 29) - 0.5;
      const k = 0.5;
      let f = N.fbm(x * 1.35 + off[0] + wx * k, y * 1.35 + off[1] + wy * k, z * 1.35 + off[2] + wz * k, 5);
      f += 0.24 * smooth(0.82, 0.98, Math.abs(y)); // continents at the poles
      // fine octaves: bays, capes and little coves (small amplitude, the big shapes stay put)
      f += 0.05 * (N.noise(x * 11 + 3, y * 11, z * 11 + 5) - 0.5) + 0.022 * (N.noise(x * 26, y * 26 + 9, z * 26 + 2) - 0.5);
      return f;
    }

    // Pick the sea level so land covers a fixed fraction of the planet
    const rnd = mulberry32(seed ^ 0x9e3779b9);
    const samples = [];
    for (let i = 0; i < 24000; i++) {
      const z = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      samples.push(rawHeight(r * Math.cos(t), z, r * Math.sin(t)));
    }
    samples.sort((a, b) => a - b);
    const sea = samples[Math.floor(samples.length * (1 - LAND_FRACTION))];
    const lowest = samples[Math.floor(samples.length * 0.01)];
    const highest = samples[Math.floor(samples.length * 0.995)];

    const heightAt = (x, y, z) => rawHeight(x, y, z);
    const isLandH = h => h > sea;

    function iceEdge(x, y, z) { return 0.77 + 0.05 * (N.noise(x * 3 + 40, y * 3, z * 3) - 0.5) * 2; }
    function desertEdge(x, y, z) { return 0.30 + 0.10 * (N.noise(x * 2.5, y * 2.5 + 60, z * 2.5) - 0.5) * 2; }

    // 'ice' | 'desert' | 'savanna' | 'green'
    function biomeAt(x, y, z) {
      const ay = Math.abs(y);
      if (ay > iceEdge(x, y, z)) return 'ice';
      const de = desertEdge(x, y, z);
      if (ay < de) return 'desert';
      if (ay < de + 0.10) return 'savanna';
      return 'green';
    }

    const PAL = {
      ice: ['#f3fbff', '#dff3fb', '#c4e6f5'],
      desert: ['#f6d77f', '#eec45f', '#e0aa45'],
      savanna: ['#b9dd5a', '#9fcf4c', '#86be42'],
      green: ['#73d24f', '#58c244', '#3fa83f'],
    };
    for (const k in PAL) PAL[k] = PAL[k].map(hex);
    const SEA_STOPS = [
      [0.00, hex('#5fe3e0')], [0.10, hex('#35b9ee')], [0.30, hex('#2a6fe0')],
      [0.55, hex('#4b2bb0')], [0.80, hex('#2a0f6a')], [1.00, hex('#0b0322')],
    ];
    function seaColor(dn) {
      for (let i = 1; i < SEA_STOPS.length; i++) {
        if (dn <= SEA_STOPS[i][0]) {
          const [a, ca] = SEA_STOPS[i - 1], [b, cb] = SEA_STOPS[i];
          return mix(ca, cb, (dn - a) / (b - a));
        }
      }
      return SEA_STOPS[SEA_STOPS.length - 1][1];
    }
    const seaDepth01 = h => Math.pow(clamp01((sea - h) / (sea - lowest)), 0.6);

    function dirFromUV(u, v) { // matches THREE.SphereGeometry
      const phi = u * Math.PI * 2, th = v * Math.PI;
      return [-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th)];
    }

    /* Cartoon surface texture.
       The height field is evaluated on a coarse grid (it is smooth) and bilinearly upsampled, then
       coastlines are anti-aliased with a distance field: smooth ink outline, foam and ripple bands.
       Also returns `mask`: 255 on open water where animated waves may be drawn. */
    function buildTexture(W, H) {
      const Bw = Math.min(W, 2048), Bh = Bw >> 1, S = W / Bw, K = W / 2048;
      const sm = smooth;
      // trig tables
      const cB = new Float32Array(Bw), sB = new Float32Array(Bw), cTB = new Float32Array(Bh), sTB = new Float32Array(Bh);
      for (let i = 0; i < Bw; i++) { const p = (i + 0.5) / Bw * Math.PI * 2; cB[i] = Math.cos(p); sB[i] = Math.sin(p); }
      for (let j = 0; j < Bh; j++) { const t = (j + 0.5) / Bh * Math.PI; cTB[j] = Math.cos(t); sTB[j] = Math.sin(t); }
      const hB = new Float32Array(Bw * Bh);
      for (let j = 0; j < Bh; j++) for (let i = 0; i < Bw; i++)
        hB[j * Bw + i] = rawHeight(-cB[i] * sTB[j], cTB[j], sB[i] * sTB[j]);
      // a softened copy of the height field for sea depth (keeps the deep-water bands calm)
      const hS = new Float32Array(Bw * Bh), tmpS = new Float32Array(Bw * Bh), RB = 3;
      for (let j = 0; j < Bh; j++) for (let i = 0; i < Bw; i++) { let a = 0; for (let d = -RB; d <= RB; d++) a += hB[j * Bw + (i + d + Bw) % Bw]; tmpS[j * Bw + i] = a / (2 * RB + 1); }
      for (let j = 0; j < Bh; j++) for (let i = 0; i < Bw; i++) { let a = 0; for (let d = -RB; d <= RB; d++) a += tmpS[Math.min(Bh - 1, Math.max(0, j + d)) * Bw + i]; hS[j * Bw + i] = a / (2 * RB + 1); }
      // smooth biome edges on a tiny grid
      const Ew = 512, Eh = 256, iceG = new Float32Array(Ew * Eh), desG = new Float32Array(Ew * Eh);
      for (let j = 0; j < Eh; j++) for (let i = 0; i < Ew; i++) {
        const p = (i + 0.5) / Ew * Math.PI * 2, t = (j + 0.5) / Eh * Math.PI;
        const x = -Math.cos(p) * Math.sin(t), y = Math.cos(t), z = Math.sin(p) * Math.sin(t);
        iceG[j * Ew + i] = iceEdge(x, y, z); desG[j * Ew + i] = desertEdge(x, y, z);
      }
      const edge = (G, i, j) => {   // bilinear lookup from the tiny grid at hi-res pixel (i, j)
        const fx = (i + 0.5) / W * Ew - 0.5, fy = (j + 0.5) / H * Eh - 0.5;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        const xa = (x0 + Ew) % Ew, xb = (x0 + 1 + Ew) % Ew, ya = Math.min(Eh - 1, Math.max(0, y0)), yb = Math.min(Eh - 1, Math.max(0, y0 + 1));
        return (G[ya * Ew + xa] * (1 - tx) + G[ya * Ew + xb] * tx) * (1 - ty) + (G[yb * Ew + xa] * (1 - tx) + G[yb * Ew + xb] * tx) * ty;
      };
      const out = { h: 0, g: 0, t: 0 };
      const hAt = (i, j, A) => {    // height + gradient (per hi-res pixel) at hi-res pixel
        A = A || hB;
        const fx = (i + 0.5) / S - 0.5, fy = (j + 0.5) / S - 0.5;
        const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
        const xa = (x0 + Bw) % Bw, xb = (x0 + 1 + Bw) % Bw, ya = Math.min(Bh - 1, Math.max(0, y0)), yb = Math.min(Bh - 1, Math.max(0, y0 + 1));
        const h00 = A[ya * Bw + xa], h10 = A[ya * Bw + xb], h01 = A[yb * Bw + xa], h11 = A[yb * Bw + xb];
        out.h = (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
        const gx = ((h10 - h00) * (1 - ty) + (h11 - h01) * ty) / S, gy = ((h01 - h00) * (1 - tx) + (h11 - h10) * tx) / S;
        out.g = Math.max(1e-6, Math.hypot(gx, gy));
      };
      // pass 1: distance-to-coast seeds (sub-pixel), then a chamfer sweep. Fixed point, 1/16 px.
      const INF = 65535, ud = new Uint16Array(W * H).fill(INF), land = new Uint8Array(W * H);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        hAt(i, j); const k = j * W + i, d = Math.abs(out.h - sea) / out.g;
        land[k] = out.h > sea ? 1 : 0;
        if (d < 1.8) ud[k] = Math.round(d * 16);
      }
      const relax = (k, v) => { if (v < ud[k]) ud[k] = v; };
      for (let pass = 0; pass < 2; pass++) {
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
          const k = j * W + i, l = j * W + (i + W - 1) % W; let v = ud[k];
          v = Math.min(v, ud[l] + 16);
          if (j > 0) { const u = k - W; v = Math.min(v, ud[u] + 16, ud[j * W - W + (i + W - 1) % W] + 23, ud[j * W - W + (i + 1) % W] + 23); }
          ud[k] = Math.min(v, INF);
        }
        for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {
          const k = j * W + i, r = j * W + (i + 1) % W; let v = ud[k];
          v = Math.min(v, ud[r] + 16);
          if (j < H - 1) { const d = k + W; v = Math.min(v, ud[d] + 16, ud[(j + 1) * W + (i + W - 1) % W] + 23, ud[(j + 1) * W + (i + 1) % W] + 23); }
          ud[k] = Math.min(v, INF);
        }
      }
      // pass 2: colour
      const lut = []; for (let q = 0; q <= 1000; q++) lut.push(seaColor(q / 1000));
      const INK = [18, 34, 70], FOAM = [236, 250, 255], ICESEA = hex('#e6f6ff');
      const rel = h => clamp01((h - sea) / (highest - sea));
      const cp = new Float32Array(W), sp = new Float32Array(W), ct = new Float32Array(H), st = new Float32Array(H);
      for (let i = 0; i < W; i++) { const p = (i + 0.5) / W * Math.PI * 2; cp[i] = Math.cos(p); sp[i] = Math.sin(p); }
      for (let j = 0; j < H; j++) { const t = (j + 0.5) / H * Math.PI; ct[j] = Math.cos(t); st[j] = Math.sin(t); }
      const px = new Uint8ClampedArray(W * H * 4), mask = new Uint8Array(W * H);
      const bandA = [0, 0, 0], bandB = [0, 0, 0], col = [0, 0, 0];
      const bandMix = (p, t1, t2, o) => { for (let q = 0; q < 3; q++) { const m = p[0][q] + (p[1][q] - p[0][q]) * t1; o[q] = m + (p[2][q] - m) * t2; } };
      const OW = 2.3 * K;           // outline half width in px
      for (let j = 0; j < H; j++) {
        const y = ct[j], ay = Math.abs(y);
        for (let i = 0; i < W; i++) {
          const k = j * W + i, u = ud[k] / 16;
          hAt(i, j);
          const h = out.h, isLand = h > sea;
          let a = 255;
          if (isLand) {
            const t = rel(h), t1 = sm(0.28 - 0.014, 0.28 + 0.014, t), t2 = sm(0.6 - 0.014, 0.6 + 0.014, t);
            const ie = edge(iceG, i, j), de = edge(desG, i, j);
            const sIce = sm(ie - 0.004, ie + 0.004, ay), sDes = 1 - sm(de - 0.004, de + 0.004, ay), sSav = 1 - sm(de + 0.1 - 0.004, de + 0.1 + 0.004, ay);
            bandMix(PAL.green, t1, t2, col);
            if (sSav > 0) { bandMix(PAL.savanna, t1, t2, bandA); for (let q = 0; q < 3; q++) col[q] += (bandA[q] - col[q]) * sSav; }
            if (sDes > 0) { bandMix(PAL.desert, t1, t2, bandB); for (let q = 0; q < 3; q++) col[q] += (bandB[q] - col[q]) * sDes; }
            if (sIce > 0) { bandMix(PAL.ice, t1, t2, bandA); for (let q = 0; q < 3; q++) col[q] += (bandA[q] - col[q]) * sIce; }
            // painterly detail: tufts / dunes / snow drifts, plus a faint contour line where the height bands meet
            const sx = -cp[i] * st[j], sz = sp[i] * st[j];
            const n1 = N.noise(sx * 85 + 11, y * 85, sz * 85);
            const tuft = sm(0.6, 0.64, n1) * (1 - sIce);
            const dune = sDes > 0.5 ? (0.5 + 0.5 * Math.sin((n1 * 1.4 + sx * 30 + y * 18) * 9)) * 0.028 : 0;
            const shade = 1 - 0.07 * tuft - dune + 0.03 * (n1 - 0.5);
            const cl = Math.min(Math.abs(t - 0.28), Math.abs(t - 0.6)) * (highest - sea) / out.g;   // px from the contour
            const line = (1 - sm(0.6 * K, 1.6 * K, cl)) * 0.16;
            // sandy lip just inside the coast
            const lip = (1 - sm(OW + 1.0 * K, OW + 5 * K, u)) * 0.13;
            for (let q = 0; q < 3; q++) col[q] = col[q] * shade * (1 - line) + 255 * lip;
          } else {
            hAt(i, j, hS);
            const dn0 = seaDepth01(out.h) * 12, fl = Math.floor(dn0), tt = sm(0.78, 1.0, dn0 - fl);
            const c = lut[Math.min(1000, Math.round((fl + tt) / 12 * 1000))];
            col[0] = c[0]; col[1] = c[1]; col[2] = c[2];
            const ie = edge(iceG, i, j);
            const sIceSea = sm(ie + 0.13 - 0.004, ie + 0.13 + 0.004, ay);
            const open = 1 - sIceSea;
            // foam collar and a fainter ripple ring further out
            const foam = (1 - sm(OW + 5.5 * K, OW + 6.8 * K, u)) * 0.86;
            const ring = Math.max(0, 1 - Math.abs(u - (OW + 11 * K)) / (1.1 * K)) * 0.38;
            const f = Math.max(foam, ring) * open;
            for (let q = 0; q < 3; q++) col[q] = col[q] * (1 - f) + FOAM[q] * f;
            for (let q = 0; q < 3; q++) col[q] = col[q] * (1 - sIceSea) + ICESEA[q] * sIceSea;
            mask[k] = open > 0.99 ? Math.round(sm(OW + 14 * K, OW + 24 * K, u) * 255) : 0;
          }
          // ink outline, anti-aliased
          const ink = 1 - sm(OW - 0.7 * K, OW + 0.7 * K, u);
          px[k * 4] = col[0] * (1 - ink) + INK[0] * ink;
          px[k * 4 + 1] = col[1] * (1 - ink) + INK[1] * ink;
          px[k * 4 + 2] = col[2] * (1 - ink) + INK[2] * ink;
          px[k * 4 + 3] = a;
        }
      }
      return { width: W, height: H, data: px, mask };
    }

    function randomDir(rng) {
      const z = rng() * 2 - 1, t = rng() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      return [r * Math.cos(t), z, r * Math.sin(t)];
    }

    return {
      seed, sea, lowest, highest,
      heightAt, biomeAt, dirFromUV, buildTexture, randomDir, seaDepth01, iceEdge, desertEdge,
      isLand(d) { return heightAt(d[0], d[1], d[2]) > sea; },
      relHeight(d) { return clamp01((heightAt(d[0], d[1], d[2]) - sea) / (highest - sea)); },
      depth(d) { return seaDepth01(heightAt(d[0], d[1], d[2])); },
      biome(d) { return biomeAt(d[0], d[1], d[2]); },
    };
  }

  const api = { createPlanet, mulberry32, makeNoise };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlanetGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
