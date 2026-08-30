const fs = require('fs');
const path = require('path');
const langs = ['en', 'fr', 'ar', 'es', 'pt'];
for (const l of langs) {
  const file = path.join(__dirname, '..', 'src', 'locales', l + '.json');
  const raw = fs.readFileSync(file, 'utf8');
  try {
    const j = JSON.parse(raw);
    // Verify required keys exist
    const requiredTop = ['menu', 'vehicleDetail', 'fuel', 'statistics', 'expenses', 'settings'];
    const missingTop = requiredTop.filter(k => !(k in j));
    console.log(l, 'OK', 'topLevels=' + Object.keys(j).length, missingTop.length ? 'MISSING:' + missingTop : '');
  } catch (e) {
    console.error(l, 'INVALID JSON:', e.message);
    process.exitCode = 1;
  }
}