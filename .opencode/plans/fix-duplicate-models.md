# Fix Duplicate Models on Brands

## Goal
Consolidate over-split car models where body style, engine, and trim info is baked into the model name.

## Changes

### 1. Add body style patterns to `STRIP_PATTERNS` in `scripts/merge-all-makes.cjs`

**Location**: After the fuel type pattern (line ~80), before drivetrain (line ~83)

**Add this pattern:**
```javascript
  // Body styles: "3-door", "5-door", "Hatchback", "Sedan", "Wagon", etc.
  /\s+(?:3[- ]?(?:door|dr)|5[- ]?(?:door|dr)|Hatchback|Sedan|Saloon|Wagon|Turnier|Tourer|Estate|Convertible|Coupe|Cabrio|MPV|SUV|Crossover|Liftback|Fastback|Sportback|Shooting Brake|Van|Minivan)\s*$/i,
```

**Full context (lines ~79-95):**
```javascript
  // Fuel type alone at end
  /\s+(?:Diesel|Gasoline|Petrol|Hybrid|Electric|GPL|LPG|CNG|Bi-Fuel|Flex)\s*$/i,

  // Body styles: "3-door", "5-door", "Hatchback", "Sedan", "Wagon", etc.
  /\s+(?:3[- ]?(?:door|dr)|5[- ]?(?:door|dr)|Hatchback|Sedan|Saloon|Wagon|Turnier|Tourer|Estate|Convertible|Coupe|Cabrio|MPV|SUV|Crossover|Liftback|Fastback|Sportback|Shooting Brake|Van|Minivan)\s*$/i,

  // Drivetrain at end
  /\s+(?:AWD|4WD|4X4|FWD|RWD|GT|GTI|GTD|GTE|GLX|GLS|GLi)\s*$/i,
```

### 2. Add year gap tolerance to `doYearRangesOverlap()`

**Location**: Lines 158-167

**Replace:**
```javascript
/**
 * Check if two year ranges overlap
 */
function doYearRangesOverlap(years1, years2) {
  const min1 = Math.min(...years1);
  const max1 = Math.max(...years1);
  const min2 = Math.min(...years2);
  const max2 = Math.max(...years2);
  return !(max1 < min2 || max2 < min1);
}
```

**With:**
```javascript
/**
 * Check if two year ranges overlap (with gap tolerance)
 * Allows merging models whose year ranges are within YEAR_GAP_TOLERANCE years of each other.
 * This handles cases like Corsa D (2011-2014) + Corsa D 3-door (2009-2010) with a 1-year gap.
 */
const YEAR_GAP_TOLERANCE = 3;

function doYearRangesOverlap(years1, years2) {
  const min1 = Math.min(...years1);
  const max1 = Math.max(...years1);
  const min2 = Math.min(...years2);
  const max2 = Math.max(...years2);
  // Allow a gap of up to YEAR_GAP_TOLERANCE years between ranges
  return !(max1 + YEAR_GAP_TOLERANCE < min2 || max2 + YEAR_GAP_TOLERANCE < min1);
}
```

### 3. Add per-make report generation

**Location**: In `processMakeFile()` function, after the merge logic and before writing the output file.

**Add a `REPORT_DIR` constant near the top of the file (after MAKES_DIR):**
```javascript
const REPORT_DIR = path.join(__dirname, '..', 'merge-reports');
```

**Add report generation at the end of `processMakeFile()`, after writing the merged JSON:**
```javascript
  // Generate per-make report
  if (mergeDetails.length > 0) {
    if (!fs.existsSync(REPORT_DIR)) {
      fs.mkdirSync(REPORT_DIR, { recursive: true });
    }
    const reportLines = [];
    reportLines.push(`# ${data.make || fileName} — Merge Report`);
    reportLines.push('');
    reportLines.push(`- **Models before**: ${models.length}`);
    reportLines.push(`- **Models after**: ${mergedModels.length}`);
    reportLines.push(`- **Models removed**: ${removed}`);
    reportLines.push(`- **Merge groups**: ${mergeDetails.length}`);
    reportLines.push('');
    reportLines.push('## Merge Details');
    reportLines.push('');
    for (const detail of mergeDetails) {
      reportLines.push(`### ${detail.name}`);
      reportLines.push('');
      reportLines.push(`| Variant | Years | Engines |`);
      reportLines.push(`|---------|-------|---------|`);
      for (const variant of detail.variants) {
        const model = models.find(m => m.name === variant);
        const years = model ? `${Math.min(...model.years)}-${Math.max(...model.years)}` : 'N/A';
        const engines = model ? model.engines.length : 0;
        reportLines.push(`| ${variant} | ${years} | ${engines} |`);
      }
      reportLines.push('');
    }
    const reportPath = path.join(REPORT_DIR, `${path.basename(fileName, '.json')}-merge-report.md`);
    fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
    console.log(`  Report written to ${reportPath}`);
  }
```

### 4. Update the JSDoc comment at the top

**Replace:**
```javascript
/**
 * Universal script to merge make JSON models that are split by engine variants.
 * 
 * Processes all JSON files in public/config/makes/ (excluding backups and special files).
 * Models like "2008 I 1.6 VTi", "2008 I 1.6 e-HDi", "2008 I 1.4 HDi" get merged
 * into a single "2008 I" entry with combined years and deduplicated engines.
 */
```

**With:**
```javascript
/**
 * Universal script to merge make JSON models that are split by engine variants and body styles.
 * 
 * Processes all JSON files in public/config/makes/ (excluding backups and special files).
 * Models like "Corsa D 3-door 1.2 LPG", "Corsa D 5-door 1.4i" get merged into "Corsa D".
 * Models like "Focus III Hatchback", "Focus III Sedan", "Focus III Wagon" get merged into "Focus III".
 * 
 * Outputs per-make merge reports to merge-reports/ directory.
 */
```

### 5. Clean up

Delete `scripts/dry-run-merge-analysis.cjs` after verifying the merge results.

## Expected Impact

- ~344 models removed across ~262 merge groups (6.7% reduction)
- Per-make markdown reports in `merge-reports/` directory
- Biggest wins: Opel (Corsa D/E consolidation), Ford (Focus body styles), Toyota, Honda

## Verification

After running the script:
1. `node scripts/verify-all-merge.cjs` — check for duplicate names, missing fields
2. Review `merge-reports/*.md` files for correctness
3. Spot-check a few make JSON files to confirm engines are preserved
