/**
 * GhibliClientEngine
 * High performance client-side video processor without AI dependencies.
 * Implements bilateral smoothing, color quantization, Sobel edges and paper grain compositing.
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

        this.edgeIntensity = config.edgeIntensity ?? 0.25;
        this.isProcessing = false;
        this.animationFrameId = null;

        this.program = null;
        this.positionBuffer = null;
        this.videoTexture = null;
        this.paperTexture = null;

        this.initWebGL();
    }

    async initWebGL() {
        const gl = this.gl;

        const vsSource = await this.loadShaderSource('./src/shaders/vertex.vert');
        const fsSource = await this.loadShaderSource('./src/shaders/ghibli.frag');

        this.program = this.createProgram(gl, vsSource, fsSource);

        // Full-screen quad
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

        // Video texture
        this.videoTexture = gl.createTexture();
        this.setupTextureProperties(gl, this.videoTexture);

        // Paper grain texture (fallback solid if missing)
        this.paperTexture = gl.createTexture();
        this.setupTextureProperties(gl, this.paperTexture);
        this.createFallbackPaperTexture(gl);

        // Try to load real paper asset if present
        this.loadPaperTexture('./assets/ghibli-grain.jpg').catch(() => {
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
        // Simple 2x2 beige paper-like noise
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

    loadSourceVideo(fileOrUrl) {
        return new Promise((resolve, reject) => {
            if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
                this.videoElement.src = URL.createObjectURL(fileOrUrl);
            } else {
                this.videoElement.src = fileOrUrl;
            }

            this.videoElement.onloadeddata = () => {
                this.canvas.width = this.videoElement.videoWidth || 1280;
                this.canvas.height = this.videoElement.videoHeight || 720;
                resolve({
                    width: this.canvas.width,
                    height: this.canvas.height
                });
            };
            this.videoElement.onerror = () => reject(new Error('Video load failed'));
        });
    }

    async startWebcam() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
        });
        this.videoElement.srcObject = stream;
        await this.videoElement.play();

        this.canvas.width = this.videoElement.videoWidth || 1280;
        this.canvas.height = this.videoElement.videoHeight || 720;

        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    startRenderLoop() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        if (this.videoElement.paused) {
            this.videoElement.play().catch(() => {});
        }

        const gl = this.gl;
        const positionLoc = gl.getAttribLocation(this.program, 'position');
        const resLoc = gl.getUniformLocation(this.program, 'u_resolution');
        const intensityLoc = gl.getUniformLocation(this.program, 'u_edgeIntensity');
        const videoTexLoc = gl.getUniformLocation(this.program, 'u_videoTexture');
        const paperTexLoc = gl.getUniformLocation(this.program, 'u_ghibliTexture');

        const render = () => {
            if (!this.isProcessing) return;

            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.clearColor(0.05, 0.04, 0.03, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(this.program);

            // Upload current video frame
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.videoElement);
            gl.uniform1i(videoTexLoc, 0);

            // Paper texture
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
            gl.uniform1i(paperTexLoc, 1);

            gl.uniform2f(resLoc, this.canvas.width, this.canvas.height);
            gl.uniform1f(intensityLoc, this.edgeIntensity);

            gl.enableVertexAttribArray(positionLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            this.animationFrameId = requestAnimationFrame(render);
        };

        this.animationFrameId = requestAnimationFrame(render);
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
    }

    getCanvasStream(fps = 60) {
        return this.canvas.captureStream(fps);
    }
}
