/* ============================================================
   生日小屋 · 游戏主逻辑
   （经典脚本：由 index.html 引导加载；依赖 window.THREE 与 window.AudioBox）
   ============================================================ */
const THREE = window.THREE;

/* ================================================================
   ✏️ 自定义区：把下面的内容改成你自己的，礼物就是 TA 的了
   ================================================================ */
const CONFIG = {
  toName: '老友',
  drawerCode: '0520',
  clockHour: 8,
  photos: [],
  intro: {
    kicker: '哟，欢迎光临 · 生日探索',
    title: '门开着，<br/>就等你了。',
    desc: '房间里藏了 6 个小机关、6 段我们的回忆。\n沿着线索慢慢逛，把它们一一唤醒——\n集齐之后，小屋会为你点亮最后一份惊喜。',
  },
  notes: [
    '还记得上次咱俩在网吧通宵到三点，第二天顶着黑眼圈去上课。',
    '你说的那家巷口面馆我去了，真的好吃，就是排队排到怀疑人生。',
    '那年毕业旅行，你非要在山顶看日出，结果我们冻得瑟瑟发抖。',
    '你总说我吐槽你像个老妈子，但其实有你唠叨的日子挺踏实的。',
    '认识这么多年，你还是那个一开心就会原地蹦跶的傻子。',
    '新的一岁，愿你想做的事都能成，想见的人都能见到。',
  ],
  hints: {
    drawer: '书桌抽屉上有一把四位密码锁，桌上的纸条和书架顶上的相框里，藏着数字。',
    books: '沙发上方的油画暗示了书架上书的颜色顺序——晨绿、午金、晚霞红。',
    music: '角落的唱片机落了灰，也许该放一首歌了。',
    window: '窗帘还拉着呢，窗外好像有个小东西在等你。',
    lamp: '把书桌上的台灯关掉，天花板也许会给你看一样东西。',
    clock: '桌上的小纸条写着：今晚 8 点，记得赴约。把墙上的挂钟拨准吧。',
  },
  letter: [
    '认识你之后，我把我们的日常搬进了这间小屋：',
    '凌晨三点的键盘声、巷口排队的面馆、山顶冻人的日出，',
    '还有那些没说出口、但你都懂的废话。',
    '',
    '六段回忆你都找到了——就像这六件小事，',
    '是我攒了很久、想当面跟你说一声的"谢谢"。',
    '',
    '生日快乐，老朋友。',
    '新的一岁，该吃吃该喝喝，有事别往心里搁。',
  ],
  sign: '—— 站在你这边的老朋友',
};
/* ====================== 自定义区结束 ====================== */

const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
if (isTouch) document.body.classList.add('touch');
$('lKicker').textContent = CONFIG.intro.kicker;
$('lTitle').innerHTML = CONFIG.intro.title;
$('lDesc').innerHTML = CONFIG.intro.desc.replace(/\n/g, '<br>');
$('lFoot').textContent = isTouch ? '左摇杆 行走 · 右侧滑动 转头 · 点按物品 互动' : 'WASD 行走 · 鼠标 转头 · E 互动 · Esc 释放鼠标';
$('letterTitle').textContent = '亲爱的 ' + CONFIG.toName;
$('lTo').textContent = 'TO · ' + CONFIG.toName;

/* ---------------- UI 基础 ---------------- */
const pocketHeartsEl = $('pocketHearts');
for (let i = 0; i < 6; i++) pocketHeartsEl.insertAdjacentHTML('beforeend',
  '<svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 16.8 5.7 21.4 8 14 2 9.4h7.6z"/></svg>');
function updateHUD(){
  const n = MECH_KEYS.filter(k => mechs[k].solved).length;
  $('progText').textContent = `已解开 ${n} / 6 个小机关`;
  $('progBar').style.width = (n / 6 * 100) + '%';
  $('pocketNum').textContent = collected;
  [...pocketHeartsEl.children].forEach((el, i) => el.classList.toggle('on', i < collected));
}
function toast(text, dur = 2600){
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
  $('toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 550); }, dur);
}
const _v = new THREE.Vector3();
function flyHeart(worldPos){
  _v.copy(worldPos).project(camera);
  const x = (_v.x * .5 + .5) * innerWidth, y = (-_v.y * .5 + .5) * innerHeight;
  const h = document.createElement('div'); h.className = 'flyHeart'; h.textContent = '✦';
  h.style.left = (x - 11) + 'px'; h.style.top = (y - 11) + 'px'; h.style.color = '#e8c97a';
  document.body.appendChild(h);
  const r = pocketHeartsEl.getBoundingClientRect();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    h.style.left = (r.left + r.width / 2 - 11) + 'px'; h.style.top = (r.top + r.height / 2 - 11) + 'px';
    h.style.transform = 'scale(.4)'; h.style.opacity = '.2';
  }));
  setTimeout(() => { h.remove(); collected++; updateHUD(); AudioBox.sPop();
    if ($('pocket').animate) $('pocket').animate([{ transform:'scale(1)' },{ transform:'scale(1.08)' },{ transform:'scale(1)' }], { duration:300 });
  }, 950);
}
/* ---------------- 弹窗 ---------------- */
let uiOpen = false, modalCloseCb = null;
function showModal(html, { dismissible = true, noteStyle = false } = {}){
  uiOpen = true;
  $('modalCard').className = 'card' + (noteStyle ? ' notecard' : '');
  $('modalCard').innerHTML = `<button class="close" id="mClose">✕</button>` + html;
  $('modalWrap').classList.add('show');
  if (!isTouch) document.exitPointerLock?.();
  $('mClose').onclick = () => closeModal();
  $('modalWrap').onclick = e => { if (e.target === $('modalWrap') && dismissible) closeModal(); };
  modalCloseCb = null;
}
function closeModal(){
  if (!uiOpen) return;
  uiOpen = false;
  $('modalWrap').classList.remove('show');
  const f = modalCloseCb; modalCloseCb = null;
  if (f) f();
  if (started && !isTouch && !finaleOn && !blown) canvas.requestPointerLock?.();
}
function shakeCard(){ const c = $('modalCard'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); AudioBox.sError(); }

/* ---------------- 渲染器 / 场景 ---------------- */
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const SHARED_SKY = new THREE.Color(0xcfe7e2);
scene.background = SHARED_SKY;

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .08, 60);
camera.rotation.order = 'YXZ';
camera.position.set(.2, 1.55, 3.4);
camera.rotation.y = Math.PI * .04;

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------------- 材质与工具 ---------------- */
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, metalness: 0 }, o));
const M = {
  wall: mat(0xf1e8d6, { roughness: .95 }),
  wood: mat(0xb98d5f), woodD: mat(0x8a6a48), cream: mat(0xf3ead9),
  sage: mat(0xa7bfa0), sageD: mat(0x7d9c78), terra: mat(0xc98a6b),
  butter: mat(0xe8c97a), ink: mat(0x4a4438), pink: mat(0xf2c4cc),
  white: mat(0xfdfbf5), metal: mat(0x9a938a, { metalness: .5, roughness: .4 }),
  dark: mat(0x35302a, { roughness: .6 }),
  cat: mat(0x8d7b68, { roughness: .95 }),
  catLight: mat(0xc9b8a4),
};
function box(w, h, d, m, x, y, z, ry = 0, parent){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z); mesh.rotation.y = ry;
  mesh.castShadow = true; mesh.receiveShadow = true;
  (parent || scene).add(mesh); return mesh;
}
function cyl(rt, rb, h, m, x, y, z, seg = 24, parent){
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  (parent || scene).add(mesh); return mesh;
}
function heartGeo(s = 1, d = .1){
  const sh = new THREE.Shape();
  sh.moveTo(.25, .25); sh.bezierCurveTo(.25, .25, .2, 0, 0, 0);
  sh.bezierCurveTo(-.3, 0, -.3, .35, -.3, .35); sh.bezierCurveTo(-.3, .55, -.1, .77, .25, .95);
  sh.bezierCurveTo(.6, .77, .8, .55, .8, .35); sh.bezierCurveTo(.8, .35, .8, 0, .5, 0);
  sh.bezierCurveTo(.35, 0, .25, .25, .25, .25);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2, curveSegments: 12 });
  g.center(); g.rotateZ(Math.PI); g.scale(s, s, s); return g;
}
function heartMesh(color, s = 1, emissive = 0){
  const m = new THREE.Mesh(heartGeo(s, .35 * s), mat(color, emissive ? { emissive: color, emissiveIntensity: emissive } : {}));
  m.castShadow = true; return m;
}
function textTex(draw, w = 256, h = 256){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex(){
  return textTex((g, w, h) => { const r = g.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h); }, 128, 128);
}
const GLOW = glowTex();
function glowSprite(color, s, opacity = 1){
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  sp.scale.setScalar(s); sp.raycast = () => {}; return sp;
}
/* 程序化手绘纹理 */
function texWood(){
  return textTex((g, w, h) => {
    g.fillStyle = '#d8b98d'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32){
      g.fillStyle = `rgba(120,86,52,${.10 + Math.random() * .06})`;
      g.fillRect(0, y, w, 2);
      g.fillStyle = `rgba(255,240,214,${.05 + Math.random() * .05})`;
      g.fillRect(0, y + 3, w, 1.5);
      for (let x = 0; x < w; x += 60 + Math.random() * 40){
        g.fillStyle = 'rgba(120,86,52,.12)'; g.fillRect(x, y, 1.6, 32);
      }
      g.strokeStyle = 'rgba(120,86,52,.07)'; g.lineWidth = 1;
      for (let i = 0; i < 3; i++){
        g.beginPath(); const yy = y + 8 + Math.random() * 16;
        g.moveTo(0, yy);
        for (let x = 0; x <= w; x += 24) g.lineTo(x, yy + Math.sin(x / 30 + i) * 1.6);
        g.stroke();
      }
    }
  }, 512, 512);
}
function texWall(){
  return textTex((g, w, h) => {
    g.fillStyle = '#f1e8d6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++){
      g.fillStyle = `rgba(180,160,130,${Math.random() * .05})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    }
    g.strokeStyle = 'rgba(167,191,160,.16)'; g.lineWidth = 2;
    for (let x = 16; x < w; x += 48){
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    }
  }, 512, 512);
}
function texRug(){
  return textTex((g, w, h) => {
    g.fillStyle = '#ece2cf'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(148,132,110,.35)';
    for (let r = 18; r < w / 2; r += 14){
      g.lineWidth = 5; g.globalAlpha = .16 + (r % 28) / 60;
      g.beginPath(); g.arc(w/2, h/2, r, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1; g.fillStyle = 'rgba(201,138,107,.5)';
    g.beginPath(); g.arc(w/2, h/2, 10, 0, Math.PI * 2); g.fill();
  }, 512, 512);
}

/* ---------------- 房间 ---------------- */
const ROOM = { w: 10, d: 7.4, h: 3.3 };
const room = new THREE.Group(); scene.add(room);

const floorMat = mat(0xffffff, { map: texWood(), roughness: .92 });
floorMat.map.wrapS = floorMat.map.wrapT = THREE.RepeatWrapping; floorMat.map.repeat.set(3, 2.2);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; room.add(floor);

const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.d), mat(0xf2ead9));
ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h; room.add(ceil);

const T = .15, HZ = -ROOM.d / 2;
const wallMat = mat(0xffffff, { map: texWall(), roughness: .95 });
wallMat.map.wrapS = wallMat.map.wrapT = THREE.RepeatWrapping; wallMat.map.repeat.set(2.4, 1.4);
function wallSeg(w, h, x, y, z){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, T), wallMat);
  m.position.set(x, y, z); m.receiveShadow = true; room.add(m); return m;
}
wallSeg(ROOM.w, ROOM.h, 0, ROOM.h / 2, ROOM.d / 2);
wallSeg(5.7, ROOM.h, -2.15, ROOM.h / 2, HZ);
wallSeg(2.5, ROOM.h, 3.75, ROOM.h / 2, HZ);
wallSeg(1.8, 1.0, 1.6, .5, HZ);
wallSeg(1.8, .9, 1.6, 2.85, HZ);
wallSeg(T, ROOM.h, -ROOM.w / 2, ROOM.h / 2, 0);
wallSeg(T, ROOM.h, ROOM.w / 2, ROOM.h / 2, 0);

[[ROOM.w, 0, ROOM.d / 2], [ROOM.w, 0, -ROOM.d / 2]].forEach(([w, , z]) => box(w, .14, .05, M.cream, 0, .07, z, 0, room));
[[-ROOM.w / 2], [ROOM.w / 2]].forEach(([x]) => box(.05, .14, ROOM.d, M.cream, x, .07, 0, 0, room));

/* 窗 + 窗帘 */
const winG = new THREE.Group(); winG.position.set(1.6, 1.7, HZ); room.add(winG);
box(1.9, .07, .1, M.cream, 0, .72, 0, 0, winG); box(1.9, .07, .1, M.cream, 0, -.72, 0, 0, winG);
box(.07, 1.5, .1, M.cream, -.92, 0, 0, 0, winG); box(.07, 1.5, .1, M.cream, .92, 0, 0, 0, winG);
box(1.76, .045, .06, M.cream, 0, 0, .02, 0, winG); box(.045, 1.38, .06, M.cream, 0, 0, .02, 0, winG);
const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshBasicMaterial({ color: 0xdff0ec, transparent: true, opacity: .12 }));
glass.position.z = -.04; glass.raycast = () => {}; winG.add(glass);
box(2.3, .06, .12, M.woodD, 1.6, 2.52, HZ + .06, 0, room);
const curtL = box(.5, 1.62, .1, M.sage, .62, 1.66, HZ + .13, 0, room);
const curtR = box(.5, 1.62, .1, M.sage, 2.58, 1.66, HZ + .13, 0, room);

/* 窗外：天空幕布 + 山丘 + 日月星 */
const sky = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), new THREE.MeshBasicMaterial({ color: SHARED_SKY }));
sky.position.set(1.6, 2.4, -8.2); sky.raycast = () => {}; scene.add(sky);
function hillMesh(col, lift, z){
  const sh = new THREE.Shape();
  sh.moveTo(-10, -3);
  sh.quadraticCurveTo(-4.5, 1.4 + lift, 0, -.1 + lift);
  sh.quadraticCurveTo(4.5, 1.6 + lift, 10, -1.6 + lift);
  sh.lineTo(10, -3); sh.lineTo(-10, -3);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col }));
  m.position.set(1.6, 2.3, z); m.raycast = () => {}; scene.add(m); return m;
}
const hill1 = hillMesh(0x86a377, .3, -6.6);
const hill2 = hillMesh(0x6f8c62, -.2, -6.0);
const sun = new THREE.Mesh(new THREE.CircleGeometry(.4, 32), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
sun.position.set(0, 3.4, -7.4); sun.raycast = () => {}; scene.add(sun);
const moon = new THREE.Mesh(new THREE.CircleGeometry(.3, 32), new THREE.MeshBasicMaterial({ color: 0xf6ecd2 }));
moon.position.set(2.7, 3.1, -7.4); moon.visible = false; moon.raycast = () => {}; scene.add(moon);
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 80; i++) starPos.push(0.2 + Math.random() * 4, .6 + Math.random() * 3.8, -7.4 - Math.random() * 1.2);
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff2cf, size: .05, transparent: true, opacity: .9 }));
stars.visible = false; stars.raycast = () => {}; scene.add(stars);

/* 窗外远景：楼房剪影 + 树 + 云 */
function bldgMesh(x, w, h, col){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col }));
  m.position.set(x, h / 2, -7.2); m.raycast = () => {}; scene.add(m); return m;
}
bldgMesh(-3.2, 1.2, 2.4, 0x5a6358); bldgMesh(-1.9, .8, 1.7, 0x4f5750);
bldgMesh(-1.0, 1.0, 2.9, 0x444c47); bldgMesh(.2, .7, 1.4, 0x525a54);
bldgMesh(1.0, 1.1, 2.1, 0x4a5250); bldgMesh(2.3, .9, 2.6, 0x505855);
bldgMesh(3.4, 1.0, 1.9, 0x474f4c);
const winLights = [];
for (let i = 0; i < 26; i++){
  const wx = -3.5 + Math.random() * 7.2, wy = .4 + Math.random() * 2.2;
  const w = new THREE.Mesh(new THREE.PlaneGeometry(.05, .07), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
  w.position.set(wx, wy, -7.18); w.raycast = () => {}; w.visible = false; scene.add(w);
  winLights.push(w);
}
for (let i = 0; i < 5; i++){
  const tx = -3.8 + i * 1.7 + Math.random() * .4;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .3, 6), mat(0x6b5340));
  trunk.position.set(tx, .15, -7.0); trunk.raycast = () => {}; scene.add(trunk);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(.18 + Math.random() * .06, 8, 6), mat(0x6f8c62));
  leaves.position.set(tx, .45, -7.0); leaves.raycast = () => {}; scene.add(leaves);
}
const cloud = new THREE.Group(); cloud.position.set(-2, 3.6, -7.6); scene.add(cloud);
for (let i = 0; i < 4; i++){
  const c = new THREE.Mesh(new THREE.SphereGeometry(.18 + Math.random() * .08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85 }));
  c.position.set(i * .2 - .3, Math.random() * .1, 0); c.raycast = () => {}; cloud.add(c);
}

/* 地毯 */
const rug = new THREE.Mesh(new THREE.CircleGeometry(1.95, 48), mat(0xffffff, { map: texRug(), roughness: .95 }));
rug.rotation.x = -Math.PI / 2; rug.position.set(0, .012, .4); rug.receiveShadow = true; room.add(rug);

/* ---------------- 家具 ---------------- */
const colliders = [];
const addCol = (x1, x2, z1, z2) => colliders.push({ x1, x2, z1, z2 });

// 圆桌 + 礼物盒
const table = new THREE.Group(); table.position.set(0, 0, .4); room.add(table);
cyl(.95, .95, .07, M.wood, 0, .8, 0, 36, table);
cyl(.09, .11, .78, M.woodD, 0, .4, 0, 16, table);
cyl(.34, .4, .05, M.woodD, 0, .025, 0, 24, table);
addCol(-1, 1, -.6, 1.4);

const gift = new THREE.Group(); gift.position.set(0, .835, 0); table.add(gift);
box(.78, .55, .78, M.sage, 0, .275, 0, 0, gift);
box(.1, .57, .82, M.butter, 0, .285, 0, 0, gift); box(.82, .57, .1, M.butter, 0, .285, 0, 0, gift);
const giftLid = new THREE.Group(); giftLid.position.set(0, .55, -.39); gift.add(giftLid);
box(.84, .14, .84, M.sageD, 0, .07, .39, 0, giftLid);
box(.12, .16, .88, M.butter, 0, .07, .39, 0, giftLid); box(.88, .16, .12, M.butter, 0, .07, .39, 0, giftLid);
cyl(.09, .09, .05, M.butter, 0, .17, .35, 12, giftLid);
cyl(.07, .07, .05, M.butter, -.1, .2, .35, 12, giftLid); cyl(.07, .07, .05, M.butter, .1, .2, .35, 12, giftLid);

// 蛋糕（藏在盒里）
const cake = new THREE.Group(); cake.position.set(0, .62, .35); cake.scale.setScalar(.001); gift.add(cake);
cyl(.32, .34, .03, M.white, 0, 0, 0, 32, cake);
cyl(.24, .25, .17, M.cream, 0, .1, 0, 32, cake);
cyl(.165, .175, .13, M.pink, 0, .25, 0, 32, cake);
for (let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2; cyl(.028, .028, .035, mat(0xd96a6a), Math.cos(a) * .19, .335, Math.sin(a) * .19, 10, cake); }
cyl(.013, .013, .17, M.white, 0, .4, 0, 8, cake);
cyl(.014, .014, .03, M.butter, 0, .42, 0, 8, cake);
const flame = new THREE.Group(); flame.position.set(0, .5, 0); flame.visible = false; cake.add(flame);
const flameIn = new THREE.Mesh(new THREE.ConeGeometry(.028, .11, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
flameIn.position.y = .02; flame.add(flameIn);
const flameOut = new THREE.Mesh(new THREE.ConeGeometry(.045, .16, 10), new THREE.MeshBasicMaterial({ color: 0xffa24a, transparent: true, opacity: .75 }));
flameOut.position.y = .01; flame.add(flameOut);
const flameGlow = glowSprite(0xffb35c, .55, .9); flameGlow.position.y = .06; flame.add(flameGlow);
const candleLight = new THREE.PointLight(0xffa050, 0, 7, 1.8); candleLight.position.set(0, 2.05, .75); scene.add(candleLight);

// 书架（西墙）——背板贴墙，开口朝向房间
const shelf = new THREE.Group(); shelf.position.set(-4.78, 0, -1.6); room.add(shelf);
box(.3, 2.2, .06, M.wood, .15, 1.1, .27, 0, shelf); box(.3, 2.2, .06, M.wood, .15, 1.1, -.27, 0, shelf);
[0.12, .82, 1.52, 2.18].forEach(y => box(.3, .05, .6, M.wood, .15, y, 0, 0, shelf));
box(.02, 2.14, .6, M.woodD, 0, 1.1, 0, 0, shelf);
addCol(-5, -4.1, -2.35, -.85);
const BOOK_DECO = [['g',0xa7bfa0],['y',0xe8c97a],['r',0xd98a7a],['b',0x8fa8c9],['n',0xb98d5f],['t',0x9cc0b4],['c',0xf3ead9]];
const bookMeshes = [];
BOOK_DECO.forEach(([k, c], i) => {
  const h = .3 + ((i * 37) % 3) * .02;
  const b = box(.2, h, .05, mat(c), .16, .845 + h / 2, -.21 + i * .056, 0, shelf);
  b.userData.bookColor = k; bookMeshes.push(b);
});
cyl(.07, .09, .12, M.terra, .15, 1.62, .08, 12, shelf);
// 书架摆件：小地球仪
const globe = new THREE.Group(); globe.position.set(.12, 1.72, -.15); shelf.add(globe);
cyl(.008, .008, .1, M.metal, 0, .05, 0, 6, globe);
cyl(.04, .05, .012, M.metal, 0, .11, 0, 16, globe);
const globeBall = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), mat(0x8fa8c9, { roughness: .6 }));
globeBall.position.y = .2; globeBall.castShadow = true; globe.add(globeBall);
const globeMer = new THREE.Mesh(new THREE.TorusGeometry(.071, .003, 6, 24), M.metal);
globeMer.position.y = .2; globeMer.rotation.x = Math.PI / 2.5; globe.add(globeMer);
// 书架摆件：小相框
const miniFrameTex = textTex((g, w, h) => {
  g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#8a7a5a'; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
  g.strokeStyle = '#a7bfa0'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(40, 150); g.lineTo(70, 90); g.lineTo(110, 130); g.lineTo(150, 70); g.lineTo(200, 150); g.stroke();
  g.fillStyle = '#e8c97a'; g.beginPath(); g.arc(170, 60, 14, 0, Math.PI * 2); g.fill();
}, 256, 200);
const miniFrame = new THREE.Mesh(new THREE.BoxGeometry(.12, .1, .03), new THREE.MeshStandardMaterial({ map: miniFrameTex, roughness: .85 }));
miniFrame.position.set(.14, 1.0, .18); miniFrame.rotation.y = .2; shelf.add(miniFrame);

// 沙发（南墙）
const sofa = new THREE.Group(); sofa.position.set(-1.2, 0, 3.25); room.add(sofa);
box(1.9, .42, .8, M.terra, 0, .28, 0, 0, sofa);
box(1.9, .6, .22, M.terra, 0, .72, .3, 0, sofa);
box(.22, .62, .8, M.terra, -.84, .42, 0, 0, sofa); box(.22, .62, .8, M.terra, .84, .42, 0, 0, sofa);
box(.5, .14, .5, M.butter, -.45, .55, .05, .12, sofa);
addCol(-2.15, -.25, 2.8, 3.62);

// 靠在沙发旁墙边的吉他
const guitar = new THREE.Group(); guitar.position.set(-2.35, .6, 3.05); guitar.rotation.y = .4; room.add(guitar);
const gBody = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), mat(0x9c6b3f, { roughness: .7 }));
gBody.scale.set(.9, 1, .35); gBody.castShadow = true; guitar.add(gBody);
const gHole = new THREE.Mesh(new THREE.CircleGeometry(.05, 16), mat(0x3a2a1a));
gHole.position.z = .06; guitar.add(gHole);
const gNeck = box(.04, .55, .05, mat(0x7a5230), 0, .36, 0, 0, guitar);
const gHead = box(.07, .06, .06, mat(0x7a5230), 0, .68, 0, 0, guitar);
for (let i = 0; i < 3; i++){
  const str = new THREE.Mesh(new THREE.BoxGeometry(.0015, .5, .0015), M.metal);
  str.position.set(-.012 + i * .012, .32, .03); guitar.add(str);
}
// 地板上的拖鞋
[[-1.5, 3.45], [-1.62, 3.32]].forEach(([x, z], i) => {
  const sl = new THREE.Group(); sl.position.set(x, .03, z); sl.rotation.y = i ? .3 : -.1; room.add(sl);
  box(.22, .04, .1, mat(0x8fa8c9), 0, .02, 0, 0, sl);
  box(.1, .08, .07, mat(0xb8c9dd), 0, .07, -.01, 0, sl);
});
// 彩蛋：沙发缝里的硬币
const coin = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .006, 16), mat(0xe8c97a, { metalness: .6, roughness: .3 }));
coin.position.set(-.6, .51, 3.18); coin.rotation.z = .4; coin.castShadow = true; room.add(coin);
// 彩蛋：地毯角露出的纸条
const rugNote = new THREE.Mesh(new THREE.PlaneGeometry(.14, .1), new THREE.MeshStandardMaterial({ color: 0xfdfaf0, roughness: .9 }));
rugNote.position.set(1.5, .014, .9); rugNote.rotation.x = -Math.PI / 2; rugNote.rotation.z = .5; rugNote.castShadow = true; room.add(rugNote);

// 猫（沙发上的彩蛋）
const cat = new THREE.Group(); cat.position.set(-1.55, .5, 3.18); cat.rotation.y = -2.2; room.add(cat);
const catBody = new THREE.Mesh(new THREE.SphereGeometry(.15, 14, 12), M.cat);
catBody.scale.set(1.5, .8, 1); catBody.position.y = .1; catBody.castShadow = true; cat.add(catBody);
const catHead = new THREE.Mesh(new THREE.SphereGeometry(.095, 14, 12), M.cat);
catHead.position.set(.2, .2, 0); catHead.castShadow = true; cat.add(catHead);
[[-.05], [.05]].forEach(([z]) => {
  const ear = new THREE.Mesh(new THREE.ConeGeometry(.032, .06, 4), M.cat);
  ear.position.set(.2, .29, z); cat.add(ear);
  const earIn = new THREE.Mesh(new THREE.ConeGeometry(.018, .04, 4), M.pink);
  earIn.position.set(.205, .285, z); cat.add(earIn);
});
[[-.06], [.06]].forEach(([z]) => { const eye = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 6), M.ink); eye.position.set(.28, .21, z); cat.add(eye); });
const catTailPivot = new THREE.Group(); catTailPivot.position.set(-.22, .12, 0); cat.add(catTailPivot);
const tailCurve = new THREE.QuadraticBezierCurve3(
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(-.12, .12, .06), new THREE.Vector3(-.16, .26, -.06));
const catTail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, .02, 6), M.cat);
catTail.castShadow = true; catTailPivot.add(catTail);

// 油画（南墙上方，书架线索）
const paintTex = textTex((g, w, h) => {
  g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h);
  const cs = [['#a7bfa0', '晨'], ['#e8c97a', '午'], ['#d98a7a', '暮']];
  cs.forEach(([c, t], i) => { g.fillStyle = c; g.fillRect(28 + i * 68, 34, 56, 120);
    g.fillStyle = '#4a4438'; g.font = '20px sans-serif'; g.textAlign = 'center'; g.fillText(t, 56 + i * 68, 186); });
  g.fillStyle = '#4a4438'; g.font = '24px serif'; g.textAlign = 'center'; g.fillText('把一天排成一列', w / 2, 226);
}, 256, 256);
const painting = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.0), new THREE.MeshStandardMaterial({ map: paintTex, roughness: .9 }));
painting.position.set(-1.2, 2.1, ROOM.d / 2 - .06); painting.rotation.y = Math.PI; room.add(painting);
box(1.15, 1.1, .05, M.wood, -1.2, 2.1, ROOM.d / 2 - .1, 0, room);

// 照片墙（南墙右侧）
const ARTS = [
  { cap: '一颗星星，和一束把它照得亮亮的光', draw(g, w, h){
      g.strokeStyle = '#e8c97a'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      const cx = w/2, cy = h*.42;
      for (let i = 0; i < 10; i++){
        const a = i / 10 * Math.PI * 2 - Math.PI/2;
        const r = i % 2 === 0 ? 70 : 30;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath(); g.stroke();
      g.strokeStyle = '#e8c97a';
      for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * 82, cy + Math.sin(a) * 82);
        g.lineTo(cx + Math.cos(a) * 100, cy + Math.sin(a) * 100); g.stroke(); }
    } },
  { cap: '一栋小房子，烟囱里冒着做饭的香气', draw(g, w, h){
      g.strokeStyle = '#8fa8c9'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeRect(w*.3, h*.5, w*.4, h*.3);
      g.beginPath(); g.moveTo(w*.24, h*.5); g.lineTo(w/2, h*.26); g.lineTo(w*.76, h*.5); g.stroke();
      g.strokeStyle = '#948a76';
      g.strokeRect(w*.44, h*.6, w*.12, h*.2);
      g.beginPath(); g.moveTo(w*.62, h*.34); g.lineTo(w*.62, h*.24); g.stroke();
    } },
  { cap: '太阳、云，和一起看天的两个小人', draw(g, w, h){
      g.strokeStyle = '#e8c97a'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.arc(w*.72, h*.3, 26, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#9cc0b4';
      g.beginPath(); g.arc(w*.3, h*.26, 16, 0, Math.PI); g.arc(w*.42, h*.26, 16, 0, Math.PI); g.stroke();
      g.strokeStyle = '#4a4438'; g.lineWidth = 6;
      [w*.36, w*.48].forEach(x => {
        g.beginPath(); g.arc(x, h*.6, 9, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(x, h*.63); g.lineTo(x, h*.78); g.stroke();
        g.beginPath(); g.moveTo(x - 8, h*.7); g.lineTo(x + 8, h*.7); g.stroke();
      });
    } },
];
const photoFrames = [];
ARTS.forEach((art, i) => {
  let texture;
  if (CONFIG.photos[i]){
    const img = new Image(); img.src = CONFIG.photos[i];
    texture = new THREE.Texture(img); texture.colorSpace = THREE.SRGBColorSpace;
    img.onload = () => texture.needsUpdate = true;
  } else {
    texture = textTex((g, w, h) => {
      g.fillStyle = '#f9f4e8'; g.fillRect(0, 0, w, h);
      art.draw(g, w, h);
      g.strokeStyle = 'rgba(148,138,118,.35)'; g.lineWidth = 2; g.strokeRect(10, 10, w - 20, h - 20);
    }, 256, 200);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(.42, .34, .04), new THREE.MeshStandardMaterial({ map: texture, roughness: .85 }));
  frame.position.set(.55 + i * .52, 2.0, ROOM.d / 2 - .06); frame.rotation.y = Math.PI; room.add(frame);
  box(.5, .42, .05, M.wood, .55 + i * .52, 2.0, ROOM.d / 2 - .1, 0, room);
  photoFrames.push({ mesh: frame, idx: i, src: CONFIG.photos[i] || null });
});

// 柜子 + 抽屉（东墙）
const cab = new THREE.Group(); cab.position.set(4.42, 0, -1.2); room.add(cab);
box(.55, .95, .95, M.wood, 0, .5, 0, 0, cab);
const drawer = box(.5, .3, .72, M.woodD, -.03, .62, 0, 0, cab);
cyl(.03, .03, .05, M.butter, -.3, .62, 0, 10, cab).rotation.z = Math.PI / 2;
box(.5, .06, .72, M.cream, -.03, .95, 0, 0, cab);
addCol(3.95, 4.85, -1.75, -.65);

// 书桌（西北角）+ 台灯 + 纸条
const desk = new THREE.Group(); desk.position.set(-3.35, 0, -3.0); room.add(desk);
box(1.5, .07, .72, M.wood, 0, .76, 0, 0, desk);
[[-.68, -.3], [.68, -.3], [-.68, .3], [.68, .3]].forEach(([x, z]) => box(.06, .76, .06, M.woodD, x, .38, z, 0, desk));
addCol(-4.2, -2.5, -3.42, -2.58);
const lamp = new THREE.Group(); lamp.position.set(-.5, .795, 0); desk.add(lamp);
cyl(.1, .14, .03, M.ink, 0, .015, 0, 16, lamp);
cyl(.022, .022, .34, M.ink, 0, .18, 0, 8, lamp);
const shade = cyl(.09, .15, .17, M.butter, 0, .4, 0, 16, lamp);
shade.material = mat(0xe8c97a, { emissive: 0xe8c97a, emissiveIntensity: .35 });
const lampBulb = glowSprite(0xffd9a0, .4, .65); lampBulb.position.y = .38; lamp.add(lampBulb);
const lampLight = new THREE.PointLight(0xffd9a0, 4, 4.5, 1.8); lampLight.position.set(-3.85, 1.35, -3.0); scene.add(lampLight);
const noteTex = textTex((g, w, h) => {
  g.fillStyle = '#fdfaf0'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#8a8070'; g.font = '18px serif'; g.fillText('今晚 8 点，', 30, 90);
  g.fillText('记得赴约。', 30, 130); g.fillText('—— 你的老友', 30, 200);
}, 220, 220);
const note = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22), new THREE.MeshStandardMaterial({ map: noteTex, roughness: .9 }));
note.position.set(.32, .798, .12); note.rotation.x = -Math.PI / 2; note.rotation.z = .3; desk.add(note);

// 马克杯（带热气粒子）
const mug = new THREE.Group(); mug.position.set(-.15, .795, .18); desk.add(mug);
cyl(.055, .05, .1, M.sage, 0, .05, 0, 16, mug);
cyl(.052, .052, .015, mat(0xf3ead9), 0, .105, 0, 16, mug);
const mugHandle = new THREE.Mesh(new THREE.TorusGeometry(.032, .01, 8, 16, Math.PI), M.sage);
mugHandle.position.set(.06, .055, 0); mugHandle.rotation.z = Math.PI / 2; mug.add(mugHandle);
const steam = [];
for (let i = 0; i < 3; i++){
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  s.position.set((Math.random() - .5) * .02, .12 + i * .02, 0); s.scale.setScalar(.08); mug.add(s);
  steam.push({ s, ph: i * 1.7 });
}
scene.userData.steam = steam;

// 翻开的笔记本 + 散乱的笔
const notebook = new THREE.Group(); notebook.position.set(.1, .796, -.12); notebook.rotation.z = -.15; desk.add(notebook);
box(.28, .006, .2, M.cream, 0, .003, 0, 0, notebook);
const nbPage = box(.26, .004, .18, mat(0xfdfaf0), 0, .008, 0, 0, notebook);
const nbLineTex = textTex((g, w, h) => { g.fillStyle = '#fdfaf0'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(140,130,110,.35)'; g.lineWidth = 1;
  for (let y = 24; y < h; y += 18){ g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
  g.fillStyle = '#6b8f6b'; g.fillRect(0, 0, w, 8); }, 256, 180);
nbPage.material = new THREE.MeshStandardMaterial({ map: nbLineTex, roughness: .9 });
[[-.18, .82, .06, .5], [.16, .82, -.06, -.3]].forEach(([x, y, z, rz]) => {
  const pen = cyl(.006, .006, .12, mat(0x4a4438), x, y, z, 8, desk);
  pen.rotation.z = rz; pen.rotation.x = Math.PI / 2;
});

// 相框（书架顶，密码线索）
const frameTex = textTex((g, w, h) => {
  g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d98a7a'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.fillText('5.20', w / 2, 130);
  g.fillStyle = '#948a76'; g.font = '20px serif'; g.fillText('认识你的日子', w / 2, 190);
}, 256, 200);
const clueFrame = new THREE.Mesh(new THREE.BoxGeometry(.3, .24, .04), new THREE.MeshStandardMaterial({ map: frameTex, roughness: .85 }));
clueFrame.position.set(-4.62, 2.34, -1.6); clueFrame.rotation.y = Math.PI / 2; room.add(clueFrame);

// 唱片机（东南角矮凳）
const stool = new THREE.Group(); stool.position.set(2.9, 0, 2.6); room.add(stool);
box(.85, .5, .62, M.wood, 0, .27, 0, 0, stool);
addCol(2.4, 3.4, 2.22, 2.98);
const player = new THREE.Group(); player.position.set(0, .52, 0); stool.add(player);
box(.6, .1, .44, M.ink, 0, .05, 0, 0, player);
const platter = cyl(.16, .16, .02, M.dark, -.08, .11, 0, 24, player);
const vinylDisc = cyl(.145, .145, .005, mat(0x211d19, { roughness: .4 }), -.08, .125, 0, 24, player);
cyl(.03, .03, .006, M.terra, -.08, .13, 0, 12, player);
box(.02, .02, .22, M.metal, .16, .14, .08, .5, player);

// 挂钟（东墙）
const clockG = new THREE.Group(); clockG.position.set(4.9, 2.25, 1.2); clockG.rotation.y = -Math.PI / 2; room.add(clockG);
cyl(.3, .3, .05, M.wood, 0, 0, 0, 32, clockG).rotation.x = Math.PI / 2;
const clockFace = cyl(.26, .26, .052, M.white, 0, 0, 0, 32, clockG); clockFace.rotation.x = Math.PI / 2;
const handHPivot = new THREE.Group(); handHPivot.position.set(0, 0, .04); clockG.add(handHPivot);
const handMPivot = new THREE.Group(); handMPivot.position.set(0, 0, .045); clockG.add(handMPivot);
box(.16, .026, .012, M.ink, .07, 0, 0, 0, handHPivot);
box(.22, .018, .012, M.terra, .09, 0, 0, 0, handMPivot);
cyl(.018, .018, .014, M.ink, 0, 0, .05, 10, clockG).rotation.x = Math.PI / 2;
function setClock(h, m){ handHPivot.rotation.z = -(h % 12) / 12 * Math.PI * 2; handMPivot.rotation.z = -m / 60 * Math.PI * 2; }
setClock(3, 0);

// 绿植（东北角）
const plant = new THREE.Group(); plant.position.set(4.3, 0, -3.1); room.add(plant);
cyl(.17, .13, .26, M.terra, 0, .13, 0, 16, plant);
[[-.05,.42,.02,.5],[.06,.5,-.03,.62],[0,.56,.05,.44],[.09,.4,.04,.36],[-.08,.46,-.05,.4]].forEach(([x, y, z, s]) => {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.09 * s, 10, 10), M.sageD);
  leaf.position.set(x, y, z); leaf.scale.set(.7, 1.4, .7); leaf.castShadow = true; plant.add(leaf);
});
addCol(3.95, 4.65, -3.45, -2.75);

// 吊灯
const ceilLamp = new THREE.Group(); ceilLamp.position.set(0, ROOM.h, .4); room.add(ceilLamp);
cyl(.008, .008, .35, M.ink, 0, -.17, 0, 6, ceilLamp);
cyl(.09, .3, .22, M.butter, 0, -.45, 0, 20, ceilLamp);
const ceilBulb = glowSprite(0xffe2b0, .9, .55); ceilBulb.position.y = -.5; ceilLamp.add(ceilBulb);
const ceilLight = new THREE.SpotLight(0xffe2b0, 30, 14, 1.15, .55, 1.6);
ceilLight.position.set(0, 2.8, .4); ceilLight.target.position.set(0, 0, .4);
ceilLight.castShadow = true; ceilLight.shadow.mapSize.set(1024, 1024);
ceilLight.shadow.bias = -.0015; ceilLight.shadow.normalBias = .02;
scene.add(ceilLight, ceilLight.target);
const hemi = new THREE.HemisphereLight(0xfff4e0, 0xb09a7a, .8); scene.add(hemi);
const ambi = new THREE.AmbientLight(0xfff0dd, .25); scene.add(ambi);

// 尘埃
const dustGeo = new THREE.BufferGeometry();
const dustPos = [];
for (let i = 0; i < 110; i++) dustPos.push((Math.random() - .5) * 9, Math.random() * 2.8 + .3, (Math.random() - .5) * 6.5);
dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xfff5dc, size: .018, transparent: true, opacity: .55, depthWrite: false }));
dust.raycast = () => {}; scene.add(dust);

/* ---------------- 灯串（解谜进度可视化） ---------------- */
const stringBulbs = [];
function makeStringLights(){
  const arcs = [
    { a: new THREE.Vector3(-4.6, 3.05, -3.35), c: new THREE.Vector3(0, 2.68, -3.5), b: new THREE.Vector3(4.6, 3.05, -3.35) },
    { a: new THREE.Vector3(-4.8, 3.05, -3.2), c: new THREE.Vector3(-4.9, 2.66, 0), b: new THREE.Vector3(-4.8, 3.05, 3.2) },
    { a: new THREE.Vector3(4.8, 3.05, -3.2), c: new THREE.Vector3(4.9, 2.66, 0), b: new THREE.Vector3(4.8, 3.05, 3.2) },
  ];
  arcs.forEach(arc => {
    const curve = new THREE.QuadraticBezierCurve3(arc.a, arc.c, arc.b);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .007, 5), M.dark);
    room.add(wire);
    for (let i = 1; i <= 9; i++){
      const p = curve.getPoint(i / 10);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.034, 10, 10), new THREE.MeshBasicMaterial({ color: 0x6b6152 }));
      bulb.position.copy(p).add(new THREE.Vector3(0, -.05, 0)); bulb.raycast = () => {};
      const glow = glowSprite(0xffd9a0, .17, 0);
      room.add(bulb, glow);
      stringBulbs.push({ bulb, glow, on: false, ph: Math.random() * 6 });
    }
  });
}
makeStringLights();
function lightBulbs(n){
  const target = Math.round(n / 6 * stringBulbs.length);
  let lit = stringBulbs.filter(b => b.on).length;
  for (const b of stringBulbs){
    if (lit >= target) break;
    if (!b.on){ b.on = true; b.bulb.material.color.set(0xffdf9e); lit++; }
  }
  if (n > 0) AudioBox.sSparkle();
}

/* ---------------- 机关状态 ---------------- */
const mechs = { drawer:{solved:false}, books:{solved:false}, music:{solved:false}, window:{solved:false}, lamp:{solved:false}, clock:{solved:false} };
const MECH_KEYS = Object.keys(mechs);
let collected = 0;
let finaleOn = false, giftOpened = false, blown = false, started = false;

/* ---------------- 交互注册 ---------------- */
const interacts = [];
function addInteract(entry){
  entry.dist = entry.dist || 3.0;
  interacts.push(entry);
  (Array.isArray(entry.root) ? entry.root : [entry.root]).forEach(o => o.traverse(c => c.userData.iid = entry.id));
}
const sparkles = [];
let sparkleIdx = 0;
function addSparkle(pos, id){
  const s = new THREE.Mesh(new THREE.OctahedronGeometry(.05), new THREE.MeshBasicMaterial({ color: 0xf2b64a }));
  s.position.copy(pos); s.mid = id || ('sp' + (sparkleIdx++)); scene.add(s);
  sparkles.push({ m: s, y: pos.y, ph: Math.random() * 6 });
}
function killSparkle(id){ const s = sparkles.find(x => x.mid === id); if (s){ scene.remove(s.m); sparkles.splice(sparkles.indexOf(s), 1); } }

const HEART_POS = {
  drawer: new THREE.Vector3(4.2, .95, -1.2), books: new THREE.Vector3(-4.35, 1.7, -1.6),
  lamp: new THREE.Vector3(-1.4, 2.95, 1.7), music: new THREE.Vector3(2.9, 1.5, 2.6),
  window: new THREE.Vector3(1.6, 1.75, -3.35), clock: new THREE.Vector3(4.6, 2.25, 1.2),
};
Object.entries(HEART_POS).forEach(([k, p]) => addSparkle(p.clone().add(new THREE.Vector3(0, .35, 0)), k));

/* ---------------- 各机关 ---------------- */
// 1) 抽屉·密码
const KEYPAD_KEYS = ['1','2','3','4','5','6','7','8','9','C','0','OK'];
function openDrawerPuzzle(){
  if (mechs.drawer.solved){ toast('抽屉已经打开过啦'); return; }
  showModal(`
    <div class="mk">D · DRAWER</div><div class="mt">上锁的抽屉</div>
    <div class="mb">四位数字，像是属于我们的某一天</div>
    <div id="keypad"><div id="kpDisp"></div><div id="kpGrid">
      ${KEYPAD_KEYS.map(k => `<button data-k="${k}" class="${k === 'OK' ? 'ok' : k === 'C' ? 'clr' : ''}">${k}</button>`).join('')}
    </div></div>`);
  let code = '';
  const disp = $('kpDisp');
  const refresh = () => disp.textContent = code.padEnd(4, '·');
  refresh();
  $('kpGrid').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.k; AudioBox.sClick();
    if (k === 'C') code = '';
    else if (k === 'OK'){
      if (code === CONFIG.drawerCode){
        showModal(`<div class="mk">D · DRAWER</div><div class="mt">小机关解开了。</div>
          <div class="mb">咔哒——抽屉滑开，<br/>里面躺着一段圆圆的小回忆。</div>
          <div style="text-align:center"><button class="mbtn" id="mOk">收好回忆 ✦</button></div>`);
        $('mOk').onclick = () => closeModal();
        modalCloseCb = () => solveMech('drawer', HEART_POS.drawer);
      } else { code = ''; refresh(); shakeCard(); }
      return;
    }
    else if (code.length < 4) code += k;
    refresh();
  };
}
// 2) 书架·颜色顺序
let bookSeq = [], bookBusy = false, bookShake = null;
function bookClick(mesh){
  if (mechs.books.solved){ toast('书已经排好啦'); return; }
  if (bookBusy) return;
  AudioBox.sClick();
  const target = ['g', 'y', 'r'];
  const idx = bookSeq.length;
  if (mesh.userData.bookColor !== target[idx]){
    bookBusy = true;
    bookSeq = [];
    // 复位所有已抽出的书
    bookMeshes.forEach(b => { b.position.x = .16; });
    // 摇晃动画（单一 interval，避免叠加）
    if (bookShake){ clearInterval(bookShake); bookShake = null; }
    shelf.rotation.z = 0; let t = 0;
    bookShake = setInterval(() => {
      t += .06;
      shelf.rotation.z = Math.sin(t * 22) * .02 * (1 - t);
      if (t >= 1){ clearInterval(bookShake); bookShake = null; shelf.rotation.z = 0; }
    }, 30);
    toast('书页哗啦……顺序不对，重新来', 1800);
    AudioBox.sError();
    setTimeout(() => { bookBusy = false; }, 900);
    return;
  }
  // 点对：抽出书本，短暂锁防连点
  bookBusy = true;
  bookSeq.push(mesh.userData.bookColor);
  mesh.position.x += .07;
  if (bookSeq.length === 3) solveMech('books', HEART_POS.books);
  setTimeout(() => { bookBusy = false; }, 250);
}
// 3) 唱片机
let vinylPlaying = false;
function useRecord(){
  if (mechs.music.solved){ toast('这首歌已经放过了'); return; }
  if (vinylPlaying) return;
  vinylPlaying = true;
  AudioBox.startAmbient(); AudioBox.setMuted(false); setMusicUI();
  toast('唱针落下——音乐响起来了……', 2000);
  setTimeout(() => { if (!mechs.music.solved) solveMech('music', HEART_POS.music); vinylPlaying = false; }, 2600);
}
// 4) 窗户
let balloon = null, balloonT = 0, balloonActive = false, windowOpen = false;
function useWindow(){
  if (mechs.window.solved){ toast('窗外已经空啦'); return; }
  if (windowOpen) return;
  windowOpen = true;
  AudioBox.sClick();
  tween(1.2, k => { curtL.position.x = .62 - .34 * k; curtR.position.x = 2.58 + .34 * k; });
  toast('窗帘拉开了……外面好像有什么', 2200);
  setTimeout(() => { if (!balloon) makeBalloon(); balloonActive = true; }, 900);
}
function makeBalloon(){
  balloon = new THREE.Group();
  const h = new THREE.Mesh(new THREE.OctahedronGeometry(.22, 0), mat(0xe2766d, { emissive: 0xe2766d, emissiveIntensity: .3 }));
  balloon.add(h);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .5), M.ink);
  str.position.y = -.32; balloon.add(str);
  balloon.position.set(1.2, 1.9, -4.4); scene.add(balloon);
  addInteract({ id: 'balloon', root: balloon, label: '窗外 · 飘着的小星', dist: 4.6, onUse: useBalloon, enabled: () => balloonActive });
}
function useBalloon(){
  if (!balloon || mechs.window.solved) return;
  balloonActive = false;
  const pos = balloon.position.clone();
  tween(.6, k => { balloon.position.y += .01 * (1 - k); balloon.scale.setScalar(1 - k * .95); }, () => { scene.remove(balloon); balloon = null; });
  solveMech('window', pos);
}
// 5) 台灯·星空心意
let lampOn = true, ceilHeart = null;
function useLamp(){
  if (mechs.lamp.solved){ lampOn = true; applyLamp(); toast('灯亮着刚刚好'); return; }
  lampOn = !lampOn; applyLamp(); AudioBox.sClick();
  if (!lampOn && !mechs.lamp.solved){
    toast('灯灭了……天花板上好像有东西在发光', 2600);
    if (!ceilHeart){
      ceilHeart = new THREE.Mesh(new THREE.OctahedronGeometry(.32, 0), mat(0xffd98a, { emissive: 0xffd98a, emissiveIntensity: .8 }));
      ceilHeart.position.copy(HEART_POS.lamp); scene.add(ceilHeart);
      const hl = new THREE.PointLight(0xffd98a, 3, 3.5, 1.6); hl.position.copy(HEART_POS.lamp).setY(2.7); scene.add(hl);
      const g = glowSprite(0xffd98a, 1.1, .8); g.position.copy(HEART_POS.lamp); scene.add(g);
      ceilHeart.userData.light = hl; ceilHeart.userData.glow = g;
      addInteract({ id: 'lampHeart', root: ceilHeart, label: '✦ 发光的小东西', dist: 3.4, onUse: collectLampHeart });
    }
  }
}
function applyLamp(){
  shade.material.emissiveIntensity = lampOn ? .35 : .02;
  lampBulb.material.opacity = lampOn ? .65 : .05;
  lampLight.intensity = lampOn ? 4 : 0;
}
function collectLampHeart(){
  if (!ceilHeart) return;
  scene.remove(ceilHeart.userData.light); scene.remove(ceilHeart.userData.glow); scene.remove(ceilHeart); ceilHeart = null;
  lampOn = true; applyLamp();
  solveMech('lamp', HEART_POS.lamp);
}
// 6) 挂钟
let dialHour = 3;
function openClockPuzzle(){
  if (mechs.clock.solved){ toast('挂钟停在此刻'); return; }
  showModal(`
    <div class="mk">C · CLOCK</div><div class="mt">走错的挂钟</div>
    <div class="mb">时间不对哦。把它拨到属于我们的时刻。</div>
    <div id="clockDial"><button id="hDown">−</button><div class="time" id="dialTime"></div><button id="hUp">＋</button></div>
    <div style="text-align:center"><button class="mbtn" id="dialOk">拨 准</button></div>`);
  const refresh = () => $('dialTime').textContent = String(dialHour).padStart(2, '0') + ':00';
  refresh();
  $('hDown').onclick = () => { AudioBox.sClick(); dialHour = (dialHour + 23) % 24; refresh(); };
  $('hUp').onclick = () => { AudioBox.sClick(); dialHour = (dialHour + 1) % 24; refresh(); };
  $('dialOk').onclick = () => {
    if (dialHour === CONFIG.clockHour){
      showModal(`<div class="mk">C · CLOCK</div><div class="mt">小机关解开了。</div>
        <div class="mb">当——当——挂钟轻轻唱了起来，<br/>一段回忆从钟摆后滚了出来。</div>
        <div style="text-align:center"><button class="mbtn" id="mOk">收好回忆 ✦</button></div>`);
      $('mOk').onclick = () => closeModal();
      modalCloseCb = () => solveMech('clock', HEART_POS.clock);
    } else shakeCard();
  };
}
function openNote(){ showModal(`<div class="mk">NOTE</div><div class="mt">桌上的小纸条</div>
  <div class="mb">"今晚 ${CONFIG.clockHour} 点，记得赴约。<br/>—— 你的老友"</div>`); }
function openClueFrame(){ showModal(`<div class="mk">FRAME</div><div class="mt">相框里的数字</div>
  <div class="mb">"5.20 —— 认识你的日子。"<br/>（像是某个密码的一半……另外一半呢？）</div>`); }
function openPainting(){ showModal(`<div class="mk">PAINTING</div><div class="mt">把一天排成一列</div>
  <div class="mb">晨光嫩绿，午后金黄，晚霞绯红。<br/>书架上的书，也该按这个顺序站好。</div>`); }
function openPhoto(idx){
  const p = photoFrames[idx];
  if (p.src){
    showModal(`<div class="mk">MEMORY</div><div class="mt">一张照片</div>
      <div style="text-align:center"><img src="${p.src}" style="max-width:100%;border-radius:12px;border:1px solid var(--line)" alt="照片"></div>`, { noteStyle: true });
  } else {
    showModal(`<div class="mk">MEMORY</div><div class="mt">相框里的小画</div>
      <div class="mb">${ARTS[idx].cap}<br/><span style="font-size:11px">（把你们的照片放进来：见文件顶部 CONFIG.photos）</span></div>`);
  }
}
function useGift(){
  if (blown) return;
  const n = MECH_KEYS.filter(k => mechs[k].solved).length;
  if (n < 6){
    toast(n === 0 ? '礼物盒在等你集齐 6 段回忆' : `还差 ${6 - n} 段回忆，礼物盒才会醒来`, 2200);
    return;
  }
  if (!finaleOn){ toast('稍等一下，小屋还在为你布置惊喜……', 2000); return; }
  if (giftOpened) return;
  openGift();
}
function openGift(){
  if (giftOpened) return;
  giftOpened = true;
  AudioBox.stopAmbient();
  AudioBox.startBirthday();
  setMusicUI();
  AudioBox.sChime();
  // 开盖过程提示
  $('openHint').classList.add('show');
  // 盖子绕后侧铰链向后翻开
  tween(1.1, k => {
    const a = -1.55 * k;
    giftLid.rotation.x = a;
    giftLid.position.y = .55 + Math.sin(Math.abs(a)) * .12;
  }, () => {
    // 蛋糕升起
    tween(1.3, k => { const s = 1 - Math.pow(1 - k, 3); cake.scale.setScalar(Math.max(.001, s)); }, () => {
      flame.visible = true; candleLight.intensity = 10; flameOn = true;
      $('openHint').classList.remove('show');
      showWishModal();
    });
  });
}
function showWishModal(){
  uiOpen = true;
  $('wishModal').classList.add('show');
  $('wishPauseBtn').onclick = () => {
    if (AudioBox.muted){ AudioBox.setMuted(false); $('wishPauseBtn').textContent = '暂停'; }
    else { AudioBox.setMuted(true); $('wishPauseBtn').textContent = '播放'; }
  };
  $('wishBtn').onclick = () => {
    $('wishModal').classList.remove('show');
    uiOpen = false;
    $('finaleBanner').innerHTML = micOK
      ? '🕯 闭上眼睛许个愿，然后<b>对着麦克风轻轻吹一口气</b>（也可以点击蜡烛）'
      : '🕯 点击<b>蜡烛</b> · 闭上眼睛许个愿';
    $('finaleBanner').classList.add('show');
    if (!isTouch) canvas.requestPointerLock?.();
  };
}
function petCat(){
  AudioBox.sMeow();
  setTimeout(() => AudioBox.sPurr(), 500);
  const lines = ['猫：喵呜～（蹭了蹭你的手）', '猫：呼噜呼噜……（眯起了眼睛）', '猫：喵！（尾巴绕住了你的手腕）', '猫：它翻了个身，把肚皮交给了你'];
  toast(lines[Math.floor(Math.random() * lines.length)], 2200);
  catHead.scale.setScalar(1.25);
  tween(.5, k => catHead.scale.setScalar(1.25 - .25 * k));
  for (let i = 0; i < 3; i++){
    const s = glowSprite(0xffd98a, .18, .8);
    s.position.copy(cat.position).add(new THREE.Vector3(.1 + i * .06, .45, -.1)); scene.add(s);
    tween(1.2 + i * .2, k => { s.position.y += .0035; s.material.opacity = .8 * (1 - k); }, () => scene.remove(s));
  }
}

/* ---------------- 解谜结算 → 便签 ---------------- */
function solveMech(id, heartPos){
  if (mechs[id].solved) return;
  mechs[id].solved = true;
  killSparkle(id);
  if (id === 'drawer') tween(.5, k => { drawer.position.x = -.03 - .2 * k; });
  if (id === 'clock') setClock(CONFIG.clockHour, 0);
  AudioBox.sUnlock(); AudioBox.sHeart();
  const names = { drawer:'抽屉', books:'书架', music:'唱片机', window:'窗帘', lamp:'台灯', clock:'挂钟' };
  toast(`小机关解开了 · 「${names[id]}」把回忆交给了你`);
  const idx = MECH_KEYS.filter(k => mechs[k].solved).length - 1;
  setTimeout(() => showNote(idx, heartPos), 900);
}
function showNote(idx, heartPos){
  showModal(`<div class="mk">回忆 ${idx + 1} / 6</div><div class="mt">一张小纸条</div>
    <div class="mb notetext">" ${CONFIG.notes[idx] || '认识你，是一件挺久挺久的事。'} "</div>
    <div style="text-align:center"><button class="mbtn" id="mKeep">收进口袋 ✦</button></div>`, { noteStyle: true });
  $('mKeep').onclick = () => closeModal();
  modalCloseCb = () => {
    flyHeart(heartPos.clone());
    lightBulbs(collected + 1);
    const n = MECH_KEYS.filter(k => mechs[k].solved).length;
    if (hintPillOn) showHint();
    if (n >= 6) setTimeout(startFinale, 2000);
    else setTimeout(() => toast(`${n}/6 —— 灯串又亮了一截 ✦`, 1800), 1100);
  };
}

/* ---------------- 终章 ---------------- */
const SKY_DAY = new THREE.Color(0xcfe7e2), SKY_DUSK = new THREE.Color(0xf2b078), SKY_NIGHT = new THREE.Color(0x1c2540);
function startFinale(){
  if (finaleOn) return;
  finaleOn = true;
  $('hoverLabel').classList.remove('show');
  $('hintPill').classList.remove('show');
  toast('回忆集齐了！小屋有话对你说……', 3000);
  if (!isTouch) document.exitPointerLock?.();
  tween(1.5, k => {
    SHARED_SKY.lerpColors(SKY_DAY, SKY_DUSK, k);
    hemi.intensity = .8 - .25 * k;
    sun.material.color.lerpColors(new THREE.Color(0xffd98a), new THREE.Color(0xff8a52), k);
    sun.position.y = 3.4 - 1.5 * k;
    hill1.material.color.lerpColors(new THREE.Color(0x86a377), new THREE.Color(0x7d7a5e), k);
    hill2.material.color.lerpColors(new THREE.Color(0x6f8c62), new THREE.Color(0x5f6350), k);
  }, () => {
    tween(1.6, k => {
      SHARED_SKY.lerpColors(SKY_DUSK, SKY_NIGHT, k);
      hemi.intensity = .55 - .3 * k; ambi.intensity = .25 - .17 * k;
      ceilLight.intensity = 30 - 26 * k;
      hill1.material.color.lerpColors(new THREE.Color(0x7d7a5e), new THREE.Color(0x2e3a30), k);
      hill2.material.color.lerpColors(new THREE.Color(0x5f6350), new THREE.Color(0x25302a), k);
    }, () => {
      sun.visible = false; moon.visible = true; stars.visible = true;
      $('hdrTitle').textContent = '月光小屋';
      document.querySelector('#hdrLeft .st').textContent = 'THE ROOM LIGHTS UP FOR YOU';
      stringBulbs.forEach(b => { b.on = true; b.bulb.material.color.set(0xffdf9e); });
      AudioBox.sSparkle();
      // 夜晚降临，提示玩家手动打开礼盒
      setTimeout(() => {
        $('finaleBanner').innerHTML = '✨ 夜色落下 · <b>走过去，点击桌上的礼物盒</b>';
        $('finaleBanner').classList.add('show');
        toast('礼物盒在等你——走过去打开它吧', 3500);
      }, 800);
    });
  });
}
let flameOn = false;
function blowCandle(){
  if (!flameOn) return;
  flameOn = false; blown = true;
  AudioBox.sBlow();
  $('finaleBanner').classList.remove('show');
  tween(.35, k => { flame.scale.setScalar(1 - k); candleLight.intensity = 10 * (1 - k); }, () => {
    flame.visible = false;
    spawnSmoke(candleLight.position.clone());
    spawnConfetti();
    AudioBox.goBright();
    setTimeout(showLetter, 1400);
  });
}
function spawnSmoke(p){
  for (let i = 0; i < 7; i++){
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0x777066, transparent: true, opacity: .5, depthWrite: false }));
    s.raycast = () => {};
    s.position.set(p.x + (Math.random() - .5) * .08, p.y + i * .06, p.z + (Math.random() - .5) * .08);
    s.scale.setScalar(.1); scene.add(s);
    tween(1.6 + i * .25, k => { s.position.y += .0022; s.scale.setScalar(.1 + k * .3); s.material.opacity = .5 * (1 - k); }, () => scene.remove(s));
  }
}
const confetti = [];
function spawnConfetti(){
  const cols = [0xd97a6a, 0xe8c97a, 0xa7bfa0, 0xf2c4cc, 0x8fa8c9, 0xf3ead9];
  for (let i = 0; i < 150; i++){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.05, .085), new THREE.MeshBasicMaterial({ color: cols[i % 6], side: THREE.DoubleSide, transparent: true }));
    m.position.set((Math.random() - .5) * 5.5, 3.1 + Math.random() * 1.6, .4 + (Math.random() - .5) * 4.5);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    scene.add(m);
    confetti.push({ m, vy: .9 + Math.random() * 1.3, vr: (Math.random() - .5) * 5, sway: Math.random() * 6, life: 6 + Math.random() * 2 });
  }
}
function showLetter(){
  $('letterBody').textContent = CONFIG.letter.join('\n');
  $('letterSign').textContent = CONFIG.sign;
  $('letter').classList.add('show');
}
$('letterStay').onclick = () => { $('letter').classList.remove('show'); if (!isTouch) canvas.requestPointerLock?.(); };
$('letterAgain').onclick = () => location.reload();

/* ---------------- 补间 ---------------- */
const anims = [];
function tween(dur, step, done){ anims.push({ t: 0, dur, step, done }); }

/* ---------------- 麦克风吹蜡烛 ---------------- */
let micOK = false, micDenied = false, micAn = null, micData = null, blowFrames = 0;
async function initMic(){
  if (micOK || micDenied || !navigator.mediaDevices?.getUserMedia) { micDenied = true; return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    AudioBox.ensure();
    const src = AudioBox.ctx.createMediaStreamSource(stream);
    micAn = AudioBox.ctx.createAnalyser(); micAn.fftSize = 512; micAn.smoothingTimeConstant = .5;
    src.connect(micAn);
    micData = new Uint8Array(micAn.frequencyBinCount);
    micOK = true;
  } catch (e) { micDenied = true; }
}
function pollMicBlow(){
  if (!micOK || !flameOn) { blowFrames = 0; return; }
  micAn.getByteFrequencyData(micData);
  let s = 0; for (let i = 1; i < 26; i++) s += micData[i];
  const v = s / 25;
  if (v > 112){ if (++blowFrames > 12){ blowFrames = 0; blowCandle(); } }
  else blowFrames = Math.max(0, blowFrames - 2);
}

/* ---------------- 输入与控制 ---------------- */
const keys = {};
let lockFailed = false, yaw = Math.PI * .04, pitch = -.02;
addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'KeyE' && started && !uiOpen && !letterShown() && hoverEntry && hoverEntry.onUse) hoverEntry.onUse();
  if (e.code === 'Escape' && uiOpen && $('modalWrap').classList.contains('show')) closeModal();
});
addEventListener('keyup', e => keys[e.code] = false);

canvas.addEventListener('mousedown', e => {
  if (!started || uiOpen || letterShown()) return;
  if (document.pointerLockElement !== canvas && !isTouch && !lockFailed){ tryLock(); return; }
  if (hoverEntry && hoverEntry.onUse) hoverEntry.onUse();
});
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas){
    yaw -= e.movementX * .0024;
    pitch -= e.movementY * .0022;
  } else if (dragLook.on){
    yaw -= (e.clientX - dragLook.x) * .004;
    pitch -= (e.clientY - dragLook.y) * .004;
    dragLook.x = e.clientX; dragLook.y = e.clientY;
  }
  clampLook();
});
const dragLook = { on: false, x: 0, y: 0 };
canvas.addEventListener('mousedown', e => { if (document.pointerLockElement !== canvas && !isTouch){ dragLook.on = true; dragLook.x = e.clientX; dragLook.y = e.clientY; } });
addEventListener('mouseup', () => dragLook.on = false);
function clampLook(){ pitch = Math.max(-1.35, Math.min(1.35, pitch)); yaw = yaw % (Math.PI * 2); }
function tryLock(){ try { canvas.requestPointerLock?.(); } catch (_) { lockFailed = true; } }
document.addEventListener('pointerlockerror', () => { lockFailed = true; });
document.addEventListener('pointerlockchange', () => {
  if (started && !isTouch && !finaleOn && !document.pointerLockElement && !uiOpen && !lockFailed && !letterShown())
    $('pauseOv').classList.add('show');
  else $('pauseOv').classList.remove('show');
});
$('pauseOv').onclick = () => { $('pauseOv').classList.remove('show'); tryLock(); };

/* 触屏 */
const joyVec = { x: 0, y: 0 };
if (isTouch){
  const joy = $('joy'), knob = $('joyKnob');
  let joyId = null, lookId = null, lookLast = null, tapInfo = null;
  joy.addEventListener('touchstart', e => { joyId = e.changedTouches[0].identifier; e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches){
      if (t.identifier === joyId){
        const r = joy.getBoundingClientRect();
        let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy), max = r.width / 2 - 20;
        if (len > max){ dx *= max / len; dy *= max / len; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        joyVec.x = dx / max; joyVec.y = dy / max;
      } else if (t.identifier === lookId && lookLast){
        yaw -= (t.clientX - lookLast.x) * .005; pitch -= (t.clientY - lookLast.y) * .005;
        lookLast = { x: t.clientX, y: t.clientY }; clampLook();
      }
    }
  }, { passive: false });
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches){
      if (t.target === joy || joy.contains(t.target)) continue;
      if (t.target.closest && t.target.closest('button, #hdrRight, #modalWrap, #letter, #letterCard')) continue;
      lookId = t.identifier; lookLast = { x: t.clientX, y: t.clientY };
      tapInfo = { x: t.clientX, y: t.clientY, t: Date.now() };
    }
  }, { passive: true });
  addEventListener('touchend', e => {
    for (const t of e.changedTouches){
      if (t.identifier === joyId){ joyId = null; joyVec.x = joyVec.y = 0; knob.style.transform = 'translate(-50%,-50%)'; }
      if (t.identifier === lookId){
        lookId = null;
        if (tapInfo && Date.now() - tapInfo.t < 300 && Math.hypot(t.clientX - tapInfo.x, t.clientY - tapInfo.y) < 12 && started && !uiOpen && !letterShown())
          interactAt(t.clientX, t.clientY);
        tapInfo = null;
      }
    }
  });
}
function interactAt(px, py){
  ray.setFromCamera(new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1), camera);
  const hits = ray.intersectObjects(scene.children, true);
  for (const h of hits){
    if (!visibleChain(h.object)) continue;
    const entry = entryOf(h.object);
    if (!entry) return;
    if (entry.enabled && !entry.enabled()) continue;
    if (h.distance <= entry.dist){ entry.onUse(); return; }
  }
}

/* ---------------- 拾取 ---------------- */
const ray = new THREE.Raycaster();
ray.params.Points = { threshold: 0 };
let hoverEntry = null;
function entryOf(obj){
  let o = obj;
  while (o){ if (o.userData && o.userData.iid) return interacts.find(e => e.id === o.userData.iid); o = o.parent; }
  return null;
}
function visibleChain(o){ let n = o; while (n){ if (n.visible === false) return false; n = n.parent; } return true; }
const CENTER2 = new THREE.Vector2(0, 0);
function letterShown(){ return $('letter').classList.contains('show'); }
function scanHits(hits, onlyCandle){
  for (const h of hits){
    if (!visibleChain(h.object)) continue;
    const e = entryOf(h.object);
    if (!e) return null;
    if (onlyCandle && e.id !== 'candle') continue;
    if (e.enabled && !e.enabled()) continue;
    if (h.distance <= e.dist) return e;
    return null;
  }
  return null;
}
function raycastCenter(){
  if (!started || uiOpen || letterShown()){ setHover(null); return; }
  ray.setFromCamera(CENTER2, camera);
  setHover(scanHits(ray.intersectObjects(scene.children, true), flameOn || blown));
}
function setHover(e){
  if (e === hoverEntry) return;
  hoverEntry = e;
  $('crosshair').classList.toggle('hot', !!e);
  if (e){ $('hoverText').textContent = typeof e.label === 'function' ? e.label() : e.label; $('hoverLabel').classList.add('show'); }
  else $('hoverLabel').classList.remove('show');
}

/* ---------------- 注册交互 ---------------- */
addInteract({ id: 'gift', root: gift,
  label: () => {
    if (!finaleOn) return '礼物盒 · 还没醒来的惊喜';
    if (!giftOpened) return '礼物盒 · 点击打开 ✦';
    return '礼物盒 · 已经打开';
  },
  dist: 3.2, onUse: useGift,
  enabled: () => !blown && (!finaleOn || !giftOpened) });
addInteract({ id: 'books', root: shelf, label: '书 · 抽出来看看', dist: 3.0, onUse: () => {}, enabled: () => false });
addInteract({ id: 'painting', root: painting, label: '油画 · 看看线索', dist: 3.4, onUse: openPainting });
addInteract({ id: 'drawer', root: cab, label: () => mechs.drawer.solved ? '抽屉 · 已经打开' : '抽屉 · 上锁的抽屉', dist: 3.0, onUse: openDrawerPuzzle });
addInteract({ id: 'lamp', root: lamp, label: () => lampOn ? '台灯 · 关掉试试' : '台灯 · 打开', dist: 2.8, onUse: useLamp });
addInteract({ id: 'note', root: note, label: '小纸条 · 读一读', dist: 2.6, onUse: openNote });
addInteract({ id: 'clueframe', root: clueFrame, label: '相框 · 纪念日', dist: 2.6, onUse: openClueFrame });
addInteract({ id: 'player', root: player, label: () => mechs.music.solved ? '唱片机 · 歌还在转' : '唱片机 · 放一首歌', dist: 3.0, onUse: useRecord });
addInteract({ id: 'clock', root: clockG, label: () => mechs.clock.solved ? '挂钟 · 正是此刻' : '挂钟 · 时间不对哦', dist: 3.4, onUse: openClockPuzzle });
addInteract({ id: 'window', root: winG, label: () => windowOpen ? '窗户 · 窗外' : '窗户 · 拉开窗帘', dist: 3.2, onUse: useWindow });
addInteract({ id: 'plant', root: plant, label: '绿植 · 闻一闻', dist: 2.6, onUse: () => toast('是雨后泥土和薄荷的味道', 1800) });
addInteract({ id: 'sofa', root: sofa, label: '沙发 · 坐一会儿', dist: 2.8, onUse: () => toast('软软的，坐下来晃了晃脚', 1800) });
addInteract({ id: 'cat', root: cat, label: '小猫 · 摸摸头', dist: 2.6, onUse: petCat });
addInteract({ id: 'coin', root: coin, label: '沙发缝 · 咦，有个硬币', dist: 2.4, onUse: () => { AudioBox.sPop(); toast('是一枚旧硬币，上面刻着你们认识的年份', 2400); } });
addInteract({ id: 'rugnote', root: rugNote, label: '地毯下 · 露出的纸条', dist: 2.4, onUse: () => { AudioBox.sClick(); toast('纸条上写着："别翻了，没有宝藏，只有灰尘 :)"', 2600); } });
addInteract({ id: 'guitar', root: guitar, label: '吉他 · 拨一下', dist: 2.6, onUse: () => { AudioBox.tone(330, AudioBox.now(), .4, .12, 'triangle'); AudioBox.tone(392, AudioBox.now() + .1, .4, .1, 'sine'); toast('叮——你随便拨了一下弦', 1800); } });
photoFrames.forEach(p => addInteract({ id: 'photo' + p.idx, root: p.mesh, label: '相框 · 看看', dist: 2.8, onUse: () => openPhoto(p.idx) }));
bookMeshes.forEach(b => {
  addInteract({ id: 'book_' + b.uuid, root: b, label: '书 · 抽出来看看', dist: 3.0, onUse: () => bookClick(b),
    enabled: () => !mechs.books.solved || ['g','y','r'].includes(b.userData.bookColor) });
});
addInteract({ id: 'candle', root: flame, label: '蜡烛 · 许个愿吧', dist: 3.4, onUse: blowCandle, enabled: () => flameOn });

/* ---------------- HUD 按钮 ---------------- */
let hintPillOn = false;
function showHint(){
  const rest = MECH_KEYS.filter(k => !mechs[k].solved);
  const pill = $('hintPill');
  if (!rest.length){ pill.innerHTML = '<b>都解开啦</b> · 去看看桌子上的礼物盒吧'; return; }
  pill.innerHTML = '<b>提示</b> · ' + CONFIG.hints[rest[0]];
}
$('btnHint').onclick = () => { AudioBox.sClick(); hintPillOn = !hintPillOn; $('hintPill').classList.toggle('show', hintPillOn); if (hintPillOn) showHint(); };
function setMusicUI(){ $('musicLab').textContent = AudioBox.muted ? '已静音' : (AudioBox.ambientOn || AudioBox.birthdayOn ? '音乐已开启' : '环境声'); }
$('btnMusic').onclick = () => {
  AudioBox.setMuted(!AudioBox.muted);
  setMusicUI();
  AudioBox.sClick();
};
$('btnReset').onclick = () => {
  showModal(`<div class="mk">RESET</div><div class="mt">重新开始？</div>
    <div class="mb">小屋会回到最初的样子</div>
    <div style="text-align:center"><button class="mbtn" id="rYes">重来</button> <button class="mbtn ghost" id="rNo">再逛逛</button></div>`);
  $('rYes').onclick = () => location.reload();
  $('rNo').onclick = () => closeModal();
};

/* ---------------- 移动 & 碰撞 ---------------- */
const PR = .32;
function movePlayer(dt){
  let fx = 0, fz = 0;
  if (keys.KeyW || keys.ArrowUp) fz -= 1;
  if (keys.KeyS || keys.ArrowDown) fz += 1;
  if (keys.KeyA || keys.ArrowLeft) fx -= 1;
  if (keys.KeyD || keys.ArrowRight) fx += 1;
  if (isTouch){ fx += joyVec.x; fz += joyVec.y; }
  const len = Math.hypot(fx, fz);
  const moving = len > .05;
  if (moving){
    fx /= Math.max(len, 1); fz /= Math.max(len, 1);
    const sp = 2.5, sin = Math.sin(yaw), cos = Math.cos(yaw);
    const dx = (fx * cos + fz * sin) * sp * dt;
    const dz = (fz * cos - fx * sin) * sp * dt;
    tryMove(dx, dz);
  }
  const t = performance.now() / 1000;
  camera.position.y = 1.55 + (moving ? Math.sin(t * 9) * .028 : Math.sin(t * 1.6) * .008);
}
function tryMove(dx, dz){
  const p = camera.position;
  const nx = p.x + dx;
  if (nx > -ROOM.w / 2 + PR + .05 && nx < ROOM.w / 2 - PR - .05 && !hitCol(nx, p.z)) p.x = nx;
  const nz = p.z + dz;
  if (nz > -ROOM.d / 2 + PR + .1 && nz < ROOM.d / 2 - PR - .12 && !hitCol(p.x, nz)) p.z = nz;
}
function hitCol(x, z){
  for (const c of colliders)
    if (x > c.x1 - PR && x < c.x2 + PR && z > c.z1 - PR && z < c.z2 + PR) return true;
  return false;
}

/* ---------------- 主循环 ---------------- */
const clock3 = new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt = Math.min(clock3.getDelta(), .05);
  const t = performance.now() / 1000;

  if (started && !uiOpen && !letterShown()) movePlayer(dt);
  camera.rotation.y = yaw; camera.rotation.x = pitch;

  for (let i = anims.length - 1; i >= 0; i--){
    const a = anims[i]; a.t += dt;
    const k = Math.min(a.t / a.dur, 1);
    a.step(k);
    if (k >= 1){ anims.splice(i, 1); a.done && a.done(); }
  }
  sparkles.forEach(s => { s.m.position.y = s.y + Math.sin(t * 2.4 + s.ph) * .05 + .06; s.m.rotation.y = t * 1.6; });
  stringBulbs.forEach(b => { if (b.on) b.glow.material.opacity = (finaleOn ? .55 : .45) + Math.sin(t * 3 + b.ph) * .15; });
  if (flameOn){
    const f = 1 + Math.sin(t * 14) * .1 + Math.sin(t * 23) * .06;
    flame.scale.setScalar(f);
    candleLight.intensity = 9 + Math.sin(t * 11) * 1.6 + Math.random() * 1.2;
  }
  if (vinylPlaying || (mechs.music.solved && AudioBox.birthdayOn)) platter.rotation.y += dt * 3.2;
  if (balloon && balloonActive){
    balloonT += dt;
    balloon.position.set(1.55 + Math.sin(balloonT * .7) * .75, 1.75 + Math.sin(balloonT * 1.3) * .16, -4.4);
    balloon.rotation.z = Math.sin(balloonT * .9) * .12;
  }
  catTailPivot.rotation.z = Math.sin(t * 1.3) * .35;
  catBody.scale.y = .8 + Math.sin(t * 1.8) * .03;
  if (scene.userData.steam){
    scene.userData.steam.forEach(st => {
      st.ph += dt;
      const p = (st.ph % 2.2) / 2.2;
      st.s.material.opacity = .35 * (1 - p);
      st.s.position.y = .12 + p * .28;
      st.s.scale.setScalar(.06 + p * .12);
    });
  }
  cloud.position.x += dt * .15;
  if (cloud.position.x > 5) cloud.position.x = -5;
  const night = SHARED_SKY.getHex() < 0x4a4a5a;
  winLights.forEach(w => { w.visible = night; });
  globeBall.rotation.y = t * .3;
  for (let i = confetti.length - 1; i >= 0; i--){
    const c = confetti[i];
    c.m.position.y -= c.vy * dt;
    c.m.position.x += Math.sin(t * 2 + c.sway) * dt * .5;
    c.m.rotation.x += c.vr * dt; c.m.rotation.z += c.vr * .7 * dt;
    if (c.m.position.y < .06){ c.m.position.y = .06; c.vy = 0; c.life -= dt; c.m.material.opacity = Math.max(0, c.life); }
    if (c.life <= 0){ scene.remove(c.m); confetti.splice(i, 1); }
  }
  dust.rotation.y = t * .014;
  pollMicBlow();
  raycastCenter();
  renderer.render(scene, camera);
}
loop();

/* ---------------- 启动 ---------------- */
updateHUD();
$('startBtn').onclick = () => {
  AudioBox.ensure();
  AudioBox.startEnv();
  setMusicUI();
  $('landing').classList.add('gone');
  document.body.classList.add('playing');
  started = true;
  if (!isTouch) tryLock();
  initMic();
  AudioBox.sChime();
  tween(1.4, k => { camera.position.z = 3.4 - .7 * (1 - Math.pow(1 - k, 3)); });
  setTimeout(() => toast('先到处走走吧——找找看，哪里在发光', 3000), 1000);
  setTimeout(() => { if (!MECH_KEYS.some(k => mechs[k].solved)){ hintPillOn = true; $('hintPill').classList.add('show'); showHint(); } }, 18000);
};

/* 调试钩子 */
window.__game = {
  state: mechs, camera, CONFIG,
  solve: id => solveMech(id, HEART_POS[id]),
  all(){ MECH_KEYS.forEach(k => { if (!mechs[k].solved) solveMech(k, HEART_POS[k]); }); },
  finale: startFinale, open: openGift, blow: blowCandle,
  debug: () => ({ finaleOn, giftOpened, flameOn, blown, anims: anims.map(a => ({ t: +a.t.toFixed(3), dur: a.dur })) }),
  step(sec){ const steps = Math.ceil(sec / 0.05); for (let i = 0; i < steps; i++){ for (let j = anims.length - 1; j >= 0; j--){ const a = anims[j]; a.t += 0.05; const k = Math.min(a.t / a.dur, 1); a.step(k); if (k >= 1){ anims.splice(j, 1); a.done && a.done(); } } } return anims.length; },
  clickBook(color){ const b = bookMeshes.find(m => m.userData.bookColor === color); if (b) bookClick(b); return !!b; },
  mic: () => ({ micOK, micDenied }),
  goto: (x, y, z, ry = 0, rx = 0) => { camera.position.set(x, y, z); yaw = ry; pitch = rx; },
};
window.__booted = true;
document.getElementById('loadErr').classList.remove('show');
