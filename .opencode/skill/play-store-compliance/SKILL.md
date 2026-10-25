---
name: play-store-compliance
description: Google Play Console recommended actions for this Capacitor/Ionic Android app - edge-to-edge (targetSdk 35+), the deprecated LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES warning, and the AGP 9 / R8 upgrade. Read the canonical skill file before doing anything.
compatibility: opencode
---

# Play Store Compliance (OpenCode entry point)

The canonical instructions for this skill live at:

```
skills/play-store-compliance/SKILL.md
```

(relative to the project root)

**Read that file FIRST and follow it exactly.** It contains the root-cause analysis, the AGP 9 + Capacitor compatibility facts, the step-by-step procedure, the verification checklist, and the troubleshooting table.

Audit first: `node scripts/check-play-compliance.cjs` (or `npm run compliance:check`) — fix only the `[FAIL]` lines. `scripts/patch-capacitor-agp9.cjs` is wired as `postinstall` and must stay idempotent.
