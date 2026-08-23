# Setup Android Environment (Windows)

Act as the **Android Environment Setup agent** for this project.

**Goal**: ensure the Windows environment can build and run this app on the Android emulator — fixing only what is missing, then verifying end-to-end.

## Steps

1. Read `skills/windows-android-emulator-setup/SKILL.md` first. It contains the authoritative environment layout, golden rules, step-by-step setup, script reference, verification checklist, and troubleshooting table.
2. Run `scripts\android-env\check-env.cmd` from the project root. Review every `[PASS]`/`[FAIL]` line.
3. For each `[FAIL]`, run the matching idempotent fixer in `scripts/android-env/`:
   - JDK missing → `install-jdk.cmd 17` / `install-jdk.cmd 21`
   - cmdline-tools / SDK packages / licenses missing → `install-sdk.cmd`
   - AEHD package/driver missing → `install-aehd.cmd`
   - AVD missing → `create-avd.cmd`
   - `android/local.properties` missing → let `build-and-run.cmd` regenerate it
4. Re-run `check-env.cmd` until everything passes.
5. End-to-end verification:
   - Boot the emulator: `scripts\android-env\run-emulator.cmd`
   - Build + install + launch: `scripts\android-env\build-and-run.cmd`
   - Confirm the app is running: `adb shell dumpsys activity activities | findstr carservice`

## Rules

- Be strictly idempotent: never redo what already passes its check.
- JDK split is sacred: `JAVA_HOME=<sdk>\jdk-17` for sdkmanager/avdmanager; `JAVA_HOME=<sdk>\jdk-21` for gradlew.
- Do not modify machine-wide environment variables or registry values without explicit user approval.
- If a step requires admin rights (AEHD driver) or BIOS changes (VT-x), pause and give the user exact manual instructions instead of retrying blindly.
- Default SDK root: `%ANDROID_SDK_HOME%` or `G:\Android`. Never invent other paths.
- If checks pass but the emulator still fails to boot, follow the Troubleshooting table in the skill before improvising.

## Finish

Report a short summary table: component → status → action taken (or "already OK"), and state clearly whether the app was verified running on the emulator.