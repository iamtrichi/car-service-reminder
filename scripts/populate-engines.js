import fs from 'fs/promises';
import path from 'path';

const MAKES_DIR = './public/config/makes';

// Mapping of model names to realistic engine variants
const MODEL_ENGINES = {
  // Hyundai
  'Bayon': [
    { engineCode: '1.2MPI', engineName: '1.2L MPI', hp: 84, fuelType: 'Gasoline', isTurbo: false, displacement: '1.2L', oilCapacity: '3.5L', oilNorm: '5W-30' },
    { engineCode: '1.0T', engineName: '1.0L Turbo', hp: 100, fuelType: 'Gasoline', isTurbo: true, displacement: '1.0L', oilCapacity: '3.5L', oilNorm: '5W-30' }
  ],
  'Creta': [
    { engineCode: '1.5MPI', engineName: '1.5L MPI', hp: 115, fuelType: 'Gasoline', isTurbo: false, displacement: '1.5L', oilCapacity: '4.0L', oilNorm: '5W-30' },
    { engineCode: '1.4T', engineName: '1.4L Turbo', hp: 140, fuelType: 'Gasoline', isTurbo: true, displacement: '1.4L', oilCapacity: '4.0L', oilNorm: '5W-30' }
  ],
  'Grand i10': [
    { engineCode: '1.0', engineName: '1.0L 3-cyl', hp: 66, fuelType: 'Gasoline', isTurbo: false, displacement: '1.0L', oilCapacity: '3.2L', oilNorm: '5W-30' },
    { engineCode: '1.2', engineName: '1.2L 4-cyl', hp: 87, fuelType: 'Gasoline', isTurbo: false, displacement: '1.2L', oilCapacity: '3.8L', oilNorm: '5W-30' }
  ],
  'i20': [
    { engineCode: '1.2MPI', engineName: '1.2L MPI', hp: 84, fuelType: 'Gasoline', isTurbo: false, displacement: '1.2L', oilCapacity: '3.5L', oilNorm: '5W-30' },
    { engineCode: '1.0T', engineName: '1.0L Turbo', hp: 100, fuelType: 'Gasoline', isTurbo: true, displacement: '1.0L', oilCapacity: '3.5L', oilNorm: '5W-30' }
  ],
  'i30 Fastback': [
    { engineCode: '1.6MPI', engineName: '1.6L MPI', hp: 130, fuelType: 'Gasoline', isTurbo: false, displacement: '1.6L', oilCapacity: '4.0L', oilNorm: '5W-30' },
    { engineCode: '1.5T', engineName: '1.5L Turbo', hp: 160, fuelType: 'Gasoline', isTurbo: true, displacement: '1.5L', oilCapacity: '4.0L', oilNorm: '5W-30' }
  ],
  'Ioniq 5': [
    { engineCode: 'EV-58', engineName: 'Electric 58kWh', hp: 225, fuelType: 'Electric', isTurbo: false, displacement: '0L', oilCapacity: '2L', oilNorm: 'Synthetic' },
    { engineCode: 'EV-84', engineName: 'Electric 84kWh', hp: 320, fuelType: 'Electric', isTurbo: false, displacement: '0L', oilCapacity: '2L', oilNorm: 'Synthetic' }
  ],
  'Kona': [
    { engineCode: '1.0T', engineName: '1.0L Turbo', hp: 120, fuelType: 'Gasoline', isTurbo: true, displacement: '1.0L', oilCapacity: '3.5L', oilNorm: '5W-30' },
    { engineCode: '1.6T', engineName: '1.6L Turbo', hp: 195, fuelType: 'Gasoline', isTurbo: true, displacement: '1.6L', oilCapacity: '4.0L', oilNorm: '5W-30' }
  ],
  'Kona Electric': [
    { engineCode: 'EV-39', engineName: 'Electric 39kWh', hp: 136, fuelType: 'Electric', isTurbo: false, displacement: '0L', oilCapacity: '2L', oilNorm: 'Synthetic' },
    { engineCode: 'EV-64', engineName: 'Electric 64kWh', hp: 204, fuelType: 'Electric', isTurbo: false, displacement: '0L', oilCapacity: '2L', oilNorm: 'Synthetic' }
  ],
  'Tucson': [
    { engineCode: '2.0MPI', engineName: '2.0L MPI', hp: 155, fuelType: 'Gasoline', isTurbo: false, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '5W-30' },
    { engineCode: '1.6T', engineName: '1.6L Turbo', hp: 175, fuelType: 'Gasoline', isTurbo: true, displacement: '1.6L', oilCapacity: '4.0L', oilNorm: '5W-30' }
  ],
  'Tucson Hybride': [
    { engineCode: '2.0H', engineName: '2.0L Hybrid', hp: 226, fuelType: 'Hybrid', isTurbo: false, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '0W-20' }
  ],
  'Venue': [
    { engineCode: '1.2', engineName: '1.2L MPI', hp: 83, fuelType: 'Gasoline', isTurbo: false, displacement: '1.2L', oilCapacity: '3.8L', oilNorm: '5W-30' }
  ],
  // Kia
  'EV3': [
    { engineCode: 'EV-58', engineName: 'Electric 58kWh', hp: 225, fuelType: 'Electric', isTurbo: false, displacement: '0L', oilCapacity: '2L', oilNorm: 'Synthetic' },
    { engineCode: 'EV-84', engineName: 'Electric 84kWh', hp: 320, fuelType: 'Electric', isTurbo: false, displacement: '0L', oilCapacity: '2L', oilNorm: 'Synthetic' }
  ],
  'EV6': [
    { engineCode: 'EV-58', engineName: 'Electric 58kWh', hp: 225, fuelType: 'Electric', isTurbo: false, displacement: '0L', oilCapacity: '2L', oilNorm: 'Synthetic' },
    { engineCode: 'EV-84', engineName: 'Electric 84kWh', hp: 320, fuelType: 'Electric', isTurbo: false, displacement: '0L', oilCapacity: '2L', oilNorm: 'Synthetic' }
  ],
  'Picanto': [
    { engineCode: '1.0', engineName: '1.0L 3-cyl', hp: 66, fuelType: 'Gasoline', isTurbo: false, displacement: '1.0L', oilCapacity: '3.2L', oilNorm: '5W-30' },
    { engineCode: '1.2', engineName: '1.2L 4-cyl', hp: 86, fuelType: 'Gasoline', isTurbo: false, displacement: '1.2L', oilCapacity: '3.8L', oilNorm: '5W-30' }
  ],
  'Sportage': [
    { engineCode: '2.0MPI', engineName: '2.0L MPI', hp: 155, fuelType: 'Gasoline', isTurbo: false, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '5W-30' },
    { engineCode: '2.2D', engineName: '2.2L Diesel', hp: 200, fuelType: 'Diesel', isTurbo: true, displacement: '2.2L', oilCapacity: '4.5L', oilNorm: '5W-40' }
  ],
  'Sportage Hybride': [
    { engineCode: '2.0H', engineName: '2.0L Hybrid', hp: 226, fuelType: 'Hybrid', isTurbo: false, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '0W-20' }
  ],
  // Renault
  'Austral': [
    { engineCode: '1.2T', engineName: '1.2L TCe 100', hp: 100, fuelType: 'Gasoline', isTurbo: true, displacement: '1.2L', oilCapacity: '4.0L', oilNorm: '0W-20' },
    { engineCode: '1.3T', engineName: '1.3L TCe 140', hp: 140, fuelType: 'Gasoline', isTurbo: true, displacement: '1.3L', oilCapacity: '4.0L', oilNorm: '0W-20' }
  ],
  'Clio': [
    { engineCode: '1.0T', engineName: '1.0L TCe 100', hp: 100, fuelType: 'Gasoline', isTurbo: true, displacement: '1.0L', oilCapacity: '4.0L', oilNorm: '0W-20' },
    { engineCode: '1.2T', engineName: '1.2L TCe 120', hp: 120, fuelType: 'Gasoline', isTurbo: true, displacement: '1.2L', oilCapacity: '4.0L', oilNorm: '0W-20' }
  ],
  'Kwid Populaire': [
    { engineCode: '0.8', engineName: '0.8L MPI', hp: 54, fuelType: 'Gasoline', isTurbo: false, displacement: '0.8L', oilCapacity: '3.0L', oilNorm: '5W-30' },
    { engineCode: '1.0', engineName: '1.0L MPI', hp: 68, fuelType: 'Gasoline', isTurbo: false, displacement: '1.0L', oilCapacity: '3.2L', oilNorm: '5W-30' }
  ],
  // Audi
  'A3 Berline': [
    { engineCode: '1.5TFSI', engineName: '1.5L TFSI', hp: 150, fuelType: 'Gasoline', isTurbo: true, displacement: '1.5L', oilCapacity: '4.0L', oilNorm: '0W-20' },
    { engineCode: '2.0TDI', engineName: '2.0L TDI', hp: 150, fuelType: 'Diesel', isTurbo: true, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '5W-30' }
  ],
  'A3 Sportback': [
    { engineCode: '1.5TFSI', engineName: '1.5L TFSI', hp: 150, fuelType: 'Gasoline', isTurbo: true, displacement: '1.5L', oilCapacity: '4.0L', oilNorm: '0W-20' },
    { engineCode: '2.0TDI', engineName: '2.0L TDI', hp: 150, fuelType: 'Diesel', isTurbo: true, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '5W-30' }
  ],
  'Q2': [
    { engineCode: '1.0TFSI', engineName: '1.0L TFSI', hp: 116, fuelType: 'Gasoline', isTurbo: true, displacement: '1.0L', oilCapacity: '3.5L', oilNorm: '0W-20' },
    { engineCode: '1.5TFSI', engineName: '1.5L TFSI', hp: 150, fuelType: 'Gasoline', isTurbo: true, displacement: '1.5L', oilCapacity: '4.0L', oilNorm: '0W-20' }
  ],
  'Q3': [
    { engineCode: '1.5TFSI', engineName: '1.5L TFSI', hp: 150, fuelType: 'Gasoline', isTurbo: true, displacement: '1.5L', oilCapacity: '4.0L', oilNorm: '0W-20' },
    { engineCode: '2.0TFSI', engineName: '2.0L TFSI', hp: 230, fuelType: 'Gasoline', isTurbo: true, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '0W-20' }
  ],
  // VW
  'Polo': [
    { engineCode: '1.0TSI', engineName: '1.0L TSI', hp: 110, fuelType: 'Gasoline', isTurbo: true, displacement: '1.0L', oilCapacity: '3.5L', oilNorm: '0W-20' },
    { engineCode: '1.6TDI', engineName: '1.6L TDI', hp: 116, fuelType: 'Diesel', isTurbo: true, displacement: '1.6L', oilCapacity: '4.0L', oilNorm: '5W-30' }
  ],
  'T-Cross': [
    { engineCode: '1.0TSI', engineName: '1.0L TSI', hp: 110, fuelType: 'Gasoline', isTurbo: true, displacement: '1.0L', oilCapacity: '3.5L', oilNorm: '0W-20' },
    { engineCode: '1.6TDI', engineName: '1.6L TDI', hp: 116, fuelType: 'Diesel', isTurbo: true, displacement: '1.6L', oilCapacity: '4.0L', oilNorm: '5W-30' }
  ],
  'Tiguan': [
    { engineCode: '1.4TSI', engineName: '1.4L TSI', hp: 150, fuelType: 'Gasoline', isTurbo: true, displacement: '1.4L', oilCapacity: '4.0L', oilNorm: '0W-20' },
    { engineCode: '2.0TDI', engineName: '2.0L TDI', hp: 190, fuelType: 'Diesel', isTurbo: true, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '5W-30' }
  ],
  'Virtus': [
    { engineCode: '1.0TSI', engineName: '1.0L TSI', hp: 110, fuelType: 'Gasoline', isTurbo: true, displacement: '1.0L', oilCapacity: '3.5L', oilNorm: '0W-20' },
    { engineCode: '1.6', engineName: '1.6L MPI', hp: 104, fuelType: 'Gasoline', isTurbo: false, displacement: '1.6L', oilCapacity: '4.0L', oilNorm: '5W-30' }
  ],
  // Toyota
  'Corolla': [
    { engineCode: '1.8H', engineName: '1.8L Hybrid', hp: 122, fuelType: 'Hybrid', isTurbo: false, displacement: '1.8L', oilCapacity: '4.2L', oilNorm: '0W-20' },
    { engineCode: '2.0', engineName: '2.0L MPI', hp: 170, fuelType: 'Gasoline', isTurbo: false, displacement: '2.0L', oilCapacity: '4.5L', oilNorm: '0W-20' }
  ],
  'Hilux Double Cabine': [
    { engineCode: '2.4T', engineName: '2.4L Turbo', hp: 201, fuelType: 'Gasoline', isTurbo: true, displacement: '2.4L', oilCapacity: '5.0L', oilNorm: '0W-20' },
    { engineCode: '2.8D', engineName: '2.8L Diesel', hp: 204, fuelType: 'Diesel', isTurbo: true, displacement: '2.8L', oilCapacity: '5.0L', oilNorm: '5W-30' }
  ]
};

const DEFAULT_FIELDS = {
  brakeFluidType: 'DOT 4',
  coolantType: 'Ethylene Glycol',
  gearboxOilType: 'Manual',
  gearboxOilCapacity: '3.5L'
};

async function run() {
  const files = (await fs.readdir(MAKES_DIR)).filter(f => f.endsWith('.json') && f !== 'all-makes-models.json');
  let updated = 0;

  for (const file of files) {
    const filePath = path.join(MAKES_DIR, file);
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (!data.models || !Array.isArray(data.models)) continue;
    let hasChanges = false;

    for (const model of data.models) {
      if (MODEL_ENGINES[model.name]) {
        const newEngines = MODEL_ENGINES[model.name].map(e => ({
          ...DEFAULT_FIELDS,
          ...e,
          oilCapacity: e.oilCapacity || '4.0L'
        }));
        model.engines = newEngines;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      console.log(`Updated ${data.make}`);
      updated++;
    }
  }

  console.log(`\nUpdated ${updated} make files with realistic engine variants`);
}

run().catch(error => {
  console.error('Failed:', error.message);
  process.exit(1);
});
