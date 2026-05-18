import fs from 'fs/promises';
import path from 'path';

const SCRAPED_FILE = './scripts/automobile-tn-makes-models.json';
const MAKES_DIR = './public/config/makes';

const GENERIC_ENGINE = {
  engineCode: 'GENERIC',
  engineName: 'Generic engine',
  hp: 100,
  fuelType: 'Gasoline',
  isTurbo: false,
  displacement: '1.6L',
  oilCapacity: '4.0L',
  oilNorm: '5W-30',
  brakeFluidType: 'DOT 4',
  coolantType: 'Ethylene Glycol',
  gearboxOilType: 'Manual',
  gearboxOilCapacity: '3.5L'
};

const DEFAULT_YEARS = Array.from({ length: 17 }, (_, i) => 2010 + i);

async function run() {
  // Load scraped data
  const scrapedData = JSON.parse(await fs.readFile(SCRAPED_FILE, 'utf8'));
  const scrapedByMake = new Map();
  for (const entry of scrapedData.makes) {
    scrapedByMake.set(entry.make.toLowerCase(), entry.models);
  }

  // Load and update each app make file
  const files = (await fs.readdir(MAKES_DIR)).filter(f => f.endsWith('.json') && f !== 'all-makes-models.json');
  let totalAdded = 0;

  for (const file of files) {
    const filePath = path.join(MAKES_DIR, file);
    const appData = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const makeName = appData.make || appData.name;

    if (!makeName) continue;

    const appModels = new Map(appData.models?.map(m => [m.name.toLowerCase(), m]) || []);
    const scrapedModels = scrapedByMake.get(makeName.toLowerCase()) || [];
    let added = 0;

    for (const modelName of scrapedModels) {
      if (!appModels.has(modelName.toLowerCase())) {
        appData.models.push({
          name: modelName,
          years: DEFAULT_YEARS,
          engines: [GENERIC_ENGINE]
        });
        added++;
      }
    }

    if (added > 0) {
      appData.models.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      await fs.writeFile(filePath, JSON.stringify(appData, null, 2) + '\n', 'utf8');
      console.log(`${makeName}: +${added} models`);
      totalAdded += added;
    }
  }

  console.log(`\nTotal models added: ${totalAdded}`);
}

run().catch(error => {
  console.error('Failed:', error.message);
  process.exit(1);
});
