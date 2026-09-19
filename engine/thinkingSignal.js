/**
 * Akari-AIO thinking indicator — low marimba loop.
 * Starts on audioConsoleProcessing (transcription / STT started).
 * Fades when speak / TTS starts.
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
  var unlocked = false;

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
    f.frequency.setValueAtTime(o.lp || 4000, t);
    var vol = (o.vol != null ? o.vol : 0.5) * 0.4;
    var a = o.a != null ? o.a : 0.005;
    var dur = o.dur != null ? o.dur : 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(f);
    f.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  /** Browsers block audio until a user gesture; mic wake is not always enough for a *new* context. */
  function unlock() {
    var c = ensureCtx();
    if (!c) return Promise.resolve(false);
    if (c.state === 'running') {
      unlocked = true;
      return Promise.resolve(true);
    }
    return c.resume().then(function () {
      unlocked = c.state === 'running';
      return unlocked;
    }).catch(function () {
      return false;
    });
  }

  // Prime AudioContext on first interaction so processing-time start is not silent
  function armUnlock() {
    if (!enabled()) return;
    unlock();
  }
  ['pointerdown', 'keydown', 'touchstart', 'click'].forEach(function (ev) {
    window.addEventListener(ev, armUnlock, { passive: true, capture: true });
  });
  window.addEventListener('audioConsoleWakeSound', armUnlock);
  window.addEventListener('audioConsoleSpeechStart', armUnlock);

  function hardStopScheduler() {
    if (stopFn) {
      try { stopFn(); } catch (_) {}
      stopFn = null;
    }
  }

  function startLoop() {
    if (!enabled()) {
      console.log('[thinkingSignal] skipped — aio_thinkingSignal not enabled in Settings');
      return;
    }

    // Allow restart even if a previous fade left stopFn set
    hardStopScheduler();
    fading = false;

    unlock().then(function (ok) {
      if (!enabled()) return;
      var c = ensureCtx();
      if (!c) {
        console.warn('[thinkingSignal] no AudioContext');
        return;
      }
      if (!ok && c.state !== 'running') {
        console.warn('[thinkingSignal] AudioContext still suspended — click once then retry');
        // Try one more resume; still schedule in case state flips
        c.resume().catch(function () {});
      }

      try {
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.setValueAtTime(0.5, c.currentTime);
      } catch (_) {}

      var m = [0, 7, 3, 10, 7, 12, 3, 7];
      var i = 0;
      // Schedule slightly ahead of "now" so notes are not already in the past after resume
      var nextT = c.currentTime + 0.08;
      var timer = null;
      var stopped = false;

      function tick() {
        if (stopped) return;
        var now = c.currentTime;
        // If clock was frozen while suspended, jump schedule forward
        if (nextT < now - 0.05) nextT = now + 0.05;
        while (nextT < now + 0.4) {
          var f = midi(33 + m[i % 8] + (i % 32 >= 16 ? 5 : 0));
          note(c, master, nextT, { f: f, dur: 0.5, vol: 0.7, a: 0.003 });
          note(c, master, nextT, { type: 'triangle', f: f * 2, dur: 0.25, vol: 0.2, a: 0.002, lp: 1500 });
          note(c, master, nextT, { f: f * 6, dur: 0.05, vol: 0.06, a: 0.001 });
          nextT += (i % 8 === 7) ? 0.55 : 0.2;
          i++;
        }
        timer = setTimeout(tick, 60);
      }
      tick();

      stopFn = function () {
        stopped = true;
        if (timer) clearTimeout(timer);
        timer = null;
      };

      console.log('[thinkingSignal] playing (ctx state=' + c.state + ')');
    });
  }

  function fadeOut(ms) {
    if (!stopFn && !master) return;
    if (fading) {
      hardStopScheduler();
      return;
    }
    fading = true;
    var c = ctx;
    var durMs = ms != null ? ms : 700;
    if (c && master) {
      var t0 = c.currentTime;
      var dur = durMs / 1000;
      try {
        master.gain.cancelScheduledValues(t0);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t0);
        master.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      } catch (_) {}
      setTimeout(function () {
        hardStopScheduler();
        fading = false;
      }, durMs + 80);
    } else {
      hardStopScheduler();
      fading = false;
    }
  }

  window.AioThinkingSignal = {
    start: startLoop,
    stop: fadeOut,
    unlock: unlock,
    enabled: enabled
  };

  window.addEventListener('audioConsoleProcessing', function () {
    startLoop();
  });
  window.addEventListener('akari:tts-start', function () {
    fadeOut(700);
  });
  window.addEventListener('akari:tts-end', function () {
    fadeOut(400);
  });
  window.addEventListener('audioConsoleProcessingEnd', function () {
    setTimeout(function () {
      if (stopFn) fadeOut(500);
    }, 900);
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
