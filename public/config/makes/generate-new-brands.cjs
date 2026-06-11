#!/usr/bin/env node
// Generate new brand JSON files for brands not yet in the app
// This adds brands from automobile.tn that are missing from car-service-reminder
// Usage: node public/config/makes/generate-new-brands.cjs

const fs = require('fs');
const path = require('path');
const MAKES_DIR = __dirname;

// 25 new brands from automobile.tn not in the app
// Models are based on known Tunisian market offerings
const NEW_BRANDS = {
  "Avantier": [
    { name: "Avantier A3", engines: [{ engineCode: "A3-15", engineName: "1.5L Turbo", hp: 160, fuelType: "Gasoline", isTurbo: true, displacement: "1.5L" }] }
  ],
  "Bako": [
    { name: "Bako Base", engines: [{ engineCode: "B1", engineName: "1.2L", hp: 80, fuelType: "Gasoline", isTurbo: false, displacement: "1.2L" }] }
  ],
  "Cenntro": [
    { name: "Cenntro Logistar", engines: [{ engineCode: "CENN-ELEC", engineName: "Electric Motor", hp: 80, fuelType: "Electric", isTurbo: false, displacement: "0L" }] }
  ],
  "Changan": [
    { name: "Changan Alsvin", engines: [{ engineCode: "CA-15", engineName: "1.5L Blue Core", hp: 105, fuelType: "Gasoline", isTurbo: false, displacement: "1.5L" }] },
    { name: "Changan CS35 Plus", engines: [{ engineCode: "CC-14T", engineName: "1.4T Blue Core", hp: 156, fuelType: "Gasoline", isTurbo: true, displacement: "1.4L" }] },
    { name: "Changan CS75", engines: [{ engineCode: "CC-15T", engineName: "1.5T Blue Core", hp: 180, fuelType: "Gasoline", isTurbo: true, displacement: "1.5L" }] }
  ],
  "Deepal": [
    { name: "Deepal SL03", engines: [{ engineCode: "DP-ELEC", engineName: "Electric Motor", hp: 218, fuelType: "Electric", isTurbo: false, displacement: "0L" }] },
    { name: "Deepal S7", engines: [{ engineCode: "DP-ELEC2", engineName: "Electric Motor", hp: 238, fuelType: "Electric", isTurbo: false, displacement: "0L" }] }
  ],
  "DFSK": [
    { name: "DFSK Glory 330", engines: [{ engineCode: "DFSK-15", engineName: "1.5L", hp: 115, fuelType: "Gasoline", isTurbo: false, displacement: "1.5L" }] },
    { name: "DFSK Glory 380", engines: [{ engineCode: "DFSK-15T", engineName: "1.5T", hp: 150, fuelType: "Gasoline", isTurbo: true, displacement: "1.5L" }] },
    { name: "DFSK Seres 3", engines: [{ engineCode: "DFSK-ELEC", engineName: "Electric Motor", hp: 163, fuelType: "Electric", isTurbo: false, displacement: "0L" }] }
  ],
  "Dongfeng": [
    { name: "Dongfeng S30", engines: [{ engineCode: "DFM-16", engineName: "1.6L", hp: 115, fuelType: "Gasoline", isTurbo: false, displacement: "1.6L" }] },
    { name: "Dongfeng AX7", engines: [{ engineCode: "DFM-15T", engineName: "1.5T", hp: 150, fuelType: "Gasoline", isTurbo: true, displacement: "1.5L" }] }
  ],
  "FAW": [
    { name: "FAW Bestune", engines: [{ engineCode: "FAW-15", engineName: "1.5L", hp: 120, fuelType: "Gasoline", isTurbo: false, displacement: "1.5L" }] },
    { name: "FAW X40", engines: [{ engineCode: "FAW-16", engineName: "1.6L", hp: 115, fuelType: "Gasoline", isTurbo: false, displacement: "1.6L" }] }
  ],
  "Foday": [
    { name: "Foday Landfort", engines: [{ engineCode: "FD-20", engineName: "2.0L", hp: 136, fuelType: "Gasoline", isTurbo: false, displacement: "2.0L" }] }
  ],
  "Foton": [
    { name: "Foton Tunland", engines: [{ engineCode: "FT-20D", engineName: "2.0T Diesel", hp: 150, fuelType: "Diesel", isTurbo: true, displacement: "2.0L" }] }
  ],
  "GAC": [
    { name: "GAC GS3 Emzoom", engines: [{ engineCode: "GAC-15T", engineName: "1.5T", hp: 177, fuelType: "Gasoline", isTurbo: true, displacement: "1.5L" }] },
    { name: "GAC GS4", engines: [{ engineCode: "GAC-15", engineName: "1.5L", hp: 150, fuelType: "Gasoline", isTurbo: true, displacement: "1.5L" }] },
    { name: "GAC GS8", engines: [{ engineCode: "GAC-20T", engineName: "2.0T", hp: 250, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] }
  ],
  "Geely": [
    { name: "Geely Coolray", engines: [{ engineCode: "GL-13T", engineName: "1.3T", hp: 140, fuelType: "Gasoline", isTurbo: true, displacement: "1.3L" }] },
    { name: "Geely Tugella", engines: [{ engineCode: "GL-20T", engineName: "2.0T", hp: 236, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] },
    { name: "Geely Monjaro", engines: [{ engineCode: "GL-20TH", engineName: "2.0T Hybrid", hp: 238, fuelType: "Hybrid", isTurbo: true, displacement: "2.0L" }] },
    { name: "Geely Okavango", engines: [{ engineCode: "GL-13T2", engineName: "1.3T", hp: 130, fuelType: "Gasoline", isTurbo: true, displacement: "1.3L" }] }
  ],
  "IM Motors": [
    { name: "IM L7", engines: [{ engineCode: "IM-ELEC", engineName: "Electric Dual Motor", hp: 536, fuelType: "Electric", isTurbo: false, displacement: "0L" }] }
  ],
  "JAC": [
    { name: "JAC J7", engines: [{ engineCode: "JAC-15", engineName: "1.5L", hp: 110, fuelType: "Gasoline", isTurbo: false, displacement: "1.5L" }] },
    { name: "JAC S3", engines: [{ engineCode: "JAC-15", engineName: "1.5L", hp: 110, fuelType: "Gasoline", isTurbo: false, displacement: "1.5L" }] },
    { name: "JAC T8", engines: [{ engineCode: "JAC-20D", engineName: "2.0T Diesel", hp: 140, fuelType: "Diesel", isTurbo: true, displacement: "2.0L" }] }
  ],
  "Jaguar": [
    { name: "Jaguar E-Pace", engines: [{ engineCode: "JAG-20T", engineName: "2.0T Ingenium", hp: 200, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] },
    { name: "Jaguar F-Pace", engines: [{ engineCode: "JAG-20T", engineName: "2.0T Ingenium", hp: 250, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] },
    { name: "Jaguar I-Pace", engines: [{ engineCode: "JAG-ELEC", engineName: "Electric Motor", hp: 395, fuelType: "Electric", isTurbo: false, displacement: "0L" }] },
    { name: "Jaguar XE", engines: [{ engineCode: "JAG-20TXE", engineName: "2.0T Ingenium", hp: 200, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] },
    { name: "Jaguar XF", engines: [{ engineCode: "JAG-20TXF", engineName: "2.0T Ingenium", hp: 250, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] }
  ],
  "JMC": [
    { name: "JMC Vigus", engines: [{ engineCode: "JMC-20D", engineName: "2.0T Diesel", hp: 140, fuelType: "Diesel", isTurbo: true, displacement: "2.0L" }] }
  ],
  "JMEV": [
    { name: "JMEV Yi", engines: [{ engineCode: "JMEV-ELEC", engineName: "Electric Motor", hp: 60, fuelType: "Electric", isTurbo: false, displacement: "0L" }] }
  ],
  "Land Rover": [
    { name: "Range Rover Velar", engines: [{ engineCode: "LR-20T", engineName: "2.0T Ingenium", hp: 250, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }, { engineCode: "LR-30T", engineName: "3.0T Ingenium MHEV", hp: 400, fuelType: "MHEV", isTurbo: true, displacement: "3.0L" }] },
    { name: "Range Rover Evoque", engines: [{ engineCode: "LR-20TE", engineName: "2.0T Ingenium", hp: 200, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] },
    { name: "Land Rover Discovery Sport", engines: [{ engineCode: "LR-20TD", engineName: "2.0T Ingenium", hp: 200, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] },
    { name: "Land Rover Defender", engines: [{ engineCode: "LR-20TDEF", engineName: "2.0T Ingenium", hp: 300, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }, { engineCode: "LR-30TDEF", engineName: "3.0T Ingenium MHEV", hp: 400, fuelType: "MHEV", isTurbo: true, displacement: "3.0L" }] }
  ],
  "Lynk & Co": [
    { name: "Lynk & Co 01", engines: [{ engineCode: "LK-20T", engineName: "2.0T", hp: 190, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] },
    { name: "Lynk & Co 06", engines: [{ engineCode: "LK-13T", engineName: "1.3T Hybrid", hp: 180, fuelType: "Hybrid", isTurbo: true, displacement: "1.3L" }] }
  ],
  "Omoda & Jaecoo": [
    { name: "Omoda 5", engines: [{ engineCode: "OM-16T", engineName: "1.6T", hp: 197, fuelType: "Gasoline", isTurbo: true, displacement: "1.6L" }] },
    { name: "Omoda C5", engines: [{ engineCode: "OM-15T", engineName: "1.5T", hp: 156, fuelType: "Gasoline", isTurbo: true, displacement: "1.5L" }] },
    { name: "Jaecoo J7", engines: [{ engineCode: "JC-16T", engineName: "1.6T", hp: 197, fuelType: "Gasoline", isTurbo: true, displacement: "1.6L" }] }
  ],
  "Porsche": [
    { name: "Cayenne", engines: [{ engineCode: "PC-30T", engineName: "3.0T V6", hp: 340, fuelType: "Gasoline", isTurbo: true, displacement: "3.0L" }, { engineCode: "PC-40T", engineName: "4.0T V8", hp: 550, fuelType: "Gasoline", isTurbo: true, displacement: "4.0L" }] },
    { name: "Macan", engines: [{ engineCode: "PM-20T", engineName: "2.0T", hp: 265, fuelType: "Gasoline", isTurbo: true, displacement: "2.0L" }] },
    { name: "Panamera", engines: [{ engineCode: "PP-30T", engineName: "3.0T V6", hp: 330, fuelType: "Gasoline", isTurbo: true, displacement: "3.0L" }] },
    { name: "Taycan", engines: [{ engineCode: "PT-ELEC", engineName: "Electric Motor", hp: 402, fuelType: "Electric", isTurbo: false, displacement: "0L" }] }
  ],
  "Ssangyong": [
    { name: "Ssangyong Tivoli", engines: [{ engineCode: "SS-16", engineName: "1.6L", hp: 128, fuelType: "Gasoline", isTurbo: false, displacement: "1.6L" }] },
    { name: "Ssangyong Korando", engines: [{ engineCode: "SS-16T", engineName: "1.6T", hp: 163, fuelType: "Gasoline", isTurbo: true, displacement: "1.6L" }] },
    { name: "Ssangyong Rexton", engines: [{ engineCode: "SS-20D", engineName: "2.2T Diesel", hp: 202, fuelType: "Diesel", isTurbo: true, displacement: "2.2L" }] }
  ],
  "Tata": [
    { name: "Tata Altroz", engines: [{ engineCode: "TATA-12", engineName: "1.2L Revotron", hp: 86, fuelType: "Gasoline", isTurbo: false, displacement: "1.2L" }] },
    { name: "Tata Tigor", engines: [{ engineCode: "TATA-12T", engineName: "1.2L Revotron", hp: 85, fuelType: "Gasoline", isTurbo: false, displacement: "1.2L" }] },
    { name: "Tata Punch", engines: [{ engineCode: "TATA-12P", engineName: "1.2L Revotron", hp: 87, fuelType: "Gasoline", isTurbo: false, displacement: "1.2L" }] },
    { name: "Tata Curvv", engines: [{ engineCode: "TATA-12C", engineName: "1.2L Turbo", hp: 120, fuelType: "Gasoline", isTurbo: true, displacement: "1.2L" }] }
  ],
  "Wallyscar": [
    { name: "Wallyscar Iris", engines: [{ engineCode: "WS-16", engineName: "1.6L", hp: 110, fuelType: "Gasoline", isTurbo: false, displacement: "1.6L" }] }
  ],
  "Xpeng": [
    { name: "Xpeng G3", engines: [{ engineCode: "XP-ELEC", engineName: "Electric Motor", hp: 197, fuelType: "Electric", isTurbo: false, displacement: "0L" }] },
    { name: "Xpeng P5", engines: [{ engineCode: "XP-ELEC-P5", engineName: "Electric Motor", hp: 211, fuelType: "Electric", isTurbo: false, displacement: "0L" }] },
    { name: "Xpeng P7", engines: [{ engineCode: "XP-ELEC-P7", engineName: "Electric Motor", hp: 267, fuelType: "Electric", isTurbo: false, displacement: "0L" }] },
    { name: "Xpeng G6", engines: [{ engineCode: "XP-ELEC-G6", engineName: "Electric Motor", hp: 296, fuelType: "Electric", isTurbo: false, displacement: "0L" }] }
  ]
};

// Also update existing brands that have different naming
const BRAND_FILE_MAP = {
  "Mercedes-Benz": { file: "mercedes.json", mappedFrom: "Mercedes" },
  "Omoda & Jaecoo": { file: null }, // new - special handling
  "Lynk & Co": { file: null }, // new
};

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = [];
for (let y = 2020; y <= CURRENT_YEAR; y++) DEFAULT_YEARS.push(y);

const DEFAULT_ENGINE_TEMPLATE = {
  oilCapacity: null,
  oilNorm: null,
  brakeFluidType: null,
  coolantType: null,
  gearboxOilType: null,
  gearboxOilCapacity: null
};

function getFileName(brandName) {
  let name = brandName;
  // Handle special cases
  if (brandName === "Mercedes-Benz") return "mercedes.json";
  if (brandName === "Lynk & Co") return "lynk-&-co.json";
  if (brandName === "Omoda & Jaecoo") return "omoda-jaecoo.json";
  if (brandName === "Land Rover") return "land-rover.json";
  if (brandName === "IM Motors") return "im-motors.json";
  
  name = name.toLowerCase()
    .replace(/['&]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '');
  return name + '.json';
}

function main() {
  console.log("=== Generate New Brand Files ===\n");
  
  const stats = { created: 0, skipped: 0, updatedIndex: false };
  const createdFiles = [];
  
  for (const [brandName, models] of Object.entries(NEW_BRANDS)) {
    const fileName = getFileName(brandName);
    const filePath = path.join(MAKES_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
      console.log(`[SKIP] ${brandName}: file ${fileName} already exists`);
      stats.skipped++;
      continue;
    }
    
    // Build full model data with default fields
    const modelData = models.map(model => ({
      name: model.name,
      years: DEFAULT_YEARS,
      engines: model.engines.map((e, i) => ({
        engineCode: e.engineCode,
        engineName: e.engineName,
        hp: e.hp || null,
        fuelType: e.fuelType || 'Gasoline',
        isTurbo: e.isTurbo || false,
        displacement: e.displacement || null,
        ...DEFAULT_ENGINE_TEMPLATE
      }))
    }));
    
    const output = {
      make: brandName,
      imageUrl: `./thumb/${fileName.replace('.json', '.png')}`,
      models: modelData
    };
    
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`[CREATE] ${brandName}: ${fileName} (${modelData.length} models)`);
    createdFiles.push({ make: brandName, file: fileName });
    stats.created++;
  }
  
  // Now update all-makes-models.json with all brands
  console.log("\n=== Updating all-makes-models.json ===");
  
  // Read all existing make files and build the index
  const allFiles = fs.readdirSync(MAKES_DIR);
  const allMakes = [];
  
  for (const file of allFiles) {
    if (file === 'all-makes-models.json' || file === 'missing-models-report.json' || file === 'merge-scraped-data.cjs' || file === 'scrape-automobile-tn.cjs' || file === 'scrape-automobile-tn-console.js' || file === 'generate-new-brands.cjs' || file === 'modelScrapper.js' || file === 'scrap-models.js') continue;
    if (!file.endsWith('.json')) continue;
    
    try {
      const data = JSON.parse(fs.readFileSync(path.join(MAKES_DIR, file), 'utf8'));
      if (data.make && !allMakes.find(m => m.file === file)) {
        allMakes.push({ make: data.make, file });
      }
    } catch (e) {
      console.log(`[ERR] Could not read ${file}: ${e.message}`);
    }
  }
  
  // Sort alphabetically
  allMakes.sort((a, b) => a.make.localeCompare(b.make));
  
  const allMakesData = {
    makes: allMakes,
    totalMakes: allMakes.length,
    lastUpdated: new Date().toISOString().split('T')[0],
    note: "This is a master index file. Load individual make files from the same directory for complete model and engine data."
  };
  
  fs.writeFileSync(path.join(MAKES_DIR, 'all-makes-models.json'), JSON.stringify(allMakesData, null, 2), 'utf8');
  console.log(`all-makes-models.json updated with ${allMakes.length} makes`);
  
  // Summary
  console.log("\n=== Summary ===");
  console.log(`New brand files created: ${stats.created}`);
  console.log(`Skipped (already exists): ${stats.skipped}`);
  console.log(`Total brands in index: ${allMakes.length}`);
  console.log("\nNew brands added:");
  createdFiles.forEach(f => console.log(`  - ${f.make} (${f.file})`));
  
  console.log("\n=== Next Steps ===");
  console.log("1. Add logo images to public/config/makes/thumb/ for new brands");
  console.log("2. Verify the app loads correctly: npm run build");
  console.log("\n=== Done ===");
}

main();