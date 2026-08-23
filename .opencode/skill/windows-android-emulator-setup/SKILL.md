---
name: windows-android-emulator-setup
description: Windows Android emulator environment setup for this project - JDK 17/21, Android SDK, AEHD, csr_avd emulator, build/run pipeline. Read the canonical skill file before doing anything.
compatibility: opencode
---

# Windows Android Emulator Setup (OpenCode entry point)

The canonical instructions for this skill live at:

```
skills/windows-android-emulator-setup/SKILL.md
```

(relative to the project root `g:\src\car-service-reminder`)

**Read that file FIRST and follow it exactly.** It contains the environment layout, golden rules, step-by-step setup, script reference, verification checklist, and troubleshooting table.

Supporting automation scripts are in `scripts/android-env/` — always start with `scripts\android-env\check-env.cmd` and fix only what fails.