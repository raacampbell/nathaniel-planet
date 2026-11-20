/* The Alien Invasion of Nathaniel Planet (space age only).
   A ~3.5 minute show: saucers arrive, laser the towns, barbecue Mount Chicken Nugget, land and eat the nuggets,
   the planet fights back, the aliens flee, victory party, and everything goes back to how it was.
   The aliens and their ships are drawn in a glossy, realistic style on purpose, so they look wrong in the cartoon world. */
(function (root) {
  'use strict';
  let css = false;
  function injectCSS() {
    if (css) return; css = true;
    const st = document.createElement('style');
    st.textContent = `
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
    document.head.appendChild(st);
  }

  /* ----------------------------------------------------------------------------------------- confirm dialog */
  function confirmDialog(onGo) {
    injectCSS();
    const ov = document.createElement('div'); ov.className = 'inv-ov';
    ov.innerHTML = `<div class="inv-tape t1"><b>⚠ DANGER ⚠ DANGER ⚠ DANGER ⚠</b></div><div class="inv-tape t3">DO NOT CROSS ✦ DO NOT CROSS ✦ DO NOT CROSS</div><div class="inv-tape t2"><b>⚠ ALIEN HAZARD ⚠ ALIEN HAZARD ⚠</b></div>
      <div class="inv-box"><div class="inv-sirens"><div class="inv-siren"></div><div class="inv-siren"></div></div>
        <h1>⚠ WARNING ⚠</h1><h2>Alien invasion imminent</h2>
        <p>Deep-space radar has detected a <b>HUGE</b> fleet of flying saucers heading straight for Nathaniel Planet.</p>
        <p>They have lasers. They have tentacles. They look <b>VERY</b> hungry. Mount Chicken Nugget may not survive.</p>
        <p>Are you absolutely, positively, completely sure you want to let them in?</p>
        <small>(Side effects may include explosions, fires, screaming, barbecued nuggets and wobbly screens.)</small>
        <div class="inv-btns"><button class="inv-no">No thanks, I like my planet</button><button class="inv-go">☠ LET THEM COME ☠</button></div></div>`;
    document.body.appendChild(ov);
    ov.querySelector('.inv-no').onclick = () => ov.remove();
    ov.querySelector('.inv-go').onclick = () => { ov.remove(); onGo(); };
  }

  /* ----------------------------------------------------------------------------------------- the show */
  function start(ctx) {
    injectCSS();
    const T = ctx.T, PG = ctx.planetGroup, cam = ctx.camera, UP = new T.Vector3(0, 1, 0), U = ctx.TOWN_S;
    const R = (a, b) => a + Math.random() * (b - a);
    const objects = [], disposables = [];
    const add = (o, parent) => { (parent || PG).add(o); objects.push([o, parent || PG]); return o; };
    document.body.classList.add('invading');
    const alertDiv = document.createElement('div'); alertDiv.id = 'invAlert'; document.body.appendChild(alertDiv);
    const cap = document.createElement('div'); cap.id = 'invCap'; document.body.appendChild(cap);
    let capT = 0;
    const caption = (txt, good) => { cap.textContent = txt; cap.classList.toggle('good', !!good); cap.classList.add('on'); capT = 6; };

    const env = null, envLight = new T.Object3D();          // (a reflection map washed everything out; plain lights look better)

    /* ---------- canvas textures for the alien skin and eye ---------- */
    const skinTex = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#4d8f2e'; x.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${R(20, 80) | 0},${R(70, 140) | 0},${R(10, 40) | 0},${R(0.15, 0.45)})`; x.beginPath(); x.arc(R(0, 256), R(0, 128), R(1, 7), 0, 6.3); x.fill(); }
      for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(90,30,60,${R(0.15, 0.35)})`; x.lineWidth = R(0.5, 1.5); x.beginPath(); let px = R(0, 256), py = R(0, 128); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += R(-12, 12); py += R(-8, 8); x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(200,240,140,${R(0.2, 0.5)})`; x.beginPath(); x.arc(R(0, 256), R(0, 128), R(0.5, 2), 0, 6.3); x.fill(); }
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
    })();
    const eyeTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      x.fillStyle = '#f3ead8'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(190,30,30,${R(0.3, 0.7)})`; x.lineWidth = R(0.4, 1.6); x.beginPath(); let a = R(0, 6.3), r = 125; x.moveTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); for (let k = 0; k < 7; k++) { r -= R(6, 12); a += R(-0.15, 0.15); x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } x.stroke(); }
      const ig = x.createRadialGradient(128, 128, 8, 128, 128, 62); ig.addColorStop(0, '#ffef6a'); ig.addColorStop(0.5, '#e38a12'); ig.addColorStop(0.92, '#7a2a05'); ig.addColorStop(1, '#2a0a00');
      x.fillStyle = ig; x.beginPath(); x.arc(128, 128, 62, 0, 6.3); x.fill();
      for (let i = 0; i < 90; i++) { const a = i / 90 * 6.283; x.strokeStyle = `rgba(80,30,0,${R(0.2, 0.5)})`; x.lineWidth = 1; x.beginPath(); x.moveTo(128 + Math.cos(a) * 14, 128 + Math.sin(a) * 14); x.lineTo(128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60); x.stroke(); }
      x.fillStyle = '#050505'; x.beginPath(); x.ellipse(128, 128, 9, 46, 0, 0, 6.3); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.ellipse(104, 104, 10, 7, -0.6, 0, 6.3); x.fill();
      return new T.CanvasTexture(c);
    })();
    disposables.push(skinTex, eyeTex);
    const skinMat = new T.MeshStandardMaterial({ map: skinTex, color: 0xffffff, roughness: 0.32, metalness: 0.05, envMap: env, envMapIntensity: 0.9 });
    const skinUnder = new T.MeshStandardMaterial({ color: 0xc8d98a, roughness: 0.45, metalness: 0, envMap: env, envMapIntensity: 0.6 });
    const eyeMat = new T.MeshStandardMaterial({ map: eyeTex, roughness: 0.06, metalness: 0, envMap: env, envMapIntensity: 1.2 });
    const panelTex = (() => {                                   // riveted hull plates
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
      x.fillStyle = '#9aa1a8'; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${R(120, 190) | 0},${R(125, 195) | 0},${R(135, 205) | 0},0.35)`; x.fillRect(R(0, 512), R(0, 256), R(10, 60), R(6, 30)); }
      x.strokeStyle = 'rgba(30,32,36,0.8)'; x.lineWidth = 2;
      for (let j = 0; j < 256; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(512, j); x.stroke(); }
      for (let i = 0; i < 512; i += 32) for (let j = 0; j < 256; j += 32) { x.beginPath(); x.moveTo(i + (j / 32 % 2) * 16, j); x.lineTo(i + (j / 32 % 2) * 16, j + 32); x.stroke(); }
      x.fillStyle = 'rgba(20,20,24,0.7)'; for (let i = 0; i < 512; i += 8) for (let j = 4; j < 256; j += 32) x.fillRect(i, j, 2, 2);
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,40,20,${R(0.1, 0.3)})`; x.beginPath(); x.ellipse(R(0, 512), R(0, 256), R(4, 30), R(2, 10), 0, 0, 6.3); x.fill(); }
      return new T.CanvasTexture(c);
    })();
    disposables.push(panelTex);
    const hullMat = new T.MeshStandardMaterial({ color: 0xc4cad2, map: panelTex, metalness: 0.55, roughness: 0.32 });
    const hullDark = new T.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.8, roughness: 0.4, envMap: env });
    const domeMat = new T.MeshStandardMaterial({ color: 0x7dffcf, emissive: 0x0b5a3c, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.62, envMap: env, envMapIntensity: 1.4 });
    disposables.push(skinMat, skinUnder, eyeMat, hullMat, hullDark, domeMat);

    /* ---------- the flying saucer ---------- */
    const SAUCER = 0.05;                                                    // diameter in world units
    const saucerGeo = (() => {
      const pr = [[0, -0.12], [0.18, -0.13], [0.36, -0.11], [0.47, -0.06], [0.5, 0], [0.46, 0.04], [0.33, 0.08], [0.2, 0.11], [0, 0.12]].map(p => new T.Vector2(p[0], p[1]));
      return new T.LatheGeometry(new T.SplineCurve(pr).getPoints(40).map(p => new T.Vector2(Math.max(0, p.x), p.y)), 64);
    })();
    disposables.push(saucerGeo);
    const lightGeo = new T.SphereGeometry(0.022, 10, 8); disposables.push(lightGeo);
    function makeSaucer() {
      const g = new T.Group(), body = new T.Group(); g.add(body);
      body.add(new T.Mesh(saucerGeo, hullMat));
      body.add(new T.Mesh(new T.TorusGeometry(0.47, 0.025, 10, 64).rotateX(Math.PI / 2), hullDark));
      const dome = new T.Mesh(new T.SphereGeometry(0.19, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.1, 0), domeMat); body.add(dome);
      const pilot = new T.Mesh(new T.SphereGeometry(0.07, 16, 12).translate(0, 0.15, 0), skinMat); body.add(pilot);
      const lights = [];
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, m = new T.Mesh(lightGeo, new T.MeshBasicMaterial({ color: i % 2 ? 0x6bff8a : 0xff4a4a })); m.position.set(Math.cos(a) * 0.475, 0.0, Math.sin(a) * 0.475); body.add(m); lights.push(m); }
      const under = new T.Mesh(new T.CircleGeometry(0.16, 32).rotateX(Math.PI / 2).translate(0, -0.125, 0), new T.MeshBasicMaterial({ color: 0x8dffb0 })); body.add(under);
      const beam = new T.Mesh(new T.ConeGeometry(0.22, 1, 32, 1, true).translate(0, -0.5, 0), new T.MeshBasicMaterial({ color: 0x8dffb0, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      beam.position.y = -0.12; beam.visible = false; g.add(beam);
      g.scale.setScalar(SAUCER);
      return { g, body, lights, beam, under };
    }

    /* ---------- the aliens: glossy, lumpy, too many tentacles, one enormous eye ---------- */
    const bodyGeo = (() => {
      const g = new T.SphereGeometry(0.5, 48, 32), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.07 * Math.sin(x * 17 + y * 5) * Math.cos(z * 13 - y * 9) + 0.04 * Math.sin(y * 31 + x * 7); p.setXYZ(i, x * k * 0.9, y * k * 1.15 + 0.05, z * k * 0.85); }
      g.computeVertexNormals(); return g;
    })();
    const eyeGeo = new T.SphereGeometry(0.3, 40, 28), lidGeo = new T.SphereGeometry(0.315, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
    const segGeo = [], SEGN = 9;
    for (let i = 0; i < SEGN; i++) { const r0 = 0.075 * (1 - i / SEGN) + 0.012, r1 = 0.075 * (1 - (i + 1) / SEGN) + 0.012; segGeo.push(new T.CylinderGeometry(r1, r0, 0.11, 14, 1).translate(0, -0.055, 0)); }
    const tipGeo = new T.SphereGeometry(0.014, 10, 8), suckGeo = new T.SphereGeometry(0.018, 10, 8);
    disposables.push(bodyGeo, eyeGeo, lidGeo, tipGeo, suckGeo, ...segGeo);
    function makeAlien() {
      const g = new T.Group(), b = new T.Group(); g.add(b);
      const body = new T.Mesh(bodyGeo, skinMat); body.position.y = 0.62; b.add(body);
      const belly = new T.Mesh(new T.SphereGeometry(0.33, 24, 16).scale(1, 1.2, 0.6).translate(0, 0.5, 0.2), skinUnder); b.add(belly); disposables.push(belly.geometry);
      const eye = new T.Mesh(eyeGeo, eyeMat); eye.position.set(0, 0.86, 0.22); b.add(eye);
      const lid = new T.Mesh(lidGeo, skinMat); lid.position.copy(eye.position); lid.rotation.x = -0.25; b.add(lid);
      const mouth = new T.Mesh(new T.TorusGeometry(0.08, 0.018, 8, 20, Math.PI), new T.MeshStandardMaterial({ color: 0x3a0a1a, roughness: 0.3, envMap: env })); mouth.position.set(0, 0.5, 0.4); mouth.rotation.z = Math.PI; b.add(mouth); disposables.push(mouth.geometry, mouth.material);
      const tent = [];
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * 6.283, root = new T.Group(); root.position.set(Math.sin(a) * 0.28, 0.4, Math.cos(a) * 0.26); root.rotation.set(0.9, a, 0, 'YXZ');
        b.add(root);
        let parent = root; const segs = [];
        for (let i = 0; i < SEGN; i++) {
          const s = new T.Group(); s.position.y = i ? -0.105 : 0; parent.add(s);
          s.add(new T.Mesh(segGeo[i], skinMat));
          if (i % 2 === 1) { const su = new T.Mesh(suckGeo, skinUnder); su.position.set(0, -0.05, 0.05 * (1 - i / SEGN) + 0.008); su.scale.setScalar(1 - i / SEGN * 0.6); s.add(su); }
          segs.push(s); parent = s;
        }
        const tip = new T.Mesh(tipGeo, skinMat); tip.position.y = -0.11; parent.add(tip);
        tent.push({ segs, ph: Math.random() * 6, a });
      }
      g.scale.setScalar(U * 1.7);
      return { g, b, eye, lid, tent, blink: 0 };
    }
    function wiggle(A, t, speed, amp) {
      for (const tt of A.tent) tt.segs.forEach((s, i) => { s.rotation.x = Math.sin(t * speed + tt.ph + i * 0.7) * amp * (0.4 + i * 0.12); s.rotation.z = Math.cos(t * speed * 0.8 + tt.ph + i * 0.9) * amp * 0.5; });
      A.blink -= 0.016; if (A.blink < -3 - Math.random() * 3) A.blink = 0.15;
      A.lid.rotation.x = A.blink > 0 ? 0.6 : -0.25;
    }

    /* ---------- defenders: cartoon jets and turrets (the planet's own style) ---------- */
    function makeJet(col) {
      const g = new T.Group(), s = 1;
      const f = ctx.withInk(new T.Mesh(new T.CylinderGeometry(0.06, 0.1, 1, 10).rotateZ(-Math.PI / 2), ctx.toon(col)), 1.12); g.add(f);
      g.add(ctx.withInk(new T.Mesh(new T.ConeGeometry(0.06, 0.3, 10).rotateZ(-Math.PI / 2).translate(0.64, 0, 0), ctx.toon(col)), 1.12));
      g.add(ctx.withInk(new T.Mesh(new T.BoxGeometry(0.34, 0.03, 1.1).translate(-0.05, 0, 0), ctx.toon(0xffffff)), 1.1));
      g.add(ctx.withInk(new T.Mesh(new T.BoxGeometry(0.2, 0.3, 0.03).translate(-0.42, 0.14, 0), ctx.toon(col)), 1.1));
      g.add(new T.Mesh(new T.SphereGeometry(0.06, 10, 8).scale(1.8, 0.9, 1).translate(0.3, 0.07, 0), ctx.toon(0x6ad0ff)));
      g.scale.setScalar(0.012 * s);
      return g;
    }
    function makeTurret() {
      const g = new T.Group(), gun = new T.Group();
      g.add(ctx.withInk(new T.Mesh(new T.CylinderGeometry(0.5, 0.6, 0.4, 14).translate(0, 0.2, 0), ctx.toon(0x6b7a4a)), 1.08));
      gun.add(ctx.withInk(new T.Mesh(new T.SphereGeometry(0.4, 14, 10), ctx.toon(0x7d8c56)), 1.08));
      for (const z of [-0.12, 0.12]) gun.add(ctx.withInk(new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 1.0, 8).translate(0, 0.5, z), ctx.toon(0x3a3f46)), 1.1));
      gun.position.y = 0.45; g.add(gun);
      g.scale.setScalar(U * 1.3);
      return { g, gun };
    }

    /* ---------- particles: explosions, fire, smoke ---------- */
    function particles(N, blend) {
      const A = { pos: new Float32Array(N * 3), col: new Float32Array(N * 3), size: new Float32Array(N), alpha: new Float32Array(N) };
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(A.pos, 3)); geo.setAttribute('color', new T.BufferAttribute(A.col, 3)); geo.setAttribute('size', new T.BufferAttribute(A.size, 1)); geo.setAttribute('alpha', new T.BufferAttribute(A.alpha, 1));
      const mat = ctx.partShader(blend), pts = new T.Points(geo, mat); pts.frustumCulled = false; add(pts); disposables.push(geo, mat);
      const vel = new Float32Array(N * 3), life = new Float32Array(N), max = new Float32Array(N), s0 = new Float32Array(N), s1 = new Float32Array(N), c0 = new Float32Array(N * 3), c1 = new Float32Array(N * 3), op = new Float32Array(N);
      let next = 0;
      return {
        emit(p, v, lf, a, b, ca, cb, o) { const i = next; next = (next + 1) % N; A.pos[i * 3] = p.x; A.pos[i * 3 + 1] = p.y; A.pos[i * 3 + 2] = p.z; vel[i * 3] = v.x; vel[i * 3 + 1] = v.y; vel[i * 3 + 2] = v.z; life[i] = max[i] = lf; s0[i] = a; s1[i] = b; c0.set(ca, i * 3); c1.set(cb || ca, i * 3); op[i] = o || 1; },
        step(dt, drag, grav) {
          mat.uniforms.uScale.value = innerHeight * 0.5 * ctx.renderer.getPixelRatio() / Math.tan(cam.fov * Math.PI / 360) / 2.3;
          for (let i = 0; i < N; i++) {
            if (life[i] <= 0) { A.alpha[i] = 0; continue; }
            life[i] -= dt; const k = Math.max(0, life[i] / max[i]), u = 1 - k, j = i * 3;
            if (grav) { const x = A.pos[j], y = A.pos[j + 1], z = A.pos[j + 2], l = Math.hypot(x, y, z) || 1; vel[j] -= x / l * grav * dt; vel[j + 1] -= y / l * grav * dt; vel[j + 2] -= z / l * grav * dt; }
            for (let a2 = 0; a2 < 3; a2++) { vel[j + a2] *= 1 - drag * dt; A.pos[j + a2] += vel[j + a2] * dt; A.col[j + a2] = c0[j + a2] + (c1[j + a2] - c0[j + a2]) * u; }
            A.size[i] = s0[i] + (s1[i] - s0[i]) * u; A.alpha[i] = Math.min(1, k * 2.5) * op[i];
          }
          geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.size.needsUpdate = geo.attributes.alpha.needsUpdate = true;
        },
      };
    }
    const fireP = particles(2600, T.AdditiveBlending), smokeP = particles(1800, T.NormalBlending), sparkP = particles(900, T.AdditiveBlending);
    const flashTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, 'rgba(255,200,80,0.8)'); g.addColorStop(1, 'rgba(255,80,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); })();
    disposables.push(flashTex);
    const flashes = [];
    for (let i = 0; i < 16; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: flashTex, blending: T.AdditiveBlending, transparent: true, depthWrite: false })); sp.visible = false; add(sp); flashes.push({ sp, t: 0, d: 1, s: 1 }); disposables.push(sp.material); }
    let flashI = 0;
    const _v = new T.Vector3(), _w = new T.Vector3(), _q = new T.Quaternion();
    const rv = s => _w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(s);

    /* ---------- action log: where the excitement is (for the automatic camera and screen shake) ---------- */
    const events = [];
    let shake = 0, invT = 0;
    const note = (p, w) => { events.push({ p: p.clone().normalize(), w, t: invT }); if (events.length > 200) events.shift(); };
    function explode(p, size, big) {
      const n = p.clone().normalize();
      for (let i = 0; i < (big ? 70 : 30); i++) fireP.emit(p, _v.copy(rv(1)).normalize().multiplyScalar(R(0.01, 0.05) * size).addScaledVector(n, 0.015 * size), R(0.4, 0.9), 0.006 * size, 0.02 * size, [1, 0.95, 0.6], [0.8, 0.15, 0.02]);
      for (let i = 0; i < (big ? 40 : 14); i++) smokeP.emit(p, _v.copy(rv(0.02 * size)).addScaledVector(n, R(0.01, 0.025) * size), R(1.5, 3), 0.01 * size, 0.045 * size, [0.35, 0.32, 0.3], [0.6, 0.58, 0.56], 0.8);
      for (let i = 0; i < (big ? 50 : 18); i++) sparkP.emit(p, _v.copy(rv(1)).normalize().multiplyScalar(R(0.04, 0.12) * size).addScaledVector(n, 0.05 * size), R(0.5, 1.2), 0.003 * size, 0.001, [1, 0.9, 0.4], [1, 0.3, 0]);
      const F = flashes[flashI++ % flashes.length]; F.sp.position.copy(p); F.t = 0; F.d = big ? 0.7 : 0.4; F.s = (big ? 0.12 : 0.05) * size; F.sp.visible = true;
      note(p, big ? 6 : 2);
      const vd = cam.position.clone().normalize(); if (n.dot(vd) > Math.cos(0.45)) shake = Math.min(1.4, shake + (big ? 0.9 : 0.35) * size * Math.max(0.3, 1.8 - (cam.position.length() - 1)));
    }
    const fires = [];
    function addFire(p, life, k) { if (fires.length > 70) fires.shift(); fires.push({ p: p.clone(), n: p.clone().normalize(), life, k: k || 1, acc: 0 }); }

    /* ---------- lasers and tracers ---------- */
    const beamGeo = new T.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0); disposables.push(beamGeo);
    const beams = [];
    function beam(a, b, color, w, life) {
      let B = beams.find(x => x.t <= 0);
      if (!B) { if (beams.length > 60) return; const core = new T.Mesh(beamGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false })), glow = new T.Mesh(beamGeo, new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false })); add(core); add(glow); B = { core, glow, t: 0 }; beams.push(B); disposables.push(core.material, glow.material); }
      _v.copy(b).sub(a); const L = _v.length(); _q.setFromUnitVectors(UP, _v.normalize());
      for (const [m, s] of [[B.core, w * 0.35], [B.glow, w]]) { m.position.copy(a); m.quaternion.copy(_q); m.scale.set(s, L, s); m.visible = true; }
      B.glow.material.color.set(color); B.t = life; B.life = life;
    }
    const tracers = [];
    function tracer(a, dir, speed, color, life, onEnd) {
      let Q = tracers.find(x => x.t <= 0);
      if (!Q) { if (tracers.length > 120) return; const m = new T.Mesh(beamGeo, new T.MeshBasicMaterial({ color, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); add(m); Q = { m, t: 0, p: new T.Vector3(), d: new T.Vector3() }; tracers.push(Q); disposables.push(m.material); }
      Q.p.copy(a); Q.d.copy(dir).normalize(); Q.sp = speed; Q.t = life; Q.onEnd = onEnd; Q.m.material.color.set(color); Q.m.visible = true;
      Q.m.quaternion.setFromUnitVectors(UP, Q.d); Q.m.scale.set(0.0006, 0.009, 0.0006);
    }

    /* ---------- the cast ---------- */
    const cities = ctx.cities.slice(), nug = ctx.nugget, saucers = [], aliens = [], jets = [], turrets = [];
    const frame = n => { const u = new T.Vector3().crossVectors(n, Math.abs(n.y) > 0.95 ? new T.Vector3(1, 0, 0) : UP).normalize(); return [u, new T.Vector3().crossVectors(u, n)]; };
    const offset = (n, a, r) => { const [u, w] = frame(n); return n.clone().multiplyScalar(Math.cos(r)).addScaledVector(u.multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a)), Math.sin(r)).normalize(); };
    const orient = (obj, n, fwd) => { _v.copy(fwd).addScaledVector(n, -fwd.dot(n)).normalize(); const m = new T.Matrix4().makeBasis(_v, n, new T.Vector3().crossVectors(_v, n)); obj.quaternion.setFromRotationMatrix(m); };
    const camDir = () => cam.position.clone().normalize();
    // target order: the city in view first, then the others
    cities.sort((a, b) => b.n.dot(camDir()) - a.n.dot(camDir()));
    let cityI = 0;
    function spawnSaucer(role, target) {
      const S = makeSaucer(); add(S.g);
      const tgt = target || cities[cityI++ % cities.length];
      const home = tgt.n.clone();
      const from = home.clone().add(rv(1.2)).normalize().multiplyScalar(4.5);
      const sc = { ...S, role, tgt, home, alt: R(1.075, 1.1), state: 'arrive', t: 0, from, pos: from.clone(), hp: 7 + Math.random() * 4, fire: R(0.5, 1.5), drift: Math.random() * 6, n: new T.Vector3(), id: saucers.length, roam: R(9, 16) };
      saucers.push(sc); return sc;
    }
    function saucerHome(sc, t) {
      if (sc.role === 'bbq' || sc.role === 'lander') return offset(nug.n, sc.id * 2.1 + t * 0.12, sc.role === 'lander' ? 0.055 : 0.03);
      const R0 = (sc.tgt.Rw || 0.05) * 0.55; return offset(sc.home, sc.drift + t * 0.25, R0 * (0.6 + 0.4 * Math.sin(t * 0.3 + sc.id)));
    }
    function cityTarget(c) { return offset(c.n, Math.random() * 6.283, Math.sqrt(Math.random()) * (c.Rw || 0.05) * 0.85); }
    let landed = null, nugEaten = 0, bbqK = 0;
    function spawnAliens(n) {
      if (!landed) return;
      for (let i = 0; i < n; i++) {
        const A = makeAlien(); add(A.g);
        const start = landed.ground.clone(), spot = ctx.nugget.api.pileWorld(aliens.length * 5 + 3).normalize();
        aliens.push({ ...A, pos: start.clone(), spot: offset(spot, Math.random() * 6.28, 0.004), state: 'walk', t: Math.random() * 3, speed: R(0.006, 0.01), eat: R(1.5, 3) });
      }
    }
    function launchJets(n) { for (let i = 0; i < n; i++) { const g = makeJet([0x2f6fb0, 0xff4d4d, 0x7ed957, 0xffd23f, 0xffffff][jets.length % 5]); add(g); const c = cities[Math.floor(Math.random() * Math.min(cities.length, 6))]; jets.push({ g, pos: c.n.clone().multiplyScalar(1.02), vel: c.n.clone().multiplyScalar(0.05), target: null, cool: R(0.5, 1.5), ph: Math.random() * 6 }); } }
    function buildTurrets(c) {
      for (let i = 0; i < 3; i++) {
        const tu = makeTurret(), n = offset(c.n, i * 2.1 + Math.random(), (c.Rw || 0.05) * 0.95); add(tu.g);
        ctx.placeOnSurface(tu.g, n, 1.0, Math.random() * 6); turrets.push({ ...tu, n, city: c, cool: R(0.3, 1.0) });
      }
    }
    const nearestSaucer = p => { let b = null, bd = 9; for (const s of saucers) { if (s.state === 'gone' || s.state === 'crash' || s.state === 'flee') continue; const d = s.pos.distanceTo(p); if (d < bd) { bd = d; b = s; } } return b; };
    function damage(s, k) {
      s.hp -= k;
      if (s.hp <= 0 && s.state !== 'crash' && s.state !== 'flee' && s.state !== 'gone' && s !== landed) {
        s.state = 'crash'; s.t = 0; s.spin = R(4, 8); s.vel = s.pos.clone().normalize().multiplyScalar(-0.02).add(rv(0.03));
        explode(s.pos, 1.0, false); caption(['Direct hit!', 'Got one!', 'Saucer down!', 'Kaboom! One less saucer!'][Math.floor(Math.random() * 4)], true);
      }
    }

    /* ---------- the story ---------- */
    const SCRIPT = [
      [0.5, () => caption('🚨 RED ALERT! Strange lights in the sky… 🚨')],
      [3, () => spawnSaucer('attack')],
      [7, () => caption(`A flying saucer is attacking ${saucers[0].tgt.name}!`)],
      [15, () => spawnSaucer('attack')], [20, () => spawnSaucer('attack')], [24, () => spawnSaucer('attack')],
      [30, () => { const a = spawnSaucer('bbq', { n: nug.n, name: nug.name }); a.alt = 1.085; const b = spawnSaucer('bbq', { n: nug.n, name: nug.name }); b.alt = 1.095; }],
      [34, () => caption('Oh no! They are heading for Mount Chicken Nugget! 🍗')],
      [38, () => spawnSaucer('attack')],
      [42, () => caption('They are BARBECUING the nuggets!! 🔥🔥🔥')],
      [48, () => spawnSaucer('attack')], [55, () => spawnSaucer('attack')], [58, () => spawnSaucer('attack')],
      [62, () => { const L = spawnSaucer('lander', { n: nug.n, name: nug.name }); L.alt = 1.09; }],
      [70, () => spawnSaucer('attack')],
      [72, () => caption('A saucer is landing next to the nuggets…')],
      [80, () => { spawnAliens(4); caption('👁️ ALIENS! With tentacles! They are EATING the nuggets! 👁️'); }],
      [84, () => spawnSaucer('attack')], [92, () => spawnSaucer('attack')],
      [96, () => { caption('Nathaniel Planet fights back! Scramble the jets! ✈️', true); launchJets(5); }],
      [100, () => { const seen = new Set(saucers.filter(s => s.role === 'attack').map(s => s.tgt)); [...seen].slice(0, 5).forEach(buildTurrets); }],
      [104, () => spawnSaucer('attack')], [108, () => spawnAliens(3)],
      [112, () => { caption('The defence guns are firing! 💥', true); spawnSaucer('attack'); }],
      [120, () => { launchJets(4); spawnSaucer('attack'); }],
      [128, () => caption('More saucers! Hold on, everybody!')], [128, () => spawnSaucer('attack')], [134, () => spawnSaucer('attack')],
      [140, () => { spawnAliens(3); launchJets(3); }], [146, () => spawnSaucer('attack')], [150, () => spawnSaucer('attack')],
      [152, () => caption('The jets are winning! Saucers are falling out of the sky!', true)],
      [168, () => { phase = 'retreat'; caption('The aliens are running away!! 🏃‍♂️👽', true); for (const A of aliens) { A.state = 'run'; A.speed *= 2.2; } }],
      [192, () => { for (const s of saucers) if (s.state !== 'gone' && s.state !== 'crash') { s.state = 'flee'; s.t = 0; } }],
      [200, () => victory()],
    ];
    let si = 0, phase = 'attack', done = false, aliensDefeated = false;

    /* ---------- the main loop ---------- */
    let lastInput = performance.now(), autoT = 0;
    const touch = () => { lastInput = performance.now(); };
    for (const ev of ['pointerdown', 'wheel', 'keydown', 'touchstart']) addEventListener(ev, touch, { passive: true });
    const _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3();
    const tick = (time, dt) => {
      if (done) return;
      invT += dt;
      while (si < SCRIPT.length && invT >= SCRIPT[si][0]) SCRIPT[si++][1]();
      capT -= dt; if (capT <= 0) cap.classList.remove('on');
      const hitP = Math.min(0.9, phase === 'retreat' ? 0.9 : invT < 130 ? 0.12 : 0.45);
      // saucers
      for (const s of saucers) {
        s.t += dt;
        for (let i = 0; i < s.lights.length; i++) s.lights[i].visible = ((Math.floor(time * 8) + i) % 3) !== 0;
        s.body.rotation.y += dt * (s.state === 'crash' ? s.spin : 1.2);
        if (s.state === 'arrive') {
          const k = Math.min(1, s.t / 6), e = k * k * (3 - 2 * k), home = saucerHome(s, invT).multiplyScalar(s.alt);
          s.pos.copy(s.from).lerp(home, e); if (k >= 1) { s.state = s.role === 'lander' ? 'land' : 'hover'; s.t = 0; }
        } else if (s.state === 'hover') {
          s.pos.lerp(saucerHome(s, invT).multiplyScalar(s.alt + 0.004 * Math.sin(invT * 2 + s.id)), 1 - Math.exp(-dt * 1.5));
          if (s.role === 'attack') {
            s.fire -= dt;
            if (s.fire <= 0 && phase !== 'retreat') {
              s.fire = R(0.5, 1.4); const p = cityTarget(s.tgt); _a.copy(s.pos).addScaledVector(s.pos.clone().normalize(), -0.006);
              beam(_a, p, 0xff1a1a, 0.0044, 0.4); explode(p, 0.5, false);
              if (Math.random() < 0.85) addFire(p, R(30, 70), R(0.7, 1.4));
              if (!s.tgt._ignited) { s.tgt._ignited = true; for (let k = 0; k < 3; k++) addFire(cityTarget(s.tgt), R(45, 95), R(0.6, 1.3)); }
            }
            s.roam -= dt;
            if (s.roam <= 0 && phase !== 'retreat') {
              let next = cities[Math.floor(Math.random() * cities.length)];
              if (cities.length > 1) { let tries = 0; while (next === s.tgt && tries++ < 5) next = cities[Math.floor(Math.random() * cities.length)]; }
              s.tgt = next; s.home = next.n.clone(); s.from = s.pos.clone(); s.state = 'arrive'; s.t = 0; s.roam = R(9, 16);
              if (Math.random() < 0.4) caption(`A saucer zooms off to attack ${next.name}!`);
            }
          } else if (s.role === 'bbq') {
            s.fire -= dt;
            if (s.fire <= 0 && phase !== 'retreat') { s.fire = R(0.15, 0.35); const p = offset(nug.n, Math.random() * 6.28, Math.random() * 0.03); beam(_a.copy(s.pos).addScaledVector(s.pos.clone().normalize(), -0.006), p, 0xff8a1a, 0.003, 0.25); if (Math.random() < 0.25) explode(p, 0.35, false); if (Math.random() < 0.08) addFire(p, R(20, 40), 0.8); note(p, 1); }
            bbqK = Math.min(1, bbqK + dt / 30); nug.api.bbq(bbqK);
            if (Math.random() < dt * 8) { const p = offset(nug.n, Math.random() * 6.28, Math.random() * 0.025); smokeP.emit(p, _v.copy(p).multiplyScalar(R(0.01, 0.02)), R(2, 4), 0.006, 0.03, [0.3, 0.27, 0.25], [0.55, 0.52, 0.5], 0.7); }
          }
        } else if (s.state === 'land') {
          const ground = saucerHome(s, 0).clone(); s.ground = ground.clone();
          const k = Math.min(1, s.t / 7); s.pos.copy(ground).multiplyScalar(s.alt + (1.006 - s.alt) * k * k * (3 - 2 * k));
          s.beam.visible = k < 1; if (k >= 1) { s.state = 'landed'; landed = s; nug.api.rain(false); }
        } else if (s.state === 'landed') {
          s.pos.copy(s.ground).multiplyScalar(1.006);
          s.beam.visible = false;
          if (phase === 'retreat' && aliens.every(A => A.state === 'home')) { s.state = 'flee'; s.t = 0; landed = null; caption('The last saucer is escaping! Bye bye, aliens! 👋', true); }
        } else if (s.state === 'crash') {
          s.vel.addScaledVector(s.pos.clone().normalize(), -0.06 * dt); s.pos.addScaledVector(s.vel, dt); s.body.rotation.z = Math.sin(s.t * 3) * 0.6;
          if (Math.random() < dt * 30) smokeP.emit(s.pos, rv(0.01), R(1, 2), 0.006, 0.02, [0.2, 0.2, 0.2], [0.5, 0.5, 0.5], 0.8);
          if (Math.random() < dt * 20) fireP.emit(s.pos, rv(0.01), R(0.2, 0.4), 0.006, 0.012, [1, 0.8, 0.3], [0.8, 0.2, 0]);
          if (s.pos.length() <= 1.004) { explode(s.pos, 1.6, true); addFire(s.pos.clone().normalize(), 80, 1.5); s.state = 'gone'; s.g.visible = false; }
        } else if (s.state === 'flee') {
          s.pos.multiplyScalar(1 + dt * (0.15 + s.t * 0.5)); s.body.rotation.y += dt * 8;
          if (s.pos.length() > 6) { s.state = 'gone'; s.g.visible = false; }
        }
        if (s.state !== 'gone') { s.g.position.copy(s.pos); s.n.copy(s.pos).normalize(); _b.set(1, 0, 0); orient(s.g, s.n, _b.cross(s.n).lengthSq() > 1e-6 ? _b.set(0, 0, 1) : _b); if (s.state === 'hover' || s.state === 'arrive') { s.g.rotateX(Math.sin(invT * 1.3 + s.id) * 0.12); } }
        if (s.state === 'hover' && s.role === 'bbq' && Math.random() < dt * 2) s.beam.visible = !s.beam.visible;
        if (s.beam.visible) s.beam.scale.set(1, (s.pos.length() - 1) / SAUCER, 1);
      }
      // aliens
      for (const A of aliens) {
        A.t += dt; wiggle(A, A.t, A.state === 'run' ? 9 : A.state === 'walk' ? 5 : 2.5, A.state === 'eat' ? 0.25 : 0.4);
        if (A.state === 'walk' || A.state === 'run') {
          const goal = A.state === 'run' ? landed ? landed.ground : A.pos : A.spot;
          _a.copy(goal).sub(A.pos); const d = _a.length();
          if (d < 0.003) { if (A.state === 'walk') A.state = 'eat'; else { A.state = 'home'; A.g.visible = false; } }
          else { A.pos.addScaledVector(_a.normalize(), Math.min(d, A.speed * dt)).normalize(); orient(A.g, A.pos, _a); }
          A.b.position.y = Math.abs(Math.sin(A.t * (A.state === 'run' ? 14 : 8))) * 0.08;
        } else if (A.state === 'eat') {
          A.b.rotation.x = 0.25 + Math.sin(A.t * 6) * 0.18; A.b.position.y = 0;
          A.eat -= dt; if (A.eat <= 0) { A.eat = R(2, 4); nugEaten = Math.min(36, nugEaten + 1); nug.api.eat(nugEaten); note(A.pos, 2); for (let k = 0; k < 6; k++) fireP.emit(A.pos.clone().multiplyScalar(1.012), rv(0.01), 0.5, 0.004, 0.001, [1, 0.8, 0.3]); }
          // the eye keeps watching you
          A.eye.lookAt(cam.position);
        }
        if (A.state !== 'home') { A.g.position.copy(A.pos); if (A.state !== 'walk' && A.state !== 'run') { _b.copy(nug.n).sub(A.pos); orient(A.g, A.pos.clone().normalize(), _b); } }
      }
      if (!aliensDefeated && phase === 'retreat' && aliens.length && aliens.every(A => A.state === 'home')) { aliensDefeated = true; for (const J of jets) J.leaving = true; }
      // jets
      for (const J of jets) {
        if (J.leaving) {
          J.vel.lerp(J.pos.clone().normalize().multiplyScalar(0.16), 1 - Math.exp(-dt * 1.2));
          J.pos.addScaledVector(J.vel, dt);
          J.g.position.copy(J.pos); _c.copy(J.pos).add(J.vel); J.g.lookAt(_c); J.g.rotateY(-Math.PI / 2);
          if (J.pos.clone().normalize().dot(camDir()) < -0.15 || J.pos.length() > 3) J.gone = true;
          continue;
        }
        if (!J.target || J.target.state === 'gone' || J.target.state === 'crash' || J.target.state === 'flee') J.target = nearestSaucer(J.pos);
        const goal = J.target ? _a.copy(J.target.pos).add(_c.copy(rv(1)).set(Math.cos(invT * 1.6 + J.ph), Math.sin(invT * 1.3 + J.ph), Math.cos(invT * 0.9 + J.ph)).multiplyScalar(0.03)) : _a.copy(J.pos).normalize().multiplyScalar(1.12);
        _b.copy(goal).sub(J.pos); J.vel.lerp(_b.normalize().multiplyScalar(0.12), 1 - Math.exp(-dt * 2));
        J.pos.addScaledVector(J.vel, dt); if (J.pos.length() < 1.03) J.pos.setLength(1.03);
        J.g.position.copy(J.pos); _c.copy(J.pos).add(J.vel); J.g.lookAt(_c); J.g.rotateY(-Math.PI / 2);
        J.cool -= dt;
        if (J.target && J.cool <= 0 && J.pos.distanceTo(J.target.pos) < 0.12) {
          J.cool = R(0.25, 0.6); const tgt = J.target;
          tracer(J.pos, _b.copy(tgt.pos).sub(J.pos), 0.45, 0xffe14a, J.pos.distanceTo(tgt.pos) / 0.45, () => { if (Math.random() < hitP) { damage(tgt, 1); sparkP.emit(tgt.pos, rv(0.05), 0.4, 0.003, 0.001, [1, 1, 0.6], [1, 0.4, 0]); } });
          note(J.pos, 0.5);
        }
      }
      if (aliensDefeated) {
        for (let i = jets.length - 1; i >= 0; i--) {
          const J = jets[i];
          if (J.gone) {
            jets.splice(i, 1);
            const oi = objects.findIndex(o => o[0] === J.g); if (oi >= 0) objects.splice(oi, 1);
            if (J.g.parent) J.g.parent.remove(J.g);
            J.g.traverse(m => { if (m.isMesh && m.geometry) m.geometry.dispose(); });
          }
        }
      }
      // turrets
      for (const tu of turrets) {
        const tgt = nearestSaucer(tu.n); if (!tgt || tgt.pos.distanceTo(tu.n) > 0.2) continue;
        tu.gun.lookAt(tu.g.worldToLocal(_a.copy(tgt.pos)).add(tu.gun.position)); tu.gun.rotateX(Math.PI / 2);
        tu.cool -= dt;
        if (tu.cool <= 0) { tu.cool = R(0.35, 0.8); const from = tu.n.clone().multiplyScalar(1.0 + U * 1.3); tracer(from, _b.copy(tgt.pos).sub(from), 0.5, 0xfff07a, from.distanceTo(tgt.pos) / 0.5, () => { if (Math.random() < hitP) damage(tgt, 1); }); fireP.emit(from, rv(0.005), 0.15, 0.004, 0.008, [1, 0.9, 0.5], [1, 0.4, 0]); }
      }
      // fires
      for (let i = fires.length - 1; i >= 0; i--) {
        const F = fires[i]; F.life -= dt; if (F.life <= 0) { fires.splice(i, 1); continue; }
        F.acc += dt * 22 * F.k * Math.min(1, F.life / 5);
        while (F.acc >= 1) { F.acc--; fireP.emit(_a.copy(F.p).add(rv(0.004 * F.k)), _b.copy(F.n).multiplyScalar(R(0.006, 0.014)).add(rv(0.003)), R(0.4, 0.9), 0.004 * F.k, 0.001, Math.random() < 0.5 ? [1, 0.85, 0.3] : [1, 0.5, 0.1], [0.6, 0.08, 0.0]); if (Math.random() < 0.35) smokeP.emit(_a, _b.copy(F.n).multiplyScalar(R(0.008, 0.016)).add(rv(0.004)), R(2, 4), 0.006 * F.k, 0.03 * F.k, [0.25, 0.23, 0.22], [0.5, 0.48, 0.47], 0.65); }
      }
      // beams, tracers, flashes
      for (const B of beams) { if (B.t <= 0) continue; B.t -= dt; const k = Math.max(0, B.t / B.life); B.core.material.opacity = k; B.glow.material.opacity = 0.45 * k; if (B.t <= 0) B.core.visible = B.glow.visible = false; }
      for (const Q of tracers) { if (Q.t <= 0) continue; Q.t -= dt; Q.p.addScaledVector(Q.d, Q.sp * dt); Q.m.position.copy(Q.p); if (Q.t <= 0) { Q.m.visible = false; if (Q.onEnd) Q.onEnd(); } }
      for (const F of flashes) { if (!F.sp.visible) continue; F.t += dt; const k = F.t / F.d; F.sp.scale.setScalar(F.s * (0.5 + k)); F.sp.material.opacity = Math.max(0, 1 - k); if (k >= 1) F.sp.visible = false; }
      fireP.step(dt, 1.2, 0); smokeP.step(dt, 0.6, 0); sparkP.step(dt, 0.5, 0.08);
      // screen shake
      shake = Math.max(0, shake - dt * 1.8);
      ctx.canvas.style.transform = shake > 0.01 ? `translate(${(Math.random() - 0.5) * 18 * shake}px,${(Math.random() - 0.5) * 18 * shake}px)` : '';
      // automatic camera: after 20 s without a touch, go to wherever the most is happening
      autoT -= dt;
      if (performance.now() - lastInput > 20000 && autoT <= 0) {
        autoT = 7; let best = null, bw = 0;
        for (const e of events) { if (invT - e.t > 12) continue; let w = 0; for (const f of events) if (invT - f.t <= 12 && e.p.dot(f.p) > Math.cos(0.2)) w += f.w; if (w > bw) { bw = w; best = e; } }
        if (best) ctx.setFocus(best.p.clone(), 1.5);
      }
    };
    ctx.tickers.push(tick);

    /* ---------- victory, then back to normal ---------- */
    function victory() {
      caption('🎉 VICTORY! 🎉', true);
      const w = document.createElement('div'); w.className = 'inv-win';
      w.innerHTML = '<canvas></canvas><div><h1>VICTORY!</h1><h2>Nathaniel Planet is saved! 😄</h2></div>';
      document.body.appendChild(w);
      const cols = ['#ff4d6d', '#ffd23f', '#4ecdc4', '#9b7bff', '#7ed957', '#ff9f43', '#ffffff', '#ff9ff3'];
      for (let i = 0; i < 90; i++) { const s = document.createElement('div'); s.className = 'inv-streamer'; s.style.left = Math.random() * 100 + 'vw'; s.style.background = `repeating-linear-gradient(45deg,${cols[i % 8]} 0 8px,${cols[(i + 3) % 8]} 8px 16px)`; s.style.animationDuration = R(3, 7) + 's'; s.style.animationDelay = R(0, 6) + 's'; s.style.height = R(40, 110) + 'px'; w.appendChild(s); }
      const SM = ['😀', '😄', '😁', '🥳', '😊', '🤩', '😆'];
      for (let i = 0; i < 40; i++) { const s = document.createElement('div'); s.className = 'inv-smile'; s.textContent = SM[i % SM.length]; s.style.left = Math.random() * 95 + 'vw'; s.style.animationDuration = R(4, 8) + 's'; s.style.animationDelay = R(0, 7) + 's'; s.style.fontSize = R(30, 64) + 'px'; w.appendChild(s); }
      const cv = w.querySelector('canvas'), g2 = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
      const sparks = []; let last = performance.now(), boom = 0, alive = true;
      const loop = now => {
        if (!alive) return; requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000); last = now; boom -= dt;
        if (boom <= 0) { boom = R(0.15, 0.5); const x = R(0.1, 0.9) * cv.width, y = R(0.1, 0.5) * cv.height, c = cols[Math.floor(Math.random() * 7)], n = 70; for (let i = 0; i < n; i++) { const a = i / n * 6.283, sp = R(80, 260); sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: R(1, 1.8), c }); } }
        g2.globalCompositeOperation = 'destination-out'; g2.fillStyle = 'rgba(0,0,0,0.18)'; g2.fillRect(0, 0, cv.width, cv.height); g2.globalCompositeOperation = 'lighter';
        for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.l -= dt; if (p.l <= 0) { sparks.splice(i, 1); continue; } p.vy += 120 * dt; p.vx *= 1 - dt; p.vy *= 1 - dt * 0.5; p.x += p.vx * dt; p.y += p.vy * dt; g2.fillStyle = p.c; g2.globalAlpha = Math.min(1, p.l); g2.beginPath(); g2.arc(p.x, p.y, 2.4, 0, 6.3); g2.fill(); }
        g2.globalAlpha = 1;
      };
      requestAnimationFrame(loop);
      setTimeout(() => { w.style.opacity = 0; }, 15000);
      setTimeout(() => { alive = false; w.remove(); end(); }, 16500);
    }
    function end() {
      done = true;
      const i = ctx.tickers.indexOf(tick); if (i >= 0) ctx.tickers.splice(i, 1);
      for (const ev of ['pointerdown', 'wheel', 'keydown', 'touchstart']) removeEventListener(ev, touch);
      for (const [o, p] of objects) p.remove(o);
      const geos = new Set(); for (const [o] of objects) o.traverse(m => { if (m.isMesh && m.geometry) geos.add(m.geometry); });
      geos.forEach(g => g.dispose()); disposables.forEach(d => d && d.dispose && d.dispose());
      ctx.scene.remove(envLight);
      nug.api.reset(); ctx.canvas.style.transform = '';
      cap.remove(); alertDiv.remove(); document.body.classList.remove('invading');
      ctx.releaseFocus();
      if (ctx.onEnd) ctx.onEnd();
    }
    return { end, skipTo(t) { invT = t; }, advance(sec) { for (let k = 0; k < sec * 10 && !done; k++) tick(performance.now() / 1000, 0.1); }, saucers, aliens, jets };
  }
  injectCSS(); // the button's own styling and its age rule must exist before the dialog is ever opened
  root.NPInvasion = { confirm: confirmDialog, start };
})(typeof window !== 'undefined' ? window : globalThis);
