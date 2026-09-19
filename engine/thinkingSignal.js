/**
 * Akari-AIO thinking indicator — low marimba loop.
 * Starts on audioConsoleProcessing (transcription started).
 * Fades out on akari:tts-end start path / when speak begins / processing end.
 */
(function () {
  'use strict';
  if (window.__aioThinkingSignalInstalled) return;
  window.__aioThinkingSignalInstalled = true;

  function enabled() {
    try { return localStorage.getItem('aio_thinkingSignal') === '1' || localStorage.getItem('aio_thinkingSignal') === 'true'; }
    catch (_) { return false; }
  }

  let ctx = null;
  let master = null;
  let stopFn = null;
  let fading = false;

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function note(audioCtx, dest, t, o) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const f = audioCtx.createBiquadFilter();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(o.lp || 4000, t);
    const vol = (o.vol != null ? o.vol : 0.5) * 0.35;
    const a = o.a != null ? o.a : 0.005;
    const dur = o.dur != null ? o.dur : 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
    return ctx;
  }

  function startLoop() {
    if (!enabled()) return;
    if (stopFn) return;
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(function () {});
    fading = false;
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(0.45, c.currentTime);

    const m = [0, 7, 3, 10, 7, 12, 3, 7];
    let i = 0;
    let nextT = c.currentTime + 0.05;
    let timer = null;
    let stopped = false;

    function tick() {
      if (stopped) return;
      const now = c.currentTime;
      while (nextT < now + 0.35) {
        const f = midi(33 + m[i % 8] + (i % 32 >= 16 ? 5 : 0));
        note(c, master, nextT, { f: f, dur: 0.5, vol: 0.7, a: 0.003 });
        note(c, master, nextT, { type: 'triangle', f: f * 2, dur: 0.25, vol: 0.2, a: 0.002, lp: 1500 });
        note(c, master, nextT, { f: f * 6, dur: 0.05, vol: 0.06, a: 0.001 });
        nextT += (i % 8 === 7) ? 0.55 : 0.2;
        i++;
      }
      timer = setTimeout(tick, 80);
    }
    tick();

    stopFn = function () {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    };
  }

  function fadeOut(ms) {
    if (!stopFn && !master) return;
    if (fading) return;
    fading = true;
    const c = ctx;
    if (c && master) {
      const t0 = c.currentTime;
      const dur = (ms != null ? ms : 600) / 1000;
      try {
        master.gain.cancelScheduledValues(t0);
        master.gain.setValueAtTime(master.gain.value, t0);
        master.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      } catch (_) {}
      setTimeout(function () {
        if (stopFn) { try { stopFn(); } catch (_) {} stopFn = null; }
        fading = false;
      }, (ms != null ? ms : 600) + 50);
    } else {
      if (stopFn) { try { stopFn(); } catch (_) {} stopFn = null; }
      fading = false;
    }
  }

  window.AioThinkingSignal = { start: startLoop, stop: fadeOut };

  // Transcription has started → processing event from audio console
  window.addEventListener('audioConsoleProcessing', function () {
    startLoop();
  });

  // Speech synthesis begins
  window.addEventListener('akari:tts-start', function () { fadeOut(700); });
  // Fallback: TTS end also stops if still going
  window.addEventListener('akari:tts-end', function () { fadeOut(400); });
  window.addEventListener('audioConsoleProcessingEnd', function () {
    // If no TTS (silent), stop after a beat
    setTimeout(function () {
      if (stopFn) fadeOut(500);
    }, 800);
  });

  // Wrap speak so we get a reliable "synthesis started" cue
  function wrapSpeak() {
    if (typeof window.speak !== 'function' || window.speak.__aioSignalWrapped) return !!window.speak;
    const orig = window.speak;
    window.speak = function () {
      try { window.dispatchEvent(new CustomEvent('akari:tts-start')); } catch (_) {}
      fadeOut(700);
      return orig.apply(this, arguments);
    };
    window.speak.__aioSignalWrapped = true;
    return true;
  }
  if (!wrapSpeak()) {
    var tries = 0;
    var iv = setInterval(function () {
      if (wrapSpeak() || ++tries > 60) clearInterval(iv);
    }, 500);
  }
})();
