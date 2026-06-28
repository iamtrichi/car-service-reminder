# Hyundai Models Merge Report

**Date:** 2026-06-28  
**Script:** `scripts/merge-hyundai-models.cjs`  
**Input:** `public/config/makes/hyundai.json` (454 models)  
**Output:** `public/config/makes/hyundai.json` (285 models)  
**Models removed:** 169 (merged into consolidated entries)  

---

## What Was Done

Models that were split by engine variant in their name (e.g., `"Elantra III Hatchback 1.6"`, `"Elantra III Hatchback 1.8"`, `"Elantra III Hatchback 2.0"`) were merged into a single consolidated model (e.g., `"Elantra III Hatchback"`).

### Merge Rules

1. **Base name extraction**: Engine/variant suffixes (displacement, fuel type, drivetrain codes) are stripped from model names using regex patterns to determine the "base name"
2. **Year range overlap**: Only entries with overlapping year ranges are merged (to prevent mixing different car generations)
3. **Years merged**: min→max range across all combined entries
4. **Engines deduplicated** if they share:
   - Same `engineCode` (when non-null), **OR**
   - Similar normalized `engineName` + same `isTurbo` + HP difference < 7
5. **Name collisions**: Handled by appending year-range suffix (e.g., `"Elantra III (2011-2016)"`)

---

## Merged Groups Summary

| Base Name | Variants Merged | Merged Years | Engines (before → after) |
|---|---|---|---|
| Accent Hatchback | 3 | 1994-2000 | 5 → 4 |
| Accent II | 5 | 1999-2006 | 10 → 5 |
| Accent Hatchback II | 3 | 2000-2005 | 4 → 3 |
| Accent III | 2 | 2006-2010 | 3 → 2 |
| Accent Hatchback III | 3 | 2006-2010 | 5 → 3 |
| Accent IV | 2 | 2010-2018 | 3 → 2 |
| Accent IV Hatchback | 2 | 2010-2018 | 4 → 2 |
| Accent V | 3 | 2017-2026 | 6 → 3 |
| Accent V Hatchback | 2 | 2018-2026 | 4 → 2 |
| Alcazar | 3 | 2021-2026 | 8 → 2 |
| Atos | 2 | 1997-2008 | 6 → 2 |
| Atos Prime | 2 | 1999-2008 | 5 → 2 |
| Aura | 2 | 2020-2026 | 5 → 3 |
| Avante | 2 | 1999-2003 | 2 → 2 |
| Bayon | 3 | 2021-2026 | 12 → 6 |
| Elantra II | 5 | 1995-2000 | 7 → 4 |
| Elantra II Wagon | 5 | 1996-2000 | 6 → 4 |
| Elantra III | 5 | 2000-2006 | 8 → 4 |
| Elantra III Hatchback | 4 | 2000-2006 | 6 → 4 |
| Elantra IV | 3 | 2006-2011 | 5 → 3 |
| Elantra V | 2 | 2010-2026 | 5 → 3 |
| Elantra XD 1.6i | 2 | 2008-2011 | 2 → 1 |
| Elantra XD 2.0i | 2 | 2008-2011 | 2 → 1 |
| Getz | 5 | 2002-2009 | 9 → 5 |
| Grand i10 Nios III | 2 | 2019-2026 | 5 → 2 |
| H-1 I Starex | 2 | 1998-2007 | 4 → 2 |
| H-1 II Cargo | 2 | 2008-2026 | 9 → 1 |
| H-1 II Travel | 2 | 2008-2026 | 6 → 1 |
| i20 II Active | 4 | 2016-2020 | 9 → 3 |
| i20 II Coupe | 4 | 2015-2018 | 5 → 4 |
| i30 I | 6 | 2007-2012 | 15 → 5 |
| i30 I CW | 6 | 2008-2012 | 15 → 5 |
| i30 II | 7 | 2011-2017 | 19 → 7 |
| i30 II Coupe | 6 | 2013-2017 | 15 → 6 |
| i30 II CW | 6 | 2012-2017 | 20 → 6 |
| i30 III | 5 | 2016-2026 | 30 → 12 |
| i30 III CW | 5 | 2017-2026 | 34 → 9 |
| i30 III Fastback | 4 | 2017-2026 | 24 → 7 |
| i40 Combi | 6 | 2011-2026 | 20 → 5 |
| i40 Sedan | 4 | 2011-2018 | 12 → 3 |
| IONIQ | 2 | 2016-2026 | 5 → 3 |
| ix20 | 3 | 2010-2025 | 9 → 4 |
| ix35 | 6 | 2009-2015 | 16 → 6 |
| ix55 | 2 | 2008-2012 | 2 → 2 |
| Kauai I | 5 | 2017-2024 | 12 → 8 |
| Kauai II | 2 | 2023-2026 | 4 → 2 |
| Kona I | 6 | 2017-2023 | 18 → 12 |
| Kona II | 5 | 2023-2026 | 19 → 8 |
| Matrix | 4 | 2001-2010 | 6 → 4 |
| Palisade I | 2 | 2018-2025 | 8 → 2 |
| Santa Cruz | 2 | 2021-2026 | 5 → 3 |
| Solaris I | 3 | 2011-2016 | 8 → 2 |
| Solaris I Sedan | 3 | 2011-2016 | 8 → 2 |
| Solaris II Sedan | 2 | 2017-2026 | 4 → 2 |
| Staria | 4 | 2021-2026 | 7 → 5 |
| Stellar | 3 | 1983-1993 | 5 → 3 |
| Tucson I | 4 | 2004-2010 | 6 → 2 |
| Tucson II | 2 | 2009-2015 | 6 → 4 |
| Tucson III | 7 | 2015-2020 | 29 → 14 |
| Tucson IV | 5 | 2020-2026 | 27 → 11 |
| Veloster I | 3 | 2011-2018 | 6 → 4 |
| Veloster II | 3 | 2018-2026 | 7 → 5 |
| Venue | 4 | 2019-2026 | 9 → 7 |
| Veracruz | 3 | 2006-2013 | 9 → 3 |
| Verna V | 2 | 2017-2023 | 7 → 4 |
| Verna VI | 2 | 2023-2026 | 4 → 2 |
| Verna Hatchback | 3 | 2006-2009 | 3 → 3 |
| Verna Sedan | 3 | 2006-2009 | 5 → 3 |
| XG | 2 | 1999-2005 | 2 → 2 |

**Total merge groups:** 68

---

## Key Examples

### Elantra III Hatchback
Before: 4 separate models
- `"Elantra III Hatchback 2.0 CRD i"` (2001-2006, 1 engine)
- `"Elantra III Hatchback 2.0"` (2000-2006, 2 engines)
- `"Elantra III Hatchback 1.8"` (2000-2006, 1 engine)
- `"Elantra III Hatchback 1.6"` (2000-2006, 2 engines)

After: **1 model** `"Elantra III Hatchback"` (2000-2006, **4 engines** deduplicated from 6)

### Bayon
Before: 3 separate models
- `"Bayon"` (2021-2026, 5 engines)
- `"Bayon 1.2 MPi"` (2021-2023, 1 engine)
- `"Bayon 1.0 T-GDi"` (2021-2024, 6 engines)

After: **1 model** `"Bayon"` (2021-2026, **6 engines** deduplicated from 12)

### Tucson III
Before: 7 separate models
- `"Tucson III"`, `"Tucson III 2.0 MPI"`, `"Tucson III 2.0 GDI"`, `"Tucson III 2.0 CRDI"`, `"Tucson III 1.7 CRDI"`, `"Tucson III 1.6 T-GDI"`, `"Tucson III 1.6 GDI"`

After: **1 model** `"Tucson III"` (2015-2020, **14 engines** deduplicated from 29)

---

## Name Collisions Resolved

Original models with the same name as a merged group but with non-overlapping year ranges were preserved with a year-range suffix:

| Original Name | Renamed To |
|---|---|
| Elantra II (2006-2011) | Elantra II (2006-2011) |
| Elantra III (2011-2016) | Elantra III (2011-2016) |
| Elantra IV (2016-2020) | Elantra IV (2016-2020) |

---

## Files Created/Modified

| File | Description |
|---|---|
| `public/config/makes/hyundai.json` | **Modified** - Merged version (285 models) |
| `public/config/makes/hyundai.json.backup` | **Backup** - Original file (454 models) |
| `scripts/merge-hyundai-models.cjs` | **New** - Merge script |
| `scripts/verify-merge.cjs` | **New** - Verification script |

---

## Notes

- A backup of the original file is at `hyundai.json.backup`
- To revert: `cp hyundai.json.backup hyundai.json`
- Pre-existing duplicate engine codes (87 instances) in the original data were not modified - they exist in models that weren't part of merge operations