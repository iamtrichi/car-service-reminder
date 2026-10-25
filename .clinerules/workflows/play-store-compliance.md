# Play Store Compliance (Capacitor / Ionic Android)

Act as the **Play Store Compliance agent** for this project.

**Goal**: resolve the Google Play Console "recommended actions" — edge-to-edge
(targetSdk 35+), the deprecated `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`
warning, and the outdated Android Gradle Plugin / R8 (AGP 9) — fixing only what
fails, then verifying end-to-end.

## Steps

1. Read `skills/play-store-compliance/SKILL.md` first. It contains the root
   causes, the AGP 9 + Capacitor compatibility matrix, the exact procedure, the
   verification checklist, and the troubleshooting table.
2. Run `node scripts/check-play-compliance.cjs` (or `npm run compliance:check`)
   from the project root. Review every `[PASS]`/`[WARN]`/`[FAIL]` line.
3. For each `[FAIL]` (and each `[WARN]` for an action Play actually reported):
   - **Edge-to-edge** → add `EdgeToEdge.enable(this)` **after** `super.onCreate`
     in `MainActivity` + `plugins.SystemBars` (`insetsHandling: 'disable'`,
     keeping the app full-bleed) in `capacitor.config.ts`. Do NOT add an inset
     listener that PADS the decor view on Capacitor 8 — reading the top inset and
     publishing it as `--safe-area-inset-top` (skill Action 1c) is fine.
   - **Cutout mode** → confirm no app-source/`res/`/manifest occurrence; if Play
     keeps warning, classify it as the known AndroidX false positive.
   - **AGP 9** → bump the wrapper + root AGP, fix Gradle 9 syntax
     (`rootProject.layout.buildDirectory`, `=` assignment), pin
     `kotlin_version = '2.3.21'`, keep `scripts/patch-capacitor-agp9.cjs` wired as
     `postinstall`, then run `npm install`.
4. Re-run the audit until there are no `[FAIL]` lines.
5. End-to-end verification:
   - `npm run android:debug` → `BUILD SUCCESSFUL`
   - `npm run android:release` → `minifyReleaseWithR8` succeeds
   - `npm install` → the postinstall patch re-applies (idempotent)

## Rules

- Never set `android.builtInKotlin=false` — deprecated and wrong for AGP 9.
- Never hand-edit `node_modules` as the final fix; go through
  `scripts/patch-capacitor-agp9.cjs`.
- Never edit AndroidX library code to silence the cutout warning.
- Never add a `setOnApplyWindowInsetsListener` that **pads the decor view** on
  Capacitor 8 (double padding — SystemBars already handles insets). A read-only
  listener that publishes `--safe-area-inset-top` (Action 1c) is intended and
  returns the insets untouched.
- Keep the patch a no-op unless AGP >= 9.
- Verify both a debug and a release (R8) build before declaring success.

## Finish

Report a short summary table: action → status → change made (or "already OK"),
the audit result, whether debug + release builds passed, and any remaining
warning you classify as a false positive.
