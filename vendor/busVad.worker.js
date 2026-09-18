/**
 * BusVAD dedicated worker — own onnxruntime instance (not shared with OpenWakeWord).
 * Protocol:
 *   main → { type:'init', modelUrl, sampleRate, threshold, ortScriptUrl }
 *   main → { type:'chunk', id, buffer }  // ArrayBuffer of Float32 samples @ 16 kHz
 *   main → { type:'reset' }
 *   main → { type:'destroy' }
 *   worker → { type:'ready' }
 *   worker → { type:'result', id, triggered, confidence }
 *   worker → { type:'error', message }
 */
/* eslint-disable no-undef */
let session = null;
let ort = null;
let h = null;
let c = null;
let sampleRate = 16000;
let threshold = 0.5;
let busy = false;
const queue = [];

function post(msg) {
  try { self.postMessage(msg); } catch (_) {}
}

async function ensureOrt(ortScriptUrl) {
  if (ort && ort.InferenceSession) return;
  if (!ortScriptUrl) throw new Error('ortScriptUrl required');
  importScripts(ortScriptUrl);
  ort = self.ort;
  if (!ort || !ort.InferenceSession) throw new Error('ort failed to load in VAD worker');
  try {
    if (ort.env && ort.env.wasm) {
      ort.env.wasm.numThreads = 1;
      if (typeof ort.env.wasm.proxy === 'boolean') ort.env.wasm.proxy = false;
      // Resolve wasm next to ort.all.min.js (models/piper/)
      try {
        const u = new URL(ortScriptUrl, self.location.href);
        u.pathname = u.pathname.replace(/[^/]+$/, '');
        ort.env.wasm.wasmPaths = u.href;
      } catch (_) {}
    }
  } catch (_) {}
}

async function init(msg) {
  sampleRate = msg.sampleRate || 16000;
  threshold = msg.threshold != null ? msg.threshold : 0.5;
  await ensureOrt(msg.ortScriptUrl);
  const modelUrl = msg.modelUrl;
  if (!modelUrl) throw new Error('modelUrl required');
  session = await ort.InferenceSession.create(modelUrl, {
    executionProviders: ['wasm']
  });
  h = new ort.Tensor('float32', new Float32Array(128).fill(0), [2, 1, 64]);
  c = new ort.Tensor('float32', new Float32Array(128).fill(0), [2, 1, 64]);
  post({ type: 'ready' });
}

async function runChunk(id, buffer) {
  if (!session) {
    post({ type: 'result', id, triggered: false, confidence: 0 });
    return;
  }
  const samples = new Float32Array(buffer);
  if (!samples.length) {
    post({ type: 'result', id, triggered: false, confidence: 0 });
    return;
  }
  // Prefer official Silero 512-sample windows @ 16 kHz when chunk is longer.
  // Fall back to whole-chunk run for models that accept 1280 (OWW export).
  let confidence = 0;
  try {
    if (samples.length >= 512 && samples.length % 512 === 0) {
      let maxConf = 0;
      for (let off = 0; off + 512 <= samples.length; off += 512) {
        const win = samples.subarray(off, off + 512);
        const conf = await runOne(win);
        if (conf > maxConf) maxConf = conf;
      }
      confidence = maxConf;
    } else if (samples.length > 512) {
      // 1280 → two full 512 windows + ignore remainder (or run remainder if >= 256)
      let maxConf = 0;
      let off = 0;
      while (off + 512 <= samples.length) {
        const conf = await runOne(samples.subarray(off, off + 512));
        if (conf > maxConf) maxConf = conf;
        off += 512;
      }
      confidence = maxConf;
    } else {
      confidence = await runOne(samples);
    }
  } catch (err) {
    // Retry once with full chunk (OWW-style silero that expects 1280)
    try {
      confidence = await runOne(samples);
    } catch (err2) {
      post({ type: 'error', message: String(err2 && err2.message || err2) });
      post({ type: 'result', id, triggered: false, confidence: 0 });
      return;
    }
  }
  post({ type: 'result', id, triggered: confidence > threshold, confidence });
}

async function runOne(float32) {
  // Always copy so subarray views are stable for ORT
  const data = float32 instanceof Float32Array ? new Float32Array(float32) : new Float32Array(float32);
  const tensor = new ort.Tensor('float32', data, [1, data.length]);
  const sr = new ort.Tensor('int64', [BigInt(sampleRate)], []);
  const res = await session.run({ input: tensor, sr, h, c });
  h = res.hn;
  c = res.cn;
  return res.output.data[0];
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      if (job.type === 'init') await init(job);
      else if (job.type === 'chunk') await runChunk(job.id, job.buffer);
      else if (job.type === 'reset') {
        if (h && h.data) h.data.fill(0);
        if (c && c.data) c.data.fill(0);
      }
      else if (job.type === 'destroy') {
        session = null; h = null; c = null;
      }
    } catch (err) {
      post({ type: 'error', message: String(err && err.message || err) });
      if (job.type === 'chunk') {
        post({ type: 'result', id: job.id, triggered: false, confidence: 0 });
      }
    }
  }
  busy = false;
}

self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (msg.type === 'chunk' && msg.buffer) {
    // buffer is transferred ArrayBuffer
    queue.push(msg);
  } else {
    queue.push(msg);
  }
  pump();
};
