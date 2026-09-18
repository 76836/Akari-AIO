/**
 * BusVAD worker — isolated ORT for Silero only.
 * Messages: init | chunk | reset | destroy
 * Replies: ready | result | error
 */
let session = null;
let ort = null;
let h = null;
let c = null;
let sampleRate = 16000;
let threshold = 0.5;

function post(msg) {
  try { self.postMessage(msg); } catch (_) {}
}

function loadOrt(scriptUrl) {
  importScripts(scriptUrl);
  ort = self.ort;
  if (!ort || !ort.InferenceSession) throw new Error('ort missing after importScripts: ' + scriptUrl);
  try {
    if (ort.env && ort.env.wasm) {
      ort.env.wasm.numThreads = 1;
      if (typeof ort.env.wasm.proxy === 'boolean') ort.env.wasm.proxy = false;
      try {
        const u = new URL(scriptUrl, self.location.href);
        const dir = u.href.replace(/[^/]+$/, '');
        ort.env.wasm.wasmPaths = dir;
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
  for (const url of candidates) {
    try {
      loadOrt(url);
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
      ort = null;
    }
  }
  if (!ort) throw lastErr || new Error('could not load ort in VAD worker');

  const modelUrl = msg.modelUrl;
  if (!modelUrl) throw new Error('modelUrl required');
  session = await ort.InferenceSession.create(modelUrl, { executionProviders: ['wasm'] });
  h = new ort.Tensor('float32', new Float32Array(128).fill(0), [2, 1, 64]);
  c = new ort.Tensor('float32', new Float32Array(128).fill(0), [2, 1, 64]);
  post({ type: 'ready' });
}

async function runOne(float32) {
  const data = float32 instanceof Float32Array ? new Float32Array(float32) : new Float32Array(float32);
  const tensor = new ort.Tensor('float32', data, [1, data.length]);
  const sr = new ort.Tensor('int64', [BigInt(sampleRate)], []);
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
    // Try full chunk first (OWW silero export often expects 1280)
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
      session = null; h = null; c = null;
    }
  } catch (err) {
    post({ type: 'error', message: String(err && err.message || err) });
  }
};
