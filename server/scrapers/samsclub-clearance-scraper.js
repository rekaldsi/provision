'use strict';
const axios = require('axios');

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const CLEARANCE_URL = 'https://www.samsclub.com/b/clearance';

function parseItems(html) {
  const items = [];
  try {
    // Sam's Club also uses Next.js — try __NEXT_DATA__ first
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return items;
    const data = JSON.parse(m[1]);

    const products =
      data?.props?.pageProps?.initialData?.searchResult?.records ||
      data?.props?.pageProps?.searchResult?.records ||
      data?.props?.pageProps?.products ||
      [];

    for (const raw of products) {
      try {
        const priceObj = raw?.prices?.[0] || raw?.finalPrice || {};
        const price = parseFloat(priceObj?.finalPrice ?? priceObj?.salePrice ?? raw?.price ?? 0);
        const original = parseFloat(
          priceObj?.listPrice ?? priceObj?.wasPrice ?? raw?.listPrice ?? 0
        );
        if (!price) continue;

        const savings_pct = original > 0 ? Math.round(((original - price) / original) * 100) : 0;
        const bulk_worthy = original > 0 && original / price >= 5;

        items.push({
          store: "Sam's Club",
          item: raw?.name || raw?.productName || 'Unknown Item',
          price,
          original_price: original || price,
          savings_pct,
          url: raw?.productUrl
            ? `https://www.samsclub.com${raw.productUrl}`
            : CLEARANCE_URL,
          bulk_worthy,
        });
      } catch (_) {
        // skip malformed
      }
    }
  } catch (err) {
    // parsing failed
  }
  return items;
}

async function scrapeSamsClubClearance() {
  try {
    const res = await axios.get(CLEARANCE_URL, {
      headers: {
        'User-Agent': CHROME_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
    });
    return parseItems(res.data);
  } catch (err) {
    console.error('[samsclub-clearance] scrape error:', err.message);
    return [];
  }
}

module.exports = { scrapeSamsClubClearance };
