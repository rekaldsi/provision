'use strict';
const axios = require('axios');
const cheerio = require('cheerio');
const { CHICAGOLAND_STORES } = require('../services/chicagolandRegistry');

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function scrapeStoreId(storeId) {
  const url = `https://www.lowes.com/pl/clearance?storeId=${storeId}`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 15000,
  });

  const html = res.data;
  const today = todayStr();

  // Try __NEXT_DATA__ first
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) {
    try {
      const data = JSON.parse(m[1]);
      const products =
        data?.props?.pageProps?.initialData?.products ||
        data?.props?.pageProps?.products ||
        [];

      if (products.length > 0) {
        return products.map((p) => {
          const price = parseFloat(p?.price?.value || p?.unitSalePrice || 0);
          const regPrice = parseFloat(p?.price?.regularPrice || p?.regularPrice || 0);
          const savingsPct = regPrice > 0 ? Math.round(((regPrice - price) / regPrice) * 100) : 0;

          return {
            store: "Lowe's",
            item: p?.description || p?.name || 'Unknown Item',
            category: 'Clearance',
            price,
            original_price: regPrice,
            savings_pct: savingsPct,
            spotted_date: today,
            source_url: p?.pdUrl ? `https://www.lowes.com${p.pdUrl}` : 'https://www.lowes.com/pl/clearance',
            source_name: "Lowe's Clearance",
            location_type: 'in_store',
            store_id: storeId,
            chicagoland: true,
            zip_code: null,
          };
        });
      }
    } catch (_) {
      // fall through to cheerio parse
    }
  }

  // Fallback: cheerio scrape
  const $ = cheerio.load(html);
  const items = [];

  $('[class*="product-card"], [data-testid*="product"]').each((_, el) => {
    const title = $(el).find('[class*="description"], [class*="title"], h3').first().text().trim();
    const priceText = $(el).find('[class*="price"]').first().text().trim();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    const link = $(el).find('a').attr('href') || '';

    if (title && price > 0) {
      items.push({
        store: "Lowe's",
        item: title,
        category: 'Clearance',
        price,
        original_price: 0,
        savings_pct: 0,
        spotted_date: today,
        source_url: link ? `https://www.lowes.com${link}` : 'https://www.lowes.com/pl/clearance',
        source_name: "Lowe's Clearance",
        location_type: 'in_store',
        store_id: storeId,
        chicagoland: true,
        zip_code: null,
      });
    }
  });

  return items;
}

async function scrape() {
  const allDeals = [];
  for (const storeId of CHICAGOLAND_STORES.lowes.storeIds) {
    try {
      const deals = await scrapeStoreId(storeId);
      allDeals.push(...deals);
    } catch (err) {
      console.error(`[lowes-scraper] storeId=${storeId} error:`, err.message);
    }
  }
  return allDeals;
}

scrape.scraperName = 'lowes-clearance';
module.exports = { scrape };
