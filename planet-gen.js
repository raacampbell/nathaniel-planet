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

  const LAND_FRACTION = 0.34;

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

    function buildTexture(W, H) {
      const hf = new Float32Array(W * H);
      const land = new Uint8Array(W * H);
      const px = new Uint8ClampedArray(W * H * 4);
      const bio = new Uint8Array(W * H); // 1 = ice
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const d = dirFromUV((i + 0.5) / W, (j + 0.5) / H);
          const k = j * W + i;
          const h = rawHeight(d[0], d[1], d[2]);
          hf[k] = h;
          land[k] = h > sea ? 1 : 0;
        }
      }
      const rel = (h) => clamp01((h - sea) / (highest - sea));
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const k = j * W + i;
          const d = dirFromUV((i + 0.5) / W, (j + 0.5) / H);
          let c;
          if (land[k]) {
            const b = biomeAt(d[0], d[1], d[2]);
            const t = rel(hf[k]);
            const band = t < 0.28 ? 0 : t < 0.6 ? 1 : 2;
            c = PAL[b][band];
            if (b === 'ice') bio[k] = 1;
          } else {
            const ay = Math.abs(d[1]);
            if (ay > iceEdge(d[0], d[1], d[2]) + 0.13) {
              c = hex('#e6f6ff'); bio[k] = 1; // frozen polar sea
            } else {
              const dn = Math.floor(seaDepth01(hf[k]) * 8) / 8;
              c = seaColor(dn);
            }
          }
          px[k * 4] = c[0]; px[k * 4 + 1] = c[1]; px[k * 4 + 2] = c[2]; px[k * 4 + 3] = 255;
        }
      }
      // cartoon coast: dark outline + pale foam on the sea side
      const at = (x, y) => land[((y + H) % H) * W + ((x + W) % W)];
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const k = j * W + i, me = land[k];
          let near2 = false, near6 = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
            if (at(i + dx * 2, j + dy * 2) !== me) near2 = true;
            if (!me && at(i + dx * 6, j + dy * 6) !== me) near6 = true;
          }
          if (near2) {
            px[k * 4] = 18; px[k * 4 + 1] = 34; px[k * 4 + 2] = 70;
          } else if (near6 && !bio[k]) {
            px[k * 4] = px[k * 4] * 0.45 + 255 * 0.55;
            px[k * 4 + 1] = px[k * 4 + 1] * 0.45 + 255 * 0.55;
            px[k * 4 + 2] = px[k * 4 + 2] * 0.45 + 255 * 0.55;
          }
        }
      }
      return { width: W, height: H, data: px };
    }

    function randomDir(rng) {
      const z = rng() * 2 - 1, t = rng() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      return [r * Math.cos(t), z, r * Math.sin(t)];
    }

    return {
      seed, sea, lowest, highest,
      heightAt, biomeAt, dirFromUV, buildTexture, randomDir, seaDepth01,
      isLand(d) { return heightAt(d[0], d[1], d[2]) > sea; },
      relHeight(d) { return clamp01((heightAt(d[0], d[1], d[2]) - sea) / (highest - sea)); },
      depth(d) { return seaDepth01(heightAt(d[0], d[1], d[2])); },
      biome(d) { return biomeAt(d[0], d[1], d[2]); },
    };
  }

  const api = { createPlanet, mulberry32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlanetGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
