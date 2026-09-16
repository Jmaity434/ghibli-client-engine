# Ghibli Client Engine

**Non-AI, 100% client-side Ghibli-style processor for images & videos**

Live demo: **https://jmaity434.github.io/ghibli-client-engine/**

- Image **and** video
- **Any size** (no fixed resolution — canvas matches source)
- Multi-language UI (English + বাংলা, easy to add more)
- Test fully in the browser — then integrate on your own site
- Zero AI, zero server, MIT license

## Features

| Feature | Detail |
|--------|--------|
| Media | Image (JPEG/PNG/WebP/…) + Video + Webcam |
| Size | No fixed size — any resolution |
| Style | Bilateral smooth → 4-level cell shading → sepia ink → multiply paper grain → warm tint |
| Export | PNG for stills, WebM for video recording |
| i18n | EN + BN built-in; add languages in `src/i18n.js` |
| Integrate | ES module, a few lines of code |

## Quick test (browser only)

Open the [GitHub Pages demo](https://jmaity434.github.io/ghibli-client-engine/), load any image or video, press **Start**. Nothing is uploaded.

## Integrate on your website

```bash
git clone https://github.com/Jmaity434/ghibli-client-engine.git
```

Host the `src/` folder (static host / CDN). Then:

```html
<canvas id="out"></canvas>
<script type="module">
  import { GhibliClientEngine } from './src/modules/core-engine.js';

  const engine = new GhibliClientEngine(document.getElementById('out'), {
    edgeIntensity: 0.25,
    shaderBasePath: './src/shaders'
  });
  await engine.ready();

  // File can be image or video — any size
  await engine.loadSource(fileInput.files[0]);
  engine.startRenderLoop();

  // Still image export
  // const blob = await engine.exportImage();
</script>
```

No npm install required for basic use. No backend. No model download.

## Project structure

```
src/
  shaders/          vertex.vert + ghibli.frag
  modules/
    core-engine.js  main WebGL2 engine (image + video, any size)
    record-engine.js
  i18n.js           EN + BN strings (extend freely)
  app.js            demo UI controller
index.html          product landing + live demo
assets/             optional paper grain texture
```

## Adding a language

Edit `src/i18n.js` — copy the `en` block, translate keys, add the language code to the `<select>` in `index.html`.

## License

MIT — free for personal and commercial use.
