#!/usr/bin/env node
/**
 * android-build.cjs - Cross-platform Gradle task runner for the Android project.
 *
 * Usage:
 *   node scripts/android-build.cjs <gradleTask...> [--no-sync]
 *
 * Examples:
 *   node scripts/android-build.cjs assembleDebug
 *   node scripts/android-build.cjs bundleRelease
 *   node scripts/android-build.cjs assembleRelease
 *
 * npm shortcuts (see package.json):
 *   npm run android:debug     -> assembleDebug
 *   npm run android:aab       -> bundleRelease
 *   npm run android:release   -> assembleRelease
 *   (pass -- --no-sync to skip the web build + cap sync step)
 *
 * Behavior:
 *   - Default: web build + cap sync first (fresh assets), then Gradle task(s).
 *   - Windows: JAVA_HOME is set to %ANDROID_SDK_HOME%\jdk-21 (default G:\Android);
 *              AGP rejects the system Java 8 otherwise.
 *   - macOS/Linux: keeps existing JAVA_HOME if set; falls back to
 *     /usr/libexec/java_home on macOS; otherwise relies on PATH java.
 *   - Exit code mirrors Gradle's exit code.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const IS_WINDOWS = process.platform === 'win32';
const REPO_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(REPO_ROOT, 'android');

// ---- Parse args ------------------------------------------------------------
const args = process.argv.slice(2);
const noSync = args.includes('--no-sync');
const tasks = args.filter(function (a) {
  return !a.startsWith('--');
});

if (tasks.length === 0) {
  console.error('Usage: node scripts/android-build.cjs <gradleTask...> [--no-sync]');
  console.error('Example: node scripts/android-build.cjs assembleDebug');
  process.exit(2);
}

// ---- Resolve SDK root + JAVA_HOME ------------------------------------------
function resolveSdkRoot() {
  if (process.env.ANDROID_SDK_HOME) return process.env.ANDROID_SDK_HOME;
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (IS_WINDOWS) return 'G:\\Android'; // reference layout on this machine
  const macSdk = path.join(process.env.HOME || '', 'Library', 'Android', 'sdk');
  if (fs.existsSync(macSdk)) return macSdk;
  return null;
}

const sdkRoot = resolveSdkRoot();
const env = Object.assign({}, process.env);

if (IS_WINDOWS) {
  if (!sdkRoot) {
    console.error('[ERROR] Could not resolve Android SDK root. Set ANDROID_SDK_HOME.');
    process.exit(1);
  }
  const jdk21 = path.join(sdkRoot, 'jdk-21');
  if (!fs.existsSync(path.join(jdk21, 'bin', 'java.exe'))) {
    console.error('[ERROR] JDK 21 not found at ' + jdk21);
    console.error('        Run first: scripts\\android-env\\install-jdk.cmd 21');
    process.exit(1);
  }
  env.JAVA_HOME = jdk21;
  env.ANDROID_HOME = sdkRoot;
  env.ANDROID_SDK_ROOT = sdkRoot;
} else {
  // macOS/Linux: keep existing JAVA_HOME; ask macOS helper as a fallback
  if (!env.JAVA_HOME && fs.existsSync('/usr/libexec/java_home')) {
    const res = spawnSync('/usr/libexec/java_home', ['-v', '17+'], { encoding: 'utf8' });
    if (res.status === 0 && res.stdout && res.stdout.trim()) {
      env.JAVA_HOME = res.stdout.trim();
    }
  }
  if (sdkRoot) {
    env.ANDROID_HOME = sdkRoot;
    env.ANDROID_SDK_ROOT = sdkRoot;
  }
}

// ---- Helper -----------------------------------------------------------------
function run(cmd, cmdArgs, cwd) {
  console.log('');
  console.log('> ' + cmd + ' ' + cmdArgs.join(' '));
  const res = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    cwd: cwd || REPO_ROOT,
    env: env,
    shell: IS_WINDOWS, // npm.cmd / npx.cmd / gradlew.bat need shell resolution
  });
  if (res.error) {
    console.error('[ERROR] Failed to run "' + cmd + '": ' + res.error.message);
    process.exit(1);
  }
  return res.status === null || res.status === undefined ? 1 : res.status;
}

// ---- 1. Web build + Capacitor sync (unless --no-sync) -----------------------
if (!noSync) {
  let status = run('npm', ['run', 'build']);
  if (status !== 0) {
    console.error('[ERROR] Web build failed.');
    process.exit(status);
  }
  status = run('npx', ['cap', 'sync', 'android']);
  if (status !== 0) {
    console.error('[ERROR] cap sync failed.');
    process.exit(status);
  }
}

// ---- 2. Ensure android/local.properties -------------------------------------
const localProps = path.join(ANDROID_DIR, 'local.properties');
if (!fs.existsSync(localProps) && sdkRoot) {
  // Java properties escaping: G:\Android -> G\:\\Android
  const escaped = sdkRoot.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  fs.writeFileSync(localProps, 'sdk.dir=' + escaped + '\n');
  console.log('Wrote ' + localProps + ' -> sdk.dir=' + escaped);
}

// ---- 3. Gradle ----------------------------------------------------------------
const gradlew = IS_WINDOWS ? 'gradlew.bat' : './gradlew';
console.log('');
console.log('Building: gradlew ' + tasks.join(' '));
const status = run(gradlew, tasks.concat(['--no-daemon']), ANDROID_DIR);
if (status !== 0) {
  console.error('[ERROR] Gradle exited with code ' + status);
  process.exit(status);
}

console.log('');
console.log('[DONE] Gradle build finished successfully.');
process.exit(0);