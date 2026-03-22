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

  for (const storeId of CHICAGOLAND_STORES.bestbuy.storeIds) {
    try {
      const url = `https://www.bestbuy.com/site/searchpage.jsp?st=clearance&sc=Global&cp=1&sp=-curatedrelevancy+skuidsaas&qp=condition_facet%3DCondition~Clearance&storeId=${storeId}`;

      const res = await axios.get(url, {
        headers: {
          'User-Agent': CHROME_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000,
      });

      const $ = cheerio.load(res.data);

      $('li.sku-item, [class*="sku-item"]').each((_, el) => {
        try {
          const title = $(el).find('.sku-title, [class*="sku-title"]').text().trim();
          const salePriceText = $(el).find('[class*="priceView-customer-price"] span').first().text().trim();
          const regPriceText = $(el).find('[class*="pricing-price__regular-price"] span, .regular-price').first().text().trim();
          const link = $(el).find('a.image-link, a[href*="/site/"]').first().attr('href') || '';

          const price = parseFloat(salePriceText.replace(/[^0-9.]/g, '')) || 0;
          const regPrice = parseFloat(regPriceText.replace(/[^0-9.]/g, '')) || 0;
          const savingsPct = regPrice > 0 ? Math.round(((regPrice - price) / regPrice) * 100) : 0;

          if (title && price > 0) {
            allDeals.push({
              store: 'Best Buy',
              item: title,
              category: 'Clearance',
              price,
              original_price: regPrice,
              savings_pct: savingsPct,
              spotted_date: today,
              source_url: link ? `https://www.bestbuy.com${link}` : 'https://www.bestbuy.com/site/searchpage.jsp?st=clearance',
              source_name: 'Best Buy Clearance',
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
      console.error(`[bestbuy-scraper] storeId=${storeId} error:`, err.message);
    }
  }

  return allDeals;
}

scrape.scraperName = 'bestbuy-clearance';
module.exports = { scrape };
