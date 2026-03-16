require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { getRxPrices, WALMART_GENERICS } = require('./connectors/pharmacy');
const { scrapeAll: flippScrapeAll } = require('./connectors/flipp');
const { enrichDeal, categorizeDeal, qualityScore } = require('./services/dealCategorizer');
const { enrichDealRecord } = require('./services/dealEnricher');
const { classifyStack, classifyDeal, TIERS } = require('./services/alertSystem');
const { getGasIntelligence } = require('./connectors/gas');

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'provision-api', version: '2.0', timestamp: new Date().toISOString() });
});

// ============================================================
// ITEMS — My List
// ============================================================

app.get('/api/items', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('household_id', household_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ items: data });
  } catch (err) {
    console.error('GET /api/items error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const { name, brand, category, quantity = 1, unit, notes, household_id = 'default' } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const { data, error } = await supabase
      .from('items')
      .insert([{ name, brand, category, quantity, unit, notes, household_id }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    console.error('POST /api/items error:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand, category, quantity, unit, notes } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (brand !== undefined) updates.brand = brand;
    if (category !== undefined) updates.category = category;
    if (quantity !== undefined) updates.quantity = quantity;
    if (unit !== undefined) updates.unit = unit;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: data });
  } catch (err) {
    console.error('PUT /api/items/:id error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) throw error;
    res.json({ deleted: true, id });
  } catch (err) {
    console.error('DELETE /api/items/:id error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ============================================================
// STORES
// ============================================================

app.get('/api/stores', async (req, res) => {
  try {
    const { type } = req.query;
    let query = supabase.from('stores').select('*').eq('active', true).order('type').order('name');
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ stores: data });
  } catch (err) {
    console.error('GET /api/stores error:', err);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// ============================================================
// DEALS
// ============================================================

app.get('/api/deals', async (req, res) => {
  try {
    const { store_id, category, search, quality_min, exclude_junk } = req.query;
    let query = supabase
      .from('deals')
      .select('*, stores(name, chain, type)')
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
      .order('discount_pct', { ascending: false, nullsFirst: false })
      .limit(150);

    if (store_id) query = query.eq('store_id', store_id);
    if (category) {
      // Support partial category match (e.g. 'food' matches 'food.protein')
      query = query.ilike('category', `${category}%`);
    }
    if (search) query = query.or(`item_name.ilike.%${search}%,item_brand.ilike.%${search}%`);
    if (quality_min) query = query.gte('quality_score', parseInt(quality_min));

    const { data, error } = await query;
    if (error) throw error;

    let deals = data || [];

    // Apply junk food exclusion if requested
    if (exclude_junk === 'true') {
      const { isJunkFood } = require('./services/dealCategorizer');
      deals = deals.filter(d => !isJunkFood(d.item_name));
    }

    // Enrich with coupon_type and coupon_deep_link (computed at query time)
    const KROGER_FAMILY = ['jewel', 'mariano', "pick 'n save", 'kroger', 'fred meyer', 'king soopers', 'ralphs'];
    deals = deals.map(d => {
      const storeName = (d.stores?.name || d.store_name || '').toLowerCase();
      const coupon_type = (d.item_name || '').toLowerCase().includes('final price with card')
        ? 'loyalty_card' : 'store_sale';
      let coupon_deep_link = null;
      if (KROGER_FAMILY.some(k => storeName.includes(k))) {
        coupon_deep_link = 'https://www.kroger.com/savings/cl/promotions/';
      } else if (storeName.includes('target')) {
        coupon_deep_link = d.target_circle_url || null;
      }
      return { ...d, coupon_type, coupon_deep_link };
    });

    res.json({ deals, total: deals.length });
  } catch (err) {
    console.error('GET /api/deals error:', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

app.get('/api/deals/match', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const { data: items, error: itemsErr } = await supabase
      .from('items')
      .select('*')
      .eq('household_id', household_id);
    if (itemsErr) throw itemsErr;
    if (!items.length) return res.json({ matches: [] });

    const matches = [];
    for (const item of items) {
      const { data: deals, error: dealsErr } = await supabase
        .from('deals')
        .select('*, stores(name, chain)')
        .ilike('item_name', `%${item.name}%`)
        .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
        .order('discount_pct', { ascending: false })
        .limit(5);
      if (dealsErr) throw dealsErr;
      if (deals.length > 0) {
        matches.push({ item, deals, best_deal: deals[0] });
      }
    }
    res.json({ matches });
  } catch (err) {
    console.error('GET /api/deals/match error:', err);
    res.status(500).json({ error: 'Failed to match deals' });
  }
});

// Hot deals endpoint — near free, free, profit + high discount
app.get('/api/deals/hot', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('deals')
      .select('*, stores(name, chain, type)')
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .gte('discount_pct', 30)
      .order('discount_pct', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Enrich with tier classification
    const enriched = (data || []).map(deal => {
      const tier = classifyDeal(deal.sale_price, deal.original_price);
      return { ...deal, tier };
    });

    res.json({ deals: enriched, total: enriched.length });
  } catch (err) {
    console.error('GET /api/deals/hot error:', err);
    res.status(500).json({ error: 'Failed to fetch hot deals' });
  }
});

// Single deal by ID
app.get('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('deals')
      .select('*, stores(name, chain, type)')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Deal not found' });

    const storeName = (data.stores?.name || '').toLowerCase();
    const KROGER_FAMILY = ['jewel', 'mariano', "pick 'n save", 'kroger', 'fred meyer', 'king soopers', 'ralphs'];
    const coupon_type = (data.item_name || '').toLowerCase().includes('final price with card')
      ? 'loyalty_card' : 'store_sale';
    let coupon_deep_link = null;
    if (KROGER_FAMILY.some(k => storeName.includes(k))) {
      coupon_deep_link = 'https://www.kroger.com/savings/cl/promotions/';
    } else if (storeName.includes('target')) {
      coupon_deep_link = data.target_circle_url || null;
    }

    res.json({ deal: { ...data, coupon_type, coupon_deep_link } });
  } catch (err) {
    console.error('GET /api/deals/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// ============================================================
// STACK CALCULATOR (enhanced Phase 2)
// ============================================================

app.post('/api/stack/calculate', async (req, res) => {
  try {
    const { item_name, store_id, item_id } = req.body;
    if (!item_name || !store_id) {
      return res.status(400).json({ error: 'item_name and store_id are required' });
    }

    // 1. Best deal for this item at this store
    const { data: deals } = await supabase
      .from('deals')
      .select('*, stores(name, chain, coupon_stacking_policy)')
      .ilike('item_name', `%${item_name}%`)
      .eq('store_id', store_id)
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
      .order('discount_pct', { ascending: false })
      .limit(1);

    const bestDeal = deals?.[0];
    const base_price = bestDeal?.sale_price ?? null;
    const original_price = bestDeal?.original_price ?? null;
    const stackingPolicy = bestDeal?.stores?.coupon_stacking_policy || {};

    // 2. Manufacturer coupons
    const { data: coupons } = await supabase
      .from('manufacturer_coupons')
      .select('*')
      .ilike('item_name', `%${item_name}%`)
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
      .order('value', { ascending: false })
      .limit(3);

    const bestCoupon = coupons?.[0];
    let mfr_coupon_value = 0;
    if (bestCoupon && stackingPolicy.store_plus_manufacturer !== false && base_price != null) {
      if (bestCoupon.type === 'pct_off') {
        mfr_coupon_value = (parseFloat(bestCoupon.value) / 100) * base_price;
      } else {
        mfr_coupon_value = parseFloat(bestCoupon.value) || 0;
      }
    }

    // 3. Rebates from rebates table
    const { data: rebates } = await supabase
      .from('rebates')
      .select('*')
      .ilike('item_name', `%${item_name}%`)
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
      .order('rebate_amount', { ascending: false })
      .limit(3);

    const bestRebate = rebates?.[0];
    const rebate_value = bestRebate ? parseFloat(bestRebate.rebate_amount) : 0;

    // 4. Store digital coupon (not placeholder — from deal record if available)
    const store_coupon_value = bestDeal?.store_coupon_value || 0;

    // 5. Stack math
    const raw_final = base_price != null
      ? base_price - store_coupon_value - mfr_coupon_value - rebate_value
      : null;
    const final_price = raw_final != null ? parseFloat(raw_final.toFixed(2)) : null;
    const savings_total = base_price != null && final_price != null
      ? parseFloat((base_price - final_price).toFixed(2))
      : 0;
    const savings_pct = original_price && final_price != null
      ? parseFloat(((1 - final_price / original_price) * 100).toFixed(1))
      : null;

    const is_near_free = final_price != null && final_price > 0 && final_price < 0.25;
    const is_free = final_price != null && final_price <= 0;
    const is_profit = final_price != null && final_price < 0;
    const tier = classifyDeal(final_price, original_price);

    const stack_breakdown = [
      bestDeal && { layer: 'Store Sale', value: base_price, label: `${bestDeal.stores?.name} sale price`, source: bestDeal.source },
      store_coupon_value > 0 && { layer: 'Store Digital Coupon', value: -store_coupon_value, label: 'Digital coupon clipped to loyalty card' },
      mfr_coupon_value > 0 && { layer: 'Manufacturer Coupon', value: -mfr_coupon_value, label: `${bestCoupon?.source || 'Manufacturer'} coupon`, source: bestCoupon?.source_url },
      rebate_value > 0 && { layer: 'Rebate', value: -rebate_value, label: `${bestRebate?.source || 'Rebate'} — scan receipt after purchase`, source: bestRebate?.source_url, deep_link: bestRebate?.deep_link },
      { layer: 'Final Price', value: final_price, label: 'After full stack' },
    ].filter(Boolean);

    // 6. Persist to stacks table
    if (item_id && base_price != null) {
      await supabase.from('stacks').insert([{
        item_id, store_id,
        base_price, store_coupon_value, manufacturer_coupon_value: mfr_coupon_value,
        rebate_value, final_price, savings_total, savings_pct,
        stack_breakdown: JSON.stringify(stack_breakdown),
        is_free, is_profit
      }]);
    }

    res.json({
      item_name, store_id,
      store_name: bestDeal?.stores?.name,
      base_price, original_price,
      store_coupon_value, manufacturer_coupon_value: mfr_coupon_value, rebate_value,
      final_price, savings_total, savings_pct,
      is_near_free, is_free, is_profit, tier,
      stack_breakdown,
      rebates_available: (rebates || []).map(r => ({ source: r.source, amount: r.rebate_amount, deep_link: r.deep_link })),
      deal_found: !!bestDeal,
      target_circle_url: bestDeal?.target_circle_url || null,
    });
  } catch (err) {
    console.error('POST /api/stack/calculate error:', err);
    res.status(500).json({ error: 'Stack calculation failed' });
  }
});

// ============================================================
// SHOPPING PLAN
// ============================================================

app.get('/api/shopping-plan', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const { data: items, error: itemsErr } = await supabase
      .from('items').select('*').eq('household_id', household_id);
    if (itemsErr) throw itemsErr;
    if (!items.length) return res.json({ plan: [], total_savings: 0, unmatched_items: [] });

    const { data: allDeals } = await supabase
      .from('deals').select('*, stores(name, chain, type)')
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10));
    const { data: allCoupons } = await supabase
      .from('manufacturer_coupons').select('*')
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10));
    const { data: allRebates } = await supabase
      .from('rebates').select('*')
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10));

    const byStore = {};
    const unmatchedItems = [];
    let totalSavings = 0;
    let nearFreeCount = 0, freeCount = 0, profitCount = 0;

    for (const item of items) {
      const matchedDeals = (allDeals || []).filter(d =>
        d.item_name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(d.item_name.toLowerCase())
      );
      const bestDeal = matchedDeals.sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0))[0];

      if (!bestDeal) {
        unmatchedItems.push({ item_id: item.id, item_name: item.name, item_brand: item.brand });
        continue;
      }

      const bestCoupon = (allCoupons || []).find(c =>
        c.item_name.toLowerCase().includes(item.name.toLowerCase())
      );
      const bestRebate = (allRebates || []).find(r =>
        r.item_name.toLowerCase().includes(item.name.toLowerCase())
      );

      const base_price = parseFloat(bestDeal.sale_price);
      const mfr = parseFloat(bestCoupon?.value || 0);
      const store_coupon = parseFloat(bestDeal.store_coupon_value || 0);
      const rebate = parseFloat(bestRebate?.rebate_amount || 0);
      const final_price = parseFloat(Math.max(-99, base_price - store_coupon - mfr - rebate).toFixed(2));
      const savings = parseFloat((base_price - final_price).toFixed(2));
      const savings_pct = bestDeal.original_price
        ? parseFloat(((1 - final_price / bestDeal.original_price) * 100).toFixed(1))
        : null;

      const is_near_free = final_price > 0 && final_price < 0.25;
      const is_free = final_price <= 0 && final_price >= 0;
      const is_profit = final_price < 0;
      const tier = classifyDeal(final_price, bestDeal.original_price);

      if (is_near_free) nearFreeCount++;
      if (is_free) freeCount++;
      if (is_profit) profitCount++;

      const storeId = bestDeal.store_id;
      const storeName = bestDeal.stores?.name;

      if (!byStore[storeId]) {
        byStore[storeId] = {
          store_id: storeId,
          store_name: storeName,
          store_type: bestDeal.stores?.type,
          items: [],
          trip_savings: 0,
          trip_total: 0,
        };
      }

      byStore[storeId].items.push({
        item_id: item.id,
        item_name: item.name,
        item_brand: item.brand,
        base_price,
        final_price,
        savings_total: savings,
        savings_pct,
        is_near_free, is_free, is_profit, tier,
        coupon_needed: bestCoupon ? `${bestCoupon.source} — $${mfr} off` : null,
        rebate_note: bestRebate
          ? `${bestRebate.source} — $${rebate} back (scan receipt)`
          : null,
        rebate_deep_link: bestRebate?.deep_link || null,
        target_circle_url: bestDeal.target_circle_url || null,
        stack_summary: buildStackSummary({ base_price, store_coupon, mfr, rebate, final_price }),
      });

      byStore[storeId].trip_savings += savings;
      byStore[storeId].trip_total += final_price;
      totalSavings += savings;
    }

    const plan = Object.values(byStore)
      .map(s => ({ ...s, trip_savings: parseFloat(s.trip_savings.toFixed(2)), trip_total: parseFloat(s.trip_total.toFixed(2)) }))
      .sort((a, b) => b.trip_savings - a.trip_savings);

    res.json({
      plan,
      unmatched_items: unmatchedItems,
      total_savings: parseFloat(totalSavings.toFixed(2)),
      near_free_count: nearFreeCount,
      free_count: freeCount,
      profit_count: profitCount,
    });
  } catch (err) {
    console.error('GET /api/shopping-plan error:', err);
    res.status(500).json({ error: 'Failed to generate shopping plan' });
  }
});

function buildStackSummary({ base_price, store_coupon, mfr, rebate, final_price }) {
  const parts = [`$${base_price.toFixed(2)} sale`];
  if (store_coupon > 0) parts.push(`−$${store_coupon.toFixed(2)} store coupon`);
  if (mfr > 0) parts.push(`−$${mfr.toFixed(2)} mfr coupon`);
  if (rebate > 0) parts.push(`−$${rebate.toFixed(2)} rebate`);
  parts.push(`= $${Math.max(0, final_price).toFixed(2)} final`);
  return parts.join(' ');
}

// ============================================================
// PHARMACY MODULE (Phase 2)
// ============================================================

// Full Rx price comparison
app.get('/api/pharmacy/prices', async (req, res) => {
  try {
    const { drug, zip = '60646' } = req.query;
    if (!drug) return res.status(400).json({ error: 'drug name is required' });

    const result = await getRxPrices(drug, zip);
    res.json(result);
  } catch (err) {
    console.error('GET /api/pharmacy/prices error:', err);
    res.status(500).json({ error: 'Failed to fetch Rx prices' });
  }
});

// Walmart $4 generic list
app.get('/api/pharmacy/walmart-generics', async (req, res) => {
  try {
    const { search } = req.query;
    let list = WALMART_GENERICS;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(d => d.drug.toLowerCase().includes(s));
    }
    res.json({ generics: list, total: list.length });
  } catch (err) {
    console.error('GET /api/pharmacy/walmart-generics error:', err);
    res.status(500).json({ error: 'Failed to fetch generics list' });
  }
});

// Rx list CRUD (household, no PHI stored)
app.get('/api/rx-list', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const { data, error } = await supabase
      .from('rx_list')
      .select('*')
      .eq('household_id', household_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ rx_list: data });
  } catch (err) {
    console.error('GET /api/rx-list error:', err);
    res.status(500).json({ error: 'Failed to fetch Rx list' });
  }
});

app.post('/api/rx-list', async (req, res) => {
  try {
    const { drug_name, drug_generic, dosage, quantity = 30, form, notes, household_id = 'default' } = req.body;
    if (!drug_name) return res.status(400).json({ error: 'drug_name is required' });
    const { data, error } = await supabase
      .from('rx_list')
      .insert([{ drug_name, drug_generic, dosage, quantity, form, notes, household_id }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ rx: data });
  } catch (err) {
    console.error('POST /api/rx-list error:', err);
    res.status(500).json({ error: 'Failed to add Rx' });
  }
});

app.delete('/api/rx-list/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('rx_list').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete Rx' });
  }
});

// ============================================================
// ALERTS
// ============================================================

app.get('/api/alerts', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const today = new Date().toISOString().slice(0, 10);

    // Get My List items
    const { data: items } = await supabase
      .from('items').select('*').eq('household_id', household_id);

    // Get hot deals (high discount or near-free)
    const { data: deals } = await supabase
      .from('deals')
      .select('*, stores(name, chain)')
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .gte('discount_pct', 40)
      .order('discount_pct', { ascending: false })
      .limit(30);

    const alerts = [];

    // Match deals against My List
    for (const deal of (deals || [])) {
      const matchedItem = (items || []).find(item =>
        deal.item_name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(deal.item_name.toLowerCase())
      );

      const tier = classifyDeal(deal.sale_price, deal.original_price);
      if (tier && ['PROFIT', 'FREE', 'NEAR FREE', 'HOT DEAL'].includes(tier.label)) {
        alerts.push({
          type: tier.label.toLowerCase().replace(' ', '_'),
          tier,
          deal,
          item_matched: matchedItem || null,
          on_my_list: !!matchedItem,
          message: `${deal.item_name} at ${deal.stores?.name} — ${tier.emoji} ${tier.label}`,
          priority: tier.label === 'PROFIT' ? 1 : tier.label === 'FREE' ? 2 : tier.label === 'NEAR FREE' ? 3 : 4,
        });
      }
    }

    alerts.sort((a, b) => a.priority - b.priority);

    res.json({ alerts, total: alerts.length });
  } catch (err) {
    console.error('GET /api/alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// ============================================================
// REBATES
// ============================================================

app.get('/api/rebates', async (req, res) => {
  try {
    const { source, search } = req.query;
    let query = supabase
      .from('rebates')
      .select('*')
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
      .order('rebate_amount', { ascending: false });

    if (source) query = query.eq('source', source);
    if (search) query = query.ilike('item_name', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ rebates: data });
  } catch (err) {
    console.error('GET /api/rebates error:', err);
    res.status(500).json({ error: 'Failed to fetch rebates' });
  }
});

app.post('/api/rebates', async (req, res) => {
  try {
    const { item_name, item_brand, rebate_amount, source, source_url, deep_link, valid_until } = req.body;
    if (!item_name || !rebate_amount || !source) {
      return res.status(400).json({ error: 'item_name, rebate_amount, and source are required' });
    }
    const { data, error } = await supabase
      .from('rebates')
      .insert([{ item_name, item_brand, rebate_amount: parseFloat(rebate_amount), source, source_url, deep_link, valid_until }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ rebate: data });
  } catch (err) {
    console.error('POST /api/rebates error:', err);
    res.status(500).json({ error: 'Failed to add rebate' });
  }
});

app.delete('/api/rebates/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('rebates').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/rebates error:', err);
    res.status(500).json({ error: 'Failed to delete rebate' });
  }
});

// ============================================================
// SCRAPER TRIGGER (manual or cron-accessible)
// ============================================================

app.post('/api/scrape/flipp', async (req, res) => {
  // Simple auth check — require scraper key in header
  const key = req.headers['x-scraper-key'];
  if (key !== process.env.SCRAPER_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    res.json({ message: 'Scrape started in background' });
    // Non-blocking
    flippScrapeAll().then(result => {
      console.log('[Flipp scrape complete]', result);
    }).catch(err => {
      console.error('[Flipp scrape error]', err);
    });
  } catch (err) {
    res.status(500).json({ error: 'Scrape failed to start' });
  }
});

// ============================================================
// STATS
// ============================================================

app.get('/api/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [
      { count: dealsCount },
      { count: itemsCount },
      { count: nearFreeCount },
      { count: rxCount },
    ] = await Promise.all([
      supabase.from('deals').select('*', { count: 'exact', head: true })
        .or(`valid_until.is.null,valid_until.gte.${today}`),
      supabase.from('items').select('*', { count: 'exact', head: true }),
      supabase.from('deals').select('*', { count: 'exact', head: true })
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .gte('discount_pct', 40),
      supabase.from('rx_list').select('*', { count: 'exact', head: true }),
    ]);

    res.json({
      active_deals: dealsCount || 0,
      list_items: itemsCount || 0,
      near_free_deals: nearFreeCount || 0,
      rx_tracked: rxCount || 0,
    });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================
// PANTRY INVENTORY (Phase 3)
// ============================================================

app.get('/api/pantry', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('household_id', household_id)
      .order('expiry_date', { ascending: true, nullsFirst: false });
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (err) {
    console.error('GET /api/pantry error:', err);
    res.status(500).json({ error: 'Failed to fetch pantry' });
  }
});

app.post('/api/pantry', async (req, res) => {
  try {
    const {
      item_name, item_brand, category, quantity = 1, unit,
      location = 'pantry', expiry_date, purchase_date, purchase_price,
      store_name, notes, reorder_threshold, is_long_term_storage = false,
      shelf_life_months, household_id = 'default'
    } = req.body;
    if (!item_name) return res.status(400).json({ error: 'item_name required' });

    const { data, error } = await supabase
      .from('pantry_items')
      .insert([{
        item_name, item_brand, category, quantity, unit, location,
        expiry_date: expiry_date || null,
        purchase_date: purchase_date || null,
        purchase_price: purchase_price || null,
        store_name, notes, reorder_threshold,
        is_long_term_storage, shelf_life_months, household_id
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    console.error('POST /api/pantry error:', err);
    res.status(500).json({ error: 'Failed to add pantry item' });
  }
});

app.put('/api/pantry/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    const { data, error } = await supabase
      .from('pantry_items')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ item: data });
  } catch (err) {
    console.error('PUT /api/pantry/:id error:', err);
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
});

app.delete('/api/pantry/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('pantry_items').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/pantry/:id error:', err);
    res.status(500).json({ error: 'Failed to delete pantry item' });
  }
});

// ============================================================
// GAS INTELLIGENCE (Phase 5)
// ============================================================

app.get('/api/gas', async (req, res) => {
  try {
    const { zip = '60646', fuel_points = 0 } = req.query;
    const result = await getGasIntelligence(zip, parseInt(fuel_points) || 0);
    res.json(result);
  } catch (err) {
    console.error('GET /api/gas error:', err);
    res.status(500).json({ error: 'Failed to fetch gas intelligence' });
  }
});

// Fuel rewards CRUD
app.get('/api/fuel-rewards', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const { data, error } = await supabase
      .from('fuel_rewards')
      .select('*')
      .eq('household_id', household_id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ rewards: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fuel rewards' });
  }
});

app.post('/api/fuel-rewards', async (req, res) => {
  try {
    const { program = 'jewel', balance_points, expires_date, household_id = 'default' } = req.body;
    // Upsert — one record per program per household
    const { data, error } = await supabase
      .from('fuel_rewards')
      .upsert({ program, balance_points, expires_date, household_id, updated_at: new Date().toISOString() }, { onConflict: 'household_id,program' })
      .select()
      .single();
    if (error) throw error;
    res.json({ reward: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save fuel rewards' });
  }
});

// ============================================================
// AMAZON WATCHLIST (Phase 6)
// ============================================================

app.get('/api/amazon-watchlist', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const { data, error } = await supabase
      .from('amazon_watchlist')
      .select('*')
      .eq('household_id', household_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Amazon watchlist' });
  }
});

app.post('/api/amazon-watchlist', async (req, res) => {
  try {
    const { asin, item_name, target_price, category, notes, is_subscribe_save = false, household_id = 'default' } = req.body;
    if (!item_name) return res.status(400).json({ error: 'item_name required' });

    const amazonUrl = asin ? `https://www.amazon.com/dp/${asin}` : null;
    const camelUrl = asin ? `https://camelcamelcamel.com/product/${asin}` : null;

    const { data, error } = await supabase
      .from('amazon_watchlist')
      .insert([{ asin, item_name, target_price, category, notes, is_subscribe_save, household_id, amazon_url: amazonUrl, camel_url: camelUrl }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

app.delete('/api/amazon-watchlist/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('amazon_watchlist').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete watchlist item' });
  }
});

// ============================================================
// DONATIONS (Phase 4)
// ============================================================

app.get('/api/donations', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('household_id', household_id)
      .order('donation_date', { ascending: false });
    if (error) throw error;
    res.json({ donations: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

app.post('/api/donations', async (req, res) => {
  try {
    const { item_name, quantity, unit, retail_value, pantry_name, donation_date, notes, household_id = 'default' } = req.body;
    if (!item_name || !quantity) return res.status(400).json({ error: 'item_name and quantity required' });
    const { data, error } = await supabase
      .from('donations')
      .insert([{ item_name, quantity, unit, retail_value, pantry_name, donation_date, notes, household_id }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ donation: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log donation' });
  }
});

// ============================================================
// SPA fallback (production)
// ============================================================

if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`PROVISION API v2.0 running on port ${PORT}`);
});
