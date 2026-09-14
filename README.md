<p align="left">
  <img src="./images/banner.png" width="100%" alt="Akari-AIO"/>
</p>

> ### **Akari-AIO: Fully offline, self-contained AkariNet**
> [PocketTTS](https://github.com/76836/AkariNet-PocketTTS/tree/main)
>
> [Akari AI Server (llama.cpp)](https://github.com/76836/AkariNet-AI-Server)
>
> [AkariNet Audio Console](https://github.com/76836/AkariNet-AudioConsole/tree/main)
>
> [KittenTTS](https://github.com/76836/AkariNet-KittenTTS/tree/main)
>
> [AkariNet Automata](https://github.com/76836/AkariNet-Automata/tree/main)
>
> [emotionEngine](https://github.com/76836/emotionEngine)

<br>

# Akari-AIO

Lightweight offline distribution of AkariNet — main UI, VRM avatar, emotionEngine, Vosk STT, and PiperTTS, all in-repo.

- **No setup page** — offline defaults are hardcoded (Vosk + Piper + VRM4 + Audio Console)
- **Single character:** Akari (optimized VRM only)
- **Speech:** Audio Console + local Vosk model
- **Voice:** PiperTTS with local `model.onnx`
- **AI:** prefers local llama.cpp (ready for llamafile packaging)
- Service worker skips caching on `localhost` / `127.0.0.1` / `file:`

## Use

```bash
git clone https://github.com/76836/Akari-AIO.git
cd Akari-AIO
npx serve .
# or open via any static server / your llamafile packager
```

ZIP: https://github.com/76836/Akari-AIO/archive/refs/heads/main.zip

## Layout

```
index.html              # full AkariNet UI (offline defaults)
engine/                 # Audio Console adapter, VRM renderer, emotionEngine
characters/akari/       # PiperTTS, Llama1B adapter, VRM4, response scripts
models/vosk/            # vosk-model-small-en-us-0.15.tar.gz
models/piper/           # model.onnx + ONNX Runtime + worker
models/wake/            # (wake ONNXes also under engine/models/)
images/                 # icons + banner
vendor/                 # audioConsole-4.2.1.js
```

Derived from [76836/Akari](https://github.com/76836/Akari) — curated offline subset, not a GitHub fork.


## llamafile builder

Lives on the site (stream-to-disk, Akari-AIO UI pack):

**https://76836.github.io/llamafile-builder.html**
