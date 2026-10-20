/* ============================================================
   音频系统（无外部文件，全部实时合成）
   - Env     ：环境声（时钟滴答 + 微风）—— 进入游戏即有，很淡
   - Ambient ：lo-fi 背景乐（和弦垫 + 琶音 + 黑胶噪底）—— 点击唱片机才启动
   - Birthday：生日快乐歌（音乐盒版）—— 礼物盒打开时才响起
   - SFX     ：点击 / 出错 / 解锁 / 心意 / 钟声 / 吹气 / 猫叫 / 收进口袋 / 唱针落下
   ============================================================ */
(function () {
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const N = { G3:196, C4:261.63, E4:329.63, F4:349.23, G4:392, A4:440, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880, C6:1046.5, E6:1318.5 };

  /* ---------- 生日快乐歌旋律（音乐盒） ---------- */
  const MEL = [
    ['G4',.75],['G4',.25],['A4',1],['G4',1],['C5',1],['B4',1.75],[null,.25],
    ['G4',.75],['G4',.25],['A4',1],['G4',1],['D5',1],['C5',1.75],[null,.25],
    ['G4',.75],['G4',.25],['G5',1],['E5',1],['C5',1],['B4',1],['A4',1.75],[null,.25],
    ['F5',.75],['F5',.25],['E5',1],['C5',1],['D5',1],['C5',1.75],[null,1.25],
  ];
  const BASS = ['C4','G3','C4','F4'];
  const ARP  = ['C5','E5','G5','C6'];

  /* ---------- 唱片机启动小旋律（一段轻快的八音盒乐句，让用户明确感知"点了才有声"） ---------- */
  const PLAYER_INTRO = [
    ['E5',.3],['G5',.3],['E5',.3],['C5',.3],['D5',.45],[null,.15],
    ['G4',.3],['B4',.3],['D5',.3],['G5',.45],[null,.15],
  ];

  /* ---------- lo-fi 氛围和弦进行 ---------- */
  const CHORDS = [
    [48,52,55,59], [45,48,52,55], [41,45,48,52], [43,47,50,55],
  ];

  const AudioBox = {
    ctx:null, master:null, muted:false,
    envOn:false, ambientOn:false, birthdayOn:false,
    aTimer:null, bTimer:null, tickTimer:null, windSrc:null,
    aNext:0, bNext:0, aStep:0, bStep:0, aChord:0,
    beat:.5, bright:false,
    vinyl:null,

    ensure(){
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : .9;
      this.master.connect(this.ctx.destination);
    },
    now(){ this.ensure(); return this.ctx.currentTime; },
    setMuted(m){ this.muted = m; if (this.master) this.master.gain.value = m ? 0 : .9; },

    /* 基础音色 */
    tone(f, t, dur, vol=.15, type='triangle', dest, glideTo){
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (glideTo) o.frequency.linearRampToValueAtTime(glideTo, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + .014);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(dest || this.master);
      o.start(t); o.stop(t + dur + .06);
    },
    padNote(midi, t, dur, vol){
      const f = mtof(midi);
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'lowpass'; flt.frequency.value = 780; flt.Q.value = .4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * .35);
      g.gain.linearRampToValueAtTime(0, t + dur);
      flt.connect(g); g.connect(this.master);
      [-6, 5].forEach(cents => {
        const o = this.ctx.createOscillator();
        o.type = 'triangle'; o.frequency.value = f; o.detune.value = cents;
        o.connect(flt); o.start(t); o.stop(t + dur + .1);
      });
    },
    noiseBurst(t, dur, vol=.2, freq=900){
      const len = this.ctx.sampleRate * dur, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const flt = this.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = freq;
      const g = this.ctx.createGain(); g.gain.value = vol;
      src.connect(flt); flt.connect(g); g.connect(this.master); src.start(t);
    },

    /* ---------- 环境声（进入游戏即播放，很淡） ---------- */
    startEnv(){
      this.ensure(); this.ctx.resume();
      if (this.envOn) return;
      this.envOn = true;
      // 微风：循环白噪声 + 低通
      const len = this.ctx.sampleRate * 3, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * .3;
      this.windSrc = this.ctx.createBufferSource(); this.windSrc.buffer = buf; this.windSrc.loop = true;
      const flt = this.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 420;
      const g = this.ctx.createGain(); g.gain.value = .018;
      this.windSrc.connect(flt); flt.connect(g); g.connect(this.master);
      this.windSrc.start();
      // 时钟滴答：每 1.1 秒一声
      this.tickTimer = setInterval(() => {
        const t = this.now();
        this.tone(2200, t, .03, .025, 'square');
        this.noiseBurst(t, .02, .012, 3000);
      }, 1100);
    },

    /* ---------- lo-fi 背景乐（点击唱片机才启动） ---------- */
    startAmbient(){
      this.ensure(); this.ctx.resume();
      if (this.ambientOn) return;
      this.ambientOn = true; this.aNext = this.ctx.currentTime + .6; this.aStep = 0;
      // 唱针落下的噪声 + 黑胶噪底
      const t0 = this.ctx.currentTime;
      this.noiseBurst(t0, .35, .18, 1800);
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * .5;
      this.vinyl = this.ctx.createBufferSource(); this.vinyl.buffer = buf; this.vinyl.loop = true;
      const flt = this.ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 3200;
      const g = this.ctx.createGain(); g.gain.value = .014;
      this.vinyl.connect(flt); flt.connect(g); g.connect(this.master);
      this.vinyl.start();
      // 唱片机启动乐句（让用户明确感知"点了才有声"）
      let pt = t0 + .25;
      PLAYER_INTRO.forEach(([n, b]) => {
        if (n) this.tone(N[n], pt, b * 1.7, .12, 'sine');
        pt += b * .42;
      });
      this.aTimer = setInterval(() => this.scheduleAmbient(), 300);
      this.scheduleAmbient();
    },
    scheduleAmbient(){
      const BAR = 4.2;
      while (this.aNext < this.ctx.currentTime + 1.2){
        const t = this.aNext;
        if (this.aStep % 4 === 0){
          const ch = CHORDS[this.aChord % CHORDS.length];
          ch.forEach(m => this.padNote(m, t, BAR * 1.05, .03));
          this.padNote(ch[0] - 12, t, BAR * 1.05, .022);
          this.aChord++;
        }
        if (Math.random() < .42){
          const ch = CHORDS[(this.aChord - 1) % CHORDS.length];
          const pick = ch[Math.floor(Math.random() * ch.length)] + 12 * (Math.random() < .3 ? 2 : 1);
          this.tone(mtof(pick), t + Math.random() * .1, 1.6, .045, 'sine');
        }
        this.aNext += BAR / 4; this.aStep++;
      }
    },
    stopAmbient(){
      if (!this.ambientOn) return;
      this.ambientOn = false;
      clearInterval(this.aTimer);
      try { this.vinyl.stop(); } catch(_){}
    },

    /* ---------- 生日快乐歌（开盒时刻） ---------- */
    startBirthday(){
      this.ensure(); this.ctx.resume();
      if (this.birthdayOn) return;
      this.birthdayOn = true; this.bNext = this.ctx.currentTime + .1; this.bStep = 0;
      this.bTimer = setInterval(() => this.scheduleBirthday(), 250);
      this.scheduleBirthday();
    },
    scheduleBirthday(){
      while (this.bNext < this.ctx.currentTime + .9){
        const [n, b] = MEL[this.bStep], t = this.bNext, dur = b * this.beat;
        if (n){
          this.tone(N[n], t, dur * 1.9, .14);
          this.tone(N[n] * 2, t, dur * 1.4, .045, 'sine');
          if (this.bright) this.tone(N[n] * 4, t + .06, dur, .028, 'sine');
        }
        if (this.bStep % 7 === 0){
          const bi = Math.floor(this.bStep / 7) % BASS.length;
          this.tone(N[BASS[bi]], t, 1.6, .06, 'sine');
        }
        if (this.bright && this.bStep % 2 === 0) this.tone(N[ARP[(this.bStep / 2) % 4]], t, .5, .04, 'sine');
        this.bNext += dur; this.bStep = (this.bStep + 1) % MEL.length;
      }
    },
    goBright(){ this.bright = true; this.beat = .42; },

    /* ---------- 音效 ---------- */
    sClick(){ const t = this.now(); this.tone(620, t, .07, .05, 'triangle'); },
    sError(){ const t = this.now(); this.tone(170, t, .22, .09, 'sawtooth'); this.tone(120, t + .08, .22, .07, 'sawtooth'); },
    sUnlock(){ const t = this.now(); [660, 880, 1320].forEach((f, i) => this.tone(f, t + i * .1, .5, .1)); },
    sHeart(){ const t = this.now(); this.tone(880, t, .3, .1, 'sine'); this.tone(1318, t + .12, .55, .09, 'sine'); this.tone(1760, t + .24, .7, .05, 'sine'); },
    sPop(){ const t = this.now(); this.tone(520, t, .09, .09, 'sine', null, 160); },
    sChime(){ const t = this.now(); [880, 1108, 1318].forEach((f, i) => this.tone(f, t + i * .14, .9, .08, 'sine')); },
    sBlow(){ const t = this.now(); this.noiseBurst(t, .6, .3, 750); },
    sMeow(){ const t = this.now(); this.tone(780, t, .14, .09, 'sine', null, 620); this.tone(620, t + .13, .22, .09, 'sine', null, 900); },
    sPurr(){ const t = this.now(); this.noiseBurst(t, .5, .05, 380); },
    sSparkle(){ const t = this.now(); [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, t + i * .06, .4, .04, 'sine')); },
    sNeedle(){ const t = this.now(); this.noiseBurst(t, .25, .16, 1600); },
  };

  window.AudioBox = AudioBox;
})();
