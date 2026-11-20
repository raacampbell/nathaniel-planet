/* Towns for Nathaniel Planet. Each town gets its own personality: walls, a castle, a cathedral, a market square,
   a domed palace, windmills, a lighthouse, factories... built from small primitives and merged into one
   vertex-coloured mesh (+ one ink-outline mesh) per town. Units: 1 = one small house wide. */
(function (root) {
  'use strict';
  let T = null, PRIM = null;
  const C = {};                                  // hex -> [r,g,b]
  const col = h => C[h] || (C[h] = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]);

  function prims() {
    if (PRIM) return PRIM;
    const flat = g => { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); return g; };
    const keep = g => (g.index ? g.toNonIndexed() : g);
    const raw = (pos) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
    const pack = g => ({ p: g.attributes.position.array, n: g.attributes.normal.array });
    // box with base at y=0, no bottom face
    const box = new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); const bx = keep(box);
    const bp = [], bn = [];
    for (let i = 0; i < bx.attributes.position.count; i++) { if (bx.attributes.normal.getY(i) < -0.5) continue; bp.push(bx.attributes.position.getX(i), bx.attributes.position.getY(i), bx.attributes.position.getZ(i)); bn.push(bx.attributes.normal.getX(i), bx.attributes.normal.getY(i), bx.attributes.normal.getZ(i)); }
    const BOX = { p: new Float32Array(bp), n: new Float32Array(bn) };
    // gable prism: eaves along x, ridge along z (at y=1)
    const A = [-.5, 0, -.5], B = [.5, 0, -.5], Cc = [.5, 0, .5], D = [-.5, 0, .5], E = [0, 1, -.5], F = [0, 1, .5];
    const tri = (...v) => v.flat();
    const GABLE = pack(raw(tri(D, Cc, F, A, E, B,  /* gables */ D, F, E, D, E, A,  /* left slope */ Cc, B, E, Cc, E, F /* right slope */)));
    // hip roof (4-sided pyramid), apex at y=1
    const P0 = [0, 1, 0];
    const HIP = pack(raw(tri(D, Cc, P0, Cc, B, P0, B, A, P0, A, D, P0)));
    // quad facing +z (for windows, doors, signs), centred, in the xy plane
    const QUAD = pack(raw(tri([-.5, -.5, 0], [.5, -.5, 0], [.5, .5, 0], [-.5, -.5, 0], [.5, .5, 0], [-.5, .5, 0])));
    const cyl = n => pack(keep(new T.CylinderGeometry(0.5, 0.5, 1, n, 1, true).translate(0, 0.5, 0)));
    const cylC = n => pack(keep(new T.CylinderGeometry(0.5, 0.5, 1, n).translate(0, 0.5, 0)));
    const cone = n => pack(keep(new T.ConeGeometry(0.5, 1, n, 1, true).translate(0, 0.5, 0)));
    const dome = pack(keep(new T.SphereGeometry(0.5, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2)));
    const ball = pack(keep(new T.SphereGeometry(0.5, 10, 7)));
    const disc = pack(keep(new T.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2)));
    PRIM = { BOX, GABLE, HIP, QUAD, CYL8: cylC(8), CYL12: cylC(12), CYL16: cylC(16), TUBE16: cyl(16), CONE4: cone(4), CONE8: cone(8), CONE12: cone(12), CONE16: cone(16), DOME: dome, BALL: ball, DISC: disc };
    return PRIM;
  }

  /* accumulates transformed primitives into flat arrays */
  function Acc() { this.p = []; this.n = []; this.c = []; }
  const _m = () => new T.Matrix4(), _nm = () => new T.Matrix3();
  function makeWriter(root, sagK) {
    const out = new Acc(), ink = new Acc(), M = _m(), L = _m(), NM = _nm(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), pv = new T.Vector3(), v = new T.Vector3();
    const emit = (A, pr, mat, rgb) => {
      NM.getNormalMatrix(mat);
      const P = pr.p, N = pr.n, me = mat.elements, ne = NM.elements;
      for (let i = 0; i < P.length; i += 3) {
        const x = P[i], y = P[i + 1], z = P[i + 2];
        A.p.push(me[0] * x + me[4] * y + me[8] * z + me[12], me[1] * x + me[5] * y + me[9] * z + me[13], me[2] * x + me[6] * y + me[10] * z + me[14]);
        const a = N[i], b = N[i + 1], c = N[i + 2];
        let nx = ne[0] * a + ne[3] * b + ne[6] * c, ny = ne[1] * a + ne[4] * b + ne[7] * c, nz = ne[2] * a + ne[5] * b + ne[8] * c;
        const l = Math.hypot(nx, ny, nz) || 1; A.n.push(nx / l, ny / l, nz / l);
        A.c.push(rgb[0], rgb[1], rgb[2]);
      }
    };
    const W = {
      sag: (x, z) => -(x * x + z * z) * sagK,        // drop of the curved ground below the flat town plane
      /* put a primitive: position (x,y,z) of its base, size (sx,sy,sz), rotation y (and optional x,z), colour, ink thickness */
      put(pr, x, y, z, sx, sy, sz, ry, hex, inkT, rx, rz) {
        e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(e);
        pv.set(x, y, z); s.set(sx, sy, sz); L.compose(pv, q, s); M.multiplyMatrices(root, L);
        emit(out, pr, M, col(hex));
        if (inkT) {
          v.set(0, -inkT, 0).applyQuaternion(q); pv.set(x + v.x, y + v.y, z + v.z); s.set(sx + 2 * inkT, sy + 2 * inkT, sz + 2 * inkT);
          L.compose(pv, q, s); M.multiplyMatrices(root, L); emit(ink, pr, M, col(0));
        }
      },
      /* same, but in a local frame (origin ox,oy,oz rotated by ory): handy for buildings */
      frame(ox, oy, oz, ory) {
        const c = Math.cos(ory), sn = Math.sin(ory);
        return (pr, x, y, z, sx, sy, sz, ry, hex, inkT, rx, rz) => W.put(pr, ox + x * c + z * sn, oy + y, oz - x * sn + z * c, sx, sy, sz, (ry || 0) + ory, hex, inkT, rx, rz);
      },
      out, ink,
    };
    return W;
  }
  function toGeo(A) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(A.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(A.n, 3)); g.setAttribute('color', new T.Float32BufferAttribute(A.c, 3));
    g.computeBoundingSphere(); return g;
  }

  /* ------------------------------------------------------------------------------------------------ palettes */
  const PALETTES = {
    green: { walls: [0xfff1d6, 0xffd9a8, 0xf7c6c6, 0xd8ecff, 0xfff6a8, 0xe6d6ff, 0xc9f0d2, 0xffffff], roofs: [0xc0503a, 0xa84432, 0x3d6fa8, 0x7a4a2a, 0x5b8a3c, 0x8a3a52], timber: 0x5a3a28, stone: 0xb9ad9a },
    savanna: { walls: [0xf2d2a0, 0xe8c08a, 0xffe2b8, 0xf5cf9c, 0xffefd0], roofs: [0xd9a441, 0xc48a2c, 0xb8762a, 0xe0b85a], timber: 0x6b4423, stone: 0xc8a878 },
    desert: { walls: [0xf6e0b5, 0xefd09a, 0xffe9c4, 0xe9c58e, 0xfff3dc, 0xf3d6b0], roofs: [0xe8c58e], timber: 0x7a5233, stone: 0xd9bb88 },
  };
  const GLOW = 0xfff1a8, PANE = 0x8fc7ff, DOOR = 0x5a3420, FRAME = 0xffffff, STONE = 0xc9c1b0, STONE_D = 0x9c9384, SLATE = 0x4d5568;

  /* ------------------------------------------------------------------------------------------------ houses */
  function house(W, rnd, x, z, ry, o) {
    const { prim } = W, P = PRIM, f = W.frame(x, W.sag(x, z), z, ry);
    const w = o.w, d = o.d, fl = o.floors, fh = 0.78, h = fl * fh + 0.12, wall = o.wall, roof = o.roof, flatRoof = o.flat;
    f(P.BOX, 0, -0.3, 0, w + 0.08, 0.5, d + 0.08, 0, o.stone, 0);                       // plinth (sinks into the ground)
    f(P.BOX, 0, 0, 0, w, h, d, 0, wall, 0.045);
    if (o.timber) {                                                                    // half-timbering on front and back
      for (const sgn of [1, -1]) {
        const zz = sgn * (d / 2 + 0.012), r = sgn > 0 ? 0 : Math.PI;
        for (let k = 1; k <= fl; k++) f(P.QUAD, 0, k * fh + 0.03, zz, w, 0.07, 1, r, o.timberC);
        for (const xx of [-w / 2 + 0.04, w / 2 - 0.04, 0]) f(P.QUAD, xx, h / 2, zz, 0.07, h, 1, r, o.timberC);
        if (fl > 1) for (const sx of [-1, 1]) f(P.QUAD, sx * w / 4, fh * 1.5 + 0.06, zz, 0.06, fh * 1.05, 1, r, o.timberC, 0, 0, 0) ;
      }
    }
    // windows: frame + pane on all four sides, one per bay per floor
    const nb = Math.max(1, Math.round(w / 0.62)), nbs = Math.max(1, Math.round(d / 0.7));
    const win = (xx, yy, zz, r, glow) => {
      f(P.QUAD, xx, yy, zz, 0.27, 0.34, 1, r, o.frame);
      f(P.QUAD, xx, yy, zz + (Math.abs(r) < 0.1 ? 0.004 : Math.abs(r - Math.PI) < 0.1 ? -0.004 : 0), 0.19, 0.25, 1, r, glow ? GLOW : PANE);
      if (o.shutter) for (const s of [-1, 1]) f(P.QUAD, xx + s * 0.19 * (Math.abs(r) < 0.1 ? 1 : -1), yy, zz, 0.08, 0.3, 1, r, o.shutter);
    };
    for (let k = 0; k < fl; k++) {
      const yy = k * fh + 0.45;
      for (let b = 0; b < nb; b++) {
        const xx = (b + 0.5) / nb * w - w / 2;
        if (k === 0 && b === Math.floor(nb / 2)) continue;                              // door goes here
        win(xx, yy, d / 2 + 0.014, 0, rnd() < 0.35);
        win(xx, yy, -d / 2 - 0.014, Math.PI, rnd() < 0.35);
        if (o.flowers && k === 0 && rnd() < 0.6) f(P.BOX, xx, yy - 0.24, d / 2 + 0.05, 0.3, 0.07, 0.08, 0, o.flowers);
      }
      for (let b = 0; b < nbs; b++) {
        const zz = (b + 0.5) / nbs * d - d / 2, r = Math.PI / 2;
        // side windows face +x and -x: rotate the frame so the quad faces outward
        const c = rnd() < 0.3;
        f(P.QUAD, w / 2 + 0.014, yy, zz, 0.27, 0.34, 1, r, o.frame); f(P.QUAD, w / 2 + 0.018, yy, zz, 0.19, 0.25, 1, r, c ? GLOW : PANE);
        f(P.QUAD, -w / 2 - 0.014, yy, zz, 0.27, 0.34, 1, -r, o.frame); f(P.QUAD, -w / 2 - 0.018, yy, zz, 0.19, 0.25, 1, -r, c ? PANE : GLOW);
      }
    }
    const dx = (Math.floor(nb / 2) + 0.5) / nb * w - w / 2;
    f(P.QUAD, dx, 0.3, d / 2 + 0.014, 0.3, 0.56, 1, 0, o.doorFrame || FRAME);
    f(P.QUAD, dx, 0.28, d / 2 + 0.02, 0.22, 0.5, 1, 0, o.door || DOOR);
    f(P.BOX, dx, 0, d / 2 + 0.09, 0.36, 0.06, 0.16, 0, o.stone);                        // doorstep
    // roof
    if (flatRoof) {
      f(P.BOX, 0, h, 0, w + 0.06, 0.12, d + 0.06, 0, o.roofTrim || o.stone, 0.035);  // parapet
      f(P.BOX, 0, h + 0.02, 0, w - 0.12, 0.11, d - 0.12, 0, roof);
      if (o.dome) { f(P.CYL12, w * 0.15, h + 0.1, 0, w * 0.42, 0.12, w * 0.42, 0, o.wall); f(P.DOME, w * 0.15, h + 0.21, 0, w * 0.42, w * 0.42, w * 0.42, 0, o.domeC || 0xffffff, 0.035); }
      if (rnd() < 0.5) f(P.BOX, -w * 0.25, h + 0.1, -d * 0.2, 0.25, 0.25, 0.25, 0, o.wall, 0.03);   // stair hut
    } else if (o.hip) {
      const rh = 0.45 + w * 0.18;
      f(P.HIP, 0, h, 0, w + 0.22, rh, d + 0.22, 0, roof, 0.045);
    } else {
      const rh = 0.4 + w * 0.32;
      f(P.GABLE, 0, h, 0, w + 0.24, rh, d + 0.18, 0, roof, 0.045);
      f(P.BOX, 0, h + rh - 0.04, 0, 0.1, 0.08, d + 0.2, 0, o.ridge || 0x6a2e24);         // ridge cap
      if (fl >= 2 && w > 1.0) {                                                            // a dormer
        const dz = d * 0.1, dy = h + rh * 0.28, ddx = -w * 0.22;
        f(P.BOX, ddx, dy, dz + d * 0.2, 0.34, 0.32, 0.34, Math.PI / 2, wall, 0.025, 0, 0);
        f(P.GABLE, ddx, dy + 0.32, dz + d * 0.2, 0.44, 0.2, 0.42, Math.PI / 2, roof, 0.025);
        f(P.QUAD, ddx, dy + 0.17, dz + d * 0.2 + 0.18, 0.17, 0.18, 1, 0, GLOW);
      }
    }
    if (!flatRoof && o.chimney) {
      const cx = w * 0.26, rh = o.hip ? 0.45 + w * 0.18 : 0.4 + w * 0.32;
      f(P.BOX, cx, h + rh * 0.2, -d * 0.15, 0.2, rh * 0.75 + 0.18, 0.2, 0, o.chimneyC || 0x9a5a4a, 0.03);
      f(P.BOX, cx, h + rh * 0.95 + 0.18, -d * 0.15, 0.27, 0.06, 0.27, 0, 0x5a4a44);
    }
  }
  function roundHut(W, rnd, x, z, o) {           // savanna: round house with a thatched cone
    const P = PRIM, y = W.sag(x, z), r = o.r;
    W.put(P.CYL16, x, y - 0.2, z, r * 2, 0.95, r * 2, 0, o.wall, 0.04);
    W.put(P.CONE16, x, y + 0.72, z, r * 2.6, 0.95, r * 2.6, 0, o.roof, 0.045);
    W.put(P.BALL, x, y + 1.6, z, 0.14, 0.14, 0.14, 0, 0x8a5a2a);
    const a = rnd() * 6.28;
    W.put(P.QUAD, x + Math.sin(a) * (r + 0.015), y + 0.3, z + Math.cos(a) * (r + 0.015), 0.24, 0.45, 1, a, DOOR);
    for (const k of [1.6, -1.6]) W.put(P.QUAD, x + Math.sin(a + k) * (r + 0.015), y + 0.45, z + Math.cos(a + k) * (r + 0.015), 0.18, 0.18, 1, a + k, GLOW);
  }
  function tree(W, rnd, x, z, kind) {
    const P = PRIM, y = W.sag(x, z), s = 0.7 + rnd() * 0.5;
    if (kind === 'palm') {
      W.put(P.CYL8, x, y, z, 0.1 * s, 1.3 * s, 0.1 * s, 0, 0x8a6a3a, 0.025, 0.15, 0);
      for (let i = 0; i < 6; i++) W.put(P.BOX, x, y + 1.25 * s, z, 0.12, 0.03, 0.75 * s, i * 1.05, 0x3fa83f, 0.02, 0.35, 0);
      return;
    }
    W.put(P.CYL8, x, y, z, 0.1 * s, 0.4 * s, 0.1 * s, 0, 0x7a5233);
    if (kind === 'pine') { W.put(P.CONE8, x, y + 0.3 * s, z, 0.6 * s, 0.9 * s, 0.6 * s, 0, 0x2f8a4a, 0.035); W.put(P.CONE8, x, y + 0.75 * s, z, 0.45 * s, 0.6 * s, 0.45 * s, 0, 0x3aa055, 0.03); }
    else W.put(P.BALL, x, y + 0.3 * s, z, 0.62 * s, 0.6 * s, 0.62 * s, 0, rnd() < 0.5 ? 0x5ec24a : 0x48ad44, 0.035);
  }
  function crenelsRect(f, cx, cz, w, d, y, hex) {           // merlons round a rectangle
    const P = PRIM, nx = Math.max(2, Math.floor(w / 0.3)), nz = Math.max(2, Math.floor(d / 0.3));
    for (let i = 0; i < nx; i += 2) for (const s of [-1, 1]) f(P.BOX, cx + (i + 0.5) / nx * w - w / 2, y, cz + s * (d / 2 - 0.07), w / nx, 0.2, 0.14, 0, hex, 0.02);
    for (let i = 0; i < nz; i += 2) for (const s of [-1, 1]) f(P.BOX, cx + s * (w / 2 - 0.07), y, cz + (i + 0.5) / nz * d - d / 2, 0.14, 0.2, d / nz, 0, hex, 0.02);
  }
  function crenels(f, len, y, z, th, hex, step) {             // merlons along x, at height y
    const n = Math.max(2, Math.floor(len / (step || 0.32)));
    for (let i = 0; i < n; i += 2) f(PRIM.BOX, (i + 0.5) / n * len - len / 2, y, z, len / n, 0.2, th, 0, hex, 0.02);
  }

  /* ------------------------------------------------------------------------------------------------ landmarks */
  const LM = {};
  LM.church = (W, rnd, x, z, ry, o, big) => {
    const P = PRIM, f = W.frame(x, W.sag(x, z), z, ry), k = big ? 1.55 : 1;
    const L = 3.4 * k, Wd = 1.5 * k, H = 1.7 * k, wall = o.churchWall || STONE, roof = o.churchRoof || SLATE;
    f(P.BOX, 0, -0.3, 0, Wd + 0.1, 0.5, L + 0.1, 0, STONE_D);
    f(P.BOX, 0, 0, 0, Wd, H, L, 0, wall, 0.05);
    f(P.GABLE, 0, H, 0, Wd + 0.2, 0.95 * k, L + 0.1, 0, roof, 0.05);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {                      // tall arched windows (as stacked quads) and buttresses
      const zz = (i + 0.5) / 4 * L - L / 2;
      f(P.QUAD, s * (Wd / 2 + 0.014), H * 0.55, zz, 0.3, H * 0.55, 1, s * Math.PI / 2, 0x7fb6ff);
      f(P.QUAD, s * (Wd / 2 + 0.018), H * 0.55 + H * 0.29, zz, 0.18, 0.12, 1, s * Math.PI / 2, 0x7fb6ff);
      f(P.BOX, s * (Wd / 2 + 0.08), 0, zz + L / 8, 0.16, H * 0.8, 0.18, 0, wall, 0.02);
    }
    // apse
    f(P.CYL16, 0, 0, -L / 2, Wd, H * 0.9, Wd, 0, wall, 0.045); f(P.CONE16, 0, H * 0.9, -L / 2, Wd * 1.08, 0.7 * k, Wd * 1.08, 0, roof, 0.045);
    if (big) {                                                                 // transept + crossing spire + twin west towers
      f(P.BOX, 0, 0, -L * 0.12, Wd * 2.6, H * 0.95, Wd * 0.9, 0, wall, 0.05);
      f(P.GABLE, 0, H * 0.95, -L * 0.12, Wd * 0.95, 0.85 * k, Wd * 2.7, Math.PI / 2, roof, 0.05);
      f(P.BOX, 0, H, -L * 0.12, 0.55 * k, 1.1 * k, 0.55 * k, 0, wall, 0.04); f(P.CONE8, 0, H + 1.1 * k, -L * 0.12, 0.75 * k, 2.2 * k, 0.75 * k, 0, roof, 0.04);
      for (const s of [-1, 1]) {
        f(P.BOX, s * Wd * 0.42, 0, L / 2 - 0.3, 0.85 * k, H * 2.1, 0.85 * k, 0, wall, 0.05);
        f(P.CONE8, s * Wd * 0.42, H * 2.1, L / 2 - 0.3, 0.95 * k, 2.4 * k, 0.95 * k, Math.PI / 8, roof, 0.05);
        f(P.BALL, s * Wd * 0.42, H * 2.1 + 2.45 * k, L / 2 - 0.3, 0.14, 0.14, 0.14, 0, 0xffd23f);
        for (let fl = 0; fl < 3; fl++) f(P.QUAD, s * Wd * 0.42, H * (0.5 + fl * 0.55), L / 2 - 0.3 + 0.44 * k, 0.22, 0.42, 1, 0, 0x2a2440);
      }
      f(P.DISC, 0, H * 1.25, L / 2 + 0.014, 0.75, 0.75, 1, 0, 0xff6b9a, 0, Math.PI / 2);                     // rose window
      f(P.DISC, 0, H * 1.25, L / 2 + 0.02, 0.5, 0.5, 1, 0, 0x7fb6ff, 0, Math.PI / 2);
      f(P.QUAD, 0, 0.55, L / 2 + 0.015, 0.6, 1.05, 1, 0, DOOR);
    } else {
      const tz = L / 2 + 0.35;                                                  // west tower with spire and clock
      f(P.BOX, 0, 0, tz, 0.95, H * 2.0, 0.95, 0, wall, 0.05);
      f(P.CONE4, 0, H * 2.0, tz, 1.3, 2.1, 1.3, Math.PI / 4, roof, 0.05);
      f(P.BALL, 0, H * 2.0 + 2.1, tz, 0.13, 0.13, 0.13, 0, 0xffd23f);
      f(P.DISC, 0, H * 1.6, tz + 0.49, 0.5, 0.5, 1, 0, 0xffffff, 0, Math.PI / 2); f(P.QUAD, 0.06, H * 1.6 + 0.08, tz + 0.5, 0.04, 0.2, 1, 0, 0x222222); f(P.QUAD, 0.04, H * 1.6, tz + 0.5, 0.15, 0.04, 1, 0, 0x222222);
      f(P.QUAD, 0, 0.45, tz + 0.49, 0.38, 0.8, 1, 0, DOOR);
    }
    return { r: big ? 4.2 : 2.6 };
  };
  LM.castle = (W, rnd, x, z, ry, o) => {
    const P = PRIM, y0 = W.sag(x, z) + 0.15, f = W.frame(x, y0, z, ry), S = 3.2, wallH = 1.2, wc = 0xd6cbb4;
    f(P.CYL16, 0, -0.6, 0, S * 2.6, 0.75, S * 2.6, 0, 0x8fbf5a, 0.04);                              // a little motte
    for (const [a, b] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {                                    // curtain walls
      const ff = W.frame(x + (a * Math.cos(ry) + b * Math.sin(ry)) * S / 2, y0, z + (-a * Math.sin(ry) + b * Math.cos(ry)) * S / 2, ry + (a ? Math.PI / 2 : 0));
      ff(P.BOX, 0, 0, 0, S, wallH, 0.3, 0, wc, 0.04); crenels(ff, S, wallH, 0, 0.3, wc);
    }
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {                                   // corner towers with pointy roofs + flags
      f(P.CYL12, a * S / 2, 0, b * S / 2, 0.85, wallH * 1.8, 0.85, 0, wc, 0.04);
      f(P.CONE12, a * S / 2, wallH * 1.8, b * S / 2, 1.1, 1.2, 1.1, 0, o.flag2 || 0x3d6fa8, 0.04);
      f(P.CYL8, a * S / 2, wallH * 1.8 + 1.15, b * S / 2, 0.03, 0.55, 0.03, 0, 0x3a2a20);
      f(P.BOX, a * S / 2 + 0.17, wallH * 1.8 + 1.5, b * S / 2, 0.32, 0.2, 0.02, 0, o.flag || 0xff4d6d);
      for (let k = 0; k < 3; k++) f(P.QUAD, a * S / 2, 0.6 + k * 0.6, b * S / 2 + 0.43 * b, 0.1, 0.22, 1, b > 0 ? 0 : Math.PI, 0x2a2440);
    }
    f(P.BOX, 0, 0, S / 2 + 0.1, 1.0, wallH * 1.45, 0.6, 0, wc, 0.04); crenelsRect(f, 0, S / 2 + 0.1, 1.0, 0.6, wallH * 1.45, wc);  // gatehouse
    f(P.QUAD, 0, 0.42, S / 2 + 0.41, 0.5, 0.8, 1, 0, 0x2a2026);
    // keep
    f(P.BOX, 0, 0, -0.2, 1.5, 2.6, 1.5, 0, 0xe8dfc8, 0.05); crenelsRect(f, 0, -0.2, 1.5, 1.5, 2.6, 0xe8dfc8);
    f(P.CYL12, 0.6, 2.3, 0.4, 0.5, 1.0, 0.5, 0, 0xe8dfc8, 0.03); f(P.CONE12, 0.6, 3.3, 0.4, 0.68, 0.9, 0.68, 0, o.flag || 0xff4d6d, 0.035);
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) f(P.QUAD, s * 0.35, 1.0 + k * 0.8, 0.56, 0.18, 0.3, 1, 0, GLOW);
    return { r: S * 1.3 };
  };
  LM.market = (W, rnd, x, z, ry, o) => {
    const P = PRIM, y = W.sag(x, z), f = W.frame(x, y, z, ry);
    f(P.CYL16, 0, 0, 0, 1.3, 0.25, 1.3, 0, STONE, 0.03); f(P.CYL16, 0, 0.25, 0, 0.9, 0.05, 0.9, 0, 0x5fd3f3);   // fountain
    f(P.CYL8, 0, 0.25, 0, 0.14, 0.6, 0.14, 0, STONE); f(P.CYL12, 0, 0.8, 0, 0.5, 0.08, 0.5, 0, STONE, 0.02); f(P.BALL, 0, 0.88, 0, 0.18, 0.3, 0.18, 0, 0x9ee6ff);
    const awn = [[0xff6b6b, 0xffffff], [0x4ecdc4, 0xffffff], [0xffd23f, 0xff9f43], [0x9b7bff, 0xffffff], [0x7ed957, 0xffffff], [0xff9ff3, 0xffffff]];
    for (let i = 0; i < 6; i++) {                                                     // market stalls in a ring, with striped awnings and wares
      const a = i / 6 * Math.PI * 2 + 0.3, r = 2.1, sx = Math.sin(a) * r, sz = Math.cos(a) * r, g = W.frame(x + Math.sin(a + ry) * r, y, z + Math.cos(a + ry) * r, a + ry + Math.PI);
      g(P.BOX, 0, 0, 0, 0.9, 0.35, 0.5, 0, 0x9a6a3a, 0.02);
      for (const s of [-1, 1]) g(P.CYL8, s * 0.4, 0.35, -0.2, 0.04, 0.45, 0.04, 0, 0x6b4423);
      for (let k = 0; k < 4; k++) g(P.BOX, (k + 0.5) / 4 * 0.98 - 0.49, 0.78, 0.0, 0.245, 0.04, 0.7, 0, awn[i][k % 2], 0.015, -0.35, 0);
      for (let k = 0; k < 3; k++) g(P.BALL, (k - 1) * 0.25, 0.37, 0.05, 0.14, 0.14, 0.14, 0, [0xff4d4d, 0xffa62b, 0x8bd650][(k + i) % 3]);
    }
    LM.clocktower(W, rnd, x + Math.sin(ry) * 3.1, z + Math.cos(ry) * 3.1, ry, o);
    return { r: 3.6, square: 3.2 };
  };
  LM.clocktower = (W, rnd, x, z, ry, o) => {
    const P = PRIM, f = W.frame(x, W.sag(x, z), z, ry);
    f(P.BOX, 0, 0, 0, 0.8, 3.4, 0.8, 0, o.towerC || 0xfff2cc, 0.045);
    f(P.BOX, 0, 3.4, 0, 0.95, 0.18, 0.95, 0, 0xe6d3a1, 0.03);
    f(P.BOX, 0, 3.58, 0, 0.75, 0.7, 0.75, 0, o.towerC || 0xfff2cc, 0.035);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, s = Math.sin(a), c = Math.cos(a); f(P.DISC, s * 0.385, 3.92, c * 0.385, 0.46, 0.46, 1, a, 0xffffff, 0, Math.PI / 2); f(P.QUAD, s * 0.39, 3.97, c * 0.39, 0.035, 0.17, 1, a, 0x222222); f(P.QUAD, s * 0.392, 3.92, c * 0.392, 0.13, 0.035, 1, a + 0.0, 0x222222); }
    f(P.CONE4, 0, 4.28, 0, 1.1, 1.3, 1.1, Math.PI / 4, o.spire || 0x7b5cff, 0.045);
    f(P.CYL8, 0, 5.55, 0, 0.03, 0.5, 0.03, 0, 0x3a2a20); f(P.BOX, 0.16, 5.85, 0, 0.32, 0.18, 0.02, 0, 0xff4d6d);
    return { r: 0.9 };
  };
  LM.palace = (W, rnd, x, z, ry, o) => {
    const P = PRIM, f = W.frame(x, W.sag(x, z), z, ry), wc = 0xfff3dc, dc = o.domeC || 0x2fb7c6;
    f(P.BOX, 0, -0.2, 0, 5.2, 0.45, 3.8, 0, 0xe9c58e, 0.04);
    f(P.BOX, 0, 0.25, 0, 4.2, 1.6, 2.8, 0, wc, 0.05);
    for (let i = 0; i < 7; i++) f(P.QUAD, (i + 0.5) / 7 * 4.2 - 2.1, 0.95, 1.414, 0.26, 0.6, 1, 0, 0x2a6fa0);
    f(P.QUAD, 0, 0.75, 1.42, 0.7, 1.0, 1, 0, 0x2a2026);
    f(P.CYL16, 0, 1.85, 0, 1.9, 0.6, 1.9, 0, wc, 0.04);
    f(P.DOME, 0, 2.4, 0, 2.3, 2.6, 2.3, 0, dc, 0.05); f(P.CONE8, 0, 3.6, 0, 0.18, 0.8, 0.18, 0, 0xffd23f);
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {                                       // minarets
      f(P.CYL12, a * 2.4, 0.2, b * 1.7, 0.42, 4.2, 0.42, 0, wc, 0.035); f(P.CYL12, a * 2.4, 3.2, b * 1.7, 0.6, 0.1, 0.6, 0, 0xe9c58e, 0.02);
      f(P.DOME, a * 2.4, 4.4, b * 1.7, 0.5, 0.62, 0.5, 0, dc, 0.03); f(P.CONE8, a * 2.4, 4.7, b * 1.7, 0.08, 0.35, 0.08, 0, 0xffd23f);
    }
    for (const s of [-1, 1]) { f(P.CYL12, s * 1.3, 1.85, 0.8, 0.8, 0.3, 0.8, 0, wc, 0.03); f(P.DOME, s * 1.3, 2.15, 0.8, 0.9, 0.9, 0.9, 0, dc, 0.035); }
    return { r: 3.5 };
  };
  LM.windmill = (W, rnd, x, z, ry, o) => {
    const P = PRIM, f = W.frame(x, W.sag(x, z), z, ry);
    f(P.CYL12, 0, 0, 0, 1.0, 2.2, 1.0, 0, 0xfff6e6, 0.04); f(P.CONE12, 0, 2.2, 0, 1.2, 0.9, 1.2, 0, 0x9a5a3a, 0.04);
    f(P.QUAD, 0, 0.35, 0.47, 0.3, 0.6, 1, 0, DOOR); f(P.QUAD, 0, 1.4, 0.47, 0.22, 0.25, 1, 0, GLOW);
    f(P.CYL8, 0, 2.4, 0.5, 0.08, 0.25, 0.08, 0, 0x5a3a28, 0, Math.PI / 2);
    const a0 = rnd(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + a0; f(P.BOX, 0, 2.4, 0.72, 0.34, 1.7, 0.03, 0, 0xfffaf0, 0.02, 0, -a); f(P.BOX, 0, 2.4, 0.74, 0.05, 1.72, 0.04, 0, 0x7a5233, 0, 0, -a); }
    return { r: 1.1 };
  };
  LM.lighthouse = (W, rnd, x, z, ry, o) => {
    const P = PRIM, f = W.frame(x, W.sag(x, z), z, ry);
    f(P.CYL16, 0, -0.2, 0, 1.4, 0.4, 1.4, 0, STONE_D, 0.03);
    for (let i = 0; i < 5; i++) f(P.CYL16, 0, 0.2 + i * 0.75, 0, 0.95 - i * 0.07, 0.75, 0.95 - i * 0.07, 0, i % 2 ? 0xff4d4d : 0xffffff, 0.04);
    f(P.CYL16, 0, 3.95, 0, 0.85, 0.08, 0.85, 0, 0x333344); f(P.CYL12, 0, 4.03, 0, 0.55, 0.5, 0.55, 0, 0xfff7a8); f(P.CONE12, 0, 4.53, 0, 0.75, 0.55, 0.75, 0, 0xff4d4d, 0.03);
    return { r: 1 };
  };
  LM.factory = (W, rnd, x, z, ry, o) => {
    const P = PRIM, f = W.frame(x, W.sag(x, z), z, ry), brick = 0xb8574a;
    f(P.BOX, 0, 0, 0, 3.2, 1.3, 2.0, 0, brick, 0.05);
    for (let i = 0; i < 4; i++) f(P.GABLE, (i + 0.5) / 4 * 3.2 - 1.6, 1.3, 0, 0.8, 0.5, 2.05, 0, SLATE, 0.03, 0, 0);
    for (let i = 0; i < 5; i++) f(P.QUAD, (i + 0.5) / 5 * 3.2 - 1.6, 0.7, 1.014, 0.38, 0.6, 1, 0, GLOW);
    const stacks = [];
    for (const s of [-1, 1]) { f(P.CYL12, s * 1.2, 0, -1.3, 0.45, 3.6, 0.45, 0, brick, 0.035); f(P.CYL12, s * 1.2, 3.6, -1.3, 0.55, 0.15, 0.55, 0, 0x3a2a2a, 0.02);
      const c = Math.cos(ry), sn = Math.sin(ry); stacks.push([x + s * 1.2 * c - 1.3 * sn, W.sag(x, z) + 3.8, z - s * 1.2 * sn - 1.3 * c]); }
    return { r: 2.3, smoke: stacks };
  };
  LM.station = (W, rnd, x, z, ry, o) => {           // railway station at the end of the line; track runs along local z
    const P = PRIM, f = W.frame(x, W.sag(x, z), z, ry);
    f(P.BOX, 0.62, 0, 1.4, 0.7, 0.14, 3.0, 0, 0xd8cdb8, 0.03);                                    // platform
    for (let i = 0; i < 4; i++) f(P.CYL8, 0.85, 0.14, i * 0.85 + 0.2, 0.06, 0.8, 0.06, 0, 0x3d6fa8);
    f(P.BOX, 0.62, 0.92, 1.4, 0.95, 0.06, 3.1, 0, 0x3d6fa8, 0.03, 0, 0.12);                        // canopy
    f(P.BOX, 1.6, 0, 1.4, 1.1, 1.05, 2.1, 0, 0xffe2b8, 0.04); f(P.HIP, 1.6, 1.05, 1.4, 1.3, 0.6, 2.3, 0, 0xc0503a, 0.04);
    for (let k = 0; k < 3; k++) f(P.QUAD, 1.04, 0.55, (k - 1) * 0.6 + 1.4, 0.22, 0.32, 1, -Math.PI / 2, GLOW);
    f(P.DISC, 1.04, 1.0, 1.4, 0.3, 0.3, 1, -Math.PI / 2, 0xffffff, 0, Math.PI / 2);
    f(P.BOX, 0, 0, -0.25, 0.9, 0.35, 0.2, 0, 0xc0503a, 0.03);                                     // buffer stop
    return { r: 0.5 };
  };
  LM.walls = (W, rnd, R, gates, o) => {            // a ring of crenellated walls with round towers and gates
    const P = PRIM, wc = o.wallC || 0xd6cbb4, n = Math.max(14, Math.round(R * 2.6)), H = 0.95;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, am = (a0 + a1) / 2;
      const gate = gates.some(g => Math.abs(Math.atan2(Math.sin(am - g), Math.cos(am - g))) < Math.PI / n * 0.99);
      const x0 = Math.sin(a0) * R, z0 = Math.cos(a0) * R, x1 = Math.sin(a1) * R, z1 = Math.cos(a1) * R, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, L = Math.hypot(x1 - x0, z1 - z0);
      const f = W.frame(mx, W.sag(mx, mz), mz, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2);
      if (gate) {
        for (const s of [-1, 1]) { f(P.CYL12, s * L * 0.42, 0, 0, 0.7, H * 1.7, 0.7, 0, wc, 0.04); f(P.CONE12, s * L * 0.42, H * 1.7, 0, 0.9, 0.85, 0.9, 0, o.roofC || 0xc0503a, 0.04); }
        f(P.BOX, 0, H * 1.0, 0, L * 0.55, H * 0.55, 0.4, 0, wc, 0.04);
        continue;
      }
      f(P.BOX, 0, -0.2, 0, L + 0.05, H + 0.2, 0.32, 0, wc, 0.035); crenels(f, L, H, 0, 0.32, wc, 0.26);
      if (i % 3 === 0) { f(P.CYL12, -L / 2, -0.2, 0, 0.62, H * 1.45 + 0.2, 0.62, 0, wc, 0.04); f(P.CYL12, -L / 2, H * 1.45, 0, 0.72, 0.16, 0.72, 0, wc, 0.03); }
    }
  };

  /* ------------------------------------------------------------------------------------------------ one town */
  const STYLES = ['walled', 'castle', 'cathedral', 'market', 'windmills', 'harbour', 'factory', 'palace'];
  function buildTown(W, rnd, o) {
    const P = prims(), R = o.R, biome = o.biome, pal = PALETTES[biome] || PALETTES.green, style = o.style;
    const desert = biome === 'desert', sav = biome === 'savanna';
    const occ = [];                                                   // occupied discs [x, z, r]
    const free = (x, z, r) => { for (const q of occ) if ((q[0] - x) ** 2 + (q[1] - z) ** 2 < (q[2] + r) ** 2) return false; return true; };
    const onLand = (x, z) => o.land(x, z);
    const railNear = (x, z, r) => { for (const p of o.rail) if ((p[0] - x) ** 2 + (p[1] - z) ** 2 < r * r) return true; return false; };
    // street plan: a central square, radial streets and one ring road
    const nRad = 3 + Math.floor(rnd() * 3), a0 = rnd() * 6.28, radials = [];
    for (let i = 0; i < nRad; i++) radials.push(a0 + i / nRad * Math.PI * 2 + (rnd() - 0.5) * 0.4);
    const ringR = R * (0.42 + rnd() * 0.1), ring2 = R * (0.74 + rnd() * 0.06), sqR = style === 'market' ? 3.3 : 1.7 + R * 0.05;
    const streetD = (x, z) => {
      const r = Math.hypot(x, z), a = Math.atan2(x, z); let d = Math.min(Math.abs(r - ringR), R > 7 ? Math.abs(r - ring2) : 9);
      for (const b of radials) { const da = Math.atan2(Math.sin(a - b), Math.cos(a - b)); if (Math.abs(da) < Math.PI / 2) d = Math.min(d, Math.abs(Math.sin(da)) * r + (r < sqR ? 9 : 0)); }
      return d;
    };
    const lm = [];
    const RAD = { church: 2.6, castle: 4.2, market: 3.6, clocktower: 0.9, palace: 3.5, windmill: 1.1, lighthouse: 1, factory: 2.3 };
    const place = (fn, x, z, ry, extra) => {        // find a free, dry spot near (x, z), turning round the square if needed
      const r0 = Math.hypot(x, z), a0_ = Math.atan2(x, z), need = fn === 'church' && extra ? 4.2 : RAD[fn];
      for (let k = 0; k < 16; k++) {
        const a = a0_ + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4, rr = r0 + (k > 9 ? 0.8 : 0), px = Math.sin(a) * rr, pz = Math.cos(a) * rr;
        if (!onLand(px, pz) || !free(px, pz, need * 0.9)) continue;
        const res = LM[fn](W, rnd, px, pz, ry + (a - a0_), o, extra); occ.push([px, pz, res.r]); lm.push(res); return res;
      }
      return null;
    };
    occ.push([0, 0, sqR]);                                                                // keep the square open
    for (const p of o.rail) occ.push([p[0], p[1], 0.75]);                                 // and the railway corridor
    if (o.station) for (const s of o.station) { if (!onLand(s[0], s[1])) continue; LM.station(W, rnd, s[0], s[1], s[2], o); const c = Math.cos(s[2]), sn = Math.sin(s[2]); for (let k = 0; k <= 3; k++) occ.push([s[0] + 1.3 * c + k * sn, s[1] - 1.3 * sn + k * c, 0.85]); }
    // landmark(s)
    const at = (r, a) => [Math.sin(a) * r, Math.cos(a) * r];
    const mid = (radials[0] + radials[1]) / 2, [lx, lz] = at(sqR + 2.4, mid);
    if (style === 'cathedral') { const [cx, cz] = at(sqR + 3.6, mid); place('church', cx, cz, Math.atan2(-cx, -cz), true); }
    else if (style === 'castle') { const [cx, cz] = at(R * 0.62, mid); place('castle', cx, cz, Math.atan2(-cx, -cz)); place('church', ...at(sqR + 2.2, mid + Math.PI), Math.atan2(...at(1, mid)) , false); }
    else if (style === 'market') { occ.shift(); LM.market(W, rnd, 0, 0, a0, o); occ.push([0, 0, 3.6]); }
    else if (style === 'palace') { place('palace', lx * 1.2, lz * 1.2, Math.atan2(-lx, -lz)); }
    else if (style === 'windmills') { for (let i = 0; i < 4; i++) { const a = mid + i * 1.5 + 0.4, p = at(R * (0.75 + 0.15 * rnd()), a); place('windmill', p[0], p[1], a + Math.PI); } place('church', lx, lz, Math.atan2(-lx, -lz)); }
    else if (style === 'factory') { const p = at(R * 0.6, mid); place('factory', p[0], p[1], Math.atan2(-p[0], -p[1])); place('clocktower', ...at(sqR + 1.0, mid + 2.5), 0); }
    else if (style === 'harbour') { const p = at(R * 0.85, o.seaDir); if (onLand(p[0], p[1])) place('lighthouse', p[0], p[1], 0); place('clocktower', ...at(sqR + 1.0, mid), 0); place('church', ...at(sqR + 2.6, mid + 2.2), mid); }
    else { place('church', lx, lz, Math.atan2(-lx, -lz)); place('clocktower', ...at(sqR + 1.0, mid + 2.6), 0); }
    const walled = style === 'walled' || style === 'castle' && rnd() < 0.5;
    const wallR = R * 0.92;
    // houses along the streets
    const cand = [];
    for (let x = -R; x <= R; x += 0.45) for (let z = -R; z <= R; z += 0.45) {
      const jx = x + (rnd() - 0.5) * 0.4, jz = z + (rnd() - 0.5) * 0.4, r = Math.hypot(jx, jz);
      const edge = R * (0.82 + 0.18 * Math.sin(Math.atan2(jx, jz) * 3 + o.seed));      // ragged town edge
      if (r > (walled ? wallR - 1.0 : edge) || r < sqR) continue;
      const sd = streetD(jx, jz); if (sd < 0.55 || sd > 2.4 + (r < ringR ? 0 : 1.5)) continue;
      cand.push([jx, jz, sd + r * 0.02 + rnd() * 0.3]);
    }
    cand.sort((a, b) => a[2] - b[2]);
    let houses = 0;
    for (const [x, z] of cand) {
      const w = desert ? 0.9 + rnd() * 0.5 : 0.85 + rnd() * 0.55, d = 0.85 + rnd() * 0.4, rr = Math.max(w, d) * 0.5 + 0.04;
      if (!free(x, z, rr) || !onLand(x, z) || railNear(x, z, 0.9)) continue;
      // face the nearest street: step a little toward lower street distance
      const e = 0.05, gx = streetD(x + e, z) - streetD(x - e, z), gz = streetD(x, z + e) - streetD(x, z - e), ry = Math.atan2(-gx, -gz);
      occ.push([x, z, rr]); houses++;
      const r = Math.hypot(x, z), central = 1 - r / R;
      if (sav && rnd() < 0.55) { roundHut(W, rnd, x, z, { r: 0.42 + rnd() * 0.12, wall: pal.walls[Math.floor(rnd() * pal.walls.length)], roof: pal.roofs[Math.floor(rnd() * pal.roofs.length)] }); continue; }
      house(W, rnd, x, z, ry, {
        w, d, floors: desert ? 1 + (rnd() < central ? 1 : 0) : 1 + (rnd() < 0.25 + central * 0.8 ? 1 : 0) + (rnd() < central * 0.5 ? 1 : 0),
        wall: pal.walls[Math.floor(rnd() * pal.walls.length)], roof: pal.roofs[Math.floor(rnd() * pal.roofs.length)], stone: pal.stone,
        flat: desert, dome: desert && rnd() < 0.18, domeC: [0xffffff, 0x2fb7c6, 0x4b6bd8][Math.floor(rnd() * 3)],
        hip: !desert && rnd() < 0.3, timber: !desert && !sav && rnd() < 0.4, timberC: pal.timber,
        shutter: !desert && rnd() < 0.45 ? [0x3d6fa8, 0x2f8a4a, 0x8a3a52, 0x5a3a28][Math.floor(rnd() * 4)] : 0,
        flowers: rnd() < 0.4 ? [0xff4d6d, 0xffd23f, 0xff9ff3][Math.floor(rnd() * 3)] : 0,
        chimney: rnd() < 0.7, frame: FRAME, door: [DOOR, 0x3d6fa8, 0x2f8a4a, 0xc0503a][Math.floor(rnd() * 4)],
      });
    }
    if (walled) { const gates = radials.slice(); LM.walls(W, rnd, wallR, gates, o); }
    // gardens and street trees in the gaps
    for (let i = 0; i < R * R * 1.4; i++) {
      const a = rnd() * 6.28, r = sqR + rnd() * (R * 1.05 - sqR), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (!free(x, z, 0.35) || !onLand(x, z) || streetD(x, z) < 0.5 || railNear(x, z, 0.8) || (walled && Math.abs(r - wallR) < 0.6)) continue;
      occ.push([x, z, 0.35]); tree(W, rnd, x, z, desert ? 'palm' : rnd() < 0.35 ? 'pine' : 'round');
    }
    // lamp posts round the square
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + 0.2, x = Math.sin(a) * (sqR - 0.25), z = Math.cos(a) * (sqR - 0.25); if (!onLand(x, z)) continue; W.put(P.CYL8, x, W.sag(x, z), z, 0.05, 0.8, 0.05, 0, 0x2a2a30); W.put(P.BALL, x, W.sag(x, z) + 0.82, z, 0.16, 0.16, 0.16, 0, GLOW); }
    return { houses, streetD, sqR, smoke: lm.flatMap(l => l.smoke || []) };
  }

  /* town ground: cobbles on the streets and square, packed earth between, fading out at the edge */
  function ground(W, o, plan) {
    const R = o.R * 1.12, N = Math.ceil(R / 0.3), out = W.gnd;
    const cob = col(o.biome === 'desert' ? 0xe3c48f : 0xd9cdb5), cob2 = col(o.biome === 'desert' ? 0xcfae78 : 0xc2b49a), dirt = col(o.biome === 'desert' ? 0xe8cf9c : o.biome === 'savanna' ? 0xc9c27a : 0x9ccf6a);
    const g = [], idx = (i, j) => j * (2 * N + 1) + i;
    for (let j = -N; j <= N; j++) for (let i = -N; i <= N; i++) {
      const x = i / N * R, z = j / N * R, r = Math.hypot(x, z), sd = plan.streetD(x, z), on = r <= R && o.land(x, z);
      const st = 1 - Math.min(1, Math.max(0, (sd - 0.3) / 0.2)), sq = r < plan.sqR ? 1 : 0, k = Math.max(st, sq), hh = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, chk = (hh - Math.floor(hh)) < 0.5 ? cob : cob2;
      const c = [dirt[0] + (chk[0] - dirt[0]) * k, dirt[1] + (chk[1] - dirt[1]) * k, dirt[2] + (chk[2] - dirt[2]) * k];
      g.push({ x, z, on, c, a: on ? Math.max(k * (r < R * 0.95 ? 1 : 0), 1 - Math.min(1, Math.max(0, (r - R * 0.7) / (R * 0.25)))) : 0 });
    }
    const v = new T.Vector3(), nrm = new T.Vector3();
    const push = (q) => { v.set(q.x, W.sag(q.x, q.z) + 0.07, q.z).applyMatrix4(o.root); nrm.copy(v).normalize(); out.p.push(v.x, v.y, v.z); out.n.push(nrm.x, nrm.y, nrm.z); out.c.push(q.c[0], q.c[1], q.c[2], q.a); };
    for (let j = 0; j < 2 * N; j++) for (let i = 0; i < 2 * N; i++) {
      const a = g[idx(i, j)], b = g[idx(i + 1, j)], c = g[idx(i + 1, j + 1)], d = g[idx(i, j + 1)];
      if (a.a + b.a + c.a + d.a < 0.02) continue;                                       // leave the countryside to the planet texture
      push(a); push(c); push(b); push(a); push(d); push(c);
    }
  }

  function build(THREE, o) {
    T = THREE; prims();
    let s = o.seed >>> 0 || 1; const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const W = makeWriter(o.root, o.sagK);
    W.prim = PRIM; W.gnd = new Acc();
    const plan = buildTown(W, rnd, o);
    ground(W, o, plan);
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(W.gnd.p, 3)); gg.setAttribute('normal', new T.Float32BufferAttribute(W.gnd.n, 3)); gg.setAttribute('color', new T.Float32BufferAttribute(W.gnd.c, 4)); gg.computeBoundingSphere();
    return { geo: toGeo(W.out), ink: toGeo(W.ink), ground: gg, houses: plan.houses, smoke: plan.smoke };
  }
  root.CityGen = { build, STYLES };
})(typeof window !== 'undefined' ? window : globalThis);
