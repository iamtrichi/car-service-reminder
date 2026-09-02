/**
 * Fix all null engineCodes and duplicate engineCode+hp combos across ALL make files.
 *
 * Strategy:
 * 1. Null engineCodes: find a matching engine from the same make (displacement+fuel),
 *    generate unique code: {baseCode}-{hp}-{first11charsOfName}
 * 2. Duplicates: append -A, -B, -C etc. within each model
 * 3. Electric vehicles: extract hp from engine name when hp field is null
 *
 * Run: node scripts/fix-all-enginecodes.cjs
 * Output: scripts/enginecode-fix-report.md
 */
const fs = require('fs');
const path = require('path');

const MAKES_DIR = path.join(__dirname, '..', 'public', 'config', 'makes');
const REPORT_PATH = path.join(__dirname, 'enginecode-fix-report.md');

// ===== Collect all make files =====
const makeFiles = fs.readdirSync(MAKES_DIR)
  .filter(f => f.endsWith('.json') && f !== 'all-makes-models.json' && f !== 'missing-models-report.json');

// ===== Helpers =====

/** Extract hp from engine name like "52 kWh (150 Hp) Electric" */
function extractHpFromName(name) {
  if (!name) return null;
  const match = name.match(/\((\d+)\s*Hp\)/i);
  return match ? parseInt(match[1]) : null;
}

/** Take first 11 chars of a string, replace spaces with hyphens */
function first11(name) {
  return (name || '').substring(0, 11).replace(/\s+/g, '-');
}

/** Build a lookup of all known engine codes by make for displacement+fuel matching */
function buildEngineLookup(allMakesData) {
  // Per-make lookup: makeName -> [{code, displacement, fuelType, hp, name}]
  const perMake = {};
  // Global lookup across all makes
  const global = [];

  for (const { makeName, data } of allMakesData) {
    if (!data.models || !Array.isArray(data.models)) continue;
    const makeEntries = [];
    for (const model of data.models) {
      if (!model.engines || !Array.isArray(model.engines)) continue;
      for (const eng of model.engines) {
        if (!eng.engineCode) continue;
        const entry = {
          code: eng.engineCode,
          displacement: eng.displacement,
          fuelType: eng.fuelType,
          hp: eng.hp,
          name: eng.engineName,
          make: makeName,
          model: model.name,
        };
        makeEntries.push(entry);
        global.push(entry);
      }
    }
    perMake[makeName] = makeEntries;
  }

  return { perMake, global };
}

/** Find the best base code for a null engineCode entry */
function findBaseCode(engine, lookup) {
  const { perMake, global } = lookup;
  const makeEntries = perMake[engine.make] || [];

  // Try same make first: match by displacement + fuelType
  const sameMakeCandidates = makeEntries.filter(e =>
    engine.displacement && e.displacement === engine.displacement &&
    engine.fuelType && e.fuelType === engine.fuelType
  );

  if (sameMakeCandidates.length > 0) {
    sameMakeCandidates.sort((a, b) => Math.abs((a.hp || 0) - (engine.hp || 0)) - Math.abs((b.hp || 0) - (engine.hp || 0)));
    return sameMakeCandidates[0].code;
  }

  // Try same make by displacement only
  const dispMatch = makeEntries.filter(e =>
    engine.displacement && e.displacement === engine.displacement
  );
  if (dispMatch.length > 0) {
    dispMatch.sort((a, b) => Math.abs((a.hp || 0) - (engine.hp || 0)) - Math.abs((b.hp || 0) - (engine.hp || 0)));
    return dispMatch[0].code;
  }

  // Try same make by fuel type
  const fuelMatch = makeEntries.filter(e =>
    engine.fuelType && e.fuelType === engine.fuelType
  );
  if (fuelMatch.length > 0) {
    fuelMatch.sort((a, b) => Math.abs((a.hp || 0) - (engine.hp || 0)) - Math.abs((b.hp || 0) - (engine.hp || 0)));
    return fuelMatch[0].code;
  }

  // Global fallback: match by displacement + fuel
  const globalCandidates = global.filter(e =>
    engine.displacement && e.displacement === engine.displacement &&
    engine.fuelType && e.fuelType === engine.fuelType
  );
  if (globalCandidates.length > 0) {
    globalCandidates.sort((a, b) => Math.abs((a.hp || 0) - (engine.hp || 0)) - Math.abs((b.hp || 0) - (engine.hp || 0)));
    return globalCandidates[0].code;
  }

  // Heuristic by name patterns
  const name = (engine.engineName || '').toLowerCase();
  if (name.includes('electric') || name.includes('kwh') || name.includes('bev') || name.includes('ev')) {
    if (name.includes('30 kwh') || name.includes('5.5 kwh')) return 'E110';
    return 'R110';
  }
  if (name.includes('v6')) return 'L7X';
  if (name.includes('v8')) return 'AJV';
  if (name.includes('2.2')) return 'J7T';
  if (name.includes('2.0')) return 'J6R';
  if (name.includes('1.8')) return 'F3P';
  if (name.includes('1.6')) return 'K4M';
  if (name.includes('1.5')) return 'K9K';
  if (name.includes('1.4')) return 'C2J';
  if (name.includes('1.3')) return 'H5H';
  if (name.includes('1.2')) return 'D4F';
  if (name.includes('1.1')) return 'C1E';
  if (name.includes('1.0')) return 'D4D';
  if (name.includes('0.7') || name.includes('0.66')) return '3G83';
  if (name.includes('hydrogen') || name.includes('fcev')) return 'FC1';

  return 'UNK';
}

// ===== MAIN =====

console.log('Loading all make files...\n');

// Load all make data
const allMakesData = makeFiles.map(file => {
  const data = JSON.parse(fs.readFileSync(path.join(MAKES_DIR, file), 'utf8'));
  const makeName = data.make || data.name || file.replace('.json', '');
  return { file, data, makeName };
 });

// Build lookup
const lookup = buildEngineLookup(allMakesData);
console.log(`Engine lookup built: ${Object.keys(lookup.perMake).length} makes, ${lookup.global.length} known engine codes\n`);

// Track changes for report
const reportLines = [];
let totalNullFixed = 0;
let totalDupeFixed = 0;
let filesModified = 0;

reportLines.push('# Engine Code Fix Report\n');
reportLines.push(`Generated: ${new Date().toISOString()}\n`);

for (const { file, data, makeName } of allMakesData) {
  if (!data.models || !Array.isArray(data.models)) continue;

  const makeChanges = [];
  let makeNullFixed = 0;
  let makeDupeFixed = 0;

  for (const model of data.models) {
    if (!model.engines || !Array.isArray(model.engines)) continue;

    // === Fix null engineCodes ===
    for (const engine of model.engines) {
      if (engine.engineCode !== null) continue;

      // Resolve hp: use hp field, or extract from name for electrics
      let hp = engine.hp;
      if (hp === null || hp === undefined) {
        hp = extractHpFromName(engine.engineName);
        if (hp !== null) {
          engine.hp = hp;
        }
      }

      const baseCode = findBaseCode({ ...engine, make: makeName }, lookup);
      const hpVal = hp || 0;
      const namePart = first11(engine.engineName);
      const newCode = `${baseCode}-${hpVal}-${namePart}`;

      makeChanges.push({
        model: model.name,
        engineName: engine.engineName || '',
        hp: hpVal,
        before: 'null',
        after: newCode,
        type: 'null_fix',
      });

      engine.engineCode = newCode;
      makeNullFixed++;
    }

    // === Fix duplicate engineCode+hp combos ===
    const groups = {};
    for (let i = 0; i < model.engines.length; i++) {
      const eng = model.engines[i];
      const key = `${eng.engineCode}|${eng.hp}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(i);
    }

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const [key, indices] of Object.entries(groups)) {
      if (indices.length <= 1) continue;

      for (let j = 1; j < indices.length; j++) {
        const eng = model.engines[indices[j]];
        const oldCode = eng.engineCode;
        const suffix = letters[j] || `${j + 1}`;
        const newCode = `${oldCode}-${suffix}`;

        makeChanges.push({
          model: model.name,
          engineName: eng.engineName || '',
          hp: eng.hp || 0,
          before: oldCode,
          after: newCode,
          type: 'dupe_fix',
        });

        eng.engineCode = newCode;
        makeDupeFixed++;
      }
    }
  }

  // Write modified file if changes were made
  if (makeChanges.length > 0) {
    fs.writeFileSync(path.join(MAKES_DIR, file), JSON.stringify(data, null, 2) + '\n');
    filesModified++;

    totalNullFixed += makeNullFixed;
    totalDupeFixed += makeDupeFixed;

    // Report section
    reportLines.push(`## ${makeName}\n`);

    if (makeNullFixed > 0) {
      reportLines.push(`### Null engineCodes fixed (${makeNullFixed})\n`);
      reportLines.push('| Model | Engine Name | HP | Before | After |');
      reportLines.push('|---|---|---|---|---|');
      for (const c of makeChanges.filter(c => c.type === 'null_fix')) {
        reportLines.push(`| ${c.model} | ${c.engineName} | ${c.hp} | \`${c.before}\` | \`${c.after}\` |`);
      }
      reportLines.push('');
    }

    if (makeDupeFixed > 0) {
      reportLines.push(`### Duplicate engineCode+hp combos fixed (${makeDupeFixed})\n`);
      reportLines.push('| Model | Engine Name | HP | Before | After |');
      reportLines.push('|---|---|---|---|---|');
      for (const c of makeChanges.filter(c => c.type === 'dupe_fix')) {
        reportLines.push(`| ${c.model} | ${c.engineName} | ${c.hp} | \`${c.before}\` | \`${c.after}\` |`);
      }
      reportLines.push('');
    }

    console.log(`${makeName}: ${makeNullFixed} null fixed, ${makeDupeFixed} dupes fixed`);
  }
}

// ===== Verification =====
console.log('\n=== VERIFICATION ===\n');

let remainingNulls = 0;
let remainingDupes = 0;

for (const { file, data, makeName } of allMakesData) {
  if (!data.models || !Array.isArray(data.models)) continue;
  for (const model of data.models) {
    if (!model.engines || !Array.isArray(model.engines)) continue;
    for (const eng of model.engines) {
      if (eng.engineCode === null) {
        console.log(`[STILL NULL] ${makeName} > ${model.name} > ${eng.engineName}`);
        remainingNulls++;
      }
    }
    const seen = {};
    for (const eng of model.engines) {
      const k = `${eng.engineCode}|${eng.hp}`;
      if (!seen[k]) seen[k] = 0;
      seen[k]++;
    }
    for (const [k, c] of Object.entries(seen)) {
      if (c > 1) {
        console.log(`[STILL DUPE] ${makeName} > ${model.name} | ${k} | count: ${c}`);
        remainingDupes++;
      }
    }
  }
}

console.log(`\nRemaining nulls: ${remainingNulls}`);
console.log(`Remaining duplicate groups: ${remainingDupes}`);

// ===== Write report =====
// Build final report: header + summary + per-make sections
const finalReport = [
  '# Engine Code Fix Report\n',
  `Generated: ${new Date().toISOString()}\n`,
  '## Summary\n',
  `- **Make files modified**: ${filesModified}`,
  `- **Null engineCodes fixed**: ${totalNullFixed}`,
  `- **Duplicate engineCode+hp combos fixed**: ${totalDupeFixed}`,
  `- **Total changes**: ${totalNullFixed + totalDupeFixed}`,
  `- **Remaining nulls**: ${remainingNulls}`,
  `- **Remaining duplicate groups**: ${remainingDupes}`,
  '',
  ...reportLines,
];

fs.writeFileSync(REPORT_PATH, finalReport.join('\n'));
console.log(`\nReport written to: ${REPORT_PATH}`);
console.log(`\nDone: ${filesModified} files modified, ${totalNullFixed + totalDupeFixed} total changes.`);
