#!/usr/bin/env node
/**
 * Discover all car brand URLs from auto-data.net
 * Visits the brand listing page and extracts all brand links.
 * Usage: node public/config/makes/_discover_brand_urls.cjs
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '_autodata_cache');
const COOKIES_FILE = path.join(CACHE_DIR, 'session_cookies.json');

async function main() {
  console.log('=== Discovering brand URLs from auto-data.net ===\n');

  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  // Load cookies if available
  if (fs.existsSync(COOKIES_FILE)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    await page.goto('https://www.auto-data.net/en/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.setCookie(...cookies);
  }

  // Visit brand listing page
  await page.goto('https://www.auto-data.net/en/', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('Page:', await page.title());

  // Find all brand links - they contain '-brand-' in the URL
  const brands = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent.replace(/\s+/g, ' ').trim()
      }))
      .filter(a => a.href && a.href.includes('-brand-') && a.text.length > 1 && /^[A-Za-z]/.test(a.text))
      .map(a => ({
        name: a.text,
        url: a.href.startsWith('http') ? a.href : 'https://www.auto-data.net' + a.href
      }));
  });

  // Deduplicate
  const seen = new Set();
  const uniqueBrands = brands.filter(b => {
    const key = b.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log('\nFound ' + uniqueBrands.length + ' brands:');
  uniqueBrands.forEach(b => {
    console.log('  ' + b.name + ' -> ' + b.url);
  });

  // Save to file
  const outputPath = path.join(CACHE_DIR, 'auto_data_brands.json');
  fs.writeFileSync(outputPath, JSON.stringify(uniqueBrands, null, 2));
  console.log('\nSaved to ' + outputPath);

  await browser.close();
  process.exit(0);
}

main();