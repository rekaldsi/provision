/**
 * PROVISION — Flipp Connector (v2 — Phase 2 expansion)
 * Covers: Aldi, Target (+ Circle deep links), Sam's Club, Costco,
 *         Jewel, Mariano's, Walmart, Dollar General, Home Depot, Menards, Lowe's
 *
 * Uses Flipp search API — public, no auth needed.
 * Rate-limited: 400ms per request, 7-day Supabase cache.
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { detectStoreBrand, detectNationalBrand } = require('../services/dealCategorizer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const POSTAL_CODE = process.env.FLIPP_ZIP || '60646';

const FLIPP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json, text/javascript, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://flipp.com/',
};

// All target merchants with store matching hints
const MERCHANT_MAP = {
  // Grocery
  'jewel': 'Jewel-Osco',
  'jewel-osco': 'Jewel-Osco',
  "mariano's": "Mariano's",
  'marianos': "Mariano's",
  'aldi': 'Aldi',
  "tony's": "Tony's Finer Foods",
  'tony': "Tony's Finer Foods",
  'h mart': 'H Mart',
  'hmart': 'H Mart',
  'seafood city': 'Seafood City',
  // General
  'target': 'Target',
  'walmart': 'Walmart',
  "sam's club": "Sam's Club",
  'sams club': "Sam's Club",
  'costco': 'Costco',
  // Dollar
  'dollar general': 'Dollar General',
  'dollar tree': 'Dollar Tree',
  'family dollar': 'Dollar General',
  // Home Improvement
  'home depot': 'Home Depot',
  'menards': 'Menards',
  "lowe's": "Lowe's",
  'lowes': "Lowe's",
};

// Quality scoring — whole food items score higher
const QUALITY_KEYWORDS = {
  high: ['organic', 'fresh', 'whole grain', 'fruit', 'vegetable', 'produce', 'chicken', 'beef', 'fish', 'salmon', 'beans', 'lentils', 'eggs', 'milk', 'cheese', 'yogurt', 'nuts', 'seeds', 'oats', 'rice', 'pasta'],
  low: ['soda', 'candy', 'chips', 'cookie', 'cake', 'donut', 'energy drink', 'monster', 'redbull', 'gatorade', 'kool-aid', 'jello', 'snack cake', 'pop tart', 'froot loop', 'lucky charm'],
};

// Target Circle base URL for deep links
const TARGET_CIRCLE_SEARCH = 'https://www.target.com/circle/search?q=';

function scoreQuality(itemName = '', category = '') {
  const name = itemName.toLowerCase();
  if (QUALITY_KEYWORDS.low.some(k => name.includes(k))) return 2;
  if (QUALITY_KEYWORDS.high.some(k => name.includes(k))) return 8;
  if (category === 'food') return 5;
  return 5;
}

function scoreProcessed(itemName = '') {
  const name = itemName.toLowerCase();
  if (QUALITY_KEYWORDS.low.some(k => name.includes(k))) return 2;
  if (QUALITY_KEYWORDS.high.some(k => name.includes(k))) return 9;
  return 5;
}

function categorize(item) {
  const l1 = (item._L1 || '').toLowerCase();
  const l2 = (item._L2 || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  if (l1.includes('food') || l1.includes('beverage') || l1.includes('grocery') || l2.includes('produce')) return 'food';
  if (l1.includes('personal') || l1.includes('health') || l1.includes('beauty') || l2.includes('oral')) return 'personal_care';
  if (l1.includes('home') && (l1.includes('improv') || l2.includes('garden') || l2.includes('tool'))) return 'home_improvement';
  if (l2.includes('household') || l2.includes('cleaning') || l2.includes('paper') || name.includes('detergent')) return 'household';
  if (l1.includes('pharma') || l2.includes('vitamin') || l2.includes('medicine') || name.includes('vitamin')) return 'pharmacy';
  if (l1.includes('auto') || l2.includes('automotive')) return 'auto';
  return 'general';
}

function isTargetMerchant(merchantName) {
  const n = (merchantName || '').toLowerCase();
  return Object.keys(MERCHANT_MAP).some(k => n.includes(k));
}

function resolveStoreName(merchantName) {
  const n = (merchantName || '').toLowerCase();
  for (const [key, val] of Object.entries(MERCHANT_MAP)) {
    if (n.includes(key)) return val;
  }
  return null;
}

async function loadStoreMap() {
  const { data } = await supabase
    .from('stores')
    .select('id, name, chain')
    .eq('active', true);

  const map = {};
  if (data) {
    for (const s of data) {
      map[s.name.toLowerCase()] = s.id;
      if (s.chain) map[s.chain.toLowerCase()] = s.id;
    }
  }
  return map;
}

function matchStoreId(resolvedName, storeMap) {
  if (!resolvedName) return null;
  const n = resolvedName.toLowerCase();
  if (storeMap[n]) return storeMap[n];
  for (const [key, id] of Object.entries(storeMap)) {
    if (key.includes(n) || n.includes(key)) return id;
  }
  return null;
}

async function searchFlipp(query) {
  const url = `https://backflipp.wishabi.com/flipp/items/search?locale=en-US&postal_code=${POSTAL_CODE}&q=${encodeURIComponent(query)}`;
  await new Promise(r => setTimeout(r, 400));
  try {
    const { data } = await axios.get(url, { headers: FLIPP_HEADERS, timeout: 15000 });
    return data.items || [];
  } catch (err) {
    console.warn(`[Flipp] search '${query}' failed:`, err.message);
    return [];
  }
}

function normalizeItem(item, storeId, resolvedStoreName) {
  const name = (item.name || '').trim();
  if (!name) return null;

  const price = parseFloat(item.current_price);
  if (isNaN(price)) return null;

  const original = parseFloat(item.original_price) || null;
  const discountPct = original && original > price
    ? parseFloat(((1 - price / original) * 100).toFixed(1))
    : null;

  const validFrom = (item.valid_from || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  const validUntil = (item.valid_to || '').slice(0, 10) || null;
  const category = categorize(item);

  const targetCircleUrl = resolvedStoreName === 'Target'
    ? `${TARGET_CIRCLE_SEARCH}${encodeURIComponent(name)}`
    : null;

  return {
    item_name: name.slice(0, 200),
    item_brand: null,
    store_id: storeId,
    sale_price: price,
    original_price: original,
    unit: (item.post_price_text || item.sale_story || '').slice(0, 100) || null,
    discount_pct: discountPct,
    source: 'flipp',
    source_url: null,
    valid_from: validFrom,
    valid_until: validUntil,
    category,
    quality_score: scoreQuality(name, category),
    processed_score: scoreProcessed(name),
    is_store_brand: detectStoreBrand(name, resolvedStoreName),
    is_national_brand: detectNationalBrand(name),
    flipp_item_id: String(item.flyer_item_id || item.id || ''),
    target_circle_url: targetCircleUrl,
  };
}

async function upsertDeals(deals) {
  if (!deals.length) return 0;
  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < deals.length; i += batchSize) {
    const batch = deals.slice(i, i + batchSize);
    const { error } = await supabase
      .from('deals')
      .upsert(batch, { onConflict: 'flipp_item_id', ignoreDuplicates: false });

    if (error) {
      console.error('[Flipp] upsert error:', error.message);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

const SEARCH_QUERIES = [
  // Food staples
  'chicken', 'beef', 'pork', 'ground beef', 'steak', 'fish', 'salmon', 'shrimp', 'tilapia',
  'milk', 'cheese', 'yogurt', 'eggs', 'butter', 'cream cheese',
  'bread', 'pasta', 'rice', 'beans', 'lentils', 'cereal', 'oats', 'flour',
  'apple', 'orange', 'banana', 'strawberry', 'blueberry', 'produce', 'vegetables',
  'frozen vegetables', 'frozen fruit', 'canned tomatoes', 'canned beans', 'soup',
  'olive oil', 'vegetable oil', 'vinegar', 'soy sauce', 'hot sauce',
  // Household
  'paper towels', 'toilet paper', 'laundry detergent', 'tide', 'dish soap', 'dishwasher',
  'trash bags', 'zip lock', 'cleaning spray', 'lysol', 'windex', 'swiffer',
  'batteries', 'light bulbs', 'storage bins',
  // Personal care
  'shampoo', 'conditioner', 'body wash', 'bar soap', 'toothpaste', 'deodorant',
  'razors', 'pads', 'tampons', 'lotion', 'sunscreen', 'face wash',
  // Home improvement
  'mulch', 'fertilizer', 'grass seed', 'paint', 'lightbulb', 'extension cord',
  // OTC / vitamins
  'vitamins', 'vitamin d', 'vitamin c', 'ibuprofen', 'allergy', 'cold flu', 'melatonin',
  // Gas / Auto
  'motor oil', 'wiper blades', 'car wash',
  // Warehouse specials
  'bulk rice', 'bulk pasta', 'olive oil gallon', 'paper towel bulk', 'toilet paper bulk',
];

async function scrapeAll() {
  console.log('[Flipp] Starting full scrape — zip:', POSTAL_CODE);
  const storeMap = await loadStoreMap();
  console.log(`[Flipp] ${Object.keys(storeMap).length} store mappings`);

  const allDeals = [];
  const seenIds = new Set();

  for (const query of SEARCH_QUERIES) {
    const items = await searchFlipp(query);
    let added = 0;

    for (const item of items) {
      if (!isTargetMerchant(item.merchant_name)) continue;
      const flippId = String(item.flyer_item_id || item.id || '');
      if (seenIds.has(flippId)) continue;
      seenIds.add(flippId);

      const resolvedName = resolveStoreName(item.merchant_name);
      const storeId = matchStoreId(resolvedName, storeMap);
      if (!storeId) continue;

      const deal = normalizeItem(item, storeId, resolvedName);
      if (deal) {
        allDeals.push(deal);
        added++;
      }
    }

    console.log(`  [Flipp] '${query}': +${added} (total: ${allDeals.length})`);
  }

  console.log(`[Flipp] Scraped ${allDeals.length} unique deals. Upserting...`);
  const count = await upsertDeals(allDeals);
  console.log(`[Flipp] ✅ ${count} deals upserted`);
  return { total: allDeals.length, upserted: count };
}

module.exports = { scrapeAll, searchFlipp, MERCHANT_MAP };
