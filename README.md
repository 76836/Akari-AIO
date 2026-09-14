# Akari-AIO

**Fully offline, self-contained AkariNet**

This repository is a stripped-down, offline-first copy of AkariNet intended for:

- Direct browser use via GitHub Pages (or any static host)
- Packaging into a **llamafile** UI (your existing packaging script)

## What's included

- Main Akari UI shell (hardcoded to single character "Akari")
- **Audio Console** with **Vosk** (local model) for speech recognition
- **PiperTTS** assets for offline voice synthesis
- Wake-word ONNX
- No settings page, no other characters, no external CDNs for core voice path
- All models and scripts live inside the repo so `git clone` gives a working tree

## Quick start (browser / Pages)

1. Open `https://76836.github.io/Akari-AIO/` (after Pages is enabled) **or**
2. Serve the repo root with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

First load will unpack the local Vosk model (~40 MB). Subsequent loads are offline-friendly once the browser has cached it.

## llama.cpp / llamafile readiness

The UI prefers a local llama.cpp-compatible endpoint (common ports: 8080, 8443, 11434, etc.).

When you package this UI with your llamafile script, the resulting binary will serve both the model and this static frontend together.

## Layout

```
index.html          # main shell (offline defaults)
app.webmanifest
sw.js
engine/
  audioConsole.js   # adapted for local model paths
models/
  vosk/             # vosk-model-small-en-us-0.15.tar.gz
  piper/            # PiperTTS + ONNX Runtime wasm
  wake/             # hey Akari ONNX
images/
vendor/
  audioConsole-4.2.1.js
```

## Notes / still evolving

- Full VRM avatar and emotion sync are not yet forced offline in this first cut.
- The original AkariNet settings / multi-character system has been removed as requested.
- If you need additional panels or a different default model, open an issue or request a change.

## Source

Derived from https://github.com/76836/Akari (not a GitHub fork; curated copy of the offline-relevant pieces).
