/* 生日小屋 · 3D 交互（复刻参考视频） */
(function(){
'use strict';
const W=()=>window.innerWidth, H=()=>window.innerHeight;
const canvas=document.getElementById('scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(W(),H());
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.82;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xefe8d4);
const camera=new THREE.PerspectiveCamera(58,W()/H(),.05,60);
camera.position.set(.6,1.5,3.9);

/* ───────── 基础工具 ───────── */
const M={}; // 材质缓存
function mat(c,o){const k=c+JSON.stringify(o||{});if(!M[k]){M[k]=new THREE.MeshLambertMaterial(Object.assign({color:c},o||{}));}return M[k];}
function box(w,h,d,c,x,y,z,opts){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),opts&&opts.material?opts.material:mat(c,opts&&opts.matOpts));
  m.position.set(x,y,z); if(opts&&opts.ry)m.rotation.y=opts.ry; if(opts&&opts.rx)m.rotation.x=opts.rx;
  if(opts&&opts.rz)m.rotation.z=opts.rz;
  m.castShadow=opts?!!opts.shadow:true; m.receiveShadow=true;
  (opts&&opts.parent||scene).add(m); return m;
}
function cyl(rt,rb,h,c,x,y,z,opts){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,opts&&opts.seg||20),opts&&opts.material?opts.material:mat(c,opts&&opts.matOpts));
  m.position.set(x,y,z); if(opts&&opts.rx)m.rotation.x=opts.rx; if(opts&&opts.rz)m.rotation.z=opts.rz;
  m.castShadow=true; m.receiveShadow=true; (opts&&opts.parent||scene).add(m); return m;
}
function sph(r,c,x,y,z,opts){
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,opts&&opts.seg||18,14),opts&&opts.material?opts.material:mat(c,opts&&opts.matOpts));
  m.position.set(x,y,z); if(opts&&opts.s)m.scale.setScalar(opts.s);
  m.castShadow=true; m.receiveShadow=true; (opts&&opts.parent||scene).add(m); return m;
}
function canvasTex(w,h,draw){
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}

/* ───────── 房间尺寸 ───────── */
const RX=6.6, RZ=5.4, RH=4.3; // 半宽/半深/高

/* 地板（木纹拼条） */
const floorTex=canvasTex(1024,1024,g=>{
  g.fillStyle='#d9b184';g.fillRect(0,0,1024,1024);
  for(let r=0;r<8;r++){for(let i=0;i<6;i++){
    const y=r*128,x=(i*171+(r%2)*85)%1024;
    g.fillStyle=['#d8ae7e','#dcba90','#d4a678','#e0bd94'][(r+i)%4];
    g.fillRect(x+2,y+2,167,124);
  }}
  g.strokeStyle='rgba(120,80,40,.25)';g.lineWidth=3;
  for(let r=0;r<=8;r++){g.beginPath();g.moveTo(0,r*128);g.lineTo(1024,r*128);g.stroke();}
  g.strokeStyle='rgba(255,240,210,.16)';g.lineWidth=1.4;
  for(let r=0;r<8;r++)for(let i=0;i<7;i++){const x=(i*171+(r%2)*85)%1024;g.beginPath();g.moveTo(x,r*128);g.lineTo(x,r*128+128);g.stroke();}
});
floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(2,1.6);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(RX*2,RZ*2),new THREE.MeshLambertMaterial({map:floorTex}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);

/* 墙 */
const wallC=0xe9e2cf;
box(RX*2,RH,.18,wallC,0,RH/2,-RZ-.09,{shadow:false});            // 北
box(.18,RH,RZ*2,wallC,-RX-.09,RH/2,0,{shadow:false});            // 西
box(.18,RH,RZ*2,wallC,RX+.09,RH/2,0,{shadow:false});             // 东
box(RX*2,RH,.18,wallC,0,RH/2,RZ+.09,{shadow:false});             // 南
box(RX*2,.16,.18,0xd8cdb0,0,RH+.08,-RZ-.09,{shadow:false});      // 踢脚/顶线（装饰）
const ceil=box(RX*2,.14,RZ*2,0xf3ecd9,0,RH+.1,0,{shadow:false});

/* ── 北墙窗户（留洞：左中位置） ── */
const WIN={x:-1.7,w:2.6,y0:.95,y1:2.9,z:-RZ};
/* 北墙分四段包住窗洞 */
(function(){
  const segL=(WIN.x-WIN.w/2)-(-RX), segR=RX-(WIN.x+WIN.w/2);
  box(segL,RH,.16,wallC,-RX+segL/2,RH/2,-RZ-.08,{shadow:false});
  box(segR,RH,.16,wallC,RX-segR/2,RH/2,-RZ-.08,{shadow:false});
  const hLow=WIN.y0,hHigh=RH-WIN.y1;
  box(WIN.w,hLow,.16,wallC,WIN.x,hLow/2,-RZ-.08,{shadow:false});
  box(WIN.w,hHigh,.16,wallC,WIN.x,WIN.y1+hHigh/2,-RZ-.08,{shadow:false});
})();
// 窗框
const fMat=mat(0xfaf6ea);
box(WIN.w+.22,.09,.14,0xfaf6ea,WIN.x,WIN.y1+.03,-RZ+.02,{shadow:false});
box(WIN.w+.22,.09,.14,0xfaf6ea,WIN.x,WIN.y0-.03,-RZ+.02,{shadow:false});
box(.09,WIN.y1-WIN.y0+.16,.14,0xfaf6ea,WIN.x-WIN.w/2-.05,(WIN.y0+WIN.y1)/2,-RZ+.02,{shadow:false});
box(.09,WIN.y1-WIN.y0+.16,.14,0xfaf6ea,WIN.x+WIN.w/2+.05,(WIN.y0+WIN.y1)/2,-RZ+.02,{shadow:false});
box(.07,WIN.y1-WIN.y0,.1,0xfaf6ea,WIN.x,(WIN.y0+WIN.y1)/2,-RZ+.02,{shadow:false});
box(WIN.w,.07,.1,0xfaf6ea,WIN.x,(WIN.y0+WIN.y1)/2,-RZ+.02,{shadow:false});
// 窗台板
box(WIN.w+.3,.09,.3,0xfaf6ea,WIN.x,WIN.y0-.05,-RZ+.16,{shadow:true});
// 天空（白天/夜晚两张）
function skyDraw(night){return (g,w,h)=>{
  if(night){g.fillStyle='#2c3a5e';g.fillRect(0,0,w,h);
    const gr=g.createRadialGradient(w*.62,h*.38,6,w*.62,h*.38,140);gr.addColorStop(0,'#fdf6da');gr.addColorStop(.12,'#f3e9bd');gr.addColorStop(.13,'rgba(243,233,189,0)');gr.addColorStop(1,'rgba(44,58,94,0)');
    g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#f7f1d4';g.beginPath();g.arc(w*.62,h*.38,30,0,7);g.fill();
    g.fillStyle='#e8dfb4';g.beginPath();g.arc(w*.62-9,h*.38-4,6,0,7);g.fill();g.beginPath();g.arc(w*.62+8,h*.38+9,4,0,7);g.fill();
    g.fillStyle='#fff';[[.15,.2],[.3,.12],[.8,.15],[.88,.3],[.72,.25],[.42,.3]].forEach(p=>{g.beginPath();g.arc(w*p[0],h*p[1],2.2,0,7);g.fill();});
    g.fillStyle='#3d5070';g.beginPath();g.moveTo(0,h);g.quadraticCurveTo(w*.3,h*.72,w*.55,h*.86);g.quadraticCurveTo(w*.8,h*.7,w,h*.9);g.lineTo(w,h);g.fill();
  }else{g.fillStyle='#bfd9e8';g.fillRect(0,0,w,h);
    g.fillStyle='#f4d98c';g.beginPath();g.arc(w*.6,h*.34,34,0,7);g.fill();
    g.fillStyle='#fff';g.globalAlpha=.85;[[.2,.25,16],[.3,.2,12],[.82,.28,20],[.72,.22,13]].forEach(p=>{g.beginPath();g.arc(w*p[0],h*p[1],p[2],0,7);g.fill();});g.globalAlpha=1;
    g.fillStyle='#a8c98a';g.beginPath();g.moveTo(0,h);g.quadraticCurveTo(w*.35,h*.68,w*.6,h*.84);g.quadraticCurveTo(w*.85,h*.66,w,h*.88);g.lineTo(w,h);g.fill();
    g.fillStyle='#93b878';g.beginPath();g.moveTo(0,h);g.quadraticCurveTo(w*.5,h*.82,w,h);g.fill();
  }};}
const skyDay=new THREE.MeshLambertMaterial({map:canvasTex(256,192,skyDraw(false))});
const skyNight=new THREE.MeshLambertMaterial({map:canvasTex(256,192,skyDraw(true)),emissive:0x1c2540,emissiveMap:canvasTex(256,192,skyDraw(true))});
const sky=new THREE.Mesh(new THREE.PlaneGeometry(8.5,5.4),skyDay);
sky.position.set(WIN.x,2.4,-RZ-1.6);scene.add(sky);

/* ───────── 灯光 ───────── */
const ambDay=new THREE.AmbientLight(0xfff4dd,.5);
const hemi=new THREE.HemisphereLight(0xfff8e8,0xcbb98a,.3);
const sun=new THREE.DirectionalLight(0xffeecb,.55);sun.position.set(-3,6,-2);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.camera.far=20;
scene.add(ambDay,hemi,sun);
const ambNight=new THREE.AmbientLight(0x35426b,.55);ambNight.visible=false;
const moonL=new THREE.DirectionalLight(0x9fb4e8,.5);moonL.position.set(-2,5,-6);moonL.visible=false;
const lampL=new THREE.PointLight(0xffc27a,0,5.5,2); // 落地灯
const pendL=new THREE.PointLight(0xffd9a0,.7,6,2);  // 吊灯
const candleL=new THREE.PointLight(0xffb45e,0,4.5,2);scene.add(candleL);
const glowL=new THREE.PointLight(0xffe9a8,0,4,2);scene.add(glowL); // 礼盒内发光
scene.add(ambNight,moonL,lampL,pendL);

/* ───────── 中央：地毯 + 圆桌 + 礼盒 ── */
const rugTex=canvasTex(256,256,g=>{
  g.fillStyle='#eee5cc';g.beginPath();g.arc(128,128,127,0,7);g.fill();
  g.strokeStyle='#d9cba6';g.lineWidth=7;
  [112,92,70].forEach(r=>{g.beginPath();g.arc(128,128,r,0,7);g.stroke();});
  g.strokeStyle='#cfc09a';g.lineWidth=5;g.beginPath();g.arc(128,128,52,0,7);g.stroke();
});
const rug=new THREE.Mesh(new THREE.CircleGeometry(1.55,48),new THREE.MeshLambertMaterial({map:rugTex}));
rug.rotation.x=-Math.PI/2;rug.position.y=.012;rug.receiveShadow=true;scene.add(rug);
const tblY=.46;
cyl(.62,.62,.05,0xc59a66,0,tblY,0);
cyl(.55,.55,.04,0xd2a873,0,tblY+.045,0);
[[.45,.45],[-.45,.45],[.45,-.45],[-.45,-.45]].forEach(p=>cyl(.035,.045,.44,0xa87f52,p[0],.22,p[1]));
// 桌上小杯
cyl(.07,.06,.12,0xf2ead6,.42,tblY+.11,.3);

/* 礼盒（可开） */
const GIFT={x:0,z:-.05,s:.52};
const giftGrp=new THREE.Group();giftGrp.position.set(GIFT.x,tblY+.065,GIFT.z);scene.add(giftGrp);
const gBody=new THREE.Group(),gLid=new THREE.Group();
giftGrp.add(gBody,gLid);
const gg=0xb7cda6, gy=0xe8d48a;
const UMat=c=>new THREE.MeshLambertMaterial({color:c});
// 四个侧板（底部铰链，开盒时向外倒平）
function wallPivot(px,pz,axis,dir){
  const pv=new THREE.Group();pv.position.set(px,.065,pz);gBody.add(pv);
  const wMat=UMat(gg);
  const geo=axis==='x'?new THREE.BoxGeometry(GIFT.s*2,.4,.07):new THREE.BoxGeometry(.07,.4,GIFT.s*2-.07);
  const w=new THREE.Mesh(geo,wMat);w.position.y=.2;w.castShadow=true;w.receiveShadow=true;pv.add(w);
  // 内壁发光面
  const gp=new THREE.Mesh(new THREE.PlaneGeometry(GIFT.s*2-.1,.36),
    new THREE.MeshLambertMaterial({color:0xfff2bd,emissive:0x000000,side:THREE.DoubleSide,transparent:true,opacity:0}));
  gp.position.set(axis==='z'?-dir*.045:0,.2,axis==='x'?dir*.045:0);
  gp.visible=false;
  pv.add(gp);
  // 缎带
  const rMat=UMat(gy);
  if(axis==='x'){const rb=new THREE.Mesh(new THREE.BoxGeometry(.1,.4,.022),rMat);rb.position.set(0,.2,-dir*.005);pv.add(rb);}
  else{const rb=new THREE.Mesh(new THREE.BoxGeometry(.022,.4,.1),rMat);rb.position.set(-dir*.005,.2,0);pv.add(rb);}
  return {pv,w,gp};
}
const pwT=wallPivot(0,GIFT.s-.035,'x',-1);   // 南壁，向外(南)倒
const pwB=wallPivot(0,-GIFT.s+.035,'x',1);   // 北壁，向外(北)倒
const pwL=wallPivot(-GIFT.s+.035,0,'z',-1);  // 西壁
const pwR=wallPivot(GIFT.s-.035,0,'z',1);    // 东壁
// 底
const gBase=new THREE.Mesh(new THREE.BoxGeometry(GIFT.s*2,.06,GIFT.s*2),UMat(gg));
gBase.position.y=.03;gBase.castShadow=true;gBase.receiveShadow=true;gBody.add(gBase);
// 盖（独立材质，开盖时升起淡出）
const lidMat=UMat(gg),ribMat=UMat(gy);
const lid=new THREE.Mesh(new THREE.BoxGeometry(GIFT.s*2+.12,.1,GIFT.s*2+.12),lidMat);
lid.position.y=.05;lid.castShadow=true;gLid.add(lid);
const lr1=new THREE.Mesh(new THREE.BoxGeometry(.1,.12,GIFT.s*2+.12),ribMat);lr1.position.y=.06;gLid.add(lr1);
const lr2=new THREE.Mesh(new THREE.BoxGeometry(GIFT.s*2+.12,.12,.1),ribMat);lr2.position.y=.06;gLid.add(lr2);
function bowLoop(rot){const m=new THREE.Mesh(new THREE.TorusGeometry(.09,.038,10,20),UMat(gy));m.scale.set(1,.62,1);m.position.set(0,.12,0);m.rotation.set(Math.PI/2,0,rot);m.castShadow=true;gLid.add(m);return m;}
bowLoop(.5);bowLoop(-.5);
const knot=new THREE.Mesh(new THREE.SphereGeometry(.05,10,8),UMat(gy));knot.position.set(0,.13,0);gLid.add(knot);
const glowPlanes=[];// 发光面由各壁 pivot 管理

/* ───────── 蛋糕 ───────── */
const cakeGrp=new THREE.Group();cakeGrp.position.set(GIFT.x,tblY+.09,GIFT.z);cakeGrp.visible=false;scene.add(cakeGrp);
// 瓷盘 + 金边
cyl(.4,.44,.045,0xfdfaf2,0,.02,0,{parent:cakeGrp});
cyl(.405,.405,.012,0xe3cfa8,0,.048,0,{parent:cakeGrp});
// 下层（淡粉奶油）
cyl(.3,.33,.2,0xf7e3d8,0,.155,0,{parent:cakeGrp});
// 下层顶奶油裙边
for(let i=0;i<14;i++){const a=i/14*Math.PI*2;sph(.034,0xfdf6ec,Math.cos(a)*.295,.265,Math.sin(a)*.295,{parent:cakeGrp});}
// 下层侧面糖珠
for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.3;sph(.014,[0xd9a5a0,0x9cb987,0xd9b36a][i%3],Math.cos(a)*.318,.16,Math.sin(a)*.318,{parent:cakeGrp});}
// 上层（奶白）
cyl(.21,.235,.16,0xfdf6ec,0,.335,0,{parent:cakeGrp});
// 上层顶奶油裙边
for(let i=0;i<10;i++){const a=i/10*Math.PI*2;sph(.03,0xfdf6ec,Math.cos(a)*.205,.42,Math.sin(a)*.205,{parent:cakeGrp});}
// 顶层奶油花
for(let i=0;i<6;i++){const a=i/6*Math.PI*2;sph(.028,0xffffff,Math.cos(a)*.115,.43,Math.sin(a)*.115,{parent:cakeGrp});}
// 草莓（红果+绿叶蒂）
[[.115,0],[-.06,.1],[-.06,-.1]].forEach(p=>{
  sph(.032,0xd96a6a,p[0],.455,p[1],{parent:cakeGrp});
  sph(.013,0x8fafa0,p[0],.482,p[1],{parent:cakeGrp});});
// 蜡烛 + 火苗
const candle=cyl(.022,.022,.15,0xf3e6c8,0,.5,0,{parent:cakeGrp});
cyl(.032,.032,.014,0xd9b36a,0,.43,0,{parent:cakeGrp}); // 烛座
const flame=new THREE.Mesh(new THREE.ConeGeometry(.024,.07,10),new THREE.MeshLambertMaterial({color:0xffc45e,emissive:0xff9a2e}));
flame.position.set(0,.615,0);cakeGrp.add(flame);
const flameGlow=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:.28}));
flameGlow.position.copy(flame.position);cakeGrp.add(flameGlow);

/* ───────── 吊灯 ───────── */
cyl(.012,.012,1.1,0x8a7a62,0,RH-.55,0);
const shade=new THREE.Mesh(new THREE.CylinderGeometry(.34,.5,.4,24,1,true),new THREE.MeshLambertMaterial({color:0xf6efd8,side:THREE.DoubleSide}));
shade.position.set(0,RH-1.1,0);shade.castShadow=true;scene.add(shade);
const bulb=sph(.09,0xfff3cf,0,RH-1.18,0,{material:new THREE.MeshLambertMaterial({color:0xfff3cf,emissive:0xffdf9a})});
pendL.position.set(0,RH-1.15,0);

/* ───────── 西墙：沙发区 ───────── */
const sofa=new THREE.Group();sofa.position.set(-5.55,0,-1.1);sofa.rotation.y=Math.PI/2;scene.add(sofa);
box(2.1,.42,.85,0xa9bfa0,0,.3,0,{parent:sofa});
box(2.1,.75,.24,0xa2b899,0,.72,-.32,{parent:sofa});
box(.26,.62,.85,0x9db597,-1.02,.6,0,{parent:sofa});
box(.26,.62,.85,0x9db597,1.02,.6,0,{parent:sofa});
box(.8,.18,.7,0xd9cbb0,-.5,.56,.04,{parent:sofa});   // 奶油靠垫
box(.8,.18,.7,0xd9a5a0,.45,.56,.04,{parent:sofa});   // 粉靠垫
const pillow=box(.72,.16,.5,0xf3edde,.15,.66,.12,{parent:sofa}); // 口袋抱枕
(function(){ // 抱枕条纹纹理
  const t=canvasTex(64,64,g=>{g.fillStyle='#f3edde';g.fillRect(0,0,64,64);g.fillStyle='#e3dbc6';for(let i=0;i<64;i+=8)g.fillRect(0,i,64,4);});
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,2);
  pillow.material=new THREE.MeshLambertMaterial({map:t});
  const leaf=box(.16,.01,.1,0x8fac74,.15,.75,.12,{parent:sofa});leaf.castShadow=false;
})();
/* 落地灯 */
const lampGrp=new THREE.Group();lampGrp.position.set(-5.7,0,-4.3);scene.add(lampGrp);
cyl(.16,.2,.05,0xb5926a,0,.03,0,{parent:lampGrp});
cyl(.025,.025,1.5,0x9a7d58,0,.8,0,{parent:lampGrp});
const lampShade=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,.34,20,1,true),new THREE.MeshLambertMaterial({color:0xf6efd8,side:THREE.DoubleSide}));
lampShade.position.y=1.62;lampGrp.add(lampShade);
const lampBulb=sph(.07,0xfff0c8,-5.7,1.56,-4.3,{material:new THREE.MeshLambertMaterial({color:0xfff0c8,emissive:0x000000})});
lampL.position.set(-5.6,1.5,-4.2);
/* 单人沙发（棕）+ 唱片机凳 */
const arm=new THREE.Group();arm.position.set(-5.3,0,.9);arm.rotation.y=Math.PI/2+.35;scene.add(arm);
box(.95,.4,.85,0xb08a5e,0,.32,0,{parent:arm});
box(.95,.7,.22,0xa87f54,0,.72,-.34,{parent:arm});
box(.2,.55,.85,0xa87f54,-.42,.6,0,{parent:arm});
box(.2,.55,.85,0xa87f54,.42,.6,0,{parent:arm});
const stool=new THREE.Group();stool.position.set(-3.1,0,1.75);stool.rotation.y=-.3;scene.add(stool);
box(.62,.07,.62,0xb5926a,0,.52,0,{parent:stool});
[[-.24,-.24],[.24,-.24],[-.24,.24],[.24,.24]].forEach(p=>cyl(.028,.038,.5,0x9a7d58,p[0],.26,p[1],{parent:stool}));
/* 唱片机 */
const player=new THREE.Group();player.position.set(-3.1,.56,1.75);player.rotation.y=-.3;scene.add(player);
box(.56,.12,.44,0x8a6543,0,.06,0,{parent:player});
box(.52,.02,.4,0x6f4f33,0,.13,0,{parent:player});
const tone=new THREE.Group();tone.position.set(.2,.15,-.12);player.add(tone);
cyl(.012,.012,.2,0xd9d0bd,0,.05,0,{parent:tone,rx:0});tone.children[0].rotation.z=.5;tone.children[0].position.x=-.05;
// 黑胶唱片（拿到书架礼物后出现）
const vinyl=cyl(.16,.16,.018,0x2e2a28,-.05,.145,0,{parent:player,seg:32});
cyl(.05,.05,.02,0xd9a05e,-.05,.15,0,{parent:player,seg:16});
vinyl.visible=false;
/* 猫窝 + 猫 */
const bed=cyl(.34,.3,.1,0xe4b7ac,-2.5,.05,2.5,{seg:24});
const cat=new THREE.Group();cat.position.set(-2.5,.16,2.5);cat.rotation.y=2.6;scene.add(cat);
const catBody=sph(.17,0xe8c9a0,0,0,0,{parent:cat});catBody.scale.set(1.35,.85,1);
sph(.12,0xe8c9a0,.2,.07,0,{parent:cat});
[[.16,.24],[.24,.24]].forEach((p,i)=>{const e=new THREE.Mesh(new THREE.ConeGeometry(.035,.07,6),mat(0xe8c9a0));e.position.set(p[0]+(i?0.015:-0.015),.17,p[1]-.24+ .05);e.rotation.z=i?-.3:.3;cat.add(e);});
sph(.008,0x5c4a38,.26,.1,.05,{parent:cat});sph(.008,0x5c4a38,.26,.1,-.05,{parent:cat});
const tail=cyl(.03,.045,.3,0xdcb98c,-.28,-.02,.06,{parent:cat});tail.rotation.z=1.1;tail.rotation.x=.4;
cat.visible=false; // 进入唱片角后出现

/* ───────── 东墙：阅读角 ───────── */
/* 书架 */
const shelf=new THREE.Group();shelf.position.set(6.02,0,-2.5);shelf.rotation.y=-Math.PI/2;scene.add(shelf);
box(1.7,2.5,.4,0xc59a66,0,1.25,0,{parent:shelf});
box(1.7,.06,.44,0xb08a5e,0,.12,0,{parent:shelf});
box(1.7,.06,.44,0xb08a5e,0,.92,0,{parent:shelf});
box(1.7,.06,.44,0xb08a5e,0,1.72,0,{parent:shelf});
box(1.7,.06,.44,0xb08a5e,0,2.48,0,{parent:shelf});
box(.06,2.5,.44,0xb08a5e,-.85,1.25,0,{parent:shelf});
box(.06,2.5,.44,0xb08a5e,.85,1.25,0,{parent:shelf});
function bookRow(y,arr){let x=-.75;arr.forEach(b=>{if(b.clock){const cl=cyl(.14,.14,.05,0xfaf6ea,x,y+b.h||y+.14,0,{parent:shelf,rx:Math.PI/2,seg:24});cl.rotation.x=Math.PI/2;cl.position.set(x,y+.16,.02);
    const face=new THREE.Mesh(new THREE.CircleGeometry(.11,24),new THREE.MeshLambertMaterial({color:0xfdfaf0}));face.position.set(x,y+.16,.048);shelf.add(face);
    const h1=box(.012,.09,.006,0x6d6152,x+.0345,y+.131,.052,{parent:shelf,shadow:false});h1.rotation.z=-2.269; // 时针 4:20
    const h2=box(.012,.1,.006,0x6d6152,x+.0433,y+.135,.052,{parent:shelf,shadow:false});h2.rotation.z=-2.094;   // 分针 20分
    x+=.34;return;}
  box(.13,b.h,.3,b.c,x,b.h/2+y,0,{parent:shelf});x+=.15;});}
bookRow(.15,[{c:0xcf8d84,h:.5},{c:0x8fafa0,h:.56},{c:0xe8dfc0,h:.46},{c:0x8fafa0,h:.6},{c:0xcf8d84,h:.52}]);
bookRow(.95,[{c:0xd9a5a0,h:.52},{c:0x9cb987,h:.6},{c:0xd9b36a,h:.55},{clock:1,h:0}]);
bookRow(1.75,[{c:0x8fafa0,h:.5},{c:0xe8dfc0,h:.58},{c:0xcf8d84,h:.5},{c:0x9cb987,h:.54},{c:0xe8dfc0,h:.46},{c:0x8fafa0,h:.6}]);
/* 书桌 + 椅子 */
const desk=new THREE.Group();desk.position.set(5.95,0,-.4);desk.rotation.y=-Math.PI/2;scene.add(desk);
box(1.35,.06,.6,0xc59a66,0,.78,0,{parent:desk});
[[-.6,-.22],[.6,-.22],[-.6,.22],[.6,.22]].forEach(p=>box(.06,.78,.06,0xa87f54,p[0],.39,p[1],{parent:desk}));
box(.5,.06,.3,0xa87f54,0,.4,0,{parent:desk});
// 桌上书堆 + 纸
box(.34,.05,.24,0xcf8d84,-.35,.835,-.1,{parent:desk});
box(.3,.05,.22,0xd9b36a,-.33,.885,-.08,{parent:desk,ry:.2});
box(.26,.05,.2,0x9cb987,-.36,.935,-.1,{parent:desk,ry:-.15});
const paper=box(.3,.006,.22,0xfdfaf0,.25,.815,.1,{parent:desk,ry:.3});paper.castShadow=false;
const chair=new THREE.Group();chair.position.set(5.25,0,-.4);chair.rotation.y=-Math.PI/2;scene.add(chair);
box(.42,.06,.42,0x9cb987,0,.46,0,{parent:chair});
box(.42,.5,.07,0x9cb987,0,.75,-.18,{parent:chair});
[[-.17,-.17],[.17,-.17],[-.17,.17],[.17,.17]].forEach(p=>cyl(.022,.03,.46,0x8a7a5c,p[0],.23,p[1],{parent:chair}));
/* 墙上挂画（绿 Sonnenberg） */
const artTex=canvasTex(128,128,g=>{g.fillStyle='#f3ecd6';g.fillRect(0,0,128,128);g.fillStyle='#9cb987';g.beginPath();g.ellipse(64,78,34,26,0,0,7);g.fill();g.fillStyle='#e8c46a';g.beginPath();g.arc(84,44,14,0,7);g.fill();g.fillStyle='#6d8559';g.beginPath();g.ellipse(52,88,20,12,0,0,7);g.fill();});
const art=box(.62,.62,.05,0xfdfaf0,6.38,2.35,-.4,{shadow:false});art.material=new THREE.MeshLambertMaterial({map:artTex});art.rotation.y=-Math.PI/2;
box(.7,.7,.03,0xc59a66,6.4,2.35,-.4,{shadow:false,ry:Math.PI/2});
/* 沙发上方两幅小画 */
const art2=box(.34,.42,.04,0xfdfaf0,-6.38,2.35,-1.4,{shadow:false});art2.rotation.y=Math.PI/2;art2.material=new THREE.MeshLambertMaterial({map:canvasTex(64,80,g=>{g.fillStyle='#f3ecd6';g.fillRect(0,0,64,80);g.fillStyle='#d9a5a0';g.beginPath();g.arc(32,36,16,0,7);g.fill();g.fillStyle='#9cb987';g.fillRect(14,56,36,8);})});
const art3=box(.34,.42,.04,0xfdfaf0,-6.38,2.35,-2.1,{shadow:false});art3.rotation.y=Math.PI/2;art3.material=new THREE.MeshLambertMaterial({map:canvasTex(64,80,g=>{g.fillStyle='#f3ecd6';g.fillRect(0,0,64,80);g.fillStyle='#8fafa0';g.beginPath();g.moveTo(14,58);g.lineTo(32,26);g.lineTo(50,58);g.fill();g.fillStyle='#e8c46a';g.beginPath();g.arc(46,26,7,0,7);g.fill();})});
/* 墙上挂钟（4:20） */
const clockGrp=new THREE.Group();clockGrp.position.set(6.38,2.9,-1.5);clockGrp.rotation.y=-Math.PI/2;scene.add(clockGrp);
cyl(.3,.3,.05,0xc59a66,0,0,0,{parent:clockGrp,rx:Math.PI/2,seg:28});
const clockFace=new THREE.Mesh(new THREE.CircleGeometry(.26,28),new THREE.MeshLambertMaterial({color:0xfdfaf0}));clockFace.position.z=.028;clockGrp.add(clockFace);
for(let i=0;i<12;i++){const tk=box(.016,i%3===0?.05:.03,.006,0x8a7a62,Math.sin(i/12*6.283)*.21,Math.cos(i/12*6.283)*.21,.032,{parent:clockGrp,shadow:false});tk.rotation.z=-i/12*6.283;}
const hH=box(.02,.13,.008,0x544a3c,.0498,-.0418,.034,{parent:clockGrp,shadow:false});hH.rotation.z=-2.269; // 时针 4:20
const hM=box(.02,.19,.008,0x544a3c,.0823,-.0475,.034,{parent:clockGrp,shadow:false});hM.rotation.z=-2.094; // 分针 20分
sph(.02,0x544a3c,0,0,.036,{parent:clockGrp});

/* ───────── 东南：绿植角 ───────── */
const bigPlant=new THREE.Group();bigPlant.position.set(3.4,0,1.0);scene.add(bigPlant);
cyl(.24,.19,.4,0xc97b5a,0,.2,0,{parent:bigPlant});
cyl(.2,.2,.05,0x7d6146,0,.42,0,{parent:bigPlant});
[[-.1,.75,.05,.32],[.12,.85,-.06,.38],[0,1.0,.02,.42],[-.16,.9,-.1,.3],[.18,.72,.1,.28]].forEach((p,i)=>{
  const st=cyl(.015,.02,.35,0x7d8f5c,p[0],p[1]-.25,p[2],{parent:bigPlant});st.rotation.z=p[0]*.8;
  sph(p[3],i%2?0x9cb987:0x8fac74,p[0]*1.4,p[1],p[2]*1.4,{parent:bigPlant});});
/* 边几（水壶桌） */
const stable=new THREE.Group();stable.position.set(2.35,0,1.85);scene.add(stable);
box(.7,.05,.7,0xc59a66,0,.62,0,{parent:stable});
[[-.28,-.28],[.28,-.28],[-.28,.28],[.28,.28]].forEach(p=>cyl(.024,.03,.6,0xa87f54,p[0],.31,p[1],{parent:stable}));
/* 桌上小盆栽 */
cyl(.09,.075,.16,0xc97b5a,-.18,.72,.05,{parent:stable});
sph(.1,0x9cb987,-.18,.88,.05,{parent:stable});
cyl(.07,.06,.12,0xd9a05e,.14,.7,-.02,{parent:stable});
sph(.085,0x8fac74,.14,.82,-.02,{parent:stable});
/* 小嫩芽（拿水壶后出现） */
const sprout=new THREE.Group();sprout.position.set(-.02,.645,.22);stable.add(sprout);sprout.visible=false;
cyl(.008,.01,.09,0x7d8f5c,0,.045,0,{parent:sprout});
const lf=(rz)=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),mat(0x9cb987));l.scale.set(1,.4,1.8);l.position.set(rz?-.035:.035,.09,0);l.rotation.z=rz?-.7:.7;sprout.add(l);};
lf(true);lf(false);
/* 水壶（可拿） */
const canGrp=new THREE.Group();canGrp.position.set(.05,.65,-.22);stable.add(canGrp);
cyl(.09,.1,.2,0x9cb987,0,.1,0,{parent:canGrp});
const spout=cyl(.02,.035,.2,0x9cb987,.13,.14,0,{parent:canGrp});spout.rotation.z=-1;
cyl(.06,.06,.02,0x9cb987,0,.2,0,{parent:canGrp});
const handle=new THREE.Mesh(new THREE.TorusGeometry(.07,.014,8,16,Math.PI),mat(0x8aa578));handle.position.set(0,.12,-.09);handle.rotation.y=Math.PI/2;canGrp.add(handle);
/* 礼物袋 */
const bag=new THREE.Group();bag.position.set(3.0,0,2.35);bag.rotation.y=.4;scene.add(bag);
box(.4,.42,.3,0xa9c29a,0,.21,0,{parent:bag});
box(.44,.1,.34,0xbfd3b4,0,.4,0,{parent:bag});
const h1t=new THREE.Mesh(new THREE.TorusGeometry(.09,.012,6,14,Math.PI),mat(0x8aa578));h1t.position.set(-.08,.48,0);bag.add(h1t);
const h2t=new THREE.Mesh(new THREE.TorusGeometry(.09,.012,6,14,Math.PI),mat(0x8aa578));h2t.position.set(.08,.48,0);bag.add(h2t);
/* 气球 */
const bals=new THREE.Group();bals.position.set(1.75,0,2.6);scene.add(bals);
function balloon(c,x,y,s){const b=sph(.16,c,x,y,0,{parent:bals});b.scale.set(1,1.22,1);cyl(.004,.004,y-1.05,0xbfae8e,x,y-(y-1.05)/2,0,{parent:bals});b.userData.baseY=y;return b;}
const bal1=balloon(0xe8b48a,-.12,1.7,1),bal2=balloon(0xa9c29a,.16,2.0,1);
/* 门（东墙南端） */
box(.1,2.3,1.0,0x6d8a6f,6.35,1.15,2.9,{shadow:false});
box(.14,2.4,1.12,0x8a7a62,6.38,1.2,2.9,{shadow:false});
sph(.035,0xd9b36a,6.28,1.15,2.55,{});
/* 门旁开关（南墙东侧） */
const swGrp=new THREE.Group();swGrp.position.set(1.7,1.35,RZ-.02);scene.add(swGrp);
box(.22,.3,.04,0xfaf6ea,0,0,0,{parent:swGrp});
box(.09,.13,.05,0xfdfaf0,0,.02,0,{parent:swGrp});
const swNub=box(.07,.1,.03,0xe3dbc6,0,.03,.02,{parent:swGrp});

/* ───────── 北墙：斗柜 + 窗台植物 ───────── */
const dresser=new THREE.Group();dresser.position.set(1.3,0,-5.05);scene.add(dresser);
box(1.0,.9,.5,0xb5926a,0,.45,0,{parent:dresser});
box(1.06,.05,.54,0xc59a66,0,.92,0,{parent:dresser});
const drawerF=box(.9,.34,.06,0xc59a66,0,.66,.26,{parent:dresser});
sph(.03,0x8a6543,-.12,.66,.3,{parent:dresser});sph(.03,0x8a6543,.12,.66,.3,{parent:dresser});
box(.9,.34,.06,0xb5926a,0,.26,.26,{parent:dresser});
sph(.03,0x8a6543,-.12,.26,.3,{parent:dresser});sph(.03,0x8a6543,.12,.26,.3,{parent:dresser});
/* 窗台小植物（浇水对象） */
const sillPlant=new THREE.Group();sillPlant.position.set(WIN.x-.45,WIN.y0+.05,-RZ+.2);scene.add(sillPlant);
cyl(.11,.09,.2,0xc97b5a,0,.1,0,{parent:sillPlant});
const droopLeaves=[];
[[-.06,.9],[0,1],[.07,.85],[-.02,1.1]].forEach((p,i)=>{
  const st=cyl(.01,.014,.3,0x7d8f5c,0,.25,0,{parent:sillPlant});st.rotation.z=(i-1.5)*.55;
  const lf=sph(.06,0x9cb987,p[0],.32+p[1]*.12,0,{parent:sillPlant});lf.scale.set(1.6,.5,.8);
  lf.rotation.z=(i-1.5)*.9;droopLeaves.push({lf,st,baseR:st.rotation.z});
});
sillPlant.rotation.x=0;

/* ───────── 彩旗 ───────── */
(function(){
  const g=new THREE.Group();scene.add(g);
  const pts=[];for(let i=0;i<=20;i++){const t=i/20;pts.push(new THREE.Vector3(-4.2+8.4*t,3.3-Math.sin(t*Math.PI)*.45,-RZ+.1));}
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xb59a6a}));g.add(line);
  const cols=[0xd9a05e,0x9cb987,0xe8dfc0,0xcf8d84,0x9cb987,0xd9b36a];
  for(let i=1;i<20;i+=2){const t=i/20,p=pts[i];
    const tri=new THREE.Mesh(new THREE.ConeGeometry(.11,.3,3),mat(cols[(i>>1)%6]));tri.position.set(p.x,p.y-.16,p.z);tri.rotation.x=Math.PI;g.add(tri);}
})();

/* ───────── 墙面文字（金句） ───────── */
const quotes=[];
function quotePlane(text,x,y,z,ry,w){
  const t=canvasTex(512,72,g=>{g.font='600 34px "YouYuan","幼圆","KaiTi",sans-serif';
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(140,125,95,.85)';g.fillText(text,256,38);});
  const p=new THREE.Mesh(new THREE.PlaneGeometry(w,w*72/512),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.9}));
  p.position.set(x,y,z);p.rotation.y=ry;scene.add(p);quotes.push(p);return p;}
quotePlane('阅读角 · 把一天排成一列',6.37,3.05,-.4,-Math.PI/2,1.7);
quotePlane('绿植角 · 请给它们浇一点水',6.37,2.9,1.55,-Math.PI/2,1.7);

/* ═════════ 交互系统 ═════════ */
const interactables=[];
function reg(obj,key,label){obj.userData.key=key;obj.userData.label=label;interactables.push(obj);}
reg(giftGrp,'gift','客厅中央的大礼物盒');
reg(canGrp,'can','绿植角的水壶');
reg(desk,'desk','阅读角的书桌');
reg(shelf,'shelf','阅读角的书架');
reg(clockGrp,'clock','阅读角的挂钟');
reg(dresser,'dresser','窗边的斗柜');
reg(sillPlant,'sill','窗台上耷着叶子的植物');
reg(pillow,'pillow','沙发上的小抱枕');
reg(cat,'cat','打盹的小猫');
reg(player,'player','唱片角落的唱片机');
reg(swGrp,'switch','墙上的电灯开关');
reg(cakeGrp,'cake','生日蛋糕上的烛光');

/* ── 游戏状态 ── */
const S={
  started:false, night:false, hearts:0, unlocked:0,
  hasCan:false, hasKey:false, hasRecord:false,
  clues:{desk:false,clock:false},
  done:{shelf:false,drawer:false,plant:false,pocket:false,song:false},
  opened:false, blew:false, catShown:false
};
const $=id=>document.getElementById(id);
const fmt=n=>n;
function updateProgress(){
  $('unlockNum').textContent=S.unlocked;
  $('heartNum').textContent=S.hearts;
  if(S.unlocked>=5){$('progressCard').classList.add('done');$('progressCard').querySelector('.pc-t').textContent='所有小机关都解开啦';}
}
function hint(t){if(t){$('hintToastText').textContent=t;$('hintToast').classList.remove('hidden');}else $('hintToast').classList.add('hidden');}
let ctT=null;
function centerToast(t,ms){$('centerToastText').textContent=t;$('centerToast').classList.remove('hidden');clearTimeout(ctT);ctT=setTimeout(()=>$('centerToast').classList.add('hidden'),ms||3800);}

/* ── 弹窗系统 ── */
const IC={
  drop:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  book:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M12 5.5C10 4 7.5 3.5 4 3.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2zm0 0v14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  gift:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><rect x="4" y="9" width="16" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 12h16M12 9v11M12 9c-2.8 0-4.5-1.2-4.5-2.8C7.5 4.7 8.7 4 9.8 4c1.5 0 2.2 1.6 2.2 5zm0 0c2.8 0 4.5-1.2 4.5-2.8C16.5 4.7 15.3 4 14.2 4 12.7 4 12 5.6 12 9z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  giftO:'<div style="font-size:44px;line-height:1">🎁</div>',
  giftP:'<div style="font-size:44px;line-height:1;filter:hue-rotate(230deg)">🎁</div>',
  clock:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  lock:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><rect x="5.5" y="10" width="13" height="9.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  leaf:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M5 19C5 9 12 5 20 5c0 8-4 14-13 14-1 0-2-.2-2-.2zm2-2c3-5 7-8 11-9-5 1-9 4-11 9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  key:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><circle cx="8" cy="14" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l9-9m-4 1 3 3m-6 0 3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  music:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="18" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="16" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  cam:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><rect x="3" y="7" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 7l1.5-2.5h4L15.5 7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  heart:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M12 20s-7.5-4.7-9.3-9C1.4 7.7 3.6 4.5 7 4.5c2 0 3.8 1.2 5 3 1.2-1.8 3-3 5-3 3.4 0 5.6 3.2 4.3 6.5C19.5 15.3 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  sprout:'<svg viewBox="0 0 24 24" style="width:1em;height:1em"><path d="M12 21v-8m0 0c0-4 3-6 7-6 0 4-3 6-7 6zm0 0c0-4-3-6-7-6 0 4 3 6 7 6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
let modalBtnFn=null;
function showModal(o){
  if(document.pointerLockElement)document.exitPointerLock(); // 弹窗时释放鼠标
  $('mLabel').innerHTML=o.label||'';
  $('mLabel').style.display=o.label?'':'none';
  const ic=$('mIcon');
  ic.className='m-icon '+(o.iconType||'');
  ic.innerHTML=IC[o.icon]||IC.gift;
  $('mTitle').innerHTML=o.title||'';
  $('mBody').innerHTML=o.body||'';
  $('mExtra').innerHTML=o.extra||'';
  const b=$('mBtn');
  if(o.btn){b.classList.remove('hidden');$('mBtnText').textContent=o.btn;b.disabled=!!o.btnDisabled;
    $('mBtnIc').innerHTML=o.btnIc||'';modalBtnFn=o.btnFn||closeModal;}
  else{b.classList.add('hidden');modalBtnFn=null;}
  $('modalMask').classList.remove('hidden');
  if(o.onOpen)o.onOpen();
}
function closeModal(){$('modalMask').classList.add('hidden');if(window._modalCleanup){window._modalCleanup();window._modalCleanup=null;}}
$('modalClose').onclick=closeModal;
$('mBtn').onclick=()=>{if(modalBtnFn)modalBtnFn();};
$('modalMask').addEventListener('click',e=>{if(e.target===$('modalMask'))closeModal();});

function noteBox(t){return '<div class="m-note">'+t+'</div>';}
function hlBox(t){return '<div class="m-hl">'+t+'</div>';}
function hearts(){return S.hearts;}

/* ── 唱片/斗柜等 3D 反馈 ── */
let drawerOpen=false;
function openDrawerAnim(){
  if(drawerOpen)return;drawerOpen=true;
  const t0=performance.now();
  (function a(){const k=Math.min(1,(performance.now()-t0)/600);
    drawerF.position.z=.26+k*.3;drawerF.position.y=.66-k*.02;
    if(k<1)requestAnimationFrame(a);})();
}
function showVinyl(){vinyl.visible=true;}
let vinylSpin=false;
function setDay(night){
  S.night=night;
  ambDay.visible=!night;hemi.visible=!night;sun.visible=!night;
  ambNight.visible=night;moonL.visible=night;
  lampL.intensity=night?1.15:0;lampBulb.material.emissive.setHex(night?0xffc27a:0x000000);
  pendL.intensity=night?0:.55;bulb.material.emissive.setHex(night?0x554422:0xffdf9a);
  sky.material=night?skyNight:skyDay;
  scene.background=new THREE.Color(night?0x2b3350:0xefe8d4);
  swNub.position.y=night?-.03:.03;
  // 墙面文字在夜里调暗
  quotes.forEach(q=>q.material.opacity=night?.25:.9);
}

/* ── 弹窗内容定义 ── */
function modalWaterCan(){
  showModal({label:'绿植角的小发现',icon:'drop',iconType:'',title:'一只装好水的小水壶',
    body:'绿植角上放着一只水壶。\n壶身上写着："给身边的人送一点水。"',
    btn:'拿起水壶',btnIc:'⌂',btnFn(){
      S.hasCan=true;canGrp.visible=false;sprout.visible=true;sprout.scale.set(.01,.01,.01);
      BirMusic.ding();closeModal();
      centerToast('拿到水壶了，去窗边看看那盆垂着叶子的植物吧。');
      sproutGrow();
    }});
}
function sproutGrow(){const t0=performance.now();(function a(){const k=Math.min(1,(performance.now()-t0)/800);
  sprout.scale.setScalar(.01+k*.99);if(k<1)requestAnimationFrame(a);})();}
function modalDesk(){
  S.clues.desk=true;
  showModal({label:'你发现了一条线索',icon:'book',iconType:'plain',title:'把一天排成一列',
    body:'<div class="chips"><span class="chip g"><span class="dot"></span>绿叶</span><span class="chip y"><span class="dot"></span>日光</span><span class="chip p"><span class="dot"></span>晚霞</span></div>明信片上依次画着：清晨的绿叶、午后的金色阳光、傍晚的粉色彩云。\n背面写着：书架上的三本书，也想按这个顺序排好。',
    extra:noteBox('已记入探索手记，可以随时回看。')});
}
function modalShelf(){
  let order=[];
  showModal({label:'朋友留的小机关',icon:'book',iconType:'plain',title:'把一天排成一列',
    body:'三本书的书脊上有按钮。\n按下正确的颜色顺序，打开藏在后头的暗格。',
    extra:'<div class="books">'+
      '<button class="book b-red" data-b="red"><span>晚霞红</span></button>'+
      '<button class="book b-green" data-b="green"><span>叶子绿</span></button>'+
      '<button class="book b-gold" data-b="gold"><span>日光金</span></button></div>'+
      noteBox('手记：清晨的绿叶 → 午后的日光 → 傍晚的云霞')+
      '<span class="m-link" id="reorder">重新排列</span>',
    onOpen(){
      const reset=()=>{order=[];};
      $('reorder').onclick=()=>{reset();BirMusic.clickSfx();};
      document.querySelectorAll('#mExtra .book').forEach(bk=>{
        bk.onclick=()=>{
          if(S.done.shelf)return;
          order.push(bk.dataset.b);BirMusic.noteTone({green:'mi',gold:'do',red:'sol'}[bk.dataset.b]);
          if(order.length===3){
            if(order.join()==='green,gold,red'){S.done.shelf=true;unlockShelf();}
            else{BirMusic.errSfx();order.forEach(k=>{document.querySelector('.book.b-'+k).classList.add('shake');});
              setTimeout(()=>{document.querySelectorAll('.book').forEach(x=>x.classList.remove('shake'));reset();},450);}
          }
        };});
      window._modalCleanup=()=>{};
    }});
}
function unlockShelf(){
  BirMusic.unlockChime();S.unlocked++;updateProgress();
  S.hasRecord=true;showVinyl();
  showModal({label:'',icon:'gift',iconType:'',title:'小机关解开了。',
    body:hlBox('三本书对齐了！暗格里有一份礼物，还有一张写着音符的唱片。')+'也拿到了一张唱片，封套刻字已记进手记。',
    btn:'看看里面的礼物',btnIc:'🎁',btnFn(){parcel('orange','来自 阿川 · 藏在书架里的信里',memory1);}});
}
function memory1(){showModal({label:'一份朋友送给你的心意',icon:'book',iconType:'pink',title:'下一站，晴天',
  body:'书里夹着我们下次旅行的约定。\n愿你的生活里，总有一段值得期待的路，\n而我很乐意，继续做你的旅伴。',
  extra:'<div class="m-sub">来自 阿川 的生日祝福 <span class="m-hearts">♥</span></div>'+noteBox('一本旅行手册，第一页写着「下一站，我们一起」。'),
  btn:'收好这份心意',btnIc:'✓',btnFn(){closeModal();gainHeart();}});}
function parcel(color,from,next){
  showModal({label:color==='purple'?'你找到了一份生日礼物':'你收到了一份生日礼物',
    icon:color==='purple'?'giftP':'giftO',iconType:'giftfill',title:'有一份心意，写着你的名字。',
    body:'<div class="m-sub">'+from+'</div>',
    btn:'拆开礼物',btnIc:'🎁',btnFn(){BirMusic.ding();next();}});
}
function gainHeart(){
  S.hearts++;updateProgress();
  if(S.hearts>=5&&!S.opened){centerToast('五份心意都找齐了，去客厅中央看看那个大礼物盒吧。',5000);}
}
function modalClock(){
  S.clues.clock=true;
  showModal({label:'你发现了一条线索',icon:'clock',iconType:'',title:'留住下午',
    body:'<div style="font-size:30px;font-weight:700;color:#544a3c;letter-spacing:6px;margin:6px 0">4:20</div>挂钟停在 4 点 20 分。\n钟背后的小字写着：先记下时针，再写下两位分钟。\n这是我们约好再见面的时间。',
    extra:noteBox('已记入探索手记，可以随时回看。')});
}
function modalDresser(){
  showModal({label:'朋友留给你的小机关',icon:'lock',iconType:'',title:'约好的那个时间',
    body:'抽屉上是一把三位数字锁。\n纸条写着："时针在前，分钟在后。"',
    extra:'<div style="font-size:11px;color:#9a8d78;letter-spacing:2px;margin-top:12px">三位密码</div>'+
      '<div class="pw-row"><input class="pw-box" maxlength="1" inputmode="numeric"><input class="pw-box" maxlength="1" inputmode="numeric"><input class="pw-box" maxlength="1" inputmode="numeric"></div>'+
      noteBox('手记：挂钟停在 4 点 20 分。'),
    btn:'试着打开',btnIc:'🔑',
    onOpen(){
      const boxes=[...document.querySelectorAll('.pw-box')];
      boxes[0].focus();
      boxes.forEach((b,i)=>b.addEventListener('input',()=>{if(b.value&&i<2)boxes[i+1].focus();}));
      window._modalCleanup=()=>{};
    },
    btnFn(){
      const v=[...document.querySelectorAll('.pw-box')].map(b=>b.value).join('');
      if(v==='420'){S.done.drawer=true;unlockDrawer();}
      else{BirMusic.errSfx();document.querySelectorAll('.pw-box').forEach(b=>{b.classList.add('shake');b.value='';});setTimeout(()=>document.querySelectorAll('.pw-box').forEach(b=>b.classList.remove('shake')),450);}
    }});
}
function unlockDrawer(){
  BirMusic.unlockChime();S.unlocked++;updateProgress();openDrawerAnim();
  showModal({label:'',icon:'gift',iconType:'',title:'小机关解开了。',
    body:hlBox('咔哒。转轮对齐了，抽屉里藏着一份礼物。'),
    btn:'看看里面的礼物',btnIc:'🎁',btnFn(){parcel('orange','来自 七七 · 藏在窗边的斗柜里',memory2);}});
}
function memory2(){showModal({label:'一份你帮忙找到的心意',icon:'cam',iconType:'pink',title:'把日常留住',
  body:'送你一台装满快乐的相机。\n记得拍下吃到的好吃的，偶遇的小猫，还有你自己。\n普通的日子，也值得被认真收藏。',
  extra:'<div class="m-sub">来自 七七 的生日祝福 <span class="m-hearts">♥</span></div>'+noteBox('一台小相机，第一张合照的位置，记得留给我。'),
  btn:'收好这份心意',btnIc:'✓',btnFn(){closeModal();gainHeart();}});}
function modalSill(){
  const ok=S.hasCan;
  showModal({label:'朋友留给你的小机关',icon:'sprout',iconType:'leaf',title:'它在等一小口水。',
    body:'窗边的绿植耷着叶子。\n花盆上写着："请先把我救活，再看看叶子下面。"',
    extra:noteBox(ok?'口袋里有水壶，可以浇水。':'口袋里还没有水壶，绿植角也许有。'),
    btn:ok?'轻轻浇一点水':null,btnIc:'💧',btnFn(){
      if(!ok)return;
      S.done.plant=true;BirMusic.unlockChime();S.unlocked++;updateProgress();
      perkPlant();
      showModal({label:'',icon:'gift',iconType:'',title:'小机关解开了。',
        body:hlBox('叶子慢慢舒展开了！花盆里有一份礼物，还有一把挂着布牌的钥匙。')+'还发现了一把黄铜钥匙，钥匙牌上有一片沙发布料。',
        btn:'看看里面的礼物',btnIc:'🎁',btnFn(){S.hasKey=true;parcel('orange','来自 木木 · 藏在窗台的花盆里',memory3);}});
    }});
}
function perkPlant(){
  droopLeaves.forEach((d,i)=>{const t0=performance.now(),from=d.st.rotation.z,to=(i-1.5)*.18;
    (function a(){const k=Math.min(1,(performance.now()-t0)/900);d.st.rotation.z=from+(to-from)*k;
      d.lf.rotation.z=d.st.rotation.z*1.4;if(k<1)requestAnimationFrame(a);})();});
}
function memory3(){showModal({label:'一份你帮忙找到的心意',icon:'sprout',iconType:'leaf',title:'慢慢长大的勇气',
  body:'这盆小植物送给你。\n我们都可以按照自己的速度生长。\n不必着急开花，今天好好晒到太阳，就已经很棒了。',
  extra:'<div class="m-sub">来自 木木 的生日祝福 <span class="m-hearts">♥</span></div>'+noteBox('一盆小小的绿植，附赠终身养护陪伴服务。'),
  btn:'收好这份心意',btnIc:'✓',btnFn(){closeModal();gainHeart();}});}
function modalPocket(){
  const ok=S.hasKey;
  showModal({label:'朋友留给你的小机关',icon:'key',iconType:'',title:'抱枕藏着一个小口袋',
    body:'口袋拉链上扣着一把小锁。\n枕角绣着一片绿叶，像是在提醒你什么。',
    extra:noteBox(ok?'黄铜钥匙已经在口袋里。':'口袋上着锁，还差一把钥匙。'),
    btn:ok?'用钥匙打开':null,btnIc:'🔑',btnFn(){
      if(!ok)return;
      S.done.pocket=true;BirMusic.unlockChime();S.unlocked++;updateProgress();
      showModal({label:'',icon:'gift',iconType:'',title:'小机关解开了。',
        body:hlBox('钥匙正好合适，小口袋打开了。里面的礼物还带着暖意。'),
        btn:'看看里面的礼物',btnIc:'🎁',btnFn(){parcel('orange','来自 小满 · 藏在沙发的小口袋里',memory4);}});
    }});
}
function memory4(){showModal({label:'一份你帮忙找到的心意',icon:'heart',iconType:'pink',title:'一颗柔软的心',
  body:'累的时候就窝进沙发吧。\n不用急着变成很厉害的大人。\n新的一岁，希望你有很多很多可以安心偷懒的下午。',
  extra:'<div class="m-sub">来自 小满 的生日祝福 <span class="m-hearts">♥</span></div>'+noteBox('一只亲手缝的小抱枕，附一个随时有效的拥抱。'),
  btn:'收好这份心意',btnIc:'✓',btnFn(){closeModal();gainHeart();}});}
function modalPlayer(){
  if(!S.hasRecord){centerToast('唱片机空转着，好像少了些什么。');return;}
  if(S.done.song){centerToast('黑胶转着，音乐正响。');return;}
  let seq=[];
  showModal({label:'朋友留给你的小机关',icon:'music',iconType:'plain',title:'把熟悉的旋律找回来',
    body:'你把书架里找到的唱片放了上去。\n按封套刻字的顺序，弹奏三个音。',
    extra:noteBox('唱片已放入 · 按键同时显示音名，无需听音辨认')+
      '<div class="notes">'+
      '<button class="note-btn" data-n="do"><span class="en">DO</span><span class="zh">哆</span></button>'+
      '<button class="note-btn" data-n="mi"><span class="en">MI</span><span class="zh">咪</span></button>'+
      '<button class="note-btn" data-n="sol"><span class="en">SOL</span><span class="zh">唆</span></button></div>'+
      noteBox('封套刻字：SOL → MI → DO')+
      '<div id="noteStatus" style="font-size:11.5px;color:#9a8d78;margin-top:10px;letter-spacing:1px">等待你的旋律</div>'+
      '<span class="m-link" id="replay">重新弹奏</span>',
    onOpen(){
      const st=$('noteStatus');
      $('replay').onclick=()=>{seq=[];st.textContent='等待你的旋律';document.querySelectorAll('.note-btn').forEach(b=>b.classList.remove('ok'));BirMusic.clickSfx();};
      document.querySelectorAll('.note-btn').forEach(nb=>{
        nb.onclick=()=>{
          if(S.done.song)return;
          const n=nb.dataset.n;BirMusic.noteTone(n);nb.classList.add('ok');seq.push(n);
          st.textContent='已弹：'+seq.map(s=>s.toUpperCase()).join(' → ');
          if(seq.length===3){
            if(seq.join()==='sol,mi,do'){S.done.song=true;setTimeout(unlockSong,350);}
            else{BirMusic.errSfx();setTimeout(()=>{seq=[];st.textContent='好像不太对，再试一次';document.querySelectorAll('.note-btn').forEach(b=>b.classList.remove('ok'));},300);}
          }
        };});
      window._modalCleanup=()=>{};
    }});
}
function unlockSong(){
  BirMusic.unlockChime();S.unlocked++;updateProgress();
  vinylSpin=true;
  showModal({label:'',icon:'gift',iconType:'',title:'小机关解开了。',
    body:hlBox('音对了！黑胶轻轻转了起来，唱针下藏着一份礼物。'),
    btn:'看看里面的礼物',btnIc:'🎁',btnFn(){parcel('purple','来自 阿乐 · 藏在角落的唱片机里',memory5);}});
}
function memory5(){showModal({label:'一份你帮忙找到的心意',icon:'music',iconType:'pink',title:'只属于你的旋律',
  body:'这首歌里，有我们一起走过的傍晚。\n无论新的一岁会遇见什么，都希望你还记得：\n你一直被惦记着，也一直被爱着。',
  extra:'<div class="m-sub">来自 阿乐 的生日祝福 <span class="m-hearts">♥</span></div>'+noteBox('一张生日黑胶唱片，B面写着「明年也要一起过」。'),
  btn:'收好这份心意',btnIc:'✓',btnFn(){closeModal();gainHeart();}});}

/* ── 开盒大戏 ── */
function openGift(){
  if(S.opened)return;S.opened=true;
  hint(null);
  if(!S.night)setDay(true);
  $('openingCaption').classList.remove('hidden');
  BirMusic.stopAmbient();
  // 发光面可见
  [pwT,pwB,pwL,pwR].forEach(p=>{p.gp.visible=true;});
  const t0=performance.now();
  glowL.position.set(GIFT.x,tblY+.35,GIFT.z);
  (function anim(){
    const k=Math.min(1,(performance.now()-t0)/2600);
    const e=1-Math.pow(1-k,2.2);
    // 盖子升起+淡出
    gLid.position.y=e*1.25;gLid.rotation.x=e*.18;
    const lo=Math.max(0,1-Math.max(0,(e-.35))/.45);
    [lid,lr1,lr2].forEach(m=>{m.material.transparent=true;m.material.opacity=lo;});
    gLid.traverse(o=>{if(o.material&&!o.userData._u){o.material=o.material.clone();o.material.transparent=true;o.userData._u=1;}o.material&&(o.material.opacity=lo);});
    // 内发光
    const gl=Math.min(1,e*1.4);
    [pwT,pwB,pwL,pwR].forEach(p=>{p.gp.material.emissive=new THREE.Color(0xc9a94e);p.gp.material.opacity=gl;});
    glowL.intensity=e*1.6;
    // 四壁向外倒平（铰链在底部）
    const a=Math.min(1,Math.max(0,(k-.25)/.55));
    const A=a*Math.PI/2*.98;
    pwT.pv.rotation.x=A;      // 南壁向南倒
    pwB.pv.rotation.x=-A;     // 北壁向北倒
    pwL.pv.rotation.z=A;      // 西壁向西倒
    pwR.pv.rotation.z=-A;     // 东壁向东倒
    // 蛋糕升起
    if(k>.45){
      cakeGrp.visible=true;
      const ck=Math.min(1,(k-.45)/.4);
      cakeGrp.scale.setScalar(.2+ck*.8);
      cakeGrp.position.y=tblY+.09-.3*(1-ck);
    }
    if(k<1)requestAnimationFrame(anim);
    else{
      gLid.visible=false;
      candleL.intensity=1.1;candleL.position.set(GIFT.x,tblY+.75,GIFT.z);
      $('openingCaption').classList.add('hidden');
      startBirthdayPhase();
    }
  })();
}
function startBirthdayPhase(){
  BirMusic.playSong();
  $('playingPill').classList.remove('hidden');
  $('tbNav').innerHTML='<span class="phase">✦ 月光小屋</span><span class="dot">·</span><span style="color:#9fb08c">小屋为你留灯</span>';
  showNightPanel();
  // 猫走到桌边
  moveCatTo(GIFT.x-1.05,0,GIFT.z+.75,1.9);
}
function showNightPanel(){
  const np=$('nightPanel');
  np.innerHTML=
   '<button class="np-close" id="npClose">✕</button>'+
   '<div class="m-label">五份礼物，和好多好多的喜欢</div>'+
   '<div class="m-title" style="margin:12px 0 8px">现在，把时间留给你。</div>'+
   '<div class="m-body" style="white-space:pre-line">闭上眼睛，悄悄许一个愿望。\n不用说出来，我们也会陪它慢慢实现。</div>'+
   '<div class="player dark"><div class="p-ic">♪</div><div class="p-t"><div class="p-name">祝你生日快乐</div><div class="p-sub">八音盒纯音乐 · 来自角落的黑胶机</div></div><button class="p-btn" id="npSong">暂停</button></div>'+
   '<button class="m-btn" id="npBlow"><span>许好啦，吹灭蜡烛</span><span class="m-btn-ic">✨</span></button>';
  np.classList.remove('hidden');
  $('npClose').onclick=()=>np.classList.add('hidden');
  $('npSong').onclick=function(){
    if(BirMusic.isSongPlaying()){BirMusic.stopSong();this.textContent='播放';$('playingPill').classList.add('hidden');}
    else{BirMusic.playSong();this.textContent='暂停';$('playingPill').classList.remove('hidden');}
  };
  $('npBlow').onclick=blowCandle;
}
function blowCandle(){
  if(S.blew)return;S.blew=true;
  $('nightPanel').classList.add('hidden');
  BirMusic.blowSfx();
  const t0=performance.now();
  (function a(){const k=Math.min(1,(performance.now()-t0)/500);
    flame.scale.setScalar(1-k);flameGlow.material.opacity=.28*(1-k);
    candleL.intensity=1.1*(1-k);
    if(k<1)requestAnimationFrame(a);
    else{flame.visible=false;flameGlow.visible=false;candle.visible=false;candleL.intensity=0;setTimeout(showLetter,600);}})();
}
function showLetter(){
  const m=$('modalCard');m.classList.add('letter');
  // 彩带
  const cols=['#d9a5a0','#9cb987','#d9b36a','#8fafa0'];
  for(let i=0;i<14;i++){const c=document.createElement('div');c.className='confetti';
    c.style.left=(6+Math.random()*88)+'%';c.style.top=(-4-Math.random()*30)+'%';
    c.style.background=cols[i%4];c.style.animationDelay=(Math.random()*3)+'s';c.style.animationDuration=(3+Math.random()*2)+'s';
    m.appendChild(c);}
  showModal({label:'',icon:'heart',iconType:'plain',
    title:'<span class="caps" style="display:block;font-size:9px;letter-spacing:3.5px;color:#b8ab92;margin-bottom:10px">HAPPY BIRTHDAY TO YOU</span>亲爱的你，生日快乐。',
    body:'愿你新的一岁，有说走就走的勇气，\n也有随时可以回来的地方。\n\n不必每一天都闪闪发光。\n你在这里，就已经很好。\n<div class="big-line">我们一直都在。</div><div class="sign">—— 爱你的朋友们</div>',
    extra:'<div class="player"><div class="p-ic">♪</div><div class="p-t"><div class="p-name">祝你生日快乐</div><div class="p-sub">八音盒纯音乐 · 来自角落的黑胶机</div></div><button class="p-btn" id="ltSong">暂停</button></div>',
    btn:'再在小屋待一会儿',btnIc:'🎁',
    onOpen(){
      $('ltSong').onclick=function(){
        if(BirMusic.isSongPlaying()){BirMusic.stopSong();this.textContent='播放';}
        else{BirMusic.playSong();this.textContent='暂停';}
      };
      window._modalCleanup=()=>{m.classList.remove('letter');m.querySelectorAll('.confetti').forEach(c=>c.remove());};
    },
    btnFn(){
      closeModal();
      backToDay();
    }});
}
function backToDay(){
  setDay(false);
  $('playingPill').classList.add('hidden');
  $('tbNav').innerHTML='<span class="phase"><svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>午后</span><span class="dot">·</span><a class="nav-it" data-room="living">客厅</a><span class="sep">/</span><a class="nav-it" data-room="read">阅读角</a><span class="sep">/</span><a class="nav-it" data-room="plant">绿植角</a>';
  // 收走花瓣与发光
  const parts=[pwT,pwB,pwL,pwR];
  parts.forEach(p=>{p.w.material.transparent=true;p.gp.material.transparent=true;});
  const t0=performance.now();
  (function a(){const k=Math.min(1,(performance.now()-t0)/700);
    parts.forEach(p=>{p.w.material.opacity=1-k;p.gp.material.opacity=Math.max(0,p.gp.material.opacity*(1-k));});
    glowL.intensity*= (1-k*.3);
    if(k<1)requestAnimationFrame(a);
    else{parts.forEach(p=>{p.pv.visible=false;});gBase.visible=false;glowL.intensity=0;}
  })();
}

/* ── 猫走动 ── */
function moveCatTo(x,z,ry,dur){
  const from={x:cat.position.x,z:cat.position.z,r:cat.rotation.y},t0=performance.now();
  (function a(){const k=Math.min(1,(performance.now()-t0)/dur/1000),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    cat.position.x=from.x+(x-from.x)*e;cat.position.z=from.z+(z-from.z)*e;
    cat.position.y=.16+Math.abs(Math.sin(e*Math.PI*4))*.03;
    cat.rotation.y=from.r+(ry-from.r)*e;
    if(k<1)requestAnimationFrame(a);else cat.position.y=.16;})();
}

/* ── 交互分发 ── */
function interact(key){
  switch(key){
    case 'switch':
      if(S.opened&&!S.blew){centerToast('烛光时刻，就先不开灯了吧。');break;}
      setDay(!S.night);BirMusic.clickSfx();
      hint(S.night?'灯关掉了，房间一下子安静下来。':'灯亮起来了，继续探索吧。');break;
    case 'can':if(!S.hasCan)modalWaterCan();else centerToast('水壶已经在口袋里啦。');break;
    case 'desk':modalDesk();break;
    case 'shelf':if(S.done.shelf)centerToast('三本书已排好，暗格空了。');else modalShelf();break;
    case 'clock':modalClock();break;
    case 'dresser':if(S.done.drawer)centerToast('抽屉已经打开，礼物收好了。');else modalDresser();break;
    case 'sill':if(S.done.plant)centerToast('植物喝饱了水，精神多了。');else modalSill();break;
    case 'pillow':if(S.done.pocket)centerToast('小口袋空了，礼物收好了。');else modalPocket();break;
    case 'player':modalPlayer();break;
    case 'gift':
      if(S.opened)return;
      if(S.unlocked>=5)openGift();
      else centerToast('礼物盒系得好紧……好像还要解开朋友们的 '+(5-S.unlocked)+' 个小机关。');
      break;
    case 'cake':
      if(S.opened&&!S.blew)showNightPanel();
      break;
    case 'cat':
      if(!cat.visible)break;
      BirMusic.meowSfx();
      if(!catJump){catJump=true; // 跳跃锁：连点不叠加
        const t0=performance.now();
        (function a(){const k=Math.min(1,(performance.now()-t0)/450);
          cat.position.y=.16+Math.sin(k*Math.PI)*.12;
          if(k<1)requestAnimationFrame(a);else{cat.position.y=.16;catJump=false;}})();}
      centerToast(['喵～它舒服地眯起了眼。','它蹭了蹭你的手，尾巴翘得高高的。','喵呜——今天它也来为你庆祝。'][Math.floor(Math.random()*3)]);
      break;
  }
}

/* ═════════ 控制 ═════════ */
const keys={};
let yaw=0, pitch=-.05;   // 面向北墙（窗户）
let locked=false, catJump=false;
addEventListener('keydown',e=>{
  if(!$('modalMask').classList.contains('hidden'))return;
  keys[e.code]=true;
  if(e.code==='KeyE')tryInteract();
});
addEventListener('keyup',e=>keys[e.code]=false);
let px=0,py=0,moved=0;
// 点击画面锁定鼠标，之后移动鼠标直接转头；Esc 释放
canvas.addEventListener('click',e=>{
  if(!S.started)return;
  if(locked){ // 已锁定：准星处交互
    const k=pick(W()/2,H()/2);if(k)interact(k);
  }else{
    clickPick(e); // 未锁定：这次点击仍可点中物体
    if($('modalMask').classList.contains('hidden')&&canvas.requestPointerLock)canvas.requestPointerLock();
  }
});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===canvas;
  $('crosshair').classList.toggle('hidden',!locked);});
addEventListener('mousemove',e=>{
  if(locked){
    yaw-=e.movementX*.0032;
    pitch=Math.max(-.9,Math.min(.7,pitch-e.movementY*.0028));
    hoverCheck(W()/2,H()/2);
  }else hoverCheck(e.clientX,e.clientY);
});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  camera.fov=Math.max(38,Math.min(72,camera.fov+e.deltaY*.02));
  camera.updateProjectionMatrix();
},{passive:false});
// 触屏
let tDrag=false;
canvas.addEventListener('touchstart',e=>{
  const t=e.touches[0];px=t.clientX;py=t.clientY;moved=0;tDrag=true;
},{passive:true});
canvas.addEventListener('touchmove',e=>{
  const t=e.touches[0];const dx=t.clientX-px,dy=t.clientY-py;px=t.clientX;py=t.clientY;moved+=Math.abs(dx)+Math.abs(dy);
  yaw-=dx*.005;pitch=Math.max(-.9,Math.min(.7,pitch-dy*.004));
},{passive:true});
canvas.addEventListener('touchend',()=>{
  if(tDrag&&moved<8)tryInteract();
  tDrag=false;
});
// 双指缩放
canvas.addEventListener('gesturechange',e=>{e.preventDefault();camera.fov=Math.max(38,Math.min(72,camera.fov/e.scale));camera.updateProjectionMatrix();});

const ray=new THREE.Raycaster(),mv=new THREE.Vector2();
function pick(cx,cy){
  mv.set(cx/W()*2-1,-(cy/H())*2+1);
  ray.setFromCamera(mv,camera);
  const hits=ray.intersectObjects(interactables,true);
  for(const h of hits){
    let o=h.object, vis=true;
    for(let p=o;p;p=p.parent)if(!p.visible){vis=false;break;} // 整条链可见才算
    if(!vis)continue;
    while(o&&!o.userData.key)o=o.parent;
    if(o)return o.userData.key;
  }
  return null;
}
function clickPick(e){const k=pick(e.clientX,e.clientY);if(k)interact(k);}
function tryInteract(){
  if(!S.started)return;
  let k=pick(W()/2,H()/2);
  if(!k){ // 找最近
    let best=null,bd=2.3;
    interactables.forEach(o=>{
      let vis=true;for(let p=o;p;p=p.parent)if(!p.visible){vis=false;break;}
      if(!vis)return;
      const p=new THREE.Vector3();o.getWorldPosition(p);
      const d=p.distanceTo(camera.position);
      if(d<bd){bd=d;best=o.userData.key;}});
    k=best;
  }
  if(k)interact(k);
}
let hoverT=0;
function hoverCheck(cx,cy){
  const now=performance.now();if(now-hoverT<90)return;hoverT=now;
  const k=pick(cx,cy);
  canvas.classList.toggle('act',!!k);
  $('crosshair').classList.toggle('act',!!k);
  if(k&&S.started){
    const labels={player:'唱片角落的唱片机',gift:'客厅中央的大礼物盒'};
    if(k==='cake'&&!S.blew)hint('探索生日蛋糕');
    else hint(labels[k]||'走近看看，也许藏着一份心意');
  }
}

/* 碰撞（简单圆形阻挡） */
const blockers=[
  {x:0,z:0,r:1.0},        // 圆桌
  {x:-5.5,z:-1.1,r:1.25}, // 沙发
  {x:-5.3,z:.9,r:.75},    // 单人沙发
  {x:-3.1,z:1.75,r:.5},   // 唱片凳
  {x:-2.5,z:2.5,r:.45},   // 猫窝
  {x:6.0,z:-2.5,r:.75},   // 书架
  {x:5.9,z:-.4,r:.8},     // 书桌
  {x:5.25,z:-.4,r:.45},   // 椅子
  {x:1.3,z:-5.05,r:.7},   // 斗柜
  {x:3.4,z:1.0,r:.45},    // 大植物
  {x:2.35,z:1.85,r:.5},   // 边几
  {x:3.0,z:2.35,r:.4}     // 礼物袋
];
function collide(nx,nz){
  nx=Math.max(-RX+.4,Math.min(RX-.4,nx));nz=Math.max(-RZ+.4,Math.min(RZ-.4,nz));
  for(const b of blockers){
    const dx=nx-b.x,dz=nz-b.z,d=Math.hypot(dx,dz);
    if(d<b.r&&d>1e-4){nx=b.x+dx/d*b.r;nz=b.z+dz/d*b.r;}
  }
  return [nx,nz];
}

/* ── UI 按钮 ── */
$('btnEnter').onclick=()=>{
  $('introMask').classList.add('hidden');
  S.started=true;
  BirMusic.ensure();BirMusic.startAmbient();
  hint('走近看看，也许藏着一份心意');
};
let musicMuted=false;
$('btnMusic').onclick=function(){
  musicMuted=!musicMuted;
  this.classList.toggle('on',!musicMuted);
  $('musicText').textContent=musicMuted?'音乐已暂停':'音乐已开启';
  BirMusic.ensure();
  if(musicMuted){BirMusic.stopAmbient();BirMusic.stopSong();}
  else if(!S.opened)BirMusic.startAmbient();
};
$('btnMusic').classList.add('on');
$('btnHelp').onclick=()=>{
  showModal({label:'玩法说明',icon:'book',iconType:'plain',title:'怎么逛这个小屋？',
    body:'WASD 行走，按住鼠标拖动转头。\n靠近会发光提示的地方，点击或按 E 互动。\n\n墙上的开关管灯，书架、斗柜、唱片机里\n都藏着朋友们准备的小机关。\n\n收集齐 5 份心意，就能打开客厅中央的大礼物盒。',
    extra:noteBox('进度自动保存在这一局里；左下角 ↻ 可以重新开始。')});
};
$('btnHint').onclick=()=>{
  const tips=[];
  if(!S.hasCan)tips.push('绿植角的边几上有一只水壶，先把它拿上。');
  if(!S.clues.desk)tips.push('书桌上的明信片，也许写了书的顺序。');
  if(!S.done.shelf&&S.clues.desk)tips.push('去书架按「绿叶 → 日光 → 晚霞」的顺序按书脊。');
  if(!S.clues.clock)tips.push('阅读角的挂钟停在某个时间——记下它。');
  if(!S.done.drawer&&S.clues.clock)tips.push('斗柜的三位密码：时针在前，分钟在后。');
  if(!S.done.plant&&S.hasCan)tips.push('窗台上的植物在等一小口水。');
  if(!S.done.pocket&&S.hasKey)tips.push('沙发上抱枕的小口袋，可以用黄铜钥匙打开。');
  if(!S.done.song&&S.hasRecord)tips.push('唱片放上了唱片机——按封套刻字 SOL → MI → DO 弹三个音。');
  if(S.hearts>=5&&!S.opened)tips.push('都齐了！去客厅中央，打开那个大礼物盒吧。');
  if(S.opened&&!S.blew)tips.push('闭上眼睛许个愿，然后轻轻吹灭蜡烛。');
  if(!tips.length)tips.push('在小屋里慢慢逛逛吧。');
  centerToast(tips[0],5000);
};
$('btnNotes').onclick=()=>{
  const clues=[S.clues.desk?'· 明信片：书要按「绿叶 → 日光 → 晚霞」排列。':null,
               S.clues.clock?'· 挂钟停在 4 点 20 分——约好的时间。':null]
    .filter(Boolean).join('\n');
  const got=[['下一站，晴天','阿川','书架'],['把日常留住','七七','斗柜'],['慢慢长大的勇气','木木','窗台'],['一颗柔软的心','小满','沙发口袋'],['只属于你的旋律','阿乐','唱片机']]
    .slice(0,S.hearts).map(m=>'· 《'+m[0]+'》 —— 来自 '+m[1]+'（藏在'+m[2]+'）').join('\n');
  showModal({label:'探索手记',icon:'book',iconType:'plain',title:'口袋里的手记',
    body:(clues||'（还没有线索，多到处看看。）')+'\n\n'+(got?'已经收好的心意：\n'+got:'（还没有收到心意。）')});
};
$('btnReset').onclick=()=>{if(confirm('重新开始这一局？所有进度会清空。'))location.reload();};
// 顶部导航点击 -> 视角转向
document.addEventListener('click',e=>{
  const it=e.target.closest&&e.target.closest('.nav-it');if(!it)return;
  const r=it.dataset.room;
  if(r==='living'){yaw=0;camera.position.set(.6,1.5,3.9);}
  if(r==='read'){yaw=-1.05;camera.position.set(1.2,1.5,1.4);}
  if(r==='plant'){yaw=-.85;camera.position.set(1.6,1.5,2.6);}
  pitch=-.05;
});

/* ═════════ 主循环 ═════════ */
const clockT=new THREE.Clock();
let catTimer=0;
function tick(){
  requestAnimationFrame(tick);
  const dt=Math.min(.05,clockT.getDelta());
  // 移动
  if(S.started){
    let vx=0,vz=0;
    const sp=2.7*dt;
    if(keys.KeyW||keys.ArrowUp)vz-=1;if(keys.KeyS||keys.ArrowDown)vz+=1;
    if(keys.KeyA||keys.ArrowLeft)vx-=1;if(keys.KeyD||keys.ArrowRight)vx+=1;
    if(vx||vz){
      const l=Math.hypot(vx,vz);vx/=l;vz/=l;
      const s=Math.sin(yaw),c=Math.cos(yaw);
      const nx=camera.position.x+(vx*c+vz*s)*sp;   // 修正方向
      const nz=camera.position.z+(-vx*s+vz*c)*sp;
      const p=collide(nx,nz);camera.position.x=p[0];camera.position.z=p[1];
    }
  }
  camera.position.y=1.5;
  camera.rotation.set(0,0,0);
  camera.rotateY(yaw);camera.rotateX(pitch);
  // 气球浮动
  bal1.position.y=bal1.userData.baseY+Math.sin(performance.now()/1400)*.05;
  bal2.position.y=bal2.userData.baseY+Math.sin(performance.now()/1700+2)*.06;
  // 唱片
  if(vinylSpin)vinyl.rotation.y+=dt*2.4;
  // 火苗
  if(flame.visible){
    const n=Math.sin(performance.now()/70)*.5+Math.sin(performance.now()/31)*.5;
    flame.scale.y=1+n*.18;flameGlow.scale.setScalar(1+n*.14);
    candleL.intensity=1.05+n*.12;
  }
  // 猫出现时机：接近唱片角
  if(!S.catShown&&S.started){
    const dx=camera.position.x-(-3.1),dz=camera.position.z-1.75;
    if(Math.hypot(dx,dz)<2.6){S.catShown=true;cat.visible=true;cat.scale.setScalar(.01);
      const t0=performance.now();(function a(){const k=Math.min(1,(performance.now()-t0)/900);
        cat.scale.setScalar(.01+k*.99);if(k<1)requestAnimationFrame(a);})();}
  }
  renderer.render(scene,camera);
}
tick();
addEventListener('resize',()=>{renderer.setSize(W(),H());camera.aspect=W()/H();camera.updateProjectionMatrix();});
/* 仅供自动化测试使用的调试句柄（不影响界面） */
window.__bir={interact,state:S,musicBir:BirMusic,cat,cakeGrp,setYaw(v){yaw=v;},setPitch(v){pitch=v;},forceOpen(){S.unlocked=5;openGift();}};
})();
