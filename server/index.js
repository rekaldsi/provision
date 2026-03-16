require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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
  res.json({ status: 'ok', service: 'provision-api', timestamp: new Date().toISOString() });
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
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('active', true)
      .order('type')
      .order('name');
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
    const { store_id, category, search } = req.query;
    let query = supabase
      .from('deals')
      .select('*, stores(name, chain, type)')
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
      .order('discount_pct', { ascending: false, nullsFirst: false })
      .limit(100);

    if (store_id) query = query.eq('store_id', store_id);
    if (category) query = query.eq('category', category);
    if (search) query = query.or(`item_name.ilike.%${search}%,item_brand.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ deals: data });
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

// ============================================================
// STACK CALCULATOR
// ============================================================

app.post('/api/stack/calculate', async (req, res) => {
  try {
    const { item_name, store_id, item_id } = req.body;
    if (!item_name || !store_id) {
      return res.status(400).json({ error: 'item_name and store_id are required' });
    }

    // 1. Get best deal for this item at this store
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

    // 2. Get manufacturer coupons for this item
    const { data: coupons } = await supabase
      .from('manufacturer_coupons')
      .select('*')
      .ilike('item_name', `%${item_name}%`)
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10))
      .order('value', { ascending: false })
      .limit(3);

    const bestCoupon = coupons?.[0];
    const mfr_coupon_value = bestCoupon?.value ?? 0;

    // 3. Store coupon (digital clip — assume $0.50 placeholder for now)
    const store_coupon_value = bestDeal ? 0.50 : 0;

    // 4. Rebate estimate (Ibotta-style — placeholder $0.75)
    const rebate_value = bestDeal ? 0.75 : 0;

    // 5. Stack math
    const final_price = base_price != null
      ? Math.max(-99, parseFloat((base_price - store_coupon_value - mfr_coupon_value - rebate_value).toFixed(2)))
      : null;
    const savings_total = base_price != null && final_price != null
      ? parseFloat((base_price - final_price).toFixed(2))
      : 0;
    const savings_pct = original_price && final_price != null
      ? parseFloat(((1 - final_price / original_price) * 100).toFixed(1))
      : null;

    const is_near_free = final_price != null && final_price < 0.25 && final_price > 0;
    const is_free = final_price != null && final_price <= 0;
    const is_profit = final_price != null && final_price < 0;

    const stack_breakdown = [
      bestDeal && { layer: 'Store Sale', value: base_price, label: `${bestDeal.stores?.name} sale price`, source: bestDeal.source },
      store_coupon_value > 0 && { layer: 'Store Digital Coupon', value: -store_coupon_value, label: 'Digital coupon clipped to loyalty card' },
      mfr_coupon_value > 0 && { layer: 'Manufacturer Coupon', value: -mfr_coupon_value, label: `${bestCoupon?.source || 'Manufacturer'} coupon`, source: bestCoupon?.source_url },
      rebate_value > 0 && { layer: 'Rebate (Ibotta/Fetch)', value: -rebate_value, label: 'Estimated rebate — scan receipt after purchase' },
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
      is_near_free, is_free, is_profit,
      stack_breakdown,
      deal_found: !!bestDeal,
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
    if (!items.length) return res.json({ plan: [], total_savings: 0 });

    const { data: stores } = await supabase.from('stores').select('id, name, chain').eq('active', true);
    const { data: allDeals } = await supabase
      .from('deals').select('*, stores(name, chain)')
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10));
    const { data: allCoupons } = await supabase
      .from('manufacturer_coupons').select('*')
      .or('valid_until.is.null,valid_until.gte.' + new Date().toISOString().slice(0, 10));

    const byStore = {};
    let totalSavings = 0;
    let nearFreeCount = 0, freeCount = 0, profitCount = 0;

    for (const item of items) {
      const matchedDeals = (allDeals || []).filter(d =>
        d.item_name.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(d.item_name.toLowerCase())
      );
      const bestDeal = matchedDeals.sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0))[0];
      if (!bestDeal) continue;

      const bestCoupon = (allCoupons || []).find(c =>
        c.item_name.toLowerCase().includes(item.name.toLowerCase())
      );

      const base_price = bestDeal.sale_price;
      const mfr = bestCoupon?.value ?? 0;
      const store_coupon = 0.50;
      const rebate = 0.75;
      const final_price = parseFloat(Math.max(-99, base_price - store_coupon - mfr - rebate).toFixed(2));
      const savings = parseFloat((base_price - final_price).toFixed(2));

      const is_near_free = final_price < 0.25 && final_price > 0;
      const is_free = final_price <= 0;
      const is_profit = final_price < 0;

      if (is_near_free) nearFreeCount++;
      if (is_free) freeCount++;
      if (is_profit) profitCount++;

      const storeId = bestDeal.store_id;
      const storeName = bestDeal.stores?.name;

      if (!byStore[storeId]) {
        byStore[storeId] = { store_id: storeId, store_name: storeName, items: [], trip_savings: 0, trip_total: 0 };
      }

      byStore[storeId].items.push({
        item_id: item.id, item_name: item.name, item_brand: item.brand,
        base_price, final_price, savings_total: savings,
        is_near_free, is_free, is_profit,
        coupon_needed: bestCoupon ? `${bestCoupon.source} — $${mfr} off` : null,
        rebate_note: 'Scan receipt in Ibotta/Fetch for ~$0.75 back',
      });

      byStore[storeId].trip_savings += savings;
      byStore[storeId].trip_total += final_price;
      totalSavings += savings;
    }

    const plan = Object.values(byStore).sort((a, b) => b.trip_savings - a.trip_savings);

    res.json({
      plan,
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

// ============================================================
// STATS
// ============================================================

app.get('/api/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [{ count: dealsCount }, { count: itemsCount }] = await Promise.all([
      supabase.from('deals').select('*', { count: 'exact', head: true })
        .or(`valid_until.is.null,valid_until.gte.${today}`),
      supabase.from('items').select('*', { count: 'exact', head: true }),
    ]);

    res.json({
      active_deals: dealsCount || 0,
      list_items: itemsCount || 0,
      near_free_deals: 0, // computed client-side
    });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`PROVISION API running on port ${PORT}`);
});
