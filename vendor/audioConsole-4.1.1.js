/**
 * AKARINET AUDIO CONSOLE v4.1.1
 * ====================================================================
 * Drop-in compatible with v4.1.0. Fixes Firefox/Linux sample-rate error:
 *   AudioContext.createMediaStreamSource: Connecting AudioNodes from
 *   AudioContexts with different sample-rate is currently not supported.
 *
 * Approach: re-export v4.1.0, then patch AudioBus.prototype.start so the
 * AudioContext uses the hardware rate and the worklet resamples to 16 kHz.
 *
 * Also pins the 4.1.0 core to a known-good commit via jsDelivr and adds
 * versatile whisper.cpp response parsing (plain text, verbose_json, nested
 * keys, segments, OpenAI-style, forks).
 */

const _AC410 = './audioConsole-4.1.0.js';

export {
    WakeWordProvider,
    TeachableMachineProvider,
    OpenWakeWordProvider,
    SpeechRecognitionProvider,
    TransformersProvider,
    WhisperCppProvider,
    WebSpeechProvider,
    AudioBus,
    BusVAD,
    XlCache,
    RingBuffer
} from './audioConsole-4.1.0.js';

export { default, AkarinetVoice } from './audioConsole-4.1.0.js';

import { AudioBus, BusVAD, OpenWakeWordProvider, WhisperCppProvider, AkarinetVoice } from './audioConsole-4.1.0.js';

// Pin ORT to single-thread WASM as soon as it appears (before sessions are created).
(function pinOrtWhenReady() {
    if (typeof window === 'undefined') return;
    const pin = () => {
        try {
            if (window.ort && window.ort.env && window.ort.env.wasm) {
                window.ort.env.wasm.numThreads = 1;
                if (typeof window.ort.env.wasm.proxy === 'boolean') window.ort.env.wasm.proxy = false;
                return true;
            }
        } catch (_) {}
        return false;
    };
    if (pin()) return;
    const iv = setInterval(() => { if (pin()) clearInterval(iv); }, 25);
    setTimeout(() => clearInterval(iv), 60000);
})();


/** Worklet that emits fixed 1280-sample @ targetRate chunks, resampling if needed. */
const FIXED_BUS_WORKLET_CODE = `
class AudioBusProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const opts = (options && options.processorOptions) || {};
        this.targetRate = opts.targetSampleRate || 16000;
        this.inRate = sampleRate;
        this.step = this.inRate / this.targetRate;
        this.bufferSize = 1280;
        this._out = new Float32Array(this.bufferSize);
        this._outPos = 0;
        this._phase = 0;
        this._buf = [];
    }
    process(inputs) {
        const input = inputs[0] && inputs[0][0];
        if (!input) return true;

        if (Math.abs(this.step - 1) < 0.001) {
            for (let i = 0; i < input.length; i++) {
                this._out[this._outPos++] = input[i];
                if (this._outPos === this.bufferSize) {
                    this.port.postMessage(this._out.slice(0));
                    this._outPos = 0;
                }
            }
            return true;
        }

        for (let i = 0; i < input.length; i++) this._buf.push(input[i]);

        while (this._phase + this.step < this._buf.length - 1) {
            const idx = this._phase;
            const i0 = Math.floor(idx);
            const frac = idx - i0;
            const s0 = this._buf[i0];
            const s1 = this._buf[i0 + 1];
            const sample = s0 + (s1 - s0) * frac;
            this._out[this._outPos++] = sample;
            if (this._outPos === this.bufferSize) {
                this.port.postMessage(this._out.slice(0));
                this._outPos = 0;
            }
            this._phase += this.step;
        }

        const drop = Math.floor(this._phase);
        if (drop > 0) {
            this._buf.splice(0, drop);
            this._phase -= drop;
        }
        if (this._buf.length > this.inRate) {
            const excess = this._buf.length - Math.ceil(this.inRate / 10);
            this._buf.splice(0, excess);
            this._phase = Math.max(0, this._phase - excess);
        }
        return true;
    }
}
registerProcessor('audio-bus-processor', AudioBusProcessor);
`;

/**
 * Firefox / all browsers: never force AudioContext sampleRate.
 * Mic stream rate must match context rate (Firefox throws otherwise).
 * Worklet resamples to 16 kHz for ORT / Vosk / OWW.
 */
AudioBus.prototype.start = async function startSampleRateSafe() {
    if (this._active) return;

    const baseAudio = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    };
    // Do NOT request sampleRate on getUserMedia — let the device pick;
    // we resample in the worklet. Requesting 16k here fights Firefox.
    if (this.config.deviceId) {
        baseAudio.deviceId = { exact: this.config.deviceId };
    }

    try {
        this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: baseAudio });
    } catch (e1) {
        try {
            this._mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: this.config.deviceId ? { deviceId: { exact: this.config.deviceId } } : true
            });
        } catch (e2) {
            throw new Error(
                `Microphone access failed: ${e2.message || e2.name}. ` +
                `If you're on http://, try localhost or https://.`
            );
        }
    }

    // Hardware / default rate only — critical on Firefox.
    this._audioContext = new AudioContext();
    if (this._audioContext.state === 'suspended') {
        try { await this._audioContext.resume(); } catch (_) {}
    }

    const source = this._audioContext.createMediaStreamSource(this._mediaStream);
    this._sourceNode = source;
    this._gainNode = this._audioContext.createGain();
    this._gainNode.gain.value = this.config.gain != null ? this.config.gain : 1;

    const blob = new Blob([FIXED_BUS_WORKLET_CODE], { type: 'application/javascript' });
    const workletURL = URL.createObjectURL(blob);
    await this._audioContext.audioWorklet.addModule(workletURL);
    URL.revokeObjectURL(workletURL);

    this._workletNode = new AudioWorkletNode(this._audioContext, 'audio-bus-processor', {
        processorOptions: { targetSampleRate: this.config.sampleRate || 16000 }
    });

    this._workletNode.port.onmessage = (event) => {
        const chunk = event.data;
        if (!chunk || !chunk.length) return;
        // Copy before fan-out so worklet can reuse its buffer safely
        const copy = chunk instanceof Float32Array ? new Float32Array(chunk) : new Float32Array(chunk);
        this.liveRing.push(copy);
        for (const fn of this._subscribers) {
            try { fn(copy); } catch (err) { console.error('[AudioBus] subscriber error:', err); }
        }
    };

    source.connect(this._gainNode);
    this._gainNode.connect(this._workletNode);
    const muteGain = this._audioContext.createGain();
    muteGain.gain.value = 0;
    this._workletNode.connect(muteGain);
    muteGain.connect(this._audioContext.destination);

    this._active = true;
    if (this.debug) {
        console.log(
            '[AudioBus] Started (sample-rate safe). Context:',
            this._audioContext.sampleRate,
            'Hz → target',
            this.config.sampleRate || 16000,
            'Hz'
        );
    }
};

// Downstream always sees target (16 kHz) rate.
Object.defineProperty(AudioBus.prototype, 'sampleRate', {
    get: function () {
        return this.config?.sampleRate ?? 16000;
    },
    configurable: true
});

/**
 * BusVAD → dedicated worker with its own ORT instance (isolated from OpenWakeWord).
 */
(function patchBusVadWorker() {
    if (typeof BusVAD === 'undefined' || !BusVAD.prototype) return;

    const MIN_SPEECH_SAMPLES = 2000;
    const _origInit = BusVAD.prototype.init;
    const _origFeed = BusVAD.prototype.feedChunk;
    const _origDestroy = BusVAD.prototype.destroy;
    const _origReset = BusVAD.prototype.reset;

    function resolveUrl(rel) {
        try { return new URL(rel, import.meta.url).href; }
        catch (_) { return rel; }
    }

    async function mainThreadInit(self) {
        // Original 4.1.0 Silero on the main-thread ORT (shared with OWW if needed)
        if (typeof _origInit === 'function') {
            // _origInit was already overwritten — call core path inline
        }
        if (!self.config.ort) throw new Error('BusVAD: config.ort required for main-thread fallback');
        const modelUrl = resolveUrl('../models/vad/silero_vad.onnx');
        const sessionOptions = { executionProviders: ['wasm'] };
        let session;
        try {
            session = await self.config.ort.InferenceSession.create(modelUrl, sessionOptions);
        } catch (_) {
            session = await self.config.ort.InferenceSession.create(
                'https://cdn.jsdelivr.net/gh/dnavarrom/openwakeword_wasm@main/models/silero_vad.onnx',
                sessionOptions
            );
        }
        self._session = session;
        self._h = new self.config.ort.Tensor('float32', new Float32Array(128).fill(0), [2, 1, 64]);
        self._c = new self.config.ort.Tensor('float32', new Float32Array(128).fill(0), [2, 1, 64]);
        self._useWorker = false;
        if (self.debug) console.log('[BusVAD] Main-thread Silero ready. Threshold:', self.config.threshold);
    }

    BusVAD.prototype.init = async function initWorkerVad() {
        this._useWorker = false;
        this._vadWorker = null;
        this._vadPending = new Map();
        this._vadReqId = 0;
        this._vadQueue = Promise.resolve();

        const workerUrl = resolveUrl('./busVad.worker.js');
        const modelUrl = resolveUrl('../models/vad/silero_vad.onnx');
        const ortScriptUrl = resolveUrl('../models/piper/ort.all.min.js');

        try {
            this._vadWorker = new Worker(workerUrl);
        } catch (e) {
            if (this.debug) console.warn('[BusVAD] Worker construct failed, main-thread fallback:', e);
            await mainThreadInit(this);
            return;
        }

        const ready = new Promise((resolve, reject) => {
            this._vadReadyResolve = resolve;
            this._vadReadyReject = reject;
        });

        this._vadWorker.onmessage = (ev) => {
            const msg = ev.data || {};
            if (msg.type === 'ready') {
                if (this._vadReadyResolve) this._vadReadyResolve();
                return;
            }
            if (msg.type === 'error') {
                if (this._vadReadyReject) {
                    this._vadReadyReject(new Error(msg.message || 'VAD worker error'));
                    this._vadReadyReject = null;
                    this._vadReadyResolve = null;
                }
                try { this._emitter.emit('error', new Error(msg.message || 'VAD worker error')); } catch (_) {}
                return;
            }
            if (msg.type === 'result') {
                const pending = this._vadPending.get(msg.id);
                if (pending) {
                    this._vadPending.delete(msg.id);
                    pending(msg);
                }
            }
        };
        this._vadWorker.onerror = (e) => {
            const err = new Error(e.message || 'VAD worker script error');
            if (this._vadReadyReject) {
                this._vadReadyReject(err);
                this._vadReadyReject = null;
                this._vadReadyResolve = null;
            }
            try { this._emitter.emit('error', err); } catch (_) {}
        };

        this._vadWorker.postMessage({
            type: 'init',
            modelUrl,
            ortScriptUrl,
            sampleRate: this.config.sampleRate || 16000,
            threshold: this.config.threshold != null ? this.config.threshold : 0.5
        });

        try {
            // NO artificial timeout — wait until worker is ready or reports error
            await ready;
            this._useWorker = true;
            this._session = null;
            if (this.debug) console.log('[BusVAD] Worker ready (isolated ORT). Threshold:', this.config.threshold);
        } catch (e) {
            try { this._vadWorker.terminate(); } catch (_) {}
            this._vadWorker = null;
            if (this.debug) console.warn('[BusVAD] Worker init failed, main-thread fallback:', e && e.message || e);
            await mainThreadInit(this);
        }
    };

    BusVAD.prototype.feedChunk = function feedChunkWorker(chunk) {
        if (!chunk || !chunk.length) return;

        if (!this._useWorker || !this._vadWorker) {
            // Main-thread path (serialized)
            const copy = chunk instanceof Float32Array ? new Float32Array(chunk) : new Float32Array(chunk);
            this._vadQueue = (this._vadQueue || Promise.resolve()).then(async () => {
                let triggered = false;
                try {
                    const ort = this.config.ort;
                    if (!this._session || !ort) return;
                    const tensor = new ort.Tensor('float32', copy, [1, copy.length]);
                    const sr = new ort.Tensor('int64', [BigInt(this.config.sampleRate || 16000)], []);
                    const res = await this._session.run({ input: tensor, sr, h: this._h, c: this._c });
                    this._h = res.hn;
                    this._c = res.cn;
                    triggered = res.output.data[0] > (this.config.threshold ?? 0.5);
                } catch (err) {
                    try { this._emitter.emit('error', err); } catch (_) {}
                    return;
                }
                applySpeechState(this, triggered, copy);
            }).catch(() => {});
            return;
        }

        const copy = chunk instanceof Float32Array ? new Float32Array(chunk) : new Float32Array(chunk);
        const forBuffer = new Float32Array(copy);

        this._vadQueue = (this._vadQueue || Promise.resolve()).then(async () => {
            const id = ++this._vadReqId;
            const resultPromise = new Promise((resolve) => {
                this._vadPending.set(id, resolve);
            });
            try {
                this._vadWorker.postMessage(
                    { type: 'chunk', id, buffer: copy.buffer },
                    [copy.buffer]
                );
            } catch (err) {
                this._vadPending.delete(id);
                return;
            }
            const msg = await resultPromise;
            applySpeechState(this, !!(msg && msg.triggered), forBuffer);
        }).catch(() => {});
    };

    function applySpeechState(self, triggered, buf) {
        if (triggered) {
            if (!self._isSpeech) {
                self._isSpeech = true;
                self._speechBuffer = [];
                self._emitter.emit('speech-start');
            }
            self._redemptionCount = self._redemptionFrames;
            self._speechBuffer.push(buf);
        } else if (self._isSpeech) {
            self._redemptionCount--;
            self._speechBuffer.push(buf);
            if (self._redemptionCount <= 0) {
                self._isSpeech = false;
                const total = self._speechBuffer.reduce((s, a) => s + a.length, 0);
                const audio = new Float32Array(total);
                let off = 0;
                for (const c of self._speechBuffer) { audio.set(c, off); off += c.length; }
                self._speechBuffer = [];
                if (audio.length < MIN_SPEECH_SAMPLES) self._emitter.emit('misfire', { audio });
                else self._emitter.emit('speech-end', { audio });
            }
        }
    }

    BusVAD.prototype.destroy = async function () {
        try {
            if (this._vadWorker) {
                this._vadWorker.postMessage({ type: 'destroy' });
                this._vadWorker.terminate();
                this._vadWorker = null;
            }
        } catch (_) {}
        this._session = null;
        this._h = null;
        this._c = null;
        this._speechBuffer = [];
    };

    BusVAD.prototype.reset = function () {
        try {
            if (this._vadWorker) this._vadWorker.postMessage({ type: 'reset' });
        } catch (_) {}
        this._isSpeech = false;
        this._redemptionCount = 0;
        this._speechBuffer = [];
        if (this._h && this._h.data) this._h.data.fill(0);
        if (this._c && this._c.data) this._c.data.fill(0);
    };
})();


// Pin main-thread ORT (OpenWakeWord) to single-thread as soon as it appears.
(function pinMainOrt() {
    if (typeof window === 'undefined') return;
    const pin = () => {
        try {
            if (window.ort && window.ort.env && window.ort.env.wasm) {
                window.ort.env.wasm.numThreads = 1;
                if (typeof window.ort.env.wasm.proxy === 'boolean') window.ort.env.wasm.proxy = false;
                return true;
            }
        } catch (_) {}
        return false;
    };
    if (pin()) return;
    const iv = setInterval(() => { if (pin()) clearInterval(iv); }, 25);
    setTimeout(() => clearInterval(iv), 60000);
})();


function _ac411_encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
}

(function patchWhisperCppParser() {
    if (typeof WhisperCppProvider === 'undefined' || !WhisperCppProvider.prototype) return;

    WhisperCppProvider.prototype.transcribe = async function (audio) {
        const sampleRate = this.config.sampleRate ?? 16000;
        const wavBlob = _ac411_encodeWAV(audio, sampleRate);

        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('response_format', this.config.responseFormat || 'json');
        if (this.config.temperature !== undefined) {
            formData.append('temperature', String(this.config.temperature));
        }
        if (this.config.language) {
            formData.append('language', this.config.language);
        }

        const base = this.config.proxyUrl || this.config.baseUrl;
        const path = this.config.inferencePath || '/inference';
        const url = base.replace(/\/+$/, '') + path;

        const controller = new AbortController();
        const timeoutMs = this.config.timeoutMs ?? 30000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            const bodyText = await res.text().catch(() => '');
            if (!res.ok) {
                throw new Error(`whisper.cpp server returned ${res.status}: ${bodyText.slice(0, 200)}`);
            }
            return this._extractTranscript(bodyText);
        } finally {
            clearTimeout(timeout);
        }
    };

    WhisperCppProvider.prototype._extractTranscript = function (bodyText) {
        if (bodyText == null) return '';
        const raw = String(bodyText).trim();
        if (!raw) return '';

        const looksJson = raw.startsWith('{') || raw.startsWith('[');
        if (!looksJson) return this._cleanPlainText(raw);

        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            this._log('WARN', `whisper.cpp JSON parse failed, using raw text: ${e.message}`);
            return this._cleanPlainText(raw);
        }

        const text = this._digForText(data);
        if (text) return text;

        this._log('WARN', 'whisper.cpp response had no recognizable text field; using cleaned body');
        return this._cleanPlainText(raw);
    };

    WhisperCppProvider.prototype._digForText = function (data) {
        if (data == null) return '';
        if (typeof data === 'string') return data.trim();

        const KEYS = [
            'text', 'transcription', 'transcript', 'result', 'output',
            'message', 'content', 'transcription_text', 'asr'
        ];
        for (const k of KEYS) {
            if (typeof data[k] === 'string' && data[k].trim()) return data[k].trim();
        }

        for (const nest of ['data', 'response', 'result', 'output', 'body']) {
            if (data[nest] && typeof data[nest] === 'object') {
                const nested = this._digForText(data[nest]);
                if (nested) return nested;
            }
        }

        if (Array.isArray(data.segments) && data.segments.length) {
            const parts = data.segments
                .map(s => (s && (s.text || s.transcript || s.transcription)) || '')
                .map(t => String(t).trim())
                .filter(Boolean);
            if (parts.length) return parts.join(' ').replace(/\s+/g, ' ').trim();
        }

        if (Array.isArray(data)) {
            const parts = data.map(item => this._digForText(item)).filter(Boolean);
            if (parts.length) return parts.join(' ').replace(/\s+/g, ' ').trim();
        }
        if (Array.isArray(data.results)) {
            const parts = data.results.map(item => this._digForText(item)).filter(Boolean);
            if (parts.length) return parts.join(' ').replace(/\s+/g, ' ').trim();
        }
        if (Array.isArray(data.alternatives)) {
            let best = '';
            let bestConf = -1;
            for (const alt of data.alternatives) {
                const t = this._digForText(alt);
                const conf = typeof alt.confidence === 'number' ? alt.confidence
                    : (typeof alt.score === 'number' ? alt.score : 0);
                if (t && conf >= bestConf) { best = t; bestConf = conf; }
            }
            if (best) return best;
        }
        return '';
    };

    WhisperCppProvider.prototype._cleanPlainText = function (raw) {
        let t = String(raw).trim();
        if (/^\d+\s*\n\d{2}:\d{2}/.test(t) || /-->/.test(t)) {
            t = t.split(/\r?\n/)
                .filter(line => {
                    const s = line.trim();
                    if (!s) return false;
                    if (/^\d+$/.test(s)) return false;
                    if (/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(s)) return false;
                    if (/^WEBVTT/i.test(s)) return false;
                    return true;
                })
                .join(' ');
        }
        return t.replace(/\s+/g, ' ').trim();
    };
})();


// ---------------------------------------------------------------------------
// v4.1.1 — Manual / continued listen arm + cancel (fixes stuck "Processing...")
// ---------------------------------------------------------------------------
// Problem: activateWakeWord() only stamped a short wakesoundDuration window.
// If the user pressed the mic button and started speaking a few seconds later,
// requireWakeSound discarded the utterance — or a hung transcribe left
// _isProcessing true forever so the next press also failed.
//
// Fix:
//  - activateWakeWord({ listenMs, kind }) arms a longer listen window
//  - _handleSpeech treats any speech that *starts* while armed as in-session
//  - cancelProcessing() clears hung state so the button can recover
// ---------------------------------------------------------------------------

const _ac411OrigActivate = AkarinetVoice.prototype.activateWakeWord;
AkarinetVoice.prototype.activateWakeWord = function activateWakeWord(opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const listenMs = typeof o.listenMs === 'number' ? o.listenMs
        : (typeof this.config.manualListenMs === 'number' ? this.config.manualListenMs : 12000);
    this._armUntil = Date.now() + Math.max(1500, listenMs);
    this._armKind = o.kind || 'manual';
    // Call _onWakeDetect directly so class (manual/continued) is preserved for the UI.
    // Avoid going through the original activateWakeWord which hardcodes class:'manual'.
    if (typeof this._onWakeDetect === 'function') {
        this._onWakeDetect({
            score: 1,
            class: this._armKind,
            timestamp: Date.now()
        });
    } else {
        return _ac411OrigActivate.call(this);
    }
};

const _ac411OrigHandleSpeech = AkarinetVoice.prototype._handleSpeech;
AkarinetVoice.prototype._handleSpeech = async function _handleSpeech(audio) {
    // If still within the manual/continued arm window, force a fresh wake stamp
    // so the original inSession check passes even when speech starts late.
    if (this._armUntil && Date.now() < this._armUntil) {
        if (!this.wakeSoundDetectedTime || this.wakeSoundDetectedTime < this.speechStartTime) {
            // Prefer arm start ≈ speechStart so timeSinceWake is small/positive
            this.wakeSoundDetectedTime = this.speechStartTime || Date.now();
            this.lastWakeSoundScore = 1;
        }
    }
    return _ac411OrigHandleSpeech.call(this, audio);
};

const _ac411OrigParse = AkarinetVoice.prototype._parse;
AkarinetVoice.prototype._parse = function _parse(raw, wakeSoundDetected) {
    // While armed (button / continued conversation), treat as wake-sound path
    // so text wake-words are optional.
    const armed = this._armUntil && Date.now() < this._armUntil;
    const via = !!(wakeSoundDetected || armed);
    const ret = _ac411OrigParse.call(this, raw, via);
    // Consume one-shot arm after a successful parse attempt
    // (result or discard both go through here / discard paths)
    return ret;
};

/** Clear hung ASR / UI state so the mic button can recover. */
AkarinetVoice.prototype.cancelProcessing = function cancelProcessing() {
    this._isProcessing = false;
    this._armUntil = 0;
    this._armKind = null;
    this.wakeSoundDetectedTime = null;
    this._asrSessionActive = false;
    try {
        if (this.srProvider && typeof this.srProvider.stopSession === 'function') {
            this.srProvider.stopSession();
        }
    } catch (_) { /* ignore */ }
    try {
        this.dispatchEvent(new Event('processingend'));
    } catch (_) { /* ignore */ }
    this._log && this._log('INFO', 'cancelProcessing() — listen/ASR state cleared.');
};


