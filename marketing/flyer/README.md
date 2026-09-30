# Flyer A4 (FR) — Car Service Reminder

Print-ready A4 flyer and 300 DPI PNG preview, generated from HTML with headless
Chrome. No design tool required: edit the HTML, re-run the build.

## Build

```bash
npm run flyer          # QR + PDF + PNG
npm run flyer:qr       # regenerate the Play Store QR only
npm run flyer:verify   # re-check the built artefacts
```

| File | What it is |
|---|---|
| `flyer-a4-fr.html` | **Source of truth.** Authored in millimetres. Edit this. |
| `flyer-a4-fr.pdf` | Print-ready A4 (595.28 x 841.89 pt). Send this to the print shop. |
| `flyer-a4-fr-300dpi.png` | 2480 x 3508 px = 210 x 297 mm at exactly 300 DPI. For WhatsApp / social. |
| `playstore-qr.svg` | Vector QR, generated. Do not hand-edit. |
| `playstore-url.txt` | The exact string the QR encodes. |

Source assets live one level up in `marketing/source/`.

## Geometry

The page is `210mm x 297mm` with a **10mm safe margin** on all four sides, so
nothing important sits in a printer's unprintable edge. The six vertical bands
are fixed-height and sum to 275mm inside the 277mm content box:

| Band | Height |
|---|---|
| Header | 37mm |
| Hero | 14mm |
| Stats | 16mm |
| Screenshots | 108mm |
| Feature columns | 50mm |
| Footer | 50mm |

If you change a band's height, the sum must stay <= 277mm. `build-flyer.mjs`
runs an overflow probe and **fails the build** if a band overflows or the total
exceeds the content box, so clipped text cannot ship silently.

## Brand colours

Sampled from `marketing/source/feature.png` (indexed-PNG palette), not from
`src/theme/variables.css` — the Ionic palette is the *in-app UI* theme, the
marketing brand is different:

| Token | Hex | Used for |
|---|---|---|
| `--navy` | `#022F64` | Header gradient start, headings, bullets |
| `--navy-deep` | `#001742` | Footer, gradient end, QR modules |
| `--orange` | `#FE6403` | Accent: badge, stats, section title, CTA |

## QR code

The store URL is **read out of the app source** (`src/services/appUpdateService.ts`)
at build time and `&hl=fr&gl=FR` is appended so the link lands on the French
Play Store page. The flyer can therefore never drift from the in-app update
link. Error correction level `H` (~30% redundancy) so the code survives scuffing
and partial obstruction on a printed sheet.

`npm run flyer:verify` decodes the QR back out of the **rendered 300 DPI PNG**
with `jsqr` and asserts it matches the expected URL byte for byte.

## Editing notes

- **French copy is new**, condensed for print. It has *not* gone through the
  review that the `releases/*-listings.txt` fr-FR store listing did. Proofread
  before any print run.
- The four phone screenshots are **English** (the live Play Store captures).
  The copy around them is French. Capturing a French screenshot set would fix
  this; switch the app language in the side menu and re-capture.
- `clio.png` has ~40% blank space at the bottom. That is invisible because the
  shots band sits on white. If you change the band background, re-check it.
- Screenshot aspect ratio is 1082 x 2426 (0.446). At 42.8mm wide the natural
  height is 95.96mm; the band reserves that plus room for a two-line caption.
