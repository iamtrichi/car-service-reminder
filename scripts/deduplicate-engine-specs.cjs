#!/usr/bin/env node
/**
 * Deduplicate engine specs across all brand JSON files.
 * 
 * For each brand file:
 * 1. Builds reference maps by engineCode and engineName (engines that have filled specs)
 * 2. Fills null spec fields in engines where a reference with the same code/name exists
 * 3. Saves the updated file
 * 4. Reports what was fixed per brand and per field
 */
const fs = require('fs');
const path = require('path');

const MAKES_DIR = path.join(__dirname, '..', 'public', 'config', 'makes');

// The 6 spec fields we want to fill
const SPEC_FIELDS = [
  'oilCapacity',
  'oilNorm',
  'brakeFluidType',
  'coolantType',
  'gearboxOilType',
  'gearboxOilCapacity'
];

// Fields that are safe to match based on - engineCode is unique identifier, engineName as fallback
const MATCH_KEYS = ['engineCode', 'engineName'];

function processBrandFile(filename) {
  const filePath = path.join(MAKES_DIR, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const make = data.make || filename.replace('.json', '');

  if (!Array.isArray(data.models)) {
    return null;
  }

  // --- Phase 1: Build reference maps ---
  // Map: engineCode -> { field -> value }
  const codeRefs = {};
  // Map: engineName -> { field -> value }
  const nameRefs = {};

  data.models.forEach(model => {
    if (!Array.isArray(model.engines)) return;
    model.engines.forEach(engine => {
      // Reference by engineCode
      if (engine.engineCode && engine.engineCode !== null) {
        if (!codeRefs[engine.engineCode]) codeRefs[engine.engineCode] = {};
        SPEC_FIELDS.forEach(f => {
          if (engine[f] !== null && engine[f] !== undefined) {
            codeRefs[engine.engineCode][f] = engine[f];
          }
        });
      }
      // Reference by engineName
      if (engine.engineName && engine.engineName !== null && engine.engineName !== '') {
        if (!nameRefs[engine.engineName]) nameRefs[engine.engineName] = {};
        SPEC_FIELDS.forEach(f => {
          if (engine[f] !== null && engine[f] !== undefined) {
            nameRefs[engine.engineName][f] = engine[f];
          }
        });
      }
    });
  });

  // --- Phase 2: Fill nulls using references ---
  let totalFixed = 0;
  const fixedByField = {};
  SPEC_FIELDS.forEach(f => fixedByField[f] = 0);

  data.models.forEach(model => {
    if (!Array.isArray(model.engines)) return;
    model.engines.forEach(engine => {
      const code = engine.engineCode;
      const name = engine.engineName;

      SPEC_FIELDS.forEach(f => {
        if (engine[f] !== null && engine[f] !== undefined) return; // already filled

        // Try matching by engineCode first (stronger match)
        if (code && codeRefs[code] && codeRefs[code][f] !== undefined) {
          engine[f] = codeRefs[code][f];
          totalFixed++;
          fixedByField[f]++;
          return;
        }

        // Try matching by engineName (weaker match, but useful)
        if (name && nameRefs[name] && nameRefs[name][f] !== undefined) {
          engine[f] = nameRefs[name][f];
          totalFixed++;
          fixedByField[f]++;
        }
      });
    });
  });

  if (totalFixed === 0) {
    return null;
  }

  // --- Phase 3: Save ---
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');

  return {
    make,
    totalFixed,
    fixedByField
  };
}

console.log('=== ENGINE SPEC DEDUPLICATION ===\n');

const files = fs.readdirSync(MAKES_DIR)
  .filter(f => f.endsWith('.json') && f !== 'all-makes-models.json');

let grandTotal = 0;
const grandByField = {};
SPEC_FIELDS.forEach(f => grandByField[f] = 0);
const brandResults = [];

files.forEach(file => {
  const result = processBrandFile(file);
  if (result) {
    brandResults.push(result);
    grandTotal += result.totalFixed;
    SPEC_FIELDS.forEach(f => grandByField[f] += (result.fixedByField[f] || 0));
    const details = SPEC_FIELDS
      .filter(f => result.fixedByField[f] > 0)
      .map(f => `${f}: ${result.fixedByField[f]}`)
      .join(', ');
    console.log(`✓ ${result.make.padEnd(20)} fixed ${result.totalFixed} nulls [${details}]`);
  }
});

console.log('\n=== SUMMARY ===');
console.log(`Brands processed: ${files.length}`);
console.log(`Brands with fixes: ${brandResults.length}`);
console.log(`Total nulls filled: ${grandTotal}`);
console.log('\nBy field:');
SPEC_FIELDS.forEach(f => {
  const pct = grandByField[f] > 0 ? ` (${Math.round(grandByField[f] / grandTotal * 100)}%)` : '';
  console.log(`  ${f.padEnd(25)} ${grandByField[f]}${pct}`);
});

console.log('\n=== Done ===');