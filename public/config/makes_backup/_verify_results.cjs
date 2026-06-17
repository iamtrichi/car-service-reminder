#!/usr/bin/env node
const fs = require('fs');

console.log('=== Audi ===');
const audi = JSON.parse(fs.readFileSync('audi.json', 'utf8'));
console.log('Total models:', audi.models.length);
audi.models.slice(0, 10).forEach(m => {
  console.log('  ' + m.name + ' - years: [' + m.years.join(', ') + '] - engines: ' + m.engines.length);
});
console.log('...');
audi.models.filter(m => m.name.includes('A3')).forEach(m => {
  console.log('  ' + m.name + ' - years: [' + m.years.join(', ') + '] - engines: ' + m.engines.length);
});

console.log('\n=== Toyota ===');
const toyota = JSON.parse(fs.readFileSync('toyota.json', 'utf8'));
console.log('Total models:', toyota.models.length);
toyota.models.filter(m => m.name.includes('RAV4')).forEach(m => {
  console.log('  ' + m.name + ' - years: [' + m.years.join(', ') + '] - engines: ' + m.engines.length);
});
console.log('...');
toyota.models.filter(m => m.name.includes('Corolla')).slice(0, 15).forEach(m => {
  console.log('  ' + m.name + ' - years: [' + m.years.join(', ') + '] - engines: ' + m.engines.length);
});

// Show a sample engine
const rav4 = toyota.models.find(m => m.name.includes('RAV4 I'));
if (rav4 && rav4.engines.length > 0) {
  console.log('\n=== Sample: RAV4 I first engine ===');
  console.log(JSON.stringify(rav4.engines[0], null, 2));
}

// Count total engines
const audiEngines = audi.models.reduce((s, m) => s + m.engines.length, 0);
const toyotaEngines = toyota.models.reduce((s, m) => s + m.engines.length, 0);
console.log('\n=== Summary ===');
console.log('Audi: ' + audi.models.length + ' models, ' + audiEngines + ' engines');
console.log('Toyota: ' + toyota.models.length + ' models, ' + toyotaEngines + ' engines');