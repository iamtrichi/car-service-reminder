const fs = require('fs');
const path = require('path');

function toRoman(num) {
  if (num < 1) return '';
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let res = '';
  for (let i=0;i<vals.length;i++){
    while(num>=vals[i]){ res+=syms[i]; num-=vals[i]; }
  }
  return res;
}

const MAKES_DIR = path.join(__dirname, '..', 'public', 'config', 'makes');
const files = fs.readdirSync(MAKES_DIR).filter(f=>f.endsWith('.json'));
files.forEach(file=>{
  if(file==='all-makes-models.json') return;
  const full = path.join(MAKES_DIR, file);
  let raw = fs.readFileSync(full,'utf8');
  let j;
  try{ j = JSON.parse(raw); }catch(e){ console.error('parse error',file,e); return; }
  if(!Array.isArray(j.models)) return;
  let modified = false;
  const newModels = [];
  j.models.forEach(model=>{
    const name = model.name || '';
    // skip if already generation-like
    if(/\bI\b|\bII\b|\bIII\b|\bIV\b|\bV\b|\bVI\b|\bVII\b|\bVIII\b|Mk\b|Mark\b|Generation\b/i.test(name)){
      newModels.push(model);
      return;
    }
    const years = Array.isArray(model.years) ? model.years.slice().sort((a,b)=>a-b) : [];
    if(years.length===0){ newModels.push(model); return; }
    const minY = years[0];
    const maxY = years[years.length-1];
    const span = maxY - minY + 1;
    if(span <= 8){ newModels.push(model); return; }
    // split into chunks of 8 years
    modified = true;
    let start = minY;
    let idx = 1;
    while(start <= maxY){
      const end = Math.min(start+7, maxY);
      const yearsArr = [];
      for(let y=start;y<=end;y++) yearsArr.push(y);
      newModels.push({ name: `${name} ${toRoman(idx)}`, years: yearsArr, engines: [] });
      start = end+1;
      idx++;
    }
  });
  if(modified){
    j.models = newModels;
    fs.writeFileSync(full, JSON.stringify(j, null, 2)+'\n', 'utf8');
    console.log('updated', file);
  } else {
    console.log('skipped', file);
  }
});
console.log('done');
