# Release Notes Generator (Windows)

Act as the **Play Store Release Notes** agent for this project (`com.carservice.reminder`).
Generate the paste-ready Play Store release notes for the next release, in the
exact multi-locale format, translated into all five app locales.

**Goal**: produce a `Release notes;` block with `<en-US>`, `<ar>`, `<es-ES>`,
`<fr-FR>`, `<pt-PT>` sections, then (optionally) archive it under `releases/`.

## Style reference (from the published V1.38 notes)

| Locale | Header | Intro | Verb examples |
|---|---|---|---|
| en-US | `🚗 V{version} Release` | `Features included in this release:` | `Fixed …`, `Added …`, `Updated …` |
| ar | `🚗 V{version} Release` | `الميزات المدرجة في هذا الإصدار:` | `تم إصلاح …`, `تمت إضافة …`, `تم تحديث …` |
| es-ES | `🚗 V{version} Release:` | *(none)* | `Se corrigió …`, `Se añadió …`, `Se actualizó …` |
| fr-FR | `🚗 V{version} Release` | `Fonctionnalités incluses dans cette version :` | `Correction de …`, `Ajout de …`, `Mise à jour de …` |
| pt-PT | `🚗 V{version} Release:` | *(none)* | `Correção de …`, `Adição de …`, `Atualização de …` |

- Bullets start with `• `; brands keep their Latin spelling; 3–12 bullets, <500 chars per locale.

## Steps

1. Read `android/app/build.gradle` for `versionCode` / `versionName`. Confirm with
   the user which version's notes to write (git history does not map 1:1 to Play
   Store releases).
2. Generate the draft:
   ```bash
   node scripts/generate-release-notes.cjs --json
   ```
   - Different range: `--from <commit> --to <commit> --json`
   - Plain text preview: drop `--json`; write to file: `--output releases/V…-notes.txt`
   - ⚠️ Also run `git status`: this repo frequently ships uncommitted feature work
     (fuel log, documents, statistics, settings). Ask the user which uncommitted
     changes ship in this release and add bullets for them.
3. Review every commit the script included (`git show --stat <hash>` when unsure):
   - Split compound subjects into one bullet per user-facing change.
   - Rewrite dev-speak into user phrasing (e.g. `fixed micra engines` → `Updated Nissan (Micra) engine data`).
   - Drop non-user-facing work (docs, scripts, version bumps) — the script filters most.
   - Dedupe overlapping bullets.
4. Check/complete the translations yourself for bullets flagged `"fallback": true`
   or any wording the dictionary did not cover. Respect gender agreement and
   articles per language.
5. Print the final `Release notes;` block and offer to archive it:
   `node scripts/generate-release-notes.cjs --output releases/V{version}-play-store-notes.txt`

## Rules

- Every bullet must trace to a real commit/diff — never invent features.
- No English fragments inside the ar/es/fr/pt blocks.
- Do not bump `versionCode`/`versionName` or touch `android/app/build.gradle`
  unless the user explicitly asks.

## Finish

Report: version (name + code), git range used, number of commits/bullets, the
final `Release notes;` block (or saved file path), and one line per locale
confirming the translation was reviewed.