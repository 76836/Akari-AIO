# Akari-AIO

Fully offline, self-contained copy of AkariNet (main UI + VRM + emotionEngine + Vosk + PiperTTS).

- No setup page (defaults hardcoded)
- Single character: Akari
- Speech: Audio Console + local Vosk model
- Voice: PiperTTS with local model.onnx
- Avatar: VRM + emotionEngine (local)
- AI: prefers local llama.cpp (for llamafile packaging)

Open `index.html` via any static server or GitHub Pages:

https://76836.github.io/Akari-AIO/

Clone this repo = complete offline tree. CDN references for core voice/avatar paths have been redirected to relative files inside the repo.
