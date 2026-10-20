/* 生日小屋 · WebAudio 八音盒音乐（无外部资源） */
(function(){
const AC = window.AudioContext||window.webkitAudioContext;
let ctx=null, master=null, verb=null;
function ensure(){
  if(!ctx){
    ctx = new AC();
    master = ctx.createGain(); master.gain.value=.8; master.connect(ctx.destination);
    // 简易混响
    verb = ctx.createConvolver();
    const len=ctx.sampleRate*1.6, buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=buf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)*.5;}
    verb.buffer=buf;
    const vg=ctx.createGain(); vg.gain.value=.35; verb.connect(vg); vg.connect(master);
  }
  if(ctx.state==='suspended')ctx.resume();
  return ctx;
}
// 八音盒音符：正弦+泛音，快起长衰减
function pluck(freq, t, vol, dur){
  const o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain();
  o.type='sine'; o.frequency.value=freq;
  o2.type='sine'; o2.frequency.value=freq*3.01;
  const g2=ctx.createGain(); g2.gain.value=.18;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(vol,t+.008);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g); o2.connect(g2); g2.connect(g);
  g.connect(master); g.connect(verb);
  o.start(t); o2.start(t); o.stop(t+dur+.1); o2.stop(t+dur+.1);
}
const NOTE = n => 440*Math.pow(2,(n-69)/12); // MIDI -> Hz

/* ── 氛围音乐（小屋环境，循环） ── */
let ambTimer=null, ambOn=false;
const AMB = {
  // 每步 = 八分音符；旋律用 MIDI 音高，null 为休止
  tempo: 258, // ms per step
  // C 大调欢快小循环（I–V–IV–V），跳音动机
  melody: [79,84,79,84, 76,null,72,null, 74,79,74,79, 83,null,79,null,
           77,84,77,84, 81,null,77,null, 79,83,79,74, 72,null,76,null,
           72,76,79,76, 84,null,79,null, 74,79,83,79, 81,null,79,null,
           77,81,84,81, 79,null,77,null, 74,79,83,79, 72,null,null,null],
  bass:   [48,null,48,null, 55,null,55,null, 53,null,53,null, 55,null,55,null,
           48,null,48,null, 55,null,55,null, 53,null,53,null, 55,null,55,null]
};
function ambStep(){
  if(!ambOn)return;
  const t=ctx.currentTime+.05;
  const i=ambI%AMB.melody.length;
  if(AMB.melody[i]!=null)pluck(NOTE(AMB.melody[i]),t,.16,2.2);
  const bi=ambI%AMB.bass.length;
  if(AMB.bass[bi]!=null)pluck(NOTE(AMB.bass[bi]),t,.10,3.2);
  ambI++;
}
let ambI=0;
function startAmbient(){
  ensure();
  if(ambOn)return; ambOn=true;
  ambStep(); ambTimer=setInterval(ambStep,AMB.tempo);
}
function stopAmbient(){ ambOn=false; clearInterval(ambTimer); }

/* ── 生日快乐歌（八音盒纯音乐，柔和循环） ── */
let songTimer=null, songOn=false;
// Happy Birthday in C: 5 5 6 5 1 7 | 5 5 6 5 2 1 | 5 5 5(hi) 3 1 7 6 | 4 4 3 1 2 1
const SONG=[
  [67,.5],[67,.25],[69,.75],[67,.75],[72,.75],[71,1],
  [67,.5],[67,.25],[69,.75],[67,.75],[74,.75],[72,1],
  [67,.5],[67,.25],[79,.75],[76,.75],[72,.75],[71,1],[74,.5],
  [74,.5],[74,.25],[76,.75],[72,.75],[74,.75],[72,1.25],[0,.75]
];
function scheduleSong(){
  if(!songOn)return;
  let t=ctx.currentTime+.12;
  const beat=.72; // 慢一点更温柔
  SONG.forEach(([n,d])=>{
    if(n>0){
      pluck(NOTE(n),t,.16,d*beat*3.2);      // 主音：轻、长衰减
      pluck(NOTE(n+12),t,.035,d*beat*2.6); // 高八度：极轻泛光
      pluck(NOTE(n-12),t,.05,d*beat*3.2);  // 低八度：柔和垫底
    }
    t+=d*beat;
  });
  // 唱完稍停，无缝循环
  songTimer=setTimeout(scheduleSong,(t-ctx.currentTime)*1000+900);
}
function playSong(onend){
  ensure();
  if(songOn){stopSong();return true;}
  songOn=true; scheduleSong();
  return true;
}
function stopSong(){ songOn=false; clearTimeout(songTimer); }
function isSongPlaying(){return songOn;}

/* ── 音符按钮音效 ── */
function noteTone(which){
  ensure();
  const map={do:60,mi:64,sol:67};
  const m=map[which]||60, t=ctx.currentTime;
  pluck(NOTE(m),t,.3,1.6); pluck(NOTE(m+12),t,.1,1.2);
}

/* ── 小音效 ── */
function ding(){ ensure(); const t=ctx.currentTime; pluck(NOTE(88),t,.22,1.2); pluck(NOTE(93),t+.09,.18,1.4); }
function unlockChime(){ ensure(); const t=ctx.currentTime; [72,76,79,84].forEach((n,i)=>pluck(NOTE(n),t+i*.12,.2,1.6)); }
function clickSfx(){ ensure(); const t=ctx.currentTime; pluck(NOTE(84),t,.12,.5); }
function errSfx(){ ensure(); const t=ctx.currentTime; pluck(NOTE(64),t,.15,.6); pluck(NOTE(59),t+.12,.15,.8); }
function blowSfx(){ ensure(); const t=ctx.currentTime;
  const b=ctx.createBufferSource(),buf=ctx.createBuffer(1,ctx.sampleRate*.6,ctx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.5)*.5;
  b.buffer=buf; const f=ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=800; f.Q.value=.7;
  const g=ctx.createGain(); g.gain.value=.35; b.connect(f);f.connect(g);g.connect(master);b.start(t);
}
// 小猫「喵」：滑音合成
function meowSfx(){ ensure(); const t=ctx.currentTime;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(520,t);
  o.frequency.linearRampToValueAtTime(900,t+.15);
  o.frequency.linearRampToValueAtTime(420,t+.45);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(.2,t+.05);
  g.gain.exponentialRampToValueAtTime(.0001,t+.5);
  o.connect(g); g.connect(master); g.connect(verb);
  o.start(t); o.stop(t+.55);
}

window.BirMusic={startAmbient,stopAmbient,playSong,stopSong,isSongPlaying,noteTone,ding,unlockChime,clickSfx,errSfx,blowSfx,meowSfx,ensure};
})();
