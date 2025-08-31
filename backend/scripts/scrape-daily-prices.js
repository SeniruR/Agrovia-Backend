
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');


const URL = 'https://dambulladec.com/home-dailyprice';
const CSV_PATH = path.join(__dirname, '../../data/daily-crop-prices.csv');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Attempt to set the site's date picker/select to `runDate` (YYYY-MM-DD).
// Tries input[type=date], select elements, and clickable date lists.
async function trySetDateOnPage(page, runDate) {
  const formats = {
    iso: runDate,
    dmy_slash: runDate.split('-').reverse().join('/'), // DD/MM/YYYY
    dmy_dash: runDate.split('-').reverse().join('-'),
    ymd_slash: runDate.replace(/-/g, '/'),
  };

  // 1) input[type=date]
  const dateInput = await page.$('input[type="date"]');
  if (dateInput) {
    try {
      await page.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, dateInput, formats.iso);
      await sleep(500);
      return true;
    } catch (e) {
      // fall through
    }
  }

  // 2) select elements that may contain date options
  const selects = await page.$$('select');
  for (const sel of selects) {
    try {
      const options = await page.evaluate((s) => Array.from(s.options).map(o => ({ value: o.value, text: o.innerText })), sel);
      const match = options.find(o => [o.text, o.value].some(v => v && (v.includes(formats.iso) || v.includes(formats.dmy_slash) || v.includes(formats.dmy_dash) || v.includes(formats.ymd_slash))));
      if (match) {
        await page.evaluate((s, v) => { s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, sel, match.value);
        await sleep(500);
        return true;
      }
    } catch (e) {
      // ignore and continue
    }
  }

  // 3) clickable date lists / custom pickers (try to click elements containing the date text)
  const candidateSelectors = ['.date-list', '.dates', '.date-picker', '.day', '.calendar-day', '.history-dates', '.select-date'];
  for (const sel of candidateSelectors) {
    const nodes = await page.$$(sel);
    if (!nodes.length) continue;
    try {
      const clicked = await page.evaluate((selector, formats) => {
        const nodes = Array.from(document.querySelectorAll(selector));
        for (const n of nodes) {
          const text = n.innerText || n.textContent || '';
          if ([formats.iso, formats.dmy_slash, formats.dmy_dash, formats.ymd_slash].some(f => f && text.includes(f))) {
            n.click();
            return true;
          }
        }
        return false;
      }, sel, formats);
      if (clicked) {
        await sleep(500);
        return true;
      }
    } catch (e) {
      // ignore and continue
    }
  }

  // 4) last resort: try running a script to set any element with data-date attribute
  try {
    const did = await page.evaluate((formats) => {
      const nodes = Array.from(document.querySelectorAll('[data-date], [data-day]'));
      for (const n of nodes) {
        const v = n.getAttribute('data-date') || n.getAttribute('data-day') || '';
        if ([formats.iso, formats.dmy_slash, formats.dmy_dash, formats.ymd_slash].some(f => f && v.includes(f))) {
          n.click();
          return true;
        }
      }
      return false;
    }, formats);
    if (did) { await sleep(500); return true; }
  } catch (e) {}

  return false;
}

// Try to detect a human-readable displayed date on the page. Returns ISO YYYY-MM-DD or null.
async function getDisplayedDateOnPage(page) {
  try {
    const candidate = await page.evaluate(() => {
      // Common places where sites show the currently selected date
      const selectors = ['.selected-date', '.current-date', '.date-display', '.date-label', 'input[type="date"]'];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (!el) continue;
        const txt = (el.value || el.innerText || el.textContent || '').trim();
        if (!txt) continue;
        return txt;
      }
      // Also check for anywhere that has "Date: YYYY-MM-DD" text
      const re = /\b(\d{4}-\d{2}-\d{2})\b/;
      const body = document.body.innerText || '';
      const m = body.match(re);
      if (m) return m[1];
      return null;
    });
    // Normalize common formats like DD/MM/YYYY -> YYYY-MM-DD
    if (!candidate) return null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(candidate)) {
      const parts = candidate.split('/').reverse();
      return parts.join('-');
    }
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(candidate)) return candidate.replace(/\//g, '-');
    if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
    // Try to find an ISO date inside the string
    const m = candidate.match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : null;
  } catch (e) {
    return null;
  }
}

// Attempt to click a likely "Apply" or "Search" button after changing a date.
async function tryClickApplyButton(page) {
  try {
    const selectors = ['button.apply', 'button.search', 'button[aria-label*="apply"]', 'button[aria-label*="search"]', 'button:contains("Apply")', 'button:contains("Search")'];
    for (const s of selectors) {
      const el = await page.$(s);
      if (el) {
        await el.click();
        await page.waitForTimeout(500);
        return true;
      }
    }
    // fallback: try clicking any button near a date input
    const clicked = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="date"], .date-picker, .date-list'));
      for (const i of inputs) {
        const btn = i.parentElement && i.parentElement.querySelector('button');
        if (btn) { btn.click(); return true; }
      }
      return false;
    });
    return !!clicked;
  } catch (e) { return false; }
}

// Verify the content of the page appears to correspond to runDate.
// Strategy: look for the runDate in page text or for a known date element, and compare.
// A new, simplified function to verify the date after the page reloads.
// It's more reliable because it directly checks the form input's value.
async function verifyPageIsForDate(page, runDate) {
  try {
    // The most reliable source is the value of the date input itself after the page reloads.
    const inputValue = await page.$eval('input[type="date"]', el => el.value);
    if (inputValue === runDate) {
      return true;
    }
    console.warn(`Verification failed: Page shows data for ${inputValue}, but expected ${runDate}.`);
    return false;
  } catch (e) {
    console.error(`Error during date verification for ${runDate}:`, e.message);
    return false;
  }
}


async function scrapeDailyPrices() {
  let browser;
  try {
    const allowedCategories = ['vegetable', 'grain', 'rice'];
    const today = new Date().toISOString().slice(0, 10);

    let existingDates = new Set();
    try {
      const existing = await fs.promises.readFile(CSV_PATH, 'utf8');
      const lines = existing.split('\n').map(l => l.trim()).filter(Boolean);
      const dataLines = lines.slice(1);
      for (const l of dataLines) {
        const parts = l.split(',');
        if (parts[0]) existingDates.add(parts[0]);
      }
    } catch (e) { /* file may not exist yet */ }

    const buildMissingDates = (fromIso, toIso) => {
      const res = [];
      const start = new Date(fromIso);
      const end = new Date(toIso);
      start.setDate(start.getDate() + 1);
      while (start <= end) {
        const iso = start.toISOString().slice(0, 10);
        if (!existingDates.has(iso)) res.push(iso);
        start.setDate(start.getDate() + 1);
      }
      return res;
    };

    let lastDate = existingDates.size ? [...existingDates].sort().pop() : null;

    const datesToFetch = [];
    if (lastDate) {
      datesToFetch.push(...buildMissingDates(lastDate, today));
    }
    if (!existingDates.has(today)) datesToFetch.push(today);

    if (!datesToFetch.length) {
      console.log(`No missing dates to fetch; CSV already up-to-date through ${today}`);
      return;
    }

    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    for (const runDate of datesToFetch) {
      try {
        console.log(`Processing date: ${runDate}`);
        const isToday = (new Date(runDate).toDateString() === new Date().toDateString());

        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // If it's a historical date, we must set the date and submit the form.
        // If it's a historical date, we must set the date and submit the form.
        if (!isToday) {
          console.log(`Attempting to fetch historical data for: ${runDate}`);

          // 1) Try the robust multi-strategy date setter (custom pickers, selects, data-date, etc.)
          let dateSetSuccess = false;
          try {
            dateSetSuccess = await trySetDateOnPage(page, runDate);
            if (dateSetSuccess) {
              console.log(`Interacted with a date element for ${runDate}; waiting for update...`);
              await Promise.race([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
                sleep(8000)
              ]).catch(() => {});
            }
          } catch (e) {
            dateSetSuccess = false;
          }

          // 2) Fallback: try standard input[type=date] + submit button if present
          if (!dateSetSuccess) {
            try {
              // try briefly to find an input and a submit button
              await page.waitForSelector('input[type="date"]', { timeout: 3000 }).catch(() => {});
              await page.evaluate((date) => {
                const dateInput = document.querySelector('input[type="date"]');
                if (dateInput) {
                  dateInput.value = date;
                  dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                  dateInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }, runDate);
              const submitSel = 'form button[type="submit"], button[type="submit"]';
              const searchButton = await page.$(submitSel);
              if (searchButton) {
                await Promise.race([
                  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
                  searchButton.click()
                ]).catch(() => {});
                dateSetSuccess = true;
              }
            } catch (e) {
              // ignore and continue to URL fallback
            }
          }

          // 3) Fallback: try URL patterns that sometimes serve historical pages
          if (!dateSetSuccess) {
            const tryPatterns = [ `${URL}?date=${runDate}`, `${URL}/${runDate}` ];
            for (const candidate of tryPatterns) {
              try {
                await page.goto(candidate, { waitUntil: 'networkidle2', timeout: 15000 });
                await sleep(800);
                const testPrices = await page.evaluate(() => document.querySelectorAll('.grid > div.bg-white').length);
                if (testPrices > 0) { dateSetSuccess = true; break; }
              } catch (e) { /* continue */ }
            }
          }

          // If still not successful, capture some debug HTML and skip this date.
          if (!dateSetSuccess) {
            console.warn(`Could not set or load historical date ${runDate} using any method. Capturing debug output and skipping.`);
            const bodyHTML = await page.evaluate(() => document.body.innerHTML || '');
            console.log(`DEBUG HTML snippet for ${runDate} (first 2000 chars):`);
            console.log(bodyHTML.substring(0, 2000));
            continue;
          }

          // Verify the page now shows the correct date's data before scraping.
          const isCorrectDate = await verifyPageIsForDate(page, runDate);
          if (!isCorrectDate) {
            console.warn(`Failed to verify correct data for ${runDate} after attempts. Skipping.`);
            continue;
          }
        }
        
        // Now, scrape prices from the current page state.
        await page.waitForSelector('.grid > div.bg-white', { timeout: 10000 });
        
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
          console.warn(`No prices found for ${runDate} on the page.`);
          continue;
        }

        await appendToCSV(prices, runDate);
        console.log(`✅ Scraped and saved ${prices.length} crop prices for ${runDate}`);
        existingDates.add(runDate);

      } catch (errInner) {
        console.error(`Scraping for ${runDate} failed:`, errInner.message);
      }
    }
  } catch (err) {
    console.error('A critical error occurred in the scraping process:', err.message);
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
