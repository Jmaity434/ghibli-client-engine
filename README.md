# Ghibli Client Engine

**Production-ready Non-AI Client-Side Ghibli Canvas Engine**

Real-time video-to-Ghibli style rendering pipeline running 100% inside the browser using WebGL2. Zero server overhead. Zero AI/ML dependencies.

## Features

- **Bilateral + Quantization Filter** — Smooth anime/paint look without neural nets
- **Sobel Edge Detection** — Classic hand-drawn ink outlines
- **Layered Canvas Compositing** — Paper grain texture + processed frame + line art
- **60 FPS Target** on modern hardware (up to 1080p)
- **MediaRecorder Integration** — Record & download WebM directly from canvas
- **Pure Client-Side** — No backend, no API keys, no model downloads

## Architecture

```
Raw HTML5 Video Stream
        ↓
Canvas2D Scratchpad (frame extraction)
        ↓
WebGL2 Shader Pipeline
  • Bilateral / Anisotropic Smooth
  • Sobel Edge Engine
  • Color Quantization + LUT
        ↓
Layered Compositing
  • Base: Ghibli paper grain
  • Middle: Quantized frame
  • Top: Sobel lines + vignette
        ↓
Final Canvas / MediaRecorder
```

## Quick Start

```bash
# Clone
git clone https://github.com/Jmaity434/ghibli-client-engine.git
cd ghibli-client-engine

# Serve locally (any static server)
npx serve .
# or
python -m http.server 8080
```

Open `http://localhost:8080` and load a video or use your webcam.

## Project Structure

```
.
├── .github/workflows/deploy.yml   # GitHub Pages auto-deploy
├── assets/
│   ├── ghibli-grain.jpg             # Seamless paper texture (add your own)
│   └── reference-presets/           # Future LUT / style presets
├── src/
│   ├── shaders/
│   │   ├── vertex.vert
│   │   └── ghibli.frag               # Core bilateral + Sobel logic
│   ├── modules/
│   │   ├── core-engine.js            # WebGL2 context + render loop
│   │   └── record-engine.js          # MediaRecorder wrapper
│   └── app.js                      # UI bindings
├── index.html
└── README.md
```

## Usage (Programmatic)

```js
import { GhibliClientEngine } from './src/modules/core-engine.js';

const canvas = document.getElementById('ghibli-canvas');
const engine = new GhibliClientEngine(canvas, {
  edgeIntensity: 0.25
});

// Load a video file
await engine.loadSourceVideo(fileInput.files[0]);
engine.startRenderLoop();

// Record
engine.startRecording();
// ... later
const url = await engine.stopRecordingAndDownload();
```

## Shader Notes

The fragment shader implements:

1. **Bilateral-style smoothing** (5×5 neighborhood with spatial + color distance weights)
2. **Color quantization** to 8 levels for the classic flat-color Ghibli look
3. **Sobel edge extraction** with dark brown ink outlines
4. **Paper grain blending** via `u_ghibliTexture`

Tune `u_edgeIntensity` (default `0.25`) for thicker/thinner lines.

## Deployment

The included GitHub Actions workflow deploys to GitHub Pages on every push to `main`.

Enable Pages in repository settings → Pages → Source: GitHub Actions.

## License

MIT — free for personal and commercial use.

---

Built for maximum client-side performance. No AI. No servers. Just pure WebGL2.
