const data = require('../public/config/makes/hyundai.json');

console.log('Total models:', data.models.length);
console.log('');

// Check key merged groups
function check(name) {
  const m = data.models.filter(x => x.name.startsWith(name));
  if (m.length > 0) {
    m.forEach(mm => {
      const yrs = mm.years.length > 0 ? Math.min(...mm.years)+'-'+Math.max(...mm.years) : 'none';
      console.log('  "' + mm.name + '" → ' + yrs + ', engines: ' + mm.engines.length);
    });
  }
  console.log('');
}

console.log('=== Elantra III models ===');
check('Elantra III');

console.log('=== Hatchback ===');
check('Elantra III Hatchback');

console.log('=== Bayon ===');
check('Bayon');

console.log('=== Veloster ===');
check('Veloster');

console.log('=== Venue ===');
check('Venue');

// Check duplicates
console.log('=== Checking for duplicate engine codes in models ===');
let dupCount = 0;
for (const model of data.models) {
  const codes = model.engines.map(e => e.engineCode).filter(c => c !== null && c !== undefined);
  const seen = new Set();
  for (const code of codes) {
    if (seen.has(code)) {
      console.log('Duplicate engine code "' + code + '" found in:', model.name);
      dupCount++;
      break;
    }
    seen.add(code);
  }
}
console.log('Models with duplicate engine codes:', dupCount);