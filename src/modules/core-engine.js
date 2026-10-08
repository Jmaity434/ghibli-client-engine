/**
 * GhibliClientEngine
 * 100% client-side WebGL2 Ghibli-style processor.
 * Supports any-size images, videos, canvas, and live camera streams.
 * Real-time painterly style layer (bilateral smoothing, soft cel-shading,
 * warm ink outlines, procedural paper grain, and golden-hour grade).
 * Zero server. Zero AI. MIT License.
 */

const DEFAULT_VS = `#version 300 es
in vec2 position;
out vec2 v_texCoord;

void main() {
    v_texCoord = position * 0.5 + 0.5;
    v_texCoord.y = 1.0 - v_texCoord.y; // Standard video coordinate alignment
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const DEFAULT_FS = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_videoTexture;
uniform sampler2D u_ghibliTexture;
uniform vec2 u_resolution;
uniform float u_edgeIntensity;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_fitMode; // 0.0 = fill, 1.0 = contain, 2.0 = cover

// Soft luminance for edge detection
float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 uv = (v_texCoord - u_uvOffset) / u_uvScale;

    // Contain letterboxing
    if (u_fitMode > 0.5 && u_fitMode < 1.5) {
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            outColor = vec4(0.04, 0.035, 0.03, 1.0);
            return;
        }
    }

    vec2 onePixel = vec2(1.0) / max(u_resolution, vec2(1.0));
    vec3 center = texture(u_videoTexture, uv).rgb;

    // -------------------------------------------------------
    // 1. Optimized adaptive bilateral smooth (Studio painterly surfaces)
    //    Balanced 13-tap cross & diagonal kernel for high 60fps performance
    // -------------------------------------------------------
    vec3 colorAcc = center;
    float weightAcc = 1.0;

    const vec2 offsets[12] = vec2[](
        vec2( 0.0,  1.5), vec2( 0.0, -1.5), vec2( 1.5,  0.0), vec2(-1.5,  0.0),
        vec2( 1.2,  1.2), vec2(-1.2,  1.2), vec2( 1.2, -1.2), vec2(-1.2, -1.2),
        vec2( 0.0,  2.8), vec2( 0.0, -2.8), vec2( 2.8,  0.0), vec2(-2.8,  0.0)
    );

    for (int i = 0; i < 12; i++) {
        vec2 sampleUv = clamp(uv + offsets[i] * onePixel, 0.0, 1.0);
        vec3 col = texture(u_videoTexture, sampleUv).rgb;
        float dColor = distance(center, col);
        float w = exp(-dColor * dColor / 0.06);
        colorAcc += col * w;
        weightAcc += w;
    }

    vec3 smoothed = colorAcc / weightAcc;

    // -------------------------------------------------------
    // 2. Soft cel shading (gentle 6-level tonal grouping)
    // -------------------------------------------------------
    vec3 quantized = floor(smoothed * 6.0 + 0.5) / 6.0;
    vec3 baseColor = mix(smoothed, quantized, 0.42);

    // -------------------------------------------------------
    // 3. Thin, warm ink outlines (Sobel on luminance)
    // -------------------------------------------------------
    float lC  = luma(center);
    float lL  = luma(texture(u_videoTexture, clamp(uv + vec2(-onePixel.x, 0.0), 0.0, 1.0)).rgb);
    float lR  = luma(texture(u_videoTexture, clamp(uv + vec2( onePixel.x, 0.0), 0.0, 1.0)).rgb);
    float lT  = luma(texture(u_videoTexture, clamp(uv + vec2(0.0,  onePixel.y), 0.0, 1.0)).rgb);
    float lB  = luma(texture(u_videoTexture, clamp(uv + vec2(0.0, -onePixel.y), 0.0, 1.0)).rgb);
    float lTL = luma(texture(u_videoTexture, clamp(uv + vec2(-onePixel.x,  onePixel.y), 0.0, 1.0)).rgb);
    float lTR = luma(texture(u_videoTexture, clamp(uv + vec2( onePixel.x,  onePixel.y), 0.0, 1.0)).rgb);
    float lBL = luma(texture(u_videoTexture, clamp(uv + vec2(-onePixel.x, -onePixel.y), 0.0, 1.0)).rgb);
    float lBR = luma(texture(u_videoTexture, clamp(uv + vec2( onePixel.x, -onePixel.y), 0.0, 1.0)).rgb);

    float gx = -lTL - 2.0 * lL - lBL + lTR + 2.0 * lR + lBR;
    float gy = -lTL - 2.0 * lT - lTR + lBL + 2.0 * lB + lBR;
    float edge = sqrt(gx * gx + gy * gy);

    float edgeStart = u_edgeIntensity * 1.1;
    float edgeEnd   = u_edgeIntensity * 2.3;
    float inkMask = smoothstep(edgeStart, edgeEnd, edge);
    inkMask = inkMask * inkMask;

    // -------------------------------------------------------
    // 4. Watercolor / paper grain multiply
    // -------------------------------------------------------
    vec3 grain = texture(u_ghibliTexture, uv * 3.5).rgb;
    grain = mix(vec3(1.0), grain, 0.24);
    vec3 mixed = baseColor * grain;

    // -------------------------------------------------------
    // 5. Golden-hour / nostalgic anime grade
    // -------------------------------------------------------
    mixed.r = mixed.r * 1.12 + 0.02;
    mixed.g = mixed.g * 1.06 + 0.015;
    mixed.b = mixed.b * 0.88;

    mixed = pow(clamp(mixed, 0.0, 1.0), vec3(0.92));

    vec3 goldWash = vec3(1.0, 0.93, 0.76);
    mixed = mix(mixed, mixed * goldWash, 0.16);

    // Warm charcoal ink outlines
    vec3 inkColor = vec3(0.20, 0.13, 0.09);
    mixed = mix(mixed, inkColor, inkMask * 0.55);

    // Soft atmosphere vignette
    vec2 vuv = v_texCoord - 0.5;
    float vig = 1.0 - dot(vuv, vuv) * 0.32;
    mixed *= vig;

    outColor = vec4(clamp(mixed, 0.0, 1.0), 1.0);
}`;

export class GhibliClientEngine {
    constructor(canvasElement, config = {}) {
        if (!canvasElement) {
            throw new Error('GhibliClientEngine requires a target HTMLCanvasElement');
        }
        this.canvas = canvasElement;
        this.gl = this.canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
        });

        if (!this.gl) {
            throw new Error('WebGL2 context initialization failed on this device.');
        }

        // Internal media element pool
        this._internalVideo = document.createElement('video');
        this._internalVideo.muted = true;
        this._internalVideo.loop = true;
        this._internalVideo.playsInline = true;
        this._internalVideo.crossOrigin = 'anonymous';

        this._internalImage = new Image();
        this._internalImage.crossOrigin = 'anonymous';

        // Active source reference (can be HTMLVideoElement, HTMLImageElement, HTMLCanvasElement)
        this.activeSource = null;
        this.sourceType = null; // 'video' | 'image' | 'webcam' | 'canvas'

        this.edgeIntensity = config.edgeIntensity ?? 0.25;
        this.fit = config.fit ?? 'contain'; // 'contain' | 'cover' | 'fill'
        this.shaderBasePath = config.shaderBasePath ?? './src/shaders';
        this.paperTextureUrl = config.paperTextureUrl ?? './assets/ghibli-grain.jpg';

        this.isProcessing = false;
        this.animationFrameId = null;

        this.program = null;
        this.positionBuffer = null;
        this.videoTexture = null;
        this.paperTexture = null;
        this._locations = null;
        this._lastW = 0;
        this._lastH = 0;

        this._onContextLost = (e) => {
            e.preventDefault();
            this.stopEngine();
        };
        this._onContextRestored = () => {
            this.initWebGL();
            if (this.isProcessing) this.startRenderLoop();
        };
        this.canvas.addEventListener('webglcontextlost', this._onContextLost, false);
        this.canvas.addEventListener('webglcontextrestored', this._onContextRestored, false);

        this._ready = this.initWebGL();
    }

    async ready() {
        return this._ready;
    }

    async initWebGL() {
        const gl = this.gl;
        if (!gl) return;

        let vsSource = DEFAULT_VS;
        let fsSource = DEFAULT_FS;

        // Optionally load custom shader files if explicitly configured and available
        if (this.shaderBasePath) {
            try {
                const [vs, fs] = await Promise.all([
                    this.loadShaderSource(`${this.shaderBasePath}/vertex.vert`),
                    this.loadShaderSource(`${this.shaderBasePath}/ghibli.frag`)
                ]);
                if (vs && fs) {
                    vsSource = vs;
                    fsSource = fs;
                }
            } catch (_) {
                // Fall back to built-in high-performance shaders silently
            }
        }

        this.program = this.createProgram(gl, vsSource, fsSource);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
            -1.0,  1.0,
             1.0, -1.0,
             1.0,  1.0,
        ]), gl.STATIC_DRAW);

        this.videoTexture = gl.createTexture();
        this.setupTextureProperties(gl, this.videoTexture);

        this.paperTexture = gl.createTexture();
        this.setupTextureProperties(gl, this.paperTexture);

        // Generate procedural high-res organic paper grain texture in memory
        this.generateProceduralPaperTexture(gl);

        // Cache uniform/attribute locations
        this._locations = {
            position: gl.getAttribLocation(this.program, 'position'),
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            edgeIntensity: gl.getUniformLocation(this.program, 'u_edgeIntensity'),
            videoTexture: gl.getUniformLocation(this.program, 'u_videoTexture'),
            ghibliTexture: gl.getUniformLocation(this.program, 'u_ghibliTexture'),
            uvScale: gl.getUniformLocation(this.program, 'u_uvScale'),
            uvOffset: gl.getUniformLocation(this.program, 'u_uvOffset'),
            fitMode: gl.getUniformLocation(this.program, 'u_fitMode'),
        };

        // Try loading custom paper image texture if provided
        if (this.paperTextureUrl && this.paperTextureUrl !== './assets/ghibli-grain.jpg') {
            this.loadPaperTexture(this.paperTextureUrl).catch(() => {});
        }
    }

    setupTextureProperties(gl, texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    /**
     * Generates a 256x256 watercolor paper grain pattern directly in memory (zero 404 network requests)
     */
    generateProceduralPaperTexture(gl) {
        const size = 256;
        const data = new Uint8Array(size * size * 4);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                // Organic fiber noise
                const n1 = Math.sin(x * 0.12) * Math.cos(y * 0.14);
                const n2 = Math.sin(x * 0.45 + y * 0.35);
                const rand = (Math.random() - 0.5) * 22;
                const base = Math.max(180, Math.min(245, Math.floor(215 + (n1 + n2) * 12 + rand)));

                data[idx]     = Math.min(255, base + 8);   // R slightly warmer
                data[idx + 1] = base;                      // G
                data[idx + 2] = Math.max(160, base - 14);  // B warmer tint
                data[idx + 3] = 255;
            }
        }
        gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }

    async loadPaperTexture(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const gl = this.gl;
                if (!gl) return resolve();
                gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                resolve();
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    async loadShaderSource(path) {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load shader: ${path}`);
        return res.text();
    }

    createProgram(gl, vsSource, fsSource) {
        const vs = this.compileShader(gl, vsSource, gl.VERTEX_SHADER);
        const fs = this.compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const log = gl.getProgramInfoLog(program);
            throw new Error('Program link failed: ' + log);
        }
        return program;
    }

    compileShader(gl, source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Shader compile error: ' + log);
        }
        return shader;
    }

    /**
     * Load source from any type: HTMLVideoElement, HTMLImageElement, HTMLCanvasElement, MediaStream, File, Blob, or URL string.
     */
    async loadSource(source) {
        await this.ready();

        if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
            return this.attachVideo(source);
        }
        if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
            return this.attachImage(source);
        }
        if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
            return this.attachCanvas(source);
        }
        if (typeof MediaStream !== 'undefined' && source instanceof MediaStream) {
            return this.attachStream(source);
        }

        const isFile = source instanceof File || source instanceof Blob;
        const mime = isFile ? (source.type || '') : '';
        const name = isFile && source.name ? source.name.toLowerCase() : '';

        const looksImage =
            mime.startsWith('image/') ||
            /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(name) ||
            (!isFile && /\.(jpe?g|png|webp|gif|bmp|avif)(\?|$)/i.test(String(source)));

        if (looksImage) {
            return this.loadSourceImage(source);
        }
        return this.loadSourceVideo(source);
    }

    /**
     * Directly attach an existing video element (ideal for AR tracked video playback)
     */
    attachVideo(videoElement) {
        this.stopEngine();
        this.activeSource = videoElement;
        this.sourceType = 'video';

        const updateDimensions = () => {
            const w = videoElement.videoWidth || videoElement.clientWidth || 640;
            const h = videoElement.videoHeight || videoElement.clientHeight || 360;
            this.syncCanvasSize(w, h);
            return { width: w, height: h, type: 'video' };
        };

        if (videoElement.readyState >= 2 && videoElement.videoWidth) {
            return Promise.resolve(updateDimensions());
        }

        return new Promise((resolve) => {
            const onLoaded = () => {
                videoElement.removeEventListener('loadeddata', onLoaded);
                resolve(updateDimensions());
            };
            videoElement.addEventListener('loadeddata', onLoaded);
            setTimeout(() => resolve(updateDimensions()), 500);
        });
    }

    attachImage(imageElement) {
        this.stopEngine();
        this.activeSource = imageElement;
        this.sourceType = 'image';

        const w = imageElement.naturalWidth || imageElement.width || 640;
        const h = imageElement.naturalHeight || imageElement.height || 480;
        this.syncCanvasSize(w, h);
        return Promise.resolve({ width: w, height: h, type: 'image' });
    }

    attachCanvas(canvasElement) {
        this.stopEngine();
        this.activeSource = canvasElement;
        this.sourceType = 'canvas';

        const w = canvasElement.width || 640;
        const h = canvasElement.height || 480;
        this.syncCanvasSize(w, h);
        return Promise.resolve({ width: w, height: h, type: 'canvas' });
    }

    async attachStream(stream) {
        this.stopEngine();
        this.sourceType = 'webcam';
        this.activeSource = this._internalVideo;
        this._internalVideo.srcObject = stream;
        await this._internalVideo.play().catch(() => {});

        const w = this._internalVideo.videoWidth || 640;
        const h = this._internalVideo.videoHeight || 480;
        this.syncCanvasSize(w, h);
        return { width: w, height: h, type: 'webcam' };
    }

    loadSourceImage(fileOrUrl) {
        return new Promise((resolve, reject) => {
            this.stopEngine();
            this.sourceType = 'image';
            this.activeSource = this._internalImage;

            this._internalImage = new Image();
            this._internalImage.crossOrigin = 'anonymous';
            this.activeSource = this._internalImage;

            const url = (fileOrUrl instanceof File || fileOrUrl instanceof Blob)
                ? URL.createObjectURL(fileOrUrl)
                : fileOrUrl;

            this._internalImage.onload = async () => {
                try {
                    if (this._internalImage.decode) {
                        await this._internalImage.decode();
                    }
                } catch (_) {}

                const w = this._internalImage.naturalWidth || this._internalImage.width;
                const h = this._internalImage.naturalHeight || this._internalImage.height;
                if (!w || !h) {
                    reject(new Error('Image has zero dimensions'));
                    return;
                }
                this.syncCanvasSize(w, h);
                resolve({ width: w, height: h, type: 'image' });
            };
            this._internalImage.onerror = () => reject(new Error('Image load failed'));
            this._internalImage.src = url;
        });
    }

    loadSourceVideo(fileOrUrl) {
        return new Promise((resolve, reject) => {
            this.stopEngine();
            this.sourceType = 'video';
            this.activeSource = this._internalVideo;

            if (this._internalVideo.srcObject) {
                this._internalVideo.srcObject.getTracks().forEach(t => t.stop());
                this._internalVideo.srcObject = null;
            }

            if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
                this._internalVideo.src = URL.createObjectURL(fileOrUrl);
            } else {
                this._internalVideo.src = fileOrUrl;
            }

            this._internalVideo.onloadeddata = () => {
                const w = this._internalVideo.videoWidth;
                const h = this._internalVideo.videoHeight;
                if (!w || !h) {
                    reject(new Error('Video has zero dimensions'));
                    return;
                }
                this.syncCanvasSize(w, h);
                this._internalVideo.play().catch(() => {});
                resolve({ width: w, height: h, type: 'video' });
            };
            this._internalVideo.onerror = () => reject(new Error('Video load failed'));
            this._internalVideo.load();
        });
    }

    getSourceDimensions() {
        const el = this.activeSource;
        if (!el) return { w: 640, h: 360 };
        if (this.sourceType === 'image') {
            return {
                w: el.naturalWidth || el.width || 640,
                h: el.naturalHeight || el.height || 480,
            };
        }
        if (this.sourceType === 'canvas') {
            return { w: el.width || 640, h: el.height || 480 };
        }
        return {
            w: el.videoWidth || el.clientWidth || 640,
            h: el.videoHeight || el.clientHeight || 360,
        };
    }

    syncCanvasSize(srcW, srcH) {
        const gl = this.gl;
        if (!gl) return;
        const dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2);
        const clientW = this.canvas.clientWidth ? Math.round(this.canvas.clientWidth * dpr) : Math.round(srcW * dpr);
        const clientH = this.canvas.clientHeight ? Math.round(this.canvas.clientHeight * dpr) : Math.round(srcH * dpr);
        const w = Math.max(1, clientW | 0);
        const h = Math.max(1, clientH | 0);
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
            gl.viewport(0, 0, w, h);
            this._lastW = w;
            this._lastH = h;
        }
    }

    drawFrame() {
        if (!this.program || !this.sourceType || !this.activeSource) return;

        const gl = this.gl;
        if (!gl) return;
        const loc = this._locations;
        const sourceEl = this.activeSource;

        if (this.sourceType === 'image' && (!sourceEl.complete || !sourceEl.naturalWidth)) {
            return;
        }
        if (this.sourceType === 'video' && (sourceEl.readyState < 2 || !sourceEl.videoWidth)) {
            return;
        }

        const { w: srcW, h: srcH } = this.getSourceDimensions();
        this.syncCanvasSize(srcW, srcH);

        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceEl);
        } catch (_) {
            return;
        }

        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(loc.position);
        gl.vertexAttribPointer(loc.position, 2, gl.FLOAT, false, 0, 0);

        const canvasAspect = this._lastW / Math.max(1, this._lastH);
        const videoAspect = srcW / Math.max(1, srcH);

        let scaleX = 1.0;
        let scaleY = 1.0;
        let offsetX = 0.0;
        let offsetY = 0.0;
        let fitMode = 0.0;

        if (this.fit === 'contain') {
            fitMode = 1.0;
            if (videoAspect > canvasAspect) {
                scaleY = canvasAspect / videoAspect;
                offsetY = (1.0 - scaleY) * 0.5;
            } else {
                scaleX = videoAspect / canvasAspect;
                offsetX = (1.0 - scaleX) * 0.5;
            }
        } else if (this.fit === 'cover') {
            fitMode = 2.0;
            if (videoAspect > canvasAspect) {
                scaleX = canvasAspect / videoAspect;
                offsetX = (1.0 - scaleX) * 0.5;
            } else {
                scaleY = videoAspect / canvasAspect;
                offsetY = (1.0 - scaleY) * 0.5;
            }
        }

        gl.uniform2f(loc.resolution, this._lastW, this._lastH);
        gl.uniform1f(loc.edgeIntensity, this.edgeIntensity);
        gl.uniform2f(loc.uvScale, scaleX, scaleY);
        gl.uniform2f(loc.uvOffset, offsetX, offsetY);
        gl.uniform1f(loc.fitMode, fitMode);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        gl.uniform1i(loc.videoTexture, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
        gl.uniform1i(loc.ghibliTexture, 1);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    startRenderLoop() {
        if (this.isProcessing) return;
        if (!this.sourceType || !this.activeSource) return;

        this.isProcessing = true;

        if ((this.sourceType === 'video' || this.sourceType === 'webcam') && this.activeSource instanceof HTMLVideoElement) {
            if (this.activeSource.paused) {
                this.activeSource.play().catch(() => {});
            }
        }

        if (this.sourceType === 'image') {
            this.drawFrame();
            this.isProcessing = false;
            return;
        }

        const render = () => {
            if (!this.isProcessing) return;
            this.drawFrame();
            this.animationFrameId = requestAnimationFrame(render);
        };

        this.animationFrameId = requestAnimationFrame(render);
    }

    /** Realtime layer start (alias of startRenderLoop) — continuous 60fps style overlay */
    start() {
        this.startRenderLoop();
    }

    processStill() {
        this.drawFrame();
    }

    stopEngine() {
        this.isProcessing = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        if (this._internalVideo) {
            this._internalVideo.pause();
            if (this._internalVideo.srcObject) {
                this._internalVideo.srcObject.getTracks().forEach(t => t.stop());
                this._internalVideo.srcObject = null;
            }
        }
    }

    /** Realtime layer stop (alias of stopEngine) */
    stop() {
        this.stopEngine();
    }

    setEdgeIntensity(value) {
        this.edgeIntensity = Math.max(0.05, Math.min(1.0, value));
    }

    setFit(fit) {
        if (['contain', 'cover', 'fill'].includes(fit)) {
            this.fit = fit;
        }
    }

    getCanvas() {
        return this.canvas;
    }

    getCanvasStream(fps = 30, includeAudio = true) {
        const stream = this.canvas.captureStream(fps);
        if (includeAudio && this.activeSource instanceof HTMLVideoElement) {
            try {
                const vidStream = this.activeSource.captureStream ? this.activeSource.captureStream() : null;
                if (vidStream) {
                    vidStream.getAudioTracks().forEach(track => stream.addTrack(track));
                }
            } catch (_) {}
        }
        return stream;
    }

    async exportImage(type = 'image/png', quality = 0.92) {
        this.drawFrame();
        return new Promise((resolve) => this.canvas.toBlob(resolve, type, quality));
    }

    destroy() {
        this.stopEngine();
        if (this.canvas) {
            this.canvas.removeEventListener('webglcontextlost', this._onContextLost, false);
            this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored, false);
        }
        const gl = this.gl;
        if (gl) {
            if (this.videoTexture) gl.deleteTexture(this.videoTexture);
            if (this.paperTexture) gl.deleteTexture(this.paperTexture);
            if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
            if (this.program) gl.deleteProgram(this.program);
        }
        this.gl = null;
        this.program = null;
        this.positionBuffer = null;
        this.videoTexture = null;
        this.paperTexture = null;
        this.activeSource = null;
    }
}

// Aliases for unified realtime layer ecosystem compatibility
export const GhibliLayer = GhibliClientEngine;
export function createGhibliClientEngine(canvas, config) {
    return new GhibliClientEngine(canvas, config);
}

export default GhibliClientEngine;
