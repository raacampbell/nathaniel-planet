/* Draws high-detail ground tiles off the main thread (see planet-tile.js), and the political-map overlay. */
importScripts('planet-gen.js', 'planet-tile.js');

let planet = null, noiseGen = null, currentSeed = null;

const smooth = (edgeLow, edgeHigh, x) => {   // 0 below edgeLow, 1 above edgeHigh, smooth ramp between
  const t = Math.min(1, Math.max(0, (x - edgeLow) / (edgeHigh - edgeLow)));
  return t * t * (3 - 2 * t);
};

/* Paints the country-colour overlay for the political map. The countries come in as a coarse grid
   (message.ids: a country number per cell, -1 for none; message.cols: the colour of each country).
   Returns RGBA pixels, width x height, transparent over the sea, with soft fills and dark borders on land. */
function political(message) {
  const { W: width, H: height, GW: gridWidth, GH: gridHeight, ids, cols } = message;
  const halfWidth = width >> 1, halfHeight = height >> 1;

  // Land/sea test: the height field on a half-resolution grid.
  const halfResHeights = new Float32Array(halfWidth * halfHeight);
  for (let row = 0; row < halfHeight; row++) {
    for (let col = 0; col < halfWidth; col++) {
      const dir = planet.dirFromUV((col + 0.5) / halfWidth, (row + 0.5) / halfHeight);
      halfResHeights[row * halfWidth + col] = planet.heightAt(dir[0], dir[1], dir[2]);
    }
  }

  // soften the blocky grid: each cell keeps its three strongest countries after a small gaussian blur
  const topCountries = new Int16Array(gridWidth * gridHeight * 3).fill(-1);   // country numbers, 3 per cell
  const topWeights = new Float32Array(gridWidth * gridHeight * 3);            // how strongly each of them reaches the cell
  const weightByCountry = new Map();
  const blurRadius = 2;
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      weightByCountry.clear();
      for (let dRow = -blurRadius; dRow <= blurRadius; dRow++) {
        const neighborRow = row + dRow;
        if (neighborRow < 0 || neighborRow >= gridHeight) continue;
        for (let dCol = -blurRadius; dCol <= blurRadius; dCol++) {
          const country = ids[neighborRow * gridWidth + (col + dCol + gridWidth) % gridWidth];
          if (country < 0) continue;
          const weight = Math.exp(-(dCol * dCol + dRow * dRow) / 2.2);
          weightByCountry.set(country, (weightByCountry.get(country) || 0) + weight);
        }
      }
      const ranked = [...weightByCountry].sort((a, b) => b[1] - a[1]);
      const cellBase = (row * gridWidth + col) * 3;
      for (let rank = 0; rank < 3 && rank < ranked.length; rank++) {
        topCountries[cellBase + rank] = ranked[rank][0];
        topWeights[cellBase + rank] = ranked[rank][1];
      }
    }
  }

  const pixels = new Uint8ClampedArray(width * height * 4);
  const weightHere = new Map();   // country number -> weight at the current pixel
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      // land? (bilinear height from the half-res grid)
      const heightX = (col + 0.5) / width * halfWidth - 0.5, heightY = (row + 0.5) / height * halfHeight - 0.5;
      const x0 = Math.floor(heightX);
      const y0 = Math.max(0, Math.min(halfHeight - 2, Math.floor(heightY)));
      const fracX = heightX - x0, fracY = Math.min(1, Math.max(0, heightY - y0));
      const colA = (x0 + halfWidth) % halfWidth, colB = (x0 + 1) % halfWidth;
      const groundHeight = (halfResHeights[y0 * halfWidth + colA] * (1 - fracX) + halfResHeights[y0 * halfWidth + colB] * fracX) * (1 - fracY)
                         + (halfResHeights[(y0 + 1) * halfWidth + colA] * (1 - fracX) + halfResHeights[(y0 + 1) * halfWidth + colB] * fracX) * fracY;
      const landAmount = smooth(planet.sea - 0.0015, planet.sea + 0.0015, groundHeight);
      if (landAmount <= 0) continue;

      // country membership: bilinear blend of the four surrounding grid cells
      const gridX = (col + 0.5) / width * gridWidth - 0.5, gridY = (row + 0.5) / height * gridHeight - 0.5;
      const gridCol = Math.floor(gridX);
      const gridRow = Math.max(0, Math.min(gridHeight - 2, Math.floor(gridY)));
      const blendX = gridX - gridCol, blendY = Math.min(1, Math.max(0, gridY - gridRow));
      weightHere.clear();
      const addCell = (cellCol, cellRow, cellWeight) => {
        const cellBase = (cellRow * gridWidth + ((cellCol + gridWidth) % gridWidth)) * 3;
        if (cellWeight <= 0) return;
        for (let rank = 0; rank < 3; rank++) {
          const country = topCountries[cellBase + rank];
          if (country < 0) break;
          weightHere.set(country, (weightHere.get(country) || 0) + cellWeight * topWeights[cellBase + rank]);
        }
      };
      addCell(gridCol, gridRow, (1 - blendX) * (1 - blendY));
      addCell(gridCol + 1, gridRow, blendX * (1 - blendY));
      addCell(gridCol, gridRow + 1, (1 - blendX) * blendY);
      addCell(gridCol + 1, gridRow + 1, blendX * blendY);

      // Find the strongest and second-strongest countries here.
      let bestCountry = -1, bestWeight = 0, secondWeight = 0;
      for (const [country, weight] of weightHere) {
        if (weight > bestWeight) { secondWeight = bestWeight; bestWeight = weight; bestCountry = country; }
        else if (weight > secondWeight) secondWeight = weight;
      }
      if (bestCountry < 0) continue;

      const total = bestWeight + secondWeight || 1;
      const margin = (bestWeight - secondWeight) / total;            // 1 deep inside, 0 on the border
      const borderLine = weightHere.size > 1 ? 1 - smooth(0.035, 0.075, margin) : 0;       // the dark border line
      const nearBorderGlow = weightHere.size > 1 ? 1 - smooth(0.08, 0.55, margin) : 0;      // fill gets stronger near borders
      const countryColor = cols[bestCountry], offset = (row * width + col) * 4;
      const alpha = (0.3 + 0.4 * nearBorderGlow) * (1 - borderLine) + 0.9 * borderLine;
      pixels[offset] = countryColor[0] * (1 - borderLine) + 50 * borderLine;
      pixels[offset + 1] = countryColor[1] * (1 - borderLine) + 20 * borderLine;
      pixels[offset + 2] = countryColor[2] * (1 - borderLine) + 70 * borderLine;
      pixels[offset + 3] = 255 * alpha * landAmount;
    }
  }
  return pixels;
}

/* Messages in: { type: 'political', ... } for the country overlay, otherwise a tile request
   { seed, n, span, res } (see planet-tile.js). The answer carries the pixel buffer back. */
onmessage = event => {
  const message = event.data;
  if (currentSeed !== message.seed) {
    currentSeed = message.seed;
    planet = PlanetGen.createPlanet(currentSeed);
    noiseGen = PlanetGen.makeNoise(currentSeed ^ 0x5bd1e995);
  }
  if (message.type === 'political') {
    const pixels = political(message);
    postMessage({ type: 'political', W: message.W, H: message.H, data: pixels.buffer }, [pixels.buffer]);
    return;
  }
  const pixels = PlanetTile.buildTile(planet, noiseGen, message.n, message.span, message.res);
  postMessage({ res: message.res, data: pixels.buffer }, [pixels.buffer]);
};
