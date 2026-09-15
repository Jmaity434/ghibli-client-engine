import { GhibliClientEngine } from './modules/core-engine.js';
import { RecordEngine } from './modules/record-engine.js';

const canvas = document.getElementById('ghibli-canvas');
const statusEl = document.getElementById('status');
const edgeSlider = document.getElementById('edge-intensity');
const edgeValue = document.getElementById('edge-value');
const fileInput = document.getElementById('video-file');
const btnWebcam = document.getElementById('btn-webcam');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnRecord = document.getElementById('btn-record');
const btnDownload = document.getElementById('btn-download');

let engine = null;
let recorder = null;
let isRecording = false;

function setStatus(msg, type = 'info') {
    statusEl.textContent = msg;
    statusEl.dataset.type = type;
}

async function initEngine() {
    try {
        engine = new GhibliClientEngine(canvas, {
            edgeIntensity: parseFloat(edgeSlider.value)
        });
        recorder = new RecordEngine(canvas);
        setStatus('Engine ready. Load a video or start webcam.');
    } catch (err) {
        setStatus('WebGL2 not available: ' + err.message, 'error');
        console.error(err);
    }
}

edgeSlider.addEventListener('input', () => {
    const val = parseFloat(edgeSlider.value);
    edgeValue.textContent = val.toFixed(2);
    if (engine) engine.setEdgeIntensity(val);
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !engine) return;

    setStatus('Loading video...');
    try {
        const { width, height } = await engine.loadSourceVideo(file);
        setStatus(`Video loaded: ${width}×${height}. Press Start.`);
        btnStart.disabled = false;
    } catch (err) {
        setStatus('Failed to load video', 'error');
    }
});

btnWebcam.addEventListener('click', async () => {
    if (!engine) return;
    setStatus('Requesting camera...');
    try {
        const { width, height } = await engine.startWebcam();
        setStatus(`Webcam live: ${width}×${height}. Press Start.`);
        btnStart.disabled = false;
    } catch (err) {
        setStatus('Camera access denied or unavailable', 'error');
    }
});

btnStart.addEventListener('click', () => {
    if (!engine) return;
    engine.startRenderLoop();
    setStatus('Rendering Ghibli style in real-time…');
    btnStart.disabled = true;
    btnStop.disabled = false;
    btnRecord.disabled = false;
});

btnStop.addEventListener('click', () => {
    if (!engine) return;
    engine.stopEngine();
    if (isRecording) {
        recorder.stop();
        isRecording = false;
        btnRecord.textContent = 'Start Recording';
    }
    setStatus('Stopped.');
    btnStart.disabled = false;
    btnStop.disabled = true;
    btnRecord.disabled = true;
    btnDownload.disabled = true;
});

btnRecord.addEventListener('click', () => {
    if (!recorder) return;

    if (!isRecording) {
        recorder.start();
        isRecording = true;
        btnRecord.textContent = 'Stop Recording';
        btnDownload.disabled = true;
        setStatus('Recording…');
    } else {
        recorder.stop().then(() => {
            isRecording = false;
            btnRecord.textContent = 'Start Recording';
            btnDownload.disabled = false;
            setStatus('Recording finished. Ready to download.');
        });
    }
});

btnDownload.addEventListener('click', async () => {
    if (!recorder) return;
    setStatus('Preparing download…');
    await recorder.stopAndDownload();
    setStatus('Download started.');
});

// Bootstrap
initEngine();
