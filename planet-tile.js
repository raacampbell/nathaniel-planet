/* High-detail ground tiles for Nathaniel Planet. Pure functions: works in a worker and in Node.
   buildTile(planet, noiseGen, centerDir, span, res) renders a res x res RGBA picture of the ground around
   direction centerDir (unit vector), `span` radians wide, as seen through a gnomonic (flat) projection.
   Everything that depends on the world (coast wiggles, noise, grass tuft positions) is a function of world
   direction only, so neighbouring tiles and different resolutions agree with each other. Open sea far from
   land is left transparent so the animated waves show through. */
(function (root) {
  'use strict';

  // ---- Small maths and colour helpers ----
  const smooth = (edgeLow, edgeHigh, x) => {   // 0 below edgeLow, 1 above edgeHigh, smooth ramp between
    const t = Math.min(1, Math.max(0, (x - edgeLow) / (edgeHigh - edgeLow)));
    return t * t * (3 - 2 * t);
  };
  const hex = css => [parseInt(css.slice(1, 3), 16), parseInt(css.slice(3, 5), 16), parseInt(css.slice(5, 7), 16)];   // '#rrggbb' -> [r, g, b]
  const mixColors = (colorA, colorB, t) => [
    colorA[0] + (colorB[0] - colorA[0]) * t,
    colorA[1] + (colorB[1] - colorA[1]) * t,
    colorA[2] + (colorB[2] - colorA[2]) * t,
  ];
  // A repeatable pseudo-random number (0..1) for a pair of whole numbers plus a seed. Used to place hand-drawn marks.
  const hash = (x, y, seed) => {
    let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const normalize = v => { const length = Math.hypot(v[0], v[1], v[2]); return [v[0] / length, v[1] / length, v[2] / length]; };

  // Three land colours per biome: low ground, middle height, high ground.
  const BIOME_PALETTE = {
    ice: ['#f3fbff', '#dff3fb', '#c4e6f5'],
    desert: ['#f6d77f', '#eec45f', '#e0aa45'],
    savanna: ['#b9dd5a', '#9fcf4c', '#86be42'],
    green: ['#73d24f', '#58c244', '#3fa83f'],
  };
  for (const biome in BIOME_PALETTE) BIOME_PALETTE[biome] = BIOME_PALETTE[biome].map(hex);

  // Sea colour from shallow (0) to deepest (1), as [depth, colour] stops.
  const SEA_STOPS = [[0, hex('#5fe3e0')], [0.1, hex('#35b9ee')], [0.3, hex('#2a6fe0')], [0.55, hex('#4b2bb0')], [0.8, hex('#2a0f6a')], [1, hex('#0b0322')]];

  // Blends between the sea stops to give the colour at a depth between 0 and 1.
  const seaColor = depth01 => {
    for (let i = 1; i < SEA_STOPS.length; i++) {
      if (depth01 <= SEA_STOPS[i][0]) {
        return mixColors(SEA_STOPS[i - 1][1], SEA_STOPS[i][1], (depth01 - SEA_STOPS[i - 1][0]) / (SEA_STOPS[i][0] - SEA_STOPS[i - 1][0]));
      }
    }
    return SEA_STOPS[SEA_STOPS.length - 1][1];
  };

  // Land colour for a height band: low -> middle (by lowToMid), then -> high (by midToHigh).
  const bandColor = (palette, lowToMid, midToHigh) => mixColors(mixColors(palette[0], palette[1], lowToMid), palette[2], midToHigh);

  const INK = [18, 34, 70], FOAM = [236, 250, 255], SAND = [255, 244, 205];

  // Extra fine height detail: [frequency, amplitude] pairs added on top of the coarse height grid.
  const DETAIL_OCTAVES = [[40, 0.006], [90, 0.0042], [200, 0.0024], [450, 0.0012], [1000, 0.0006]];

  /* Renders one tile and returns its pixels (Uint8ClampedArray, RGBA, res x res).
     planet: from PlanetGen.createPlanet. noiseGen: from PlanetGen.makeNoise. */
  function buildTile(planet, noiseGen, centerDir, span, res) {
    const size = res;
    const pixelsPerRadian = res / span;
    const scale = pixelsPerRadian / 4096;                     // scale relative to the prototype
    const minScale = Math.max(0.7, scale);                    // same, but never smaller than 0.7 (for thin lines)

    // Flat picture axes: axisRight and axisDown are unit vectors on the sphere pointing right/down in the tile.
    const axisRight = normalize(cross(centerDir, [0, 1, 0]));
    const axisDown = cross(centerDir, axisRight);
    const halfSpanTan = Math.tan(span / 2);

    // Direction on the sphere at tile position (a, b), each from -1 (left/top edge) to +1 (right/bottom edge).
    const dirAt = (a, b) => normalize([
      centerDir[0] + (a * axisRight[0] + b * axisDown[0]) * halfSpanTan,
      centerDir[1] + (a * axisRight[1] + b * axisDown[1]) * halfSpanTan,
      centerDir[2] + (a * axisRight[2] + b * axisDown[2]) * halfSpanTan,
    ]);

    // 1. heights: coarse grid (smooth), bilinear, plus fine octaves that live in world space
    const COARSE = 129;                                       // coarse grid points per side
    const coarseHeights = new Float32Array(COARSE * COARSE);
    for (let row = 0; row < COARSE; row++) {
      for (let col = 0; col < COARSE; col++) {
        const dir = dirAt(col / (COARSE - 1) * 2 - 1, row / (COARSE - 1) * 2 - 1);
        coarseHeights[row * COARSE + col] = planet.heightAt(dir[0], dir[1], dir[2]);
      }
    }
    const detailedHeights = new Float32Array(size * size);    // smooth height plus fine detail
    const smoothHeights = new Float32Array(size * size);      // smooth (bilinear) height only
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const gridX = (col + 0.5) / size * (COARSE - 1), gridY = (row + 0.5) / size * (COARSE - 1);
        const x0 = Math.min(COARSE - 2, Math.floor(gridX)), y0 = Math.min(COARSE - 2, Math.floor(gridY));
        const fracX = gridX - x0, fracY = gridY - y0;
        const height = (coarseHeights[y0 * COARSE + x0] * (1 - fracX) + coarseHeights[y0 * COARSE + x0 + 1] * fracX) * (1 - fracY)
                     + (coarseHeights[(y0 + 1) * COARSE + x0] * (1 - fracX) + coarseHeights[(y0 + 1) * COARSE + x0 + 1] * fracX) * fracY;
        smoothHeights[row * size + col] = height;
        const dir = dirAt((col + 0.5) / size * 2 - 1, (row + 0.5) / size * 2 - 1);
        let detail = 0;
        for (const [frequency, amplitude] of DETAIL_OCTAVES) {
          detail += amplitude * (noiseGen.noise(dir[0] * frequency + 3, dir[1] * frequency, dir[2] * frequency + 5) - 0.5);
        }
        detailedHeights[row * size + col] = height + detail;
      }
    }

    // 2. distance to the coast in px
    // coastDistance holds, for every pixel, how far it is from the nearest coastline (in 1/16 pixels).
    const sea = planet.sea;
    const FAR = 65535;
    const coastDistance = new Uint16Array(size * size).fill(FAR);
    for (let row = 1; row < size - 1; row++) {
      for (let col = 1; col < size - 1; col++) {
        const index = row * size + col;
        const slopeX = (detailedHeights[index + 1] - detailedHeights[index - 1]) / 2;
        const slopeY = (detailedHeights[index + size] - detailedHeights[index - size]) / 2;
        const gradient = Math.max(1e-9, Math.hypot(slopeX, slopeY));
        const distanceToCoast = Math.abs(detailedHeights[index] - sea) / gradient;
        if (distanceToCoast < 1.8) coastDistance[index] = Math.round(distanceToCoast * 16);
      }
    }
    // Two sweeps (top-left to bottom-right, then back) spread the distances outward from the coast.
    for (let pass = 0; pass < 2; pass++) {
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const index = row * size + col;
          let best = coastDistance[index];
          if (col > 0) best = Math.min(best, coastDistance[index - 1] + 16);
          if (row > 0) {
            best = Math.min(best, coastDistance[index - size] + 16);
            if (col > 0) best = Math.min(best, coastDistance[index - size - 1] + 23);
            if (col < size - 1) best = Math.min(best, coastDistance[index - size + 1] + 23);
          }
          coastDistance[index] = best;
        }
      }
      for (let row = size - 1; row >= 0; row--) {
        for (let col = size - 1; col >= 0; col--) {
          const index = row * size + col;
          let best = coastDistance[index];
          if (col < size - 1) best = Math.min(best, coastDistance[index + 1] + 16);
          if (row < size - 1) {
            best = Math.min(best, coastDistance[index + size] + 16);
            if (col < size - 1) best = Math.min(best, coastDistance[index + size + 1] + 23);
            if (col > 0) best = Math.min(best, coastDistance[index + size - 1] + 23);
          }
          coastDistance[index] = best;
        }
      }
    }

    // 3. base colour
    const pixels = new Uint8ClampedArray(size * size * 4);   // RGBA output
    const outlineHalfWidth = Math.max(4, 16 * scale);        // coast outline half width in px
    const heightRange = planet.highest - sea;                // height difference from the coast to the highest peak
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const index = row * size + col;
        const a = (col + 0.5) / size * 2 - 1, b = (row + 0.5) / size * 2 - 1;
        const dir = dirAt(a, b), absLatitude = Math.abs(dir[1]);
        const height = detailedHeights[index], smoothHeight = smoothHeights[index];
        const distanceToCoast = coastDistance[index] / 16;
        let color;
        let alpha = Math.round(255 * smooth(0, 0.1, 1 - Math.max(Math.abs(a), Math.abs(b))));   // fades out at the tile edge
        let ink;                                                                               // 0..1 amount of coast outline
        if (height > sea) {
          // Land. How high up it is decides which of the three band colours it gets.
          const t = Math.min(1, Math.max(0, (height - sea) / heightRange));
          const lowToMid = smooth(0.27, 0.29, t), midToHigh = smooth(0.59, 0.61, t);
          const iceLimit = planet.iceEdge(dir[0], dir[1], dir[2]), desertLimit = planet.desertEdge(dir[0], dir[1], dir[2]);
          // How strongly each biome applies at this latitude (0 = not at all, 1 = fully).
          const iceAmount = smooth(iceLimit - 0.004, iceLimit + 0.004, absLatitude);
          const desertAmount = 1 - smooth(desertLimit - 0.004, desertLimit + 0.004, absLatitude);
          const savannaAmount = 1 - smooth(desertLimit + 0.096, desertLimit + 0.104, absLatitude);
          // Start with green, then blend savanna, desert and ice over the top.
          color = bandColor(BIOME_PALETTE.green, lowToMid, midToHigh);
          if (savannaAmount > 0) color = mixColors(color, bandColor(BIOME_PALETTE.savanna, lowToMid, midToHigh), savannaAmount);
          if (desertAmount > 0) color = mixColors(color, bandColor(BIOME_PALETTE.desert, lowToMid, midToHigh), desertAmount);
          if (iceAmount > 0) color = mixColors(color, bandColor(BIOME_PALETTE.ice, lowToMid, midToHigh), iceAmount);
          // Light and dark patches from three scales of noise.
          const noiseLarge = noiseGen.noise(dir[0] * 40, dir[1] * 40, dir[2] * 40);
          const noiseMedium = noiseGen.noise(dir[0] * 160 + 9, dir[1] * 160, dir[2] * 160);
          const noiseSmall = noiseGen.noise(dir[0] * 600 + 4, dir[1] * 600, dir[2] * 600);
          let shade = 1 + 0.07 * (noiseLarge - 0.5) + 0.05 * (noiseMedium - 0.5) + 0.035 * (noiseSmall - 0.5);
          // Faint contour lines where the height bands meet (fainter on steep ground).
          const slopeX = (detailedHeights[Math.min(size * size - 1, index + 1)] - detailedHeights[Math.max(0, index - 1)]) / 2;
          const slopeY = (detailedHeights[Math.min(size * size - 1, index + size)] - detailedHeights[Math.max(0, index - size)]) / 2;
          const steepness = Math.max(1e-9, Math.hypot(slopeX, slopeY)) / heightRange * 10;
          const pixelsFromContour = Math.min((t * 10) % 1, 1 - (t * 10) % 1) / steepness;
          shade *= 1 - 0.09 * (1 - smooth(0.5 * minScale, 1.5 * minScale, pixelsFromContour)) * (t > 0.03 ? 1 : 0) * smooth(10 * scale, 26 * scale, 1 / steepness);
          // Desert: faint dune stripes.
          if (desertAmount > 0.5) {
            const phase = (dir[0] * 80 + dir[2] * 50 + noiseLarge * 0.6) * Math.PI * 2;
            const stripe = 1 - smooth(0.9, 0.99, Math.abs(Math.sin(phase)));
            const duneMask = smooth(0.55, 0.7, noiseGen.noise(dir[0] * 22 + 70, dir[1] * 22, dir[2] * 22));
            shade *= 1 - 0.07 * stripe * duneMask;
          }
          // High, snow-free ground: pencil hatching.
          if (t > 0.55 && iceAmount < 0.5) {
            const hatchPhase = ((col + row) / Math.max(4, 11 * scale) + noiseMedium * 3) % 1;
            const hatch = (1 - smooth(0.06, 0.16, Math.abs(hatchPhase - 0.5))) * smooth(0.45, 0.62, noiseLarge);
            shade *= 1 - 0.18 * hatch * smooth(0.55, 0.7, t);
          }
          color = color.map(channel => channel * shade);
          // Sandy lip just inside the coast, a little speckled.
          const sandyLip = (1 - smooth(outlineHalfWidth + 2 * scale, outlineHalfWidth + 34 * scale, distanceToCoast)) * 0.55;
          if (sandyLip > 0) {
            color = mixColors(color, SAND, sandyLip * (noiseGen.noise(dir[0] * 1400, dir[1] * 1400, dir[2] * 1400) > 0.8 ? 0.55 : 1));
          }
          ink = 1 - smooth(outlineHalfWidth - 1.2, outlineHalfWidth + 1.2, distanceToCoast);
        } else {
          // Sea: colour by depth, banded into 12 steps, lighter near the coast.
          const scaledDepth = planet.seaDepth01(smoothHeight) * 12, wholeStep = Math.floor(scaledDepth);
          const stepBlend = smooth(0.78, 1.0, scaledDepth - wholeStep);
          color = seaColor(Math.min(1, (wholeStep + stepBlend) / 12));
          color = mixColors(color, [120, 236, 226], (1 - smooth(outlineHalfWidth + 20 * scale, outlineHalfWidth + 190 * scale, distanceToCoast)) * 0.5);
          // Foam rings that follow the coast, wobbling a little with noise.
          const wobble = (noiseGen.noise(dir[0] * 260 + 2, dir[1] * 260, dir[2] * 260) - 0.5) * 9 * scale;
          let foam = 0;
          for (const [ringOffset, ringWidth, ringOpacity] of [[14, 7.5, 0.95], [54, 4.2, 0.6], [98, 3.2, 0.4], [148, 2.6, 0.26]]) {
            const halfWidth = Math.max(1.1, ringWidth * scale);
            const distanceToRing = Math.abs(distanceToCoast + wobble * (ringOffset / 100) - (outlineHalfWidth + ringOffset * scale));
            foam = Math.max(foam, (1 - smooth(halfWidth - 1, halfWidth + 1, distanceToRing)) * ringOpacity);
          }
          color = mixColors(color, FOAM, foam);
          ink = 1 - smooth(outlineHalfWidth - 1.2, outlineHalfWidth + 1.2, distanceToCoast);
          alpha = Math.round(alpha * (1 - smooth(215 * scale, 330 * scale, distanceToCoast)));   // far from the coast: let the animated base waves show
        }
        pixels[index * 4] = color[0] * (1 - ink) + INK[0] * ink;
        pixels[index * 4 + 1] = color[1] * (1 - ink) + INK[1] * ink;
        pixels[index * 4 + 2] = color[2] * (1 - ink) + INK[2] * ink;
        pixels[index * 4 + 3] = alpha;
      }
    }

    // 4. hand-drawn marks (grass tufts, flowers, pebbles, snow sparkle): world-anchored cells, splatted into the picture

    // Blends colour `markColor` into pixel (x, y) with strength `amount` (0..1). Ignores points outside the tile.
    const blendPixel = (x, y, markColor, amount) => {
      if (amount <= 0 || x < 0 || y < 0 || x >= size || y >= size) return;
      const q = (y * size + x) * 4, strength = amount > 1 ? 1 : amount;
      pixels[q] += (markColor[0] - pixels[q]) * strength;
      pixels[q + 1] += (markColor[1] - pixels[q + 1]) * strength;
      pixels[q + 2] += (markColor[2] - pixels[q + 2]) * strength;
    };

    // Distance from point (x, y) to the line segment from (ax, ay) to (bx, by).
    const distanceToSegment = (x, y, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(x - ax - dx * t, y - ay - dy * t);
    };

    // Work out the latitude and longitude range the tile covers, by walking round its four edges.
    let latMin = 9, latMax = -9, lonMin = 9, lonMax = -9;
    const centerLon = Math.atan2(centerDir[2], centerDir[0]);
    const wrapAngle = angle => {   // brings an angle into -PI..PI
      while (angle > Math.PI) angle -= 2 * Math.PI;
      while (angle < -Math.PI) angle += 2 * Math.PI;
      return angle;
    };
    for (let step = 0; step <= 16; step++) {
      for (const [a, b] of [[-1, step / 8 - 1], [1, step / 8 - 1], [step / 8 - 1, -1], [step / 8 - 1, 1]]) {
        const dir = dirAt(a, b), lat = Math.asin(dir[1]), lon = wrapAngle(Math.atan2(dir[2], dir[0]) - centerLon);
        latMin = Math.min(latMin, lat); latMax = Math.max(latMax, lat);
        lonMin = Math.min(lonMin, lon); lonMax = Math.max(lonMax, lon);
      }
    }
    const nearPole = latMax > 1.45 || latMin < -1.45;   // near a pole the longitude range is the whole way round

    /* Visits every mark position in the tile. The world is divided into cells of `cellSize` radians; each cell
       has a mark with chance `probability`, at a position decided only by the cell's coordinates (so it is the
       same in every tile). Calls draw(ix, iy, dirOnSphere, x, y, pixelIndex, up) for each mark, where (x, y) is the
       position in the tile and `up` points toward the north pole in tile coordinates. */
    const forEachMark = (cellSize, seed, probability, draw) => {
      for (let cellRow = Math.floor(latMin / cellSize); cellRow <= Math.floor(latMax / cellSize); cellRow++) {
        const cellLat = (cellRow + 0.5) * cellSize;
        if (Math.abs(cellLat) > 1.2) continue;
        const lonCellSize = cellSize / Math.max(0.25, Math.cos(cellLat));   // cells get wider in longitude toward the poles
        const lonStart = nearPole ? 0 : centerLon + lonMin, lonEnd = nearPole ? Math.PI * 2 : centerLon + lonMax;
        for (let cellCol = Math.floor(lonStart / lonCellSize) - 1; cellCol <= Math.floor(lonEnd / lonCellSize) + 1; cellCol++) {
          if (hash(cellCol, cellRow, seed) > probability) continue;
          const lat = (cellRow + 0.15 + 0.7 * hash(cellCol, cellRow, seed + 1)) * cellSize;
          const lon = (cellCol + 0.15 + 0.7 * hash(cellCol, cellRow, seed + 2)) * lonCellSize;
          const cosLat = Math.cos(lat);
          const markDir = [cosLat * Math.cos(lon), Math.sin(lat), cosLat * Math.sin(lon)];
          const facing = markDir[0] * centerDir[0] + markDir[1] * centerDir[1] + markDir[2] * centerDir[2];
          if (facing < 0.5) continue;   // on the far side of the planet
          const a = (markDir[0] * axisRight[0] + markDir[1] * axisRight[1] + markDir[2] * axisRight[2]) / facing / halfSpanTan;
          const b = (markDir[0] * axisDown[0] + markDir[1] * axisDown[1] + markDir[2] * axisDown[2]) / facing / halfSpanTan;
          const x = (a + 1) / 2 * size, y = (b + 1) / 2 * size;
          if (x < -40 || y < -40 || x > size + 40 || y > size + 40) continue;
          const pixelX = Math.min(size - 1, Math.max(0, Math.round(x))), pixelY = Math.min(size - 1, Math.max(0, Math.round(y)));
          const pixelIndex = pixelY * size + pixelX;
          const north = normalize([-markDir[0] * markDir[1], 1 - markDir[1] * markDir[1], -markDir[2] * markDir[1]]);   // local "up" for drawings: toward the north pole
          draw(cellCol, cellRow, markDir, x, y, pixelIndex, [
            north[0] * axisRight[0] + north[1] * axisRight[1] + north[2] * axisRight[2],
            north[0] * axisDown[0] + north[1] * axisDown[1] + north[2] * axisDown[2],
          ]);
        }
      }
    };

    // Is the pixel land, and at least minDistance px from the coast?
    const isLandAt = (index, minDistance) => detailedHeights[index] > sea && coastDistance[index] / 16 > minDistance;
    const strokeHalfWidth = Math.max(1.15, 1.7 * scale);

    // Grass tufts: three short strokes fanning out from a point.
    forEachMark(0.0112, 11, 0.85, (cellCol, cellRow, markDir, x, y, index, up) => {
      if (!isLandAt(index, outlineHalfWidth + 14 * scale)) return;
      const t = (detailedHeights[index] - sea) / heightRange, absLatitude = Math.abs(markDir[1]);
      const iceLimit = planet.iceEdge(markDir[0], markDir[1], markDir[2]), desertLimit = planet.desertEdge(markDir[0], markDir[1], markDir[2]);
      if (t > 0.6 || absLatitude > iceLimit - 0.01 || absLatitude < desertLimit - 0.01) return;
      const isSavanna = absLatitude < desertLimit + 0.1;
      if (hash(cellCol, cellRow, 15) > (isSavanna ? 0.65 : 0.95)) return;
      const tuftLength = (15 + 9 * hash(cellCol, cellRow, 14)) * scale;
      const tuftColor = isSavanna ? [120, 150, 40] : [32, 120, 40];
      const upLength = Math.hypot(up[0], up[1]) || 1, upX = up[0] / upLength, upY = up[1] / upLength;
      // End points of the three strokes: tilted left, straight up, tilted right.
      const strokeEnds = [-0.55, 0, 0.5].map(tilt => {
        const cosTilt = Math.cos(tilt), sinTilt = Math.sin(tilt), length = tuftLength * (tilt === 0 ? 1 : 0.8);
        return [x + (upX * cosTilt - upY * sinTilt) * length, y + (upY * cosTilt + upX * sinTilt) * length];
      });
      const xStart = Math.floor(Math.min(x, ...strokeEnds.map(end => end[0])) - 3), xEnd = Math.ceil(Math.max(x, ...strokeEnds.map(end => end[0])) + 3);
      const yStart = Math.floor(Math.min(y, ...strokeEnds.map(end => end[1])) - 3), yEnd = Math.ceil(Math.max(y, ...strokeEnds.map(end => end[1])) + 3);
      for (let pixelY = yStart; pixelY <= yEnd; pixelY++) {
        for (let pixelX = xStart; pixelX <= xEnd; pixelX++) {
          let nearest = 1e9;
          for (const end of strokeEnds) nearest = Math.min(nearest, distanceToSegment(pixelX, pixelY, x, y, end[0], end[1]));
          blendPixel(pixelX, pixelY, tuftColor, (1 - smooth(strokeHalfWidth - 0.8, strokeHalfWidth + 0.8, nearest)) * 0.75);
        }
      }
    });

    // Flowers: a round bloom with an orange centre, in green (not desert) country.
    forEachMark(0.0156, 21, 0.16, (cellCol, cellRow, markDir, x, y, index) => {
      if (!isLandAt(index, outlineHalfWidth + 14 * scale)) return;
      const t = (detailedHeights[index] - sea) / heightRange, absLatitude = Math.abs(markDir[1]);
      const desertLimit = planet.desertEdge(markDir[0], markDir[1], markDir[2]), iceLimit = planet.iceEdge(markDir[0], markDir[1], markDir[2]);
      if (t > 0.5 || absLatitude > iceLimit - 0.01 || absLatitude < desertLimit + 0.1) return;
      const petalChoice = hash(cellCol, cellRow, 24);
      const petalColor = petalChoice < 0.4 ? [255, 255, 255] : petalChoice < 0.7 ? [255, 140, 190] : [255, 220, 70];
      const radius = Math.max(2.4, 6.5 * scale);
      for (let pixelY = Math.floor(y - radius - 1); pixelY <= y + radius + 1; pixelY++) {
        for (let pixelX = Math.floor(x - radius - 1); pixelX <= x + radius + 1; pixelX++) {
          const distance = Math.hypot(pixelX - x, pixelY - y);
          if (distance < radius) blendPixel(pixelX, pixelY, distance < radius * 0.37 ? [200, 120, 20] : petalColor, 1 - smooth(radius * 0.7, radius, distance));
        }
      }
    });

    // Desert pebbles: small flattened brown ovals.
    forEachMark(0.0093, 31, 0.35, (cellCol, cellRow, markDir, x, y, index) => {
      if (!isLandAt(index, outlineHalfWidth + 14 * scale)) return;
      const absLatitude = Math.abs(markDir[1]), desertLimit = planet.desertEdge(markDir[0], markDir[1], markDir[2]);
      if (absLatitude > desertLimit - 0.01 || (detailedHeights[index] - sea) / heightRange > 0.5) return;
      const radius = Math.max(1.4, (2.2 + 2.4 * hash(cellCol, cellRow, 34)) * scale);
      for (let pixelY = Math.floor(y - radius - 1); pixelY <= y + radius + 1; pixelY++) {
        for (let pixelX = Math.floor(x - radius * 1.6 - 1); pixelX <= x + radius * 1.6 + 1; pixelX++) {
          const distance = Math.hypot((pixelX - x) / 1.5, pixelY - y);
          if (distance < radius + 1) blendPixel(pixelX, pixelY, [150, 108, 60], (1 - smooth(radius - 0.8, radius + 0.8, distance)) * 0.8);
        }
      }
    });

    // Snow sparkle: tiny white dots on the ice.
    forEachMark(0.0073, 41, 0.3, (cellCol, cellRow, markDir, x, y, index) => {
      if (!isLandAt(index, outlineHalfWidth + 8 * scale) || Math.abs(markDir[1]) < planet.iceEdge(markDir[0], markDir[1], markDir[2]) + 0.004) return;
      const radius = Math.max(1.6, 2.2 * scale);
      for (let pixelY = Math.floor(y - radius - 1); pixelY <= y + radius + 1; pixelY++) {
        for (let pixelX = Math.floor(x - radius - 1); pixelX <= x + radius + 1; pixelX++) {
          const distance = Math.hypot(pixelX - x, pixelY - y);
          if (distance < radius) blendPixel(pixelX, pixelY, [255, 255, 255], 1 - smooth(radius * 0.45, radius, distance));
        }
      }
    });

    return pixels;
  }

  const api = { buildTile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlanetTile = api;
})(typeof window !== 'undefined' ? window : globalThis);
