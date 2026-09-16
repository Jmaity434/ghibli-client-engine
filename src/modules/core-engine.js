/**
 * GhibliClientEngine
 * 100% client-side WebGL2 Ghibli-style processor.
 * Supports any-size images and videos. No fixed resolution. Zero AI.
 */
export class GhibliClientEngine {
    constructor(canvasElement, config = {}) {
        this.canvas = canvasElement;
        this.gl = this.canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            preserveDrawingBuffer: true
        });

        if (!this.gl) {
            throw new Error('WebGL2 context initialization failed on this device.');
        }

        this.videoElement = document.createElement('video');
        this.videoElement.muted = true;
        this.videoElement.loop = true;
        this.videoElement.playsInline = true;
        this.videoElement.crossOrigin = 'anonymous';

        this.imageElement = new Image();
        this.imageElement.crossOrigin = 'anonymous';

        this.sourceType = null; // 'video' | 'image' | 'webcam'
        this.edgeIntensity = config.edgeIntensity ?? 0.25;
        this.shaderBasePath = config.shaderBasePath ?? './src/shaders';
        this.paperTextureUrl = config.paperTextureUrl ?? './assets/ghibli-grain.jpg';
        this.isProcessing = false;
        this.animationFrameId = null;

        this.program = null;
        this.positionBuffer = null;
        this.videoTexture = null;
        this.paperTexture = null;

        this._ready = this.initWebGL();
    }

    async ready() {
        return this._ready;
    }

    async initWebGL() {
        const gl = this.gl;

        const vsSource = await this.loadShaderSource(`${this.shaderBasePath}/vertex.vert`);
        const fsSource = await this.loadShaderSource(`${this.shaderBasePath}/ghibli.frag`);

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
        this.createFallbackPaperTexture(gl);

        this.loadPaperTexture(this.paperTextureUrl).catch(() => {
            console.info('[GhibliEngine] Using procedural paper fallback');
        });
    }

    setupTextureProperties(gl, texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    createFallbackPaperTexture(gl) {
        const data = new Uint8Array([
            220, 210, 190, 255,
            210, 200, 180, 255,
            230, 220, 200, 255,
            200, 190, 170, 255
        ]);
        gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    }

    async loadPaperTexture(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const gl = this.gl;
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
            throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
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
     * Load any image or video file / URL. No fixed size — canvas matches source dimensions.
     * @param {File|Blob|string} fileOrUrl
     * @returns {Promise<{width:number, height:number, type:'image'|'video'}>}
     */
    async loadSource(fileOrUrl) {
        await this.ready();

        const isFile = fileOrUrl instanceof File || fileOrUrl instanceof Blob;
        const mime = isFile ? (fileOrUrl.type || '') : '';
        const name = isFile && fileOrUrl.name ? fileOrUrl.name.toLowerCase() : '';

        const looksImage =
            mime.startsWith('image/') ||
            /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(name) ||
            (!isFile && /\.(jpe?g|png|webp|gif|bmp|avif)(\?|$)/i.test(String(fileOrUrl)));

        if (looksImage) {
            return this.loadSourceImage(fileOrUrl);
        }
        return this.loadSourceVideo(fileOrUrl);
    }

    loadSourceImage(fileOrUrl) {
        return new Promise((resolve, reject) => {
            this.stopEngine();
            this.sourceType = 'image';

            if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
                this.imageElement.src = URL.createObjectURL(fileOrUrl);
            } else {
                this.imageElement.src = fileOrUrl;
            }

            this.imageElement.onload = () => {
                const w = this.imageElement.naturalWidth || this.imageElement.width;
                const h = this.imageElement.naturalHeight || this.imageElement.height;
                if (!w || !h) {
                    reject(new Error('Image has zero dimensions'));
                    return;
                }
                this.canvas.width = w;
                this.canvas.height = h;
                resolve({ width: w, height: h, type: 'image' });
            };
            this.imageElement.onerror = () => reject(new Error('Image load failed'));
        });
    }

    loadSourceVideo(fileOrUrl) {
        return new Promise((resolve, reject) => {
            this.stopEngine();
            this.sourceType = 'video';

            if (this.videoElement.srcObject) {
                this.videoElement.srcObject.getTracks().forEach(t => t.stop());
                this.videoElement.srcObject = null;
            }

            if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
                this.videoElement.src = URL.createObjectURL(fileOrUrl);
            } else {
                this.videoElement.src = fileOrUrl;
            }

            this.videoElement.onloadeddata = () => {
                const w = this.videoElement.videoWidth;
                const h = this.videoElement.videoHeight;
                if (!w || !h) {
                    reject(new Error('Video has zero dimensions'));
                    return;
                }
                this.canvas.width = w;
                this.canvas.height = h;
                resolve({ width: w, height: h, type: 'video' });
            };
            this.videoElement.onerror = () => reject(new Error('Video load failed'));
        });
    }

    async startWebcam() {
        await this.ready();
        this.stopEngine();
        this.sourceType = 'webcam';

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        this.videoElement.srcObject = stream;
        await this.videoElement.play();

        const w = this.videoElement.videoWidth || 640;
        const h = this.videoElement.videoHeight || 480;
        this.canvas.width = w;
        this.canvas.height = h;

        return { width: w, height: h, type: 'webcam' };
    }

    startRenderLoop() {
        if (this.isProcessing) return;
        if (!this.sourceType) return;

        this.isProcessing = true;

        if (this.sourceType === 'video' || this.sourceType === 'webcam') {
            if (this.videoElement.paused) {
                this.videoElement.play().catch(() => {});
            }
        }

        const gl = this.gl;
        const positionLoc = gl.getAttribLocation(this.program, 'position');
        const resLoc = gl.getUniformLocation(this.program, 'u_resolution');
        const intensityLoc = gl.getUniformLocation(this.program, 'u_edgeIntensity');
        const videoTexLoc = gl.getUniformLocation(this.program, 'u_videoTexture');
        const paperTexLoc = gl.getUniformLocation(this.program, 'u_ghibliTexture');

        const sourceEl = this.sourceType === 'image' ? this.imageElement : this.videoElement;

        const render = () => {
            if (!this.isProcessing) return;

            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.clearColor(0.05, 0.04, 0.03, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(this.program);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceEl);
            gl.uniform1i(videoTexLoc, 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
            gl.uniform1i(paperTexLoc, 1);

            gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);
            gl.uniform1f(intensityLoc, this.edgeIntensity);

            gl.enableVertexAttribArray(positionLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // For still images, one frame is enough; keep loop for video/webcam
            if (this.sourceType === 'image') {
                this.isProcessing = false;
                return;
            }
            this.animationFrameId = requestAnimationFrame(render);
        };

        this.animationFrameId = requestAnimationFrame(render);
    }

    /** Process a still image once and keep result on canvas */
    processStill() {
        if (this.sourceType !== 'image') return;
        this.startRenderLoop();
    }

    stopEngine() {
        this.isProcessing = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.videoElement.pause();
        if (this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(t => t.stop());
            this.videoElement.srcObject = null;
        }
    }

    setEdgeIntensity(value) {
        this.edgeIntensity = Math.max(0.05, Math.min(1.0, value));
        // Re-process still image when slider changes
        if (this.sourceType === 'image' && this.imageElement.complete) {
            this.processStill();
        }
    }

    getCanvasStream(fps = 60) {
        return this.canvas.captureStream(fps);
    }

    /** Export current canvas as PNG blob */
    async exportImage(type = 'image/png', quality = 0.92) {
        return new Promise((resolve) => {
            this.canvas.toBlob((blob) => resolve(blob), type, quality);
        });
    }
}
