const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.auto-data.net/en/audi-brand-41', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('URL:', await page.url());

  // Get all links with model pattern
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim().substring(0, 40) }))
      .filter(a => a.href && a.href.includes('-model-'))
      .slice(0, 20)
      .map(a => a.href + ' | ' + a.text);
  });
  console.log('Found ' + links.length + ' model links (using -model-):');
  console.log(links.join('\n') || 'none');

  // Try 5-digit suffix pattern (engine detail pages)
  const links2 = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim().substring(0, 40) }))
      .filter(a => a.href && a.href.match(/-\d{5}$/))
      .slice(0, 20)
      .map(a => a.href + ' | ' + a.text);
  });
  console.log('\nFound ' + links2.length + ' links (5-digit suffix):');
  console.log(links2.join('\n') || 'none');

  // Let's also look at the page title and first 500 chars of relevant HTML
  const structure = await page.evaluate(() => {
    const title = document.title;
    // Find main content area
    const main = document.querySelector('main, article, .content, #content, .main');
    return { title, hasMain: !!main };
  });
  console.log('\nPage title:', structure.title);
  console.log('Has main element:', structure.hasMain);

  await browser.close();
  process.exit(0);
})();