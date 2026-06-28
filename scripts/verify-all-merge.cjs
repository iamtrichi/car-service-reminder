const fs = require('fs');
const path = require('path');
const MAKES_DIR = path.join(__dirname, '..', 'public', 'config', 'makes');

const files = fs.readdirSync(MAKES_DIR)
  .filter(f => f.endsWith('.json') && !f.includes('.backup') && !f.endsWith('all-makes-models.json') && !f.endsWith('missing-models-report.json'));

console.log('=== VERIFICATION: Checking integrity of all make files ===\n');
let totalErrors = 0;
let filesChecked = 0;

for (const file of files) {
  const filePath = path.join(MAKES_DIR, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    
    if (!data.make) {
      console.log(`ERROR (${file}): Missing "make" field`);
      totalErrors++;
    }
    if (!data.models || !Array.isArray(data.models)) {
      console.log(`ERROR (${file}): Missing or invalid "models" array`);
      totalErrors++;
      continue;
    }

    // Check for duplicate names
    const names = data.models.map(m => m.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      console.log(`ERROR (${file}): ${names.length - uniqueNames.size} duplicate model names`);
      totalErrors++;
    }

    filesChecked++;
  } catch (err) {
    console.log(`ERROR (${file}): ${err.message}`);
    totalErrors++;
  }
}

console.log(`\nChecked ${filesChecked} files. Total errors: ${totalErrors}`);