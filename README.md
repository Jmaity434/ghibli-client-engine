# Ghibli Client Engine

**Non-AI, 100% browser-side painterly style layer for images and video.**

Live demo: https://jmaity434.github.io/ghibli-client-engine/

Apply a soft Studio-style look (smooth surfaces, gentle cell shading, thin warm ink, golden-hour grade) on top of any image or live video stream — no server, no ML model.

## What it does

| Input | Output |
|-------|--------|
| Photo or video (any size) | Same media with a real-time Ghibli-inspired paint layer |
| Webcam / canvas stream | Continuous styled frames (ideal as an overlay on existing video players) |

Typical use: run your normal video (or camera feed) and composite this engine’s canvas on top / as a post-process step so the content keeps playing while the style layer is applied every frame.

## Look (shader pipeline)

1. Bilateral-style smooth (painterly skin & sky)
2. Soft 6-level quantize mixed with the smooth result (not hard posterize)
3. Thin warm-charcoal ink on strong silhouettes only
4. Light paper grain multiply
5. Golden-hour color grade + soft vignette

Tune edge strength with the demo slider or `edgeIntensity` in code.

## Browser demo

Open the [GitHub Pages site](https://jmaity434.github.io/ghibli-client-engine/), load any image or video, and the style is applied on-device. Nothing is uploaded.

## Integrate (any web stack)

Pure **JavaScript ES module**. Works with vanilla HTML, React, Vue, Next.js, Svelte, or any environment that can run browser JS.

```bash
git clone https://github.com/Jmaity434/ghibli-client-engine.git
```

Host the `src/` folder, then:

```html
<canvas id="out"></canvas>
<input type="file" id="media" accept="image/*,video/*" />
<script type="module">
  import { GhibliClientEngine } from './src/modules/core-engine.js';

  const engine = new GhibliClientEngine(document.getElementById('out'), {
    edgeIntensity: 0.25,
    shaderBasePath: './src/shaders'
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

### Overlay on an existing video element

```js
// Your video is already playing (e.g. from a scanner / player pipeline)
await engine.loadSource(existingVideoElement); // or draw video → engine each frame
engine.startRenderLoop();
// Style the engine.canvas CSS over your player, or use engine.getCanvasStream()
```

No npm install required for basic use. No backend. No model download.

## Project layout

```
src/
  shaders/
    vertex.vert
    ghibli.frag      # painterly pipeline
  modules/
    core-engine.js   # WebGL2 engine (image + video, any size)
    record-engine.js # optional WebM capture
  i18n.js
  app.js             # demo UI only
index.html           # public demo
assets/              # optional paper grain texture
```

## License

MIT — free for personal and commercial use.
