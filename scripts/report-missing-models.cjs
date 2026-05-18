const fs = require('fs');
const path = require('path');

const MAKES_DIR = path.join(__dirname, '..', 'public', 'config', 'makes');
const OUT_FILE = path.join(MAKES_DIR, 'missing-models-report.json');

function run() {
  const files = fs.readdirSync(MAKES_DIR).filter(f => f.endsWith('.json'));
  const report = [];

  files.forEach(file => {
    if (file === 'all-makes-models.json') return;
    try {
      const p = path.join(MAKES_DIR, file);
      const raw = fs.readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      const models = data.models || [];
      if (!models || models.length === 0) {
        report.push({ file, make: data.make || data.name || null, reason: 'no models' });
      }
    } catch (err) {
      report.push({ file, error: String(err) });
    }
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));
  console.log('Report written to', OUT_FILE);
}

run();
