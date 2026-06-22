#!/usr/bin/env node
/**
 * Fill missing fluid specifications on Dacia engines from Renault equivalents.
 * Dacia and Renault share the same engines almost.
 * 
 * Strategy:
 * 1. Build a lookup from Renault engines keyed by engineCode
 * 2. For each Dacia engine with null brakeFluidType/coolantType/gearboxOilType/gearboxOilCapacity:
 *    a. Match by exact engineCode (e.g., "HR12", "H5H 470")
 *    b. Fall back to matching by engine family short code (e.g., "K9K", "H4Dt", "H5F")
 *    c. Fall back to matching by engine name keywords
 */
const fs = require('fs');
const path = require('path');

const renaultPath = path.join(__dirname, '..', 'public', 'config', 'makes', 'renault.json');
const daciaPath = path.join(__dirname, '..', 'public', 'config', 'makes', 'dacia.json');

const renault = JSON.parse(fs.readFileSync(renaultPath, 'utf8'));
const dacia = JSON.parse(fs.readFileSync(daciaPath, 'utf8'));

// Build lookup from Renault engines
// Key: engineCode -> engine object with all props
const renaultByCode = {};
const renaultByName = [];
const renaultByFamily = {};

renault.models.forEach(model => {
  if (!Array.isArray(model.engines)) return;
  model.engines.forEach(engine => {
    // Index by exact engine code
    if (engine.engineCode) {
      const codes = engine.engineCode.split(',').map(c => c.trim());
      codes.forEach(code => {
        if (!renaultByCode[code]) {
          renaultByCode[code] = engine;
        }
      });
    }
    
    // Index by family (first part of engine code)
    if (engine.engineCode) {
      const codes = engine.engineCode.split(',').map(c => c.trim());
      codes.forEach(code => {
        // Extract family: "K4M 862" -> "K4M", "H5F 408" -> "H5F"
        const family = code.split(/[\s,]+/)[0];
        if (family && family.length >= 2) {
          if (!renaultByFamily[family]) {
            renaultByFamily[family] = [];
          }
          renaultByFamily[family].push(engine);
        }
      });
    }
    
    // Store by name for fuzzy matching
    renaultByName.push(engine);
  });
});

function hasFluidData(engine) {
  return engine.brakeFluidType !== null || 
         engine.coolantType !== null || 
         engine.gearboxOilType !== null || 
         engine.gearboxOilCapacity !== null;
}

function findBestMatch(daciaEngine) {
  const candidates = [];
  const daciaCode = daciaEngine.engineCode;
  const daciaName = (daciaEngine.engineName || '').toLowerCase();
  const daciaHp = daciaEngine.hp;
  
  // 1. Try exact engine code match
  if (daciaCode) {
    // Handle multiple codes
    const codes = daciaCode.split(',').map(c => c.trim());
    for (const code of codes) {
      if (renaultByCode[code]) {
        const match = renaultByCode[code];
        if (hasFluidData(match)) {
          candidates.push({ engine: match, score: 100, method: 'exact-code' });
        }
      }
    }
    
    // 2. Also try matching by individual code components
    // e.g., "K9K U8" -> match entries with code starting with "K9K"
    for (const code of codes) {
      const family = code.split(/[\s,]+/)[0];
      if (family && renaultByFamily[family]) {
        // Find best match by hp proximity
        let bestMatch = null;
        let bestDiff = Infinity;
        for (const candidate of renaultByFamily[family]) {
          if (hasFluidData(candidate) && candidate.hp) {
            const diff = Math.abs(candidate.hp - daciaHp);
            if (diff < bestDiff) {
              bestDiff = diff;
              bestMatch = candidate;
            }
          }
        }
        if (bestMatch) {
          candidates.push({ engine: bestMatch, score: 80 - (bestDiff * 2), method: `family-${family}-hp` });
        }
      }
    }
  }
  
  // 3. Try name-based matching
  // Extract key identifying info from name
  const nameKeywords = daciaName
    .replace(/\([^)]*\)/g, '') // remove parenthetical content
    .replace(/[0-9]{1,2}\s*(seat|hp)/gi, '') // remove "7 Seat", "110 Hp" etc
    .split(/[\s,]+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w))
    .join(' ');
  
  // Search renault engines by name similarity
  for (const renaultEngine of renaultByName) {
    if (!hasFluidData(renaultEngine)) continue;
    const renaultName = (renaultEngine.engineName || '').toLowerCase();
    
    // Check if same base engine family description
    const renaultClean = renaultName
      .replace(/\([^)]*\)/g, '')
      .replace(/[0-9]{1,2}\s*(seat|hp)/gi, '')
      .trim();
    
    // Simple similarity: count matching words
    const renaultWords = renaultClean.split(/\s+/);
    const matchCount = renaultWords.filter(w => w.length > 2 && nameKeywords.includes(w)).length;
    const wordRatio = matchCount / Math.max(renaultWords.length, 1);
    
    if (wordRatio >= 0.4 && matchCount >= 2) {
      candidates.push({ engine: renaultEngine, score: Math.round(50 + wordRatio * 30), method: 'name' });
    }
  }
  
  // Return best candidate
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

// Fields to potentially fill
const fluidFields = ['brakeFluidType', 'coolantType', 'gearboxOilType', 'gearboxOilCapacity'];

let stats = {
  modelsProcessed: 0,
  enginesWithNulls: 0,
  filled: { brakeFluidType: 0, coolantType: 0, gearboxOilType: 0, gearboxOilCapacity: 0 },
  unmatched: 0,
  matchByMethod: {}
};

dacia.models.forEach(model => {
  if (!Array.isArray(model.engines)) return;
  stats.modelsProcessed++;
  
  model.engines.forEach(engine => {
    // Check which fluid fields are null
    const nullFields = fluidFields.filter(f => engine[f] === null);
    if (nullFields.length === 0) return;
    
    stats.enginesWithNulls++;
    
    const match = findBestMatch(engine);
    if (!match) {
      stats.unmatched++;
      return;
    }
    
    // Track match method
    stats.matchByMethod[match.method] = (stats.matchByMethod[match.method] || 0) + 1;
    
    nullFields.forEach(field => {
      if (match.engine[field] !== null && match.engine[field] !== undefined) {
        engine[field] = match.engine[field];
        stats.filled[field]++;
      }
    });
  });
});

// Write output
fs.writeFileSync(daciaPath, JSON.stringify(dacia, null, 2) + '\n');

console.log('=== DACIA FLUIDS FILLED FROM RENAULT ===');
console.log(`Models processed: ${stats.modelsProcessed}`);
console.log(`Engines with nulls: ${stats.enginesWithNulls}`);
console.log(`Unmatched: ${stats.unmatched}`);
console.log(`Total filled:`);
console.log(`  brakeFluidType:     ${stats.filled.brakeFluidType}`);
console.log(`  coolantType:        ${stats.filled.coolantType}`);
console.log(`  gearboxOilType:     ${stats.filled.gearboxOilType}`);
console.log(`  gearboxOilCapacity: ${stats.filled.gearboxOilCapacity}`);
console.log(`\nMatch methods:`);
Object.entries(stats.matchByMethod)
  .sort((a, b) => b[1] - a[1])
  .forEach(([method, count]) => {
    console.log(`  ${method}: ${count}`);
  });

// Quick verification sample
const verify = JSON.parse(fs.readFileSync(daciaPath, 'utf8'));
let remainingNulls = { brakeFluidType: 0, coolantType: 0, gearboxOilType: 0, gearboxOilCapacity: 0 };
verify.models.forEach(m => {
  if (!Array.isArray(m.engines)) return;
  m.engines.forEach(e => {
    fluidFields.forEach(f => {
      if (e[f] === null) remainingNulls[f]++;
    });
  });
});
console.log(`\nRemaining nulls:`);
fluidFields.forEach(f => {
  console.log(`  ${f}: ${remainingNulls[f]}`);
});