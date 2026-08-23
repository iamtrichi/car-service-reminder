---
name: windows-android-emulator-setup
description: Complete Windows environment setup for building and running the Car Service Reminder app on the Android emulator - JDK 17/21, Android SDK, AEHD acceleration, csr_avd emulator, and the full build/run pipeline. Use when the emulator, SDK, or Gradle build is missing or broken.
compatibility: opencode, cline
---

# Windows Android Emulator Environment Setup

## When to use this skill

- Setting up a fresh Windows machine to build/run this app on the Android emulator
- Fixing a broken Gradle build, missing SDK component, or emulator that won't start
- Onboarding an AI agent (Cline / OpenCode) that needs to repair or verify the environment

**Golden rule: audit first, fix only what's missing.** Always start with `scripts\android-env\check-env.cmd` from the project root.

## Environment layout (reference machine)

| Component | Path | Notes |
|---|---|---|
| Android SDK root | `G:\Android` | Override with `ANDROID_SDK_HOME` env var; never use paths with spaces |
| JDK 17 | `G:\Android\jdk-17` | **Required by `sdkmanager`/`avdmanager` only** |
| JDK 21 | `G:\Android\jdk-21` | **Required by Gradle builds only** |
| cmdline-tools | `G:\Android\cmdline-tools\latest\bin\sdkmanager.bat` | Layout must be `cmdline-tools\latest\bin\...` |
| platform-tools (adb) | `G:\Android\platform-tools\adb.exe` | |
| Platform | `G:\Android\platforms\android-35` | API 35 |
| Build-tools | `G:\Android\build-tools\<version>` | e.g. `35.0.0` |
| Emulator | `G:\Android\emulator\emulator.exe` | |
| AEHD driver package | `G:\Android\extras\google\Android_Emulator_Hypervisor_Driver` | Hardware acceleration |
| System image | `G:\Android\system-images\android-35\google_apis\x86_64` | google_apis (NOT playstore: no root, but adb works) |
| AVD | `%USERPROFILE%\.android\avd\csr_avd.*` | Pixel 7, API 35, x86_64 |
| Project wiring | `android/local.properties` | Must contain `sdk.dir=G\:\\Android` (escaped colon + backslashes) |

## Golden rules (memorize these)

1. **JDK split**: `sdkmanager`/`avdmanager` MUST run with `JAVA_HOME=<sdk>\jdk-17`. Gradle (`gradlew`) MUST run with `JAVA_HOME=<sdk>\jdk-21`. Mixing these up is the #1 failure cause (sdkmanager crashes with newer JDKs).
2. **Everything lives under the SDK root** - nothing installed into Program Files, no machine-wide env vars required for builds (scripts set them per-session).
3. **Idempotent scripts**: every installer script skips work if its target already exists. Safe to re-run any time.
4. **AEHD needs admin rights** to install its driver. If Hyper-V is enabled, the emulator silently uses WHPX instead - that also works; don't fight it.
5. Run all scripts **from the project root** (they self-locate via `%~dp0`, so double-clicking also works).

## Step-by-step setup

### Step 0 - Audit current state

```bat
scripts\android-env\check-env.cmd
```

Prints `[PASS]`/`[FAIL]` per component. Exit code 0 = ready, 1 = something missing. Fix only the FAILs using the matching script below.

### Step 1 - Node.js

Node v24.x (see `.nvmrc`). Verify with `node --version`. Install from nodejs.org if missing (only manual step without a script).

### Step 2 - JDKs (Temurin via Adoptium API)

```bat
scripts\android-env\install-jdk.cmd 17
scripts\android-env\install-jdk.cmd 21
```

Downloads the latest Temurin GA x64 JDK zip, extracts to `<sdk>\jdk-<ver>`, cleans up. Skips if already present.

### Step 3 - cmdline-tools bootstrap + SDK packages + licenses

```bat
scripts\android-env\install-sdk.cmd
```

Does three things in order:
1. If `cmdline-tools\latest\bin\sdkmanager.bat` is missing: downloads `commandlinetools-win-*-latest.zip` from `dl.google.com/android/repository/` and extracts to `cmdline-tools\latest`
2. Accepts licenses (pipes `y` answers to `--licenses`; falls back to writing known license hashes into `<sdk>\licenses\`)
3. Installs packages:
   ```
   platform-tools
   platforms;android-35
   build-tools;35.0.0
   emulator
   system-images;android-35;google_apis;x86_64
   ```

### Step 4 - AEHD hardware acceleration

```bat
scripts\android-env\install-aehd.cmd
```

Installs `extras;google;Android_Emulator_Hypervisor_Driver` via sdkmanager, then runs `silent_install.bat` (needs an **elevated** shell). Verify with:

```bat
sc query aehd          REM should show RUNNING
"%ANDROID_SDK_HOME%\emulator\emulator.exe" -accel-check
```

If Hyper-V/WHPX is active instead, `-accel-check` reports WHPX - acceptable, skip AEHD.

### Step 5 - AVD creation

```bat
scripts\android-env\create-avd.cmd
```

Equivalent to:

```bat
echo no | avdmanager create avd -n csr_avd -k "system-images;android-35;google_apis;x86_64" -d pixel_7
```

(`echo no |` skips the "custom hardware profile?" prompt.)

### Step 6 - Project wiring

`android/local.properties` (gitignored, machine-specific):

```properties
sdk.dir=G\:\\Android
```

Note the escaping: `\:` after drive letter, `\\` between segments. `build-and-run.cmd` regenerates this automatically if missing.

### Step 7 - Build & run pipeline

```bat
scripts\android-env\run-emulator.cmd      REM boots csr_avd, waits for BOOT_COMPLETED
scripts\android-env\build-and-run.cmd     REM npm build -> cap sync -> APK -> adb install -> launch
```

Manual equivalent of `build-and-run.cmd` (run from repo root):

```bat
set JAVA_HOME=G:\Android\jdk-21
set ANDROID_HOME=G:\Android
set ANDROID_SDK_ROOT=G:\Android
npm run build
npx cap sync android
cd android && gradlew.bat assembleDebug --no-daemon && cd ..
platform-tools adb install -r android\app\build\outputs\apk\debug\app-debug.apk
adb shell am start -n com.carservice.reminder/.MainActivity
```

App ID: `com.carservice.reminder`.

Cross-platform npm equivalents (work on any OS, including macOS):

```bash
npm run android:debug     # assembleDebug  -> apk/debug/app-debug.apk
npm run android:aab       # bundleRelease  -> bundle/release/app-release.aab
npm run android:release   # assembleRelease -> apk/release/app-release.apk
```

Each wraps `scripts/android-build.cjs`: web build + cap sync + correct Gradle launcher (`gradlew.bat` + JDK 21 on Windows, `./gradlew` elsewhere). Pass `-- --no-sync` to skip the web build/sync step.

### Step 8 - Signed release AAB (Play Store)

```bat
scripts\android-env\build-aab.cmd
```

Output: `android\app\build\outputs\bundle\release\app-release.aab`, signed with `release.keystore` (config in `android/key.properties`, wired in `signingConfigs.release` in `android/app/build.gradle`).

The old Mac command translated to Windows:

| Mac (old) | Windows (new) |
|---|---|
| `cd android && ./gradlew bundleRelease` | `set JAVA_HOME=G:\Android\jdk-21` then `cd android && gradlew.bat bundleRelease` |

Why the Mac command broke on Windows: no `JAVA_HOME` is set and the system `java` is Oracle **Java 8**, so Gradle launched on JVM 1.8 while AGP requires JDK 17+. Also, `./gradlew` is the Unix launcher — Windows needs `gradlew.bat`. And bundling without a prior `npm run build` + `npx cap sync android` packages stale web assets.

Before each Play Store upload, bump `versionCode` / `versionName` in `android/app/build.gradle` (currently hardcoded there).

## Script reference (scripts/android-env/)

| Script | Purpose | Idempotent |
|---|---|---|
| `check-env.cmd` | PASS/FAIL audit of every component; exit code reflects readiness | n/a (read-only) |
| `install-jdk.cmd [17\|21]` | Temurin JDK install into SDK root | yes |
| `install-sdk.cmd` | cmdline-tools bootstrap + licenses + all packages | yes |
| `install-aehd.cmd` | AEHD package + silent driver install | yes |
| `create-avd.cmd` | Creates `csr_avd` if missing | yes |
| `run-emulator.cmd` | accel-check, boot `csr_avd`, wait for boot completion | n/a |
| `build-and-run.cmd` | Full web+native build, install, launch | partially |
| `build-aab.cmd` | Signed release AAB for Play Store (`bundleRelease`) | partially |

All scripts honor the `ANDROID_SDK_HOME` override (default `G:\Android`).

## Verification checklist

Run each command; expected result in comment:

```bat
node --version                                        REM v24.x
"G:\Android\jdk-17\bin\java.exe" -version             REM 17.x
"G:\Android\jdk-21\bin\java.exe" -version             REM 21.x
"G:\Android\cmdline-tools\latest\bin\sdkmanager.bat" --list_installed   REM lists packages below
"G:\Android\platform-tools\adb.exe" version           REM Android Debug Bridge version x
"G:\Android\emulator\emulator.exe" -accel-check       REM AEHD or WHPX: is enabled
"G:\Android\emulator\emulator.exe" -list-avds         REM contains csr_avd
type android\local.properties                         REM sdk.dir=G\:\\Android
```

End-to-end proof: emulator window shows home screen, then app icon "Car Service Reminder" launches via `build-and-run.cmd`; confirm with `adb shell dumpsys activity activities | findstr carservice`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| sdkmanager prints `UnsupportedClassVersionError` or crashes instantly | Wrong JAVA_HOME (JDK 21 pointed at sdkmanager) | Set `JAVA_HOME=<sdk>\jdk-17` before calling sdkmanager/avdmanager |
| Emulator error: `x86 emulation currently requires hardware acceleration` / `-accel-check` says disabled | VT-x disabled in BIOS, or neither AEHD nor WHPX available | Enable virtualization in BIOS/UEFI; then run `install-aehd.cmd` elevated |
| AEHD installer fails / service won't start | Hyper-V/Core Isolation active | Either accept WHPX acceleration (do nothing), or disable Hyper-V: `bcdedit /set hypervisorlaunchtype off` (admin, reboot). Memory Integrity (Core Isolation) must also be off for AEHD |
| Gradle: `SDK location not found` | Missing/badly escaped `android/local.properties` | Recreate with `sdk.dir=G\:\\Android` (escaped!) or re-run `build-and-run.cmd` which writes it |
| Gradle: `Could not determine java version` / daemon weirdness | Wrong JAVA_HOME for gradlew | Use `JAVA_HOME=<sdk>\jdk-21`; add `--no-daemon` when scripting |
| `avdmanager` errors on create | System image not installed | Re-run `install-sdk.cmd` |
| `adb devices` empty while emulator runs | Stale adb server | `adb kill-server && adb start-server` |
| Download failures behind proxy/firewall | curl blocked | Pre-download zips manually into `%TEMP%` and adjust scripts, or set `HTTPS_PROXY` |
| Long-path npm errors | Windows MAX_PATH | Enable long paths (`git config --global core.longpaths true` + registry LongPathsEnabled=1); repo path has no spaces so usually fine |

## Agent integration map

| Tool | Entry point |
|---|---|
| OpenCode agent | `.opencode/agent/android-env-setup.md` |
| OpenCode skill discovery | `.opencode/skill/windows-android-emulator-setup/SKILL.md` (pointer to this file) |
| Cline workflow | `.clinerules/workflows/setup-android-env.md` (invoke with `/setup-android-env`) |
| Both tools (always loaded) | `agents.md` section "Windows Android Emulator Environment" |