const https = require('https');
let parseStringPromise = null;
try {
  ({ parseStringPromise } = require('xml2js'));
} catch (error) {
  parseStringPromise = null;
}

const SOURCES = [
  {
    name: 'Hip2Save',
    rssUrl: 'https://hip2save.com/feed/',
    keywords: ['penny', '0.01', '$0.01', 'clearance', 'markdown'],
  },
  {
    name: 'KrazyCouponLady',
    rssUrl: 'https://thekrazycouponlady.com/feed/',
    keywords: ['penny', '0.01', '$0.01', 'penny item', 'penny deal'],
  },
];

const STORE_NAMES = [
  'Target',
  'Walmart',
  'Home Depot',
  'Lowes',
  "Lowe's",
  'CVS',
  'Walgreens',
  'Dollar General',
  'Family Dollar',
  'Dollar Tree',
  'Aldi',
  'Kroger',
  'Jewel',
  'Meijer',
  "Sam's Club",
  'Costco',
];

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(fetchRSS(res.headers.location));
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`RSS fetch failed (${res.statusCode}) for ${url}`));
        return;
      }

      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => resolve(raw));
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`RSS request timeout for ${url}`));
    });
  });
}

function findStoreFromTitle(title = '') {
  const lowerTitle = title.toLowerCase();
  for (const store of STORE_NAMES) {
    if (lowerTitle.includes(store.toLowerCase())) {
      return store === 'Lowes' ? "Lowe's" : store;
    }
  }
  return 'Unknown';
}

function toDateOnly(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function parseNumber(str) {
  const n = Number.parseFloat(str);
  return Number.isFinite(n) ? n : null;
}

function extractPrices(text = '') {
  const matches = text.match(/\$\s*\d+(?:\.\d{1,2})?/g) || [];
  const numbers = matches
    .map((m) => parseNumber(m.replace(/[^0-9.]/g, '')))
    .filter((n) => n != null);

  return {
    first: numbers[0] || null,
    highest: numbers.length ? Math.max(...numbers) : null,
  };
}

function parseDeals(rssXml, source) {
  if (!parseStringPromise) {
    throw new Error('xml2js is required for parseDeals but is not installed');
  }

  return parseStringPromise(rssXml, {
    explicitArray: false,
    mergeAttrs: true,
    trim: true,
  }).then((parsed) => {
    const rawItems = parsed?.rss?.channel?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .filter((item) => {
        const title = (item?.title || '').toString();
        const description = (item?.description || item?.['content:encoded'] || '').toString();
        const blob = `${title} ${description}`.toLowerCase();
        return source.keywords.some((keyword) => blob.includes(keyword.toLowerCase()));
      })
      .map((item) => {
        const title = (item?.title || '').toString().trim();
        const description = (item?.description || item?.['content:encoded'] || '').toString();
        const link = (item?.link || '').toString().trim();
        const pubDate = (item?.pubDate || '').toString();
        const textBlob = `${title} ${description}`;
        const lowerBlob = textBlob.toLowerCase();

        const hasPennySignal = lowerBlob.includes('$0.01') || lowerBlob.includes('penny');
        const prices = extractPrices(textBlob);
        const price = hasPennySignal ? 0.01 : (prices.first || 0.01);
        const originalPrice = prices.highest && prices.highest > price ? prices.highest : null;
        const savingsPct =
          originalPrice && originalPrice > 0
            ? Number((((originalPrice - price) / originalPrice) * 100).toFixed(2))
            : null;

        return {
          store: findStoreFromTitle(title),
          item: title || 'Penny deal',
          category: null,
          price,
          original_price: originalPrice,
          savings_pct: savingsPct,
          spotted_date: toDateOnly(pubDate),
          expires_approx: null,
          source_url: link || null,
          source_name: source.name,
          bulk_worthy: false,
          bulk_notes: null,
          location_type: 'in_store',
          verified: false,
        };
      });
  });
}

async function scrapeAll() {
  const allDeals = [];

  for (const source of SOURCES) {
    try {
      const rssXml = await fetchRSS(source.rssUrl);
      const deals = await parseDeals(rssXml, source);
      allDeals.push(...deals);
    } catch (error) {
      console.error(`[PennyScraper] ${source.name} failed:`, error.message);
    }
  }

  return allDeals;
}

module.exports = { scrapeAll, SOURCES, fetchRSS, parseDeals };
