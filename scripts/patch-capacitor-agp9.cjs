#!/usr/bin/env node
/*
 * patch-capacitor-agp9.cjs
 *
 * Makes Capacitor plugin modules in node_modules compatible with Android
 * Gradle Plugin 9 while the app's own `android/` project is on AGP 9.
 *
 * Why this is needed
 * ------------------
 * Capacitor plugin modules (e.g. @capacitor-community/admob) ship a
 * `build.gradle` that:
 *   1. applies the external `kotlin-android` plugin, which AGP 9's new DSL
 *      no longer supports (its extension no longer extends `BaseExtension`),
 *   2. configures `kotlinOptions { jvmTarget = ... }`, and
 *   3. references the removed `getDefaultProguardFile('proguard-android.txt')`.
 *
 * AGP 9 ships **built-in Kotlin** (default on), so the fix is to let AGP
 * compile the Kotlin sources itself and drop the external plugin/DSL usage.
 *
 * This script is idempotent: running it twice is a no-op. It is wired as the
 * `postinstall` hook so the patch survives `npm install`.
 *
 * It is a no-op when the project is not on AGP 9 (so it is safe to keep the
 * hook even if the project later downgrades / uses AGP 8).
 */

const fs = require('fs');
const path = require('path');

const MARK = '[capacitor-agp9-patch]';
const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');

function log(msg) {
  console.log(`[patch-capacitor-agp9] ${msg}`);
}

/** Read the AGP version from android/build.gradle, e.g. "9.0.1" or null. */
function getAgpVersion() {
  const buildGradle = path.join(androidDir, 'build.gradle');
  if (!fs.existsSync(buildGradle)) return null;
  const text = fs.readFileSync(buildGradle, 'utf8');
  const m = text.match(/com\.android\.tools\.build:gradle:([0-9]+(?:\.[0-9]+)*)/);
  return m ? m[1] : null;
}

/** Collect every Capacitor plugin module's android/build.gradle. */
function findPluginBuildGradles() {
  const results = [];
  const scopes = [
    path.join(root, 'node_modules', '@capacitor'),
    path.join(root, 'node_modules', '@capacitor-community'),
  ];
  for (const scope of scopes) {
    if (!fs.existsSync(scope)) continue;
    for (const entry of fs.readdirSync(scope)) {
      const bg = path.join(scope, entry, 'android', 'build.gradle');
      if (fs.existsSync(bg)) results.push(bg);
    }
  }
  return results;
}

/** Apply the AGP 9 compatibility transforms to a single build.gradle. */
function patchFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  let text = original;

  // 1. Remove the external kotlin-android plugin (AGP 9 uses built-in Kotlin).
  // Only matches an *active* (non-commented) line so re-runs are safe.
  text = text.replace(
    /^[ \t]*apply plugin:\s*['"]kotlin-android['"][ \t]*$/m,
    `// ${MARK} 'kotlin-android' removed - AGP 9 compiles Kotlin via built-in Kotlin`
  );

  // 2. Remove the kotlinOptions { ... } block (KGP-only DSL).
  text = text.replace(
    /^[ \t]*kotlinOptions\s*\{[\s\S]*?\n[ \t]*\}[ \t]*$/m,
    `// ${MARK} kotlinOptions removed - built-in Kotlin uses compileOptions jvmTarget`
  );

  // 3. proguard-android.txt is rejected by AGP 9 (it forces -dontoptimize).
  text = text.replace(/getDefaultProguardFile\((['"])proguard-android\.txt\1\)/g,
    "getDefaultProguardFile('proguard-android-optimize.txt')");

  if (text === original) return false;
  fs.writeFileSync(file, text);
  return true;
}

function main() {
  const agp = getAgpVersion();
  if (!agp) {
    log('android/build.gradle not found - skipping.');
    return;
  }
  const major = parseInt(agp.split('.')[0], 10);
  if (major < 9) {
    log(`AGP ${agp} detected (< 9) - patch not required.`);
    return;
  }

  const files = findPluginBuildGradles();
  if (files.length === 0) {
    log('No Capacitor plugin modules found - nothing to do.');
    return;
  }

  let changed = 0;
  for (const file of files) {
    try {
      if (patchFile(file)) {
        changed += 1;
        log(`patched ${path.relative(root, file)}`);
      }
    } catch (err) {
      log(`WARNING: could not patch ${path.relative(root, file)}: ${err.message}`);
    }
  }
  log(changed === 0 ? 'already patched - no changes.' : `done (${changed} file(s) updated).`);
}

main();
