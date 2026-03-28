'use strict';
const axios = require('axios');

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

async function scrapeSlickdeals() {
  const today = todayStr();
  const deals = [];

  const feeds = [
    'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&q=target+clearance&rss=1',
    'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&q=target+penny+clearance&rss=1',
  ];

  for (const feedUrl of feeds) {
    try {
      const res = await axios.get(feedUrl, {
        headers: { 'User-Agent': CHROME_UA, Accept: 'application/rss+xml,application/xml,text/xml' },
        timeout: 12000,
      });

      const items = res.data.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const item of items) {
        const rawTitle = decodeHtmlEntities(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
        const link = decodeHtmlEntities(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] || '');
        const desc = decodeHtmlEntities(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '');

        if (!rawTitle) continue;

        const priceMatch = rawTitle.match(/\$\s*([\d,]+\.?\d*)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

        const origMatch = desc.match(/(?:was|reg(?:ular)?|original|retail)[:\s]*\$\s*([\d,]+\.?\d*)/i);
        const originalPrice = origMatch ? parseFloat(origMatch[1].replace(',', '')) : 0;

        const savingsPct = originalPrice > 0 && price > 0
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0;

        const cleanTitle = rawTitle.replace(/\s*\$[\d,]+\.?\d*\s*$/, '').replace(/\s+/g, ' ').trim();

        deals.push({
          store: 'Target',
          item: cleanTitle,
          category: 'Clearance',
          price,
          original_price: originalPrice,
          savings_pct: savingsPct,
          spotted_date: today,
          source_url: link || 'https://slickdeals.net',
          source_name: 'Slickdeals / Target',
          location_type: 'in_store',
          store_id: null,
          chicagoland: true,
          zip_code: '60641',
          verified: false,
        });
      }
    } catch (err) {
      console.error('[target-scraper] feed error:', err.message);
    }
  }

  const seen = new Set();
  return deals.filter(d => {
    if (seen.has(d.source_url)) return false;
    seen.add(d.source_url);
    return true;
  });
}

async function scrape() {
  try {
    return await scrapeSlickdeals();
  } catch (err) {
    console.error('[target-scraper] fatal error:', err.message);
    return [];
  }
}

scrape.scraperName = 'target-clearance';
module.exports = { scrape, scraperName: 'target-clearance' };
