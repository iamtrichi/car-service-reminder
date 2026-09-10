---
name: admob-banner-placement
description: Native AdMob banner placement for this project - floating above tabs via plugin margin + Android 15+ inset patch, scroll-aware hide/show, or experimental true-inline tracking. Read the canonical skill file before doing anything.
compatibility: opencode
---

# AdMob Banner Placement (OpenCode entry point)

The canonical instructions for this skill live at:

```
skills/admob-banner-placement/SKILL.md
```

(relative to the project root)

**Read that file FIRST and follow it exactly.** It contains the architecture facts, the Mode A / B1 / B2 decision tree, step-by-step procedures, the verification checklist, and the troubleshooting table.

Supporting code lives in `src/services/bannerAdService.ts` and `scripts/patch-admob-banner-margin.cjs` — never hand-edit `node_modules`; changes go through the idempotent postinstall patch script.
