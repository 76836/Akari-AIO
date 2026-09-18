/**
 * BusVAD worker — isolated ORT for Silero only.
 * Do NOT declare `let ort` / `var ort` here: ort.*.js also binds `ort` via importScripts.
 */
let session = null;
let ortApi = null; // local handle only — never named `ort`
let h = null;
let c = null;
let sampleRate = 16000;
let threshold = 0.5;

function post(msg) {
  try { self.postMessage(msg); } catch (_) {}
}

function loadOrt(scriptUrl) {
  // Clears any previous binding only if we control it; importScripts sets global ort.
  importScripts(scriptUrl);
  ortApi = self.ort;
  if (!ortApi || !ortApi.InferenceSession) {
    throw new Error('ort missing after importScripts: ' + scriptUrl);
  }
  try {
    if (ortApi.env && ortApi.env.wasm) {
      ortApi.env.wasm.numThreads = 1;
      if (typeof ortApi.env.wasm.proxy === 'boolean') ortApi.env.wasm.proxy = false;
      try {
        const u = new URL(scriptUrl, self.location.href);
        ortApi.env.wasm.wasmPaths = u.href.replace(/[^/]+$/, '');
      } catch (_) {}
    }
  } catch (_) {}
}

async function init(msg) {
  sampleRate = msg.sampleRate || 16000;
  threshold = msg.threshold != null ? msg.threshold : 0.5;
  const candidates = [];
  if (msg.ortScriptUrl) candidates.push(msg.ortScriptUrl);
  if (msg.ortScriptUrlFallback) candidates.push(msg.ortScriptUrlFallback);
  candidates.push('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js');

  let lastErr = null;
  ortApi = null;
  for (const url of candidates) {
    try {
      loadOrt(url);
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      ortApi = null;
    }
  }
  if (!ortApi) throw lastErr || new Error('could not load ort in VAD worker');

  const modelUrl = msg.modelUrl;
  if (!modelUrl) throw new Error('modelUrl required');
  session = await ortApi.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
  h = new ortApi.Tensor('float32', new Float32Array(128).fill(0), [2, 1, 64]);
  c = new ortApi.Tensor('float32', new Float32Array(128).fill(0), [2, 1, 64]);
  post({ type: 'ready' });
}

async function runOne(float32) {
  const data = float32 instanceof Float32Array ? new Float32Array(float32) : new Float32Array(float32);
  const tensor = new ortApi.Tensor('float32', data, [1, data.length]);
  const sr = new ortApi.Tensor('int64', [BigInt(sampleRate)], []);
  const res = await session.run({ input: tensor, sr, h, c });
  h = res.hn;
  c = res.cn;
  return res.output.data[0];
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
  let confidence = 0;
  try {
    confidence = await runOne(samples);
  } catch (_) {
    try {
      let maxConf = 0;
      for (let off = 0; off + 512 <= samples.length; off += 512) {
        const conf = await runOne(samples.subarray(off, off + 512));
        if (conf > maxConf) maxConf = conf;
      }
      confidence = maxConf;
    } catch (err2) {
      post({ type: 'error', message: String(err2 && err2.message || err2) });
      post({ type: 'result', id, triggered: false, confidence: 0 });
      return;
    }
  }
  post({ type: 'result', id, triggered: confidence > threshold, confidence });
}

self.onmessage = async (ev) => {
  const msg = ev.data || {};
  try {
    if (msg.type === 'init') {
      await init(msg);
    } else if (msg.type === 'chunk') {
      await runChunk(msg.id, msg.buffer);
    } else if (msg.type === 'reset') {
      if (h && h.data) h.data.fill(0);
      if (c && c.data) c.data.fill(0);
    } else if (msg.type === 'destroy') {
      session = null;
      h = null;
      c = null;
    }
  } catch (err) {
    post({ type: 'error', message: String(err && err.message || err) });
  }
};
