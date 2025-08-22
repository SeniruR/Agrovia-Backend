
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');


const URL = 'https://dambulladec.com/home-dailyprice';
const CSV_PATH = path.join(__dirname, '../../data/daily-crop-prices.csv');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeDailyPrices() {
  let browser;
  try {
    // Only collect today's data if not already present in CSV
    const allowedCategories = ['vegetable', 'grain', 'rice'];
    const today = new Date().toISOString().slice(0, 10);

    // Quick check: if CSV already contains today, skip the run
    try {
      const existing = await fs.promises.readFile(CSV_PATH, 'utf8');
      const lines = existing.split('\n').map(l => l.trim()).filter(Boolean);
      const dataLines = lines.slice(1);
      const dates = new Set(dataLines.map(l => l.split(',')[0]));
      if (dates.has(today)) {
        console.log(`Data for ${today} already exists in ${CSV_PATH} — skipping scrape.`);
        return;
      }
    } catch (e) {
      // file may not exist yet — proceed
    }

    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    // Load page and extract today's UI
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(800);
    await page.waitForSelector('.grid > div.bg-white', { timeout: 15000 }).catch(() => {});

    const prices = await page.evaluate((allowed) => {
      const cards = Array.from(document.querySelectorAll('.grid > div.bg-white'));
      return cards.map(card => {
        const name = card.querySelector('h2')?.innerText.trim() || '';
        const category = card.querySelector('p.text-gray-500')?.innerText.trim() || '';
        const priceRange = (card.querySelector('p.font-bold')?.innerText.replace('Price Range: ', '').trim()) || '';
        return { name, category, priceRange };
      }).filter(p => p.name && p.priceRange && allowed.some(a => p.category.toLowerCase().includes(a)));
    }, allowedCategories);

    if (!prices.length) {
      console.log(`No prices found for today (${today}).`);
      return;
    }

    await appendToCSV(prices, today);
    console.log(`Scraped and saved ${prices.length} crop prices for ${today}`);
  } catch (err) {
    console.error('Scraping failed:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

async function appendToCSV(prices, runDate) {
  const fsPromises = fs.promises;
  const header = 'date,crop,category,price_range\n';
  let fileExists = false;
  // Ensure directory exists
  const dir = path.dirname(CSV_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    await fsPromises.access(CSV_PATH);
    fileExists = true;
  } catch {}
  // If CSV exists, check whether runDate is already present and skip if so
  if (fileExists) {
    const existing = await fsPromises.readFile(CSV_PATH, 'utf8');
    const lines = existing.split('\n').map(l => l.trim()).filter(Boolean);
    // skip header
    const dataLines = lines.slice(1);
    const dates = new Set(dataLines.map(l => l.split(',')[0]));
    if (dates.has(runDate)) {
      console.log(`Data for ${runDate} already exists in ${CSV_PATH} — skipping append.`);
      return;
    }
  }
  let lines = [];
  if (!fileExists) {
    lines.push(header.trim());
  }
  for (const p of prices) {
    // Use the runDate (the date we requested) instead of relying on the
    // page-rendered date. Some pages always render today's date even when
    // asked for historical dates, so we override to ensure CSV correctness.
    const dateToWrite = runDate;
    lines.push(`${dateToWrite},${p.name},${p.category},${p.priceRange}`);
  }
  await fsPromises.appendFile(CSV_PATH, lines.join('\n') + '\n');
}

function main() {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    // Every minute for development
    console.log('Development mode: scraping every minute');
    cron.schedule('* * * * *', scrapeDailyPrices);
    scrapeDailyPrices();
  } else {
    // 3 times a day: 6am, 12pm, 6pm
    console.log('Production mode: scraping at 6am, 12pm, 6pm');
    cron.schedule('0 6,12,18 * * *', scrapeDailyPrices);
    scrapeDailyPrices();
  }
}

if (require.main === module) {
  main();
}
