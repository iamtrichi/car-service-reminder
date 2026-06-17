const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Visit a known functional engine page
  const url = 'https://www.auto-data.net/en/audi-a3-allstreet-8y-facelift-2024-40-tfsi-204hp-quattro-s-tronic-55034';
  console.log('Visiting:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('Page title:', await page.title());
  
  // Check if there's a login wall
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Body text (first 1000 chars):');
  console.log(bodyText);
  
  // Check for tables
  const tables = await page.evaluate(() => {
    return document.querySelectorAll('table').length;
  });
  console.log('\nNumber of tables:', tables);
  
  // Also try with the old working pattern
  await page.goto('https://www.auto-data.net/en/geely-coolray-260t-177hp-dct-37807', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('\nVisited Coolray page, title:', await page.title());
  
  const body2 = await page.evaluate(() => {
    const idx = document.body.innerText.indexOf('Engine oil');
    if (idx >= 0) return document.body.innerText.substring(idx, idx + 500);
    return document.body.innerText.substring(0, 500);
  });
  console.log('Body:', body2);
  
  await browser.close();
  process.exit(0);
})();