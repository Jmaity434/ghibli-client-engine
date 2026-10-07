import { GhibliClientEngine } from './modules/core-engine.js';
import { RecordEngine } from './modules/record-engine.js';
import { t, detectLang } from './i18n.js';

let lang = detectLang();
let engine = null;
let recorder = null;
let isRecording = false;
let lastType = null;

const canvas = document.getElementById('ghibli-canvas');
const statusEl = document.getElementById('status');
const edgeSlider = document.getElementById('edge-intensity');
const edgeValue = document.getElementById('edge-value');
const fileInput = document.getElementById('media-file');
const btnSample = document.getElementById('btn-sample');
const btnWebcam = document.getElementById('btn-webcam');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnRecord = document.getElementById('btn-record');
const btnDownload = document.getElementById('btn-download');
const btnDownloadImg = document.getElementById('btn-download-img');
const langSelect = document.getElementById('lang-select');

function setStatus(msg, type = 'info') {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.dataset.type = type;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(lang, key);
  });
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  if (langSelect) langSelect.value = lang;
}

function fill(key, vars) {
  return t(lang, key, vars);
}

async function initEngine() {
  if (!canvas) {
    setStatus('Canvas element missing', 'error');
    return;
  }
  try {
    engine = new GhibliClientEngine(canvas, {
      edgeIntensity: parseFloat(edgeSlider?.value || '0.25')
    });
    await engine.ready();
    recorder = new RecordEngine(canvas);
    setStatus(fill('status_ready'));
  } catch (err) {
    setStatus(fill('status_err_webgl') + ' ' + err.message, 'error');
    console.error(err);
  }
}

langSelect?.addEventListener('change', () => {
  lang = langSelect.value;
  localStorage.setItem('ghibli_lang', lang);
  applyI18n();
  if (!engine?.isProcessing) setStatus(fill('status_ready'));
});

edgeSlider?.addEventListener('input', () => {
  const val = parseFloat(edgeSlider.value);
  if (edgeValue) edgeValue.textContent = val.toFixed(2);
  if (engine) engine.setEdgeIntensity(val);
});

fileInput?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file || !engine) return;

  setStatus(fill('status_loading'));
  try {
    const { width, height, type } = await engine.loadSource(file);
    lastType = type;
    setStatus(fill('status_loaded', { w: width, h: height, type }));

    if (btnStart) btnStart.disabled = false;
    if (btnDownloadImg) btnDownloadImg.disabled = type !== 'image';
    if (btnRecord) btnRecord.disabled = true;

    // Auto-render still images so the user sees the result immediately
    if (type === 'image') {
      engine.startRenderLoop();
      setStatus(fill('status_rendering'));
      if (btnStart) btnStart.disabled = true;
      if (btnStop) btnStop.disabled = false;
      if (btnDownloadImg) btnDownloadImg.disabled = false;
    }
  } catch (err) {
    setStatus(fill('status_err_media'), 'error');
    console.error(err);
  }
});

function createSampleSceneCanvas() {
  const c = document.createElement('canvas');
  c.width = 960;
  c.height = 540;
  const ctx = c.getContext('2d');

  // Painterly sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 360);
  skyGrad.addColorStop(0, '#4285f4');
  skyGrad.addColorStop(0.55, '#87ceeb');
  skyGrad.addColorStop(1, '#ffeedd');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 960, 540);

  // Soft sun
  ctx.fillStyle = '#fff6d5';
  ctx.beginPath();
  ctx.arc(760, 140, 55, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountain
  ctx.fillStyle = '#6b8ca8';
  ctx.beginPath();
  ctx.moveTo(0, 360);
  ctx.lineTo(220, 220);
  ctx.lineTo(440, 340);
  ctx.lineTo(680, 190);
  ctx.lineTo(960, 320);
  ctx.lineTo(960, 540);
  ctx.lineTo(0, 540);
  ctx.closePath();
  ctx.fill();

  // Rolling green hills
  ctx.fillStyle = '#5c9a4b';
  ctx.beginPath();
  ctx.arc(280, 500, 300, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#457936';
  ctx.beginPath();
  ctx.arc(750, 520, 330, Math.PI, 0);
  ctx.fill();

  // Fluffy clouds
  function drawCloud(cx, cy, s) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 30 * s, 0, Math.PI * 2);
    ctx.arc(cx + 28 * s, cy - 10 * s, 36 * s, 0, Math.PI * 2);
    ctx.arc(cx + 60 * s, cy, 28 * s, 0, Math.PI * 2);
    ctx.arc(cx + 32 * s, cy + 10 * s, 22 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  drawCloud(220, 150, 1.4);
  drawCloud(540, 100, 1.1);

  return c;
}

btnSample?.addEventListener('click', async () => {
  if (!engine) return;
  setStatus(fill('status_loading'));
  const sampleCanvas = createSampleSceneCanvas();
  try {
    const { width, height, type } = await engine.loadSource(sampleCanvas);
    lastType = type;
    setStatus(fill('status_loaded', { w: width, h: height, type: 'scene' }));
    engine.startRenderLoop();
    setStatus(fill('status_rendering'));
    if (btnStart) btnStart.disabled = true;
    if (btnStop) btnStop.disabled = false;
    if (btnDownloadImg) btnDownloadImg.disabled = false;
    if (btnRecord) btnRecord.disabled = true;
  } catch (err) {
    setStatus(fill('status_err_media'), 'error');
    console.error(err);
  }
});

btnWebcam?.addEventListener('click', async () => {
  if (!engine) return;
  setStatus(fill('status_webcam'));
  try {
    const { width, height, type } = await engine.startWebcam();
    lastType = type;
    setStatus(fill('status_webcam_ok', { w: width, h: height }));
    if (btnStart) btnStart.disabled = false;
    if (btnDownloadImg) btnDownloadImg.disabled = true;
  } catch (err) {
    setStatus(fill('status_err_cam'), 'error');
  }
});

btnStart?.addEventListener('click', () => {
  if (!engine) return;
  engine.startRenderLoop();
  setStatus(fill('status_rendering'));
  btnStart.disabled = true;
  if (btnStop) btnStop.disabled = false;
  if (btnRecord) btnRecord.disabled = lastType === 'image';
  if (lastType === 'image' && btnDownloadImg) btnDownloadImg.disabled = false;
});

btnStop?.addEventListener('click', () => {
  if (!engine) return;
  engine.stopEngine();
  if (isRecording && recorder) {
    recorder.stop();
    isRecording = false;
    if (btnRecord) btnRecord.textContent = fill('record');
  }
  setStatus(fill('status_stopped'));
  if (btnStart) btnStart.disabled = false;
  if (btnStop) btnStop.disabled = true;
  if (btnRecord) btnRecord.disabled = true;
  if (btnDownload) btnDownload.disabled = true;
});

btnRecord?.addEventListener('click', () => {
  if (!recorder) return;

  if (!isRecording) {
    recorder.start();
    isRecording = true;
    btnRecord.textContent = fill('stop_record');
    if (btnDownload) btnDownload.disabled = true;
    setStatus(fill('status_recording'));
  } else {
    recorder.stop().then(() => {
      isRecording = false;
      btnRecord.textContent = fill('record');
      if (btnDownload) btnDownload.disabled = false;
      setStatus(fill('status_rec_done'));
    });
  }
});

btnDownload?.addEventListener('click', async () => {
  if (!recorder) return;
  setStatus(fill('status_download'));
  await recorder.stopAndDownload();
});

btnDownloadImg?.addEventListener('click', async () => {
  if (!engine) return;
  // Ensure latest frame is drawn
  if (lastType === 'image') engine.processStill();
  const blob = await engine.exportImage();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ghibli-${Date.now()}.png`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus(fill('status_download'));
});

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

applyI18n();
initEngine();
