import fs from 'fs/promises';
import path from 'path';

const BASE_URL = 'https://www.automobile.tn';
const START_URL = `${BASE_URL}/fr/neuf`;
const OUTPUT_FILE = path.join(process.cwd(), 'scripts', 'automobile-tn-makes-models.json');

const anchorRegex = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const navBlacklist = new Set(['neuf', 'electrique', 'concessionnaires', 'comparateur', 'occasion', 'magazine', 'guide', 'mon-espace', 'qui-sommes-nous', 'contact', 'mentions-legales', 'politique-de-confidentialite', 'rss']);

function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseAnchors(html) {
  const anchors = [];
  let match;
  while ((match = anchorRegex.exec(html)) !== null) {
    anchors.push({ href: match[1], text: stripTags(match[2]) });
  }
  return anchors;
}

function normalizeUrl(href) {
  if (!href) return null;
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `${BASE_URL}${href}`;
  return `${BASE_URL}/${href}`;
}

function cleanName(text, brandName = '') {
  if (!text) return '';
  const brandPattern = brandName ? new RegExp(`^${brandName}\\s+`, 'i') : null;
  return text
    .replace(/OFFRE\s+/gi, '')
    .replace(/\bPrix\b/gi, '')
    .replace(/\bRestylée\b/gi, '')
    .replace(/^(Black Weeks Deals|Best Deals|Promo|Nouveau|Nouvelle|Sur commande|Restylée|Prix|Offre|Promotion|Soldes)\s*/i, '')
    .replace(/^Contacter\s+.*$/i, '')
    .replace(brandPattern, '')
    .replace(/\s+à partir de.*$/i, '')
    .replace(/\s+DT.*$/i, '')
    .replace(/\s+[-–—].*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function prettyFromSlug(slug) {
  if (!slug) return '';
  return slug
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .map(word => word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : '')
    .join(' ')
    .trim();
}

function extractBrandLinks(html) {
  const anchors = parseAnchors(html);
  const brands = new Map();

  for (const anchor of anchors) {
    const match = anchor.href.match(/^\/fr\/neuf\/([^\/\?#]+)\/?$/i);
    if (!match) continue;
    const slug = match[1].toLowerCase();
    if (navBlacklist.has(slug)) continue;
    const rawName = anchor.text ? anchor.text.replace(/\s*\([^\)]*\)\s*/g, '').trim() : '';
    const name = rawName || prettyFromSlug(slug);
    if (!name) continue;

    if (!brands.has(slug)) {
      brands.set(slug, {
        make: name,
        slug,
        url: normalizeUrl(anchor.href),
        models: []
      });
    }
  }

  return Array.from(brands.values()).sort((a, b) => a.make.localeCompare(b.make, 'fr'));
}

function extractModels(html, brand) {
  const anchors = parseAnchors(html);
  const models = new Map();
  const slugPattern = new RegExp(`^/fr/neuf/${brand.slug}/([^/]+)(?:/|$)`, 'i');

  for (const anchor of anchors) {
    const match = anchor.href.match(slugPattern);
    if (!match) continue;

    const modelSlug = match[1].toLowerCase();
    if (!modelSlug || modelSlug === brand.slug) continue;
    if (modelSlug === 'devis') continue;

    const rawText = cleanName(anchor.text, brand.make);
    if (!rawText) continue;
    if (/^(Contacter|Contact|Devis|Sur commande)\b/i.test(rawText)) continue;

    const modelName = rawText || prettyFromSlug(modelSlug);
    if (!modelName || modelName.length < 2) continue;
    if (!models.has(modelSlug)) {
      models.set(modelSlug, modelName);
    }
  }

  return Array.from(models.values()).sort((a, b) => a.localeCompare(b, 'fr'));
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; scraper/1.0)' } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

async function run() {
  console.log('Fetching brand list from', START_URL);
  const startHtml = await fetchHtml(START_URL);
  const brands = extractBrandLinks(startHtml);
  console.log(`Found ${brands.length} brands.`);

  for (const brand of brands) {
    try {
      console.log('Fetching models for', brand.make, brand.url);
      const html = await fetchHtml(brand.url);
      const models = extractModels(html, brand);
      brand.models = models;
      console.log(`  → ${models.length} models found`);
    } catch (error) {
      console.error(`  Failed to load models for ${brand.make}:`, error.message);
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'automobile.tn',
    url: START_URL,
    makes: brands.map(brand => ({
      make: brand.make,
      models: brand.models
    }))
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log('Saved result to', OUTPUT_FILE);
}

run().catch(error => {
  console.error('Scraper failed:', error.message);
  process.exit(1);
});
