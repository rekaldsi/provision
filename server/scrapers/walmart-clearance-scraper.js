'use strict';
const axios = require('axios');

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const CLEARANCE_URL = 'https://www.walmart.com/browse/clearance';

/**
 * Try to extract clearance items from Walmart's __NEXT_DATA__ JSON.
 * Returns array of { store, item, price, original_price, savings_pct, url, bulk_worthy }
 */
function parseItems(html) {
  const items = [];
  try {
    const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return items;
    const data = JSON.parse(m[1]);

    // Try several known paths in Walmart's Next.js structure
    const stacks =
      data?.props?.pageProps?.initialData?.searchResult?.itemStacks ||
      data?.props?.pageProps?.searchResult?.itemStacks ||
      [];

    for (const stack of stacks) {
      for (const raw of stack?.items || []) {
        try {
          const price = parseFloat(raw?.priceInfo?.currentPrice?.price ?? raw?.price?.displayPrice ?? 0);
          const original = parseFloat(
            raw?.priceInfo?.wasPrice?.price ??
            raw?.priceInfo?.strikeoutPrice?.price ??
            raw?.price?.strikethrough?.displayPrice ??
            0
          );
          if (!price) continue;

          const savings_pct = original > 0 ? Math.round(((original - price) / original) * 100) : 0;
          const bulk_worthy = original > 0 && original / price >= 5;

          items.push({
            store: 'Walmart',
            item: raw?.name || raw?.title || 'Unknown Item',
            price,
            original_price: original || price,
            savings_pct,
            url: raw?.canonicalUrl
              ? `https://www.walmart.com${raw.canonicalUrl}`
              : CLEARANCE_URL,
            bulk_worthy,
          });
        } catch (_) {
          // skip malformed item
        }
      }
    }
  } catch (err) {
    // parsing failed — return what we have
  }
  return items;
}

async function scrapeWalmartClearance() {
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
    console.error('[walmart-clearance] scrape error:', err.message);
    return [];
  }
}

module.exports = { scrapeWalmartClearance };
