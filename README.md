# Ghibli Client Engine

**Non-AI, 100% browser-side painterly style layer for images and video.**

Live demo: https://jmaity434.github.io/ghibli-client-engine/

Apply a soft Studio-style look (smooth surfaces, gentle cel shading, thin warm ink outlines, procedural watercolor paper grain, golden-hour grade) on top of any image, video element, canvas, or live video stream — no server, no ML model.

## What it does

| Input | Output |
|-------|--------|
| Photo or video (any size / aspect ratio) | Same media with a real-time Ghibli-inspired paint layer |
| Video player / AR tracked playback video | Direct real-time styled overlay layer |
| Webcam / canvas stream | Continuous styled frames (ideal as an overlay on existing video players) |

Typical use: run your normal video (or camera feed) and composite this engine’s canvas on top / as a post-process step so the content keeps playing while the style layer is applied every frame.

## Look (shader pipeline)

1. **Adaptive Bilateral Smooth** (13-tap cross & diagonal kernel, 60fps real-time on mobile GPU)
2. **Soft 6-level cel shading** mixed with the smooth result
3. **Thin warm-charcoal ink outlines** on strong silhouettes only
4. **Procedural watercolor paper grain** (built-in in-memory generator, zero 404 network requests)
5. **Golden-hour color grade** + soft atmosphere vignette

## Browser demo

Open the [GitHub Pages site](https://jmaity434.github.io/ghibli-client-engine/), load any image or video (or click **Sample Scene**), and the style is applied on-device. Nothing is uploaded.

## Integrate (any web stack)

Pure **JavaScript ES module**. Works with vanilla HTML, React, Vue, Next.js, Svelte, or any environment that can run browser JS.

```bash
git clone https://github.com/Jmaity434/ghibli-client-engine.git
```

Host or import `core-engine.js`:

```html
<canvas id="out"></canvas>
<input type="file" id="media" accept="image/*,video/*" />
<script type="module">
  import { GhibliClientEngine } from './src/modules/core-engine.js';

  const engine = new GhibliClientEngine(document.getElementById('out'), {
    edgeIntensity: 0.25,
    fit: 'contain', // 'contain' | 'cover' | 'fill'
  });
  await engine.ready();

  // Image or video, any resolution — canvas matches source size
  document.getElementById('media').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await engine.loadSource(file);
    engine.startRenderLoop();
  });
</script>
```

### Overlay on an existing video element (e.g. AR / smart print video playback)

```js
import { GhibliClientEngine } from './src/modules/core-engine.js';

const existingVideo = document.getElementById('my-video');
const overlayCanvas = document.getElementById('ghibli-overlay');

const engine = new GhibliClientEngine(overlayCanvas, {
  edgeIntensity: 0.25,
  fit: 'contain'
});
await engine.ready();

// Directly attaches to the playing video element in real time
await engine.loadSource(existingVideo); // or engine.attachVideo(existingVideo);
engine.startRenderLoop();

// Export with audio if needed
const stream = engine.getCanvasStream(30, true);
```

No npm install required for basic use. No backend. No model download.

## API Reference

### Constructor options
- `edgeIntensity`: Outline thickness (0.05 to 1.0, default 0.25)
- `fit`: Aspect ratio mode (`'contain'`, `'cover'`, `'fill'`)
- `shaderBasePath`: Optional custom shader path

### Methods
- `loadSource(source)`: Accepts `HTMLVideoElement`, `HTMLImageElement`, `HTMLCanvasElement`, `MediaStream`, `File`, `Blob`, or URL string
- `attachVideo(videoElement)`: Direct attachment to video element
- `startRenderLoop()`: Starts continuous rendering
- `stopEngine()`: Stops rendering
- `drawFrame()` / `processStill()`: Draws a single frame
- `setEdgeIntensity(value)`: Update edge intensity on the fly
- `setFit(fit)`: Update fit mode ('contain', 'cover', 'fill')
- `getCanvasStream(fps?, includeAudio?)`: Export stream
- `exportImage(type?, quality?)`: Blob export for screenshots
- `destroy()`: Complete WebGL and resource cleanup

## License

MIT — free for personal and commercial use.
