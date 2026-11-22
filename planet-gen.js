/* Procedural map for Nathaniel Planet. Pure functions, works in browser and Node. */
(function (root) {
  'use strict';

  /* Small seeded random number generator (mulberry32). Returns a function that gives
     a new number between 0 and 1 each time it is called; the same seed gives the same sequence. */
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Builds smooth 3D value noise for a seed. Returns { noise, fbm }:
     noise(x, y, z) is a single smooth layer of noise between 0 and 1, and
     fbm(x, y, z, octaves) stacks several layers of finer and finer detail on top of each other. */
  function makeNoise(seed) {
    // A repeatable pseudo-random value (0..1) for each whole-number grid corner.
    function cornerValue(ix, iy, iz) {
      let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1274126177) + seed) | 0;
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    }

    // Eases a 0..1 fraction so blending between corners has no visible grid lines.
    const fade = t => t * t * (3 - 2 * t);

    // Smooth noise: blends the eight corners of the grid cell that contains the point.
    function noise(x, y, z) {
      const cellX = Math.floor(x), cellY = Math.floor(y), cellZ = Math.floor(z);
      const fracX = fade(x - cellX), fracY = fade(y - cellY), fracZ = fade(z - cellZ);
      const lerp = (from, to, t) => from + (to - from) * t;
      return lerp(
        lerp(
          lerp(cornerValue(cellX, cellY, cellZ),         cornerValue(cellX + 1, cellY, cellZ),         fracX),
          lerp(cornerValue(cellX, cellY + 1, cellZ),     cornerValue(cellX + 1, cellY + 1, cellZ),     fracX),
          fracY),
        lerp(
          lerp(cornerValue(cellX, cellY, cellZ + 1),     cornerValue(cellX + 1, cellY, cellZ + 1),     fracX),
          lerp(cornerValue(cellX, cellY + 1, cellZ + 1), cornerValue(cellX + 1, cellY + 1, cellZ + 1), fracX),
          fracY),
        fracZ);
    }

    // Fractal noise: each octave has half the strength and about twice the detail of the last.
    function fbm(x, y, z, octaves) {
      let sum = 0, amplitude = 1, frequency = 1, totalAmplitude = 0;
      for (let i = 0; i < octaves; i++) {
        sum += amplitude * noise(x * frequency, y * frequency, z * frequency);
        totalAmplitude += amplitude;
        amplitude *= 0.5;
        frequency *= 2.03;
      }
      return sum / totalAmplitude;
    }

    return { noise, fbm };
  }

  // Small maths helpers.
  const smooth = (edgeLow, edgeHigh, x) => {   // 0 below edgeLow, 1 above edgeHigh, smooth ramp between
    const t = Math.min(1, Math.max(0, (x - edgeLow) / (edgeHigh - edgeLow)));
    return t * t * (3 - 2 * t);
  };
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const hex = css => [parseInt(css.slice(1, 3), 16), parseInt(css.slice(3, 5), 16), parseInt(css.slice(5, 7), 16)];   // '#rrggbb' -> [r, g, b]
  const mix = (colorA, colorB, t) => [
    colorA[0] + (colorB[0] - colorA[0]) * t,
    colorA[1] + (colorB[1] - colorA[1]) * t,
    colorA[2] + (colorB[2] - colorA[2]) * t,
  ];

  const LAND_FRACTION = 0.47;   // roughly this share of the planet is land

  /* Creates the whole planet for a seed: land shape, sea level, biomes and the painted texture.
     Directions on the planet are unit vectors [x, y, z] with y pointing at the north pole. */
  function createPlanet(seed) {
    seed = seed | 0;
    const noiseGen = makeNoise(seed);
    const seedOffset = [seed * 0.0013 % 50, seed * 0.0029 % 50, seed * 0.0007 % 50];

    // The raw height field. Higher number = higher ground. Sea level is chosen further down.
    function rawHeight(x, y, z) {
      // gentle domain warp makes blobby, hand-drawn coastlines
      const warpX = noiseGen.noise(x * 2.2 + 7, y * 2.2, z * 2.2) - 0.5;
      const warpY = noiseGen.noise(x * 2.2, y * 2.2 + 13, z * 2.2) - 0.5;
      const warpZ = noiseGen.noise(x * 2.2, y * 2.2, z * 2.2 + 29) - 0.5;
      const warpStrength = 0.5;
      let height = noiseGen.fbm(
        x * 1.35 + seedOffset[0] + warpX * warpStrength,
        y * 1.35 + seedOffset[1] + warpY * warpStrength,
        z * 1.35 + seedOffset[2] + warpZ * warpStrength,
        5);
      height += 0.24 * smooth(0.82, 0.98, Math.abs(y)); // continents at the poles
      // fine octaves: bays, capes and little coves (small amplitude, the big shapes stay put)
      height += 0.05 * (noiseGen.noise(x * 11 + 3, y * 11, z * 11 + 5) - 0.5)
              + 0.022 * (noiseGen.noise(x * 26, y * 26 + 9, z * 26 + 2) - 0.5);
      return height;
    }

    // Pick the sea level so land covers a fixed fraction of the planet
    const sampleRandom = mulberry32(seed ^ 0x9e3779b9);
    const heightSamples = [];
    for (let i = 0; i < 24000; i++) {
      const z = sampleRandom() * 2 - 1, angle = sampleRandom() * Math.PI * 2, ringRadius = Math.sqrt(1 - z * z);
      heightSamples.push(rawHeight(ringRadius * Math.cos(angle), z, ringRadius * Math.sin(angle)));
    }
    heightSamples.sort((a, b) => a - b);
    const sea = heightSamples[Math.floor(heightSamples.length * (1 - LAND_FRACTION))];   // heights above this are land
    const lowest = heightSamples[Math.floor(heightSamples.length * 0.01)];               // the deepest sea floor
    const highest = heightSamples[Math.floor(heightSamples.length * 0.995)];             // the highest peaks

    const heightAt = (x, y, z) => rawHeight(x, y, z);

    // Latitude (|y|) beyond which the ground is ice; wobbles a little so the edge is not a straight line.
    function iceEdge(x, y, z) { return 0.77 + 0.05 * (noiseGen.noise(x * 3 + 40, y * 3, z * 3) - 0.5) * 2; }
    // Latitude (|y|) below which the ground is desert.
    function desertEdge(x, y, z) { return 0.30 + 0.10 * (noiseGen.noise(x * 2.5, y * 2.5 + 60, z * 2.5) - 0.5) * 2; }

    // Which biome a point is in, by distance from the equator: 'ice' | 'desert' | 'savanna' | 'green'
    function biomeAt(x, y, z) {
      const absLatitude = Math.abs(y);
      if (absLatitude > iceEdge(x, y, z)) return 'ice';
      const desertLimit = desertEdge(x, y, z);
      if (absLatitude < desertLimit) return 'desert';
      if (absLatitude < desertLimit + 0.10) return 'savanna';
      return 'green';
    }

    // Three land colours per biome: low ground, middle height, high ground.
    const BIOME_PALETTE = {
      ice: ['#f3fbff', '#dff3fb', '#c4e6f5'],
      desert: ['#f6d77f', '#eec45f', '#e0aa45'],
      savanna: ['#b9dd5a', '#9fcf4c', '#86be42'],
      green: ['#73d24f', '#58c244', '#3fa83f'],
    };
    for (const biome in BIOME_PALETTE) BIOME_PALETTE[biome] = BIOME_PALETTE[biome].map(hex);

    // Sea colour from shallow (0) to deepest (1), as [depth, colour] stops.
    const SEA_STOPS = [
      [0.00, hex('#5fe3e0')], [0.10, hex('#35b9ee')], [0.30, hex('#2a6fe0')],
      [0.55, hex('#4b2bb0')], [0.80, hex('#2a0f6a')], [1.00, hex('#0b0322')],
    ];

    // Blends between the sea stops to give the colour at a depth between 0 and 1.
    function seaColor(depth01) {
      for (let i = 1; i < SEA_STOPS.length; i++) {
        if (depth01 <= SEA_STOPS[i][0]) {
          const [depthBefore, colorBefore] = SEA_STOPS[i - 1], [depthAfter, colorAfter] = SEA_STOPS[i];
          return mix(colorBefore, colorAfter, (depth01 - depthBefore) / (depthAfter - depthBefore));
        }
      }
      return SEA_STOPS[SEA_STOPS.length - 1][1];
    }

    // How deep the sea is at a height: 0 at the shoreline, 1 at the deepest floor.
    const seaDepth01 = height => Math.pow(clamp01((sea - height) / (sea - lowest)), 0.6);

    // Converts a position on the flat texture (u, v both 0..1) to a direction on the sphere.
    function dirFromUV(u, v) { // matches THREE.SphereGeometry
      const longitude = u * Math.PI * 2, colatitude = v * Math.PI;
      return [-Math.cos(longitude) * Math.sin(colatitude), Math.cos(colatitude), Math.sin(longitude) * Math.sin(colatitude)];
    }

    /* Cartoon surface texture.
       The height field is evaluated on a coarse grid (it is smooth) and bilinearly upsampled, then
       coastlines are anti-aliased with a distance field: smooth ink outline, foam and ripple bands.
       Also returns `mask`: 255 on open water where animated waves may be drawn. */
    function buildTexture(width, height) {
      const coarseWidth = Math.min(width, 2048), coarseHeight = coarseWidth >> 1;
      const coarseScale = width / coarseWidth;       // output pixels per coarse-grid cell
      const detailScale = width / 2048;              // scales pixel-sized details with the texture size
      const smoothstep = smooth;

      // Pre-computed sines and cosines for each column and row of the coarse grid.
      const cosLongCoarse = new Float32Array(coarseWidth), sinLongCoarse = new Float32Array(coarseWidth);
      const cosLatCoarse = new Float32Array(coarseHeight), sinLatCoarse = new Float32Array(coarseHeight);
      for (let col = 0; col < coarseWidth; col++) {
        const longitude = (col + 0.5) / coarseWidth * Math.PI * 2;
        cosLongCoarse[col] = Math.cos(longitude);
        sinLongCoarse[col] = Math.sin(longitude);
      }
      for (let row = 0; row < coarseHeight; row++) {
        const colatitude = (row + 0.5) / coarseHeight * Math.PI;
        cosLatCoarse[row] = Math.cos(colatitude);
        sinLatCoarse[row] = Math.sin(colatitude);
      }

      // The height field sampled on the coarse grid.
      const coarseHeights = new Float32Array(coarseWidth * coarseHeight);
      for (let row = 0; row < coarseHeight; row++) {
        for (let col = 0; col < coarseWidth; col++) {
          coarseHeights[row * coarseWidth + col] = rawHeight(
            -cosLongCoarse[col] * sinLatCoarse[row], cosLatCoarse[row], sinLongCoarse[col] * sinLatCoarse[row]);
        }
      }

      // A softened copy of the height field for sea depth (keeps the deep-water bands calm).
      // Done as two box blurs: first along each row (wrapping around the planet), then down each column.
      const softHeights = new Float32Array(coarseWidth * coarseHeight);
      const rowBlurred = new Float32Array(coarseWidth * coarseHeight);
      const blurRadius = 3;
      for (let row = 0; row < coarseHeight; row++) {
        for (let col = 0; col < coarseWidth; col++) {
          let total = 0;
          for (let d = -blurRadius; d <= blurRadius; d++) total += coarseHeights[row * coarseWidth + (col + d + coarseWidth) % coarseWidth];
          rowBlurred[row * coarseWidth + col] = total / (2 * blurRadius + 1);
        }
      }
      for (let row = 0; row < coarseHeight; row++) {
        for (let col = 0; col < coarseWidth; col++) {
          let total = 0;
          for (let d = -blurRadius; d <= blurRadius; d++) {
            total += rowBlurred[Math.min(coarseHeight - 1, Math.max(0, row + d)) * coarseWidth + col];
          }
          softHeights[row * coarseWidth + col] = total / (2 * blurRadius + 1);
        }
      }

      // Smooth biome edges, sampled on a tiny grid and interpolated up to full size later.
      const edgeWidth = 512, edgeHeight = 256;
      const iceGrid = new Float32Array(edgeWidth * edgeHeight), desertGrid = new Float32Array(edgeWidth * edgeHeight);
      for (let row = 0; row < edgeHeight; row++) {
        for (let col = 0; col < edgeWidth; col++) {
          const longitude = (col + 0.5) / edgeWidth * Math.PI * 2, colatitude = (row + 0.5) / edgeHeight * Math.PI;
          const x = -Math.cos(longitude) * Math.sin(colatitude), y = Math.cos(colatitude), z = Math.sin(longitude) * Math.sin(colatitude);
          iceGrid[row * edgeWidth + col] = iceEdge(x, y, z);
          desertGrid[row * edgeWidth + col] = desertEdge(x, y, z);
        }
      }

      // Bilinear lookup from the tiny edge grid at full-size pixel (px, py).
      const edgeAt = (grid, px, py) => {
        const gridX = (px + 0.5) / width * edgeWidth - 0.5, gridY = (py + 0.5) / height * edgeHeight - 0.5;
        const x0 = Math.floor(gridX), y0 = Math.floor(gridY), fracX = gridX - x0, fracY = gridY - y0;
        const colA = (x0 + edgeWidth) % edgeWidth, colB = (x0 + 1 + edgeWidth) % edgeWidth;
        const rowA = Math.min(edgeHeight - 1, Math.max(0, y0)), rowB = Math.min(edgeHeight - 1, Math.max(0, y0 + 1));
        return (grid[rowA * edgeWidth + colA] * (1 - fracX) + grid[rowA * edgeWidth + colB] * fracX) * (1 - fracY)
             + (grid[rowB * edgeWidth + colA] * (1 - fracX) + grid[rowB * edgeWidth + colB] * fracX) * fracY;
      };

      // Results of the last sampleHeight() call: the height, and the height gradient per full-size pixel.
      const sampled = { height: 0, gradient: 0 };

      // Bilinear height at full-size pixel (px, py), plus how steeply it changes there.
      // Reads from `source` (the normal heights by default, or the softened copy).
      const sampleHeight = (px, py, source) => {
        source = source || coarseHeights;
        const gridX = (px + 0.5) / coarseScale - 0.5, gridY = (py + 0.5) / coarseScale - 0.5;
        const x0 = Math.floor(gridX), y0 = Math.floor(gridY), fracX = gridX - x0, fracY = gridY - y0;
        const colA = (x0 + coarseWidth) % coarseWidth, colB = (x0 + 1 + coarseWidth) % coarseWidth;
        const rowA = Math.min(coarseHeight - 1, Math.max(0, y0)), rowB = Math.min(coarseHeight - 1, Math.max(0, y0 + 1));
        const h00 = source[rowA * coarseWidth + colA], h10 = source[rowA * coarseWidth + colB];
        const h01 = source[rowB * coarseWidth + colA], h11 = source[rowB * coarseWidth + colB];
        sampled.height = (h00 * (1 - fracX) + h10 * fracX) * (1 - fracY) + (h01 * (1 - fracX) + h11 * fracX) * fracY;
        const slopeX = ((h10 - h00) * (1 - fracY) + (h11 - h01) * fracY) / coarseScale;
        const slopeY = ((h01 - h00) * (1 - fracX) + (h11 - h10) * fracX) / coarseScale;
        sampled.gradient = Math.max(1e-6, Math.hypot(slopeX, slopeY));
      };

      // pass 1: distance-to-coast seeds (sub-pixel), then a chamfer sweep. Fixed point, 1/16 px.
      // coastDistance holds, for every pixel, how far it is from the nearest coastline (in 1/16 pixels).
      const FAR = 65535;
      const coastDistance = new Uint16Array(width * height).fill(FAR);
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          sampleHeight(col, row);
          const index = row * width + col;
          const distanceToCoast = Math.abs(sampled.height - sea) / sampled.gradient;
          if (distanceToCoast < 1.8) coastDistance[index] = Math.round(distanceToCoast * 16);
        }
      }
      // Two sweeps (top-left to bottom-right, then back) spread the distances outward from the coast.
      for (let pass = 0; pass < 2; pass++) {
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            const index = row * width + col, left = row * width + (col + width - 1) % width;
            let best = coastDistance[index];
            best = Math.min(best, coastDistance[left] + 16);
            if (row > 0) {
              const above = index - width;
              best = Math.min(best, coastDistance[above] + 16,
                coastDistance[row * width - width + (col + width - 1) % width] + 23,
                coastDistance[row * width - width + (col + 1) % width] + 23);
            }
            coastDistance[index] = Math.min(best, FAR);
          }
        }
        for (let row = height - 1; row >= 0; row--) {
          for (let col = width - 1; col >= 0; col--) {
            const index = row * width + col, right = row * width + (col + 1) % width;
            let best = coastDistance[index];
            best = Math.min(best, coastDistance[right] + 16);
            if (row < height - 1) {
              const below = index + width;
              best = Math.min(best, coastDistance[below] + 16,
                coastDistance[(row + 1) * width + (col + width - 1) % width] + 23,
                coastDistance[(row + 1) * width + (col + 1) % width] + 23);
            }
            coastDistance[index] = Math.min(best, FAR);
          }
        }
      }

      // pass 2: colour
      const seaColorTable = [];   // sea colours pre-computed in 1000 steps of depth
      for (let step = 0; step <= 1000; step++) seaColorTable.push(seaColor(step / 1000));
      const INK = [18, 34, 70], FOAM = [236, 250, 255], ICE_SEA = hex('#e6f6ff');
      const relativeHeight = h => clamp01((h - sea) / (highest - sea));   // 0 at the coast, 1 at the highest peak

      // Pre-computed sines and cosines per output column and row.
      const cosLong = new Float32Array(width), sinLong = new Float32Array(width);
      const cosLat = new Float32Array(height), sinLat = new Float32Array(height);
      for (let col = 0; col < width; col++) {
        const longitude = (col + 0.5) / width * Math.PI * 2;
        cosLong[col] = Math.cos(longitude);
        sinLong[col] = Math.sin(longitude);
      }
      for (let row = 0; row < height; row++) {
        const colatitude = (row + 0.5) / height * Math.PI;
        cosLat[row] = Math.cos(colatitude);
        sinLat[row] = Math.sin(colatitude);
      }

      const pixels = new Uint8ClampedArray(width * height * 4);   // RGBA output
      const waveMask = new Uint8Array(width * height);            // 255 where animated waves may be drawn
      const bandColorA = [0, 0, 0], bandColorB = [0, 0, 0], color = [0, 0, 0];

      // Land colour for a height band: blends the biome's low, middle and high colours into `out`.
      const bandMix = (palette, lowToMid, midToHigh, out) => {
        for (let channel = 0; channel < 3; channel++) {
          const lowMid = palette[0][channel] + (palette[1][channel] - palette[0][channel]) * lowToMid;
          out[channel] = lowMid + (palette[2][channel] - lowMid) * midToHigh;
        }
      };
      const outlineHalfWidth = 2.3 * detailScale;   // outline half width in px

      for (let row = 0; row < height; row++) {
        const y = cosLat[row], absLatitude = Math.abs(y);
        for (let col = 0; col < width; col++) {
          const index = row * width + col, distanceToCoast = coastDistance[index] / 16;
          sampleHeight(col, row);
          const pixelHeight = sampled.height, isLand = pixelHeight > sea;
          const alpha = 255;
          if (isLand) {
            // How high up this land is decides which of the three band colours it gets.
            const t = relativeHeight(pixelHeight);
            const lowToMid = smoothstep(0.28 - 0.014, 0.28 + 0.014, t);
            const midToHigh = smoothstep(0.6 - 0.014, 0.6 + 0.014, t);
            const iceLimit = edgeAt(iceGrid, col, row), desertLimit = edgeAt(desertGrid, col, row);
            // How strongly each biome applies at this latitude (0 = not at all, 1 = fully).
            const iceAmount = smoothstep(iceLimit - 0.004, iceLimit + 0.004, absLatitude);
            const desertAmount = 1 - smoothstep(desertLimit - 0.004, desertLimit + 0.004, absLatitude);
            const savannaAmount = 1 - smoothstep(desertLimit + 0.1 - 0.004, desertLimit + 0.1 + 0.004, absLatitude);
            // Start with green, then blend savanna, desert and ice over the top.
            bandMix(BIOME_PALETTE.green, lowToMid, midToHigh, color);
            if (savannaAmount > 0) {
              bandMix(BIOME_PALETTE.savanna, lowToMid, midToHigh, bandColorA);
              for (let channel = 0; channel < 3; channel++) color[channel] += (bandColorA[channel] - color[channel]) * savannaAmount;
            }
            if (desertAmount > 0) {
              bandMix(BIOME_PALETTE.desert, lowToMid, midToHigh, bandColorB);
              for (let channel = 0; channel < 3; channel++) color[channel] += (bandColorB[channel] - color[channel]) * desertAmount;
            }
            if (iceAmount > 0) {
              bandMix(BIOME_PALETTE.ice, lowToMid, midToHigh, bandColorA);
              for (let channel = 0; channel < 3; channel++) color[channel] += (bandColorA[channel] - color[channel]) * iceAmount;
            }
            // painterly detail: tufts / dunes / snow drifts, plus a faint contour line where the height bands meet
            const dirX = -cosLong[col] * sinLat[row], dirZ = sinLong[col] * sinLat[row];
            const detailNoise = noiseGen.noise(dirX * 85 + 11, y * 85, dirZ * 85);
            const tuft = smoothstep(0.6, 0.64, detailNoise) * (1 - iceAmount);
            const dune = desertAmount > 0.5 ? (0.5 + 0.5 * Math.sin((detailNoise * 1.4 + dirX * 30 + y * 18) * 9)) * 0.028 : 0;
            const shade = 1 - 0.07 * tuft - dune + 0.03 * (detailNoise - 0.5);
            const pixelsFromContour = Math.min(Math.abs(t - 0.28), Math.abs(t - 0.6)) * (highest - sea) / sampled.gradient;
            const contourLine = (1 - smoothstep(0.6 * detailScale, 1.6 * detailScale, pixelsFromContour)) * 0.16;
            // sandy lip just inside the coast
            const sandyLip = (1 - smoothstep(outlineHalfWidth + 1.0 * detailScale, outlineHalfWidth + 5 * detailScale, distanceToCoast)) * 0.13;
            for (let channel = 0; channel < 3; channel++) color[channel] = color[channel] * shade * (1 - contourLine) + 255 * sandyLip;
          } else {
            // Sea: pick the colour by depth (from the softened heights), banded into 12 steps.
            sampleHeight(col, row, softHeights);
            const scaledDepth = seaDepth01(sampled.height) * 12, wholeStep = Math.floor(scaledDepth);
            const stepBlend = smoothstep(0.78, 1.0, scaledDepth - wholeStep);
            const tableColor = seaColorTable[Math.min(1000, Math.round((wholeStep + stepBlend) / 12 * 1000))];
            color[0] = tableColor[0]; color[1] = tableColor[1]; color[2] = tableColor[2];
            const iceLimit = edgeAt(iceGrid, col, row);
            const iceSeaAmount = smoothstep(iceLimit + 0.13 - 0.004, iceLimit + 0.13 + 0.004, absLatitude);
            const openWater = 1 - iceSeaAmount;
            // foam collar and a fainter ripple ring further out
            const foam = (1 - smoothstep(outlineHalfWidth + 5.5 * detailScale, outlineHalfWidth + 6.8 * detailScale, distanceToCoast)) * 0.86;
            const ripple = Math.max(0, 1 - Math.abs(distanceToCoast - (outlineHalfWidth + 11 * detailScale)) / (1.1 * detailScale)) * 0.38;
            const foamAmount = Math.max(foam, ripple) * openWater;
            for (let channel = 0; channel < 3; channel++) color[channel] = color[channel] * (1 - foamAmount) + FOAM[channel] * foamAmount;
            for (let channel = 0; channel < 3; channel++) color[channel] = color[channel] * (1 - iceSeaAmount) + ICE_SEA[channel] * iceSeaAmount;
            waveMask[index] = openWater > 0.99
              ? Math.round(smoothstep(outlineHalfWidth + 14 * detailScale, outlineHalfWidth + 24 * detailScale, distanceToCoast) * 255)
              : 0;
          }
          // ink outline, anti-aliased
          const ink = 1 - smoothstep(outlineHalfWidth - 0.7 * detailScale, outlineHalfWidth + 0.7 * detailScale, distanceToCoast);
          pixels[index * 4] = color[0] * (1 - ink) + INK[0] * ink;
          pixels[index * 4 + 1] = color[1] * (1 - ink) + INK[1] * ink;
          pixels[index * 4 + 2] = color[2] * (1 - ink) + INK[2] * ink;
          pixels[index * 4 + 3] = alpha;
        }
      }
      return { width, height, data: pixels, mask: waveMask };
    }

    // A random point on the sphere, as a unit vector. `rng` is a function returning numbers in 0..1.
    function randomDir(rng) {
      const z = rng() * 2 - 1, angle = rng() * Math.PI * 2, ringRadius = Math.sqrt(1 - z * z);
      return [ringRadius * Math.cos(angle), z, ringRadius * Math.sin(angle)];
    }

    return {
      seed, sea, lowest, highest,
      heightAt, biomeAt, dirFromUV, buildTexture, randomDir, seaDepth01, iceEdge, desertEdge,
      isLand(dir) { return heightAt(dir[0], dir[1], dir[2]) > sea; },
      relHeight(dir) { return clamp01((heightAt(dir[0], dir[1], dir[2]) - sea) / (highest - sea)); },   // 0 at the coast, 1 at the highest peak
      depth(dir) { return seaDepth01(heightAt(dir[0], dir[1], dir[2])); },
      biome(dir) { return biomeAt(dir[0], dir[1], dir[2]); },
    };
  }

  const api = { createPlanet, mulberry32, makeNoise };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PlanetGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
