'use strict';
const axios = require('axios');

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function extractPrice(text) {
  const m = text.match(/\$?([\d,]+\.?\d*)/);
  return m ? parseFloat(m[1].replace(',', '')) : 0;
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
    'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&q=home+depot+clearance&rss=1',
    'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&q=home+depot+%240.01+penny&rss=1',
    'https://slickdeals.net/newsearch.php?mode=frontpage&searcharea=deals&q=home+depot+clearance+%2460&rss=1',
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

        // Extract price from title
        const priceMatch = rawTitle.match(/\$\s*([\d,]+\.?\d*)/);
        const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

        // Try to extract original price from description
        const origMatch = desc.match(/(?:was|reg(?:ular)?|original|retail)[:\s]*\$\s*([\d,]+\.?\d*)/i);
        const originalPrice = origMatch ? parseFloat(origMatch[1].replace(',', '')) : 0;

        const savingsPct = originalPrice > 0 && price > 0
          ? Math.round(((originalPrice - price) / originalPrice) * 100)
          : 0;

        // Clean up title — remove price suffix
        const cleanTitle = rawTitle.replace(/\s*\$[\d,]+\.?\d*\s*$/, '').replace(/\s+/g, ' ').trim();

        deals.push({
          store: 'Home Depot',
          item: cleanTitle,
          category: 'Clearance',
          price,
          original_price: originalPrice,
          savings_pct: savingsPct,
          spotted_date: today,
          source_url: link || 'https://slickdeals.net',
          source_name: 'Slickdeals / Home Depot',
          location_type: 'in_store',
          store_id: null,
          chicagoland: true,
          zip_code: '60641',
          verified: false,
        });
      }
    } catch (err) {
      console.error('[homedepot-scraper] feed error:', err.message);
    }
  }

  // Dedupe by source_url
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
    console.error('[homedepot-scraper] fatal error:', err.message);
    return [];
  }
}

scrape.scraperName = 'homedepot-clearance';
module.exports = { scrape, scraperName: 'homedepot-clearance' };
