/**
 * Lightweight i18n — add any language by extending STRINGS.
 * Browser demo + integration docs support EN / BN by default.
 */
export const STRINGS = {
  en: {
    title: 'Ghibli Client Engine',
    subtitle: 'Real-time Non-AI style transfer — image & video, any size, 100% browser',
    nav_demo: 'Live Demo',
    nav_how: 'How it works',
    nav_integrate: 'Integrate',
    nav_pricing: 'Pricing',
    demo_heading: 'Try in your browser',
    demo_hint: 'Upload any image or video (no size limit). Everything runs on your device — nothing is uploaded.',
    load_media: 'Load Image / Video',
    webcam: 'Webcam',
    start: 'Start',
    stop: 'Stop',
    record: 'Start Recording',
    stop_record: 'Stop Recording',
    download: 'Download',
    download_image: 'Download PNG',
    edge: 'Edge',
    status_ready: 'Engine ready. Load an image or video, or use webcam.',
    status_loading: 'Loading media…',
    status_loaded: 'Loaded {w}×{h} ({type}). Press Start.',
    status_rendering: 'Rendering Ghibli style…',
    status_stopped: 'Stopped.',
    status_recording: 'Recording…',
    status_rec_done: 'Recording finished. Ready to download.',
    status_download: 'Download started.',
    status_webcam: 'Requesting camera…',
    status_webcam_ok: 'Webcam live: {w}×{h}. Press Start.',
    status_err_webgl: 'WebGL2 not available on this device.',
    status_err_media: 'Failed to load media.',
    status_err_cam: 'Camera access denied or unavailable.',
    how_title: 'How it works',
    how_1_t: '1. Open this page',
    how_1_d: 'No install. No account. Works in Chrome, Edge, Firefox, Safari (WebGL2).',
    how_2_t: '2. Drop image or video',
    how_2_d: 'Any resolution. Portrait, landscape, 4K — canvas matches source size automatically.',
    how_3_t: '3. See the style live',
    how_3_d: 'Bilateral smooth + 4-level cell shading + sepia ink + paper grain + warm tint. All on GPU.',
    how_4_t: '4. Export or integrate',
    how_4_d: 'Download the result, or add the engine to your own site with a few lines of code.',
    integrate_title: 'Integrate on your website',
    integrate_intro: 'Zero server. Zero AI model. Copy the files and use the ES module.',
    integrate_step1: 'Clone or download the repo',
    integrate_step2: 'Host the src/ folder (or serve from CDN / static host)',
    integrate_step3: 'Import and use',
    pricing_title: 'Simple access',
    pricing_free_t: 'Browser Demo',
    pricing_free_d: 'Unlimited testing on this GitHub Pages site. Image + video. Any size.',
    pricing_free_price: 'Free',
    pricing_dev_t: 'Self-host / Integrate',
    pricing_dev_d: 'MIT license. Use on your product, client sites, or internal tools. No royalty.',
    pricing_dev_price: 'Free (MIT)',
    pricing_note: 'Commercial support / custom shaders available on request.',
    footer: '100% client-side · Zero AI · Zero server · Image & Video any size',
    lang: 'Language'
  },
  bn: {
    title: 'Ghibli Client Engine',
    subtitle: 'রিয়েল-টাইম Non-AI স্টাইল ট্রান্সফার — ছবি ও ভিডিও, যেকোনো সাইজ, ১০০% ব্রাউজার',
    nav_demo: 'লাইভ ডেমো',
    nav_how: 'কীভাবে কাজ করে',
    nav_integrate: 'ইন্টিগ্রেট',
    nav_pricing: 'প্রাইসিং',
    demo_heading: 'ব্রাউজারে টেস্ট করুন',
    demo_hint: 'যেকোনো ছবি বা ভিডিও আপলোড করুন (সাইজ লিমিট নেই)। সব আপনার ডিভাইসে চলে — কিছুই সার্ভারে যায় না।',
    load_media: 'ছবি / ভিডিও লোড',
    webcam: 'ওয়েবক্যাম',
    start: 'শুরু',
    stop: 'বন্ধ',
    record: 'রেকর্ডিং শুরু',
    stop_record: 'রেকর্ডিং বন্ধ',
    download: 'ডাউনলোড',
    download_image: 'PNG ডাউনলোড',
    edge: 'এজ',
    status_ready: 'ইঞ্জিন রেডি। ছবি/ভিডিও লোড করুন বা ওয়েবক্যাম ব্যবহার করুন।',
    status_loading: 'মিডিয়া লোড হচ্ছে…',
    status_loaded: 'লোড হয়েছে {w}×{h} ({type})। Start চাপুন।',
    status_rendering: 'Ghibli স্টাইল রেন্ডার হচ্ছে…',
    status_stopped: 'বন্ধ করা হয়েছে।',
    status_recording: 'রেকর্ডিং চলছে…',
    status_rec_done: 'রেকর্ডিং শেষ। ডাউনলোড করতে পারেন।',
    status_download: 'ডাউনলোড শুরু হয়েছে।',
    status_webcam: 'ক্যামেরা চাওয়া হচ্ছে…',
    status_webcam_ok: 'ওয়েবক্যাম লাইভ: {w}×{h}। Start চাপুন।',
    status_err_webgl: 'এই ডিভাইসে WebGL2 নেই।',
    status_err_media: 'মিডিয়া লোড ব্যর্থ।',
    status_err_cam: 'ক্যামেরা অ্যাক্সেস দেওয়া হয়নি।',
    how_title: 'কীভাবে কাজ করে',
    how_1_t: '১. এই পেজ খুলুন',
    how_1_d: 'ইনস্টল লাগে না। অ্যাকাউন্ট লাগে না। Chrome, Edge, Firefox, Safari (WebGL2) এ চলে।',
    how_2_t: '২. ছবি বা ভিডিও দিন',
    how_2_d: 'যেকোনো রেজোলিউশন। পোর্ট্রেট, ল্যান্ডস্কেপ, ৪K — ক্যানভাস নিজেই সাইজ ম্যাচ করে।',
    how_3_t: '৩. স্টাইল লাইভে দেখুন',
    how_3_d: 'Bilateral smooth + ৪-লেভেল cell shading + sepia ink + paper grain + warm tint। সব GPU-তে।',
    how_4_t: '৪. এক্সপোর্ট বা ইন্টিগ্রেট',
    how_4_d: 'রেজাল্ট ডাউনলোড করুন, অথবা কয়েক লাইন কোডে নিজের সাইটে ইঞ্জিন যোগ করুন।',
    integrate_title: 'আপনার ওয়েবসাইটে ইন্টিগ্রেট',
    integrate_intro: 'সার্ভার লাগে না। AI মডেল লাগে না। ফাইল কপি করে ES module ব্যবহার করুন।',
    integrate_step1: 'রিপো ক্লোন বা ডাউনলোড করুন',
    integrate_step2: 'src/ ফোল্ডার হোস্ট করুন (CDN বা স্ট্যাটিক হোস্ট)',
    integrate_step3: 'Import করে ব্যবহার করুন',
    pricing_title: 'সহজ অ্যাক্সেস',
    pricing_free_t: 'ব্রাউজার ডেমো',
    pricing_free_d: 'এই GitHub Pages সাইটে আনলিমিটেড টেস্ট। ছবি + ভিডিও। যেকোনো সাইজ।',
    pricing_free_price: 'ফ্রি',
    pricing_dev_t: 'সেল্ফ-হোস্ট / ইন্টিগ্রেট',
    pricing_dev_d: 'MIT লাইসেন্স। আপনার প্রোডাক্ট, ক্লায়েন্ট সাইট বা ইন্টারনাল টুলে ব্যবহার করুন। রয়্যালটি নেই।',
    pricing_dev_price: 'ফ্রি (MIT)',
    pricing_note: 'কমার্শিয়াল সাপোর্ট / কাস্টম শেডার চাইলে যোগাযোগ করুন।',
    footer: '১০০% ক্লায়েন্ট-সাইড · Zero AI · Zero server · ছবি ও ভিডিও যেকোনো সাইজ',
    lang: 'ভাষা'
  }
};

export function t(lang, key, vars = {}) {
  const table = STRINGS[lang] || STRINGS.en;
  let s = table[key] ?? STRINGS.en[key] ?? key;
  Object.keys(vars).forEach((k) => {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
  });
  return s;
}

export function detectLang() {
  const saved = localStorage.getItem('ghibli_lang');
  if (saved && STRINGS[saved]) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('bn')) return 'bn';
  return 'en';
}
