#!/usr/bin/env node
/**
 * Scrape ALL models + ALL engines for Audi and Toyota from auto-data.net
 * - Auto-restarts browser on crash
 * - Saves progress periodically
 * - Resumes from where it left off
 * - Validates cookies before starting
 * - Saves failed engines to separate file for review
 * - Groups engines by generation (each generation = a model entry with name + years)
 *
 * Steps:
 *   1. node public/config/makes/_save_cookies.cjs  (login once)
 *   2. node public/config/makes/_scrape_audi_toyota.cjs
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const MAKES_DIR = __dirname;
const CACHE_DIR = path.join(MAKES_DIR, '_autodata_cache');
const COOKIES_FILE = path.join(CACHE_DIR, 'session_cookies.json');
const LOG_FILE = '/tmp/audi_toyota_scrape.log';
const PROGRESS_FILE = path.join(CACHE_DIR, 'audi_toyota_progress.json');
const NAVS_BEFORE_RESTART = 20;

// Load targets: prefer remaining_brands_targets.json (brands not yet scraped),
// fall back to all_brands_targets.json, then hardcoded fallback
function loadTargets() {
  for (const f of ['remaining_brands_targets.json', 'all_brands_targets.json']) {
    const targetsFile = path.join(CACHE_DIR, f);
    if (fs.existsSync(targetsFile)) {
      return JSON.parse(fs.readFileSync(targetsFile, 'utf8'));
    }
  }
  return [
    { appFile: 'audi.json', adBrandName: 'Audi', adBrandUrl: 'https://www.auto-data.net/en/audi-brand-41' },
    { appFile: 'toyota.json', adBrandName: 'Toyota', adBrandUrl: 'https://www.auto-data.net/en/toyota-brand-40' },
  ];
}
const TARGETS = loadTargets();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const randDelay = () => 1500 + Math.random() * 1500;

function log(msg) {
  const line = new Date().toLocaleTimeString() + ' ' + msg;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (e) {}
}

function norm(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

let cookies = [];

async function restartBrowser() {
  try { await browser.close(); } catch (e) {}
  browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  if (cookies.length > 0) {
    try {
      await page.goto('https://www.auto-data.net/en/', { waitUntil: 'networkidle2', timeout: 60000 });
      await page.setCookie(...cookies);
    } catch (e) {
      log('Cookie set failed: ' + e.message.substring(0, 60));
    }
  }
}

async function safeGoto(url, label) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        log('  retry ' + attempt + ' for ' + (label || url.substring(0, 60)));
        await restartBrowser();
        await sleep(2000);
      }
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      return true;
    } catch (err) {
      if (attempt === 2) {
        log(' [FAIL] ' + (label || '') + ' ' + err.message.substring(0, 60));
        return false;
      }
    }
  }
  return false;
}

let browser, page;

/**
 * Validate that cookies work by visiting a known engine page
 * and checking if table data is extractable.
 */
async function validateCookies() {
  log('Validating cookies...');
  const testUrl = 'https://www.auto-data.net/en/audi-a1-8x-2011-2-0tfsi-256hp-41';
  if (!await safeGoto(testUrl, 'cookie validation')) {
    log('[WARN] Could not load test page for cookie validation');
    return false;
  }
  await sleep(2000);

  const td = await page.evaluate(() => {
    const d = {};
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      for (const r of table.querySelectorAll('tr')) {
        const th = r.querySelector('th');
        const tdEl = r.querySelector('td');
        if (th && tdEl) {
          d[th.textContent.trim().replace(/\s+/g, ' ')] = tdEl.textContent.trim().replace(/\s+/g, ' ');
        }
      }
    }
    return d;
  }).catch(() => ({}));

  const hasData = td['Engine Model/Code'] || td['Power'] || td['Fuel Type'];
  if (hasData) {
    log('Cookies valid - data extraction working. Fields found: ' + Object.keys(td).length);
    return true;
  } else {
    log('[WARN] Cookies may be expired - no data extracted from test page');
    log('  Please re-run: node public/config/makes/_save_cookies.cjs');
    return false;
  }
}

/**
 * Parse generation info from the <h1 class="top"> on an engine detail page.
 *
 * Example h1:
 *   "Specs of Toyota RAV4 I (XA10) 3-door 2.4i (167 Hp) Automatic /2000, 2001, 2002, 2003, 2004, 2005, 2006/"
 *
 * Returns:
 *   { genName: "RAV4 I", years: [2000, 2001, ...], transmission: "Automatic" }
 *   or null if cannot parse
 */
function parseGenerationInfo(h1Text, brandName) {
  if (!h1Text) return null;

  // Remove "Specs of " prefix
  let text = h1Text;
  if (text.startsWith('Specs of ')) {
    text = text.substring('Specs of '.length);
  }

  // Remove brand name prefix (e.g. "Toyota ", "Audi ")
  if (text.startsWith(brandName + ' ')) {
    text = text.substring(brandName.length + 1);
  }

  // Extract years from trailing /year, year, year/ pattern
  const yearsMatch = text.match(/\/([\d,\s]+)\/$/);
  let years = [];
  if (yearsMatch) {
    years = yearsMatch[1].split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
    text = text.substring(0, text.lastIndexOf('/'));
  }

  // Extract transmission type (Automatic/Manual) from the remaining text
  let transmission = null;
  if (text.includes('Automatic')) {
    transmission = 'Automatic';
  } else if (text.includes('Manual')) {
    transmission = 'Manual';
  }

  // The generation name is the part before the first numeric spec or parenthesis
  // e.g. "RAV4 I (XA10) 3-door 2.4i (167 Hp) Automatic"
  // We want "RAV4 I"
  const parenMatch = text.match(/^([^(]+?)\s*\(/);
  let genName;
  if (parenMatch) {
    genName = parenMatch[1].trim();
  } else {
    // No parenthesis - take everything up to first engine spec pattern
    const specMatch = text.match(/^(.+?)\s+\d+(\.\d+)?[LT]/);
    genName = specMatch ? specMatch[1].trim() : text.trim();
  }

  // Clean up: remove trailing numbers that look like years or hp
  genName = genName.replace(/\s+\d+\s*$/, '').trim();

  if (!genName) return null;

  return { genName, years, transmission };
}

/**
 * Extract engine data from a single engine detail page.
 * Also parses generation info from the <h1 class="top">.
 */
async function extractEngineData(engUrl, brandName) {
  // Extract generation info from h1.top
  const h1Info = await page.evaluate(() => {
    const h1 = document.querySelector('h1.top');
    return h1 ? h1.textContent.trim() : null;
  }).catch(() => null);
  const genInfo = parseGenerationInfo(h1Info, brandName);

  const td = await page.evaluate(() => {
    const d = {};
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      for (const r of table.querySelectorAll('tr')) {
        const th = r.querySelector('th');
        const tdEl = r.querySelector('td');
        if (th && tdEl) {
          d[th.textContent.trim().replace(/\s+/g, ' ')] = tdEl.textContent.trim().replace(/\s+/g, ' ');
        }
      }
    }
    return d;
  }).catch(() => ({}));

  let engineName = (td['Modification (Engine)'] || '').replace(/\s+/g, ' ').trim();
  const engineCode = td['Engine Model/Code'] || null;
  const hpMatch = (td['Power'] || '').match(/^(\d+)\s*Hp/i);
  const hp = hpMatch ? parseInt(hpMatch[1]) : null;

  const fuelRaw = (td['Fuel Type'] || '').toLowerCase();
  let fuelType = 'Gasoline';
  if (fuelRaw.includes('diesel')) fuelType = 'Diesel';
  else if (fuelRaw.includes('electric')) fuelType = 'Electric';
  else if (fuelRaw.includes('hybrid')) fuelType = 'Hybrid';
  else if (fuelRaw.includes('petrol') || fuelRaw.includes('gasoline')) fuelType = 'Gasoline';
  else if (fuelRaw.includes('cng') || fuelRaw.includes('natural gas')) fuelType = 'CNG';

  const aspiration = (td['Engine aspiration'] || '').toLowerCase();
  const isTurbo = aspiration.includes('turbo') || aspiration.includes('supercharger');

  const dispMatch = (td['Engine displacement'] || '').match(/([\d.]+)\s*cm/i);
  const displacement = dispMatch ? (parseInt(dispMatch[1]) / 1000).toFixed(1) + 'L' : null;

  const oilCapRaw = td['Engine oil capacity'] || '';
  const oilCapMatch = oilCapRaw.match(/([\d.]+)\s*l/i);
  const oilCapacity = oilCapMatch ? oilCapMatch[1].trim() + 'L' : null;

  const oilNormRaw = td['Engine oil specification'] || '';
  const oilNorm = oilNormRaw.includes('Log in') ? null : (oilNormRaw.replace(/\s+/g, ' ').trim() || null);

  const coolantRaw = td['Coolant'] || '';
  const coolantMatch = coolantRaw.match(/([\d.]+)\s*l/i);
  const coolantType = coolantMatch ? coolantMatch[1].trim() + 'L' : null;

  const cleanEngineCode = (engineCode && !engineCode.includes('Engine') && !engineCode.includes('displacement')) ? engineCode : null;

  // Append transmission to engine name if available
  if (genInfo && genInfo.transmission && engineName && !engineName.toLowerCase().includes(genInfo.transmission.toLowerCase())) {
    engineName = engineName + ' (' + genInfo.transmission + ')';
  }

  return {
    genName: genInfo ? genInfo.genName : null,
    years: genInfo ? genInfo.years : [],
    engineObj: {
      engineCode: cleanEngineCode,
      engineName, hp, fuelType, isTurbo, displacement, oilCapacity, oilNorm,
      brakeFluidType: null, coolantType, gearboxOilType: null, gearboxOilCapacity: null,
    },
    // Keep raw data for debugging
    _rawTd: td,
    _rawH1: h1Info,
  };
}

/**
 * Check if an engine has meaningful scraped data (at least one key field).
 */
function hasValidData(engine) {
  return engine.engineObj.engineCode !== null || engine.engineObj.hp !== null || (engine.engineObj.engineName && engine.engineObj.engineName.length > 0);
}

async function main() {
  log('=== Scrape Audi & Toyota: ALL models + ALL engines ===\n');

  // Load cookies
  if (fs.existsSync(COOKIES_FILE)) {
    cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    log('Loaded ' + cookies.length + ' cookies');
  } else {
    log('[ERROR] No cookies found. Please run: node public/config/makes/_save_cookies.cjs');
    process.exit(1);
  }

  await restartBrowser();

  // Validate cookies work before proceeding
  const cookiesValid = await validateCookies();
  if (!cookiesValid) {
    log('\n[ERROR] Cookie validation failed. Aborting scrape.');
    log('Please re-login: node public/config/makes/_save_cookies.cjs');
    try { await browser.close(); } catch (e) {}
    process.exit(1);
  }

  for (const target of TARGETS) {
    log(`\n====== Processing ${target.adBrandName} ======`);

    // Load existing data
    const appFilePath = path.join(MAKES_DIR, target.appFile);
    let appData = { make: target.adBrandName, imageUrl: './thumb/' + target.adBrandName.toLowerCase() + '.png', models: [] };
    if (fs.existsSync(appFilePath)) {
      appData = JSON.parse(fs.readFileSync(appFilePath, 'utf8'));
      log('Existing models: ' + appData.models.length);
    }

    // Failed engines tracking for this brand
    const failedEnginesFile = path.join(CACHE_DIR, `failed_engines_${target.adBrandName.toLowerCase()}.json`);
    let failedEngines = [];
    if (fs.existsSync(failedEnginesFile)) {
      try { failedEngines = JSON.parse(fs.readFileSync(failedEnginesFile, 'utf8')); } catch (e) {}
    }

    // Load progress to know where to resume
    const progressKey = target.appFile.replace('.json', '');
    const allProgress = getProgress();
    const processedModels = allProgress[progressKey] || {};

    // Extract model links
    log('Extracting model list...');
    if (!await safeGoto(target.adBrandUrl, 'brand page')) { log('Failed to load brand page'); continue; }
    await sleep(3000);

    const adModels = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => ({ href: a.getAttribute('href'), text: a.textContent.replace(/\s+/g, ' ').trim() }))
        .filter(a => a.href && a.href.includes('-model-') && a.text.length > 1)
        .map(a => ({ name: a.text, url: 'https://www.auto-data.net' + a.href }));
    });

    const seen = new Set();
    const uniqueModels = adModels.filter(m => {
      if (seen.has(m.url)) return false;
      seen.add(m.url);
      return true;
    });
    log('Found ' + uniqueModels.length + ' models');

    let added = 0, updated = 0, skipped = 0, failedCount = 0;
    let navCount = 0;

    for (let mi = 0; mi < uniqueModels.length; mi++) {
      const adModel = uniqueModels[mi];

      // Resume check - but only skip if it was actually done with valid data
      if (processedModels[mi] && processedModels[mi].startsWith('done')) { skipped++; continue; }

      try {
        // Restart browser periodically to avoid crashes
        if (navCount >= NAVS_BEFORE_RESTART) {
          log('  restarting browser (navs: ' + navCount + ')');
          await restartBrowser();
          await sleep(2000);
          navCount = 0;
        }

        process.stdout.write('[' + (mi + 1) + '/' + uniqueModels.length + '] ' + adModel.name + '...');

        // Visit model page -> get generation links
        if (!await safeGoto(adModel.url, adModel.name)) { log(' nav fail'); skipped++; saveProgress(progressKey, mi, 'nav_fail'); continue; }
        navCount++;
        await sleep(2000);

        const genLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a'))
            .filter(a => (a.getAttribute('href') || '').match(/-generation-\d+$/))
            .map(a => 'https://www.auto-data.net' + a.getAttribute('href'));
        });

        const seenGens = new Set();
        const uniqueGens = genLinks.filter(u => { if (seenGens.has(u)) return false; seenGens.add(u); return true; });

        if (uniqueGens.length === 0) { log(' no gens'); skipped++; saveProgress(progressKey, mi, 'no_gens'); continue; }

        // For each generation -> get engines, grouped by generation name
        const generationsMap = new Map(); // key: genName, value: { name, years: Set, engines: [] }
        let allFailed = [];

        for (const genUrl of uniqueGens) {
          await sleep(randDelay());
          if (!await safeGoto(genUrl, 'gen')) continue;
          navCount++;
          await sleep(1500);

          const engineUrls = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
              .filter(a => a.getAttribute('href')?.match(/-\d{5,}$/))
              .filter(a => !a.getAttribute('href').includes('-generation-'))
              .map(a => 'https://www.auto-data.net' + a.getAttribute('href'));
          });

          const seenEng = new Set();
          const uniqueEng = engineUrls.filter(u => { if (seenEng.has(u)) return false; seenEng.add(u); return true; });

          for (const engUrl of uniqueEng) {
            await sleep(randDelay());
            if (!await safeGoto(engUrl, 'engine')) continue;
            navCount++;
            await sleep(1000);

            const result = await extractEngineData(engUrl, target.adBrandName);

            if (!hasValidData(result)) {
              allFailed.push({
                model: adModel.name,
                url: engUrl,
                genName: result.genName || 'unknown',
                scrapedData: result._rawTd || {},
                rawH1: result._rawH1,
                timestamp: new Date().toISOString()
              });
              continue;
            }

            // Determine the generation name
            let genName = result.genName;
            if (!genName) {
              // Fallback: use adModel name if h1 parsing failed
              // Remove year ranges like "1994 -" or "1994 - 2005" from name
              genName = adModel.name.replace(/\s*\d{4}\s*-\s*(\d{4})?\s*$/, '').trim();
              if (!genName || genName === adModel.name) {
                genName = adModel.name;
              }
            }

            // Get or create generation entry
            if (!generationsMap.has(genName)) {
              generationsMap.set(genName, {
                name: genName,
                years: new Set(),
                engines: []
              });
            }

            const genEntry = generationsMap.get(genName);
            // Add years
            if (result.years && result.years.length > 0) {
              result.years.forEach(y => genEntry.years.add(y));
            }
            // Add engine (without internal fields)
            genEntry.engines.push(result.engineObj);
          }
        }

        // Now write the generations into app data
        if (generationsMap.size > 0) {
          for (const [genName, genEntry] of generationsMap) {
            const sortedYears = [...genEntry.years].sort((a, b) => a - b);
            const genNorm = norm(genName);

            // Check if this generation already exists
            let existingIdx = -1;
            for (let i = 0; i < appData.models.length; i++) {
              if (norm(appData.models[i].name) === genNorm) {
                existingIdx = i;
                break;
              }
            }

            if (existingIdx >= 0) {
              // Update existing generation: merge engines
              const existing = appData.models[existingIdx];
              const existingCodes = new Set(existing.engines.map(e => (e.engineCode || '') + '|' + (e.hp || '') + '|' + e.fuelType));
              for (const ne of genEntry.engines) {
                const key = (ne.engineCode || '') + '|' + (ne.hp || '') + '|' + ne.fuelType;
                if (!existingCodes.has(key)) { existing.engines.push(ne); existingCodes.add(key); }
              }
              // Merge years
              const existingYears = new Set(existing.years);
              sortedYears.forEach(y => existingYears.add(y));
              existing.years = [...existingYears].sort((a, b) => a - b);
              updated++;
            } else {
              // Add new generation
              appData.models.push({
                name: genName,
                years: sortedYears,
                engines: genEntry.engines
              });
              added++;
            }
          }
        }

        // Track failed engines
        if (allFailed.length > 0) {
          failedEngines.push(...allFailed);
          failedCount += allFailed.length;
        }

        const totalEngines = [...generationsMap.values()].reduce((sum, g) => sum + g.engines.length, 0);
        const statusMsg = totalEngines > 0
          ? ` ${totalEngines} engines across ${generationsMap.size} generations` + (allFailed.length > 0 ? ` [${allFailed.length} failed]` : '')
          : ' no valid engines';
        log(statusMsg);

        // Save after each model
        fs.writeFileSync(appFilePath, JSON.stringify(appData, null, 2));
        if (totalEngines > 0) {
          saveProgress(progressKey, mi, 'done:' + totalEngines);
        } else {
          saveProgress(progressKey, mi, allFailed.length > 0 ? 'failed_data' : 'no_data');
        }

      } catch (err) {
        log(' [ERR] ' + (err.message || '').substring(0, 80));
        skipped++;
        saveProgress(progressKey, mi, 'error');
        // Restart browser after any error
        await restartBrowser();
        await sleep(2000);
        navCount = 0;
      }
    }

    // Save failed engines file
    if (failedEngines.length > 0) {
      fs.writeFileSync(failedEnginesFile, JSON.stringify(failedEngines, null, 2));
      log(`  Saved ${failedEngines.length} failed engines to ${failedEnginesFile}`);
    }

    log(`\n--- ${target.adBrandName} ---`);
    log('Added: ' + added + ' Updated: ' + updated + ' Skipped: ' + skipped + ' Failed: ' + failedCount);
    log('Total models: ' + appData.models.length);
  }

  try { await browser.close(); } catch (e) {}
  log('\n=== Done ===');
}

// Progress helpers
function getProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch (e) {}
  return {};
}
function saveProgress(targetKey, modelIdx, status) {
  try {
    const p = getProgress();
    if (!p[targetKey]) p[targetKey] = {};
    p[targetKey][modelIdx] = status;
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
  } catch (e) {}
}

main();