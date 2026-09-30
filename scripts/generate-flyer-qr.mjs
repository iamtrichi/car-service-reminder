/**
 * Generates the Play Store QR code as a vector SVG for the A4 flyer.
 *
 *   node scripts/generate-flyer-qr.mjs
 *
 * The QR is emitted as SVG (not PNG) so it stays perfectly crisp at any print
 * size and introduces no resampling artefacts at 300 DPI. The store URL is
 * read from the app itself (src/services/appUpdateService.ts) so the flyer can
 * never drift from the in-app "update available" link.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const APP_UPDATE_SERVICE = path.join(ROOT, 'src/services/appUpdateService.ts');
const OUT_DIR = path.join(ROOT, 'marketing/flyer');
const OUT_SVG = path.join(OUT_DIR, 'playstore-qr.svg');
const OUT_TXT = path.join(OUT_DIR, 'playstore-url.txt');

/** Pull the canonical store URL out of the app source. */
function readStoreUrl() {
  const src = fs.readFileSync(APP_UPDATE_SERVICE, 'utf8');
  const m = src.match(/PLAY_STORE_URL\s*=\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error(`PLAY_STORE_URL not found in ${APP_UPDATE_SERVICE}`);
  return m[1];
}

const base = readStoreUrl();
// hl=fr + gl=FR forces the French store page, which is what the flyer copy targets.
const url = `${base}&hl=fr&gl=FR`;

fs.mkdirSync(OUT_DIR, { recursive: true });

// margin 0: the flyer draws its own quiet zone, so we do not waste print area.
const svg = await QRCode.toString(url, {
  type: 'svg',
  errorCorrectionLevel: 'H', // ~30% redundancy: survives scuffing and partial obstruction
  margin: 0,
  color: { dark: '#001742', light: '#00000000' },
});

fs.writeFileSync(OUT_SVG, svg, 'utf8');
fs.writeFileSync(OUT_TXT, url + '\n', 'utf8');

console.log('store url  :', url);
console.log('ec level   : H');
console.log('svg        :', path.relative(ROOT, OUT_SVG), `(${svg.length} bytes)`);
console.log('url record :', path.relative(ROOT, OUT_TXT));
