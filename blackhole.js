/* The Black Hole of Nathaniel Planet (space age only, unlocked once the alien invasion has been seen through).
   When the aliens flee at the end of the invasion they tear a hole in spacetime; a black hole appears in the
   background and sits there, inert, until the button is pressed. Pressing it leads through an escalating chain
   of joke confirmation dialogs into a short, fully-scripted cutscene: the hole eats the station, a few
   satellites and the volcanoes, then spaghettifies the whole planet and swallows it, pulses, rushes the camera
   and flashes white. Beyond the flash, Nathaniel Planet is briefly a torus, a disk and a cube (built by putting
   the same planet material on new geometry rather than re-deriving every tree and city's placement on three
   different topologies), then a cartoon bomb that explodes. The real planet returns, Space Age, as before.

   Layout of this file:
   - injectCSS(): styles for the button and the three confirmation dialogs.
   - confirmChain(): the three escalating "are you sure?" dialogs.
   - spawnHole() / unlocked(): create (once per invasion) the dormant background hole; report whether one exists.
   - start(ctx): runs the whole sequence. `ctx` is handed over by index.html (three.js, the scene, camera,
     controls, the station/satellites/volcanoes to suck in, planetMat to redecorate the "inside" shapes...). */
(function (root) {
  'use strict';

  let cssInjected = false;
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
#blackHoleBtn{position:fixed;left:84px;bottom:16px;z-index:21;width:52px;height:52px;border:0;background:none;padding:0;cursor:pointer;filter:drop-shadow(0 3px 6px #000a);display:none}
#blackHoleBtn svg{width:100%;height:100%}
#blackHoleBtn span{position:absolute;left:58px;bottom:14px;white-space:nowrap;font:600 13px var(--font);color:#e8d9ff;text-shadow:0 1px 3px #000}
body.bh-unlocked #blackHoleBtn{display:block;animation:bhbtn 2.1s ease-in-out infinite}
@keyframes bhbtn{50%{transform:scale(1.08) rotate(6deg)}}
body:not([data-age="space"]) #blackHoleBtn{opacity:.35;filter:grayscale(1) drop-shadow(0 3px 6px #000a);cursor:default;animation:none}
body.invading #blackHoleBtn, body.bh-active #blackHoleBtn, body.bh-active #alienBtn, body.bh-active #ageBtn{display:none}
/* dialog 1: a deliberately boring, flat Windows-95-style message box */
.bh-ov{position:fixed;inset:0;z-index:60;display:grid;place-items:center;font-family:Tahoma,Geneva,var(--font)}
.bh-win95{width:min(360px,86vw);background:#c0c0c0;border:2px solid #fff;box-shadow:2px 2px 0 1px #000;font-size:13px;color:#000}
.bh-win95 .bh-title{background:linear-gradient(90deg,#000080,#1084d0);color:#fff;font-weight:700;padding:3px 6px;display:flex;justify-content:space-between}
.bh-win95 .bh-body{padding:16px;display:flex;gap:12px;align-items:center}
.bh-win95 .bh-icon{font-size:28px}
.bh-win95 .bh-btns{display:flex;gap:8px;justify-content:center;padding:0 16px 14px}
.bh-win95 button{font:12px Tahoma,var(--font);padding:4px 18px;background:#c0c0c0;border:2px outset #fff;cursor:pointer}
.bh-win95 button:active{border-style:inset}
/* dialog 2: scarier, modern, reusing the invasion's red-alert visual language in a new colour */
.bh-ov.bh-scary{background:radial-gradient(circle,#2a003acc,#000e);font-family:var(--font);color:#fff;animation:bhfade .3s}
@keyframes bhfade{from{opacity:0}}
.bh-box{position:relative;width:min(520px,90vw);padding:24px 24px 20px;border-radius:16px;background:#1a0028;border:4px solid #b23bff;text-align:center;
  box-shadow:0 0 0 5px #e8d9ff,0 0 0 10px #111,0 0 50px #a0f;animation:bhshake .4s infinite}
@keyframes bhshake{0%,100%{transform:translate(0,0)}50%{transform:translate(0,-2px)}}
.bh-box h1{margin:0;font:900 clamp(26px,6vw,46px)/1 Impact,'Arial Black',var(--font);color:#d9a7ff;letter-spacing:2px;text-shadow:0 0 12px #a0f}
.bh-box p{margin:10px 0;font-size:15px;line-height:1.4;color:#eaddff}
.bh-box .bh-btns{display:flex;gap:12px;justify-content:center;margin-top:16px;flex-wrap:wrap}
.bh-box button{font:800 16px var(--font);border-radius:10px;padding:11px 18px;cursor:pointer;border:3px solid #111}
.bh-go{background:#b23bff;color:#fff;box-shadow:0 0 16px #a0f}
.bh-no{background:#2a2a40;color:#ddd}
/* dialog 3: the final, deliberately-over-the-top warning that out-does the alien one */
.bh-ov.bh-final .bh-box{border-color:#ff2a2a;box-shadow:0 0 0 6px #ffd400,0 0 0 12px #111,0 0 80px #f00;animation:bhshake .18s infinite}
.bh-ov.bh-final .bh-sirens{display:flex;justify-content:space-between;position:absolute;left:-30px;right:-30px;top:-30px}
.bh-ov.bh-final .bh-siren{width:48px;height:48px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#f00 40%,#600);box-shadow:0 0 34px 12px #f00;animation:bhsiren .35s infinite alternate}
.bh-ov.bh-final .bh-siren:last-child{animation-delay:.18s}
@keyframes bhsiren{to{box-shadow:0 0 6px 2px #600;filter:brightness(.35)}}
.bh-ov.bh-final h1{color:#ff3b3b;animation:bhblink .4s steps(2) infinite}
@keyframes bhblink{50%{color:#ffd400}}
/* the full-screen black / white overlays used for the "swallowed" and "flash" moments */
#bhBlack,#bhWhite{position:fixed;inset:0;z-index:65;pointer-events:none;opacity:0;transition:opacity .3s}
#bhBlack{background:#000} #bhWhite{background:#fff}
#bhCap{position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:22;max-width:90vw;text-align:center;font:800 clamp(16px,3.3vw,24px) var(--font);color:#fff;
  padding:7px 20px;border-radius:14px;background:#1a0028cc;border:3px solid #b23bff;box-shadow:0 0 20px #a0f8;opacity:0;transition:opacity .5s;pointer-events:none}
#bhCap.on{opacity:1}
`;
    document.head.appendChild(style);
  }

  /* ----------------------------------------------------------------------------------------- confirm chain */
  // Three escalating "are you sure?" dialogs. Only the last one's two buttons both lead to onGo() - the joke
  // being that even "no" has given up pretending there is a way out.
  function confirmChain(onGo) {
    injectCSS();
    showPlain();

    function showPlain() {
      const overlay = document.createElement('div');
      overlay.className = 'bh-ov';
      overlay.innerHTML = `<div class="bh-win95"><div class="bh-title"><span>Black Hole Generator</span><span>✕</span></div>
        <div class="bh-body"><span class="bh-icon">⚠️</span><p>Are you sure you want to activate the black hole option? It's not safe.</p></div>
        <div class="bh-btns"><button class="bh-yes">Yes</button><button class="bh-no">No</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.bh-no').onclick = () => overlay.remove();
      overlay.querySelector('.bh-yes').onclick = () => { overlay.remove(); showScary(); };
    }

    function showScary() {
      const overlay = document.createElement('div');
      overlay.className = 'bh-ov bh-scary';
      overlay.innerHTML = `<div class="bh-box"><h1>⚠ SPACETIME WARNING ⚠</h1>
        <p>Scans confirm a genuine, honest-to-goodness black hole, parked a short distance from Nathaniel Planet.</p>
        <p>Activating it will not be gentle. There is no undo button in this universe.</p>
        <div class="bh-btns"><button class="bh-no">Cancel</button><button class="bh-go">Proceed anyway</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.bh-no').onclick = () => overlay.remove();
      overlay.querySelector('.bh-go').onclick = () => { overlay.remove(); showFinal(); };
    }

    function showFinal() {
      const overlay = document.createElement('div');
      overlay.className = 'bh-ov bh-scary bh-final';
      overlay.innerHTML = `<div class="bh-box"><div class="bh-sirens"><div class="bh-siren"></div><div class="bh-siren"></div></div>
        <h1>⚠ FINAL WARNING ⚠</h1>
        <p>This is worse than the alien invasion. <b>Much</b> worse. The planet, the cities, every chicken nugget: all of it, spaghettified into an event horizon.</p>
        <p>There are only two options and, between us, they are the same option.</p>
        <div class="bh-btns"><button class="bh-no">Nope, but I will anyway.</button><button class="bh-go">Yes. Of Course!</button></div></div>`;
      document.body.appendChild(overlay);
      const go = () => { overlay.remove(); onGo(); };
      overlay.querySelector('.bh-no').onclick = go;
      overlay.querySelector('.bh-go').onclick = go;
    }
  }

  /* ----------------------------------------------------------------------------------------- the dormant hole */
  let hole = null;         // { sprite, material, restDir } once spawned, until the sequence consumes it
  let glowTexture = null;  // shared canvas texture for the event-horizon glow (and the bomb's spark)

  // A soft disk texture: a near-black core, a bright glowing ring, and a scatter of white sparkle flecks.
  // Tinted at use-time via SpriteMaterial.color, so the same texture serves the yellow hole and its later violet/red anger.
  function makeGlowTexture() {
    const size = 256, canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const c = canvas.getContext('2d'), mid = size / 2;
    const gradient = c.createRadialGradient(mid, mid, 0, mid, mid, mid);
    gradient.addColorStop(0, 'rgba(5,2,8,1)');
    gradient.addColorStop(0.42, 'rgba(10,5,12,1)');
    gradient.addColorStop(0.46, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.62, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.82, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gradient;
    c.fillRect(0, 0, size, size);
    c.fillStyle = '#fff';                                              // sparkle flecks fizzing off the event horizon
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * 6.283, radius = mid * (0.46 + Math.random() * 0.38);
      const x = mid + Math.cos(angle) * radius, y = mid + Math.sin(angle) * radius, r = 0.6 + Math.random() * 1.8;
      c.globalAlpha = 0.4 + Math.random() * 0.6;
      c.beginPath();
      c.arc(x, y, r, 0, 6.283);
      c.fill();
    }
    c.globalAlpha = 1;
    return new THREE.CanvasTexture(canvas);
  }

  // True once a hole exists (i.e. an invasion has been seen through this session and the button should work).
  function unlocked() { return !!hole; }

  // Creates the dormant background hole, in world direction `direction` from the planet. Does nothing if one
  // already exists (running a second invasion shouldn't duplicate it).
  function spawnHole(ctx, direction) {
    if (hole) return;
    injectCSS();
    const THREE = ctx.T;
    if (!glowTexture) glowTexture = makeGlowTexture();
    const material = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffd400, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    const restDir = direction.clone().normalize();
    sprite.position.copy(restDir).multiplyScalar(26);
    sprite.scale.set(7, 7, 1);
    ctx.scene.add(sprite);
    hole = { sprite, material, restDir };
    document.body.classList.add('bh-unlocked');
  }

  /* ----------------------------------------------------------------------------------------- the main sequence */
  /* Runs the whole destroy-the-planet-and-back show. `ctx` holds: T, scene, planetGroup, camera, renderer,
     canvas, controls, station, satellites, volcanoes, tickers, partShader, planetMat, toon, onEnd.
     Returns { end } (end exists mainly for tests/symmetry with invasion.js; the show otherwise ends itself). */
  function start(ctx) {
    if (!hole) return { end() {} };      // shouldn't happen (the button is only live once a hole exists), but be safe
    injectCSS();
    const THREE = ctx.T, scene = ctx.scene, camera = ctx.camera;
    document.body.classList.add('bh-active');
    ctx.controls.enabled = false;

    const blackDiv = document.createElement('div'); blackDiv.id = 'bhBlack'; document.body.appendChild(blackDiv);
    const whiteDiv = document.createElement('div'); whiteDiv.id = 'bhWhite'; document.body.appendChild(whiteDiv);
    const capDiv = document.createElement('div'); capDiv.id = 'bhCap'; document.body.appendChild(capDiv);
    let capTimeLeft = 0;
    const caption = text => { capDiv.textContent = text; capDiv.classList.add('on'); capTimeLeft = 5; };

    // Things we create for the sequence and must dispose when it ends. Meshes using ctx.planetMat are tracked
    // separately, since that material belongs to index.html and must never be disposed here.
    const scratch = [], ownedMaterials = [], ownedGeometries = [];
    const track = (object, { ownMaterial } = {}) => { scene.add(object); scratch.push(object); if (ownMaterial) ownedMaterials.push(object.material); return object; };

    const holeDir = hole.restDir.clone();
    // A side-on vantage point for watching the hole approach the planet: roughly perpendicular to the hole's
    // direction, with a little lift, so both the planet and the incoming hole are in shot.
    let sideDir = new THREE.Vector3().crossVectors(holeDir, new THREE.Vector3(0, 1, 0));
    if (sideDir.lengthSq() < 1e-4) sideDir = new THREE.Vector3().crossVectors(holeDir, new THREE.Vector3(1, 0, 0));
    sideDir.normalize();
    const vantage = sideDir.clone().multiplyScalar(0.85).add(holeDir.clone().multiplyScalar(0.35)).add(new THREE.Vector3(0, 0.25, 0)).normalize().multiplyScalar(4.4);
    const camStart = camera.position.clone();

    // Proxies for the station/satellites/volcanoes being sucked in: the real objects are just hidden (their own
    // orbit/placement code keeps running on them harmlessly in the background) and simple stand-ins, captured
    // at their current world position, fly into the hole instead - much simpler than re-deriving their motion.
    const suckTargets = [];
    const worldPos = new THREE.Vector3();
    const addSuckTarget = (realObject, color, size) => {
      if (!realObject || !realObject.visible) return;
      realObject.getWorldPosition(worldPos);
      const proxy = track(new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), new THREE.MeshBasicMaterial({ color })), { ownMaterial: true });
      ownedGeometries.push(proxy.geometry);
      proxy.position.copy(worldPos);
      realObject.visible = false;
      suckTargets.push({ proxy, from: worldPos.clone(), delay: Math.random() * 1.2 });
    };
    if (ctx.station && ctx.station.group) addSuckTarget(ctx.station.group, 0xd9d9e0, 0.09);
    for (const satellite of (ctx.satellites || []).slice(0, 5)) addSuckTarget(satellite.g, 0xb7c3d6, 0.05);
    for (const volcano of (ctx.volcanoes || [])) addSuckTarget(volcano.group, 0x6d5a50, 0.1);

    // A little particle burst, built the same way invasion.js's explosions are, reusing ctx.partShader.
    function makeParticles(count, blending) {
      const attributes = { pos: new Float32Array(count * 3), col: new Float32Array(count * 3), size: new Float32Array(count), alpha: new Float32Array(count) };
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(attributes.pos, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(attributes.col, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(attributes.size, 1));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(attributes.alpha, 1));
      const material = ctx.partShader(blending), points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      track(points, { ownMaterial: true });
      ownedGeometries.push(geometry);
      const velocity = new Float32Array(count * 3), lifeLeft = new Float32Array(count), lifeTotal = new Float32Array(count);
      let nextSlot = 0;
      return {
        emit(position, vel, lifetime, size) {
          const i = nextSlot; nextSlot = (nextSlot + 1) % count;
          attributes.pos.set([position.x, position.y, position.z], i * 3);
          velocity.set([vel.x, vel.y, vel.z], i * 3);
          lifeLeft[i] = lifeTotal[i] = lifetime;
          attributes.size[i] = size;
          attributes.col.set([1, 0.6 + Math.random() * 0.4, 0.2 + Math.random() * 0.3], i * 3);
        },
        step(dt) {
          for (let i = 0; i < count; i++) {
            if (lifeLeft[i] <= 0) { attributes.alpha[i] = 0; continue; }
            lifeLeft[i] -= dt;
            const j = i * 3;
            for (let axis = 0; axis < 3; axis++) attributes.pos[j + axis] += velocity[j + axis] * dt;
            attributes.alpha[i] = Math.max(0, lifeLeft[i] / lifeTotal[i]);
          }
          geometry.attributes.position.needsUpdate = geometry.attributes.alpha.needsUpdate = geometry.attributes.color.needsUpdate = true;
        },
      };
    }
    const burst = makeParticles(1400, THREE.AdditiveBlending);

    // The "inside the black hole" shape group: one mesh at a time (torus, then disk, then cube, then the bomb),
    // built fresh for each shape and disposed before the next. Shares ctx.planetMat where possible so the shapes
    // carry the actual planet texture (geographically distorted, which is rather the point).
    const shapeGroup = track(new THREE.Group());
    let shapeMesh = null;
    const shapeMaterial = () => ctx.planetMat || new THREE.MeshStandardMaterial({ color: 0x2e7d4f, roughness: 0.8 });
    function setShape(kind) {
      if (shapeMesh) { shapeGroup.remove(shapeMesh); if (shapeMesh.geometry) shapeMesh.geometry.dispose(); shapeMesh = null; }
      if (kind === 'torus') shapeMesh = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.42, 32, 96), shapeMaterial());
      else if (kind === 'disk') shapeMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.18, 64), shapeMaterial());
      else if (kind === 'cube') shapeMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), shapeMaterial());
      else if (kind === 'bomb') {
        shapeMesh = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 18), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 }));
        const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a1a }));
        fuse.position.set(0, 1.05, 0);
        fuse.rotation.z = 0.3;
        const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffcc33, transparent: true, depthWrite: false }));
        spark.position.set(0.18, 1.3, 0);
        spark.scale.set(0.5, 0.5, 1);
        shapeMesh.add(body, fuse, spark);
      }
      if (shapeMesh) shapeGroup.add(shapeMesh);
    }

    // ---------- the phase/state machine, advanced one tick at a time ----------
    let phase = 'approach', phaseT = 0;
    const go = (next) => { phase = next; phaseT = 0; };

    const tick = (time, dt) => {
      phaseT += dt;
      capTimeLeft -= dt;
      if (capTimeLeft <= 0) capDiv.classList.remove('on');
      suckTargets.forEach(target => target.delay = Math.max(0, target.delay - dt));
      burst.step(dt);

      if (phase === 'approach') {
        const DURATION = 4;
        const p = Math.min(1, phaseT / DURATION), eased = p * p * (3 - 2 * p);
        hole.sprite.position.copy(holeDir).multiplyScalar(26 + (2.4 - 26) * eased);
        camera.position.copy(camStart).lerp(vantage, eased);
        camera.lookAt(0, 0, 0);
        if (p >= 1) { caption('The black hole moves in…'); go('suck'); }
      } else if (phase === 'suck') {
        const DURATION = 4.5;
        for (const target of suckTargets) {
          const local = Math.max(0, Math.min(1, (phaseT - target.delay) / 2.2));
          if (local <= 0) continue;
          const eased = local * local;
          target.proxy.position.copy(target.from).lerp(hole.sprite.position, eased);
          target.proxy.scale.setScalar(Math.max(0.001, 1 - eased));
        }
        if (phaseT >= DURATION) {
          for (const target of suckTargets) { scene.remove(target.proxy); target.proxy.geometry.dispose(); target.proxy.material.dispose(); }
          suckTargets.length = 0;
          caption('Nathaniel Planet is being spaghettified!');
          go('spaghetti');
        }
      } else if (phase === 'spaghetti') {
        const DURATION = 4;
        if (phaseT === dt) {   // first frame of this phase: point the planet's local +Z at the hole, once
          ctx.planetGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), holeDir);
        }
        const p = Math.min(1, phaseT / DURATION), eased = p * p;
        ctx.planetGroup.scale.set(1 - eased * 0.97, 1 - eased * 0.97, 1 + eased * 7);
        ctx.planetGroup.position.copy(holeDir).multiplyScalar(eased * 1.6);
        if (p >= 1) {
          ctx.planetGroup.visible = false;
          hole.material.color.set(0xff2a6d);
          caption('…and it is gone.');
          go('empty');
        }
      } else if (phase === 'empty') {
        hole.sprite.scale.setScalar(7 + Math.sin(phaseT * 3) * 1.1);
        if (phaseT >= 2.6) go('rush');
      } else if (phase === 'rush') {
        const DURATION = 1.3;
        const p = Math.min(1, phaseT / DURATION);
        hole.sprite.position.lerp(camera.position, p * 0.9);
        hole.sprite.scale.setScalar(7 + p * p * 60);
        blackDiv.style.opacity = String(p);
        if (p >= 1) go('flash');
      } else if (phase === 'flash') {
        if (phaseT < 0.08) whiteDiv.style.opacity = '1';
        else {
          const p = Math.min(1, (phaseT - 0.08) / 1.1);
          whiteDiv.style.opacity = String(1 - p);
          blackDiv.style.opacity = String(1 - p * 0.3);
          if (p >= 1) {
            ctx.controls.enabled = true;
            setShape('torus');
            caption('Nathaniel Planet… is a donut?!');
            go('torus');
          }
        }
      } else if (phase === 'torus' || phase === 'disk' || phase === 'cube') {
        if (shapeMesh) shapeMesh.rotation.y += dt * 0.35;
        if (phaseT >= 8) {
          const order = { torus: 'disk', disk: 'cube', cube: 'bomb' };
          const next = order[phase];
          setShape(next);
          ctx.controls.enabled = next !== 'bomb';   // stays explorable through disk and cube too; locked for the bomb cutscene
          caption(next === 'bomb' ? 'Uh oh.' : `Now it's a ${next}!`);
          go(next);
        }
      } else if (phase === 'bomb') {
        if (phaseT >= 1.6) {
          shapeGroup.remove(shapeMesh);
          shapeMesh = null;
          const origin = new THREE.Vector3(0, 0, 0);
          for (let i = 0; i < 260; i++) {
            const direction = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
            burst.emit(origin, direction.multiplyScalar(0.6 + Math.random() * 1.4), 1.6, 0.05 + Math.random() * 0.05);
          }
          caption('💥');
          go('explode');
        }
      } else if (phase === 'explode') {
        const DURATION = 1.8;
        const p = Math.min(1, phaseT / DURATION);
        camera.position.lerp(vantage.clone().setLength(6), p * 0.04);
        if (phaseT >= DURATION) go('reset');
      } else if (phase === 'reset') {
        const DURATION = 1.6;
        const p = Math.min(1, phaseT / DURATION), eased = p * p * (3 - 2 * p);
        camera.position.lerp(new THREE.Vector3(0, 0, 3), eased * 0.08);
        if (p >= 1) { end(); }
      }
    };
    ctx.tickers.push(tick);

    // Puts everything back: shows the real planet/station/satellites/volcanoes again, removes every object and
    // overlay we made, drops the black hole itself (the instability is resolved - running the invasion again
    // creates a fresh one), hands the camera and controls back, and tells index.html we're done.
    function end() {
      const tickerIndex = ctx.tickers.indexOf(tick);
      if (tickerIndex >= 0) ctx.tickers.splice(tickerIndex, 1);
      ctx.planetGroup.visible = true;
      ctx.planetGroup.scale.set(1, 1, 1);
      ctx.planetGroup.position.set(0, 0, 0);
      ctx.planetGroup.quaternion.identity();
      if (ctx.station && ctx.station.group) ctx.station.group.visible = true;
      for (const satellite of (ctx.satellites || [])) satellite.g.visible = true;
      for (const volcano of (ctx.volcanoes || [])) if (volcano.group) volcano.group.visible = true;
      for (const object of scratch) { scene.remove(object); if (object.traverse) object.traverse(mesh => { if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose(); }); }
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const material of ownedMaterials) if (material && material.dispose) material.dispose();
      scene.remove(hole.sprite);
      hole.material.dispose();
      hole = null;
      document.body.classList.remove('bh-unlocked', 'bh-active');
      blackDiv.remove(); whiteDiv.remove(); capDiv.remove();
      ctx.controls.enabled = true;
      if (ctx.onEnd) ctx.onEnd();
    }

    return { end };
  }

  root.NPBlackHole = { confirm: confirmChain, spawnHole, unlocked, start };
})(typeof window !== 'undefined' ? window : globalThis);
