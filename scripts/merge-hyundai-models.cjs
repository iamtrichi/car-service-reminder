#!/usr/bin/env node
/**
 * Script to merge Hyundai models that are split by engine variant
 * 
 * Only merges models that share the same base name AND have overlapping year ranges,
 * to avoid mixing different generations.
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'public', 'config', 'makes', 'hyundai.json');
const OUTPUT_FILE = INPUT_FILE;

// Read the file
const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
const data = JSON.parse(raw);

const models = data.models;
console.log(`Total models before merge: ${models.length}`);

/**
 * Normalize engine name for comparison
 */
function normalizeEngineName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/(\d+\.?\d*)\s*l(?!\w)/g, '$1')
    .replace(/\s*\(\s*(\d+)\s*hp\s*\)/gi, '')
    .replace(/\s*\((\d+)\s*hp\)\s*(dct|automatic|manual|ivt)?/gi, '')
    .replace(/\s*\b(hp)\b/gi, '')
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
 * Generate a "base key" for a model name by stripping trailing engine/variant info.
 */
function generateBaseKey(name) {
  const stripPatterns = [
    /\s+(?:CRDi|CRD i|CRDI|VGT|GDI|GDi|MPi|MPI|DPI|DPi|TCi|T-GDi|T-GDI|TGD[iI])\s*(?:\d+\s*(?:Hp|hp))?\s*(?:DCT|Automatic)?\s*$/i,
    /\s+\d+\.\d+\s*(?:L)?\s*(?:Smartstream\s*)?(?:DPi|GDI|GDi|MPi|MPI|CRDi|CRDI|VGT|CVVT|DOHC|T-GDi|T-GDI)?\s*(?:\d+\s*(?:Hp|hp))?\s*(?:DCT|Automatic|IVT)?\s*$/i,
    /\s+\d+\.\d+\s+Smartstream\s*(?:G\d+\.\d+\s*)?(?:MPi|GDI|DPi)?\s*$/i,
    /\s+\d+\.\d+\s*$/i,
    /\s+(?:Alpha\s+\w+|Beta\s+\w+|Gamma\s+\w+|Nu\s+\w+|Kappa\s+\w+|U\s+\w+|U2|U\s+II)\s*$/i,
    /\s+\d+V\s*$/i,
    /\s+\d+\s*(?:Hp|hp)\s*$/i,
    /\s+(?:Automatic|Manual|DCT|IVT)\s*$/i,
    /\s+i\s+\d+V\s*$/i,
    /\s+i\s*$/i,
  ];

  let key = name.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of stripPatterns) {
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
  // Need at least 1 year of overlap to merge
  return !(max1 < min2 || max2 < min1);
}

// Build groups: baseKey → [{name, years, engines}]
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
    baseKey
  });
}

// Log groups that would be merged (have more than one entry with overlapping years)
console.log('\n=== Groups to merge ===');
let mergeCount = 0;
const groupsToMerge = new Map();

for (const [baseKey, entries] of groups) {
  if (entries.length > 1) {
    // Build year-overlap-based sub-groups
    const subGroups = [];
    const assigned = new Set();
    
    for (let i = 0; i < entries.length; i++) {
      if (assigned.has(i)) continue;
      const subGroup = [entries[i]];
      assigned.add(i);
      
      for (let j = i + 1; j < entries.length; j++) {
        if (assigned.has(j)) continue;
        // Check if this entry overlaps with any entry already in the sub-group
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
      for (const subGroup of subGroups) {
        mergeCount++;
        console.log(`\n"${baseKey}" (${subGroup.length} variants):`);
        for (const entry of subGroup) {
          console.log(`  - "${entry.originalName}" (years: ${Math.min(...entry.years)}-${Math.max(...entry.years)}, engines: ${entry.engines.length})`);
        }
      }
    }
  }
}
console.log(`\nTotal merge groups: ${mergeCount}`);

// Build new merged models array
const mergedModels = [];
const usedModels = new Set();
const usedNames = new Set();

// First, add merged models
for (const [baseKey, subGroups] of groupsToMerge) {
  for (const entries of subGroups) {
    const allYears = new Set();
    const allEngines = [];

    for (const entry of entries) {
      for (const y of entry.years) allYears.add(y);
      for (const e of entry.engines) allEngines.push(e);
      usedModels.add(entry.originalName);
    }

    // Generate sorted years array from min to max
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

    console.log(`\nMerging "${baseKey}":`);
    console.log(`  Years: ${minYear}-${maxYear} (${mergedYears.length} years)`);
    console.log(`  Engines: ${allEngines.length} → ${uniqueEngines.length} after dedup`);

    // Handle name collisions: if the name already exists, add a year range suffix
    let modelName = baseKey;
    if (usedNames.has(modelName)) {
      modelName = `${baseKey} (${minYear}-${maxYear})`;
      console.log(`  NOTE: Name collision, using "${modelName}"`);
    }
    usedNames.add(modelName);

    mergedModels.push({
      name: modelName,
      years: mergedYears,
      engines: uniqueEngines
    });
  }
}

// Add all non-merged original models
for (const model of models) {
  if (!usedModels.has(model.name)) {
    let modelName = model.name;
    // Handle name collisions with merged models
    if (usedNames.has(modelName)) {
      const minYear = Math.min(...model.years);
      const maxYear = Math.max(...model.years);
      modelName = `${model.name} (${minYear}-${maxYear})`;
      console.log(`NOTE: Name collision for "${model.name}", using "${modelName}"`);
    }
    usedNames.add(modelName);
    mergedModels.push({
      ...model,
      name: modelName
    });
  }
}

// Sort models alphabetically by name
mergedModels.sort((a, b) => a.name.localeCompare(b.name));

console.log(`\nTotal models after merge: ${mergedModels.length}`);
console.log(`Models removed: ${models.length - mergedModels.length}`);

// Write the output
data.models = mergedModels;
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
console.log(`\nWritten to ${OUTPUT_FILE}`);