/**
 * Builds the A4 flyer: a print-ready PDF and a 300 DPI PNG preview.
 *
 *   node scripts/build-flyer.mjs
 *
 * Source of truth is marketing/flyer/flyer-a4-fr.html (authored in millimetres
 * with @page{size:A4;margin:0}), so hand-editing that file and re-running this
 * script is the whole workflow.
 *
 * Outputs (marketing/flyer/):
 *   flyer-a4-fr.pdf           exact A4, 595.28 x 841.89 pt
 *   flyer-a4-fr-300dpi.png   2480 x 3508 px = 210 x 297 mm at 300 DPI
 *
 * The PNG run reuses the same HTML with a transform override injected into a
 * temp copy, so there is exactly one layout to maintain.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FLYER_DIR = path.join(ROOT, 'marketing/flyer');
const HTML = path.join(FLYER_DIR, 'flyer-a4-fr.html');
const PDF = path.join(FLYER_DIR, 'flyer-a4-fr.pdf');
const PNG = path.join(FLYER_DIR, 'flyer-a4-fr-300dpi.png');

/* ---------- A4 geometry ---------- */
const MM_W = 210, MM_H = 297;
const CSS_DPI = 96;
const mmToCssPx = (mm) => (mm / 25.4) * CSS_DPI;      // 793.70 x 1122.52
const TARGET_DPI = 300;
const PNG_W = Math.round((MM_W / 25.4) * TARGET_DPI); // 2480
const PNG_H = Math.round((MM_H / 25.4) * TARGET_DPI); // 3508
const SCALE = PNG_W / mmToCssPx(MM_W);                // 3.12423

/* ---------- locate a Chromium browser ---------- */
const CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browser = CANDIDATES.find((p) => fs.existsSync(p));
if (!browser) {
  console.error('No Chromium browser found. Looked for:\n  ' + CANDIDATES.join('\n  '));
  process.exit(1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'flyer-chrome-'));
// The pixel-variant HTML MUST live in the same directory as flyer-a4-fr.html,
// otherwise its relative image paths (../source/*.png) resolve to the wrong
// folder and every image silently renders as a broken placeholder.
const tmpHtml = path.join(FLYER_DIR, '.flyer-px.tmp.html');

function chrome(args) {
  return execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=8000',
    '--allow-file-access-from-files',
    `--user-data-dir=${profile}`,
    ...args,
  ], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, maxBuffer: 32 * 1024 * 1024 });
}

/* ---------------- 1. build the pixel-variant HTML for the PNG ---------------- */
const html = fs.readFileSync(HTML, 'utf8');

/* Preflight: every referenced asset must exist. Without this, a missing or
   renamed source PNG renders as a silent broken-image placeholder and still
   "succeeds", which is exactly the failure mode we want to rule out. */
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
const missing = refs.filter((r) => !fs.existsSync(path.resolve(FLYER_DIR, r)));
console.log('assets    : ' + refs.length + ' referenced, ' + (refs.length - missing.length) + ' found');
if (missing.length) {
  console.error('\nMISSING ASSETS:\n  ' + missing.join('\n  '));
  process.exit(1);
}

const override = `
<style id="px-override">
  html, body { width: ${PNG_W}px !important; height: ${PNG_H}px !important; margin: 0 !important; }
  .page {
    width: ${MM_W}mm !important; height: ${MM_H}mm !important;
    transform: scale(${SCALE.toFixed(6)});
    transform-origin: top left;
  }
</style>
<script id="overflow-probe">
  // Reports any band whose content is taller than its box, plus the total band
  // height against the page content box. Written into document.title so a
  // --dump-dom run can read it back without a CDP connection.
  window.addEventListener('load', function () {
    var problems = [];
    var page = document.querySelector('.page');
    var bands = page.querySelectorAll(':scope > *');
    var total = 0;
    bands.forEach(function (el) {
      var h = el.getBoundingClientRect().height / ${SCALE.toFixed(6)};
      total += h;
      if (el.scrollHeight - el.clientHeight > 1) {
        problems.push(el.className + ' content ' + el.scrollHeight + 'px > box ' + el.clientHeight + 'px');
      }
    });
    var avail = page.clientHeight
      - parseFloat(getComputedStyle(page).paddingTop)
      - parseFloat(getComputedStyle(page).paddingBottom);
    if (total - avail > 1) {
      problems.push('BANDS total ' + total.toFixed(1) + 'px > usable ' + avail + 'px');
    }
    document.title = 'DIAG::' + (problems.length ? problems.join(' || ') : 'CLEAN');
  });
</script>
`;
if (!html.includes('</head>')) throw new Error('flyer HTML has no </head>');
fs.writeFileSync(tmpHtml, html.replace('</head>', override + '</head>'), 'utf8');

/* ------------------------------- 2. PDF ------------------------------- */
for (const f of [PDF, PNG]) if (fs.existsSync(f)) fs.unlinkSync(f);

console.log('browser :', browser);
console.log('scale   :', SCALE.toFixed(6), '-> ', PNG_W + 'x' + PNG_H);
console.log('\n[1/2] printing PDF ...');
chrome([
  '--no-pdf-header-footer',
  '--print-to-pdf-no-header',
  `--print-to-pdf=${PDF}`,
  pathToFileURL(HTML).href,
]);
if (!fs.existsSync(PDF)) { console.error('PDF was not produced'); process.exit(1); }

/* ------------------------------- 3. PNG ------------------------------- */
console.log('[2/2] rasterising PNG ...');
chrome([
  '--screenshot=' + PNG,
  `--window-size=${PNG_W},${PNG_H}`,
  '--force-device-scale-factor=1',
  pathToFileURL(tmpHtml).href,
]);
if (!fs.existsSync(PNG)) { console.error('PNG was not produced'); process.exit(1); }

/* ---------------------- 5. layout overflow probe ---------------------- */
const dom = chrome(['--dump-dom', pathToFileURL(tmpHtml).href]).toString();
const diag = dom.match(/<title>([^<]*)<\/title>/);
let overflowClean = false;
if (diag) {
  const raw = diag[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"');
  const body = raw.replace(/^DIAG::/, '');
  if (body === 'CLEAN') { overflowClean = true; }
  else { console.error('\nLAYOUT OVERFLOW DETECTED:\n  ' + body); process.exitCode = 1; }
}
console.log('layout   : ' + (overflowClean ? 'CLEAN (no band overflow)' : (diag ? 'see above' : 'probe failed')));

/* --------------------------- 4. report sizes --------------------------- */
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function pdfMediaBox(file) {
  const buf = fs.readFileSync(file);
  const s = buf.toString('latin1');
  const m = s.match(/\/MediaBox\s*\[\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*\]/);
  if (!m) return null;
  return { w: +m[3] - +m[1], h: +m[4] - +m[2] };
}

const mb = pdfMediaBox(PDF);
const ps = pngSize(PNG);
const A4_PT = { w: 595.28, h: 841.89 };

console.log('\n--- results ---');
console.log('PDF  ' + path.relative(ROOT, PDF) + '  ' + (fs.statSync(PDF).size / 1024).toFixed(0) + ' KB');
if (mb) {
  const ok = Math.abs(mb.w - A4_PT.w) < 1.5 && Math.abs(mb.h - A4_PT.h) < 1.5;
  console.log('     MediaBox ' + mb.w.toFixed(2) + ' x ' + mb.h.toFixed(2) + ' pt   ' +
    (ok ? 'OK (A4)' : '*** NOT A4 *** expected ' + A4_PT.w + ' x ' + A4_PT.h));
} else {
  console.log('     MediaBox not found');
}
console.log('PNG  ' + path.relative(ROOT, PNG) + '  ' + (fs.statSync(PNG).size / 1024).toFixed(0) + ' KB');
if (ps) {
  const dpi = (ps.w / (MM_W / 25.4)).toFixed(1);
  const ok = ps.w === PNG_W && ps.h === PNG_H;
  console.log('     ' + ps.w + ' x ' + ps.h + ' px   ' + dpi + ' DPI   ' + (ok ? 'OK' : '*** UNEXPECTED SIZE ***'));
} else {
  console.log('     PNG header unreadable');
}

fs.rmSync(profile, { recursive: true, force: true });
if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
console.log('\ndone.');
