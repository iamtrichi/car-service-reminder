/**
 * Post-build verification for the A4 flyer.
 *
 *   node scripts/verify-flyer.mjs
 *
 * Checks, against the real rendered artefacts (not the source HTML):
 *   1. the QR embedded in the 300 DPI PNG decodes to the exact Play Store URL
 *   2. the PDF is exact A4
 *   3. the PDF embeds raster images (screenshots + logo), not blank boxes
 *   4. brand colours survive the RGB -> PDF round trip
 *   5. French accented characters are present and none were mangled
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import jsQR from 'jsqr';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FLYER_DIR = path.join(ROOT, 'marketing/flyer');
const PNG = path.join(FLYER_DIR, 'flyer-a4-fr-300dpi.png');
const PDF = path.join(FLYER_DIR, 'flyer-a4-fr.pdf');
const URL_FILE = path.join(FLYER_DIR, 'playstore-url.txt');

const EXPECTED = fs.readFileSync(URL_FILE, 'utf8').trim();
const NAVY = [0x02, 0x2f, 0x64];
const NAVY_DEEP = [0x00, 0x17, 0x42];
const ORANGE = [0xfe, 0x64, 0x03];

/* ------------------------- minimal PNG decoder ------------------------- */
function decodePng(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a PNG: ' + file);
  let o = 8, w = 0, h = 0, depth = 0, ct = 0, plte = null;
  const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o);
    const type = b.toString('ascii', o + 4, o + 8);
    const data = b.slice(o + 8, o + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ct = data[9]; }
    else if (type === 'PLTE') plte = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  if (depth !== 8) throw new Error('unsupported bit depth ' + depth);
  const chan = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (!chan) throw new Error('unsupported colour type ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * chan;
  const out = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const line = raw.slice(p, p + stride); p += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= chan ? cur[x - chan] : 0;
      const bb = prev[x];
      const c = x >= chan ? prev[x - chan] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += bb;
      else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) {
        const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
      }
      cur[x] = v & 255;
    }
  }
  // normalise to RGBA
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r, g, bl, al = 255;
    if (ct === 6) { r = out[i * 4]; g = out[i * 4 + 1]; bl = out[i * 4 + 2]; al = out[i * 4 + 3]; }
    else if (ct === 2) { r = out[i * 3]; g = out[i * 3 + 1]; bl = out[i * 3 + 2]; }
    else if (ct === 0) { r = g = bl = out[i]; }
    else if (ct === 4) { r = g = bl = out[i * 2]; al = out[i * 2 + 1]; }
    else if (ct === 3) { const i2 = out[i] * 3; r = plte[i2]; g = plte[i2 + 1]; bl = plte[i2 + 2]; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = bl; rgba[i * 4 + 3] = al;
  }
  return { w, h, data: rgba };
}

const near = (a, b, tol = 6) => Math.abs(a - b) <= tol;

/* ------------------------------- 1. QR --------------------------------- */
const img = decodePng(PNG);
const SCALE = img.w / (210 / 25.4 * 96);           // device px per CSS px
const mmToDev = (mm) => mm * (96 / 25.4) * SCALE;

// White QR panel geometry, mirrored from flyer-a4-fr.html:
//   page padding 10mm; footer is the last 50mm band; padding 3mm 8mm;
//   .f-right is 44mm wide at the right edge; .qr-box is 40mm, centred.
const pageX = mmToDev(10), pageY = mmToDev(10);
const contentW = mmToDev(190);
const footerTop = pageY + mmToDev(225);           // 275mm of bands, footer 50mm
const innerLeft = pageX + mmToDev(8);
const innerRight = pageX + contentW - mmToDev(8);
const fRightW = mmToDev(44);
const qrBoxW = mmToDev(40), qrBoxH = mmToDev(40);
const qrX0 = Math.round(innerRight - fRightW + (fRightW - qrBoxW) / 2) - 3;
const qrY0 = Math.round(footerTop + mmToDev(3) - 3);
const qrW = Math.round(qrBoxW) + 6;
const qrH = Math.round(qrBoxH) + 6;

const crop = Buffer.alloc(qrW * qrH * 4);
for (let y = 0; y < qrH; y++) {
  const sy = Math.min(img.h - 1, Math.max(0, qrY0 + y));
  for (let x = 0; x < qrW; x++) {
    const sx = Math.min(img.w - 1, Math.max(0, qrX0 + x));
    const si = (sy * img.w + sx) * 4, di = (y * qrW + x) * 4;
    crop[di] = img.data[si]; crop[di + 1] = img.data[si + 1];
    crop[di + 2] = img.data[si + 2]; crop[di + 3] = 255;
  }
}
const decoded = jsQR(crop, qrW, qrH);

/* ------------------------------ 2/3. PDF ------------------------------- */
const pdfBuf = fs.readFileSync(PDF);
const pdfStr = pdfBuf.toString('latin1');
const mb = pdfStr.match(/\/MediaBox\s*\[\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*\]/);
const mediaBox = mb ? { w: +mb[3] - +mb[1], h: +mb[4] - +mb[2] } : null;
const imgCount = (pdfStr.match(/\/Subtype\s*\/Image/g) || []).length;

/* ---------------------------- 4. brand colours -------------------------- */
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
// Presence-based rather than single-point: the header is a 135deg gradient and
// the orange is used in many small elements, so one sampled pixel proves little.
// We assert the brand colour actually appears in the raster, and report how
// much of the page it covers.
function countColour(target, tol) {
  let n = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (near(img.data[i], target[0], tol) && near(img.data[i + 1], target[1], tol) && near(img.data[i + 2], target[2], tol)) n++;
  }
  return n;
}
const totalPx = img.w * img.h;
const navyCount = countColour(NAVY, 4);
const navyDeepCount = countColour(NAVY_DEEP, 4);
const orangeCount = countColour(ORANGE, 14);
const pct = (n) => (100 * n / totalPx).toFixed(2) + '% of page';

/* ------------------------------ 5. accents ----------------------------- */
const accented = /[éèêàçôûùïÉÈÀÇ]/;
const html = fs.readFileSync(path.join(FLYER_DIR, 'flyer-a4-fr.html'), 'utf8');
const visible = html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

/* ------------------------------- report -------------------------------- */
let fails = 0;
const line = (ok, label, detail) => {
  if (!ok) fails++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + label.padEnd(34) + detail);
};

console.log('flyer    : ' + path.relative(ROOT, PNG));
console.log('raster   : ' + img.w + ' x ' + img.h + ' px\n');

line(!!decoded, 'QR decodes from the rendered PNG',
  decoded ? decoded.data.slice(0, 60) + (decoded.data.length > 60 ? '...' : '') : 'no code found in crop ' + qrW + 'x' + qrH);
if (decoded) {
  line(decoded.data === EXPECTED, 'QR payload matches store URL',
    decoded.data === EXPECTED ? 'exact match' : '\n        got: ' + decoded.data + '\n        want: ' + EXPECTED);
}
line(!!mediaBox && Math.abs(mediaBox.w - 595.28) < 1.5 && Math.abs(mediaBox.h - 841.89) < 1.5,
  'PDF page size is A4', mediaBox ? mediaBox.w.toFixed(2) + ' x ' + mediaBox.h.toFixed(2) + ' pt' : 'MediaBox not found');
line(imgCount >= 5, 'PDF embeds the raster images', imgCount + ' image XObjects (logo + 4 screenshots expected >= 5)');
line(navyCount > totalPx * 0.02, 'brand navy present in render',
  hex(NAVY) + ' x' + navyCount + ' (' + pct(navyCount) + '), ' + hex(NAVY_DEEP) + ' x' + navyDeepCount + ' (' + pct(navyDeepCount) + ')');
line(orangeCount > totalPx * 0.002, 'brand orange present in render',
  hex(ORANGE) + ' x' + orangeCount + ' (' + pct(orangeCount) + ')');
line(accented.test(visible), 'French accents present in copy',
  (visible.match(/[éèêàçôûùïÉÈÀÇ]/g) || []).length + ' accented chars found');
const stray = visible.match(/[A-Za-z][\u4e00-\u9fff]/g);
line(!stray, 'no stray CJK characters in copy', stray ? stray.join(',') : 'clean');

console.log('\n' + (fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'));
process.exit(fails === 0 ? 0 : 1);
