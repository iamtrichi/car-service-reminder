#!/usr/bin/env node
/**
 * Cleanup script: Remove all engines with null data from audi.json and toyota.json
 * Keeps only engines that have at least one valid field (engineCode, hp, or engineName)
 */
const fs = require('fs');
const path = require('path');

const MAKES_DIR = __dirname;

function cleanMakeFile(filename) {
  const filePath = path.join(MAKES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(filename + ' not found, skipping');
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const beforeModels = data.models.length;
  const beforeEngines = data.models.reduce((sum, m) => sum + m.engines.length, 0);

  // Remove null engines from each model
  data.models.forEach(model => {
    model.engines = model.engines.filter(e =>
      e.hp !== null || e.engineCode !== null || (e.engineName && e.engineName.length > 0)
    );
  });

  // Remove models with no engines
  data.models = data.models.filter(m => m.engines.length > 0);

  const afterModels = data.models.length;
  const afterEngines = data.models.reduce((sum, m) => sum + m.engines.length, 0);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(filename + ':');
  console.log('  Models: ' + beforeModels + ' -> ' + afterModels);
  console.log('  Engines: ' + beforeEngines + ' -> ' + afterEngines);
  console.log('  Removed: ' + (beforeEngines - afterEngines) + ' null engines');
}

console.log('=== Cleaning up null engines ===\n');
cleanMakeFile('audi.json');
console.log('');
cleanMakeFile('toyota.json');
console.log('\n=== Done ===');