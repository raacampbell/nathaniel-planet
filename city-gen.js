/* Towns for Nathaniel Planet. Each town gets its own personality: walls, a castle, a cathedral, a market square,
   a domed palace, windmills, a lighthouse, factories... built from small primitives and merged into one
   vertex-coloured mesh (+ one ink-outline mesh) per town. Units: 1 = one small house wide.

   How it fits together:
   - prims() makes the basic shapes (box, roof, cylinder...) once.
   - makeWriter() gives each town a "writer": put() stamps a primitive into the town's mesh, frame() does the
     same relative to a building's own position and rotation.
   - house(), tree(), LM.church() and friends build single things; buildTown(), buildFarm() and buildMetro()
     lay a whole settlement out; build() is the entry point used by index.html.
   - Everything random comes from one seeded generator (`random`), so a town looks the same every time.
     The ORDER of random() calls matters: changing it changes every town. */
(function (root) {
  'use strict';
  let THREE = null;     // the three.js library, handed in by build()
  let PRIM = null;      // the shared primitive shapes, made once by prims()

  const colorCache = {};   // hex number -> [r, g, b] (0..1)
  // Converts a hex colour like 0xff8800 to [r, g, b] with each channel 0..1. Results are cached.
  const col = hex => colorCache[hex] || (colorCache[hex] = [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]);

  /* Makes the basic shapes once and returns them. Each shape is { p: positions, n: normals } as flat arrays,
     sized 1 x 1 x 1 with its base at y = 0 (unless noted), ready to be scaled and placed by the writer's put(). */
  function prims() {
    if (PRIM) return PRIM;
    const toFlat = geometry => geometry.index ? geometry.toNonIndexed() : geometry;
    // Builds a geometry from a plain list of triangle corner positions.
    const fromPositions = positions => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      return geometry;
    };
    const pack = geometry => ({ p: geometry.attributes.position.array, n: geometry.attributes.normal.array });

    // box with base at y=0, no bottom face
    const boxGeometry = toFlat(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    const boxPositions = [], boxNormals = [];
    for (let i = 0; i < boxGeometry.attributes.position.count; i++) {
      if (boxGeometry.attributes.normal.getY(i) < -0.5) continue;    // skip faces pointing down
      boxPositions.push(boxGeometry.attributes.position.getX(i), boxGeometry.attributes.position.getY(i), boxGeometry.attributes.position.getZ(i));
      boxNormals.push(boxGeometry.attributes.normal.getX(i), boxGeometry.attributes.normal.getY(i), boxGeometry.attributes.normal.getZ(i));
    }
    const BOX = { p: new Float32Array(boxPositions), n: new Float32Array(boxNormals) };

    // Corner points shared by the roof shapes: four base corners (y=0), two ridge ends, and an apex.
    const cornerA = [-.5, 0, -.5], cornerB = [.5, 0, -.5], cornerC = [.5, 0, .5], cornerD = [-.5, 0, .5];
    const ridgeBack = [0, 1, -.5], ridgeFront = [0, 1, .5];
    const triangles = (...corners) => corners.flat();

    // gable prism: eaves along x, ridge along z (at y=1)
    const GABLE = pack(fromPositions(triangles(
      cornerD, cornerC, ridgeFront, cornerA, ridgeBack, cornerB,   // the two gable ends
      cornerD, ridgeFront, ridgeBack, cornerD, ridgeBack, cornerA, // left slope
      cornerC, cornerB, ridgeBack, cornerC, ridgeBack, ridgeFront  // right slope
    )));

    // hip roof (4-sided pyramid), apex at y=1
    const apex = [0, 1, 0];
    const HIP = pack(fromPositions(triangles(
      cornerD, cornerC, apex, cornerC, cornerB, apex, cornerB, cornerA, apex, cornerA, cornerD, apex)));

    // quad facing +z (for windows, doors, signs), centred, in the xy plane
    const QUAD = pack(fromPositions(triangles(
      [-.5, -.5, 0], [.5, -.5, 0], [.5, .5, 0], [-.5, -.5, 0], [.5, .5, 0], [-.5, .5, 0])));

    // Round shapes, built with a given number of sides. Open tube (no end caps), closed cylinder, and cone.
    const openCylinder = sides => pack(toFlat(new THREE.CylinderGeometry(0.5, 0.5, 1, sides, 1, true).translate(0, 0.5, 0)));
    const closedCylinder = sides => pack(toFlat(new THREE.CylinderGeometry(0.5, 0.5, 1, sides).translate(0, 0.5, 0)));
    const cone = sides => pack(toFlat(new THREE.ConeGeometry(0.5, 1, sides, 1, true).translate(0, 0.5, 0)));
    const dome = pack(toFlat(new THREE.SphereGeometry(0.5, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2)));   // upper half of a sphere
    const ball = pack(toFlat(new THREE.SphereGeometry(0.5, 8, 5)));
    const smallBall = pack(toFlat(new THREE.SphereGeometry(0.5, 5, 3)));   // fewer facets, for tiny things
    const disc = pack(toFlat(new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2)));

    PRIM = {
      BOX, GABLE, HIP, QUAD,
      CYL8: closedCylinder(8), CYL12: closedCylinder(12), CYL16: closedCylinder(16), TUBE16: openCylinder(16),
      CONE4: cone(4), CONE8: cone(8), CONE12: cone(12), CONE16: cone(16),
      DOME: dome, BALL: ball, SBALL: smallBall, DISC: disc,
    };
    return PRIM;
  }

  /* A growing mesh: flat lists of positions, normals and colours. */
  function MeshData() { this.p = []; this.n = []; this.c = []; }

  /* Creates the writer for one town. `rootMatrix` places the town on the planet; `sagK` says how fast the
     ground curves away from the flat town plane. The writer collects two meshes: `out` (the coloured
     buildings) and `ink` (a slightly bigger black copy behind each one, which makes the cartoon outline). */
  function makeWriter(rootMatrix, sagK) {
    const out = new MeshData(), ink = new MeshData();
    // Scratch objects, reused so we don't allocate for every primitive.
    const worldMatrix = new THREE.Matrix4(), localMatrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
    const rotation = new THREE.Quaternion(), euler = new THREE.Euler();
    const scale = new THREE.Vector3(), position = new THREE.Vector3(), offset = new THREE.Vector3();

    // Copies primitive `prim` into `target`, transformed by `matrix` and painted `rgb`.
    const emit = (target, prim, matrix, rgb) => {
      normalMatrix.getNormalMatrix(matrix);
      const positions = prim.p, normals = prim.n, m = matrix.elements, nm = normalMatrix.elements;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i], y = positions[i + 1], z = positions[i + 2];
        target.p.push(
          m[0] * x + m[4] * y + m[8] * z + m[12],
          m[1] * x + m[5] * y + m[9] * z + m[13],
          m[2] * x + m[6] * y + m[10] * z + m[14]);
        const normalX = normals[i], normalY = normals[i + 1], normalZ = normals[i + 2];
        const nx = nm[0] * normalX + nm[3] * normalY + nm[6] * normalZ;
        const ny = nm[1] * normalX + nm[4] * normalY + nm[7] * normalZ;
        const nz = nm[2] * normalX + nm[5] * normalY + nm[8] * normalZ;
        const length = Math.hypot(nx, ny, nz) || 1;
        target.n.push(nx / length, ny / length, nz / length);
        target.c.push(rgb[0], rgb[1], rgb[2]);
      }
    };

    const writer = {
      // How far the curved planet surface drops below the flat town plane at (x, z).
      sag: (x, z) => -(x * x + z * z) * sagK,

      /* Puts a primitive in the town: position (x,y,z) of its base, size (sx,sy,sz), rotation ry about the
         vertical (and optional rx, rz), colour `hex`, and `inkThickness` for the outline (0 = no outline). */
      put(prim, x, y, z, sx, sy, sz, ry, hex, inkThickness, rx, rz) {
        euler.set(rx || 0, ry || 0, rz || 0, 'YXZ');
        rotation.setFromEuler(euler);
        position.set(x, y, z);
        scale.set(sx, sy, sz);
        localMatrix.compose(position, rotation, scale);
        worldMatrix.multiplyMatrices(rootMatrix, localMatrix);
        emit(out, prim, worldMatrix, col(hex));
        if (inkThickness) {
          // The outline is the same shape, slightly bigger and shifted down, drawn in black.
          offset.set(0, -inkThickness, 0).applyQuaternion(rotation);
          position.set(x + offset.x, y + offset.y, z + offset.z);
          scale.set(sx + 2 * inkThickness, sy + 2 * inkThickness, sz + 2 * inkThickness);
          localMatrix.compose(position, rotation, scale);
          worldMatrix.multiplyMatrices(rootMatrix, localMatrix);
          emit(ink, prim, worldMatrix, col(0));
        }
      },

      /* Same as put(), but positions are in a local frame whose origin is (originX, originY, originZ) and
         which is turned by frameRotation. Returns the put-function for that frame: handy for buildings. */
      frame(originX, originY, originZ, frameRotation) {
        const cos = Math.cos(frameRotation), sin = Math.sin(frameRotation);
        return (prim, x, y, z, sx, sy, sz, ry, hex, inkThickness, rx, rz) => writer.put(
          prim, originX + x * cos + z * sin, originY + y, originZ - x * sin + z * cos,
          sx, sy, sz, (ry || 0) + frameRotation, hex, inkThickness, rx, rz);
      },
      out, ink,
    };
    return writer;
  }

  // Turns a MeshData into a three.js geometry with vertex colours.
  function toGeometry(meshData) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.p, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.n, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(meshData.c, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }

  /* ------------------------------------------------------------------------------------------------ palettes */
  // Colours for ordinary houses in each biome (hex numbers).
  const PALETTES = {
    green: { walls: [0xfff1d6, 0xffd9a8, 0xf7c6c6, 0xd8ecff, 0xfff6a8, 0xe6d6ff, 0xc9f0d2, 0xffffff], roofs: [0xc0503a, 0xa84432, 0x3d6fa8, 0x7a4a2a, 0x5b8a3c, 0x8a3a52], timber: 0x5a3a28, stone: 0xb9ad9a },
    savanna: { walls: [0xf2d2a0, 0xe8c08a, 0xffe2b8, 0xf5cf9c, 0xffefd0], roofs: [0xd9a441, 0xc48a2c, 0xb8762a, 0xe0b85a], timber: 0x6b4423, stone: 0xc8a878 },
    desert: { walls: [0xf6e0b5, 0xefd09a, 0xffe9c4, 0xe9c58e, 0xfff3dc, 0xf3d6b0], roofs: [0xe8c58e], timber: 0x7a5233, stone: 0xd9bb88 },
  };
  // Colours used on many buildings.
  const GLOW = 0xfff1a8, PANE = 0x8fc7ff, DOOR = 0x5a3420, FRAME = 0xffffff, STONE = 0xc9c1b0, STONE_DARK = 0x9c9384, SLATE = 0x4d5568;

  /* ------------------------------------------------------------------------------------------------ houses */

  /* An ordinary house, with windows, a door and a roof. `options`: w, d (width, depth), floors, wall and roof
     colours, and flags for flat roof, dome, hip roof, half-timbering, shutters, flower boxes and a chimney. */
  function house(writer, random, x, z, ry, options) {
    const local = writer.frame(x, writer.sag(x, z), z, ry);
    const width = options.w, depth = options.d, floors = options.floors, floorHeight = 0.78;
    const height = floors * floorHeight + 0.12, wall = options.wall, roof = options.roof, flatRoof = options.flat;
    local(PRIM.BOX, 0, -0.3, 0, width + 0.08, 0.5, depth + 0.08, 0, options.stone, 0);          // plinth (sinks into the ground)
    local(PRIM.BOX, 0, 0, 0, width, height, depth, 0, wall, 0.045);                              // the walls

    if (options.timber) {                                                                         // half-timbering on front and back
      for (const side of [1, -1]) {
        const faceZ = side * (depth / 2 + 0.012), faceRotation = side > 0 ? 0 : Math.PI;
        for (let k = 1; k <= floors; k++) local(PRIM.QUAD, 0, k * floorHeight + 0.03, faceZ, width, 0.07, 1, faceRotation, options.timberC);
        for (const beamX of [-width / 2 + 0.04, width / 2 - 0.04, 0]) local(PRIM.QUAD, beamX, height / 2, faceZ, 0.07, height, 1, faceRotation, options.timberC);
        if (floors > 1) for (const sx of [-1, 1]) local(PRIM.QUAD, sx * width / 4, floorHeight * 1.5 + 0.06, faceZ, 0.06, floorHeight * 1.05, 1, faceRotation, options.timberC, 0, 0, 0);
      }
    }

    // windows: frame + pane on all four sides, one per bay per floor
    const baysFront = Math.max(1, Math.round(width / 0.62)), baysSide = Math.max(1, Math.round(depth / 0.7));
    // One window on the front or back wall; `rotation` is 0 for the front, PI for the back. `lit` makes it glow.
    const addWindow = (wx, wy, wz, rotation, lit) => {
      local(PRIM.QUAD, wx, wy, wz, 0.27, 0.34, 1, rotation, options.frame);
      local(PRIM.QUAD, wx, wy, wz + (Math.abs(rotation) < 0.1 ? 0.004 : Math.abs(rotation - Math.PI) < 0.1 ? -0.004 : 0), 0.19, 0.25, 1, rotation, lit ? GLOW : PANE);
      if (options.shutter) {
        for (const side of [-1, 1]) local(PRIM.QUAD, wx + side * 0.19 * (Math.abs(rotation) < 0.1 ? 1 : -1), wy, wz, 0.08, 0.3, 1, rotation, options.shutter);
      }
    };
    for (let floor = 0; floor < floors; floor++) {
      const windowY = floor * floorHeight + 0.45;
      for (let bay = 0; bay < baysFront; bay++) {
        const windowX = (bay + 0.5) / baysFront * width - width / 2;
        if (floor === 0 && bay === Math.floor(baysFront / 2)) continue;                           // door goes here
        addWindow(windowX, windowY, depth / 2 + 0.014, 0, random() < 0.35);
        addWindow(windowX, windowY, -depth / 2 - 0.014, Math.PI, random() < 0.35);
        if (options.flowers && floor === 0 && random() < 0.6) local(PRIM.BOX, windowX, windowY - 0.24, depth / 2 + 0.05, 0.3, 0.07, 0.08, 0, options.flowers);
      }
      for (let bay = 0; bay < baysSide; bay++) {
        const windowZ = (bay + 0.5) / baysSide * depth - depth / 2, sideRotation = Math.PI / 2;
        // side windows face +x and -x: rotate the frame so the quad faces outward
        const rightLit = random() < 0.3;
        local(PRIM.QUAD, width / 2 + 0.014, windowY, windowZ, 0.27, 0.34, 1, sideRotation, options.frame);
        local(PRIM.QUAD, width / 2 + 0.018, windowY, windowZ, 0.19, 0.25, 1, sideRotation, rightLit ? GLOW : PANE);
        local(PRIM.QUAD, -width / 2 - 0.014, windowY, windowZ, 0.27, 0.34, 1, -sideRotation, options.frame);
        local(PRIM.QUAD, -width / 2 - 0.018, windowY, windowZ, 0.19, 0.25, 1, -sideRotation, rightLit ? PANE : GLOW);
      }
    }

    // front door, with its step
    const doorX = (Math.floor(baysFront / 2) + 0.5) / baysFront * width - width / 2;
    local(PRIM.QUAD, doorX, 0.3, depth / 2 + 0.014, 0.3, 0.56, 1, 0, options.doorFrame || FRAME);
    local(PRIM.QUAD, doorX, 0.28, depth / 2 + 0.02, 0.22, 0.5, 1, 0, options.door || DOOR);
    local(PRIM.BOX, doorX, 0, depth / 2 + 0.09, 0.36, 0.06, 0.16, 0, options.stone);              // doorstep

    // roof: flat (desert), hipped, or gabled with a dormer window
    if (flatRoof) {
      local(PRIM.BOX, 0, height, 0, width + 0.06, 0.12, depth + 0.06, 0, options.roofTrim || options.stone, 0.035);   // parapet
      local(PRIM.BOX, 0, height + 0.02, 0, width - 0.12, 0.11, depth - 0.12, 0, roof);
      if (options.dome) {
        local(PRIM.CYL12, width * 0.15, height + 0.1, 0, width * 0.42, 0.12, width * 0.42, 0, options.wall);
        local(PRIM.DOME, width * 0.15, height + 0.21, 0, width * 0.42, width * 0.42, width * 0.42, 0, options.domeC || 0xffffff, 0.035);
      }
      if (random() < 0.5) local(PRIM.BOX, -width * 0.25, height + 0.1, -depth * 0.2, 0.25, 0.25, 0.25, 0, options.wall, 0.03);   // stair hut
    } else if (options.hip) {
      const roofHeight = 0.45 + width * 0.18;
      local(PRIM.HIP, 0, height, 0, width + 0.22, roofHeight, depth + 0.22, 0, roof, 0.045);
    } else {
      const roofHeight = 0.4 + width * 0.32;
      local(PRIM.GABLE, 0, height, 0, width + 0.24, roofHeight, depth + 0.18, 0, roof, 0.045);
      local(PRIM.BOX, 0, height + roofHeight - 0.04, 0, 0.1, 0.08, depth + 0.2, 0, options.ridge || 0x6a2e24);   // ridge cap
      if (floors >= 2 && width > 1.0) {                                                           // a dormer
        const dormerZ = depth * 0.1, dormerY = height + roofHeight * 0.28, dormerX = -width * 0.22;
        local(PRIM.BOX, dormerX, dormerY, dormerZ + depth * 0.2, 0.34, 0.32, 0.34, Math.PI / 2, wall, 0.025, 0, 0);
        local(PRIM.GABLE, dormerX, dormerY + 0.32, dormerZ + depth * 0.2, 0.44, 0.2, 0.42, Math.PI / 2, roof, 0.025);
        local(PRIM.QUAD, dormerX, dormerY + 0.17, dormerZ + depth * 0.2 + 0.18, 0.17, 0.18, 1, 0, GLOW);
      }
    }
    if (!flatRoof && options.chimney) {
      const chimneyX = width * 0.26, roofHeight = options.hip ? 0.45 + width * 0.18 : 0.4 + width * 0.32;
      local(PRIM.BOX, chimneyX, height + roofHeight * 0.2, -depth * 0.15, 0.2, roofHeight * 0.75 + 0.18, 0.2, 0, options.chimneyC || 0x9a5a4a, 0.03);
      local(PRIM.BOX, chimneyX, height + roofHeight * 0.95 + 0.18, -depth * 0.15, 0.27, 0.06, 0.27, 0, 0x5a4a44);   // chimney cap
    }
  }

  // Savanna: a round house with a thatched cone roof and a door facing a random direction.
  function roundHut(writer, random, x, z, options) {
    const y = writer.sag(x, z), radius = options.r;
    writer.put(PRIM.CYL16, x, y - 0.2, z, radius * 2, 0.95, radius * 2, 0, options.wall, 0.04);
    writer.put(PRIM.CONE16, x, y + 0.72, z, radius * 2.6, 0.95, radius * 2.6, 0, options.roof, 0.045);
    writer.put(PRIM.SBALL, x, y + 1.6, z, 0.14, 0.14, 0.14, 0, 0x8a5a2a);                         // knob on the roof
    const doorAngle = random() * 6.28;
    writer.put(PRIM.QUAD, x + Math.sin(doorAngle) * (radius + 0.015), y + 0.3, z + Math.cos(doorAngle) * (radius + 0.015), 0.24, 0.45, 1, doorAngle, DOOR);
    for (const sideTurn of [1.6, -1.6]) {                                                          // two little windows either side of the door
      writer.put(PRIM.QUAD, x + Math.sin(doorAngle + sideTurn) * (radius + 0.015), y + 0.45, z + Math.cos(doorAngle + sideTurn) * (radius + 0.015), 0.18, 0.18, 1, doorAngle + sideTurn, GLOW);
    }
  }

  // A tree of the given kind: 'palm', 'pine' or anything else for a round-crowned tree. Size varies randomly.
  function tree(writer, random, x, z, kind) {
    const y = writer.sag(x, z), size = 0.7 + random() * 0.5;
    if (kind === 'palm') {
      writer.put(PRIM.CYL8, x, y, z, 0.1 * size, 1.3 * size, 0.1 * size, 0, 0x8a6a3a, 0.025, 0.15, 0);
      for (let i = 0; i < 6; i++) writer.put(PRIM.BOX, x, y + 1.25 * size, z, 0.12, 0.03, 0.75 * size, i * 1.05, 0x3fa83f, 0.02, 0.35, 0);   // fronds
      return;
    }
    writer.put(PRIM.CYL8, x, y, z, 0.1 * size, 0.4 * size, 0.1 * size, 0, 0x7a5233);               // trunk
    if (kind === 'pine') {
      writer.put(PRIM.CONE8, x, y + 0.3 * size, z, 0.6 * size, 0.9 * size, 0.6 * size, 0, 0x2f8a4a, 0.035);
      writer.put(PRIM.CONE8, x, y + 0.75 * size, z, 0.45 * size, 0.6 * size, 0.45 * size, 0, 0x3aa055, 0.03);
    } else {
      writer.put(PRIM.BALL, x, y + 0.3 * size, z, 0.62 * size, 0.6 * size, 0.62 * size, 0, random() < 0.5 ? 0x5ec24a : 0x48ad44, 0.035);
    }
  }

  // Battlement blocks (merlons) round the top of a rectangle centred at (cx, cz), at height y.
  function crenelsRect(local, cx, cz, width, depth, y, hex) {
    const countX = Math.max(2, Math.floor(width / 0.3)), countZ = Math.max(2, Math.floor(depth / 0.3));
    for (let i = 0; i < countX; i += 2) for (const side of [-1, 1]) local(PRIM.BOX, cx + (i + 0.5) / countX * width - width / 2, y, cz + side * (depth / 2 - 0.07), width / countX, 0.2, 0.14, 0, hex, 0.02);
    for (let i = 0; i < countZ; i += 2) for (const side of [-1, 1]) local(PRIM.BOX, cx + side * (width / 2 - 0.07), y, cz + (i + 0.5) / countZ * depth - depth / 2, 0.14, 0.2, depth / countZ, 0, hex, 0.02);
  }

  // Battlement blocks (merlons) in a row along x, `length` long, at height y and depth z.
  function crenels(local, length, y, z, thickness, hex, step) {
    const count = Math.max(2, Math.floor(length / (step || 0.32)));
    for (let i = 0; i < count; i += 2) local(PRIM.BOX, (i + 0.5) / count * length - length / 2, y, z, length / count, 0.2, thickness, 0, hex, 0.02);
  }

  /* ------------------------------------------------------------------------------------------------ landmarks */
  /* Landmarks are the big special buildings. Each is LM.name(writer, random, x, z, ry, options) and returns
     { r: radius it occupies } (some also return extras such as chimney positions for smoke). */
  const LM = {};

  // A church. `big` makes a cathedral (transept, spire and twin towers); otherwise a village church with one tower and a clock.
  LM.church = (writer, random, x, z, ry, options, big) => {
    const local = writer.frame(x, writer.sag(x, z), z, ry), scale = big ? 1.55 : 1;
    const length = 3.4 * scale, naveWidth = 1.5 * scale, wallHeight = 1.7 * scale;
    const wall = options.churchWall || STONE, roof = options.churchRoof || SLATE;
    local(PRIM.BOX, 0, -0.3, 0, naveWidth + 0.1, 0.5, length + 0.1, 0, STONE_DARK);
    local(PRIM.BOX, 0, 0, 0, naveWidth, wallHeight, length, 0, wall, 0.05);
    local(PRIM.GABLE, 0, wallHeight, 0, naveWidth + 0.2, 0.95 * scale, length + 0.1, 0, roof, 0.05);
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {                    // tall arched windows (as stacked quads) and buttresses
      const windowZ = (i + 0.5) / 4 * length - length / 2;
      local(PRIM.QUAD, side * (naveWidth / 2 + 0.014), wallHeight * 0.55, windowZ, 0.3, wallHeight * 0.55, 1, side * Math.PI / 2, 0x7fb6ff);
      local(PRIM.QUAD, side * (naveWidth / 2 + 0.018), wallHeight * 0.55 + wallHeight * 0.29, windowZ, 0.18, 0.12, 1, side * Math.PI / 2, 0x7fb6ff);
      local(PRIM.BOX, side * (naveWidth / 2 + 0.08), 0, windowZ + length / 8, 0.16, wallHeight * 0.8, 0.18, 0, wall, 0.02);
    }
    // apse (rounded east end)
    local(PRIM.CYL16, 0, 0, -length / 2, naveWidth, wallHeight * 0.9, naveWidth, 0, wall, 0.045);
    local(PRIM.CONE16, 0, wallHeight * 0.9, -length / 2, naveWidth * 1.08, 0.7 * scale, naveWidth * 1.08, 0, roof, 0.045);
    if (big) {                                                                 // transept + crossing spire + twin west towers
      local(PRIM.BOX, 0, 0, -length * 0.12, naveWidth * 2.6, wallHeight * 0.95, naveWidth * 0.9, 0, wall, 0.05);
      local(PRIM.GABLE, 0, wallHeight * 0.95, -length * 0.12, naveWidth * 0.95, 0.85 * scale, naveWidth * 2.7, Math.PI / 2, roof, 0.05);
      local(PRIM.BOX, 0, wallHeight, -length * 0.12, 0.55 * scale, 1.1 * scale, 0.55 * scale, 0, wall, 0.04);
      local(PRIM.CONE8, 0, wallHeight + 1.1 * scale, -length * 0.12, 0.75 * scale, 2.2 * scale, 0.75 * scale, 0, roof, 0.04);
      for (const side of [-1, 1]) {
        local(PRIM.BOX, side * naveWidth * 0.42, 0, length / 2 - 0.3, 0.85 * scale, wallHeight * 2.1, 0.85 * scale, 0, wall, 0.05);
        local(PRIM.CONE8, side * naveWidth * 0.42, wallHeight * 2.1, length / 2 - 0.3, 0.95 * scale, 2.4 * scale, 0.95 * scale, Math.PI / 8, roof, 0.05);
        local(PRIM.SBALL, side * naveWidth * 0.42, wallHeight * 2.1 + 2.45 * scale, length / 2 - 0.3, 0.14, 0.14, 0.14, 0, 0xffd23f);   // gold finial
        for (let floor = 0; floor < 3; floor++) local(PRIM.QUAD, side * naveWidth * 0.42, wallHeight * (0.5 + floor * 0.55), length / 2 - 0.3 + 0.44 * scale, 0.22, 0.42, 1, 0, 0x2a2440);
      }
      local(PRIM.DISC, 0, wallHeight * 1.25, length / 2 + 0.014, 0.75, 0.75, 1, 0, 0xff6b9a, 0, Math.PI / 2);                     // rose window
      local(PRIM.DISC, 0, wallHeight * 1.25, length / 2 + 0.02, 0.5, 0.5, 1, 0, 0x7fb6ff, 0, Math.PI / 2);
      local(PRIM.QUAD, 0, 0.55, length / 2 + 0.015, 0.6, 1.05, 1, 0, DOOR);
    } else {
      const towerZ = length / 2 + 0.35;                                         // west tower with spire and clock
      local(PRIM.BOX, 0, 0, towerZ, 0.95, wallHeight * 2.0, 0.95, 0, wall, 0.05);
      local(PRIM.CONE4, 0, wallHeight * 2.0, towerZ, 1.3, 2.1, 1.3, Math.PI / 4, roof, 0.05);
      local(PRIM.SBALL, 0, wallHeight * 2.0 + 2.1, towerZ, 0.13, 0.13, 0.13, 0, 0xffd23f);
      local(PRIM.DISC, 0, wallHeight * 1.6, towerZ + 0.49, 0.5, 0.5, 1, 0, 0xffffff, 0, Math.PI / 2);   // clock face
      local(PRIM.QUAD, 0.06, wallHeight * 1.6 + 0.08, towerZ + 0.5, 0.04, 0.2, 1, 0, 0x222222);         // clock hands
      local(PRIM.QUAD, 0.04, wallHeight * 1.6, towerZ + 0.5, 0.15, 0.04, 1, 0, 0x222222);
      local(PRIM.QUAD, 0, 0.45, towerZ + 0.49, 0.38, 0.8, 1, 0, DOOR);
    }
    return { r: big ? 4.2 : 2.6 };
  };

  // A small castle: motte (mound), four curtain walls, corner towers with flags, a gatehouse and a keep.
  LM.castle = (writer, random, x, z, ry, options) => {
    const baseY = writer.sag(x, z) + 0.15, local = writer.frame(x, baseY, z, ry);
    const side = 3.2, wallHeight = 1.2, wallColor = 0xd6cbb4;
    local(PRIM.CYL16, 0, -0.6, 0, side * 2.6, 0.75, side * 2.6, 0, 0x8fbf5a, 0.04);                  // a little motte
    for (const [a, b] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {                                    // curtain walls
      const wallLocal = writer.frame(
        x + (a * Math.cos(ry) + b * Math.sin(ry)) * side / 2, baseY,
        z + (-a * Math.sin(ry) + b * Math.cos(ry)) * side / 2, ry + (a ? Math.PI / 2 : 0));
      wallLocal(PRIM.BOX, 0, 0, 0, side, wallHeight, 0.3, 0, wallColor, 0.04);
      crenels(wallLocal, side, wallHeight, 0, 0.3, wallColor);
    }
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {                                   // corner towers with pointy roofs + flags
      local(PRIM.CYL12, a * side / 2, 0, b * side / 2, 0.85, wallHeight * 1.8, 0.85, 0, wallColor, 0.04);
      local(PRIM.CONE12, a * side / 2, wallHeight * 1.8, b * side / 2, 1.1, 1.2, 1.1, 0, options.flag2 || 0x3d6fa8, 0.04);
      local(PRIM.CYL8, a * side / 2, wallHeight * 1.8 + 1.15, b * side / 2, 0.03, 0.55, 0.03, 0, 0x3a2a20);   // flag pole
      local(PRIM.BOX, a * side / 2 + 0.17, wallHeight * 1.8 + 1.5, b * side / 2, 0.32, 0.2, 0.02, 0, options.flag || 0xff4d6d);
      for (let k = 0; k < 3; k++) local(PRIM.QUAD, a * side / 2, 0.6 + k * 0.6, b * side / 2 + 0.43 * b, 0.1, 0.22, 1, b > 0 ? 0 : Math.PI, 0x2a2440);   // arrow slits
    }
    local(PRIM.BOX, 0, 0, side / 2 + 0.1, 1.0, wallHeight * 1.45, 0.6, 0, wallColor, 0.04);          // gatehouse
    crenelsRect(local, 0, side / 2 + 0.1, 1.0, 0.6, wallHeight * 1.45, wallColor);
    local(PRIM.QUAD, 0, 0.42, side / 2 + 0.41, 0.5, 0.8, 1, 0, 0x2a2026);
    // keep
    local(PRIM.BOX, 0, 0, -0.2, 1.5, 2.6, 1.5, 0, 0xe8dfc8, 0.05);
    crenelsRect(local, 0, -0.2, 1.5, 1.5, 2.6, 0xe8dfc8);
    local(PRIM.CYL12, 0.6, 2.3, 0.4, 0.5, 1.0, 0.5, 0, 0xe8dfc8, 0.03);
    local(PRIM.CONE12, 0.6, 3.3, 0.4, 0.68, 0.9, 0.68, 0, options.flag || 0xff4d6d, 0.035);
    for (const windowSide of [-1, 1]) for (let k = 0; k < 2; k++) local(PRIM.QUAD, windowSide * 0.35, 1.0 + k * 0.8, 0.56, 0.18, 0.3, 1, 0, GLOW);
    return { r: side * 1.3 };
  };

  // A market square: a fountain in the middle, a ring of six striped stalls, and a clock tower.
  LM.market = (writer, random, x, z, ry, options) => {
    const y = writer.sag(x, z), local = writer.frame(x, y, z, ry);
    local(PRIM.CYL16, 0, 0, 0, 1.3, 0.25, 1.3, 0, STONE, 0.03);                                      // fountain
    local(PRIM.CYL16, 0, 0.25, 0, 0.9, 0.05, 0.9, 0, 0x5fd3f3);
    local(PRIM.CYL8, 0, 0.25, 0, 0.14, 0.6, 0.14, 0, STONE);
    local(PRIM.CYL12, 0, 0.8, 0, 0.5, 0.08, 0.5, 0, STONE, 0.02);
    local(PRIM.BALL, 0, 0.88, 0, 0.18, 0.3, 0.18, 0, 0x9ee6ff);
    // awning colour pairs, one per stall
    const awnings = [[0xff6b6b, 0xffffff], [0x4ecdc4, 0xffffff], [0xffd23f, 0xff9f43], [0x9b7bff, 0xffffff], [0x7ed957, 0xffffff], [0xff9ff3, 0xffffff]];
    for (let i = 0; i < 6; i++) {                                                     // market stalls in a ring, with striped awnings and wares
      const angle = i / 6 * Math.PI * 2 + 0.3, ringRadius = 2.1;
      const stall = writer.frame(x + Math.sin(angle + ry) * ringRadius, y, z + Math.cos(angle + ry) * ringRadius, angle + ry + Math.PI);
      stall(PRIM.BOX, 0, 0, 0, 0.9, 0.35, 0.5, 0, 0x9a6a3a, 0.02);                                  // counter
      for (const side of [-1, 1]) stall(PRIM.CYL8, side * 0.4, 0.35, -0.2, 0.04, 0.45, 0.04, 0, 0x6b4423);   // awning posts
      for (let k = 0; k < 4; k++) stall(PRIM.BOX, (k + 0.5) / 4 * 0.98 - 0.49, 0.78, 0.0, 0.245, 0.04, 0.7, 0, awnings[i][k % 2], 0.015, -0.35, 0);
      for (let k = 0; k < 3; k++) stall(PRIM.SBALL, (k - 1) * 0.25, 0.37, 0.05, 0.14, 0.14, 0.14, 0, [0xff4d4d, 0xffa62b, 0x8bd650][(k + i) % 3]);   // wares
    }
    LM.clocktower(writer, random, x + Math.sin(ry) * 3.1, z + Math.cos(ry) * 3.1, ry, options);
    return { r: 3.6, square: 3.2 };
  };

  // A tall clock tower with a clock face on each side and a pointed roof with a flag.
  LM.clocktower = (writer, random, x, z, ry, options) => {
    const local = writer.frame(x, writer.sag(x, z), z, ry);
    local(PRIM.BOX, 0, 0, 0, 0.8, 3.4, 0.8, 0, options.towerC || 0xfff2cc, 0.045);
    local(PRIM.BOX, 0, 3.4, 0, 0.95, 0.18, 0.95, 0, 0xe6d3a1, 0.03);
    local(PRIM.BOX, 0, 3.58, 0, 0.75, 0.7, 0.75, 0, options.towerC || 0xfff2cc, 0.035);
    for (let i = 0; i < 4; i++) {                                                                // a clock face and two hands on each side
      const angle = i * Math.PI / 2, sin = Math.sin(angle), cos = Math.cos(angle);
      local(PRIM.DISC, sin * 0.385, 3.92, cos * 0.385, 0.46, 0.46, 1, angle, 0xffffff, 0, Math.PI / 2);
      local(PRIM.QUAD, sin * 0.39, 3.97, cos * 0.39, 0.035, 0.17, 1, angle, 0x222222);
      local(PRIM.QUAD, sin * 0.392, 3.92, cos * 0.392, 0.13, 0.035, 1, angle + 0.0, 0x222222);
    }
    local(PRIM.CONE4, 0, 4.28, 0, 1.1, 1.3, 1.1, Math.PI / 4, options.spire || 0x7b5cff, 0.045);
    local(PRIM.CYL8, 0, 5.55, 0, 0.03, 0.5, 0.03, 0, 0x3a2a20);                                   // flag pole
    local(PRIM.BOX, 0.16, 5.85, 0, 0.32, 0.18, 0.02, 0, 0xff4d6d);
    return { r: 0.9 };
  };

  // A domed palace with four minarets.
  LM.palace = (writer, random, x, z, ry, options) => {
    const local = writer.frame(x, writer.sag(x, z), z, ry), wallColor = 0xfff3dc, domeColor = options.domeC || 0x2fb7c6;
    local(PRIM.BOX, 0, -0.2, 0, 5.2, 0.45, 3.8, 0, 0xe9c58e, 0.04);                                // terrace
    local(PRIM.BOX, 0, 0.25, 0, 4.2, 1.6, 2.8, 0, wallColor, 0.05);                                // main hall
    for (let i = 0; i < 7; i++) local(PRIM.QUAD, (i + 0.5) / 7 * 4.2 - 2.1, 0.95, 1.414, 0.26, 0.6, 1, 0, 0x2a6fa0);
    local(PRIM.QUAD, 0, 0.75, 1.42, 0.7, 1.0, 1, 0, 0x2a2026);                                     // main door
    local(PRIM.CYL16, 0, 1.85, 0, 1.9, 0.6, 1.9, 0, wallColor, 0.04);                              // drum under the dome
    local(PRIM.DOME, 0, 2.4, 0, 2.3, 2.6, 2.3, 0, domeColor, 0.05);
    local(PRIM.CONE8, 0, 3.6, 0, 0.18, 0.8, 0.18, 0, 0xffd23f);                                    // gold spike
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {                                   // minarets
      local(PRIM.CYL12, a * 2.4, 0.2, b * 1.7, 0.42, 4.2, 0.42, 0, wallColor, 0.035);
      local(PRIM.CYL12, a * 2.4, 3.2, b * 1.7, 0.6, 0.1, 0.6, 0, 0xe9c58e, 0.02);
      local(PRIM.DOME, a * 2.4, 4.4, b * 1.7, 0.5, 0.62, 0.5, 0, domeColor, 0.03);
      local(PRIM.CONE8, a * 2.4, 4.7, b * 1.7, 0.08, 0.35, 0.08, 0, 0xffd23f);
    }
    for (const side of [-1, 1]) {                                                                // two small side domes
      local(PRIM.CYL12, side * 1.3, 1.85, 0.8, 0.8, 0.3, 0.8, 0, wallColor, 0.03);
      local(PRIM.DOME, side * 1.3, 2.15, 0.8, 0.9, 0.9, 0.9, 0, domeColor, 0.035);
    }
    return { r: 3.5 };
  };

  // A windmill with four sails, turned to a random angle.
  LM.windmill = (writer, random, x, z, ry, options) => {
    const local = writer.frame(x, writer.sag(x, z), z, ry);
    local(PRIM.CYL12, 0, 0, 0, 1.0, 2.2, 1.0, 0, 0xfff6e6, 0.04);
    local(PRIM.CONE12, 0, 2.2, 0, 1.2, 0.9, 1.2, 0, 0x9a5a3a, 0.04);
    local(PRIM.QUAD, 0, 0.35, 0.47, 0.3, 0.6, 1, 0, DOOR);
    local(PRIM.QUAD, 0, 1.4, 0.47, 0.22, 0.25, 1, 0, GLOW);
    local(PRIM.CYL8, 0, 2.4, 0.5, 0.08, 0.25, 0.08, 0, 0x5a3a28, 0, Math.PI / 2);                   // the axle the sails turn on
    const startAngle = random();
    for (let i = 0; i < 4; i++) {
      const sailAngle = i * Math.PI / 2 + startAngle;
      local(PRIM.BOX, 0, 2.4, 0.72, 0.34, 1.7, 0.03, 0, 0xfffaf0, 0.02, 0, -sailAngle);             // cloth
      local(PRIM.BOX, 0, 2.4, 0.74, 0.05, 1.72, 0.04, 0, 0x7a5233, 0, 0, -sailAngle);               // spar
    }
    return { r: 1.1 };
  };

  // A striped lighthouse with a lamp room and red cap.
  LM.lighthouse = (writer, random, x, z, ry, options) => {
    const local = writer.frame(x, writer.sag(x, z), z, ry);
    local(PRIM.CYL16, 0, -0.2, 0, 1.4, 0.4, 1.4, 0, STONE_DARK, 0.03);
    for (let i = 0; i < 5; i++) local(PRIM.CYL16, 0, 0.2 + i * 0.75, 0, 0.95 - i * 0.07, 0.75, 0.95 - i * 0.07, 0, i % 2 ? 0xff4d4d : 0xffffff, 0.04);   // red and white stripes
    local(PRIM.CYL16, 0, 3.95, 0, 0.85, 0.08, 0.85, 0, 0x333344);                                    // gallery
    local(PRIM.CYL12, 0, 4.03, 0, 0.55, 0.5, 0.55, 0, 0xfff7a8);                                     // lamp room
    local(PRIM.CONE12, 0, 4.53, 0, 0.75, 0.55, 0.75, 0, 0xff4d4d, 0.03);
    return { r: 1 };
  };

  // A brick factory with sawtooth roof and two chimneys. Also returns the chimney tops as `smoke` positions.
  LM.factory = (writer, random, x, z, ry, options) => {
    const local = writer.frame(x, writer.sag(x, z), z, ry), brick = 0xb8574a;
    local(PRIM.BOX, 0, 0, 0, 3.2, 1.3, 2.0, 0, brick, 0.05);
    for (let i = 0; i < 4; i++) local(PRIM.GABLE, (i + 0.5) / 4 * 3.2 - 1.6, 1.3, 0, 0.8, 0.5, 2.05, 0, SLATE, 0.03, 0, 0);   // sawtooth roof
    for (let i = 0; i < 5; i++) local(PRIM.QUAD, (i + 0.5) / 5 * 3.2 - 1.6, 0.7, 1.014, 0.38, 0.6, 1, 0, GLOW);
    const smokeSpots = [];   // where smoke should rise from, in town coordinates
    for (const side of [-1, 1]) {
      local(PRIM.CYL12, side * 1.2, 0, -1.3, 0.45, 3.6, 0.45, 0, brick, 0.035);
      local(PRIM.CYL12, side * 1.2, 3.6, -1.3, 0.55, 0.15, 0.55, 0, 0x3a2a2a, 0.02);
      const cos = Math.cos(ry), sin = Math.sin(ry);
      smokeSpots.push([x + side * 1.2 * cos - 1.3 * sin, writer.sag(x, z) + 3.8, z - side * 1.2 * sin - 1.3 * cos]);
    }
    return { r: 2.3, smoke: smokeSpots };
  };

  // Railway station at the end of the line; the track runs along local z.
  LM.station = (writer, random, x, z, ry, options) => {
    const local = writer.frame(x, writer.sag(x, z), z, ry);
    local(PRIM.BOX, 0.62, 0, 1.4, 0.7, 0.14, 3.0, 0, 0xd8cdb8, 0.03);                              // platform
    for (let i = 0; i < 4; i++) local(PRIM.CYL8, 0.85, 0.14, i * 0.85 + 0.2, 0.06, 0.8, 0.06, 0, 0x3d6fa8);   // canopy posts
    local(PRIM.BOX, 0.62, 0.92, 1.4, 0.95, 0.06, 3.1, 0, 0x3d6fa8, 0.03, 0, 0.12);                  // canopy
    local(PRIM.BOX, 1.6, 0, 1.4, 1.1, 1.05, 2.1, 0, 0xffe2b8, 0.04);                                 // station building
    local(PRIM.HIP, 1.6, 1.05, 1.4, 1.3, 0.6, 2.3, 0, 0xc0503a, 0.04);
    for (let k = 0; k < 3; k++) local(PRIM.QUAD, 1.04, 0.55, (k - 1) * 0.6 + 1.4, 0.22, 0.32, 1, -Math.PI / 2, GLOW);
    local(PRIM.DISC, 1.04, 1.0, 1.4, 0.3, 0.3, 1, -Math.PI / 2, 0xffffff, 0, Math.PI / 2);           // clock
    local(PRIM.BOX, 0, 0, -0.25, 0.9, 0.35, 0.2, 0, 0xc0503a, 0.03);                                // buffer stop
    return { r: 0.5 };
  };

  /* A ring of crenellated walls with round towers and gates. R is the radius; `gates` are the angles where
     the road leaves the town. options.edge(angle) (if present) bends the ring to follow the town's outline. */
  LM.walls = (writer, random, R, gates, options) => {
    const wallColor = options.wallC || 0xd6cbb4, segments = Math.max(14, Math.round(R * 2.6)), wallHeight = 0.95;
    for (let i = 0; i < segments; i++) {
      const angle0 = i / segments * Math.PI * 2, angle1 = (i + 1) / segments * Math.PI * 2, angleMid = (angle0 + angle1) / 2;
      const isGate = gates.some(gateAngle => Math.abs(Math.atan2(Math.sin(angleMid - gateAngle), Math.cos(angleMid - gateAngle))) < Math.PI / segments * 0.99);
      const edge0 = options.edge ? options.edge(angle0) : 1, edge1 = options.edge ? options.edge(angle1) : 1;
      // The two ends of this wall segment, its middle, and its length.
      const x0 = Math.sin(angle0) * R * edge0, z0 = Math.cos(angle0) * R * edge0;
      const x1 = Math.sin(angle1) * R * edge1, z1 = Math.cos(angle1) * R * edge1;
      const midX = (x0 + x1) / 2, midZ = (z0 + z1) / 2, segmentLength = Math.hypot(x1 - x0, z1 - z0);
      const local = writer.frame(midX, writer.sag(midX, midZ), midZ, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2);
      if (isGate) {
        for (const side of [-1, 1]) {                                                              // two gate towers and a lintel
          local(PRIM.CYL12, side * segmentLength * 0.42, 0, 0, 0.7, wallHeight * 1.7, 0.7, 0, wallColor, 0.04);
          local(PRIM.CONE12, side * segmentLength * 0.42, wallHeight * 1.7, 0, 0.9, 0.85, 0.9, 0, options.roofC || 0xc0503a, 0.04);
        }
        local(PRIM.BOX, 0, wallHeight * 1.0, 0, segmentLength * 0.55, wallHeight * 0.55, 0.4, 0, wallColor, 0.04);
        continue;
      }
      local(PRIM.BOX, 0, -0.2, 0, segmentLength + 0.05, wallHeight + 0.2, 0.32, 0, wallColor, 0.035);
      crenels(local, segmentLength, wallHeight, 0, 0.32, wallColor, 0.26);
      if (i % 3 === 0) {                                                                           // a round tower every third segment
        local(PRIM.CYL12, -segmentLength / 2, -0.2, 0, 0.62, wallHeight * 1.45 + 0.2, 0.62, 0, wallColor, 0.04);
        local(PRIM.CYL12, -segmentLength / 2, wallHeight * 1.45, 0, 0.72, 0.16, 0.72, 0, wallColor, 0.03);
      }
    }
  };

  /* ------------------------------------------------------------------------------------------------ one town */
  const STYLES = ['walled', 'castle', 'cathedral', 'market', 'windmills', 'harbour', 'factory', 'palace'];

  /* Lays out a bronze-age style town: a central square, radial streets and a ring road, one or more
     landmarks chosen by `options.style`, houses along the streets, trees in the gaps and lamp posts round the
     square. Returns { houses, streetD, sqR, smoke } for the ground painter. */
  function buildTown(writer, random, options) {
    prims();
    const R = options.R, biome = options.biome, palette = PALETTES[biome] || PALETTES.green, style = options.style;
    const desert = biome === 'desert', savanna = biome === 'savanna';

    // Things already placed, as discs [x, z, radius], so new things don't overlap them.
    const occupied = [];
    const isFree = (x, z, r) => {
      for (const disc of occupied) if ((disc[0] - x) ** 2 + (disc[1] - z) ** 2 < (disc[2] + r) ** 2) return false;
      return true;
    };
    const onLand = (x, z) => options.land(x, z);
    const railNear = (x, z, r) => {
      for (const point of options.rail) if ((point[0] - x) ** 2 + (point[1] - z) ** 2 < r * r) return true;
      return false;
    };

    // street plan: a central square, radial streets and one ring road
    const radialCount = 3 + Math.floor(random() * 3), firstAngle = random() * 6.28, radials = [];
    for (let i = 0; i < radialCount; i++) radials.push(firstAngle + i / radialCount * Math.PI * 2 + (random() - 0.5) * 0.4);
    const ringRadius = R * (0.42 + random() * 0.1), outerRingRadius = R * (0.74 + random() * 0.06);
    const squareRadius = style === 'market' ? 3.3 : 1.7 + R * 0.05;
    // Distance from (x, z) to the nearest street (ring road or radial road). Houses are placed by this.
    const streetD = (x, z) => {
      const r = Math.hypot(x, z), angle = Math.atan2(x, z);
      let distance = Math.min(Math.abs(r - ringRadius), R > 7 ? Math.abs(r - outerRingRadius) : 9);
      for (const radialAngle of radials) {
        const angleDiff = Math.atan2(Math.sin(angle - radialAngle), Math.cos(angle - radialAngle));
        if (Math.abs(angleDiff) < Math.PI / 2) distance = Math.min(distance, Math.abs(Math.sin(angleDiff)) * r + (r < squareRadius ? 9 : 0));
      }
      return distance;
    };

    const landmarkResults = [];
    // Space each landmark kind needs (radius), used to find a free spot.
    const LANDMARK_RADIUS = { church: 2.6, castle: 4.2, market: 3.6, clocktower: 0.9, palace: 3.5, windmill: 1.1, lighthouse: 1, factory: 2.3 };
    // Builds landmark `kind` near (x, z): finds a free, dry spot, trying places round the square if needed.
    // Returns the landmark's result, or null if nowhere fit.
    const placeLandmark = (kind, x, z, ry, extra) => {
      const startRadius = Math.hypot(x, z), startAngle = Math.atan2(x, z);
      const needed = kind === 'church' && extra ? 4.2 : LANDMARK_RADIUS[kind];
      for (let attempt = 0; attempt < 16; attempt++) {
        const angle = startAngle + (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * 0.4;
        const radius = startRadius + (attempt > 9 ? 0.8 : 0);
        const px = Math.sin(angle) * radius, pz = Math.cos(angle) * radius;
        if (!onLand(px, pz) || !isFree(px, pz, needed * 0.9)) continue;
        const result = LM[kind](writer, random, px, pz, ry + (angle - startAngle), options, extra);
        occupied.push([px, pz, result.r]);
        landmarkResults.push(result);
        return result;
      }
      return null;
    };

    occupied.push([0, 0, squareRadius]);                                                          // keep the square open
    for (const point of options.rail) occupied.push([point[0], point[1], 0.75]);                  // and the railway corridor
    if (options.station) {
      for (const station of options.station) {
        if (!onLand(station[0], station[1])) continue;
        LM.station(writer, random, station[0], station[1], station[2], options);
        const cos = Math.cos(station[2]), sin = Math.sin(station[2]);
        for (let k = 0; k <= 3; k++) occupied.push([station[0] + 1.3 * cos + k * sin, station[1] - 1.3 * sin + k * cos, 0.85]);
      }
    }

    // landmark(s)
    const polar = (r, angle) => [Math.sin(angle) * r, Math.cos(angle) * r];                        // point at distance r and compass angle
    const midAngle = (radials[0] + radials[1]) / 2, [landmarkX, landmarkZ] = polar(squareRadius + 2.4, midAngle);
    if (style === 'cathedral') {
      const [cx, cz] = polar(squareRadius + 3.6, midAngle);
      placeLandmark('church', cx, cz, Math.atan2(-cx, -cz), true);
    } else if (style === 'castle') {
      const [cx, cz] = polar(R * 0.62, midAngle);
      placeLandmark('castle', cx, cz, Math.atan2(-cx, -cz));
      placeLandmark('church', ...polar(squareRadius + 2.2, midAngle + Math.PI), Math.atan2(...polar(1, midAngle)), false);
    } else if (style === 'market') {
      occupied.shift();
      LM.market(writer, random, 0, 0, firstAngle, options);
      occupied.push([0, 0, 3.6]);
    } else if (style === 'palace') {
      placeLandmark('palace', landmarkX * 1.2, landmarkZ * 1.2, Math.atan2(-landmarkX, -landmarkZ));
    } else if (style === 'windmills') {
      for (let i = 0; i < 4; i++) {
        const angle = midAngle + i * 1.5 + 0.4, point = polar(R * (0.75 + 0.15 * random()), angle);
        placeLandmark('windmill', point[0], point[1], angle + Math.PI);
      }
      placeLandmark('church', landmarkX, landmarkZ, Math.atan2(-landmarkX, -landmarkZ));
    } else if (style === 'factory') {
      const point = polar(R * 0.6, midAngle);
      placeLandmark('factory', point[0], point[1], Math.atan2(-point[0], -point[1]));
      placeLandmark('clocktower', ...polar(squareRadius + 1.0, midAngle + 2.5), 0);
    } else if (style === 'harbour') {
      const point = polar(R * 0.85, options.seaDir);
      if (onLand(point[0], point[1])) placeLandmark('lighthouse', point[0], point[1], 0);
      placeLandmark('clocktower', ...polar(squareRadius + 1.0, midAngle), 0);
      placeLandmark('church', ...polar(squareRadius + 2.6, midAngle + 2.2), midAngle);
    } else {
      placeLandmark('church', landmarkX, landmarkZ, Math.atan2(-landmarkX, -landmarkZ));
      placeLandmark('clocktower', ...polar(squareRadius + 1.0, midAngle + 2.6), 0);
    }
    const walled = style === 'walled' || style === 'castle' && random() < 0.5;
    const wallRadius = R * 0.92;

    // houses along the streets: first collect candidate spots on a jittered grid, nearest the streets first
    const candidates = [];
    for (let gx = -R; gx <= R; gx += 0.45) for (let gz = -R; gz <= R; gz += 0.45) {
      const jitterX = gx + (random() - 0.5) * 0.4, jitterZ = gz + (random() - 0.5) * 0.4, r = Math.hypot(jitterX, jitterZ);
      const raggedEdge = R * (0.82 + 0.18 * Math.sin(Math.atan2(jitterX, jitterZ) * 3 + options.seed));      // ragged town edge
      if (r > (walled ? wallRadius * options.edge(Math.atan2(jitterX, jitterZ)) - 1.0 : raggedEdge) || r < squareRadius) continue;
      const streetDistance = streetD(jitterX, jitterZ);
      if (streetDistance < 0.55 || streetDistance > 2.4 + (r < ringRadius ? 0 : 1.5)) continue;
      candidates.push([jitterX, jitterZ, streetDistance + r * 0.02 + random() * 0.3]);
    }
    candidates.sort((a, b) => a[2] - b[2]);
    let houses = 0;
    for (const [x, z] of candidates) {
      const width = desert ? 0.9 + random() * 0.5 : 0.85 + random() * 0.55, depth = 0.85 + random() * 0.4;
      const footprintRadius = Math.max(width, depth) * 0.5 + 0.04;
      if (!isFree(x, z, footprintRadius) || !onLand(x, z) || railNear(x, z, 0.9)) continue;
      // face the nearest street: step a little toward lower street distance
      const step = 0.05, gradientX = streetD(x + step, z) - streetD(x - step, z), gradientZ = streetD(x, z + step) - streetD(x, z - step);
      const facing = Math.atan2(-gradientX, -gradientZ);
      occupied.push([x, z, footprintRadius]);
      houses++;
      const r = Math.hypot(x, z), central = 1 - r / R;     // 1 at the centre, 0 at the edge: central houses are taller
      if (savanna && random() < 0.55) {
        roundHut(writer, random, x, z, {
          r: 0.42 + random() * 0.12,
          wall: palette.walls[Math.floor(random() * palette.walls.length)],
          roof: palette.roofs[Math.floor(random() * palette.roofs.length)],
        });
        continue;
      }
      house(writer, random, x, z, facing, {
        w: width, d: depth,
        floors: desert ? 1 + (random() < central ? 1 : 0) : 1 + (random() < 0.25 + central * 0.8 ? 1 : 0) + (random() < central * 0.5 ? 1 : 0),
        wall: palette.walls[Math.floor(random() * palette.walls.length)], roof: palette.roofs[Math.floor(random() * palette.roofs.length)], stone: palette.stone,
        flat: desert, dome: desert && random() < 0.18, domeC: [0xffffff, 0x2fb7c6, 0x4b6bd8][Math.floor(random() * 3)],
        hip: !desert && random() < 0.3, timber: !desert && !savanna && random() < 0.4, timberC: palette.timber,
        shutter: !desert && random() < 0.45 ? [0x3d6fa8, 0x2f8a4a, 0x8a3a52, 0x5a3a28][Math.floor(random() * 4)] : 0,
        flowers: random() < 0.4 ? [0xff4d6d, 0xffd23f, 0xff9ff3][Math.floor(random() * 3)] : 0,
        chimney: random() < 0.7, frame: FRAME, door: [DOOR, 0x3d6fa8, 0x2f8a4a, 0xc0503a][Math.floor(random() * 4)],
      });
    }
    if (walled) {
      const gates = radials.slice();
      LM.walls(writer, random, wallRadius, gates, options);
    }

    // gardens and street trees in the gaps
    for (let i = 0; i < R * R * 1.4; i++) {
      const angle = random() * 6.28, r = squareRadius + random() * (R * 1.05 - squareRadius);
      const x = Math.sin(angle) * r, z = Math.cos(angle) * r;
      if (!isFree(x, z, 0.35) || !onLand(x, z) || streetD(x, z) < 0.5 || railNear(x, z, 0.8) || (walled && Math.abs(r - wallRadius * options.edge(angle)) < 0.6)) continue;
      occupied.push([x, z, 0.35]);
      tree(writer, random, x, z, desert ? 'palm' : random() < 0.35 ? 'pine' : 'round');
    }

    // lamp posts round the square
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * 6.28 + 0.2, x = Math.sin(angle) * (squareRadius - 0.25), z = Math.cos(angle) * (squareRadius - 0.25);
      if (!onLand(x, z)) continue;
      writer.put(PRIM.CYL8, x, writer.sag(x, z), z, 0.05, 0.8, 0.05, 0, 0x2a2a30);
      writer.put(PRIM.SBALL, x, writer.sag(x, z) + 0.82, z, 0.16, 0.16, 0.16, 0, GLOW);
    }
    return { houses, streetD, sqR: squareRadius, smoke: landmarkResults.flatMap(result => result.smoke || []) };
  }

  /* town ground: cobbles on the streets and square, packed earth between, fading out at the edge.
     Writes a coloured, see-through-at-the-edges grid mesh into writer.gnd. `plan` is what the town builder
     returned: either plan.paint(x, z) (farms and cities) or plan.streetD and plan.sqR (towns). */
  function ground(writer, options, plan) {
    const R = options.R * 1.12;
    const cells = Math.ceil(R / (options.age === 'modern' ? 0.4 : options.age === 'space' ? 0.48 : 0.3));   // grid cells from the centre to the edge
    const target = writer.gnd;
    const cobble = col(options.biome === 'desert' ? 0xe3c48f : 0xd9cdb5);
    const cobbleAlt = col(options.biome === 'desert' ? 0xcfae78 : 0xc2b49a);
    const dirt = col(options.biome === 'desert' ? 0xe8cf9c : options.biome === 'savanna' ? 0xc9c27a : 0x9ccf6a);
    const points = [], pointIndex = (i, j) => j * (2 * cells + 1) + i;
    // One colour + opacity per grid point.
    for (let j = -cells; j <= cells; j++) for (let i = -cells; i <= cells; i++) {
      const x = i / cells * R, z = j / cells * R, r = Math.hypot(x, z), onGround = r <= R && options.land(x, z);
      if (plan.paint) {
        const painted = onGround ? plan.paint(x, z, i, j) : null;
        points.push({ x, z, on: onGround, c: painted ? painted[0] : dirt, a: painted ? painted[1] : 0 });
        continue;
      }
      const streetDistance = plan.streetD(x, z);
      const streetAmount = 1 - Math.min(1, Math.max(0, (streetDistance - 0.3) / 0.2));
      const squareAmount = r < plan.sqR ? 1 : 0, paved = Math.max(streetAmount, squareAmount);
      const noise = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;             // cheap hash: checkerboard of two cobble shades
      const cobbleColor = (noise - Math.floor(noise)) < 0.5 ? cobble : cobbleAlt;
      const color = [dirt[0] + (cobbleColor[0] - dirt[0]) * paved, dirt[1] + (cobbleColor[1] - dirt[1]) * paved, dirt[2] + (cobbleColor[2] - dirt[2]) * paved];
      const edgeRadius = options.R * options.edge(Math.atan2(x, z));
      points.push({
        x, z, on: onGround, c: color,
        a: onGround ? Math.max(paved * (r < edgeRadius * 0.95 ? 1 : 0), 1 - Math.min(1, Math.max(0, (r - edgeRadius * 0.7) / (edgeRadius * 0.25)))) : 0,
      });
    }
    const vertex = new THREE.Vector3(), normal = new THREE.Vector3();
    // Adds one vertex (position on the curved ground, upward normal, colour + opacity).
    const pushPoint = point => {
      vertex.set(point.x, writer.sag(point.x, point.z) + 0.07, point.z).applyMatrix4(options.root);
      normal.copy(vertex).normalize();
      target.p.push(vertex.x, vertex.y, vertex.z);
      target.n.push(normal.x, normal.y, normal.z);
      target.c.push(point.c[0], point.c[1], point.c[2], point.a);
    };
    for (let j = 0; j < 2 * cells; j++) for (let i = 0; i < 2 * cells; i++) {
      const a = points[pointIndex(i, j)], b = points[pointIndex(i + 1, j)], c = points[pointIndex(i + 1, j + 1)], d = points[pointIndex(i, j + 1)];
      if (a.a + b.a + c.a + d.a < 0.02) continue;                                       // leave the countryside to the planet texture
      pushPoint(a); pushPoint(c); pushPoint(b); pushPoint(a); pushPoint(d); pushPoint(c);   // two triangles per cell
    }
  }


  /* ------------------------------------------------------------------------------------------------ stone age: farms */

  /* A stone-age farm: patchwork fields (each with its own crop), paths, a longhouse and round huts, a well,
     haystacks, grazing animals, sometimes a stone circle, and trees round the edge.
     Returns { houses, paint, streetD, sqR, smoke } where paint(x, z) colours the ground. */
  function buildFarm(writer, random, options) {
    const R = options.R, land = options.land, occupied = [], desert = options.biome === 'desert', savanna = options.biome === 'savanna';
    const isFree = (x, z, r) => {
      for (const disc of occupied) if ((disc[0] - x) ** 2 + (disc[1] - z) ** 2 < (disc[2] + r) ** 2) return false;
      return true;
    };
    const CROP_TYPES = desert ? ['date', 'fallow', 'ploughed', 'millet'] : savanna ? ['millet', 'ploughed', 'grass', 'wheat'] : ['wheat', 'grass', 'ploughed', 'grass', 'flax', 'wheat'];
    // Two colours per crop: [ground colour of the field, colour of the crop rows].
    const CROP_COLORS = { wheat: [0xf2cf5b, 0xd9b03a], grass: [0x8fd65a, 0x6fbf45], ploughed: [0xa8784a, 0x8a5e36], flax: [0x9fb6ff, 0x7c95e8], millet: [0xe0c27a, 0xc9a35a], fallow: [0xd9c99a, 0xc4b07a], date: [0xd9c48a, 0xbfa76a] };

    // 16 fields at random spots, each with a crop type and a direction its rows run in.
    const fields = [];
    for (let i = 0; i < 16; i++) {
      const angle = random() * 6.28, r = Math.sqrt(random()) * R * 0.9;
      fields.push({ x: Math.sin(angle) * r, z: Math.cos(angle) * r, t: CROP_TYPES[Math.floor(random() * CROP_TYPES.length)], ang: random() * Math.PI });
    }
    // Which field is nearest to (x, z), and how much closer it is than the second nearest (small = near a field boundary).
    const nearestFields = (x, z) => {
      let nearest = 1e9, second = 1e9, nearestIndex = 0;
      fields.forEach((field, index) => {
        const distanceSquared = (field.x - x) ** 2 + (field.z - z) ** 2;
        if (distanceSquared < nearest) { second = nearest; nearest = distanceSquared; nearestIndex = index; }
        else if (distanceSquared < second) second = distanceSquared;
      });
      return [nearestIndex, Math.sqrt(second) - Math.sqrt(nearest)];
    };
    // Three paths leaving the farmstead; distance from (x, z) to the nearest path.
    const pathAngles = [random() * 6.28];
    pathAngles.push(pathAngles[0] + 2.2 + random(), pathAngles[0] + 4.1 + random());
    const pathD = (x, z) => {
      const r = Math.hypot(x, z), angle = Math.atan2(x, z);
      let distance = 9;
      for (const pathAngle of pathAngles) {
        const angleDiff = Math.atan2(Math.sin(angle - pathAngle), Math.cos(angle - pathAngle));
        if (Math.abs(angleDiff) < 1.5) distance = Math.min(distance, Math.abs(Math.sin(angleDiff)) * r);
      }
      return distance;
    };
    const farmyardRadius = 2.0;
    // Ground colour at (x, z): [colour, opacity], or null outside the farm.
    const paint = (x, z) => {
      const r = Math.hypot(x, z);
      if (r > R * 1.05) return null;
      if (r < farmyardRadius) return [col(desert ? 0xe8cf9c : 0xb9a37a), 1];
      if (pathD(x, z) < 0.3) return [col(0xc9ae7e), 1];
      const [fieldIndex, gap] = nearestFields(x, z), field = fields[fieldIndex];
      if (gap < 0.28 && !desert) return [col(0x3f8a3a), 1];                     // hedges between fields
      return [col(CROP_COLORS[field.t][0]), 1 - Math.max(0, (r - R * 0.85) / (R * 0.2))];
    };
    occupied.push([0, 0, 0.6]);

    // crop rows: thin darker strips lying on each field
    for (const [fieldIndex, field] of fields.entries()) {
      if (field.t === 'grass' || field.t === 'fallow') continue;
      const rowCos = Math.cos(field.ang), rowSin = Math.sin(field.ang);
      for (let k = -8; k <= 8; k++) for (let m = -8; m <= 8; m++) {
        const x = field.x + k * 0.42 * rowCos - m * 0.55 * rowSin, z = field.z + k * 0.42 * rowSin + m * 0.55 * rowCos, r = Math.hypot(x, z);
        if (r < farmyardRadius + 0.3 || r > R * 0.98 || nearestFields(x, z)[0] !== fieldIndex || nearestFields(x, z)[1] < 0.45 || pathD(x, z) < 0.45 || !land(x, z)) continue;
        if (field.t === 'date') {                                                // date fields get a palm every third spot instead of rows
          if ((k + m) % 3 === 0) { occupied.push([x, z, 0.3]); tree(writer, random, x, z, 'palm'); }
          continue;
        }
        writer.put(PRIM.QUAD, x, writer.sag(x, z) + 0.09, z, 0.5, 0.13, 1, -field.ang + Math.PI / 2, CROP_COLORS[field.t][1], 0, -Math.PI / 2);
      }
    }

    // the farmstead: a longhouse or two, round huts, haystacks, a well, a little fence
    const buildingCount = 2 + Math.floor(random() * 3);
    for (let i = 0; i < buildingCount; i++) {
      const angle = i / buildingCount * 6.28 + random() * 0.5, r = 1.0 + random() * 0.5, x = Math.sin(angle) * r, z = Math.cos(angle) * r;
      if (!land(x, z)) continue;
      occupied.push([x, z, 0.8]);
      if (i === 0 && !desert) {                                                  // the first building is a longhouse
        const local = writer.frame(x, writer.sag(x, z), z, angle + Math.PI / 2);
        local(PRIM.BOX, 0, -0.2, 0, 1.0, 0.85, 2.2, 0, 0x8a6a4a, 0.04);
        local(PRIM.GABLE, 0, 0.6, 0, 1.6, 1.05, 2.5, 0, 0xd9b65a, 0.045);
        local(PRIM.QUAD, 0, 0.3, 1.112, 0.3, 0.5, 1, 0, 0x3a2418);               // door
        local(PRIM.QUAD, 0.3, 0.42, 1.112, 0.16, 0.16, 1, 0, GLOW);              // window
      } else {
        roundHut(writer, random, x, z, { r: 0.45 + random() * 0.1, wall: desert ? 0xe8cf9c : 0xa8825a, roof: 0xd9b65a });
      }
    }
    // the well: stone ring, water, two posts and a little roof
    const well = [Math.sin(pathAngles[0] + 1) * 0.3, Math.cos(pathAngles[0] + 1) * 0.3];
    writer.put(PRIM.CYL12, well[0], writer.sag(0, 0) - 0.1, well[1], 0.5, 0.4, 0.5, 0, 0xa59a8a, 0.03);
    writer.put(PRIM.DISC, well[0], writer.sag(0, 0) + 0.31, well[1], 0.36, 1, 0.36, 0, 0x3a6aa0);
    for (const side of [-1, 1]) writer.put(PRIM.BOX, well[0] + side * 0.22, writer.sag(0, 0) + 0.3, well[1], 0.05, 0.5, 0.05, 0, 0x6b4423);
    writer.put(PRIM.GABLE, well[0], writer.sag(0, 0) + 0.78, well[1], 0.6, 0.25, 0.4, Math.PI / 2, 0xd9b65a, 0.02);
    for (let i = 0; i < 5; i++) {                                                    // haystacks
      const angle = random() * 6.28, r = farmyardRadius + 0.4 + random() * R * 0.5, x = Math.sin(angle) * r, z = Math.cos(angle) * r;
      if (!land(x, z) || !isFree(x, z, 0.4) || pathD(x, z) < 0.4) continue;
      occupied.push([x, z, 0.4]);
      writer.put(PRIM.CYL12, x, writer.sag(x, z) - 0.05, z, 0.6, 0.35, 0.6, 0, 0xe6c35a, 0.03);
      writer.put(PRIM.DOME, x, writer.sag(x, z) + 0.3, z, 0.6, 0.55, 0.6, 0, 0xf0d070, 0.03);
    }

    // animals grazing on the grass: cows (white with black patches) and sheep
    for (let i = 0; i < 24; i++) {
      const angle = random() * 6.28, r = farmyardRadius + random() * (R * 0.95 - farmyardRadius);
      const x = Math.sin(angle) * r, z = Math.cos(angle) * r, [fieldIndex] = nearestFields(x, z);
      if (fields[fieldIndex].t !== 'grass' && fields[fieldIndex].t !== 'fallow' && random() < 0.85) continue;
      if (!land(x, z) || !isFree(x, z, 0.3)) continue;
      occupied.push([x, z, 0.3]);
      const local = writer.frame(x, writer.sag(x, z), z, random() * 6.28), isCow = random() < 0.4;
      if (isCow) {
        local(PRIM.BOX, 0, 0.18, 0, 0.26, 0.24, 0.5, 0, 0xffffff, 0.02);        // body
        local(PRIM.BOX, 0.0, 0.2, 0.05, 0.27, 0.12, 0.18, 0, 0x2a2a2a);          // patch
        local(PRIM.BOX, 0, 0.28, 0.3, 0.16, 0.16, 0.18, 0, 0x2a2a2a, 0.015);     // head
        for (const [legX, legZ] of [[-0.09, -0.18], [0.09, -0.18], [-0.09, 0.18], [0.09, 0.18]]) local(PRIM.BOX, legX, 0, legZ, 0.05, 0.18, 0.05, 0, 0x2a2a2a);
      } else {
        local(PRIM.BALL, 0, 0.12, 0, 0.36, 0.28, 0.44, 0, 0xfbfbf3, 0.02);       // woolly body
        local(PRIM.SBALL, 0, 0.18, 0.22, 0.14, 0.15, 0.16, 0, 0x2a2a2a);         // dark face
      }
    }

    // a stone circle on the hill for some villages
    if (options.seed % 3 === 0) {
      const angle = pathAngles[0] + 3.1, circleX = Math.sin(angle) * R * 0.75, circleZ = Math.cos(angle) * R * 0.75;
      if (land(circleX, circleZ)) {
        for (let i = 0; i < 9; i++) {
          const stoneAngle = i / 9 * 6.28, x = circleX + Math.sin(stoneAngle) * 1.1, z = circleZ + Math.cos(stoneAngle) * 1.1;
          writer.put(PRIM.BOX, x, writer.sag(x, z) - 0.1, z, 0.28, 0.75 + (i % 2) * 0.2, 0.18, stoneAngle, 0x9a9488, 0.025);
        }
      }
    }

    // a few trees round the edge
    for (let i = 0; i < 14; i++) {
      const angle = random() * 6.28, r = R * (0.85 + random() * 0.2), x = Math.sin(angle) * r, z = Math.cos(angle) * r;
      if (!land(x, z) || !isFree(x, z, 0.4)) continue;
      occupied.push([x, z, 0.4]);
      tree(writer, random, x, z, desert ? 'palm' : random() < 0.4 ? 'pine' : 'round');
    }
    return { houses: buildingCount, paint, streetD: pathD, sqR: 0, smoke: [] };
  }

  /* ------------------------------------------------------------------------------------------------ modern + space age: sprawling cities */
  const GLASS = [0x7fc8f8, 0x9fe3ff, 0x6aa8e8, 0x8ff0e0, 0xb5c9ff], TOWER_COLORS = [0xdfe6ee, 0xc9d3dd, 0xf2f4f7, 0x9aa8b8, 0xe9e1d3, 0x5f6f82];

  /* A skyscraper w x d x h. In the space age (`space`) some are round with glowing bands. Windows are stacked
     quads on each face; some have a set-back crown, antenna or helipad. */
  function tower(writer, random, x, z, ry, width, depth, height, space) {
    const local = writer.frame(x, writer.sag(x, z), z, ry);
    const body = TOWER_COLORS[Math.floor(random() * TOWER_COLORS.length)], glass = GLASS[Math.floor(random() * GLASS.length)];
    const isRound = space && random() < 0.45;
    if (isRound) {
      const diameter = Math.min(width, depth);
      local(PRIM.CYL16, 0, -0.2, 0, diameter, height + 0.2, diameter, 0, 0xf4f8fb, 0.05);
      for (let k = 1; k * 1.4 < height; k++) local(PRIM.TUBE16, 0, k * 1.4, 0, diameter * 1.03, 0.5, diameter * 1.03, 0, k % 3 === 0 ? 0x5ff6ff : glass);   // window bands
      local(PRIM.DOME, 0, height, 0, diameter, diameter * 0.55, diameter, 0, 0x5ff6ff, 0.04);
      local(PRIM.CYL8, 0, height + diameter * 0.5, 0, 0.05, 1.4, 0.05, 0, 0xffffff);              // antenna
      local(PRIM.SBALL, 0, height + diameter * 0.5 + 1.4, 0, 0.14, 0.14, 0.14, 0, 0xff5a5a);
      return;
    }
    local(PRIM.BOX, 0, -0.2, 0, width, height + 0.2, depth, 0, body, 0.05);
    // window strips on the four faces: [x offset, z offset, face length, rotation]
    for (const [faceX, faceZ, faceLength, faceRotation] of [[0, depth / 2 + 0.012, width, 0], [0, -depth / 2 - 0.012, width, Math.PI], [width / 2 + 0.012, 0, depth, Math.PI / 2], [-width / 2 - 0.012, 0, depth, -Math.PI / 2]]) {
      const strips = Math.max(2, Math.round(faceLength / 0.36));
      const alongX = faceRotation === 0 || Math.abs(faceRotation - Math.PI) < 0.1;      // front/back faces run along x, side faces along z
      for (let i = 0; i < strips; i++) {
        const along = (i + 0.5) / strips * faceLength - faceLength / 2;
        local(PRIM.QUAD, faceX + (alongX ? along : 0), height / 2 + 0.1, faceZ + (alongX ? 0 : along), faceLength / strips * 0.62, height - 0.3, 1, faceRotation, glass);
      }
    }
    for (let k = 3; k < height - 0.5; k += 3) local(PRIM.BOX, 0, k, 0, width + 0.08, 0.1, depth + 0.08, 0, body);   // ledges
    if (space) for (let k = 2; k < height; k += 4) local(PRIM.BOX, 0, k, 0, width + 0.1, 0.07, depth + 0.1, 0, 0x5ff6ff);   // glowing bands
    if (height > 4 && random() < 0.6) {                                                       // a set-back crown
      const crownHeight = 0.8 + random() * 1.6;
      local(PRIM.BOX, 0, height, 0, width * 0.68, crownHeight, depth * 0.68, 0, body, 0.04);
      for (const faceRotation of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        local(PRIM.QUAD, Math.sin(faceRotation) * (width * 0.34 + 0.012), height + crownHeight / 2, Math.cos(faceRotation) * (depth * 0.34 + 0.012), width * 0.5, crownHeight * 0.7, 1, faceRotation, glass);
      }
      if (random() < 0.7) {                                                                     // antenna with a red light
        local(PRIM.CYL8, 0, height + crownHeight, 0, 0.06, 1.2 + (space ? 1.2 : 0), 0.06, 0, 0xdddddd);
        local(PRIM.SBALL, 0, height + crownHeight + 1.2 + (space ? 1.2 : 0), 0, 0.13, 0.13, 0.13, 0, 0xff4a4a);
      }
      if (space && random() < 0.5) local(PRIM.CONE8, 0, height + crownHeight, 0, width * 0.5, 2.2, depth * 0.5, 0, 0xe8f4ff, 0.04);
    } else {                                                                                    // roof plant, helipad
      local(PRIM.BOX, width * 0.2, height, -depth * 0.15, 0.4, 0.3, 0.3, 0, 0x8a96a5);
      if (random() < 0.4) local(PRIM.CYL12, -width * 0.15, height, depth * 0.15, 0.6, 0.06, 0.6, 0, 0xffd23f);
    }
  }

  // A low apartment block with rows of window strips on the front and back, balconies and a roof kit.
  function slab(writer, random, x, z, ry, width, depth, height, space) {
    const local = writer.frame(x, writer.sag(x, z), z, ry);
    const body = space ? [0xf4f8fb, 0xe0f0f4, 0xdff7ee][Math.floor(random() * 3)] : [0xf2e6d2, 0xe8d9c4, 0xd7dde8, 0xf0d6c6, 0xdfe8d4, 0xc9b8a8][Math.floor(random() * 6)];
    local(PRIM.BOX, 0, -0.2, 0, width, height + 0.2, depth, 0, body, 0.045);
    for (let k = 0; k + 0.6 <= height; k += 0.62) for (const side of [1, -1]) {
      local(PRIM.QUAD, 0, k + 0.35, side * (depth / 2 + 0.012), width * 0.86, 0.26, 1, side > 0 ? 0 : Math.PI, space ? 0x8ff0e0 : random() < 0.2 ? GLOW : PANE);
      if (!space && side > 0 && k > 0) local(PRIM.BOX, 0, k + 0.02, depth / 2 + 0.08, width * 0.86, 0.06, 0.16, 0, 0xffffff);   // balcony
    }
    local(PRIM.BOX, width * 0.2, height, 0, 0.35, 0.25, 0.3, 0, 0x9aa3ad);                          // roof kit
    if (random() < 0.4) local(PRIM.BOX, -width * 0.25, height, 0, width * 0.3, 0.05, depth * 0.6, 0, 0x2f4f7f);   // solar panels
  }

  // A small suburban house with a hip roof, and sometimes a car in the drive.
  function suburb(writer, random, x, z, ry, palette) {
    const local = writer.frame(x, writer.sag(x, z), z, ry), width = 0.85, depth = 0.7;
    const wall = palette.walls[Math.floor(random() * palette.walls.length)];
    local(PRIM.BOX, 0, -0.2, 0, width, 0.85, depth, 0, wall, 0.04);
    local(PRIM.HIP, 0, 0.65, 0, width + 0.2, 0.45, depth + 0.2, 0, palette.roofs[Math.floor(random() * palette.roofs.length)], 0.04);
    local(PRIM.QUAD, -0.22, 0.32, depth / 2 + 0.012, 0.25, 0.22, 1, 0, PANE);                      // window
    local(PRIM.QUAD, 0.2, 0.25, depth / 2 + 0.012, 0.2, 0.4, 1, 0, DOOR);
    if (random() < 0.5) local(PRIM.BOX, -0.25, 0.0, depth / 2 + 0.22, 0.3, 0.14, 0.2, Math.PI / 2, [0xff4d4d, 0x3d6fa8, 0xffd23f, 0xffffff][Math.floor(random() * 4)], 0.012);   // car in the drive
  }

  /* A modern (or, with `space`, futuristic) city on a square street grid rotated by a random angle:
     skyscrapers in the core, apartment slabs further out, suburbs round the edge, parks, cars, and the old
     town's landmark preserved in the middle. Returns { houses, paint, streetD, sqR, smoke }. */
  function buildMetro(writer, random, options, space) {
    prims();
    const R = options.R, land = options.land, palette = PALETTES[options.biome] || PALETTES.green, occupied = [];
    const isFree = (x, z, r) => {
      for (const disc of occupied) if ((disc[0] - x) ** 2 + (disc[1] - z) ** 2 < (disc[2] + r) ** 2) return false;
      return true;
    };
    const blockSize = space ? 3.0 : 3.2, roadHalfWidth = 0.5;
    const gridAngle = random() * Math.PI, gridCos = Math.cos(gridAngle), gridSin = Math.sin(gridAngle);
    // Convert between town coordinates (x, z) and grid coordinates (u, v), where streets are at multiples of blockSize.
    const toGrid = (x, z) => [x * gridCos - z * gridSin, x * gridSin + z * gridCos];
    const fromGrid = (u, v) => [u * gridCos + v * gridSin, -u * gridSin + v * gridCos];
    const ringRadius = R * 0.88;
    // Distance from (x, z) to the nearest street centre line.
    const streetD = (x, z) => {
      const [u, v] = toGrid(x, z);
      const fromBlockCentreU = Math.abs(((u % blockSize) + blockSize) % blockSize - blockSize / 2);
      const fromBlockCentreV = Math.abs(((v % blockSize) + blockSize) % blockSize - blockSize / 2);
      return Math.min(blockSize / 2 - fromBlockCentreU, blockSize / 2 - fromBlockCentreV);
    };
    for (const point of options.rail) occupied.push([point[0], point[1], 0.8]);
    if (options.station) {
      for (const station of options.station) {
        if (!land(station[0], station[1])) continue;
        LM.station(writer, random, station[0], station[1], station[2], options);
        const cos = Math.cos(station[2]), sin = Math.sin(station[2]);
        for (let k = 0; k <= 3; k++) occupied.push([station[0] + 1.3 * cos + k * sin, station[1] - 1.3 * sin + k * cos, 0.85]);
      }
    }

    // the old town survives in the middle: its landmark, in a little park
    const heritage = { cathedral: ['church', true], castle: ['castle'], palace: ['palace'], market: ['clocktower'], walled: ['church'], windmills: ['windmill'], harbour: ['lighthouse'], factory: ['factory'] }[options.style] || ['church'];
    if (land(0, 0)) {
      const result = LM[heritage[0]](writer, random, 0, 0, gridAngle, options, heritage[1]);
      occupied.push([0, 0, result.r + 0.4]);
    }
    const coreRadius = R * (space ? 0.5 : 0.32), midRadius = R * (space ? 0.8 : 0.62), maxTowerHeight = space ? 10.5 : 7, parks = [];
    let houses = 0;
    const blocksEachWay = Math.ceil(R / blockSize) + 1;
    for (let i = -blocksEachWay; i <= blocksEachWay; i++) for (let j = -blocksEachWay; j <= blocksEachWay; j++) {
      const [centerX, centerZ] = fromGrid((i + 0.5) * blockSize, (j + 0.5) * blockSize), r = Math.hypot(centerX, centerZ);
      if (r > ringRadius - 0.6 || !land(centerX, centerZ)) continue;
      const inner = blockSize - 2 * roadHalfWidth - 0.2;         // the buildable width of a block
      const randomHeight = (random() + random()) / 2, centrality = 1 - r / R, rotation = gridAngle;
      if (random() < 0.08 || (!isFree(centerX, centerZ, inner * 0.45))) {                         // a park (or the old town)
        parks.push([centerX, centerZ]);
        for (let t = 0; t < 4; t++) {
          const [px, pz] = fromGrid((i + 0.25 + random() * 0.5) * blockSize, (j + 0.25 + random() * 0.5) * blockSize);
          if (isFree(px, pz, 0.35) && land(px, pz)) {
            occupied.push([px, pz, 0.35]);
            tree(writer, random, px, pz, options.biome === 'desert' ? 'palm' : 'round');
          }
        }
        continue;
      }
      if (r < coreRadius) {                                          // downtown: one or two towers per block
        const towerCount = random() < 0.5 ? 1 : 2;
        for (let t = 0; t < towerCount; t++) {
          const width = towerCount === 1 ? inner * (0.55 + random() * 0.3) : inner * 0.42;
          const depth = towerCount === 1 ? width * (0.8 + random() * 0.3) : inner * (0.5 + random() * 0.35);
          const [px, pz] = towerCount === 1 ? [centerX, centerZ] : fromGrid((i + 0.5) * blockSize + (t ? 1 : -1) * inner * 0.25, (j + 0.5) * blockSize);
          const towerHeight = 3 + (maxTowerHeight - 3) * Math.pow(centrality * 0.6 + randomHeight * 0.6, 1.3);
          if (!isFree(px, pz, Math.max(width, depth) * 0.5)) continue;
          tower(writer, random, px, pz, rotation, width, depth, Math.min(maxTowerHeight, towerHeight), space);
          houses++;
        }
      } else if (r < midRadius) {                                    // middle ring: two apartment slabs per block
        for (const side of [-1, 1]) {
          const [px, pz] = fromGrid((i + 0.5) * blockSize, (j + 0.5) * blockSize + side * inner * 0.25);
          if (!land(px, pz) || !isFree(px, pz, 0.6)) continue;
          slab(writer, random, px, pz, rotation + (side > 0 ? 0 : Math.PI), inner * 0.9, inner * 0.36, 1.3 + randomHeight * (space ? 3.8 : 2.6), space);
          houses++;
        }
      } else {                                                       // outskirts: four small buildings per block
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const [px, pz] = fromGrid((i + 0.5) * blockSize + a * inner * 0.25, (j + 0.5) * blockSize + b * inner * 0.25);
          if (!land(px, pz) || !isFree(px, pz, 0.45)) continue;
          if (space) slab(writer, random, px, pz, rotation + (b > 0 ? 0 : Math.PI), inner * 0.42, inner * 0.38, 0.7 + random() * 0.8, true);
          else suburb(writer, random, px, pz, rotation + (b > 0 ? 0 : Math.PI), palette);
          houses++;
        }
      }
    }

    // cars and lane markings on the roads
    const carColors = [0xff4d4d, 0x3d6fa8, 0xffd23f, 0xffffff, 0x2a2a2a, 0x7ed957, 0xff9f43];
    for (let i = -blocksEachWay; i <= blocksEachWay; i++) for (let j = -blocksEachWay; j <= blocksEachWay; j++) for (const horizontal of [0, 1]) {
      for (let t = 0.15; t < 0.9; t += 0.25) {
        const [x, z] = horizontal ? fromGrid((i + t) * blockSize, j * blockSize) : fromGrid(i * blockSize, (j + t) * blockSize), r = Math.hypot(x, z);
        if (r > ringRadius || !land(x, z) || !isFree(x, z, 0.1)) continue;
        writer.put(PRIM.QUAD, x, writer.sag(x, z) + 0.085, z, 0.06, 0.3, 1, gridAngle + (horizontal ? Math.PI / 2 : 0), 0xffffff, 0, -Math.PI / 2);   // lane dash
        if (random() < (space ? 0.15 : 0.35)) {
          const side = random() < 0.5 ? 1 : -1, offsetX = horizontal ? 0 : side * 0.16, offsetZ = horizontal ? side * 0.16 : 0;
          const [carDx, carDz] = fromGrid(offsetX, offsetZ);
          if (space) writer.put(PRIM.BALL, x + carDx, writer.sag(x, z) + 0.25, z + carDz, 0.24, 0.1, 0.4, gridAngle + (horizontal ? Math.PI / 2 : 0), 0x9ff6ff, 0.01);   // hover car
          else writer.put(PRIM.BOX, x + carDx, writer.sag(x, z) + 0.05, z + carDz, 0.18, 0.14, 0.36, gridAngle + (horizontal ? Math.PI / 2 : 0), carColors[Math.floor(random() * carColors.length)], 0.012);
        }
      }
    }

    // ground colours for the ground() painter: road, kerb, park grass, pavement
    const asphalt = col(space ? 0x55606e : 0x6a6e78), pavement = col(space ? 0xe6eef2 : 0xcfc9bd);
    const grass = col(options.biome === 'desert' ? 0xe0c48a : 0x7cc455), kerb = col(space ? 0xbfe9f0 : 0xb5afa3);
    // Ground colour at (x, z): [colour, opacity], or null outside the city.
    const paint = (x, z) => {
      const r = Math.hypot(x, z);
      if (r > R * 1.02) return null;
      const edgeRadius = R * options.edge(Math.atan2(x, z)), streetDistance = streetD(x, z);
      const fade = 1 - Math.min(1, Math.max(0, (r - (edgeRadius - blockSize * 0.9)) / (blockSize * 0.9)));
      if (fade <= 0) return null;
      if (streetDistance < roadHalfWidth * 0.75) return [asphalt, Math.max(0.3, fade)];
      if (streetDistance < roadHalfWidth) return [kerb, fade];
      for (const park of parks) if (Math.abs(park[0] - x) < blockSize / 2 && Math.abs(park[1] - z) < blockSize / 2) return [grass, fade];
      return [r < midRadius ? pavement : grass, fade];
    };
    return { houses, paint, streetD, sqR: 0, smoke: [] };
  }

  /* Entry point: builds one town. `threeLib` is the three.js library; `options` has root (matrix placing the
     town), sagK, R (radius), biome, style, seed, age ('stone' | other | 'modern' | 'space'), land(x, z),
     rail, station, seaDir, flag, flag2.
     Returns { geo, ink, ground, houses, smoke }: geometries for the buildings, their outlines and the ground,
     the house count, and the chimney positions for smoke. */
  function build(threeLib, options) {
    THREE = threeLib;
    prims();
    // The seeded random generator for this town (mulberry32). Same seed, same town.
    let randomState = options.seed >>> 0 || 1;
    const random = () => {
      randomState = (randomState + 0x6D2B79F5) | 0;
      let mixed = Math.imul(randomState ^ (randomState >>> 15), 1 | randomState);
      mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };

    // every town gets its own outline: a lumpy, stretched blob instead of a circle
    const harmonics = [];   // [wave count, strength, phase] for six sine waves that bend the circle
    for (let k = 1; k <= 6; k++) harmonics.push([k, (k === 2 ? 0.16 : 0.09) * random() / Math.sqrt(k), random() * 6.283]);
    const rawOutline = angle => {
      let radius = 1;
      for (const [waves, strength, phase] of harmonics) radius += strength * Math.cos(waves * angle + phase);
      return radius;
    };
    let outlineMax = 0, outlineMin = 9;
    for (let i = 0; i < 360; i++) {
      const value = rawOutline(i / 360 * 6.283);
      outlineMax = Math.max(outlineMax, value);
      outlineMin = Math.min(outlineMin, value);
    }
    // Town radius at an angle, as a share of the full radius: 0.62 .. 1.
    const edge = angle => 0.62 + 0.38 * (rawOutline(angle) - outlineMin) / (outlineMax - outlineMin + 1e-9);
    const originalLand = options.land, townRadius = options.R;
    options = Object.assign({}, options, {
      edge,
      land: (x, z) => Math.hypot(x, z) <= townRadius * edge(Math.atan2(x, z)) && originalLand(x, z),   // land test limited to the town outline
    });

    const writer = makeWriter(options.root, options.sagK);
    writer.prim = PRIM;
    writer.gnd = new MeshData();
    const plan = options.age === 'stone' ? buildFarm(writer, random, options)
      : options.age === 'modern' ? buildMetro(writer, random, options, false)
      : options.age === 'space' ? buildMetro(writer, random, options, true)
      : buildTown(writer, random, options);
    ground(writer, options, plan);

    const groundGeometry = new THREE.BufferGeometry();
    groundGeometry.setAttribute('position', new THREE.Float32BufferAttribute(writer.gnd.p, 3));
    groundGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(writer.gnd.n, 3));
    groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(writer.gnd.c, 4));   // 4 channels: colour + opacity
    groundGeometry.computeBoundingSphere();
    return { geo: toGeometry(writer.out), ink: toGeometry(writer.ink), ground: groundGeometry, houses: plan.houses, smoke: plan.smoke };
  }

  root.CityGen = { build, STYLES };
})(typeof window !== 'undefined' ? window : globalThis);
