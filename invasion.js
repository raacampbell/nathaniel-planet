/* The Alien Invasion of Nathaniel Planet (space age only).
   A ~3.5 minute show: saucers arrive, laser the towns, barbecue Mount Chicken Nugget, land and eat the nuggets,
   the planet fights back, the aliens flee, victory party, and everything goes back to how it was.
   The aliens and their ships are drawn in a glossy, realistic style on purpose, so they look wrong in the cartoon world.

   Layout of this file:
   - injectCSS(): the styles for the button, warning dialog, captions and victory screen.
   - confirmDialog(): the over-the-top "are you sure?" warning.
   - start(ctx): runs the whole show. `ctx` is handed over by index.html (the three.js scene, camera, cities,
     the volcano that is the nugget, helper functions...). Inside it: textures and models, particles, the
     SCRIPT timeline that spawns things at set times, tick() which moves everything each frame, victory() and end(). */
(function (root) {
  'use strict';

  let cssInjected = false;
  // Adds the invasion's stylesheet to the page (once).
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
#alienBtn{position:fixed;left:16px;bottom:16px;z-index:21;width:58px;height:52px;border:0;background:none;padding:0;cursor:pointer;filter:drop-shadow(0 3px 6px #000a)}
#alienBtn svg{width:100%;height:100%}
#alienBtn span{position:absolute;left:62px;bottom:14px;white-space:nowrap;font:600 13px var(--font);color:#ffd2d2;text-shadow:0 1px 3px #000}
#alienBtn{animation:abtn 1.6s ease-in-out infinite}
@keyframes abtn{50%{transform:scale(1.07)}}
body:not([data-age="space"]) #alienBtn{opacity:.35;filter:grayscale(1) drop-shadow(0 3px 6px #000a);cursor:default;animation:none}
body.invading #alienBtn, body.invading #ageBtn{display:none}
.inv-ov{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:radial-gradient(circle,#3a0000cc,#000e);font-family:var(--font);color:#fff;animation:invfade .3s}
@keyframes invfade{from{opacity:0}}
.inv-tape{position:absolute;left:-10%;width:120%;height:46px;background:repeating-linear-gradient(-45deg,#ffd400 0 34px,#111 34px 68px);box-shadow:0 0 18px #000;display:flex;align-items:center;justify-content:center;
  font:900 22px/1 Impact,'Arial Black',var(--font);letter-spacing:6px;color:#111;text-shadow:0 0 4px #ffd400,0 0 8px #ffd400}
.inv-tape b{background:#ffd400;padding:4px 14px;border:3px solid #111}
.inv-tape.t1{top:7%;transform:rotate(-4deg)} .inv-tape.t2{bottom:8%;transform:rotate(3deg)} .inv-tape.t3{top:22%;transform:rotate(6deg);opacity:.85;height:30px}
.inv-box{position:relative;width:min(560px,90vw);padding:26px 26px 22px;border-radius:18px;background:#1a0000;border:5px solid #ff2a2a;text-align:center;
  box-shadow:0 0 0 6px #ffd400,0 0 0 12px #111,0 0 60px #f00;animation:invshake .35s infinite}
@keyframes invshake{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(2px,-1px) rotate(.4deg)}50%{transform:translate(-2px,1px) rotate(-.4deg)}75%{transform:translate(1px,2px)}}
.inv-box h1{margin:0;font:900 clamp(30px,7vw,54px)/1 Impact,'Arial Black',var(--font);color:#ff3b3b;letter-spacing:3px;text-shadow:0 0 12px #f00,0 4px 0 #600;animation:invblink .5s steps(2) infinite}
@keyframes invblink{50%{color:#ffd400;text-shadow:0 0 18px #ff0,0 4px 0 #600}}
.inv-box h2{margin:10px 0 6px;font-size:clamp(18px,4vw,24px);color:#ffd400;text-transform:uppercase;letter-spacing:2px}
.inv-box p{margin:8px 0;font-size:15px;line-height:1.4;color:#ffdede}
.inv-box small{display:block;margin-top:4px;font-size:11px;color:#c99}
.inv-sirens{display:flex;justify-content:space-between;position:absolute;left:-26px;right:-26px;top:-26px}
.inv-siren{width:44px;height:44px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#f00 40%,#600);box-shadow:0 0 30px 10px #f00;animation:invsiren .4s infinite alternate}
.inv-siren:last-child{animation-delay:.2s}
@keyframes invsiren{to{box-shadow:0 0 6px 2px #600;filter:brightness(.4)}}
.inv-btns{display:flex;gap:12px;justify-content:center;margin-top:18px;flex-wrap:wrap}
.inv-btns button{font:800 17px var(--font);border-radius:12px;padding:12px 20px;cursor:pointer;border:3px solid #111}
.inv-go{background:repeating-linear-gradient(-45deg,#ff2a2a 0 14px,#b30000 14px 28px);color:#fff;text-shadow:0 2px 0 #000;box-shadow:0 0 20px #f00}
.inv-no{background:#2a2a40;color:#ddd}
#invAlert{position:fixed;inset:0;pointer-events:none;z-index:5;box-shadow:inset 0 0 90px 6px #ff000038;animation:invpulse 2.4s ease-in-out infinite;opacity:0;transition:opacity 1s}
body.invading #invAlert{opacity:1}
@keyframes invpulse{50%{box-shadow:inset 0 0 120px 18px #ff000055}}
#invCap{position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:22;max-width:90vw;text-align:center;font:800 clamp(17px,3.5vw,26px) var(--font);color:#fff;
  padding:8px 22px;border-radius:14px;background:#300c;border:3px solid #ff3b3b;box-shadow:0 0 24px #f008;opacity:0;transition:opacity .5s;pointer-events:none}
#invCap.on{opacity:1}
#invCap.good{background:#033c;border-color:#5fffa0;box-shadow:0 0 24px #0f88}
.inv-win{position:fixed;inset:0;z-index:70;pointer-events:none;display:grid;place-items:center;transition:opacity 1.4s}
.inv-win h1{position:relative;z-index:2;margin:0;font:900 clamp(54px,14vw,140px)/1 Impact,'Arial Black',var(--font);color:#ffd400;letter-spacing:4px;
  text-shadow:0 6px 0 #b35a00,0 0 30px #ff0,0 0 70px #f80;animation:invwin 1s ease-in-out infinite alternate}
.inv-win h2{position:relative;z-index:2;margin:10px 0 0;font:800 clamp(20px,4.5vw,36px) var(--font);color:#fff;text-shadow:0 3px 0 #2a1450,0 0 12px #000;text-align:center}
@keyframes invwin{from{transform:scale(.94) rotate(-2deg)}to{transform:scale(1.06) rotate(2deg)}}
.inv-win canvas{position:absolute;inset:0;width:100%;height:100%}
.inv-streamer{position:absolute;top:-80px;width:12px;height:70px;border-radius:6px;animation:invfall linear forwards}
@keyframes invfall{to{transform:translateY(115vh) rotate(720deg)}}
.inv-smile{position:absolute;bottom:-60px;font-size:44px;animation:invrise ease-out forwards}
@keyframes invrise{to{transform:translateY(-118vh) rotate(25deg)}}
`;
    document.head.appendChild(style);
  }

  /* ----------------------------------------------------------------------------------------- confirm dialog */
  // Shows the full-screen warning. "No" closes it; "Let them come" closes it and calls onGo() to start the show.
  function confirmDialog(onGo) {
    injectCSS();
    const overlay = document.createElement('div');
    overlay.className = 'inv-ov';
    overlay.innerHTML = `<div class="inv-tape t1"><b>⚠ DANGER ⚠ DANGER ⚠ DANGER ⚠</b></div><div class="inv-tape t3">DO NOT CROSS ✦ DO NOT CROSS ✦ DO NOT CROSS</div><div class="inv-tape t2"><b>⚠ ALIEN HAZARD ⚠ ALIEN HAZARD ⚠</b></div>
      <div class="inv-box"><div class="inv-sirens"><div class="inv-siren"></div><div class="inv-siren"></div></div>
        <h1>⚠ WARNING ⚠</h1><h2>Alien invasion imminent</h2>
        <p>Deep-space radar has detected a <b>HUGE</b> fleet of flying saucers heading straight for Nathaniel Planet.</p>
        <p>They have lasers. They have tentacles. They look <b>VERY</b> hungry. Mount Chicken Nugget may not survive.</p>
        <p>Are you absolutely, positively, completely sure you want to let them in?</p>
        <small>(Side effects may include explosions, fires, screaming, barbecued nuggets and wobbly screens.)</small>
        <div class="inv-btns"><button class="inv-no">No thanks, I like my planet</button><button class="inv-go">☠ LET THEM COME ☠</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.inv-no').onclick = () => overlay.remove();
    overlay.querySelector('.inv-go').onclick = () => { overlay.remove(); onGo(); };
  }

  /* ----------------------------------------------------------------------------------------- the show */

  /* Runs the invasion. `ctx` comes from index.html and holds: T (three.js), scene, planetGroup, camera,
     renderer, canvas, cities, nugget (the volcano with an `api` for barbecue/eat/rain/reset), tickers (a list of
     per-frame functions we add ours to), toon/withInk/inkMat (cartoon materials), partShader (particle
     material), placeOnSurface, TOWN_S (town scale), setFocus/releaseFocus (camera helpers) and onEnd.
     Returns { end, skipTo, advance, saucers, aliens, jets }. The last three and `advance` exist for testing. */
  function start(ctx) {
    injectCSS();
    const THREE = ctx.T, planetGroup = ctx.planetGroup, camera = ctx.camera;
    const UP = new THREE.Vector3(0, 1, 0), townScale = ctx.TOWN_S;
    const randomBetween = (low, high) => low + Math.random() * (high - low);

    // Everything we add to the scene is remembered here so end() can take it all away again.
    const objects = [], disposables = [];
    const addToScene = (object, parent) => {
      (parent || planetGroup).add(object);
      objects.push([object, parent || planetGroup]);
      return object;
    };
    document.body.classList.add('invading');
    const alertDiv = document.createElement('div');   // the pulsing red border round the screen
    alertDiv.id = 'invAlert';
    document.body.appendChild(alertDiv);
    const captionDiv = document.createElement('div');
    captionDiv.id = 'invCap';
    document.body.appendChild(captionDiv);
    let captionTimeLeft = 0;
    // Shows a headline at the top of the screen for 6 seconds. `good` makes it green (good news for the planet).
    const caption = (text, good) => {
      captionDiv.textContent = text;
      captionDiv.classList.toggle('good', !!good);
      captionDiv.classList.add('on');
      captionTimeLeft = 6;
    };

    const envMap = null, envLight = new THREE.Object3D();          // (a reflection map washed everything out; plain lights look better)

    /* ---------- canvas textures for the alien skin and eye ---------- */
    // Mottled green skin with veins and freckles, drawn on a canvas.
    const skinTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx2d = canvas.getContext('2d');
      ctx2d.fillStyle = '#4d8f2e';
      ctx2d.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 900; i++) {                                    // darker blotches
        ctx2d.fillStyle = `rgba(${randomBetween(20, 80) | 0},${randomBetween(70, 140) | 0},${randomBetween(10, 40) | 0},${randomBetween(0.15, 0.45)})`;
        ctx2d.beginPath();
        ctx2d.arc(randomBetween(0, 256), randomBetween(0, 128), randomBetween(1, 7), 0, 6.3);
        ctx2d.fill();
      }
      for (let i = 0; i < 60; i++) {                                     // wobbly purple veins
        ctx2d.strokeStyle = `rgba(90,30,60,${randomBetween(0.15, 0.35)})`;
        ctx2d.lineWidth = randomBetween(0.5, 1.5);
        ctx2d.beginPath();
        let pointX = randomBetween(0, 256), pointY = randomBetween(0, 128);
        ctx2d.moveTo(pointX, pointY);
        for (let step = 0; step < 6; step++) {
          pointX += randomBetween(-12, 12);
          pointY += randomBetween(-8, 8);
          ctx2d.lineTo(pointX, pointY);
        }
        ctx2d.stroke();
      }
      for (let i = 0; i < 120; i++) {                                    // pale freckles
        ctx2d.fillStyle = `rgba(200,240,140,${randomBetween(0.2, 0.5)})`;
        ctx2d.beginPath();
        ctx2d.arc(randomBetween(0, 256), randomBetween(0, 128), randomBetween(0.5, 2), 0, 6.3);
        ctx2d.fill();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    })();

    // A bloodshot eyeball with a yellow-orange iris and a slit pupil, drawn on a canvas.
    const eyeTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx2d = canvas.getContext('2d');
      ctx2d.fillStyle = '#f3ead8';
      ctx2d.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) {                                     // red veins running in from the edge
        ctx2d.strokeStyle = `rgba(190,30,30,${randomBetween(0.3, 0.7)})`;
        ctx2d.lineWidth = randomBetween(0.4, 1.6);
        ctx2d.beginPath();
        let angle = randomBetween(0, 6.3), radius = 125;
        ctx2d.moveTo(128 + Math.cos(angle) * radius, 128 + Math.sin(angle) * radius);
        for (let step = 0; step < 7; step++) {
          radius -= randomBetween(6, 12);
          angle += randomBetween(-0.15, 0.15);
          ctx2d.lineTo(128 + Math.cos(angle) * radius, 128 + Math.sin(angle) * radius);
        }
        ctx2d.stroke();
      }
      const irisGradient = ctx2d.createRadialGradient(128, 128, 8, 128, 128, 62);
      irisGradient.addColorStop(0, '#ffef6a');
      irisGradient.addColorStop(0.5, '#e38a12');
      irisGradient.addColorStop(0.92, '#7a2a05');
      irisGradient.addColorStop(1, '#2a0a00');
      ctx2d.fillStyle = irisGradient;
      ctx2d.beginPath();
      ctx2d.arc(128, 128, 62, 0, 6.3);
      ctx2d.fill();
      for (let i = 0; i < 90; i++) {                                     // fibres radiating through the iris
        const angle = i / 90 * 6.283;
        ctx2d.strokeStyle = `rgba(80,30,0,${randomBetween(0.2, 0.5)})`;
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        ctx2d.moveTo(128 + Math.cos(angle) * 14, 128 + Math.sin(angle) * 14);
        ctx2d.lineTo(128 + Math.cos(angle) * 60, 128 + Math.sin(angle) * 60);
        ctx2d.stroke();
      }
      ctx2d.fillStyle = '#050505';                                       // slit pupil
      ctx2d.beginPath();
      ctx2d.ellipse(128, 128, 9, 46, 0, 0, 6.3);
      ctx2d.fill();
      ctx2d.fillStyle = 'rgba(255,255,255,0.85)';                        // glint
      ctx2d.beginPath();
      ctx2d.ellipse(104, 104, 10, 7, -0.6, 0, 6.3);
      ctx2d.fill();
      return new THREE.CanvasTexture(canvas);
    })();
    disposables.push(skinTexture, eyeTexture);

    const skinMaterial = new THREE.MeshStandardMaterial({ map: skinTexture, color: 0xffffff, roughness: 0.32, metalness: 0.05, envMap: envMap, envMapIntensity: 0.9 });
    const skinUnderMaterial = new THREE.MeshStandardMaterial({ color: 0xc8d98a, roughness: 0.45, metalness: 0, envMap: envMap, envMapIntensity: 0.6 });
    const eyeMaterial = new THREE.MeshStandardMaterial({ map: eyeTexture, roughness: 0.06, metalness: 0, envMap: envMap, envMapIntensity: 1.2 });

    // Riveted grey metal hull plates for the saucers, drawn on a canvas.
    const hullTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const ctx2d = canvas.getContext('2d');
      ctx2d.fillStyle = '#9aa1a8';
      ctx2d.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 400; i++) {                                    // lighter patches
        ctx2d.fillStyle = `rgba(${randomBetween(120, 190) | 0},${randomBetween(125, 195) | 0},${randomBetween(135, 205) | 0},0.35)`;
        ctx2d.fillRect(randomBetween(0, 512), randomBetween(0, 256), randomBetween(10, 60), randomBetween(6, 30));
      }
      ctx2d.strokeStyle = 'rgba(30,32,36,0.8)';
      ctx2d.lineWidth = 2;
      for (let y = 0; y < 256; y += 32) { ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(512, y); ctx2d.stroke(); }   // plate seams: rows...
      for (let x = 0; x < 512; x += 32) {                                                                                  // ...and staggered columns
        for (let y = 0; y < 256; y += 32) {
          ctx2d.beginPath();
          ctx2d.moveTo(x + (y / 32 % 2) * 16, y);
          ctx2d.lineTo(x + (y / 32 % 2) * 16, y + 32);
          ctx2d.stroke();
        }
      }
      ctx2d.fillStyle = 'rgba(20,20,24,0.7)';                            // rivets
      for (let x = 0; x < 512; x += 8) for (let y = 4; y < 256; y += 32) ctx2d.fillRect(x, y, 2, 2);
      for (let i = 0; i < 40; i++) {                                     // rust stains
        ctx2d.fillStyle = `rgba(60,40,20,${randomBetween(0.1, 0.3)})`;
        ctx2d.beginPath();
        ctx2d.ellipse(randomBetween(0, 512), randomBetween(0, 256), randomBetween(4, 30), randomBetween(2, 10), 0, 0, 6.3);
        ctx2d.fill();
      }
      return new THREE.CanvasTexture(canvas);
    })();
    disposables.push(hullTexture);
    const hullMaterial = new THREE.MeshStandardMaterial({ color: 0xc4cad2, map: hullTexture, metalness: 0.55, roughness: 0.32 });
    const hullDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.8, roughness: 0.4, envMap: envMap });
    const domeMaterial = new THREE.MeshStandardMaterial({ color: 0x7dffcf, emissive: 0x0b5a3c, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.62, envMap: envMap, envMapIntensity: 1.4 });
    disposables.push(skinMaterial, skinUnderMaterial, eyeMaterial, hullMaterial, hullDarkMaterial, domeMaterial);

    /* ---------- the flying saucer ---------- */
    const SAUCER_SIZE = 0.05;                                                    // diameter in world units
    // The saucer body: a profile curve spun round into a disc shape.
    const saucerGeometry = (() => {
      const profile = [[0, -0.12], [0.18, -0.13], [0.36, -0.11], [0.47, -0.06], [0.5, 0], [0.46, 0.04], [0.33, 0.08], [0.2, 0.11], [0, 0.12]]
        .map(point => new THREE.Vector2(point[0], point[1]));
      return new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(40).map(point => new THREE.Vector2(Math.max(0, point.x), point.y)), 64);
    })();
    disposables.push(saucerGeometry);
    const rimLightGeometry = new THREE.SphereGeometry(0.022, 10, 8);
    disposables.push(rimLightGeometry);

    /* Builds one saucer: hull, rim ring, glass dome with a little pilot, 16 blinking rim lights, an underside
       glow and a tractor beam (hidden until needed). Returns { group, body, lights, beam, under }. */
    function makeSaucer() {
      const group = new THREE.Group(), body = new THREE.Group();
      group.add(body);
      body.add(new THREE.Mesh(saucerGeometry, hullMaterial));
      body.add(new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.025, 10, 64).rotateX(Math.PI / 2), hullDarkMaterial));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.19, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.1, 0), domeMaterial);
      body.add(dome);
      const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12).translate(0, 0.15, 0), skinMaterial);
      body.add(pilot);
      const lights = [];
      for (let i = 0; i < 16; i++) {
        const angle = i / 16 * 6.283;
        const light = new THREE.Mesh(rimLightGeometry, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x6bff8a : 0xff4a4a }));
        light.position.set(Math.cos(angle) * 0.475, 0.0, Math.sin(angle) * 0.475);
        body.add(light);
        lights.push(light);
      }
      const under = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32).rotateX(Math.PI / 2).translate(0, -0.125, 0), new THREE.MeshBasicMaterial({ color: 0x8dffb0 }));
      body.add(under);
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 1, 32, 1, true).translate(0, -0.5, 0),
        new THREE.MeshBasicMaterial({ color: 0x8dffb0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = -0.12;
      beam.visible = false;
      group.add(beam);
      group.scale.setScalar(SAUCER_SIZE);
      return { group, body, lights, beam, under };
    }

    /* ---------- the aliens: glossy, lumpy, too many tentacles, one enormous eye ---------- */
    // A lumpy egg-shaped body: a sphere pushed about by sine waves.
    const alienBodyGeometry = (() => {
      const geometry = new THREE.SphereGeometry(0.5, 48, 32), positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        const lump = 1 + 0.07 * Math.sin(x * 17 + y * 5) * Math.cos(z * 13 - y * 9) + 0.04 * Math.sin(y * 31 + x * 7);
        positions.setXYZ(i, x * lump * 0.9, y * lump * 1.15 + 0.05, z * lump * 0.85);
      }
      geometry.computeVertexNormals();
      return geometry;
    })();
    const eyeGeometry = new THREE.SphereGeometry(0.3, 40, 28), lidGeometry = new THREE.SphereGeometry(0.315, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
    // Each tentacle is a chain of tapering cylinder segments.
    const segmentGeometries = [], SEGMENT_COUNT = 9;
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const radiusTop = 0.075 * (1 - i / SEGMENT_COUNT) + 0.012, radiusBottom = 0.075 * (1 - (i + 1) / SEGMENT_COUNT) + 0.012;
      segmentGeometries.push(new THREE.CylinderGeometry(radiusBottom, radiusTop, 0.11, 14, 1).translate(0, -0.055, 0));
    }
    const tipGeometry = new THREE.SphereGeometry(0.014, 10, 8), suckerGeometry = new THREE.SphereGeometry(0.018, 10, 8);
    disposables.push(alienBodyGeometry, eyeGeometry, lidGeometry, tipGeometry, suckerGeometry, ...segmentGeometries);

    /* Builds one alien: lumpy body, belly, giant eye with an eyelid, mouth and seven wiggly tentacles.
       Returns { group, bodyGroup, eye, lid, tentacles, blink }. */
    function makeAlien() {
      const group = new THREE.Group(), bodyGroup = new THREE.Group();
      group.add(bodyGroup);
      const body = new THREE.Mesh(alienBodyGeometry, skinMaterial);
      body.position.y = 0.62;
      bodyGroup.add(body);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.33, 24, 16).scale(1, 1.2, 0.6).translate(0, 0.5, 0.2), skinUnderMaterial);
      bodyGroup.add(belly);
      disposables.push(belly.geometry);
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(0, 0.86, 0.22);
      bodyGroup.add(eye);
      const lid = new THREE.Mesh(lidGeometry, skinMaterial);
      lid.position.copy(eye.position);
      lid.rotation.x = -0.25;
      bodyGroup.add(lid);
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 20, Math.PI), new THREE.MeshStandardMaterial({ color: 0x3a0a1a, roughness: 0.3, envMap: envMap }));
      mouth.position.set(0, 0.5, 0.4);
      mouth.rotation.z = Math.PI;
      bodyGroup.add(mouth);
      disposables.push(mouth.geometry, mouth.material);
      const tentacles = [];
      for (let k = 0; k < 7; k++) {
        const angle = k / 7 * 6.283, tentacleRoot = new THREE.Group();
        tentacleRoot.position.set(Math.sin(angle) * 0.28, 0.4, Math.cos(angle) * 0.26);
        tentacleRoot.rotation.set(0.9, angle, 0, 'YXZ');
        bodyGroup.add(tentacleRoot);
        let parent = tentacleRoot;
        const segments = [];
        for (let i = 0; i < SEGMENT_COUNT; i++) {
          const segment = new THREE.Group();
          segment.position.y = i ? -0.105 : 0;
          parent.add(segment);
          segment.add(new THREE.Mesh(segmentGeometries[i], skinMaterial));
          if (i % 2 === 1) {                                              // a sucker on every other segment
            const sucker = new THREE.Mesh(suckerGeometry, skinUnderMaterial);
            sucker.position.set(0, -0.05, 0.05 * (1 - i / SEGMENT_COUNT) + 0.008);
            sucker.scale.setScalar(1 - i / SEGMENT_COUNT * 0.6);
            segment.add(sucker);
          }
          segments.push(segment);
          parent = segment;
        }
        const tip = new THREE.Mesh(tipGeometry, skinMaterial);
        tip.position.y = -0.11;
        parent.add(tip);
        tentacles.push({ segs: segments, ph: Math.random() * 6, a: angle });   // segs: the segment groups, ph: wiggle phase, a: angle round the body
      }
      group.scale.setScalar(townScale * 1.7);
      return { group, bodyGroup, eye, lid, tentacles, blink: 0 };
    }

    // Animates an alien's tentacles (a travelling wave of wiggles) and makes it blink now and then.
    function wiggle(alien, time, speed, amplitude) {
      for (const tentacle of alien.tentacles) {
        tentacle.segs.forEach((segment, i) => {
          segment.rotation.x = Math.sin(time * speed + tentacle.ph + i * 0.7) * amplitude * (0.4 + i * 0.12);
          segment.rotation.z = Math.cos(time * speed * 0.8 + tentacle.ph + i * 0.9) * amplitude * 0.5;
        });
      }
      alien.blink -= 0.016;
      if (alien.blink < -3 - Math.random() * 3) alien.blink = 0.15;
      alien.lid.rotation.x = alien.blink > 0 ? 0.6 : -0.25;
    }

    /* ---------- defenders: cartoon jets and turrets (the planet's own style) ---------- */
    // A small cartoon jet fighter in colour `color`, pointing along +x.
    function makeJet(color) {
      const group = new THREE.Group();
      const fuselage = ctx.withInk(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1, 10).rotateZ(-Math.PI / 2), ctx.toon(color)), 1.12);
      group.add(fuselage);
      group.add(ctx.withInk(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 10).rotateZ(-Math.PI / 2).translate(0.64, 0, 0), ctx.toon(color)), 1.12));   // nose
      group.add(ctx.withInk(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 1.1).translate(-0.05, 0, 0), ctx.toon(0xffffff)), 1.1));                   // wings
      group.add(ctx.withInk(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.03).translate(-0.42, 0.14, 0), ctx.toon(color)), 1.1));                    // tail fin
      group.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8).scale(1.8, 0.9, 1).translate(0.3, 0.07, 0), ctx.toon(0x6ad0ff)));                  // cockpit
      group.scale.setScalar(0.012);
      return group;
    }
    // An anti-saucer gun turret: a round base with a twin-barrelled gun that can swivel. Returns { group, gun }.
    function makeTurret() {
      const group = new THREE.Group(), gun = new THREE.Group();
      group.add(ctx.withInk(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 14).translate(0, 0.2, 0), ctx.toon(0x6b7a4a)), 1.08));
      gun.add(ctx.withInk(new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), ctx.toon(0x7d8c56)), 1.08));
      for (const barrelZ of [-0.12, 0.12]) {
        gun.add(ctx.withInk(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 8).translate(0, 0.5, barrelZ), ctx.toon(0x3a3f46)), 1.1));
      }
      gun.position.y = 0.45;
      group.add(gun);
      group.scale.setScalar(townScale * 1.3);
      return { group, gun };
    }

    /* ---------- particles: explosions, fire, smoke ---------- */
    /* A pool of `count` point sprites that fly about and fade. Returns { emit, step }.
       emit(position, velocity, lifetime, startSize, endSize, startColor, endColor, opacity) starts one particle
       (reusing the oldest slot); step(dt, drag, gravity) moves them all. `blending` is the three.js blending mode. */
    function particles(count, blending) {
      const attributes = { pos: new Float32Array(count * 3), col: new Float32Array(count * 3), size: new Float32Array(count), alpha: new Float32Array(count) };
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(attributes.pos, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(attributes.col, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(attributes.size, 1));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(attributes.alpha, 1));
      const material = ctx.partShader(blending), points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      addToScene(points);
      disposables.push(geometry, material);
      // Per-particle state that does not go to the GPU.
      const velocity = new Float32Array(count * 3), lifeLeft = new Float32Array(count), lifeTotal = new Float32Array(count);
      const sizeStart = new Float32Array(count), sizeEnd = new Float32Array(count);
      const colorStart = new Float32Array(count * 3), colorEnd = new Float32Array(count * 3), opacity = new Float32Array(count);
      let nextSlot = 0;
      return {
        emit(position, vel, lifetime, startSize, endSize, startColor, endColor, opacityScale) {
          const i = nextSlot;
          nextSlot = (nextSlot + 1) % count;
          attributes.pos[i * 3] = position.x; attributes.pos[i * 3 + 1] = position.y; attributes.pos[i * 3 + 2] = position.z;
          velocity[i * 3] = vel.x; velocity[i * 3 + 1] = vel.y; velocity[i * 3 + 2] = vel.z;
          lifeLeft[i] = lifeTotal[i] = lifetime;
          sizeStart[i] = startSize; sizeEnd[i] = endSize;
          colorStart.set(startColor, i * 3);
          colorEnd.set(endColor || startColor, i * 3);
          opacity[i] = opacityScale || 1;
        },
        step(dt, drag, gravity) {
          material.uniforms.uScale.value = innerHeight * 0.5 * ctx.renderer.getPixelRatio() / Math.tan(camera.fov * Math.PI / 360) / 2.3;
          for (let i = 0; i < count; i++) {
            if (lifeLeft[i] <= 0) { attributes.alpha[i] = 0; continue; }
            lifeLeft[i] -= dt;
            const remaining = Math.max(0, lifeLeft[i] / lifeTotal[i]), elapsed = 1 - remaining, j = i * 3;
            if (gravity) {                                                  // gravity pulls toward the planet's centre
              const x = attributes.pos[j], y = attributes.pos[j + 1], z = attributes.pos[j + 2], distance = Math.hypot(x, y, z) || 1;
              velocity[j] -= x / distance * gravity * dt;
              velocity[j + 1] -= y / distance * gravity * dt;
              velocity[j + 2] -= z / distance * gravity * dt;
            }
            for (let axis = 0; axis < 3; axis++) {
              velocity[j + axis] *= 1 - drag * dt;
              attributes.pos[j + axis] += velocity[j + axis] * dt;
              attributes.col[j + axis] = colorStart[j + axis] + (colorEnd[j + axis] - colorStart[j + axis]) * elapsed;
            }
            attributes.size[i] = sizeStart[i] + (sizeEnd[i] - sizeStart[i]) * elapsed;
            attributes.alpha[i] = Math.min(1, remaining * 2.5) * opacity[i];
          }
          geometry.attributes.position.needsUpdate = geometry.attributes.color.needsUpdate = geometry.attributes.size.needsUpdate = geometry.attributes.alpha.needsUpdate = true;
        },
      };
    }
    const fireParticles = particles(2600, THREE.AdditiveBlending);
    const smokeParticles = particles(1800, THREE.NormalBlending);
    const sparkParticles = particles(900, THREE.AdditiveBlending);

    // A soft round glow, used for the bright flash of an explosion.
    const flashTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx2d = canvas.getContext('2d');
      const gradient = ctx2d.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,230,1)');
      gradient.addColorStop(0.3, 'rgba(255,200,80,0.8)');
      gradient.addColorStop(1, 'rgba(255,80,0,0)');
      ctx2d.fillStyle = gradient;
      ctx2d.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(canvas);
    })();
    disposables.push(flashTexture);
    // A pool of 16 flash sprites, reused in turn. Each: { sprite, age, duration, size }.
    const flashes = [];
    for (let i = 0; i < 16; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      sprite.visible = false;
      addToScene(sprite);
      flashes.push({ sprite, age: 0, duration: 1, size: 1 });
      disposables.push(sprite.material);
    }
    let nextFlash = 0;

    // Scratch objects reused every frame to avoid creating garbage.
    const tmpVec = new THREE.Vector3(), tmpRandom = new THREE.Vector3(), tmpQuat = new THREE.Quaternion();
    // A random vector with each component between -scale/2 and +scale/2 (shared scratch object: use it straight away).
    const randomVector = scale => tmpRandom.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(scale);

    /* ---------- action log: where the excitement is (for the automatic camera and screen shake) ---------- */
    const events = [];                  // recent happenings: { position (unit vector), weight, time }
    let shake = 0, showTime = 0;        // screen shake strength; seconds since the invasion began
    // Records that something exciting happened at position p; the automatic camera looks for clusters of these.
    const noteEvent = (position, weight) => {
      events.push({ p: position.clone().normalize(), w: weight, t: showTime });
      if (events.length > 200) events.shift();
    };
    // An explosion at `position`: fire, smoke and sparks, a flash, and (if we're looking) screen shake.
    function explode(position, size, big) {
      const outward = position.clone().normalize();
      for (let i = 0; i < (big ? 70 : 30); i++) {
        fireParticles.emit(position, tmpVec.copy(randomVector(1)).normalize().multiplyScalar(randomBetween(0.01, 0.05) * size).addScaledVector(outward, 0.015 * size), randomBetween(0.4, 0.9), 0.006 * size, 0.02 * size, [1, 0.95, 0.6], [0.8, 0.15, 0.02]);
      }
      for (let i = 0; i < (big ? 40 : 14); i++) {
        smokeParticles.emit(position, tmpVec.copy(randomVector(0.02 * size)).addScaledVector(outward, randomBetween(0.01, 0.025) * size), randomBetween(1.5, 3), 0.01 * size, 0.045 * size, [0.35, 0.32, 0.3], [0.6, 0.58, 0.56], 0.8);
      }
      for (let i = 0; i < (big ? 50 : 18); i++) {
        sparkParticles.emit(position, tmpVec.copy(randomVector(1)).normalize().multiplyScalar(randomBetween(0.04, 0.12) * size).addScaledVector(outward, 0.05 * size), randomBetween(0.5, 1.2), 0.003 * size, 0.001, [1, 0.9, 0.4], [1, 0.3, 0]);
      }
      const flash = flashes[nextFlash++ % flashes.length];
      flash.sprite.position.copy(position);
      flash.age = 0;
      flash.duration = big ? 0.7 : 0.4;
      flash.size = (big ? 0.12 : 0.05) * size;
      flash.sprite.visible = true;
      noteEvent(position, big ? 6 : 2);
      const viewDirection = camera.position.clone().normalize();
      if (outward.dot(viewDirection) > Math.cos(0.45)) {                // only shake if the explosion is on the side we are looking at
        shake = Math.min(1.4, shake + (big ? 0.9 : 0.35) * size * Math.max(0.3, 1.8 - (camera.position.length() - 1)));
      }
    }

    const fires = [];     // burning spots: { p: position, n: up direction, life: seconds left, k: strength, acc: spark accumulator }
    function addFire(position, life, strength) {
      if (fires.length > 70) fires.shift();
      fires.push({ p: position.clone(), n: position.clone().normalize(), life, k: strength || 1, acc: 0 });
    }

    /* ---------- lasers and tracers ---------- */
    const beamGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0);
    disposables.push(beamGeometry);
    const beams = [];     // laser beams: { core, glow, t: seconds left, life }
    // Fires a laser from point `from` to point `to`, width `width`, visible for `life` seconds. Reuses a finished beam if there is one.
    function fireBeam(from, to, color, width, life) {
      let laser = beams.find(candidate => candidate.t <= 0);
      if (!laser) {
        if (beams.length > 60) return;
        const core = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        const glow = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
        addToScene(core);
        addToScene(glow);
        laser = { core, glow, t: 0 };
        beams.push(laser);
        disposables.push(core.material, glow.material);
      }
      tmpVec.copy(to).sub(from);
      const length = tmpVec.length();
      tmpQuat.setFromUnitVectors(UP, tmpVec.normalize());
      for (const [mesh, meshWidth] of [[laser.core, width * 0.35], [laser.glow, width]]) {
        mesh.position.copy(from);
        mesh.quaternion.copy(tmpQuat);
        mesh.scale.set(meshWidth, length, meshWidth);
        mesh.visible = true;
      }
      laser.glow.material.color.set(color);
      laser.t = life;
      laser.life = life;
    }
    const tracers = [];   // jet and turret bullets: { m: mesh, t: seconds left, p: position, d: direction, sp: speed, onEnd }
    // Fires a tracer bullet from `from` heading in `direction` at `speed` for `life` seconds; calls onEnd() when it arrives.
    function fireTracer(from, direction, speed, color, life, onEnd) {
      let bullet = tracers.find(candidate => candidate.t <= 0);
      if (!bullet) {
        if (tracers.length > 120) return;
        const mesh = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        addToScene(mesh);
        bullet = { m: mesh, t: 0, p: new THREE.Vector3(), d: new THREE.Vector3() };
        tracers.push(bullet);
        disposables.push(mesh.material);
      }
      bullet.p.copy(from);
      bullet.d.copy(direction).normalize();
      bullet.sp = speed;
      bullet.t = life;
      bullet.onEnd = onEnd;
      bullet.m.material.color.set(color);
      bullet.m.visible = true;
      bullet.m.quaternion.setFromUnitVectors(UP, bullet.d);
      bullet.m.scale.set(0.0006, 0.009, 0.0006);
    }

    /* ---------- the cast ---------- */
    const cities = ctx.cities.slice(), nugget = ctx.nugget;
    const saucers = [], aliens = [], jets = [], turrets = [];
    // Two perpendicular unit vectors lying on the planet's surface at direction `normal`.
    const surfaceAxes = normal => {
      const east = new THREE.Vector3().crossVectors(normal, Math.abs(normal.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : UP).normalize();
      return [east, new THREE.Vector3().crossVectors(east, normal)];
    };
    // The point on the planet `distance` radians away from `normal`, in compass direction `angle`.
    const offsetPoint = (normal, angle, distance) => {
      const [east, north] = surfaceAxes(normal);
      return normal.clone().multiplyScalar(Math.cos(distance)).addScaledVector(east.multiplyScalar(Math.cos(angle)).addScaledVector(north, Math.sin(angle)), Math.sin(distance)).normalize();
    };
    // Turns `object` to stand on the planet at direction `normal`, facing the direction `forward`.
    const orient = (object, normal, forward) => {
      tmpVec.copy(forward).addScaledVector(normal, -forward.dot(normal)).normalize();
      const basis = new THREE.Matrix4().makeBasis(tmpVec, normal, new THREE.Vector3().crossVectors(tmpVec, normal));
      object.quaternion.setFromRotationMatrix(basis);
    };
    const cameraDirection = () => camera.position.clone().normalize();
    // target order: the city in view first, then the others
    cities.sort((a, b) => b.n.dot(cameraDirection()) - a.n.dot(cameraDirection()));
    let nextCityIndex = 0;

    /* Adds a saucer that flies in from deep space. `role` is 'attack' (lasers a city), 'bbq' (barbecues the
       nugget mountain) or 'lander' (lands beside the nuggets). `target` defaults to the next city in turn. */
    function spawnSaucer(role, target) {
      const parts = makeSaucer();
      addToScene(parts.group);
      const chosenTarget = target || cities[nextCityIndex++ % cities.length];
      const home = chosenTarget.n.clone();
      const startPos = home.clone().add(randomVector(1.2)).normalize().multiplyScalar(4.5);
      const saucer = {
        ...parts, role, tgt: chosenTarget, home, alt: randomBetween(1.075, 1.1), state: 'arrive', t: 0, from: startPos, pos: startPos.clone(),
        hp: 7 + Math.random() * 4, fire: randomBetween(0.5, 1.5), drift: Math.random() * 6, n: new THREE.Vector3(), id: saucers.length, roam: randomBetween(9, 16),
      };
      // Saucer fields: tgt = what it is attacking, alt = hover height (planet radius = 1), t = seconds in the current
      // state, from = where its current flight started, hp = hit points, fire = seconds until next shot,
      // drift = random angle offset for hovering, n = its direction from the centre, roam = seconds until it picks a new city.
      saucers.push(saucer);
      return saucer;
    }
    // Where a hovering saucer wants to be at time t: circling its target city (or the nugget mountain), as a direction from the planet's centre.
    function saucerHome(saucer, time) {
      if (saucer.role === 'bbq' || saucer.role === 'lander') {
        return offsetPoint(nugget.n, saucer.id * 2.1 + time * 0.12, saucer.role === 'lander' ? 0.055 : 0.03);
      }
      const orbitRadius = (saucer.tgt.Rw || 0.05) * 0.55;
      return offsetPoint(saucer.home, saucer.drift + time * 0.25, orbitRadius * (0.6 + 0.4 * Math.sin(time * 0.3 + saucer.id)));
    }
    // A random spot within a city (for laser strikes).
    function cityTarget(city) { return offsetPoint(city.n, Math.random() * 6.283, Math.sqrt(Math.random()) * (city.Rw || 0.05) * 0.85); }

    let landed = null, nuggetsEaten = 0, barbecueAmount = 0;   // the landed saucer (if any), how many nuggets eaten, how cooked the mountain is (0..1)
    // Aliens walk out of the landed saucer toward the nugget pile. Does nothing until a saucer has landed.
    function spawnAliens(count) {
      if (!landed) return;
      for (let i = 0; i < count; i++) {
        const parts = makeAlien();
        addToScene(parts.group);
        const start = landed.ground.clone(), pileSpot = ctx.nugget.api.pileWorld(aliens.length * 5 + 3).normalize();
        aliens.push({ ...parts, pos: start.clone(), spot: offsetPoint(pileSpot, Math.random() * 6.28, 0.004), state: 'walk', t: Math.random() * 3, speed: randomBetween(0.006, 0.01), eat: randomBetween(1.5, 3) });
        // Alien fields: spot = where it eats, t = animation time, eat = seconds until the next nugget is swallowed.
      }
    }
    // Scrambles `count` jets from the first few cities.
    function launchJets(count) {
      for (let i = 0; i < count; i++) {
        const group = makeJet([0x2f6fb0, 0xff4d4d, 0x7ed957, 0xffd23f, 0xffffff][jets.length % 5]);
        addToScene(group);
        const city = cities[Math.floor(Math.random() * Math.min(cities.length, 6))];
        jets.push({ g: group, pos: city.n.clone().multiplyScalar(1.02), vel: city.n.clone().multiplyScalar(0.05), target: null, cool: randomBetween(0.5, 1.5), ph: Math.random() * 6 });
        // Jet fields: vel = velocity, target = the saucer it is chasing, cool = seconds until it can shoot, ph = phase of its weaving.
      }
    }
    // Puts three gun turrets round a city.
    function buildTurrets(city) {
      for (let i = 0; i < 3; i++) {
        const turret = makeTurret(), normal = offsetPoint(city.n, i * 2.1 + Math.random(), (city.Rw || 0.05) * 0.95);
        addToScene(turret.group);
        ctx.placeOnSurface(turret.group, normal, 1.0, Math.random() * 6);
        turrets.push({ ...turret, n: normal, city, cool: randomBetween(0.3, 1.0) });
      }
    }
    // The nearest saucer that is still a threat (not gone, crashing or fleeing) to point p, or null.
    const nearestSaucer = point => {
      let best = null, bestDistance = 9;
      for (const saucer of saucers) {
        if (saucer.state === 'gone' || saucer.state === 'crash' || saucer.state === 'flee') continue;
        const distance = saucer.pos.distanceTo(point);
        if (distance < bestDistance) { bestDistance = distance; best = saucer; }
      }
      return best;
    };
    // Hurts a saucer; when its hit points run out it starts to crash (unless it is the landed one).
    function damage(saucer, amount) {
      saucer.hp -= amount;
      if (saucer.hp <= 0 && saucer.state !== 'crash' && saucer.state !== 'flee' && saucer.state !== 'gone' && saucer !== landed) {
        saucer.state = 'crash';
        saucer.t = 0;
        saucer.spin = randomBetween(4, 8);
        saucer.vel = saucer.pos.clone().normalize().multiplyScalar(-0.02).add(randomVector(0.03));
        explode(saucer.pos, 1.0, false);
        caption(['Direct hit!', 'Got one!', 'Saucer down!', 'Kaboom! One less saucer!'][Math.floor(Math.random() * 4)], true);
      }
    }

    /* ---------- the story ---------- */
    // The timeline: [seconds since the start, what happens]. Each entry runs once when its time arrives.
    const SCRIPT = [
      [0.5, () => caption('🚨 RED ALERT! Strange lights in the sky… 🚨')],
      [3, () => spawnSaucer('attack')],
      [7, () => caption(`A flying saucer is attacking ${saucers[0].tgt.name}!`)],
      [15, () => spawnSaucer('attack')], [20, () => spawnSaucer('attack')], [24, () => spawnSaucer('attack')],
      [30, () => {
        const first = spawnSaucer('bbq', { n: nugget.n, name: nugget.name }); first.alt = 1.085;
        const second = spawnSaucer('bbq', { n: nugget.n, name: nugget.name }); second.alt = 1.095;
      }],
      [34, () => caption('Oh no! They are heading for Mount Chicken Nugget! 🍗')],
      [38, () => spawnSaucer('attack')],
      [42, () => caption('They are BARBECUING the nuggets!! 🔥🔥🔥')],
      [48, () => spawnSaucer('attack')], [55, () => spawnSaucer('attack')], [58, () => spawnSaucer('attack')],
      [62, () => { const lander = spawnSaucer('lander', { n: nugget.n, name: nugget.name }); lander.alt = 1.09; }],
      [70, () => spawnSaucer('attack')],
      [72, () => caption('A saucer is landing next to the nuggets…')],
      [80, () => { spawnAliens(4); caption('👁️ ALIENS! With tentacles! They are EATING the nuggets! 👁️'); }],
      [84, () => spawnSaucer('attack')], [92, () => spawnSaucer('attack')],
      [96, () => { caption('Nathaniel Planet fights back! Scramble the jets! ✈️', true); launchJets(5); }],
      [100, () => {                                                  // turrets go up round the cities that have been attacked
        const attacked = new Set(saucers.filter(saucer => saucer.role === 'attack').map(saucer => saucer.tgt));
        [...attacked].slice(0, 5).forEach(buildTurrets);
      }],
      [104, () => spawnSaucer('attack')], [108, () => spawnAliens(3)],
      [112, () => { caption('The defence guns are firing! 💥', true); spawnSaucer('attack'); }],
      [120, () => { launchJets(4); spawnSaucer('attack'); }],
      [128, () => caption('More saucers! Hold on, everybody!')], [128, () => spawnSaucer('attack')], [134, () => spawnSaucer('attack')],
      [140, () => { spawnAliens(3); launchJets(3); }], [146, () => spawnSaucer('attack')], [150, () => spawnSaucer('attack')],
      [152, () => caption('The jets are winning! Saucers are falling out of the sky!', true)],
      [168, () => {
        phase = 'retreat';
        caption('The aliens are running away!! 🏃‍♂️👽', true);
        for (const alien of aliens) { alien.state = 'run'; alien.speed *= 2.2; }
      }],
    ];
    // Progress through the show: next SCRIPT entry, phase ('attack' or 'retreat'), whether we have finished,
    // whether all aliens are gone, and the countdown (seconds) until the victory screen.
    let scriptIndex = 0, phase = 'attack', done = false, aliensDefeated = false, victoryCountdown = Infinity;

    /* ---------- the main loop ---------- */
    let lastInputTime = performance.now(), autoCameraCooldown = 0;
    const noteUserInput = () => { lastInputTime = performance.now(); };
    for (const eventName of ['pointerdown', 'wheel', 'keydown', 'touchstart']) addEventListener(eventName, noteUserInput, { passive: true });
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();   // more scratch vectors

    /* Called every frame with the clock time (seconds) and the frame time dt (seconds). Runs the script, then
       moves saucers, aliens, jets and turrets, burns the fires, updates the effects, shakes the screen, and
       moves the camera to the action if the user has been idle for a while. */
    const tick = (time, dt) => {
      if (done) return;
      showTime += dt;
      while (scriptIndex < SCRIPT.length && showTime >= SCRIPT[scriptIndex][0]) SCRIPT[scriptIndex++][1]();
      captionTimeLeft -= dt;
      if (captionTimeLeft <= 0) captionDiv.classList.remove('on');
      // Chance that a defender's shot hits: low at first, higher later, very high during the retreat.
      const hitChance = Math.min(0.9, phase === 'retreat' ? 0.9 : showTime < 130 ? 0.12 : 0.45);

      // ---- saucers ----
      for (const saucer of saucers) {
        saucer.t += dt;
        for (let i = 0; i < saucer.lights.length; i++) saucer.lights[i].visible = ((Math.floor(time * 8) + i) % 3) !== 0;   // chasing rim lights
        saucer.body.rotation.y += dt * (saucer.state === 'crash' ? saucer.spin : 1.2);
        if (saucer.state === 'arrive') {                                    // fly in from deep space, easing in and out
          const progress = Math.min(1, saucer.t / 6), eased = progress * progress * (3 - 2 * progress);
          const home = saucerHome(saucer, showTime).multiplyScalar(saucer.alt);
          saucer.pos.copy(saucer.from).lerp(home, eased);
          if (progress >= 1) { saucer.state = saucer.role === 'lander' ? 'land' : 'hover'; saucer.t = 0; }
        } else if (saucer.state === 'hover') {
          saucer.pos.lerp(saucerHome(saucer, showTime).multiplyScalar(saucer.alt + 0.004 * Math.sin(showTime * 2 + saucer.id)), 1 - Math.exp(-dt * 1.5));
          if (saucer.role === 'attack') {
            saucer.fire -= dt;
            if (saucer.fire <= 0 && phase !== 'retreat') {                  // zap the city and start fires
              saucer.fire = randomBetween(0.5, 1.4);
              const strikePoint = cityTarget(saucer.tgt);
              tmpA.copy(saucer.pos).addScaledVector(saucer.pos.clone().normalize(), -0.006);
              fireBeam(tmpA, strikePoint, 0xff1a1a, 0.0044, 0.4);
              explode(strikePoint, 0.5, false);
              if (Math.random() < 0.85) addFire(strikePoint, randomBetween(30, 70), randomBetween(0.7, 1.4));
              if (!saucer.tgt._ignited) {                                   // first hit on a city: a few extra fires
                saucer.tgt._ignited = true;
                for (let k = 0; k < 3; k++) addFire(cityTarget(saucer.tgt), randomBetween(45, 95), randomBetween(0.6, 1.3));
              }
            }
            saucer.roam -= dt;
            if (saucer.roam <= 0 && phase !== 'retreat') {                  // time to pick a different city
              let next = cities[Math.floor(Math.random() * cities.length)];
              if (cities.length > 1) {
                let tries = 0;
                while (next === saucer.tgt && tries++ < 5) next = cities[Math.floor(Math.random() * cities.length)];
              }
              saucer.tgt = next;
              saucer.home = next.n.clone();
              saucer.from = saucer.pos.clone();
              saucer.state = 'arrive';
              saucer.t = 0;
              saucer.roam = randomBetween(9, 16);
              if (Math.random() < 0.4) caption(`A saucer zooms off to attack ${next.name}!`);
            }
          } else if (saucer.role === 'bbq') {                               // barbecue the nugget mountain
            saucer.fire -= dt;
            if (saucer.fire <= 0 && phase !== 'retreat') {
              saucer.fire = randomBetween(0.15, 0.35);
              const strikePoint = offsetPoint(nugget.n, Math.random() * 6.28, Math.random() * 0.03);
              fireBeam(tmpA.copy(saucer.pos).addScaledVector(saucer.pos.clone().normalize(), -0.006), strikePoint, 0xff8a1a, 0.003, 0.25);
              if (Math.random() < 0.25) explode(strikePoint, 0.35, false);
              if (Math.random() < 0.08) addFire(strikePoint, randomBetween(20, 40), 0.8);
              noteEvent(strikePoint, 1);
            }
            barbecueAmount = Math.min(1, barbecueAmount + dt / 30);
            nugget.api.bbq(barbecueAmount);
            if (Math.random() < dt * 8) {
              const smokePoint = offsetPoint(nugget.n, Math.random() * 6.28, Math.random() * 0.025);
              smokeParticles.emit(smokePoint, tmpVec.copy(smokePoint).multiplyScalar(randomBetween(0.01, 0.02)), randomBetween(2, 4), 0.006, 0.03, [0.3, 0.27, 0.25], [0.55, 0.52, 0.5], 0.7);
            }
          }
        } else if (saucer.state === 'land') {                               // lower gently onto the ground by the nuggets
          const ground = saucerHome(saucer, 0).clone();
          saucer.ground = ground.clone();
          const progress = Math.min(1, saucer.t / 7);
          saucer.pos.copy(ground).multiplyScalar(saucer.alt + (1.006 - saucer.alt) * progress * progress * (3 - 2 * progress));
          saucer.beam.visible = progress < 1;
          if (progress >= 1) { saucer.state = 'landed'; landed = saucer; nugget.api.rain(false); }
        } else if (saucer.state === 'landed') {
          saucer.pos.copy(saucer.ground).multiplyScalar(1.006);
          saucer.beam.visible = false;
        } else if (saucer.state === 'crash') {                              // spin out of control, trailing smoke and fire
          saucer.vel.addScaledVector(saucer.pos.clone().normalize(), -0.06 * dt);
          saucer.pos.addScaledVector(saucer.vel, dt);
          saucer.body.rotation.z = Math.sin(saucer.t * 3) * 0.6;
          if (Math.random() < dt * 30) smokeParticles.emit(saucer.pos, randomVector(0.01), randomBetween(1, 2), 0.006, 0.02, [0.2, 0.2, 0.2], [0.5, 0.5, 0.5], 0.8);
          if (Math.random() < dt * 20) fireParticles.emit(saucer.pos, randomVector(0.01), randomBetween(0.2, 0.4), 0.006, 0.012, [1, 0.8, 0.3], [0.8, 0.2, 0]);
          if (saucer.pos.length() <= 1.004) {                               // hit the ground
            explode(saucer.pos, 1.6, true);
            addFire(saucer.pos.clone().normalize(), 80, 1.5);
            saucer.state = 'gone';
            saucer.group.visible = false;
          }
        } else if (saucer.state === 'flee') {                               // accelerate away into space
          saucer.pos.multiplyScalar(1 + dt * (0.15 + saucer.t * 0.5));
          saucer.body.rotation.y += dt * 8;
          if (saucer.pos.length() > 6) { saucer.state = 'gone'; saucer.group.visible = false; }
        }
        if (saucer.state !== 'gone') {                                      // place and orient the model
          saucer.group.position.copy(saucer.pos);
          saucer.n.copy(saucer.pos).normalize();
          tmpB.set(1, 0, 0);
          orient(saucer.group, saucer.n, tmpB.cross(saucer.n).lengthSq() > 1e-6 ? tmpB.set(0, 0, 1) : tmpB);
          if (saucer.state === 'hover' || saucer.state === 'arrive') saucer.group.rotateX(Math.sin(showTime * 1.3 + saucer.id) * 0.12);   // a little wobble
        }
        if (saucer.state === 'hover' && saucer.role === 'bbq' && Math.random() < dt * 2) saucer.beam.visible = !saucer.beam.visible;   // flickering tractor beam
        if (saucer.beam.visible) saucer.beam.scale.set(1, (saucer.pos.length() - 1) / SAUCER_SIZE, 1);                                 // beam reaches the ground
      }

      // ---- aliens ----
      for (const alien of aliens) {
        alien.t += dt;
        wiggle(alien, alien.t, alien.state === 'run' ? 9 : alien.state === 'walk' ? 5 : 2.5, alien.state === 'eat' ? 0.25 : 0.4);
        if (alien.state === 'walk' || alien.state === 'run') {
          // walk to the nugget pile; run back to the landed saucer
          const goal = alien.state === 'run' ? landed ? landed.ground : alien.pos : alien.spot;
          tmpA.copy(goal).sub(alien.pos);
          const distance = tmpA.length();
          if (distance < 0.003) {                                           // arrived
            if (alien.state === 'walk') alien.state = 'eat';
            else { alien.state = 'home'; alien.group.visible = false; }
          } else {
            alien.pos.addScaledVector(tmpA.normalize(), Math.min(distance, alien.speed * dt)).normalize();
            orient(alien.group, alien.pos, tmpA);
          }
          alien.bodyGroup.position.y = Math.abs(Math.sin(alien.t * (alien.state === 'run' ? 14 : 8))) * 0.08;   // bouncy steps
        } else if (alien.state === 'eat') {
          alien.bodyGroup.rotation.x = 0.25 + Math.sin(alien.t * 6) * 0.18;
          alien.bodyGroup.position.y = 0;
          alien.eat -= dt;
          if (alien.eat <= 0) {                                             // swallow a nugget
            alien.eat = randomBetween(2, 4);
            nuggetsEaten = Math.min(36, nuggetsEaten + 1);
            nugget.api.eat(nuggetsEaten);
            noteEvent(alien.pos, 2);
            for (let k = 0; k < 6; k++) fireParticles.emit(alien.pos.clone().multiplyScalar(1.012), randomVector(0.01), 0.5, 0.004, 0.001, [1, 0.8, 0.3]);
          }
          // the eye keeps watching you
          alien.eye.lookAt(camera.position);
        }
        if (alien.state !== 'home') {
          alien.group.position.copy(alien.pos);
          if (alien.state !== 'walk' && alien.state !== 'run') {            // face the nuggets while eating
            tmpB.copy(nugget.n).sub(alien.pos);
            orient(alien.group, alien.pos.clone().normalize(), tmpB);
          }
        }
      }
      // Once every alien is back aboard during the retreat: jets head home, saucers flee, victory in 3.5 s.
      if (!aliensDefeated && phase === 'retreat' && aliens.length && aliens.every(alien => alien.state === 'home')) {
        aliensDefeated = true;
        for (const jet of jets) jet.leaving = true;
        landed = null;
        caption('The last saucer is escaping! Bye bye, aliens! 👋', true);
        for (const saucer of saucers) if (saucer.state !== 'gone' && saucer.state !== 'crash') { saucer.state = 'flee'; saucer.t = 0; }
        victoryCountdown = 3.5;
      }
      if (victoryCountdown !== Infinity) {
        victoryCountdown -= dt;
        if (victoryCountdown <= 0) { victoryCountdown = Infinity; victory(); }
      }

      // ---- jets ----
      for (const jet of jets) {
        if (jet.leaving) {                                                  // fly off up into space
          jet.vel.lerp(jet.pos.clone().normalize().multiplyScalar(0.16), 1 - Math.exp(-dt * 1.2));
          jet.pos.addScaledVector(jet.vel, dt);
          jet.g.position.copy(jet.pos);
          tmpC.copy(jet.pos).add(jet.vel);
          jet.g.lookAt(tmpC);
          jet.g.rotateY(-Math.PI / 2);
          if (jet.pos.clone().normalize().dot(cameraDirection()) < -0.15 || jet.pos.length() > 3) jet.gone = true;
          continue;
        }
        // chase the nearest saucer, weaving around it
        if (!jet.target || jet.target.state === 'gone' || jet.target.state === 'crash' || jet.target.state === 'flee') jet.target = nearestSaucer(jet.pos);
        const goal = jet.target
          ? tmpA.copy(jet.target.pos).add(tmpC.copy(randomVector(1)).set(Math.cos(showTime * 1.6 + jet.ph), Math.sin(showTime * 1.3 + jet.ph), Math.cos(showTime * 0.9 + jet.ph)).multiplyScalar(0.03))
          : tmpA.copy(jet.pos).normalize().multiplyScalar(1.12);
        tmpB.copy(goal).sub(jet.pos);
        jet.vel.lerp(tmpB.normalize().multiplyScalar(0.12), 1 - Math.exp(-dt * 2));
        jet.pos.addScaledVector(jet.vel, dt);
        if (jet.pos.length() < 1.03) jet.pos.setLength(1.03);               // never dip into the ground
        jet.g.position.copy(jet.pos);
        tmpC.copy(jet.pos).add(jet.vel);
        jet.g.lookAt(tmpC);
        jet.g.rotateY(-Math.PI / 2);
        jet.cool -= dt;
        if (jet.target && jet.cool <= 0 && jet.pos.distanceTo(jet.target.pos) < 0.12) {   // in range: shoot
          jet.cool = randomBetween(0.25, 0.6);
          const targetSaucer = jet.target;
          fireTracer(jet.pos, tmpB.copy(targetSaucer.pos).sub(jet.pos), 0.45, 0xffe14a, jet.pos.distanceTo(targetSaucer.pos) / 0.45, () => {
            if (Math.random() < hitChance) {
              damage(targetSaucer, 1);
              sparkParticles.emit(targetSaucer.pos, randomVector(0.05), 0.4, 0.003, 0.001, [1, 1, 0.6], [1, 0.4, 0]);
            }
          });
          noteEvent(jet.pos, 0.5);
        }
      }
      if (aliensDefeated) {                                                 // remove jets that have flown out of sight
        for (let i = jets.length - 1; i >= 0; i--) {
          const jet = jets[i];
          if (jet.gone) {
            jets.splice(i, 1);
            const objectIndex = objects.findIndex(entry => entry[0] === jet.g);
            if (objectIndex >= 0) objects.splice(objectIndex, 1);
            if (jet.g.parent) jet.g.parent.remove(jet.g);
            jet.g.traverse(mesh => { if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose(); });
          }
        }
      }

      // ---- turrets: swing round to the nearest saucer in range and shoot it ----
      for (const turret of turrets) {
        const targetSaucer = nearestSaucer(turret.n);
        if (!targetSaucer || targetSaucer.pos.distanceTo(turret.n) > 0.2) continue;
        turret.gun.lookAt(turret.group.worldToLocal(tmpA.copy(targetSaucer.pos)).add(turret.gun.position));
        turret.gun.rotateX(Math.PI / 2);
        turret.cool -= dt;
        if (turret.cool <= 0) {
          turret.cool = randomBetween(0.35, 0.8);
          const muzzle = turret.n.clone().multiplyScalar(1.0 + townScale * 1.3);
          fireTracer(muzzle, tmpB.copy(targetSaucer.pos).sub(muzzle), 0.5, 0xfff07a, muzzle.distanceTo(targetSaucer.pos) / 0.5, () => {
            if (Math.random() < hitChance) damage(targetSaucer, 1);
          });
          fireParticles.emit(muzzle, randomVector(0.005), 0.15, 0.004, 0.008, [1, 0.9, 0.5], [1, 0.4, 0]);
        }
      }

      // ---- fires: each burning spot sheds flames and smoke while it lasts ----
      for (let i = fires.length - 1; i >= 0; i--) {
        const fire = fires[i];
        fire.life -= dt;
        if (fire.life <= 0) { fires.splice(i, 1); continue; }
        fire.acc += dt * 22 * fire.k * Math.min(1, fire.life / 5);
        while (fire.acc >= 1) {
          fire.acc--;
          fireParticles.emit(tmpA.copy(fire.p).add(randomVector(0.004 * fire.k)), tmpB.copy(fire.n).multiplyScalar(randomBetween(0.006, 0.014)).add(randomVector(0.003)), randomBetween(0.4, 0.9), 0.004 * fire.k, 0.001, Math.random() < 0.5 ? [1, 0.85, 0.3] : [1, 0.5, 0.1], [0.6, 0.08, 0.0]);
          if (Math.random() < 0.35) smokeParticles.emit(tmpA, tmpB.copy(fire.n).multiplyScalar(randomBetween(0.008, 0.016)).add(randomVector(0.004)), randomBetween(2, 4), 0.006 * fire.k, 0.03 * fire.k, [0.25, 0.23, 0.22], [0.5, 0.48, 0.47], 0.65);
        }
      }

      // ---- beams, tracers, flashes: fade out and hide when finished ----
      for (const laser of beams) {
        if (laser.t <= 0) continue;
        laser.t -= dt;
        const remaining = Math.max(0, laser.t / laser.life);
        laser.core.material.opacity = remaining;
        laser.glow.material.opacity = 0.45 * remaining;
        if (laser.t <= 0) laser.core.visible = laser.glow.visible = false;
      }
      for (const bullet of tracers) {
        if (bullet.t <= 0) continue;
        bullet.t -= dt;
        bullet.p.addScaledVector(bullet.d, bullet.sp * dt);
        bullet.m.position.copy(bullet.p);
        if (bullet.t <= 0) { bullet.m.visible = false; if (bullet.onEnd) bullet.onEnd(); }
      }
      for (const flash of flashes) {
        if (!flash.sprite.visible) continue;
        flash.age += dt;
        const progress = flash.age / flash.duration;
        flash.sprite.scale.setScalar(flash.size * (0.5 + progress));
        flash.sprite.material.opacity = Math.max(0, 1 - progress);
        if (progress >= 1) flash.sprite.visible = false;
      }
      fireParticles.step(dt, 1.2, 0);
      smokeParticles.step(dt, 0.6, 0);
      sparkParticles.step(dt, 0.5, 0.08);

      // ---- screen shake: jitter the canvas, fading away ----
      shake = Math.max(0, shake - dt * 1.8);
      ctx.canvas.style.transform = shake > 0.01 ? `translate(${(Math.random() - 0.5) * 18 * shake}px,${(Math.random() - 0.5) * 18 * shake}px)` : '';

      // ---- automatic camera: after 20 s without a touch, go to wherever the most is happening ----
      autoCameraCooldown -= dt;
      if (performance.now() - lastInputTime > 20000 && autoCameraCooldown <= 0) {
        autoCameraCooldown = 7;
        let bestEvent = null, bestWeight = 0;
        for (const event of events) {                                       // pick the recent event with the most other events near it
          if (showTime - event.t > 12) continue;
          let weight = 0;
          for (const other of events) if (showTime - other.t <= 12 && event.p.dot(other.p) > Math.cos(0.2)) weight += other.w;
          if (weight > bestWeight) { bestWeight = weight; bestEvent = event; }
        }
        if (bestEvent) ctx.setFocus(bestEvent.p.clone(), 1.5);
      }
    };
    ctx.tickers.push(tick);

    /* ---------- victory, then back to normal ---------- */
    // The victory party: banner, falling streamers, rising smileys and fireworks on a canvas. Lasts about 16 seconds, then calls end().
    function victory() {
      caption('🎉 VICTORY! 🎉', true);
      const winDiv = document.createElement('div');
      winDiv.className = 'inv-win';
      winDiv.innerHTML = '<canvas></canvas><div><h1>VICTORY!</h1><h2>Nathaniel Planet is saved! 😄</h2></div>';
      document.body.appendChild(winDiv);
      const partyColors = ['#ff4d6d', '#ffd23f', '#4ecdc4', '#9b7bff', '#7ed957', '#ff9f43', '#ffffff', '#ff9ff3'];
      for (let i = 0; i < 90; i++) {                                        // streamers
        const streamer = document.createElement('div');
        streamer.className = 'inv-streamer';
        streamer.style.left = Math.random() * 100 + 'vw';
        streamer.style.background = `repeating-linear-gradient(45deg,${partyColors[i % 8]} 0 8px,${partyColors[(i + 3) % 8]} 8px 16px)`;
        streamer.style.animationDuration = randomBetween(3, 7) + 's';
        streamer.style.animationDelay = randomBetween(0, 6) + 's';
        streamer.style.height = randomBetween(40, 110) + 'px';
        winDiv.appendChild(streamer);
      }
      const smileys = ['😀', '😄', '😁', '🥳', '😊', '🤩', '😆'];
      for (let i = 0; i < 40; i++) {                                        // rising smileys
        const smiley = document.createElement('div');
        smiley.className = 'inv-smile';
        smiley.textContent = smileys[i % smileys.length];
        smiley.style.left = Math.random() * 95 + 'vw';
        smiley.style.animationDuration = randomBetween(4, 8) + 's';
        smiley.style.animationDelay = randomBetween(0, 7) + 's';
        smiley.style.fontSize = randomBetween(30, 64) + 'px';
        winDiv.appendChild(smiley);
      }
      // Fireworks: bursts of sparks that fly outward, fall and fade, drawn on the canvas.
      const fireworkCanvas = winDiv.querySelector('canvas'), fireworkCtx = fireworkCanvas.getContext('2d');
      fireworkCanvas.width = innerWidth;
      fireworkCanvas.height = innerHeight;
      const sparks = [];
      let lastFrameTime = performance.now(), burstCountdown = 0, running = true;
      const loop = now => {
        if (!running) return;
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
        lastFrameTime = now;
        burstCountdown -= dt;
        if (burstCountdown <= 0) {                                          // a new firework burst
          burstCountdown = randomBetween(0.15, 0.5);
          const x = randomBetween(0.1, 0.9) * fireworkCanvas.width, y = randomBetween(0.1, 0.5) * fireworkCanvas.height;
          const color = partyColors[Math.floor(Math.random() * 7)], sparkCount = 70;
          for (let i = 0; i < sparkCount; i++) {
            const angle = i / sparkCount * 6.283, speed = randomBetween(80, 260);
            sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, l: randomBetween(1, 1.8), c: color });   // l: seconds of life left
          }
        }
        // fade the previous frame a little (leaves trails), then draw the sparks additively
        fireworkCtx.globalCompositeOperation = 'destination-out';
        fireworkCtx.fillStyle = 'rgba(0,0,0,0.18)';
        fireworkCtx.fillRect(0, 0, fireworkCanvas.width, fireworkCanvas.height);
        fireworkCtx.globalCompositeOperation = 'lighter';
        for (let i = sparks.length - 1; i >= 0; i--) {
          const spark = sparks[i];
          spark.l -= dt;
          if (spark.l <= 0) { sparks.splice(i, 1); continue; }
          spark.vy += 120 * dt;                                             // gravity
          spark.vx *= 1 - dt;
          spark.vy *= 1 - dt * 0.5;
          spark.x += spark.vx * dt;
          spark.y += spark.vy * dt;
          fireworkCtx.fillStyle = spark.c;
          fireworkCtx.globalAlpha = Math.min(1, spark.l);
          fireworkCtx.beginPath();
          fireworkCtx.arc(spark.x, spark.y, 2.4, 0, 6.3);
          fireworkCtx.fill();
        }
        fireworkCtx.globalAlpha = 1;
      };
      requestAnimationFrame(loop);
      setTimeout(() => { winDiv.style.opacity = 0; }, 15000);               // fade out, then clean up and end the show
      setTimeout(() => { running = false; winDiv.remove(); end(); }, 16500);
    }

    // Ends the show and puts everything back: removes our ticker, listeners, 3D objects, textures and overlays,
    // resets the nugget mountain, and tells index.html we are finished.
    function end() {
      done = true;
      const tickerIndex = ctx.tickers.indexOf(tick);
      if (tickerIndex >= 0) ctx.tickers.splice(tickerIndex, 1);
      for (const eventName of ['pointerdown', 'wheel', 'keydown', 'touchstart']) removeEventListener(eventName, noteUserInput);
      for (const [object, parent] of objects) parent.remove(object);
      const geometries = new Set();
      for (const [object] of objects) object.traverse(mesh => { if (mesh.isMesh && mesh.geometry) geometries.add(mesh.geometry); });
      geometries.forEach(geometry => geometry.dispose());
      disposables.forEach(item => item && item.dispose && item.dispose());
      ctx.scene.remove(envLight);
      nugget.api.reset();
      ctx.canvas.style.transform = '';
      captionDiv.remove();
      alertDiv.remove();
      document.body.classList.remove('invading');
      ctx.releaseFocus();
      if (ctx.onEnd) ctx.onEnd();
    }

    // skipTo / advance are for testing: jump the clock, or run the simulation forward by `sec` seconds in 0.1 s steps.
    return {
      end,
      skipTo(seconds) { showTime = seconds; },
      advance(seconds) { for (let k = 0; k < seconds * 10 && !done; k++) tick(performance.now() / 1000, 0.1); },
      saucers, aliens, jets,
    };
  }

  injectCSS(); // the button's own styling and its age rule must exist before the dialog is ever opened
  root.NPInvasion = { confirm: confirmDialog, start };
})(typeof window !== 'undefined' ? window : globalThis);
