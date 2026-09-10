---
name: admob-banner-placement
description: >-
  Implement, patch, and verify native AdMob banner placement in Ionic/Capacitor
  apps (repos using @capacitor-community/admob). Covers three placement modes:
  (A) floating banner above the bottom tab bar via the plugin `margin` option
  plus the Android 15+ inset-margin postinstall patch, (B1) scroll-aware
  hide/show ("scrolls away") using hideBanner/resumeBanner with an IonContent
  scroll listener, and (B2) experimental true-inline tracking via a native fork
  exposing updateBannerAnchor(yDp, visible). Includes suspend/resume helpers
  for bottom-sheet overlays (language selector), CSS clearance rules,
  verification checklist and troubleshooting.
version: 1.0.0
compatibility: opencode, cline
last-reviewed: 2026-09-10
---

# AdMob Banner Placement — Canonical Skill

## 1. When to use this skill

Use when the user reports or requests anything about the native AdMob banner in
an Ionic React + Capacitor app that uses `@capacitor-community/admob`:

- "The banner covers the tab bar / content / my modal."
- "Show the banner above the tabs" (or "tabs invisible because of the banner").
- "I want margin-bottom ~90px on all pages so content is not hidden."
- "The language/action-sheet selector is partially hidden by the banner."
- "I want the banner to scroll away with the page / sit under a component
  (inline, not absolute)."

## 2. Architecture facts (do not re-derive)

The native banner is an Android `AdView` / iOS `BannerView` added to the
**root view, on top of the WebView**. It has **no DOM box**:

- No CSS (`z-index`, margin, padding) can put web content **above** it.
- The plugin API is only `BannerAdOptions { position, margin, ... }` —
  `position: TOP_CENTER | CENTER | BOTTOM_CENTER`, `margin` in **dp**
  (bottom margin for `BOTTOM_CENTER`, top margin for `TOP_CENTER`).
  `margin` exists since plugin v1.1.2 (all repos in this workspace have ≥ 6.2.0).
- **Android 15+ bug**: in `node_modules/@capacitor-community/admob/android/.../BannerExecutor.java`,
  on `SDK >= VANILLA_ICE_CREAM` an `OnApplyWindowInsetsListener` calls
  `setMargins(0, 0, 0, bottomInset)` — **wiping the requested margin** whenever
  insets apply. Fixed by the postinstall patch (see §4 step 3).
- iOS applies the margin to the bottom constraint against the safe-area guide
  (`constant = margin * -1`) — no patch needed.
- Because the banner floats over the WebView, page content needs **scroll
  clearance** (CSS `--padding-bottom`), not a hard margin on the host.

### Proven baseline (radio-code-generator-renault-dacia)

| Piece | File |
|---|---|
| Banner service (margin, suspend/resume helpers) | `src/services/bannerAdService.ts` |
| Android 15+ inset patch (postinstall, idempotent) | `scripts/patch-admob-banner-margin.cjs` + `postinstall` in `package.json` |
| Content clearance + toast offset CSS | `src/theme/variables.css` (`body.ad-banner-visible ...`) |
| App-shell centralized show | app root component (`showBottomBanner(marginDp)` once per launch) |

Key service exports to mirror per repo:
`showBottomBanner(bottomMarginDp = 90)`, `hideBottomBanner()`,
`isBannerVisible()`, `suspendBannerForOverlay()`, `resumeBannerAfterOverlay()`
(hide keeps `body.ad-banner-visible` so layout doesn't jump; resume is
idempotent with a 60s safety timer).

## 3. Mode decision tree

| Situation | Mode |
|---|---|
| Bottom tab bar exists; banner should always be visible above it | **A — Floating above tabs (default)** |
| "Banner should not be visible when the user scrolls" — without native work | **B1 — Scroll-aware hide/show** |
| "Banner must literally sit under a component and scroll with content" | **B2 — True inline tracking (experimental)** |

**Default when the user doesn't choose: Mode A.**

| Mode | Pros | Cons |
|---|---|---|
| A | Proven on device; 2-line native patch; survives rotation | Banner always visible; ~90dp content clearance needed |
| B1 | Pure web code; uses existing `hideBanner`/`resumeBanner`; no fork | Banner disappears rather than literally scrolling off |
| B2 | Literally inline/scrolling | Permanent native fork, per-frame bridge traffic, density/safe-area/rotation edge cases, AdMob clipping policy risk |


## 4. Procedure A — Floating banner above tabs (default)

1. **Audit** existing banner code: `grep` for `showBanner|BannerAdOptions|ad-banner-visible|margin` in `src/` and `scripts/`.
2. **Centralize** the show in the app root (once per launch, `useEffect`):
   `showBottomBanner(<tabBarHeight + gap, dp>)` — e.g. 90 for a 62px tab bar.
   Remove any per-page show calls (tab switches must not re-request the ad).
3. **Postinstall patch**: ensure `scripts/patch-admob-banner-margin.cjs`
   exists, is idempotent, and is wired as `"postinstall": "node scripts/patch-admob-banner-margin.cjs"`.
   It must fix the Android 15+ inset listener to
   `setMargins(0, 0, 0, bottomInset + (int)(margin * density))` (and the
   symmetric TOP case). Re-verify anchors against the installed plugin
   version — Budget-Tracker (v6) has a different executor layout than v8.
4. **CSS clearance**: on `body.ad-banner-visible`, set
   `ion-content { --padding-bottom: calc(16px + var(--ad-banner-offset, 90px) + env(safe-area-inset-bottom, 0px)); }`
   and lift bottom-positioned toasts above the banner. **Do not** lift the tab
   bar itself (banner is above it thanks to the margin). Keep
   `--ad-banner-offset` synced with the dp passed to `showBottomBanner`.
5. **Overlays** (bottom sheets, action sheets): any `interface="action-sheet"`
   selector that slides from the bottom must suspend the banner first:
   `suspendBannerForOverlay()` on open, `resumeBannerAfterOverlay()` on
   `onIonDismiss` **and** `onIonCancel` (Ionic may fire either or both).
6. **Verify**: `npx tsc --noEmit`, `npm run build`, `npx cap sync android`
   (patch touches native sources), device check: banner above tabs, content
   fully scrollable, rotation keeps offset, selector fully visible.

## 5. Procedure B1 — Scroll-aware hide/show ("scrolls away", no fork)

Mechanism: the banner stays floating (Mode A layout), but JS hides it when the
user scrolls past a threshold and restores it at the top.

1. Place a marker in the page where the banner should "end":
   `<div ref={bannerEndRef} data-banner-slot="true" />`
   after the component under which the banner should not remain visible.
2. Enable scroll events on the page's `IonContent`:
   `<IonContent scrollEvents={true} onIonScroll={handleScroll}>`
3. Throttled handler (~100ms) compares scroll position with the marker:
   when `e.detail.scrollTop > bannerEndRef.current.offsetTop` and the banner is
   shown → `AdMob.hideBanner()`, set `bannerShownRef.current = false`;
   when back above the threshold and hidden → `AdMob.resumeBanner()`.
   Use the `bannerAdService` suspend/resume helpers instead of raw `AdMob`

## 6. Procedure B2 — True inline tracking (experimental, full spec)

The banner still cannot be a DOM element; we move the **native AdView** to
follow a placeholder's viewport position, and hide it when off-screen.

### 6.1 Native side (Android)

Patch `BannerExecutor.java` (via `patch-package` — preferred over a fork —
with the patch file kept in `patches/` and applied in `postinstall` **after**
the margin patch). New plugin method `updateBannerAnchor`:

- Input: `{ yDp: number, visible: boolean }`.
- Must run layout updates **on the UI thread** (`activitySupplier.get().runOnUiThread`).
- Convert `yDp` → px (`yDp * density`), set
  `mAdViewLayoutParams.setMargins(0, yPx, 0, 0)` and
  `gravity = Gravity.TOP`, then `mAdViewLayout.setLayoutParams(...)`.
- Set `mAdViewLayout.setVisibility(visible ? VISIBLE : GONE)`.
- Re-apply the anchor on the plugin's `SizeChanged` event (adaptive banner
  height changes per device/rotation) and inside the Android 15+
  `OnApplyWindowInsetsListener` (it must preserve the anchor Y like the margin
  patch preserves the margin).
- **Clipping guard**: never position the banner partially off-screen
  (`0 <= yPx <= viewportHeight - bannerHeightPx`); if out of range → hide.

iOS analog (`BannerExecutor.swift`): update the banner's top-constraint
constant (`yDp * scale`) relative to the safe-area guide on the main actor,
with the same visibility + clipping rules.

### 6.2 Web side

- Placeholder element in the page: `<div data-banner-slot="true" />` where the
  banner should sit.
- Track with `requestAnimationFrame` (or a throttled `onIonScroll`):
  `const r = slot.getBoundingClientRect()` →
  `yDp = clamp(r.top / devicePixelRatio, 0, viewportHeightDp - 90)` and
  `visible = r.bottom > 0 && r.top < window.innerHeight`; call
  `AdMob.updateBannerAnchor({ yDp, visible })`.
- **Cancel** the loop in `ionViewWillLeave` / effect cleanup — but restart it
  from `useIonViewWillEnter`, because Ionic page caching makes unmount
  unreliable.
- Bridge typing: extend `BannerAdOptions`/plugin defs via the same
  `patch-package` or a local `.d.ts` augmentation.
- Delivery: prefer `patch-package` (patch survives `npm install`, kept in
  `patches/`, wired in `postinstall` **after** the margin patch) over a full
  fork unless the change outgrows ~100 lines.

### 6.3 Risks to state to the user before starting B2

- Permanent maintenance burden across plugin updates.
- Per-frame bridge traffic — profile on a low-end device.
- **AdMob policy**: a clipped or partially obscured banner can violate policy;
  the clipping guard is mandatory.
- Requires real-device tuning (density, notch, keyboard insets).

## 7. Verification checklist (all modes)

1. `npx tsc --noEmit` — clean.
2. `npm run build` — succeeds.
3. If any native source/patch changed: `npx cap sync android` then rebuild the
   APK (`npm run android:debug` or Gradle) — node_modules native sources are
   copied at sync time.
4. Device matrix:
   - [ ] Banner above the tab bar (A) / hidden past threshold (B1) / under the
         placeholder and scrolling (B2).
   - [ ] Content's last element fully scrollable above the banner clearance.
   - [ ] Rotation preserves offset/anchor; adaptive height re-applied.
   - [ ] Bottom-sheet selector fully visible; banner restored after close.
   - [ ] Web browser build shows no banner and no empty gap
         (`ad-banner-visible` removed on failure).

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Banner hugs screen edge despite `margin` (Android 15+) | inset listener wipes margins | postinstall patch missing/not run — run it, check `node_modules/.../BannerExecutor.java` |
| Tabs lifted with a gap under them | old "lift tabs" CSS still present | remove `ion-tab-bar { margin-bottom: ... }` rule; rely on banner `margin` |
| Content hidden behind banner | missing `--padding-bottom` clearance | add/keep `body.ad-banner-visible ion-content` rule |
| Double banner request / flash on tab switch | per-page show calls | centralize `showBottomBanner()` in app root only |
| Language selector options partially covered | action-sheet over banner | suspend/resume helpers missing on open/dismiss/cancel |
| Banner never returns after a modal | `resume` without `suspend` tracking, or dismiss event missed | use `resumeBannerAfterOverlay()` on both `onIonDismiss` and `onIonCancel`; keep the safety timer |
| Layout jumps when banner hides | `ad-banner-visible` class toggled during hide | keep the class during suspend/scroll-hide; only toggle on real show-failure |
| Patch lost after `npm install` | patch not wired in `postinstall` | add `"postinstall"` script; keep patch idempotent ("Already patched" on re-run) |
| v6 repo (Budget-Tracker) patch anchors differ | executor code differs per version | re-read the installed `BannerExecutor.java` before writing the patch; anchor on the inset-listener text, not line numbers |

   calls where they exist, so overlay-suspend and scroll-hide compose safely.
4. **Keep `body.ad-banner-visible` on** while hidden — content spacing must
   not jump (the area is empty while scrolled; that is expected).
5. **Cleanup for Ionic page caching**: never rely on unmount to reset state;
   reset `bannerShownRef` in `useIonViewWillEnter` and `resumeBanner()` there
   (a cached page may return while the banner is hidden).
6. Verify: scroll down → banner gone; scroll back to top → banner back; tab
   away and back → banner back; language selector still suspends correctly.
