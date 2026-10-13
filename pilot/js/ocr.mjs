// Reading files on the device: text files, PDFs (pdf.js from cdnjs, the same build Quickwell Saver uses) and photos
// or screenshots (Tesseract OCR, self-hosted under vendor/tesseract/). Nothing is uploaded.
//
// Photo reading needs WebAssembly. A Content-Security-Policy without 'wasm-unsafe-eval' in script-src blocks it, so
// before offering it we read this page's own policy (the <meta> tag and the response header). If it is blocked we
// say so and offer paste instead, rather than failing with an error.
const PDFJS = '3.11.174';
const PDF_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS}/`;
const OCR_BASE = new URL('../vendor/tesseract/', import.meta.url).href;

export function cspAllowsWasm(policy) {
  if (!policy) return true;
  // several policies can arrive joined with commas; every one must allow it
  return policy.split(',').every((p) => {
    const dir = (name) => { const m = new RegExp(`(?:^|;)\\s*${name}\\s+([^;]*)`, 'i').exec(p); return m ? m[1] : null; };
    const src = dir('script-src') ?? dir('default-src');
    return src == null || /'wasm-unsafe-eval'|'unsafe-eval'/.test(src);
  });
}
let allowed = null;
export async function photoReadingAvailable() {
  if (allowed !== null) return allowed;
  if (typeof WebAssembly !== 'object' || typeof Worker !== 'function') return (allowed = false);
  const meta = [...document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')].map((m) => m.content).join(',');
  if (meta && !cspAllowsWasm(meta)) return (allowed = false);
  try {
    const r = await fetch(location.pathname, { method: 'HEAD', cache: 'no-store' });
    allowed = cspAllowsWasm(r.headers.get('content-security-policy'));
  } catch (e) { allowed = false; }
  return allowed;
}

function loadScript(src) {
  return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('load ' + src)); document.head.appendChild(s); });
}
async function pdfLib() {
  if (!window.pdfjsLib) await loadScript(PDF_BASE + 'pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_BASE + 'pdf.worker.min.js';
  return window.pdfjsLib;
}
// Text from a PDF, lines rebuilt from the position of each piece of text. Returns { text, pages, doc }.
export async function pdfText(file, maxPages = 10) {
  const lib = await pdfLib();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const out = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const page = await doc.getPage(p); const tc = await page.getTextContent();
    const rows = new Map();
    for (const it of tc.items) { if (!it.str) continue; const y = Math.round(it.transform[5] / 3) * 3; if (!rows.has(y)) rows.set(y, []); rows.get(y).push({ x: it.transform[4], s: it.str }); }
    const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, r]) => r.sort((a, b) => a.x - b.x).map((x) => x.s).join(' ').replace(/\s+/g, ' ').trim());
    out.push(lines.join('\n'));
  }
  return { text: out.join('\n\n').trim(), pages: doc.numPages, doc };
}
// Scanned PDF pages as images (for OCR)
export async function pdfPageImages(doc, maxPages = 3) {
  const imgs = [];
  for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
    const page = await doc.getPage(p); const vp = page.getViewport({ scale: 2 });
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; imgs.push(c);
  }
  return imgs;
}

// OCR one or more images (File, Blob or canvas). onProgress(0..1, status)
let workerP = null, workerLangs = '';
export async function ocrImages(images, langs = 'eng', onProgress = () => {}) {
  if (!(await photoReadingAvailable())) throw new Error('ocr-blocked');
  if (!window.Tesseract) await loadScript(OCR_BASE + 'tesseract.min.js');
  let part = 0;
  if (!workerP || workerLangs !== langs) {
    if (workerP) (await workerP).terminate();
    workerLangs = langs;
    workerP = window.Tesseract.createWorker(langs.split('+'), 1, {
      workerPath: OCR_BASE + 'worker.min.js', corePath: OCR_BASE, langPath: OCR_BASE + 'lang', workerBlobURL: false,
      logger: (m) => { if (m && typeof m.progress === 'number') onProgress((part + (m.status === 'recognizing text' ? m.progress : m.progress * 0.2)) / images.length, m.status); },
    });
  }
  const w = await workerP; const texts = [];
  for (const img of images) { const { data } = await w.recognize(img); texts.push(data.text || ''); part++; onProgress(part / images.length, 'done'); }
  return texts.join('\n\n').trim();
}
export async function ocrStop() { if (workerP) { try { (await workerP).terminate(); } catch (e) { /* ignore */ } workerP = null; } }

export const isPdf = (f) => /\.pdf$/i.test(f.name || '') || f.type === 'application/pdf';
export const isImage = (f) => /^image\//.test(f.type || '') || /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(f.name || '');
export const isText = (f) => /^text\//.test(f.type || '') || /\.(txt|eml|text)$/i.test(f.name || '');
