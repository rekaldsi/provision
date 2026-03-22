'use strict';
const axios = require('axios');
const { CHICAGOLAND_STORES } = require('../services/chicagolandRegistry');

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function scrapeStoreId(storeId) {
  const url = `https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2?key=9f36aeafbe60771e321a7cc95a78140772ab3e96&channel=WEB&count=24&default_purchasability_filter=false&include_sponsored=false&keyword=clearance&offset=0&page=%2Fs%2Fclearance&platform=desktop&pricing_store_id=${storeId}&scheduled_delivery_store_id=${storeId}&store_id=${storeId}&useragent=Mozilla%2F5.0&visitor_id=01234567890ABCDEF`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent': CHROME_UA,
      Accept: 'application/json',
    },
    timeout: 15000,
  });

  const products = res.data?.data?.search?.products || [];
  const today = todayStr();

  return products.map((p) => {
    const item = p?.item || {};
    const price = item?.price?.current_retail || item?.price?.formatted_current_price_value || 0;
    const regPrice = item?.price?.reg_retail || item?.price?.formatted_comparison_price_value || 0;
    const title = item?.product_description?.title || item?.product_vendors?.[0]?.vendor_name || 'Unknown Item';
    const tcin = item?.tcin || '';
    const savingsPct = regPrice > 0 ? Math.round(((regPrice - price) / regPrice) * 100) : 0;

    return {
      store: 'Target',
      item: title,
      category: 'Clearance',
      price: parseFloat(price) || 0,
      original_price: parseFloat(regPrice) || 0,
      savings_pct: savingsPct,
      spotted_date: today,
      source_url: tcin ? `https://www.target.com/p/${tcin}` : 'https://www.target.com/c/clearance/-/N-5q0ga',
      source_name: 'Target Clearance',
      location_type: 'in_store',
      store_id: storeId,
      chicagoland: true,
      zip_code: null,
    };
  });
}

async function scrape() {
  const allDeals = [];
  for (const storeId of CHICAGOLAND_STORES.target.storeIds) {
    try {
      const deals = await scrapeStoreId(storeId);
      allDeals.push(...deals);
    } catch (err) {
      console.error(`[target-scraper] storeId=${storeId} error:`, err.message);
    }
  }
  return allDeals;
}

scrape.scraperName = 'target-clearance';
module.exports = { scrape };
