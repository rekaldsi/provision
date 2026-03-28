'use strict';
const express = require('express');
const { decode, getAllSignals, getSignalsByStore } = require('../services/priceDecoder');
const { lookupBarcode } = require('../services/productLookup');
const { scrapeWalmartClearance } = require('../scrapers/walmart-clearance-scraper');
const { scrapeSamsClubClearance } = require('../scrapers/samsclub-clearance-scraper');
const { scoreBulkWorthiness, getPalletValue } = require('../services/bulkBuyScorer');

const router = express.Router();

// ── In-memory cache for online clearance (1 hr) ─────────────────────────────
let onlineClearanceCache = null;
let onlineClearanceCachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Rate-limit helper: 1 req / 5s between the two scrapers
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Price Decoder ────────────────────────────────────────────────────────────

router.post('/api/decode-price', (req, res) => {
  const { store, price } = req.body || {};
  const result = decode(store, price);
  res.json(result);
});

router.get('/api/price-signals', (req, res) => {
  res.json(getAllSignals());
});

router.get('/api/price-signals/:store', (req, res) => {
  const store = decodeURIComponent(req.params.store || '');
  res.json(getSignalsByStore(store));
});

// ── Product Lookup (Scan Intelligence) ──────────────────────────────────────

router.get('/api/product-lookup/:upc', async (req, res) => {
  try {
    const upc = decodeURIComponent(req.params.upc || '');
    const product = await lookupBarcode(upc);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(product);
  } catch (err) {
    console.error('GET /api/product-lookup/:upc error:', err);
    return res.status(500).json({ error: 'Failed to look up product' });
  }
});

// ── Online Clearance (M003) ──────────────────────────────────────────────────

router.get('/api/online-clearance', async (req, res) => {
  try {
    const now = Date.now();
    if (onlineClearanceCache && now - onlineClearanceCachedAt < CACHE_TTL_MS) {
      return res.json({
        items: onlineClearanceCache,
        cached_at: new Date(onlineClearanceCachedAt).toISOString(),
        from_cache: true,
      });
    }

    // Scrape both — 5s gap between requests
    const walmartItems = await scrapeWalmartClearance();
    await delay(5000);
    const samsItems = await scrapeSamsClubClearance();

    const merged = [...walmartItems, ...samsItems]
      .sort((a, b) => b.savings_pct - a.savings_pct)
      .slice(0, 50);

    onlineClearanceCache = merged;
    onlineClearanceCachedAt = Date.now();

    return res.json({
      items: merged,
      cached_at: new Date(onlineClearanceCachedAt).toISOString(),
      from_cache: false,
    });
  } catch (err) {
    console.error('GET /api/online-clearance error:', err);
    return res.status(500).json({ error: 'Failed to fetch online clearance', items: [] });
  }
});

// ── Bulk Buys (M004) ─────────────────────────────────────────────────────────

router.get('/api/bulk-buys', async (req, res) => {
  try {
    // Lazy-require Supabase to avoid circular deps
    let supabase;
    try {
      ({ supabase } = require('../db/supabase'));
    } catch (_) {
      // fallback: try top-level supabase client
      try {
        supabase = require('../db/supabaseClient');
      } catch (__) {
        supabase = null;
      }
    }

    let deals = [];

    if (supabase) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('penny_deals')
        .select('*')
        .eq('bulk_worthy', true)
        .gte('spotted_date', weekAgo.toISOString().split('T')[0])
        .order('spotted_date', { ascending: false });

      if (error) {
        console.error('bulk-buys supabase error:', error.message);
      } else {
        deals = data || [];
      }
    }

    // Score + enrich with pallet value
    const scored = deals
      .map((d) => ({
        ...d,
        bulk_worthy: scoreBulkWorthiness(d),
        pallet_value: getPalletValue(d.price, 24),
      }))
      .filter((d) => d.bulk_worthy)
      .sort((a, b) => {
        const savA = a.original_price > 0 ? (a.original_price - a.price) / a.original_price : 0;
        const savB = b.original_price > 0 ? (b.original_price - b.price) / b.original_price : 0;
        return savB - savA;
      })
      .slice(0, 10);

    return res.json({ deals: scored });
  } catch (err) {
    console.error('GET /api/bulk-buys error:', err);
    return res.status(500).json({ error: 'Failed to fetch bulk buys', deals: [] });
  }
});

// ── Pallet Calculator endpoint ───────────────────────────────────────────────

router.post('/api/pallet-value', (req, res) => {
  const { price, qty } = req.body || {};
  return res.json(getPalletValue(price, qty));
});

// ── Chicagoland Deals (Phase 9) ──────────────────────────────────────────────

router.get('/api/chicagoland-deals', async (req, res) => {
  // Simple in-memory cache (30 min)
  const now = Date.now();
  const cacheKey = `chicagoland_${req.query.tier || ''}_${req.query.store || ''}`;
  if (!router._cgCache) router._cgCache = {};
  const cached = router._cgCache[cacheKey];
  if (cached && now - cached.at < 30 * 60 * 1000) {
    return res.json(cached.data);
  }

  try {
    let supabase;
    try {
      ({ supabase } = require('../db/supabase'));
    } catch (_) {
      try {
        supabase = require('../db/supabaseClient');
      } catch (__) {
        supabase = null;
      }
    }

    if (!supabase) {
      return res.json({ deals: [], count: 0 });
    }

    const { tier, store } = req.query;
    let query = supabase
      .from('penny_deals')
      .select('*')
      .eq('chicagoland', true)
      .order('spotted_date', { ascending: false })
      .limit(100);

    if (tier) query = query.eq('tier', tier.toUpperCase());
    if (store) query = query.ilike('store', `%${store}%`);

    const { data, error } = await query;
    if (error) throw error;

    const result = { deals: data || [], count: (data || []).length };
    router._cgCache[cacheKey] = { at: now, data: result };
    return res.json(result);
  } catch (err) {
    console.error('chicagoland-deals error:', err.message);
    return res.json({ deals: [], count: 0 });
  }
});

module.exports = router;
