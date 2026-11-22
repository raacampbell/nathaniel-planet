/* Builds planet textures off the main thread: a quick low-res pass first, then the full-res one. */
importScripts('planet-gen.js');

// Message in: { seed, sizes: [texture widths] }. One message back per size: { W, H, data, mask }.
onmessage = function (event) {
  const planet = PlanetGen.createPlanet(event.data.seed);
  for (const width of event.data.sizes) {
    const texture = planet.buildTexture(width, width / 2);
    postMessage({ W: width, H: width / 2, data: texture.data, mask: texture.mask }, [texture.data.buffer, texture.mask.buffer]);
  }
};
