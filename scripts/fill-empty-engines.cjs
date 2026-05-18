const fs = require('fs');
const path = require('path');

const MAKES_DIR = path.join(__dirname, '..', 'public', 'config', 'makes');
const PLACEHOLDER_ENGINE = {
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

function placeholderForModel(model) {
  const code = model.name ? model.name.replace(/\s+/g, '-').toUpperCase() : 'GENERIC';
  const displacement = /\b(\d\.\dL|\dL)\b/.test(model.name) ? model.name.match(/\b(\d\.\dL|\dL)\b/)[0] : '1.6L';
  return {
    ...PLACEHOLDER_ENGINE,
    engineCode: `${code}-GEN`,
    engineName: `Generic ${model.name} engine`,
    displacement
  };
}

function run() {
  const files = fs.readdirSync(MAKES_DIR).filter(f => f.endsWith('.json'));

  files.forEach(file => {
    if (file === 'all-makes-models.json') return;
    const p = path.join(MAKES_DIR, file);
    const raw = fs.readFileSync(p, 'utf8');
    let data;

    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error('Skipping invalid JSON:', file, err.message);
      return;
    }

    if (!Array.isArray(data.models)) return;

    let updated = false;

    data.models.forEach(model => {
      if (Array.isArray(model.engines) && model.engines.length === 0) {
        model.engines = [placeholderForModel(model)];
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
      console.log('Updated', file);
    }
  });
}

run();
