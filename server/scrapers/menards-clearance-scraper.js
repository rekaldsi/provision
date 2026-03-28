'use strict';
const axios = require('axios');
const cheerio = require('cheerio');
const { CHICAGOLAND_STORES } = require('../services/chicagolandRegistry');

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function scrape() {
  const allDeals = [];
  const today = todayStr();
  const storeId = CHICAGOLAND_STORES.menards.storeIds[0];

  try {
    const url = 'https://www.menards.com/main/sale-clearance/c-11798.htm';

    const res = await axios.get(url, {
      headers: {
        'User-Agent': CHROME_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(res.data);

    $('[class*="product-card"], .product-card, [data-testid*="product"], .product-listing__product').each((_, el) => {
      try {
        const title = $(el).find('[class*="description"], [class*="title"], h3, .product-description__title').first().text().trim();
        const salePriceText = $(el).find('[class*="sale-price"], [class*="price-sale"], .price__sale').first().text().trim();
        const regPriceText = $(el).find('[class*="regular-price"], [class*="price-regular"], .price__regular, s').first().text().trim();
        const link = $(el).find('a').first().attr('href') || '';

        const price = parseFloat(salePriceText.replace(/[^0-9.]/g, '')) || 0;
        const regPrice = parseFloat(regPriceText.replace(/[^0-9.]/g, '')) || 0;
        const savingsPct = regPrice > 0 ? Math.round(((regPrice - price) / regPrice) * 100) : 0;

        if (title && price > 0) {
          allDeals.push({
            store: 'Menards',
            item: title,
            category: 'Clearance',
            price,
            original_price: regPrice,
            savings_pct: savingsPct,
            spotted_date: today,
            source_url: link
              ? (link.startsWith('http') ? link : `https://www.menards.com${link}`)
              : 'https://www.menards.com/main/sale-clearance/c-11798.htm',
            source_name: 'Menards Clearance',
            location_type: 'in_store',
            store_id: storeId,
            chicagoland: true,
            zip_code: null,
          });
        }
      } catch (_) {
        // skip malformed item
      }
    });
  } catch (err) {
    console.error('[menards-scraper] error:', err.message);
  }

  return allDeals;
}

scrape.scraperName = 'menards-clearance';
module.exports = { scrape };
