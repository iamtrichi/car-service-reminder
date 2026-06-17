const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Visit A3 model page to see generation links
  await page.goto('https://www.auto-data.net/en/audi-a3-model-496', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Model page:', await page.url());
  
  // Find generation links
  const genLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .filter(a => (a.getAttribute('href') || '').match(/-generation-\d+$/))
      .map(a => a.getAttribute('href') + ' | ' + a.textContent.trim().substring(0, 60));
  });
  console.log('\n=== Generation links (' + genLinks.length + ') ===');
  console.log(genLinks.join('\n'));
  
  // Visit first generation
  if (genLinks.length > 0) {
    const genHref = genLinks[0].split(' | ')[0];
    const fullUrl = 'https://www.auto-data.net' + genHref;
    console.log('\nVisiting generation:', fullUrl);
    await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Find engine links on this generation page
    const engineLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .filter(a => a.getAttribute('href')?.match(/-\d{5,}$/))
        .map(a => a.getAttribute('href') + ' | ' + a.textContent.replace(/\s+/g, ' ').trim().substring(0, 80))
        .filter(a => !a.includes('Compare'));
    });
    console.log('\n=== Engine links (' + engineLinks.length + ') ===');
    console.log(engineLinks.slice(0, 5).join('\n'));
    
    // Visit first engine page
    if (engineLinks.length > 0) {
      const engHref = engineLinks[0].split(' | ')[0];
      console.log('\nVisiting engine:', 'https://www.auto-data.net' + engHref);
      await page.goto('https://www.auto-data.net' + engHref, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 2000));
      
      // Print table rows
      const tableData = await page.evaluate(() => {
        const rows = document.querySelectorAll('tr');
        const data = {};
        for (const r of rows) {
          const cells = Array.from(r.querySelectorAll('td'));
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim().replace(/\s+/g, ' ');
            const val = cells[1].textContent.trim().replace(/\s+/g, ' ');
            data[key] = val;
          }
        }
        return data;
      });
      console.log('\n=== Table data ===');
      for (const [k, v] of Object.entries(tableData)) {
        console.log(k + ' => ' + v);
      }
    }
  }
  
  await browser.close();
  process.exit(0);
})();