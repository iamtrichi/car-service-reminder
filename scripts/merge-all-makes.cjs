#!/usr/bin/env node
/**
 * Universal script to merge make JSON models that are split by engine variants and body styles.
 * 
 * Processes all JSON files in public/config/makes/ (excluding backups and special files).
 * Models like "Corsa D 3-door 1.2 LPG", "Corsa D 5-door 1.4i" get merged into "Corsa D".
 * Models like "Focus III Hatchback", "Focus III Sedan", "Focus III Wagon" get merged into "Focus III".
 * 
 * Outputs per-make merge reports to merge-reports/ directory.
 */

const fs = require('fs');
const path = require('path');

const MAKES_DIR = path.join(__dirname, '..', 'public', 'config', 'makes');
const REPORT_DIR = path.join(__dirname, '..', 'merge-reports');

// All generic engine/fuel pattern suffixes to strip from model names
// Ordered from most specific to least specific
const STRIP_PATTERNS = [
  // Fuel + drivetrain combos (Hyundai/Kia specific)
  /\s+(?:CRDi|CRD i|CRDI|VGT|GDI|GDi|MPi|MPI|DPI|DPi|TCi|T-GDi|T-GDI|TGD[iI]|GDi[-\s]Hybrid)\s*(?:\d+\s*(?:Hp|hp))?\s*(?:DCT|Automatic|Manual|IVT|AWD|4WD|4X4)?\s*$/i,
  
  // Diesel variants (Renault/Peugeot/Citroen/Opel specific)
  /\s+(?:dCi|dCi\s+\d+|HDi|HDi\s+\d+|BlueHDi|BlueHDi\s+\d+|e-HDi|e-HDi\s+\d+|SDi|TDi|TDI|TDI\s+\d+|PD|Pumpe\s+Düse|CDTI|CDI|VCDi)\s*(?:\d+\s*(?:Hp|hp|ch|CV))?\s*(?:Automatic|Manual|DCT|AWD|4WD)?\s*$/i,
  
  // Gasoline/engine variants (European makes)
  /\s+(?:TCE|TCe|tCe|T[SCHP]I|TFSI|FSI|TSI|VTi|Vti|VT[iI]|ETG|BVM|BVA|SCe|ECOTEC)\s*(?:\d+\s*(?:Hp|hp|ch|CV))?\s*(?:Automatic|Manual|DCT)?\s*$/i,
  
  // Toyota-specific: i-FORCE, i-FORCE MAX, VVT-i, VVT-iE, VVTi, i-VTEC
  /\s+(?:i-FORCE\s*MAX|i-FORCE|i-VTEC|VVT-iE|VVT-i|VVTi)\s*$/i,
  
  // Trim-level + engine combos: "Deluxe 2.4i", "Limited 2.4 i-FORCE", "TRD Pro 2.4 i-FORCE MAX"
  // Matches trim words at end followed optionally by displacement/fuel
  /\s+(?:Deluxe|Limited|Sport|TRD\s+Pro|TRD|SR5|SR|LE|SE|XLE|XSE|XLR|XLT|Platinum|Titanium|ST|ST-Line|GT-Line|GTI|GLS|GLX|GLi|GLE|AMG|S-Line|R-Line|Edition|Executive|Lifestyle|Authentic|Prestige|Ambition|Advantage|Style|Business)\s+(?:\d+(?:\.\d+)?\s*(?:L|cc)?\s*)?(?:i-FORCE\s*MAX|i-FORCE|TDI|TFSI|TSI|VTi|HDi|dCi|VVT-i|VVTi|i-VTEC|i)?\s*(?:V\d+\s+\d+V|V\d+|\d+V)?\s*$/i,
  
  // Pure trim at end: " TRD Pro", " Limited", " Deluxe", " Sport"
  /\s+(?:Deluxe|Limited|Sport|TRD\s+Pro|TRD|SR5|SR|LE|SE|XLE|XSE|XLT|Platinum|Titanium|GTI|GLS|GLX|Edition|Executive|Lifestyle|ecoFLEX|GSi|OPC|VXR|Cupra|N\s*Line|N\s*Sport|R-Line|S-Line|AMG\s+Line|Black\s+Edition|BlueHDi)\s*$/i,
  
  // Turbo variants
  /\s+(?:Turbo|Turbu|Biturbo|Bi[- ]Turbo)\s*(?:\d+\s*(?:Hp|hp|ch|CV))?\s*(?:Automatic|Manual|DCT)?\s*$/i,
  
  // Electric variants
  /\s+(?:e[-\s]?(?:2008|208|308|Partner|Berlingo|Corsa|Mokka|DS|208|308|2008))\s*(?:\d+\s*(?:kWh|HP|hp|ch))?\s*$/i,
  
  // kWh battery variants (electric)
  /\s+(?:\d+[\.\d]*\s*kWh)\s*(?:\(?\d+\s*(?:HP|hp|ch)\)?)?\s*(?:Long\s*Range|Standard\s*Range|Performance)?\s*$/i,
  
  // Displacement + V6/V8 + valve combo: "3.4 V6 24V", "4.0 V6 24V", "3.0i V6"
  /\s+\d+\.\d+\s*i?\s*[Vv]\d+\s*(?:\d+V)?\s*$/i,
  
  // Displacement + i suffix: "2.4i", "3.0i", "1.6i"
  /\s+\d+\.\d+\s*i\s*$/i,
  
  // Numeric displacement + optional fuel type patterns (general)
  /\s+\d+\.\d+\s*(?:L|cc)?\s*(?:Smartstream\s*)?(?:DPi|GDI|GDi|MPi|MPI|CRDi|CRDI|VGT|CVVT|DOHC|T-[gG][Dd][iI]|T[gG][Dd][iI]|TCE|dCi|HDi|TSI|TFSI|FSI|VTi|SCe|TD)?\s*(?:\d+\s*(?:Hp|hp|ch|CV))?\s*(?:DCT|Automatic|Manual|IVT|AWD|4WD)?\s*$/i,
  
  // "1.6 Smartstream", "2.0 Smartstream" patterns
  /\s+\d+\.\d+\s+Smartstream\s*(?:G\d+\.\d+\s*)?(?:MPi|GDI|DPi|T[- ]GDi)?\s*$/i,
  
  // Pure numeric at end: " 1.6", " 2.0", " 1.4"
  /\s+\d+\.\d+\s*$/i,
  
  // V6, V8, V12 at end
  /\s+[Vv]\d+\s*$/i,
  
  // Engine code names at end
  /\s+(?:Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Theta|Lambda|Kappa|Nu|Omega|Sigma|Tau|Mu|Pi|Rho|U\s+\w+|U2|T-\w+|R\s+\w+)\s*(?:\s+(?:II|III|IV|V))?\s*$/i,
  
  // Valve configurations
  /\s+\d+\s*V(?:alves)?\s*$/i,
  
  // Horsepower at end
  /\s+\d+\s*(?:Hp|hp|ch|CV)\s*$/i,
  
  // Transmission type at end
  /\s+(?:Automatic|Manual|DCT|IVT|CVT|Robot|Sequential)\s*$/i,
  
  // "i 16V", "i 12V" patterns
  /\s+i\s+\d+\s*V\s*$/i,
  
  // Fuel type alone at end
  /\s+(?:Diesel|Gasoline|Petrol|Hybrid|Electric|GPL|LPG|CNG|Bi-Fuel|Flex)\s*$/i,

  // Body styles: "3-door", "5-door", "Hatchback", "Sedan", "Wagon", etc.
  /\s+(?:3[- ]?(?:door|dr)|5[- ]?(?:door|dr)|Hatchback|Sedan|Saloon|Wagon|Turnier|Tourer|Estate|Convertible|Coupe|Cabrio|MPV|SUV|Crossover|Liftback|Fastback|Sportback|Shooting Brake|Van|Minivan)\s*$/i,

  // Drivetrain at end
  /\s+(?:AWD|4WD|4X4|FWD|RWD|GT|GTI|GTD|GTE|GLX|GLS|GLi)\s*$/i,
  
  // Trailing "i", "i.e.", "i.e"
  /\s+i\.?e?\s*$/i,
  /\s+i\s*$/i,
  
  // "16V", "12V", "24V" (without i prefix)
  /\s+\d+\s*V\s*$/i,
  
  // Trailing displacement in L
  /\s+\d+(?:\.\d+)?\s*L\s*$/i,
];

/**
 * Normalize engine name for comparison
 */
function normalizeEngineName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/(\d+\.?\d*)\s*l(?!\w)/g, '$1')
    .replace(/\s*\(\s*(\d+)\s*(?:hp|ch|cv)\s*\)/gi, '')
    .replace(/\s*\((\d+)\s*(?:hp|ch|cv)\)\s*(dct|automatic|manual|ivt)?/gi, '')
    .replace(/\s*\b(hp|ch|cv)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two engine names are similar
 */
function areEngineNamesSimilar(name1, name2) {
  const n1 = normalizeEngineName(name1);
  const n2 = normalizeEngineName(name2);
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  return false;
}

/**
 * Check if two engines are duplicates — only by exact engineCode match.
 * Different variants (B14XER vs B14XER-B) are kept as separate entries.
 */
function areEnginesDuplicate(e1, e2) {
  if (e1.engineCode && e2.engineCode && e1.engineCode === e2.engineCode) {
    return true;
  }
  return false;
}

/**
 * Generate a "base key" for a model name by stripping trailing engine/variant info
 */
function generateBaseKey(name) {
  let key = name.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of STRIP_PATTERNS) {
      const newKey = key.replace(pattern, '');
      if (newKey !== key) {
        key = newKey.trim();
        changed = true;
        break;
      }
    }
  }
  return key;
}

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

/**
 * Process a single make JSON file
 */
function processMakeFile(filePath, dryRun = false) {
  const fileName = path.basename(filePath);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  if (!data.models || !Array.isArray(data.models)) {
    console.log(`  SKIPPED: No models array found`);
    return { before: 0, after: 0, removed: 0, mergeGroups: [] };
  }

  const models = data.models;
  console.log(`\nProcessing ${fileName} (${data.make || 'unknown'}): ${models.length} models`);

  // Build groups
  const groups = new Map();
  for (const model of models) {
    const baseKey = generateBaseKey(model.name);
    if (!groups.has(baseKey)) {
      groups.set(baseKey, []);
    }
    groups.get(baseKey).push({
      originalName: model.name,
      years: model.years,
      engines: model.engines,
    });
  }

  // Find groups to merge
  const groupsToMerge = new Map();
  for (const [baseKey, entries] of groups) {
    if (entries.length > 1) {
      const subGroups = [];
      const assigned = new Set();

      for (let i = 0; i < entries.length; i++) {
        if (assigned.has(i)) continue;
        const subGroup = [entries[i]];
        assigned.add(i);

        for (let j = i + 1; j < entries.length; j++) {
          if (assigned.has(j)) continue;
          const overlaps = subGroup.some(e => doYearRangesOverlap(e.years, entries[j].years));
          if (overlaps) {
            subGroup.push(entries[j]);
            assigned.add(j);
          }
        }

        if (subGroup.length > 1) {
          subGroups.push(subGroup);
        }
      }

      if (subGroups.length > 0) {
        groupsToMerge.set(baseKey, subGroups);
      }
    }
  }

  if (groupsToMerge.size === 0) {
    console.log(`  No merge needed`);
    return { before: models.length, after: models.length, removed: 0, mergeGroups: [] };
  }

  // Log merge groups
  const mergeDetails = [];
  for (const [baseKey, subGroups] of groupsToMerge) {
    for (const subGroup of subGroups) {
      const detail = {
        name: baseKey,
        variants: subGroup.map(e => e.originalName),
        beforeEngines: 0,
        afterEngines: 0,
        years: ''
      };
      for (const entry of subGroup) {
        detail.beforeEngines += entry.engines.length;
      }
      console.log(`  MERGE: "${baseKey}" (${subGroup.length} variants)`);
      for (const entry of subGroup) {
        console.log(`    - "${entry.originalName}" (${Math.min(...entry.years)}-${Math.max(...entry.years)}, ${entry.engines.length} engines)`);
      }
      mergeDetails.push(detail);
    }
  }

  // Build merged result
  const mergedModels = [];
  const usedModels = new Set();
  const usedNames = new Set();

  // Add merged models
  for (const [baseKey, subGroups] of groupsToMerge) {
    for (const entries of subGroups) {
      const allYears = new Set();
      const allEngines = [];

      for (const entry of entries) {
        for (const y of entry.years) allYears.add(y);
        for (const e of entry.engines) allEngines.push(e);
        usedModels.add(entry.originalName);
      }

      const minYear = Math.min(...allYears);
      const maxYear = Math.max(...allYears);
      const mergedYears = [];
      for (let y = minYear; y <= maxYear; y++) {
        mergedYears.push(y);
      }

      // Group engines by engineCode to find duplicates
      const codeGroups = new Map();
      for (const engine of allEngines) {
        const code = engine.engineCode || '_none_';
        if (!codeGroups.has(code)) codeGroups.set(code, []);
        codeGroups.get(code).push(engine);
      }

      // Rename duplicate engineCodes to make them unique
      const uniqueEngines = [];
      const renamedEngines = [];
      for (const [code, group] of codeGroups) {
        if (group.length === 1) {
          uniqueEngines.push(group[0]);
        } else {
          // Check if HP values differ
          const hpValues = [...new Set(group.map(e => e.hp).filter(Boolean))];
          const hpDiffers = hpValues.length > 1;

          for (let i = 0; i < group.length; i++) {
            const engine = { ...group[i] };
            const originalCode = engine.engineCode;
            if (hpDiffers) {
              engine.engineCode = `${originalCode}-${engine.hp || 'NA'}`;
            } else {
              const suffix = String.fromCharCode(97 + i); // a, b, c...
              engine.engineCode = `${originalCode}-${suffix}`;
            }
            renamedEngines.push({
              originalCode,
              newCode: engine.engineCode,
              engine
            });
            uniqueEngines.push(engine);
          }
        }
      }

      // Find this detail entry
      const detail = mergeDetails.find(d => d.name === baseKey && d.beforeEngines === allEngines.length);
      if (detail) {
        detail.afterEngines = uniqueEngines.length;
        detail.years = `${minYear}-${maxYear}`;
        detail.renamedEngines = renamedEngines;
      }

      let modelName = baseKey;
      if (usedNames.has(modelName)) {
        modelName = `${baseKey} (${minYear}-${maxYear})`;
        console.log(`    Name collision, using "${modelName}"`);
      }
      usedNames.add(modelName);

      mergedModels.push({
        name: modelName,
        years: mergedYears,
        engines: uniqueEngines
      });
    }
  }

  // Add non-merged original models
  for (const model of models) {
    if (!usedModels.has(model.name)) {
      let modelName = model.name;
      if (usedNames.has(modelName)) {
        const minYear = Math.min(...model.years);
        const maxYear = Math.max(...model.years);
        modelName = `${model.name} (${minYear}-${maxYear})`;
        console.log(`  Name collision for "${model.name}", using "${modelName}"`);
      }
      usedNames.add(modelName);
      mergedModels.push({ ...model, name: modelName });
    }
  }

  // Sort by name
  mergedModels.sort((a, b) => a.name.localeCompare(b.name));

  const removed = models.length - mergedModels.length;

  if (!dryRun) {
    // Write output
    data.models = mergedModels;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

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
        reportLines.push(`**Variants merged** (${detail.variants.length} models → 1, ${detail.afterEngines} engines kept):`);
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

        if (detail.renamedEngines && detail.renamedEngines.length > 0) {
          reportLines.push(`**Renamed engines** (${detail.renamedEngines.length} duplicate codes renamed):`);
          reportLines.push('');
          reportLines.push(`| Original Code | New Code | Engine Name | Reason |`);
          reportLines.push(`|---------------|----------|-------------|--------|`);
          for (const { originalCode, newCode, engine } of detail.renamedEngines) {
            const hpDiffers = newCode.includes('-') && !newCode.endsWith('-a') && !newCode.endsWith('-b') && !newCode.endsWith('-c') && !newCode.endsWith('-d') && !newCode.endsWith('-e') && !newCode.endsWith('-f');
            const reason = hpDiffers ? 'duplicate code, different HP' : 'duplicate code, same HP';
            reportLines.push(`| ${originalCode} | ${newCode} | ${engine.engineName || 'N/A'} | ${reason} |`);
          }
          reportLines.push('');
        }
      }
      const reportPath = path.join(REPORT_DIR, `${path.basename(fileName, '.json')}-merge-report.md`);
      fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
      console.log(`  Report written to ${reportPath}`);
    }
  }

  console.log(`  Result: ${mergedModels.length} models (${removed} removed, ${mergeDetails.length} merge groups)`);

  return {
    before: models.length,
    after: mergedModels.length,
    removed,
    mergeGroups: mergeDetails
  };
}

// MAIN
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileIdx = args.indexOf('--file');
  const targetFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

  let files;
  if (targetFile) {
    files = [targetFile];
  } else {
    files = fs.readdirSync(MAKES_DIR)
      .filter(f => f.endsWith('.json') && !f.includes('.backup') && !f.endsWith('all-makes-models.json') && !f.endsWith('missing-models-report.json'))
      .sort();
  }

  console.log(`Found ${files.length} make file(s) to process${dryRun ? ' (DRY RUN — no files modified)' : ''}\n`);

  const results = [];
  let totalBefore = 0;
  let totalAfter = 0;
  let totalMerged = 0;
  let totalMergeGroups = 0;

  for (const file of files) {
    const filePath = path.join(MAKES_DIR, file);

    if (dryRun) {
      // Dry run: read but don't write
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (!data.models || !Array.isArray(data.models)) continue;
      const result = processMakeFile(filePath, true); // dryRun=true
      results.push({ file, ...result });
      totalBefore += result.before;
      totalAfter += result.after;
      totalMergeGroups += result.mergeGroups.length;
      totalMerged += result.removed;
    } else {
      // Create backup if not exists
      const backupPath = filePath + '.backup';
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
      }

      try {
        const result = processMakeFile(filePath);
        results.push({ file, ...result });
        totalBefore += result.before;
        totalAfter += result.after;
        totalMergeGroups += result.mergeGroups.length;
        totalMerged += result.removed;
      } catch (err) {
        console.log(`  ERROR: ${err.message}`);
        results.push({ file, before: 0, after: 0, removed: 0, error: err.message });
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY' + (dryRun ? ' (DRY RUN)' : ''));
  console.log('='.repeat(60));
  console.log(`Total makes processed: ${results.length}`);
  console.log(`Total models before:     ${totalBefore}`);
  console.log(`Total models after:      ${totalAfter}`);
  console.log(`Total models removed:    ${totalMerged}`);
  console.log(`Total merge groups:      ${totalMergeGroups}`);
  console.log('');

  // Per-make breakdown
  console.log('Per-make breakdown:');
  console.log('  ' + 'Make'.padEnd(22) + 'Before'.padEnd(8) + 'After'.padEnd(8) + 'Removed'.padEnd(10) + 'Merges');
  console.log('  ' + '-'.repeat(60));
  for (const r of results) {
    const makeName = path.basename(r.file, '.json');
    const merged = r.mergeGroups ? r.mergeGroups.length : 0;
    console.log(`  ${makeName.padEnd(22)} ${String(r.before).padEnd(8)} ${String(r.after).padEnd(8)} ${String(r.removed).padEnd(10)} ${merged}`);
  }
}

main();