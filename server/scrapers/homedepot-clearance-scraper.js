'use strict';
const axios = require('axios');
const { CHICAGOLAND_STORES } = require('../services/chicagolandRegistry');

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function scrapeStoreId(storeId) {
  const url = `https://www.homedepot.com/b/Special-Values-Clearance/N-5yc1vZc7vb?storeId=${storeId}&Nao=0`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 15000,
  });

  const html = res.data;
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];

  const data = JSON.parse(m[1]);
  const products =
    data?.props?.pageProps?.initialData?.searchModel?.products ||
    data?.props?.pageProps?.searchModel?.products ||
    [];

  const today = todayStr();

  return products.map((p) => {
    const price = parseFloat(p?.pricing?.value || p?.pricing?.specialPrice || 0);
    const regPrice = parseFloat(p?.pricing?.original || p?.pricing?.wasPrice || 0);
    const savingsPct = regPrice > 0 ? Math.round(((regPrice - price) / regPrice) * 100) : 0;
    const productUrl = p?.identifiers?.canonicalUrl
      ? `https://www.homedepot.com${p.identifiers.canonicalUrl}`
      : 'https://www.homedepot.com/b/Special-Values-Clearance/N-5yc1vZc7vb';

    return {
      store: 'Home Depot',
      item: p?.identifiers?.productLabel || p?.identifiers?.brandName || 'Unknown Item',
      category: 'Clearance',
      price,
      original_price: regPrice,
      savings_pct: savingsPct,
      spotted_date: today,
      source_url: productUrl,
      source_name: 'Home Depot Clearance',
      location_type: 'in_store',
      store_id: storeId,
      chicagoland: true,
      zip_code: null,
    };
  });
}

async function scrape() {
  const allDeals = [];
  for (const storeId of CHICAGOLAND_STORES.homedepot.storeIds) {
    try {
      const deals = await scrapeStoreId(storeId);
      allDeals.push(...deals);
    } catch (err) {
      console.error(`[homedepot-scraper] storeId=${storeId} error:`, err.message);
    }
  }
  return allDeals;
}

scrape.scraperName = 'homedepot-clearance';
module.exports = { scrape };
