#!/usr/bin/env node
/**
 * Universal script to merge make JSON models that are split by engine variants.
 * 
 * Processes all JSON files in public/config/makes/ (excluding backups and special files).
 * Models like "2008 I 1.6 VTi", "2008 I 1.6 e-HDi", "2008 I 1.4 HDi" get merged
 * into a single "2008 I" entry with combined years and deduplicated engines.
 */

const fs = require('fs');
const path = require('path');

const MAKES_DIR = path.join(__dirname, '..', 'public', 'config', 'makes');

// All generic engine/fuel pattern suffixes to strip from model names
// Ordered from most specific to least specific
const STRIP_PATTERNS = [
  // Fuel + drivetrain combos (Hyundai/Kia specific)
  /\s+(?:CRDi|CRD i|CRDI|VGT|GDI|GDi|MPi|MPI|DPI|DPi|TCi|T-GDi|T-GDI|TGD[iI]|GDi[-\s]Hybrid)\s*(?:\d+\s*(?:Hp|hp))?\s*(?:DCT|Automatic|Manual|IVT|AWD|4WD|4X4)?\s*$/i,
  
  // Diesel variants (Renault/Peugeot/Citroen specific)
  /\s+(?:dCi|dCi\s+\d+|HDi|HDi\s+\d+|BlueHDi|BlueHDi\s+\d+|e-HDi|e-HDi\s+\d+|SDi|TDi|TDI|TDI\s+\d+|PD|Pumpe\s+Düse)\s*(?:\d+\s*(?:Hp|hp|ch|CV))?\s*(?:Automatic|Manual|DCT|AWD|4WD)?\s*$/i,
  
  // Gasoline/engine variants (European makes)
  /\s+(?:TCE|TCe|tCe|T[SCHP]I|TFSI|FSI|TSI|VTi|Vti|VT[iI]|ETG|BVM|BVA|SCe)\s*(?:\d+\s*(?:Hp|hp|ch|CV))?\s*(?:Automatic|Manual|DCT)?\s*$/i,
  
  // Toyota-specific: i-FORCE, i-FORCE MAX, VVT-i, VVT-iE, VVTi, i-VTEC
  /\s+(?:i-FORCE\s*MAX|i-FORCE|i-VTEC|VVT-iE|VVT-i|VVTi)\s*$/i,
  
  // Trim-level + engine combos: "Deluxe 2.4i", "Limited 2.4 i-FORCE", "TRD Pro 2.4 i-FORCE MAX"
  // Matches trim words at end followed optionally by displacement/fuel
  /\s+(?:Deluxe|Limited|Sport|TRD\s+Pro|TRD|SR5|SR|LE|SE|XLE|XSE|XLR|XLT|Platinum|Titanium|ST|ST-Line|GT-Line|GTI|GLS|GLX|GLi|GLE|AMG|S-Line|R-Line|Edition|Executive|Lifestyle|Authentic|Prestige|Ambition|Advantage|Style|Business)\s+(?:\d+(?:\.\d+)?\s*(?:L|cc)?\s*)?(?:i-FORCE\s*MAX|i-FORCE|TDI|TFSI|TSI|VTi|HDi|dCi|VVT-i|VVTi|i-VTEC|i)?\s*(?:V\d+\s+\d+V|V\d+|\d+V)?\s*$/i,
  
  // Pure trim at end: " TRD Pro", " Limited", " Deluxe", " Sport"
  /\s+(?:Deluxe|Limited|Sport|TRD\s+Pro|TRD|SR5|SR|LE|SE|XLE|XSE|XLT|Platinum|Titanium|GTI|GLS|GLX|Edition|Executive|Lifestyle)\s*$/i,
  
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
 * Check if two engines are duplicates
 */
function areEnginesDuplicate(e1, e2) {
  if (e1.engineCode && e2.engineCode && e1.engineCode === e2.engineCode) {
    return true;
  }
  const nameSimilar = areEngineNamesSimilar(e1.engineName, e2.engineName);
  const sameTurbo = e1.isTurbo === e2.isTurbo;
  const hpDiff = Math.abs((e1.hp || 0) - (e2.hp || 0));
  if (nameSimilar && sameTurbo && hpDiff < 7) {
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
 * Check if two year ranges overlap
 */
function doYearRangesOverlap(years1, years2) {
  const min1 = Math.min(...years1);
  const max1 = Math.max(...years1);
  const min2 = Math.min(...years2);
  const max2 = Math.max(...years2);
  return !(max1 < min2 || max2 < min1);
}

/**
 * Process a single make JSON file
 */
function processMakeFile(filePath) {
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

      // Deduplicate engines
      const uniqueEngines = [];
      for (const engine of allEngines) {
        let isDuplicate = false;
        for (const existing of uniqueEngines) {
          if (areEnginesDuplicate(engine, existing)) {
            isDuplicate = true;
            break;
          }
        }
        if (!isDuplicate) {
          uniqueEngines.push(engine);
        }
      }

      // Find this detail entry
      const detail = mergeDetails.find(d => d.name === baseKey && d.beforeEngines === allEngines.length);
      if (detail) {
        detail.afterEngines = uniqueEngines.length;
        detail.years = `${minYear}-${maxYear}`;
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

  // Write output
  data.models = mergedModels;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

  const removed = models.length - mergedModels.length;
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
  const files = fs.readdirSync(MAKES_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('.backup') && !f.endsWith('all-makes-models.json') && !f.endsWith('missing-models-report.json'))
    .sort();

  console.log(`Found ${files.length} make files to process\n`);

  const results = [];
  let totalBefore = 0;
  let totalAfter = 0;
  let totalMerged = 0;
  let totalMergeGroups = 0;

  for (const file of files) {
    const filePath = path.join(MAKES_DIR, file);
    
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

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
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