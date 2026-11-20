/* Builds planet textures off the main thread: a quick low-res pass first, then the full-res one. */
importScripts('planet-gen.js');
onmessage = function (e) {
  const P = PlanetGen.createPlanet(e.data.seed);
  for (const W of e.data.sizes) {
    const t = P.buildTexture(W, W / 2);
    postMessage({ W, H: W / 2, data: t.data, mask: t.mask }, [t.data.buffer, t.mask.buffer]);
  }
};
