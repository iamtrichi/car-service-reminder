const fs = require('fs');
const c = fs.readFileSync('releases/V1.58-play-store-notes.txt', 'utf8');
const locs = ['en-US','ar','es-ES','fr-FR','pt-PT'];
for (const loc of locs) {
  const m = c.match(new RegExp('<' + loc + '>[\\s\\S]*?</' + loc + '>'));
  if (!m) { console.log(loc, 'MISSING'); continue; }
  const block = m[0];
  const bullets = block.match(/^• .*$/gm) || [];
  const chars = bullets.reduce((s, b) => s + b.slice(2).length, 0);
  console.log(loc + ': bullets=' + bullets.length + ' chars=' + chars);
}
const eng = ['YTD','This Year','fuel','services','documents','statistics','settings','mileage','odometer','This Week'];
for (const loc of ['ar','es-ES','fr-FR','pt-PT']) {
  const m = c.match(new RegExp('<' + loc + '>[\\s\\S]*?</' + loc + '>'));
  const block = m[0];
  const hits = eng.filter(w => new RegExp(w, 'i').test(block));
  if (hits.length) console.log(loc, 'ENGLISH FRAGMENTS:', hits.join(', '));
  else console.log(loc, 'no English fragments');
}
