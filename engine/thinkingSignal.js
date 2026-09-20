/**
 * Thinking indicator — single instance only.
 * Starts after wake-armed processing; stops when spoken synthesis begins.
 * A newer start/stop always cancels any previous loop (no stacked audio).
 */
(function () {
  'use strict';
  if (window.__aioThinkingSignalInstalled) return;
  window.__aioThinkingSignalInstalled = true;

  function enabled() {
    try {
      var v = localStorage.getItem('aio_thinkingSignal');
      return v === '1' || v === 'true';
    } catch (_) {
      return false;
    }
  }

  var ctx = null;
  var master = null;
  var stopFn = null;
  var fading = false;
  var gen = 0; // bumped on every start/stop — invalidates in-flight async work

  function midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function note(audioCtx, dest, t, o) {
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    var f = audioCtx.createBiquadFilter();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.lp || 5000, t);
    var vol = (o.vol != null ? o.vol : 0.5) * 0.55;
    var a = o.a != null ? o.a : 0.005;
    var dur = o.dur != null ? o.dur : 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, dur));
    osc.connect(f);
    f.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.08);
  }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    return ctx;
  }

  function rebuildMaster() {
    if (!ctx) return;
    try {
      if (master) master.disconnect();
    } catch (_) {}
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }

  function unlock() {
    var c = ensureCtx();
    if (!c) return Promise.resolve(false);
    if (c.state === 'running') return Promise.resolve(true);
    return c.resume().then(function () {
      return c.state === 'running';
    }).catch(function () {
      return false;
    });
  }

  function armUnlock() {
    unlock();
  }
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(function (ev) {
    window.addEventListener(ev, armUnlock, { passive: true, capture: true });
  });
  window.addEventListener('audioConsoleWakeSound', armUnlock);

  function hardStopScheduler() {
    if (stopFn) {
      try {
        stopFn();
      } catch (_) {}
      stopFn = null;
    }
  }

  /** Kill any playing/scheduled notes immediately (no stack). */
  function hardKill() {
    gen++;
    hardStopScheduler();
    fading = false;
    if (ctx && master) {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
      } catch (_) {}
      rebuildMaster();
    }
  }

  function startLoop() {
    if (!enabled()) return;
    if (!window.__ac41HadWakeForSignal) {
      console.log('[thinkingSignal] skip — no wake for this cycle');
      return;
    }

    hardKill();
    var myGen = gen;
    fading = false;

    unlock().then(function () {
      if (myGen !== gen) return; // superseded by newer start/stop
      if (!enabled() || !window.__ac41HadWakeForSignal) return;
      var c = ensureCtx();
      if (!c || !master) return;
      if (c.state !== 'running') c.resume().catch(function () {});

      try {
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.setValueAtTime(0.65, c.currentTime);
      } catch (_) {}

      var m = [0, 7, 3, 10, 7, 12, 3, 7];
      var i = 0;
      var nextT = c.currentTime + 0.1;
      var timer = null;
      var stopped = false;

      function tick() {
        if (stopped || myGen !== gen) return;
        var now = c.currentTime;
        if (nextT < now - 0.05) nextT = now + 0.05;
        while (nextT < now + 0.45) {
          var f = midi(45 + m[i % 8] + (i % 32 >= 16 ? 5 : 0));
          note(c, master, nextT, { f: f, dur: 0.5, vol: 0.75, a: 0.003 });
          note(c, master, nextT, { type: 'triangle', f: f * 2, dur: 0.25, vol: 0.25, a: 0.002, lp: 2000 });
          note(c, master, nextT, { f: f * 6, dur: 0.05, vol: 0.08, a: 0.001 });
          nextT += i % 8 === 7 ? 0.55 : 0.2;
          i++;
        }
        timer = setTimeout(tick, 50);
      }
      tick();
      stopFn = function () {
        stopped = true;
        if (timer) clearTimeout(timer);
        timer = null;
      };
      console.log('[thinkingSignal] playing gen=' + myGen);
    });
  }

  function fadeOut(ms) {
    if (ms === 0 || ms === '0') {
      hardKill();
      window.__ac41HadWakeForSignal = false;
      return;
    }
    if (!stopFn && !master) {
      window.__ac41HadWakeForSignal = false;
      return;
    }
    if (fading) {
      hardKill();
      window.__ac41HadWakeForSignal = false;
      return;
    }
    fading = true;
    var myGen = gen;
    var durMs = ms != null ? ms : 700;
    var c = ctx;
    if (c && master) {
      var t0 = c.currentTime;
      try {
        master.gain.cancelScheduledValues(t0);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value || 0.65), t0);
        master.gain.linearRampToValueAtTime(0.0001, t0 + durMs / 1000);
      } catch (_) {}
      setTimeout(function () {
        if (myGen !== gen) return;
        hardStopScheduler();
        fading = false;
        rebuildMaster();
      }, durMs + 80);
    } else {
      hardKill();
    }
    window.__ac41HadWakeForSignal = false;
  }

  window.AioThinkingSignal = {
    start: startLoop,
    stop: fadeOut,
    kill: hardKill,
    unlock: unlock,
    enabled: enabled
  };

  window.addEventListener('audioConsoleProcessing', startLoop);
  window.addEventListener('akari:tts-start', function () {
    fadeOut(700);
  });

  function wrapSpeak() {
    if (typeof window.speak !== 'function' || window.speak.__aioSignalWrapped) {
      return typeof window.speak === 'function';
    }
    var orig = window.speak;
    window.speak = function () {
      try {
        window.dispatchEvent(new CustomEvent('akari:tts-start'));
      } catch (_) {}
      fadeOut(700);
      return orig.apply(this, arguments);
    };
    window.speak.__aioSignalWrapped = true;
    return true;
  }
  if (!wrapSpeak()) {
    var tries = 0;
    var iv = setInterval(function () {
      if (wrapSpeak() || ++tries > 80) clearInterval(iv);
    }, 400);
  }
})();
