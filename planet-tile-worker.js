/* Draws one high-detail ground tile off the main thread (see planet-tile.js). */
importScripts('planet-gen.js', 'planet-tile.js');
let P = null, N = null, seed = null;
onmessage = e => {
  const m = e.data;
  if (seed !== m.seed) { seed = m.seed; P = PlanetGen.createPlanet(seed); N = PlanetGen.makeNoise(seed ^ 0x5bd1e995); }
  const px = PlanetTile.buildTile(P, N, m.n, m.span, m.res);
  postMessage({ res: m.res, data: px.buffer }, [px.buffer]);
};
