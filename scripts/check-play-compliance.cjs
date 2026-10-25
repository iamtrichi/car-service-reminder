#!/usr/bin/env node
/*
 * check-play-compliance.cjs
 *
 * Audits a Capacitor/Ionic Android project against the Google Play Console
 * "recommended actions" that block or warn on new uploads:
 *
 *   1. Edge-to-edge enforcement (targetSdk 35+ must handle window insets)
 *   2. Deprecated `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`
 *   3. Outdated Android Gradle Plugin / R8 (Play recommends the latest AGP)
 *
 * It is read-only and cross-project: point it at any Capacitor app root
 * (the folder containing `android/`). Exits non-zero when a FAIL is found.
 *
 * Usage:
 *   node scripts/check-play-compliance.cjs [projectRoot]
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || process.cwd());
const androidDir = path.join(root, 'android');

const R = { pass: 0, warn: 0, fail: 0 };
function pass(m) { R.pass++; console.log(`[PASS] ${m}`); }
function warn(m) { R.warn++; console.log(`[WARN] ${m}`); }
function fail(m) { R.fail++; console.log(`[FAIL] ${m}`); }
function info(m) { console.log(`[INFO] ${m}`); }

function readIfExists(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

/** Recursively collect files under dir matching a predicate. */
function walk(dir, predicate, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'build' || e.name === '.gradle' || e.name === 'node_modules') continue;
      walk(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(androidDir)) {
  info('No android/ directory found - not a Capacitor Android project. Nothing to audit.');
  process.exit(0);
}

console.log(`Play Store compliance audit — ${root}\n`);

const variablesGradle = readIfExists(path.join(androidDir, 'variables.gradle')) || '';
const rootBuildGradle = readIfExists(path.join(androidDir, 'build.gradle')) || '';
const appBuildGradle = readIfExists(path.join(androidDir, 'app', 'build.gradle')) || '';
const wrapperProps = readIfExists(path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.properties')) || '';
const manifest = readIfExists(path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml')) || '';
const packageJson = readIfExists(path.join(root, 'package.json')) || '';
const capacitorConfig =
  readIfExists(path.join(root, 'capacitor.config.ts')) ||
  readIfExists(path.join(root, 'capacitor.config.json')) || '';

// --- SDK levels ------------------------------------------------------------

function numVar(name, text) {
  const m = text.match(new RegExp(`${name}\\s*=?\\s*([0-9]+)`));
  return m ? parseInt(m[1], 10) : null;
}
const targetSdk = numVar('targetSdkVersion', variablesGradle) ?? numVar('targetSdk', appBuildGradle);
const compileSdk = numVar('compileSdkVersion', variablesGradle) ?? numVar('compileSdk', appBuildGradle);

if (compileSdk === null) {
  warn('Could not determine compileSdk.');
} else if (compileSdk >= 35) {
  pass(`compileSdk = ${compileSdk} (>= 35).`);
} else {
  fail(`compileSdk = ${compileSdk} (< 35) - update to 35/36.`);
}

if (targetSdk === null) {
  warn('Could not determine targetSdk.');
} else if (targetSdk >= 35) {
  pass(`targetSdk = ${targetSdk} (>= 35).`);
} else {
  warn(`targetSdk = ${targetSdk} (< 35) - edge-to-edge is enforced from API 35.`);
}

// --- 1. Edge-to-edge -------------------------------------------------------

const mainActivities = walk(
  path.join(androidDir, 'app', 'src', 'main'),
  (f) => /MainActivity\.(java|kt)$/.test(f)
);
const mainActivity = mainActivities.map(readIfExists).join('\n');

const hasEdgeToEdgeCall = /EdgeToEdge\.enable\s*\(/.test(mainActivity);
const hasSystemBarsConfig = /SystemBars|insetsHandling|viewport-fit|viewportFit/.test(capacitorConfig);

if (targetSdk !== null && targetSdk >= 35) {
  if (hasEdgeToEdgeCall) {
    pass('MainActivity calls EdgeToEdge.enable(this).');
  } else if (hasSystemBarsConfig) {
    pass('Capacitor SystemBars plugin configured for insets handling (Capacitor 8).');
  } else {
    fail('targetSdk >= 35 but no edge-to-edge handling found (EdgeToEdge.enable / SystemBars config).');
  }
  if (hasSystemBarsConfig) {
    pass('capacitor.config declares SystemBars/insets handling.');
  } else if (hasEdgeToEdgeCall) {
    warn('EdgeToEdge.enable present but no SystemBars insets config - verify the WebView gets safe-area insets.');
  }
} else {
  info('targetSdk < 35 - edge-to-edge not yet enforced (still recommended).');
}

// --- 2. Deprecated display-cutout mode -------------------------------------

const resFiles = walk(path.join(androidDir, 'app', 'src', 'main', 'res'), (f) => f.endsWith('.xml'));
const appCutout = resFiles.filter((f) =>
  /windowLayoutInDisplayCutoutMode|LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES/i.test(readIfExists(f) || '')
);
const manifestCutout = /windowLayoutInDisplayCutoutMode|displayCutout/i.test(manifest);

if (appCutout.length === 0 && !manifestCutout) {
  pass('App source does not set a deprecated display-cutout mode.');
} else {
  fail(`App source references display-cutout mode in: ${[...appCutout, ...(manifestCutout ? ['AndroidManifest.xml'] : [])].map((f) => path.relative(root, f)).join(', ')}`);
}
info('Note: a Play warning for LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES is usually an AndroidX false positive (appcompat/activity/splash) - not app code.');

// --- 3. AGP / Gradle / R8 --------------------------------------------------

const agpMatch = rootBuildGradle.match(/com\.android\.tools\.build:gradle:([0-9]+(?:\.[0-9]+)*)/);
const gradleMatch = wrapperProps.match(/gradle-([0-9]+(?:\.[0-9]+)*)-(all|bin)\.zip/);

const agp = agpMatch ? agpMatch[1] : null;
const gradle = gradleMatch ? gradleMatch[1] : null;

if (!agp) {
  warn('Could not determine Android Gradle Plugin version.');
} else {
  const major = parseInt(agp.split('.')[0], 10);
  if (major >= 9) {
    pass(`Android Gradle Plugin ${agp} (>= 9).`);
  } else if (compareVersions(agp, '8.13.0') >= 0) {
    warn(`Android Gradle Plugin ${agp} - Play recommends the latest (9.x).`);
  } else {
    fail(`Android Gradle Plugin ${agp} is outdated - update to 9.x.`);
  }
}

if (gradle) {
  info(`Gradle wrapper ${gradle}.`);
} else {
  warn('Could not determine Gradle wrapper version.');
}

// AGP 9 requires built-in Kotlin; the plugin modules need the postinstall patch.
if (agp && parseInt(agp.split('.')[0], 10) >= 9) {
  const hasPostinstall = /"postinstall"\s*:\s*"[^"]*patch[^"]*"/.test(packageJson);
  const hasPatchScript = fs.existsSync(path.join(root, 'scripts', 'patch-capacitor-agp9.cjs'));
  if (hasPatchScript && hasPostinstall) {
    pass('AGP 9 plugin patch script present and wired as postinstall.');
  } else {
    warn('AGP 9 detected but scripts/patch-capacitor-agp9.cjs is missing or not wired as postinstall - node_modules patch may be lost on npm install.');
  }
}

// --- Summary ---------------------------------------------------------------

console.log(`\nSummary: ${R.pass} passed, ${R.warn} warnings, ${R.fail} failed.`);
process.exit(R.fail > 0 ? 1 : 0);
