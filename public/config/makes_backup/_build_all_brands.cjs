#!/usr/bin/env node
/**
 * Maps auto-data.net brand URLs to our app's make files.
 * Reads auto_data_brands.json and all-makes-models.json, does fuzzy matching,
 * and outputs a full TARGETS config for the scraper.
 */
const fs = require('fs');
const path = require('path');

const MAKES_DIR = __dirname;

function norm(s) {
  return s.toLowerCase()
    .replace(/ë/g, 'e').replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e')
    .replace(/à/g, 'a').replace(/â/g, 'a').replace(/ä/g, 'a')
    .replace(/ô/g, 'o').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/û/g, 'u')
    .replace(/î/g, 'i').replace(/ï/g, 'i')
    .replace(/ç/g, 'c').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Load auto-data brands
const autoBrands = JSON.parse(fs.readFileSync(path.join(MAKES_DIR, '_autodata_cache', 'auto_data_brands.json'), 'utf8'));

// Load our makes index
const allMakes = JSON.parse(fs.readFileSync(path.join(MAKES_DIR, 'all-makes-models.json'), 'utf8'));

// Also add brands not in all-makes-models.json but available on auto-data.net
// (Tesla, Honda, Ford, BMW, etc. are in all-makes already)

const targets = [];
const matched = [];
const notFound = [];

for (const make of allMakes.makes) {
  const appName = make.make;
  const appNorm = norm(appName);

  // Try exact match
  let bestMatch = null;
  let bestScore = 0;

  for (const brand of autoBrands) {
    const brandNorm = norm(brand.name);

    // Exact match
    if (appNorm === brandNorm) {
      bestMatch = brand;
      bestScore = 100;
      break;
    }

    // Check if one contains the other
    if (appNorm.includes(brandNorm) || brandNorm.includes(appNorm)) {
      const score = Math.min(appNorm.length, brandNorm.length) / Math.max(appNorm.length, brandNorm.length) * 50;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = brand;
      }
    }
  }

  if (bestMatch && bestScore >= 30) {
    targets.push({
      appFile: make.file,
      adBrandName: bestMatch.name,
      adBrandUrl: bestMatch.url
    });
    matched.push({ appName, autoDataName: bestMatch.name, score: bestScore.toFixed(0) });
  } else {
    notFound.push(appName);
  }
}

// Also add auto-data brands that we don't have yet
const matchedAutoNorms = new Set(targets.map(t => norm(t.adBrandName)));
const newBrands = autoBrands.filter(b => {
  const bn = norm(b.name);
  // Skip if we already have it
  if (matchedAutoNorms.has(bn)) return false;
  // Only include known mainstream brands (skip obscure ones)
  return true;
});

console.log('=== Brand Mapping Results ===\n');
console.log('Matched (' + targets.length + '):');
matched.forEach(m => console.log('  ' + m.appName + ' -> ' + m.autoDataName + ' (score: ' + m.score + ')'));

console.log('\nNot found on auto-data.net (' + notFound.length + '):');
notFound.forEach(n => console.log('  ' + n));

console.log('\nNew brands available on auto-data.net but not in app (' + newBrands.length + '):');
newBrands.forEach(b => console.log('  ' + b.name));

// Save targets config
const outputPath = path.join(MAKES_DIR, '_autodata_cache', 'all_brands_targets.json');
fs.writeFileSync(outputPath, JSON.stringify(targets, null, 2));
console.log('\nSaved ' + targets.length + ' targets to ' + outputPath);

// Save full report
const reportPath = path.join(MAKES_DIR, '_autodata_cache', 'brand_mapping_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  matched,
  notFound,
  newBrands: newBrands.map(b => ({ name: b.name, url: b.url })),
  totalCount: targets.length
}, null, 2));
console.log('Saved full report to ' + reportPath);