---
name: play-store-compliance
description: Fix the Google Play Console "recommended actions" for a Capacitor/Ionic Android app - edge-to-edge enforcement (targetSdk 35+), the deprecated LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES warning, and the outdated Android Gradle Plugin / R8 upgrade (AGP 9). Use when Play Console reports these issues or when upgrading Capacitor/AGP.
compatibility: opencode, cline
---

# Play Store Compliance (Edge-to-edge, Cutout warning, AGP 9)

## When to use this skill

- Google Play Console shows a **recommended action** for:
  1. **Edge-to-edge** — "Your app is not edge-to-edge friendly" / content hidden behind system bars (from `targetSdk` 35 / Android 15).
  2. **Deprecated display-cutout mode** — `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`.
  3. **Outdated Android Gradle Plugin / R8** — "Update your Android Gradle Plugin version" (Play recommends the latest, AGP 9.x).
- You are upgrading a Capacitor app to Capacitor 8 / AGP 9 and want the whole checklist in one pass.

**Golden rule: audit first.** Run the cross-project audit and fix only what `[FAIL]`s:

```
node scripts/check-play-compliance.cjs [projectRoot]
# or: npm run compliance:check
```

The script is read-only and works from any Capacitor app root (the folder containing `android/`).

---

## Action 1 — Edge-to-edge (targetSdk 35+)

**Why:** From Android 15 (API 35), apps targeting 35+ are drawn edge-to-edge by default: the WebView extends under the status/navigation bars, so content is clipped/overlapped unless window insets are handled.

**Root cause in Capacitor < 8:** the Android bridge (`BridgeActivity`) has **zero `WindowInsets` handling**; with `targetSdk 36` the WebView draws under the system bars.

**Two ways to fix — prefer the framework, not hand-rolled code:**

### 1a. Capacitor 8 (recommended): SystemBars core plugin

Capacitor 8 bundles a **`SystemBars`** core plugin that applies safe-area insets to the WebView natively. Configure it in `capacitor.config.ts`:

```ts
plugins: {
  SystemBars: {
    insetsHandling: 'css',              // default; injects CSS env() safe-area vars
    initialViewportFitValueHint: 'cover',
  },
}
```

> **Do NOT** also add a hand-rolled `setOnApplyWindowInsetsListener` that pads the WebView — that **double-pads** on WebView < 140. Only use a native inset listener when the app is on **Capacitor < 8** *or* the plugin is set to `insetsHandling: 'disable'`.
>
> **`insetsHandling: 'css'` pads, it does not overlay.** On WebView < 140 (most devices in 2025/2026) the plugin literally `setPadding()`s the **decor view** by the status-bar/cutout inset. So the web content can never reach the top edge. If you want a full-bleed UI (or hide the status bar), see **1c**.

### 1b. Keep it edge-to-edge on all API levels: `EdgeToEdge.enable`

To enable edge-to-edge back to older APIs (and to make the behavior explicit), call the AndroidX helper in `MainActivity`. **It must run AFTER `super.onCreate`:**

```java
import androidx.activity.EdgeToEdge;

@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);   // Capacitor applies AppTheme.NoActionBar here
    EdgeToEdge.enable(this);               // all API levels
    registerPlugin(AppUpdatePlugin.class);
}
```

> **Why after `super.onCreate`?** Capacitor's `BridgeActivity.onCreate` applies `AppTheme.NoActionBar` **and** `setContentView` inside `super.onCreate`. `EdgeToEdge.enable()` immediately calls `activity.getWindow().getDecorView()` (it builds the window decor). Calling it *first* builds the decor with the **launch** theme, and the framework ActionBar baked into that decor survives — Capacitor's later `setTheme(...NoActionBar)` cannot remove an already-created decor. Symptom: a native ActionBar titled with the **app name** floats over the WebView. `@capacitor-community/safe-area` documents the same after-`super` order.

Requires `androidx.activity:activity` (Capacitor 8 already pins it, e.g. `1.11.0`). Add it explicitly if missing:

```gradle
// android/app/build.gradle
implementation "androidx.activity:activity:$androidxActivityVersion"
```

Also ensure `AndroidManifest.xml` declares the activity handles config changes for insets:

```xml
android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
```

### 1c. Edge-to-edge with the status bar shown (and hiding it)

Two decisions are independent: **whether the native bar is visible**, and **whether the app is padded or full-bleed**. This app keeps the bar **shown** but stays **full-bleed** (blue reaches `y=0`, content below the bar, nothing padded at the bottom).

With `insetsHandling: 'css'`, the plugin pads the decor view by the status-bar/cutout inset, so if you *also* hide the status bar (`SystemBars.hide({ bar: SystemBarType.StatusBar })`) you are left with a **blank strip** the height of the bar/cutout instead of a full-bleed header. Use `'disable'` + let the WebView handle safe areas, and render into the cutout:

```ts
// capacitor.config.ts
SystemBars: {
  insetsHandling: 'disable',            // no native padding; we publish the top inset ourselves
  initialViewportFitValueHint: 'cover',
},
```

```tsx
// app root (native only) — show the bar with light (white) icons on the brand-blue header
import { Capacitor, SystemBars, SystemBarType, SystemBarsStyle } from '@capacitor/core';
if (Capacitor.isNativePlatform()) {
  SystemBars.show({ bar: SystemBarType.StatusBar }).catch(() => {});
  SystemBars.setStyle({ style: SystemBarsStyle.Dark, bar: SystemBarType.StatusBar }).catch(() => {});
  // SystemBarsStyle.Dark = LIGHT bar content; passing `bar` leaves the gesture bar untouched.
  // To hide it instead: SystemBars.hide({ bar: SystemBarType.StatusBar }) + zero --ion-safe-area-top.
}
```

```java
// MainActivity, after super.onCreate() — allows content under the punch-hole
WindowManager.LayoutParams attrs = getWindow().getAttributes();
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
    attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
} else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    attrs.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
}
```

Keep `viewport-fit=cover` in `index.html` so the WebView exposes `env(safe-area-inset-*)` (Ionic pads its header/footer content with it), and `Keyboard.resizeOnFullScreen: true` is the intended companion of `insetsHandling: 'disable'`. Privilege the `ALWAYS` constant on API 30+ — `SHORT_EDGES` is deprecated from API 35.

**With `'disable'` nothing publishes the top inset, and `env(safe-area-inset-top)` is 0 before WebView 140.** The plugin's `initWindowInsetsListener()` returns early for `'disable'` and `injectSafeAreaCSS()` also no-ops unless the mode is `'css'`, while Chromium only fixes `env(safe-area-inset-top)` from **WebView 140** on (issues.chromium.org/40699457) — on WebView < 140 the value is **0**, so the header keeps a `padding-top` of 0 and the toolbar title slides under the status-bar clock. Publish the real inset from Java (this is exactly what the plugin injects in `'css'` mode, just without touching layout):

```java
// MainActivity — read the inset, write it to CSS, return the insets UNCHANGED
ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, insets) -> {
    Insets bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
    topInsetDp = Math.round(bars.top / getResources().getDisplayMetrics().density); // px -> dp == CSS px
    applyTopInset();               // document.documentElement.style.setProperty('--safe-area-inset-top', n + 'px')
    return insets;                 // NOT consumed, no decor padding -> full-bleed (banner/tab/footer clearances untouched)
});
// and re-apply from WebViewListener.onPageCommitVisible: the value is an inline style on <html>, lost on reload.
```

**The `ion-header` does not pad itself — its first toolbar does.** Ionic's core CSS declares `html{--ion-safe-area-top: var(--safe-area-inset-top, env(safe-area-inset-top))}` and `ion-header ion-toolbar:first-of-type { padding-top: var(--ion-safe-area-top, 0) }`, and the toolbar paints `--background` through its padding (`.toolbar-background { position:absolute; top:0; bottom:0 }`), which is why the blue still reaches `y=0` while the title/buttons sit below the bar. So with the bar shown the header is **status-bar inset + 56 dp toolbar** — on the `Pixel_9_Pro` emulator `getInsets(systemBars() | displayCutout()).top` = **136 px (52 dp)** (identical to the status-bar height; the visible punch-hole only spans y 34–102 px), giving a **108 dp** header with the toolbar content centre at ~80 dp **before the trim below** (the default 24px trim brings that to 84 dp / 56 dp). That is a *placement* measurement, not a floating title — measure the content centre before concluding anything.

**Tightening the gap above the app-bar content.** If the empty blue between the status-bar icons and the toolbar title looks too tall, trim it in CSS — do **not** rewrite `--ion-safe-area-top` (the action-sheet, popover, tab-bar and modal CSS all consume it, and the sheet-modals offset is derived from it) and do **not** shrink the value published from Java (that would make `--safe-area-inset-top` lie):

```css
/* src/theme/variables.css */
:root { --app-bar-top-trim: 24px; }        /* 0 = bar starts exactly at the status-bar edge */

:root ion-header ion-toolbar:first-of-type {
  /* :root -> specificity (0,2,2) beats Ionic's (0,1,2) rule whatever the runtime injection order.
     Only the toolbar padding is touched (page, menu and in-modal headers alike);
     the 24px floor stops a short status bar from sliding the title into the clock. */
  padding-top: max(24px, calc(var(--ion-safe-area-top, 0px) - var(--app-bar-top-trim)));
}
```

With the default 24px trim on this device: reserved **28 dp**, header **84 dp**, toolbar content centre **56 dp** (measured title band y 127–165 px, status-bar icon row unchanged at 52–84 px, punch-hole column still empty). Shrink the toolbar itself instead by setting `--min-height: 48px` on the same selector. Expect a ~4 px settle on first paint (before Java publishes the inset, the clamp yields the 24 px floor).

`src/theme/variables.css` must **not** set `--ion-safe-area-top`: an earlier `--ion-safe-area-top: 0px` override existed for the status-bar-hidden design (compact 56 dp bar flush with the top edge, content centre 28 dp — tags: title passing under the punch-hole glass, accepted at the time) and `:root` would beat Ionic's `html{}` rule. Use `--app-bar-top-trim` on the toolbar padding (above) for spacing instead. Only the top is affected either way — `--ion-safe-area-bottom` still drives the AdMob banner / tab-bar clearance, and child headers (`ion-menu`, full-screen `ion-modal`) inherit the same value, which keeps them consistent.

> Verify with `adb shell dumpsys window displays`: for the shown bar you want `type=statusBars ... visible=true` with `mInsetsHint=Insets{left=0, top=136, right=0, bottom=0}` (and `type=navigationBars ... bottom=63`). Then assert blue reaches `y=0`, the header content sits in the expected band (title y 127–165 px / centre 56 dp with the default 24px trim, 190–228 px / 80 dp untrimmed), and nothing renders in the punch-hole column (x 506–574) — `adb exec-out screencap -p` + pixel scan; note the Dashboard's stats band is the same brand blue as the header, so scan a column inside the toolbar text, not the page margin.

---

## Action 2 — Deprecated display-cutout mode (`SHORT_EDGES`)

**This is usually a Google false positive.** The `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES` (**and `ALWAYS`**) values are set inside **AndroidX libraries** (`androidx.appcompat` / `androidx.activity` / `androidx.core:core-splashscreen`), not app code. Play's static/bytecode scan flags the merged app even though nothing in your source uses it.

- Related Google issuetracker IDs: **462233641**, **477270486**, **503810638**.
- **Do not "fix" it by editing library code.** Verify your app source is clean and, if you want, *reduce* exposure:

```gradle
// android/app/build.gradle — pull only what you need, avoid themed appcompat if unused
implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
```

1. Confirm the cutout mode is not set in **resources / manifest** (this is exactly what the audit checks — `res/**/*.xml` + `AndroidManifest.xml`):
   - `grep -ri "windowLayoutInDisplayCutoutMode" android/app/src/main/res android/app/src/main/AndroidManifest.xml`
   - If your app *intentionally* sets it programmatically for full-bleed (see **1c**, `MainActivity.java`, API-guarded), that is fine — Play's warning is about the **merged library** resources, not your code.
2. If Play still warns after AGP/dependency updates, note it as an accepted false positive (the warning does not block publishing).

`scripts/check-play-compliance.cjs` reports `[PASS]` when app source is clean and prints the false-positive note.

---

## Action 3 — Outdated Android Gradle Plugin / R8 → AGP 9

Play recommends the **latest AGP**. AGP 9.x requires a coordinated upgrade, and Capacitor plugin modules need a patch.

### Compatibility facts (do not re-derive)

| AGP | Min Gradle | Max API | Notes |
|---|---|---|---|
| 9.0 | 9.1.0 | 36.1 | **built-in Kotlin ON by default**; new DSL mandatory |
| 9.1 | 9.3.1 | | |
| 9.2 | 9.4.1 | | |
| 9.3 | 9.5.0 | | |
| 9.4 | 9.6.0 | 37 | |

- **JDK**: AGP 9 needs **JDK 17+** (this project uses **21**).
- **SDK Build Tools**: 36.0.0.
- **Gradle 9 removed** `Project.buildDir` and space-assignment syntax (`foo bar` → `foo = bar`).

### The AGP 9 + Capacitor gotcha (the hard part)

1. **AGP 9's `built-in Kotlin`** (`android.builtInKotlin=true`, the default) compiles Kotlin sources itself.
2. The external **`org.jetbrains.kotlin.android`** (`kotlin-android`) plugin is **NOT compatible with AGP 9's new DSL** — it casts the Android extension to the removed `BaseExtension` → `ClassCastException`.
3. Capacitor plugin modules (e.g. `@capacitor-community/admob`, `@capacitor/local-notifications`) **apply `kotlin-android` themselves** in `node_modules`.
4. **Root `build.gradle`'s AGP classpath wins over subprojects** (Gradle parent-first classloader), so every plugin module is evaluated with **root AGP 9**, not its own pinned AGP 8.13.
5. AGP 9 also **rejects** `getDefaultProguardFile('proguard-android.txt')` (it forces `-dontoptimize` → use `proguard-android-optimize.txt`).

**Solution:** let AGP's built-in Kotlin compile the plugin modules and strip the incompatible DSL usage via an **idempotent postinstall patch**. See `scripts/patch-capacitor-agp9.cjs`.

### Procedure

1. **Bump the wrapper + root AGP** (`android/build.gradle`):
   ```gradle
   buildscript { dependencies { classpath 'com.android.tools.build:gradle:9.0.1' } }
   ```
   `android/gradle/wrapper/gradle-wrapper.properties`:
   ```
   distributionUrl=https\://services.gradle.org/distributions/gradle-9.1.0-all.zip
   ```
2. **Fix Gradle 9 removals** in `android/build.gradle`:
   ```gradle
   task clean(type: Delete) { delete rootProject.layout.buildDirectory.get().asFile }
   ```
   and make sure every `.gradle` file uses `=` (not space) assignment. `android.aaptOptions` → `androidResources { ignoreAssetsPattern }`.
3. **Pin a Gradle-9/AGP-9 compatible Kotlin version** so plugin modules don't pin old KGP (`2.0.21`/`2.2.20`). In `android/variables.gradle`:
   ```gradle
   ext { kotlin_version = '2.3.21' }
   ```
   and in `android/build.gradle`:
   ```gradle
   subprojects { ext.kotlin_version = rootProject.ext.kotlin_version }
   ```
4. **Add the plugin patch as postinstall.** Ensure `scripts/patch-capacitor-agp9.cjs` exists and `package.json` has:
   ```json
   "scripts": { "postinstall": "node scripts/patch-capacitor-agp9.cjs" }
   ```
   The script removes `apply plugin: 'kotlin-android'`, removes `kotlinOptions { }`, and swaps `proguard-android.txt` → `proguard-android-optimize.txt` in every `node_modules/@capacitor*/**/android/build.gradle`. It is a no-op unless AGP ≥ 9.
5. **App module** (`android/app/build.gradle`): Java 21 source/target, keep `android.aaptOptions`-free, add the activity dep if needed.
6. **Reinstall + build:** `npm install` (runs the postinstall patch), then `npm run android:debug` and `npm run android:release` (validates R8: `:app:minifyReleaseWithR8`).

> **Do NOT** set `android.builtInKotlin=false` to "fix" the cast error — it is deprecated (removed in AGP 10) and the external `kotlin-android` plugin is still incompatible with the AGP 9 new DSL. Use built-in Kotlin + the patch.

---

## Verification checklist

1. `node scripts/check-play-compliance.cjs` → no `[FAIL]`.
2. `npm run android:debug` → `BUILD SUCCESSFUL` (all plugin modules' `compileDebugKotlin` runs).
3. `npm run android:release` → `minifyReleaseWithR8` succeeds; `android/app/build/outputs/mapping/release/mapping.txt` is produced.
4. On device/emulator (targetSdk 35+): content is **not** clipped behind the status/nav bars; the AdMob banner sits above the tab bar; edge-to-edge behaves under dark/light system bars.
5. Re-run `npm install` → the postinstall patch re-applies (survives dependency reinstall).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Failed to apply plugin 'kotlin-android'. ... cannot be cast to ... BaseExtension` | external `kotlin-android` vs AGP 9 new DSL | run `postinstall` patch (strips `kotlin-android`; AGP built-in Kotlin compiles) |
| `Cannot add extension with name 'kotlin'` | built-in Kotlin + external plugin both register `kotlin` | same patch (remove `apply plugin: 'kotlin-android'`) |
| `getDefaultProguardFile('proguard-android.txt') is no longer supported` | AGP 9 removed the non-optimize default | patch swaps to `proguard-android-optimize.txt` |
| `does not specify compileSdk in build.gradle` | cascades from the failed `android { }` block | fix the `kotlin-android` apply first |
| `Project.getBuildDir() ... removed` | Gradle 9 | use `rootProject.layout.buildDirectory` |
| Plugin modules use old KGP (`2.0.21`) → no Kotlin compile | KGP too old for Gradle 9 | pin `kotlin_version = '2.3.21'` (steps 3) |
| Content double-padded / over-padded | a listener that **pads the decor view** *and* SystemBars both padding | remove the padding listener on Capacitor 8 (SystemBars owns padding); a read-only inset **publisher** like Action 1c is fine — it returns the insets untouched |
| Native ActionBar titled with the **app name** floats over the WebView (light, oversized) | `EdgeToEdge.enable(this)` called **before** `super.onCreate` → decor built with the launch theme | call it **after** `super.onCreate` (Action 1b) |
| Blank strip the height of the status bar / cutout at the top after hiding the status bar | `insetsHandling: 'css'` pads the decor view by the inset | switch to `insetsHandling: 'disable'` + set the cutout mode (Action 1c) |
| Toolbar title sits **under the status-bar clock** with the bar shown | `'disable'` injects nothing and `env(safe-area-inset-top)` is **0** on WebView < 140 (Chromium 40699457); the header's first toolbar therefore gets `padding-top: 0` | publish the inset from native (Action 1c) — read `systemBars() \| displayCutout()` on the decor and set `--safe-area-inset-top`; **never** zero `--ion-safe-area-top` in `variables.css`, and don't switch to `'css'` (it pads the decor view, killing full-bleed at the bottom) |
| Patch lost after `npm install` | not wired as `postinstall` | add the `postinstall` script |

---

## Files

| File | Purpose |
|---|---|
| `scripts/check-play-compliance.cjs` | Cross-project, read-only audit of the 3 actions (`npm run compliance:check`) |
| `scripts/patch-capacitor-agp9.cjs` | Idempotent postinstall patch for AGP 9 plugin compatibility |
| `android/build.gradle` | Root AGP version, `subprojects { ext.kotlin_version }`, Gradle-9 `clean` |
| `android/gradle/wrapper/gradle-wrapper.properties` | Gradle wrapper version |
| `android/variables.gradle` | compileSdk/targetSdk/androidx versions + `kotlin_version` |
| `android/app/build.gradle` | Java 21, `androidResources`, activity dep |
| `android/app/src/main/java/**/MainActivity.java` | `EdgeToEdge.enable` (after `super.onCreate`), display-cutout mode, publishes `--safe-area-inset-top` from the real inset |
| `capacitor.config.ts` | `plugins.SystemBars` insets config |
| `.opencode/agent/play-store-compliance.md` | OpenCode agent entry point |
| `.clinerules/workflows/play-store-compliance.md` | Cline workflow entry point |
