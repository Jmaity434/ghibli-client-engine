import { GhibliClientEngine } from './modules/core-engine.js';
import { RecordEngine } from './modules/record-engine.js';
import { t, detectLang, STRINGS } from './i18n.js';

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
const btnWebcam = document.getElementById('btn-webcam');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnRecord = document.getElementById('btn-record');
const btnDownload = document.getElementById('btn-download');
const btnDownloadImg = document.getElementById('btn-download-img');
const langSelect = document.getElementById('lang-select');

function setStatus(msg, type = 'info') {
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
  try {
    engine = new GhibliClientEngine(canvas, {
      edgeIntensity: parseFloat(edgeSlider.value)
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

edgeSlider.addEventListener('input', () => {
  const val = parseFloat(edgeSlider.value);
  edgeValue.textContent = val.toFixed(2);
  if (engine) engine.setEdgeIntensity(val);
});

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !engine) return;

  setStatus(fill('status_loading'));
  try {
    const { width, height, type } = await engine.loadSource(file);
    lastType = type;
    setStatus(fill('status_loaded', { w: width, h: height, type }));
    btnStart.disabled = false;
    btnDownloadImg.disabled = type !== 'image';
    btnRecord.disabled = true;
  } catch (err) {
    setStatus(fill('status_err_media'), 'error');
    console.error(err);
  }
});

btnWebcam.addEventListener('click', async () => {
  if (!engine) return;
  setStatus(fill('status_webcam'));
  try {
    const { width, height, type } = await engine.startWebcam();
    lastType = type;
    setStatus(fill('status_webcam_ok', { w: width, h: height }));
    btnStart.disabled = false;
    btnDownloadImg.disabled = true;
  } catch (err) {
    setStatus(fill('status_err_cam'), 'error');
  }
});

btnStart.addEventListener('click', () => {
  if (!engine) return;
  engine.startRenderLoop();
  setStatus(fill('status_rendering'));
  btnStart.disabled = true;
  btnStop.disabled = false;
  btnRecord.disabled = lastType === 'image';
  if (lastType === 'image') {
    btnDownloadImg.disabled = false;
  }
});

btnStop.addEventListener('click', () => {
  if (!engine) return;
  engine.stopEngine();
  if (isRecording) {
    recorder.stop();
    isRecording = false;
    btnRecord.textContent = fill('record');
  }
  setStatus(fill('status_stopped'));
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
    btnRecord.textContent = fill('stop_record');
    btnDownload.disabled = true;
    setStatus(fill('status_recording'));
  } else {
    recorder.stop().then(() => {
      isRecording = false;
      btnRecord.textContent = fill('record');
      btnDownload.disabled = false;
      setStatus(fill('status_rec_done'));
    });
  }
});

btnDownload.addEventListener('click', async () => {
  if (!recorder) return;
  setStatus(fill('status_download'));
  await recorder.stopAndDownload();
});

btnDownloadImg.addEventListener('click', async () => {
  if (!engine) return;
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

// Smooth scroll for nav
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
