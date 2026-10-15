/* audio.js - all sounds synthesized with WebAudio (no external assets) */
(function () {
  'use strict';

  var AC = null, master, musicGain, sfxGain, noiseBuf, musicTimer = null;
  var musicOn = true, nextNoteAt = 0, nextPadAt = 0;
  var masterVol = 0.7, musicVol = 0.6;

  function ensure() {
    if (!AC) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      AC = new Ctor();
      master = AC.createGain(); master.gain.value = masterVol; master.connect(AC.destination);
      musicGain = AC.createGain(); musicGain.gain.value = musicVol; musicGain.connect(master);
      sfxGain = AC.createGain(); sfxGain.gain.value = 1.0; sfxGain.connect(master);
      // shared white-noise buffer
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 1, AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // music "reverb": feedback delay
      var delay = AC.createDelay(1); delay.delayTime.value = 0.31;
      var fb = AC.createGain(); fb.gain.value = 0.38;
      var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      delay.connect(lp); lp.connect(fb); fb.connect(delay);
      delay.connect(musicGain);
      musicReverbIn = AC.createGain(); musicReverbIn.connect(delay); musicReverbIn.connect(musicGain);
    }
    if (AC.state === 'suspended') AC.resume();
    return true;
  }
  var musicReverbIn = null;

  function env(gainNode, t0, a, peak, dur) {
    var g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.linearRampToValueAtTime(peak, t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function noiseBurst(opts) {
    if (!ensure()) return;
    var t0 = AC.currentTime;
    var src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.freq || 800; f.Q.value = 0.7;
    if (opts.sweep) { f.frequency.setValueAtTime(opts.freq, t0); f.frequency.exponentialRampToValueAtTime(opts.sweep, t0 + opts.dur); }
    var g = AC.createGain();
    env(g, t0, 0.004, opts.vol || 0.2, opts.dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t0); src.stop(t0 + opts.dur + 0.05);
  }

  function tone(opts) {
    if (!ensure()) return;
    var t0 = AC.currentTime;
    var o = AC.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(opts.from, t0);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + (opts.dur || 0.2));
    var g = AC.createGain();
    env(g, t0, opts.attack || 0.005, opts.vol || 0.15, opts.dur || 0.2);
    o.connect(g); g.connect(sfxGain);
    o.start(t0); o.stop(t0 + (opts.dur || 0.2) + 0.05);
  }

  var DIG = {
    dirt:  { f: 900,  vol: 0.28, dur: 0.16 },
    stone: { f: 380,  vol: 0.30, dur: 0.18 },
    wood:  { f: 650,  vol: 0.26, dur: 0.15 },
    glass: { f: 2400, vol: 0.22, dur: 0.12 },
    leaves:{ f: 1300, vol: 0.20, dur: 0.10 },
    wool:  { f: 1500, vol: 0.18, dur: 0.12 }
  };

  var api = {
    init: ensure,
    setVolumes: function (m, mu) {
      masterVol = m; musicVol = mu;
      if (AC) { master.gain.value = m; musicGain.gain.value = mu; }
    },
    setMusicOn: function (on) { musicOn = on; },

    dig: function (mat, strong) {
      var p = DIG[mat] || DIG.stone;
      noiseBurst({ freq: p.f, dur: p.dur, vol: p.vol * (strong ? 1.4 : 1) });
      tone({ type: 'triangle', from: 100, to: 55, dur: p.dur, vol: 0.10 });
    },
    place: function () {
      noiseBurst({ freq: 700, dur: 0.1, vol: 0.18 });
      tone({ type: 'triangle', from: 120, to: 70, dur: 0.1, vol: 0.08 });
    },
    step: function (mat) {
      var p = DIG[mat] || DIG.dirt;
      noiseBurst({ freq: p.f * 0.8, dur: 0.06, vol: 0.07 });
    },
    splash: function () {
      noiseBurst({ freq: 1400, sweep: 400, dur: 0.45, vol: 0.25 });
      tone({ type: 'sine', from: 300, to: 180, dur: 0.2, vol: 0.06 });
    },
    hurt: function () {
      tone({ type: 'square', from: 220, to: 110, dur: 0.28, vol: 0.07 });
      noiseBurst({ freq: 500, dur: 0.15, vol: 0.1 });
    },
    pop: function () {
      tone({ type: 'sine', from: 320, to: 520, dur: 0.09, vol: 0.1 });
    },
    explosion: function () {
      noiseBurst({ freq: 260, sweep: 60, dur: 1.1, vol: 0.55 });
      tone({ type: 'sine', from: 70, to: 28, dur: 1.0, vol: 0.3 });
    },
    eat: function () {
      for (var i = 0; i < 3; i++) (function (i) {
        setTimeout(function () { noiseBurst({ freq: 1600, dur: 0.05, vol: 0.1 }); }, i * 120);
      })(i);
    },

    // ---------- generative ambient music ----------
    update: function () {
      if (!AC || !musicOn) return;
      var now = AC.currentTime;
      var SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C pentatonic-ish
      if (now >= nextNoteAt) {
        nextNoteAt = now + 1.2 + Math.random() * 3.2;
        var oct = Math.random() < 0.3 ? 0.5 : 1;
        var f = SCALE[(Math.random() * SCALE.length) | 0] * (oct === 1 ? 1 : 0.5);
        playPluck(f, now + 0.02);
        if (Math.random() < 0.25) setTimeout(function () { playPluck(f * 2, AC.currentTime + 0.02); }, 240);
      }
      if (now >= nextPadAt) {
        nextPadAt = now + 9 + Math.random() * 10;
        var root = SCALE[(Math.random() * 4) | 0] * 0.5;
        playPad([root, root * 1.5, root * 2], now + 0.1);
      }
    }
  };

  function playPluck(freq, t0) {
    var o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    var g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.10, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
    o.connect(g); g.connect(musicReverbIn);
    o.start(t0); o.stop(t0 + 3);
  }

  function playPad(freqs, t0) {
    for (var i = 0; i < freqs.length; i++) {
      var o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = freqs[i];
      var g = AC.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.035, t0 + 2.2);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 7.5);
      o.connect(g); g.connect(musicReverbIn);
      o.start(t0); o.stop(t0 + 8);
    }
  }

  window.Audio = api;
})();
