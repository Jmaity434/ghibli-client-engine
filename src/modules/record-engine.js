/**
 * RecordEngine
 * Safe MediaRecorder wrapper bound to a canvas stream.
 * Handles start / stop / download of WebM (VP9 preferred).
 */
export class RecordEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
    }

    start(mimeType = 'video/webm;codecs=vp9') {
        if (this.isRecording) return;

        this.recordedChunks = [];
        const stream = this.canvas.captureStream(60);

        // Fallback if VP9 not supported
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
        }

        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 8_000_000
        });

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                this.recordedChunks.push(e.data);
            }
        };

        this.mediaRecorder.start(1000); // timeslice for smoother chunks
        this.isRecording = true;
    }

    stop() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                resolve({ blob, url });
            };

            this.mediaRecorder.onerror = (e) => {
                this.isRecording = false;
                reject(e);
            };

            this.mediaRecorder.stop();
        });
    }

    async stopAndDownload(filenamePrefix = 'ghibli-render') {
        const result = await this.stop();
        if (!result) return null;

        const a = document.createElement('a');
        a.href = result.url;
        a.download = `${filenamePrefix}-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Optional: revoke later to free memory
        setTimeout(() => URL.revokeObjectURL(result.url), 60_000);

        return result.url;
    }

    getState() {
        return {
            isRecording: this.isRecording,
            chunks: this.recordedChunks.length
        };
    }
}
