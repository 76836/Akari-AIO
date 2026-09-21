/**
 * Thinking indicator — minimal.
 * Start: akari:thinking-start (armed ASR about to run)
 * Stop:  akari:tts-start / speak() (spoken response begins)
 * Never stacks: one generation, kill previous before start.
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
  var timer = null;
  var gen = 0;

  function midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    return ctx;
  }

  function kill() {
    gen++;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (ctx && master) {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0, ctx.currentTime);
      } catch (_) {}
      try {
        master.disconnect();
      } catch (_) {}
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    }
  }

  function note(c, dest, t, o) {
    var osc = c.createOscillator();
    var g = c.createGain();
    var f = c.createBiquadFilter();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.lp || 5000, t);
    var vol = (o.vol || 0.5) * 0.55;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.3));
    osc.connect(f);
    f.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + (o.dur || 0.3) + 0.05);
  }

  function start() {
    if (!enabled()) return;
    kill();
    var my = gen;
    var c = ensure();
    if (!c) return;
    var go = function () {
      if (my !== gen) return;
      if (!master) return;
      try {
        master.gain.setValueAtTime(0.65, c.currentTime);
      } catch (_) {}
      var m = [0, 7, 3, 10, 7, 12, 3, 7];
      var i = 0;
      var nextT = c.currentTime + 0.08;
      function tick() {
        if (my !== gen) return;
        var now = c.currentTime;
        if (nextT < now - 0.05) nextT = now + 0.05;
        while (nextT < now + 0.4) {
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
      console.log('[thinkingSignal] on');
    };
    if (c.state === 'running') go();
    else c.resume().then(go).catch(function () {});
  }

  function stop(ms) {
    if (ms === 0) {
      kill();
      return;
    }
    var c = ctx;
    var my = gen;
    var dur = (ms != null ? ms : 600) / 1000;
    if (c && master) {
      try {
        var t0 = c.currentTime;
        master.gain.cancelScheduledValues(t0);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value || 0.65), t0);
        master.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      } catch (_) {}
      setTimeout(function () {
        if (my === gen) kill();
      }, (ms != null ? ms : 600) + 50);
    } else {
      kill();
    }
    console.log('[thinkingSignal] off');
  }

  // Unlock audio on first gesture / wake
  function unlock() {
    var c = ensure();
    if (c && c.state !== 'running') c.resume().catch(function () {});
  }
  ['pointerdown', 'click', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, unlock, { passive: true, capture: true });
  });
  window.addEventListener('audioConsoleWakeSound', unlock);

  window.AioThinkingSignal = { start: start, stop: stop, kill: kill };

  // Single start event from audio console when armed ASR runs
  window.addEventListener('akari:thinking-start', start);
  // Also accept processing as backup if thinking-start missed
  window.addEventListener('audioConsoleProcessing', function () {
    if (window.__ac41HadWakeForSignal || window.__ac41CommandArmed) start();
  });
  // Stop only when spoken reply begins
  window.addEventListener('akari:tts-start', function () {
    stop(700);
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
      stop(700);
      return orig.apply(this, arguments);
    };
    window.speak.__aioSignalWrapped = true;
    return true;
  }
  if (!wrapSpeak()) {
    var n = 0;
    var id = setInterval(function () {
      if (wrapSpeak() || ++n > 80) clearInterval(id);
    }, 400);
  }
})();
