#!/usr/bin/env node
/**
 * Save cookies from auto-data.net after manual login.
 * 1. Run this script
 * 2. Log in manually in the browser window
 * 3. Press Enter in the terminal when done
 * 4. Cookies will be saved to _autodata_cache/session_cookies.json
 *
 * Usage: node public/config/makes/_save_cookies.cjs
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CACHE_DIR = path.join(__dirname, '_autodata_cache');
const COOKIES_FILE = path.join(CACHE_DIR, 'session_cookies.json');

async function main() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  await page.goto('https://www.auto-data.net/en/login', { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('=== Login to auto-data.net in the browser window ===');
  console.log('After logging in, press ENTER here to save cookies.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question('Press ENTER after login...', resolve));
  rl.close();

  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
  console.log('Cookies saved to ' + COOKIES_FILE + ' (' + cookies.length + ' cookies)');

  await browser.close();
  process.exit(0);
}

main();