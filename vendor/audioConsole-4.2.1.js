/**
 * AKARINET AUDIO CONSOLE v4.2.1
 * ====================================================================
 * Fork of v4.2.0 with progressive (streaming) Vosk recognition.
 *
 * Goal: run Vosk while the user is speaking so final inference is
 * faster after speech ends. Real-time partials are drafts (lower
 * quality) and are NEVER used as the command. Only the post-endpoint
 * final result is returned from transcribe() / sent upstream.
 *
 * What changed vs 4.2.0:
 *   - VoskProvider.feedChunk() streams live bus audio into the
 *     KaldiRecognizer during an active speech segment.
 *   - startStreaming() / stopStreaming() bracket speech-start → speech-end.
 *   - partialresult events are emitted as 'partial' (UI draft only).
 *   - transcribe() after VAD speech-end adds a short silence pad,
 *     calls retrieveFinalResult, and returns ONLY that final text.
 *   - AkarinetVoice init wires bus → srProvider.feedChunk when present,
 *     and hooks BusVAD speech-start/end to start/stop streaming.
 *
 * What this file does NOT do:
 *   - Does not treat partials as commands or wake results
 *   - Does not open a second microphone
 *   - Does not mark Vosk as session-based (still VAD + bus path)
 *   - Does not rewrite 4.1.x core behavior for other providers
 *
 * Privacy / pipeline:
 *   AudioBus → BusVAD → (live feed to Vosk during speech) →
 *   speech-end → short silence + retrieveFinalResult → FINAL text only
 *   Partials stay in-memory for optional UI draft; never leave as result.
 *
 * Config (same as 4.2.0):
 *   speechRecognitionProvider: 'vosk'
 *   vosk: { modelUrl?, sampleRate?, grammar? }
 *
 * Default model (CORS-friendly tar.gz):
 *   https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz
 */

// ── Preserve entire 4.1.2 surface (includes activateWakeWord fix) ──
export * from './audioConsole-4.1.2.js';
export { default } from './audioConsole-4.1.2.js';

import {
    SpeechRecognitionProvider,
    AkarinetVoice
} from './audioConsole-4.1.2.js';

// ── Vosk loader (once) ─────────────────────────────────────────────
const VOSK_CDN = new URL('./vosk.js', import.meta.url).href;
const DEFAULT_VOSK_MODEL =
    'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz';

let _voskScriptPromise = null;

function loadVoskScript() {
    if (typeof window !== 'undefined' && window.Vosk) {
        return Promise.resolve(window.Vosk);
    }
    if (_voskScriptPromise) return _voskScriptPromise;
    _voskScriptPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = VOSK_CDN;
        s.async = true;
        s.onload = () => {
            if (window.Vosk) resolve(window.Vosk);
            else reject(new Error('vosk-browser loaded but window.Vosk missing'));
        };
        s.onerror = () => reject(new Error('Failed to load vosk-browser CDN'));
        document.head.appendChild(s);
    });
    return _voskScriptPromise;
}

/**
 * Progressive Vosk STT — same external contract as TransformersProvider.
 * isSessionBased === false → orchestrator still uses VAD + transcribe() after speech-end.
 * Internally streams bus chunks during speech so finalization is cheap.
 */
export class VoskProvider extends SpeechRecognitionProvider {
    constructor(config = {}, debug = false) {
        super(config, debug);
        this._model = null;
        this._recognizer = null;
        this._sampleRate = config.sampleRate || 16000;
        this._modelUrl = config.modelUrl || DEFAULT_VOSK_MODEL;
        this._grammar = config.grammar || null;
        this._ready = false;
        this._busy = false;
        this._streaming = false;
        this._onResult = null;
        this._onError = null;
        this._onPartial = null;
        this._lastFinal = '';
        this._lastPartial = '';
        this._resultWaiters = [];
        this._streamedSamples = 0;
    }

    get isSessionBased() {
        return false;
    }

    async init() {
        this._log('INFO', `Vosk loading model: ${this._modelUrl}`);
        const Vosk = await loadVoskScript();
        this._model = await Vosk.createModel(this._modelUrl);
        await this._ensureRecognizer();
        this._ready = true;
        this._log('OK', 'Vosk ready (progressive stream + final-only result).');
    }

    /**
     * Create KaldiRecognizer and wait until the worker confirms it exists.
     * No fixed delays: probe with retrieveFinalResult; worker replies result or error.
     */
    async _ensureRecognizer() {
        if (this._recognizer) return this._recognizer;
        if (!this._model || !this._model.ready) {
            throw new Error('Vosk model not ready');
        }

        const Kaldi = this._model.KaldiRecognizer;
        const recognizer = this._grammar
            ? new Kaldi(this._sampleRate, this._grammar)
            : new Kaldi(this._sampleRate);

        await new Promise((resolve, reject) => {
            let settled = false;
            let probes = 0;
            const maxProbes = 200;

            const cleanup = () => {
                if (this._onResult) {
                    try { recognizer.removeEventListener('result', this._onResult); } catch (_) {}
                }
                if (this._onError) {
                    try { recognizer.removeEventListener('error', this._onError); } catch (_) {}
                }
                this._onResult = null;
                this._onError = null;
            };

            const finishOk = () => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve();
            };
            const finishErr = (e) => {
                if (settled) return;
                settled = true;
                cleanup();
                reject(e instanceof Error ? e : new Error(String(e)));
            };

            recognizer.on('result', () => {
                finishOk();
            });
            recognizer.on('error', (message) => {
                const errText = String((message && (message.error || message.message)) || message || '');
                if (/does not exist|not exist|already been deleted/i.test(errText)) {
                    probes += 1;
                    if (probes > maxProbes) {
                        finishErr(new Error('Vosk recognizer never became ready in worker'));
                        return;
                    }
                    queueMicrotask(() => {
                        try { recognizer.retrieveFinalResult(); } catch (e) { finishErr(e); }
                    });
                    return;
                }
                finishErr(new Error(errText || 'Vosk recognizer error'));
            });

            try {
                recognizer.retrieveFinalResult();
            } catch (e) {
                finishErr(e);
            }
        });

        this._recognizer = recognizer;
        this._bindRecognizerEvents();
        return recognizer;
    }

    _bindRecognizerEvents() {
        const recognizer = this._recognizer;
        if (!recognizer) return;

        this._lastFinal = '';
        this._lastPartial = '';
        this._resultWaiters = [];

        recognizer.on('result', (message) => {
            const t = (message && message.result && message.result.text) || '';
            if (t && t.trim()) this._lastFinal = t.trim();
            const waiters = this._resultWaiters.splice(0);
            for (const w of waiters) {
                try { w(this._lastFinal); } catch (_) {}
            }
            // Final results during streaming are still not treated as commands;
            // only the explicit post-speech retrieveFinalResult path is authoritative.
        });
        recognizer.on('partialresult', (message) => {
            const p = (message && message.result && message.result.partial) || '';
            if (p) {
                this._lastPartial = String(p);
                // Draft only — emit for optional UI preview. Never used as command.
                try {
                    this._emitter.emit('partial', { text: this._lastPartial, draft: true });
                } catch (_) {}
            }
        });
        recognizer.on('error', (message) => {
            const errText = String((message && (message.error || message.message)) || message || '');
            this._log('WARN', `recognizer error: ${errText}`);
            const waiters = this._resultWaiters.splice(0);
            for (const w of waiters) {
                try { w(''); } catch (_) {}
            }
        });
    }

    /**
     * Drop the current KaldiRecognizer and build a fresh one.
     * Required after retrieveFinalResult so the next utterance is clean.
     */
    async _resetRecognizer() {
        try {
            if (this._recognizer && typeof this._recognizer.remove === 'function') {
                this._recognizer.remove();
            }
        } catch (_) { /* ignore */ }
        this._recognizer = null;
        this._lastFinal = '';
        this._lastPartial = '';
        this._streamedSamples = 0;
        this._resultWaiters = [];
        try {
            await this._ensureRecognizer();
        } catch (e) {
            this._log('WARN', `recognizer reset failed: ${e.message || e}`);
        }
    }

    /**
     * Begin accepting live bus chunks. Called on VAD speech-start.
     * Partials are drafts only. Final is always taken after speech-end.
     */
    startStreaming() {
        if (!this._ready || !this._recognizer) return;
        if (this._busy) return; // never stream into an in-flight finalize
        this._streaming = true;
        this._streamedSamples = 0;
        this._lastFinal = '';
        this._lastPartial = '';
        this._resultWaiters.splice(0);
        this._log('INFO', 'Vosk streaming started (draft partials only)');
    }

    /**
     * Stop accepting new live chunks. Finalization happens in transcribe().
     */
    stopStreaming() {
        this._streaming = false;
        this._log('INFO', `Vosk streaming stopped (${this._streamedSamples} samples fed)`);
    }

    /**
     * Live bus chunk sink. Only consumes while _streaming is true and not busy.
     */
    feedChunk(chunk) {
        if (!this._streaming || this._busy || !this._recognizer || !chunk || !chunk.length) return;
        try {
            const samples = chunk instanceof Float32Array ? chunk : new Float32Array(chunk);
            this._recognizer.acceptWaveformFloat(samples, this._sampleRate);
            this._streamedSamples += samples.length;
        } catch (e) {
            this._log('WARN', `feedChunk failed: ${e.message || e}`);
        }
    }

    /**
     * Wait for the next worker `result` event after retrieveFinalResult.
     */
    _waitNextFinal(timeoutMs = 10000) {
        return new Promise((resolve) => {
            let done = false;
            const finish = (text) => {
                if (done) return;
                done = true;
                resolve(text || '');
            };
            this._resultWaiters.push(finish);
            setTimeout(() => finish(this._lastFinal || ''), timeoutMs);
        });
    }

    /**
     * Finalize after VAD speech-end.
     * Uses progressive stream when it covered this segment; otherwise feeds
     * the full VAD buffer. ALWAYS returns only the post-endpoint final.
     * Recreates the recognizer afterward so the next command is clean.
     */
    async transcribe(audio) {
        if (!this._ready || !this._model) {
            throw new Error('VoskProvider not initialized');
        }
        if (!audio || !audio.length) return '';
        if (this._busy) {
            this._log('WARN', 'transcribe skipped (busy)');
            return '';
        }
        this._busy = true;
        this._streaming = false;

        try {
            const recognizer = await this._ensureRecognizer();
            const samples = audio instanceof Float32Array ? audio : new Float32Array(audio);

            let peak = 0;
            for (let i = 0; i < samples.length; i++) {
                const a = samples[i] < 0 ? -samples[i] : samples[i];
                if (a > peak) peak = a;
            }
            this._log('INFO', `transcribe finalize: ${samples.length} samples, peak=${peak.toFixed(4)}, streamed=${this._streamedSamples}`);
            if (peak < 0.001) {
                this._log('WARN', 'audio peak near zero — VAD segment may be silence');
            }

            this._resultWaiters.splice(0);
            this._lastFinal = '';

            // Progressive path only if this utterance was actually streamed.
            // Otherwise (or if coverage is low) feed the full VAD segment.
            const covered = this._streamedSamples >= samples.length * 0.5
                && this._streamedSamples <= samples.length * 1.35;
            if (!covered) {
                this._log('INFO', 'streaming coverage mismatch — accepting full segment for final');
                recognizer.acceptWaveformFloat(samples, this._sampleRate);
            }

            // Endpoint silence helps Kaldi finalize.
            const silence = new Float32Array(Math.floor(this._sampleRate * 0.25));
            recognizer.acceptWaveformFloat(silence, this._sampleRate);

            const finalPromise = this._waitNextFinal(8000);
            recognizer.retrieveFinalResult();
            const text = await finalPromise;

            this._lastPartial = '';
            this._streamedSamples = 0;

            this._log('INFO', `transcribe final: "${(text || '').slice(0, 80)}" (${samples.length} samples)`);
            return text || '';
        } catch (e) {
            this._log('WARN', `transcribe failed: ${e.message || e}`);
            return '';
        } finally {
            this._busy = false;
            this._streaming = false;
            this._streamedSamples = 0;
            // Critical: fresh recognizer for the next command
            try { await this._resetRecognizer(); } catch (_) {}
        }
    }

    async startSession() { /* segment-based no-op */ }
    async stopSession() { /* segment-based no-op */ }

    async destroy() {
        this._busy = false;
        this._ready = false;
        this._streaming = false;
        this._resultWaiters = [];
        try {
            if (this._recognizer && typeof this._recognizer.remove === 'function') {
                this._recognizer.remove();
            }
        } catch (_) { /* ignore */ }
        this._recognizer = null;
        try {
            if (this._model && typeof this._model.terminate === 'function') {
                this._model.terminate();
            }
        } catch (_) { /* ignore */ }
        this._model = null;
        this._log('INFO', 'VoskProvider destroyed.');
    }
}

// ── Selective edits (do not rewrite 4.1.x core) ────────────────────
//
// Same vosk/transformers bus+VAD enablement as 4.2.0, plus:
//   - wire bus → srProvider.feedChunk when the provider supports it
//   - on speech-start → startStreaming()
//   - on speech-end the existing _handleSpeech → transcribe() path
//     already finalizes (we only stopStreaming so feedChunk stops)

const _createSpeechProvider412 = AkarinetVoice.prototype._createSpeechProvider;
const _init412 = AkarinetVoice.prototype.init;

AkarinetVoice.prototype._createSpeechProvider = function _createSpeechProvider421() {
    if (this.config._wantVosk || this.config.speechRecognitionProvider === 'vosk') {
        const v = this.config.vosk || {};
        return new VoskProvider({
            modelUrl: v.modelUrl || this.config.voskModelUrl || DEFAULT_VOSK_MODEL,
            sampleRate: v.sampleRate || 16000,
            grammar: v.grammar || null
        }, this.config.debugWakeSound);
    }
    return _createSpeechProvider412.call(this);
};

/**
 * RMS energy VAD — no onnxruntime. Used for Vosk on Firefox/Linux where
 * concurrent Silero BusVAD + OpenWakeWord ORT sessions throw
 * "TypeError: Error in input stream".
 * Mutates an existing BusVAD instance in-place so bus subscribers keep working.
 */
function installEnergyVad(vad, opts) {
    if (!vad) return;
    const threshold = (opts && opts.threshold) != null ? opts.threshold : 0.012;
    const redemptionMs = (opts && opts.redemptionMs) != null ? opts.redemptionMs : 1600;
    const chunkMs = 80; // 1280 samples @ 16 kHz
    vad._energyThreshold = threshold;
    vad._redemptionFrames = Math.max(1, Math.ceil(redemptionMs / chunkMs));
    vad._session = null; // drop Silero session — never call ORT again
    vad._h = null;
    vad._c = null;
    vad._runVad = async function energyRunVad(chunk) {
        if (!chunk || !chunk.length) return false;
        let sum = 0;
        for (let i = 0; i < chunk.length; i++) {
            const s = chunk[i];
            sum += s * s;
        }
        const rms = Math.sqrt(sum / chunk.length);
        return rms >= this._energyThreshold;
    };
    // Ensure feed path is serialized even if 4.1.1 patch order differs
    if (typeof vad._runVadSerialized !== 'function') {
        vad.feedChunk = function (chunk) {
            if (!chunk || !chunk.length) return;
            const copy = chunk instanceof Float32Array ? new Float32Array(chunk) : new Float32Array(chunk);
            this._vadQueue = (this._vadQueue || Promise.resolve())
                .then(async () => {
                    let triggered = false;
                    try { triggered = await this._runVad(copy); } catch (_) { return; }
                    if (triggered) {
                        if (!this._isSpeech) {
                            this._isSpeech = true;
                            this._speechBuffer = [];
                            this._emitter.emit('speech-start');
                        }
                        this._redemptionCount = this._redemptionFrames;
                        this._speechBuffer.push(copy);
                    } else if (this._isSpeech) {
                        this._redemptionCount--;
                        this._speechBuffer.push(copy);
                        if (this._redemptionCount <= 0) {
                            this._isSpeech = false;
                            const total = this._speechBuffer.reduce((s, a) => s + a.length, 0);
                            const audio = new Float32Array(total);
                            let off = 0;
                            for (const c of this._speechBuffer) { audio.set(c, off); off += c.length; }
                            this._speechBuffer = [];
                            if (audio.length < 2000) this._emitter.emit('misfire', { audio });
                            else this._emitter.emit('speech-end', { audio });
                        }
                    }
                })
                .catch(() => {});
        };
    }
}

AkarinetVoice.prototype.init = async function init421() {
    const wantVosk = this.config.speechRecognitionProvider === 'vosk' || this.config._wantVosk;
    const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent || '');
    if (wantVosk) {
        // 4.1.0 enables Bus+VAD only for transformers/whispercpp; borrow that path for Vosk.
        this.config._wantVosk = true;
        this.config.speechRecognitionProvider = 'transformers';
    }
    try {
        await _init412.call(this);
    } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        this._log && this._log('ERROR', 'Audio init failed: ' + msg);
        throw err;
    } finally {
        if (wantVosk) {
            this.config.speechRecognitionProvider = 'vosk';
            this._log && this._log('INFO', 'Speech recognition provider: vosk (restored after bus init)');
        }
    }

    // Vosk (and Firefox): replace Silero BusVAD with energy VAD so ORT is only
    // used by OpenWakeWord — eliminates dual-session "Error in input stream".
    if (this.busVad && (wantVosk || isFirefox)) {
        installEnergyVad(this.busVad, {
            threshold: typeof this.config.vadThreshold === 'number' && this.config.vadThreshold < 1
                ? Math.max(0.008, this.config.vadThreshold * 0.03) // map 0-1 silero-ish → rms ballpark
                : 0.012,
            redemptionMs: this.config.vadRedemptionMs || 1600
        });
        this._log && this._log('INFO', 'BusVAD: energy/RMS mode (no Silero ORT) — Firefox-safe');
    }

    // Progressive Vosk wiring (only when the provider exposes the hooks)
    if (this.srProvider && typeof this.srProvider.feedChunk === 'function') {
        if (this.bus) {
            this.bus.addSubscriber(chunk => {
                try { this.srProvider.feedChunk(chunk); } catch (_) {}
            });
            this._log && this._log('INFO', 'Bus → srProvider.feedChunk wired (progressive Vosk)');
        }
        if (this.busVad) {
            this.busVad.on('speech-start', () => {
                if (typeof this.srProvider.startStreaming === 'function') {
                    const requireWake = !!this.config.requireWakeSound;
                    const hasWake = !!this.wakeSoundDetectedTime;
                    const gated = typeof window !== 'undefined' && !!window.__ac41AsrBlocked;
                    if ((!requireWake || hasWake) && !gated) {
                        try { this.srProvider.startStreaming(); } catch (_) {}
                    }
                }
            });
            this.busVad.on('speech-end', () => {
                if (typeof this.srProvider.stopStreaming === 'function') {
                    try { this.srProvider.stopStreaming(); } catch (_) {}
                }
            });
        }
    }
};

// Do NOT re-export AkarinetVoice / default — already provided by export * / export { default }.
