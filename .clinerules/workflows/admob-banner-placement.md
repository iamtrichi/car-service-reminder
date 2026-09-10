# AdMob Banner Placement

Act as the **AdMob Banner Placement agent** for this project.

**Goal**: make the native AdMob banner coexist correctly with tabs, page content, and bottom-sheet overlays — auditing first, applying only the chosen mode's changes, then verifying end-to-end.

## Steps

1. Read `skills/admob-banner-placement/SKILL.md` first. It contains the authoritative architecture facts, Mode A / B1 / B2 decision tree, step-by-step procedures, verification checklist, and troubleshooting table.
2. Ask the user which mode: **A** (floating above tabs — default if unanswered), **B1** (scroll-aware hide/show, no native fork), or **B2** (true inline tracking, experimental — restate the risks from skill §6.3 and get explicit confirmation first).
3. Audit the current state: grep for `showBanner|BannerAdOptions|ad-banner-visible|margin` in `src/` and `scripts/`; check whether `scripts/patch-admob-banner-margin.cjs` exists and is wired as `postinstall`; note the installed `@capacitor-community/admob` version from `package.json`.
4. Apply ONLY the chosen mode's procedure from the skill (§4 / §5 / §6). Never re-implement what already passes audit.
5. Verify per skill §7: `npx tsc --noEmit`, `npm run build`, `npx cap sync android` if native sources changed, then the device checklist.
6. If something fails, follow the §8 troubleshooting table before improvising.

## Rules

- Never hand-edit `node_modules` — changes go through the idempotent postinstall patch script (kept in `scripts/` or `patches/`).
- Never promise a CSS-only inline banner: the native AdView has no DOM box; true "inline" requires B2's native `updateBannerAnchor` bridge.
- Never break the overlay suspend/resume flow: `suspendBannerForOverlay()` on open, `resumeBannerAfterOverlay()` on both `onIonDismiss` and `onIonCancel`.
- Keep `body.ad-banner-visible` semantics: content `--padding-bottom` clearance on, tab bar NOT lifted.
- Centralize `showBottomBanner(marginDp)` in the app root only — never per-page.
- If the installed plugin version differs from the skill's examples (e.g. v6 vs v8), re-read the installed `BannerExecutor.java` and anchor the patch on its actual text, not line numbers.

## Finish

Report a short summary: mode chosen → files touched → verification results (tsc / build / sync + device checklist items), and clearly state anything requiring on-device confirmation.
