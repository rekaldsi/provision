require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { calculateStack, batchCalculate } = require('./services/stackCalculator');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'provision-api', timestamp: new Date().toISOString() });
});

// ============================================================
// ITEMS — My List
// ============================================================

// GET /api/items — list all items
app.get('/api/items', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;
    const result = await pool.query(
      `SELECT * FROM items WHERE household_id = $1 ORDER BY created_at DESC`,
      [household_id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /api/items error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// POST /api/items — add item
app.post('/api/items', async (req, res) => {
  try {
    const { name, brand, category, quantity = 1, unit, notes, household_id = 'default' } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await pool.query(
      `INSERT INTO items (name, brand, category, quantity, unit, notes, household_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, brand || null, category || null, quantity, unit || null, notes || null, household_id]
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error('POST /api/items error:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/items/:id — update item
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, brand, category, quantity, unit, notes } = req.body;

    const result = await pool.query(
      `UPDATE items
       SET name = COALESCE($1, name),
           brand = COALESCE($2, brand),
           category = COALESCE($3, category),
           quantity = COALESCE($4, quantity),
           unit = COALESCE($5, unit),
           notes = COALESCE($6, notes)
       WHERE id = $7
       RETURNING *`,
      [name, brand, category, quantity, unit, notes, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('PUT /api/items/:id error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/items/:id — delete item
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM items WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ deleted: true, id });
  } catch (err) {
    console.error('DELETE /api/items/:id error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ============================================================
// STORES
// ============================================================

// GET /api/stores — list all stores
app.get('/api/stores', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM stores WHERE active = TRUE ORDER BY type, name`
    );
    res.json({ stores: result.rows });
  } catch (err) {
    console.error('GET /api/stores error:', err);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// ============================================================
// DEALS
// ============================================================

// GET /api/deals — list deals
app.get('/api/deals', async (req, res) => {
  try {
    const { store_id, category, search } = req.query;
    const conditions = ['(d.valid_until IS NULL OR d.valid_until >= CURRENT_DATE)'];
    const params = [];
    let i = 1;

    if (store_id) {
      conditions.push(`d.store_id = $${i++}`);
      params.push(store_id);
    }
    if (category) {
      conditions.push(`d.category = $${i++}`);
      params.push(category);
    }
    if (search) {
      conditions.push(`(LOWER(d.item_name) LIKE LOWER($${i}) OR LOWER(d.item_brand) LIKE LOWER($${i}))`);
      params.push(`%${search}%`);
      i++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT d.*, s.name AS store_name, s.chain AS store_chain, s.type AS store_type
       FROM deals d
       LEFT JOIN stores s ON s.id = d.store_id
       ${whereClause}
       ORDER BY d.discount_pct DESC NULLS LAST, d.sale_price ASC
       LIMIT 100`,
      params
    );

    res.json({ deals: result.rows });
  } catch (err) {
    console.error('GET /api/deals error:', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET /api/deals/match — match deals to My List
app.get('/api/deals/match', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;

    // Get all items in My List
    const itemsResult = await pool.query(
      `SELECT * FROM items WHERE household_id = $1`,
      [household_id]
    );
    const items = itemsResult.rows;

    if (items.length === 0) return res.json({ matches: [] });

    // Find deals that match any item in the list
    const matches = [];
    for (const item of items) {
      const dealsResult = await pool.query(
        `SELECT d.*, s.name AS store_name, s.chain AS store_chain
         FROM deals d
         LEFT JOIN stores s ON s.id = d.store_id
         WHERE (LOWER(d.item_name) LIKE LOWER($1) OR LOWER($1) LIKE LOWER('%' || d.item_name || '%'))
           AND (d.valid_until IS NULL OR d.valid_until >= CURRENT_DATE)
         ORDER BY d.discount_pct DESC NULLS LAST
         LIMIT 5`,
        [`%${item.name}%`]
      );

      if (dealsResult.rows.length > 0) {
        matches.push({
          item,
          deals: dealsResult.rows,
          best_deal: dealsResult.rows[0],
        });
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

// POST /api/stack/calculate — compute full stack for an item at a store
app.post('/api/stack/calculate', async (req, res) => {
  try {
    const { item_name, store_id } = req.body;
    if (!item_name || !store_id) {
      return res.status(400).json({ error: 'item_name and store_id are required' });
    }

    const result = await calculateStack(item_name, store_id);

    // Persist result to stacks table if item_id is provided
    const { item_id } = req.body;
    if (item_id && result.base_price != null) {
      await pool.query(
        `INSERT INTO stacks (item_id, store_id, base_price, store_coupon_value, manufacturer_coupon_value, rebate_value, final_price, savings_total, savings_pct, stack_breakdown, is_free, is_profit, computed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         ON CONFLICT DO NOTHING`,
        [
          item_id,
          store_id,
          result.base_price,
          result.store_coupon_value,
          result.manufacturer_coupon_value,
          result.rebate_value,
          result.final_price,
          result.savings_total,
          result.savings_pct,
          JSON.stringify(result.stack_breakdown),
          result.is_free,
          result.is_profit,
        ]
      );
    }

    res.json(result);
  } catch (err) {
    console.error('POST /api/stack/calculate error:', err);
    res.status(500).json({ error: 'Stack calculation failed' });
  }
});

// ============================================================
// SHOPPING PLAN
// ============================================================

// GET /api/shopping-plan — matched deals for all My List items ranked by savings
app.get('/api/shopping-plan', async (req, res) => {
  try {
    const { household_id = 'default' } = req.query;

    const itemsResult = await pool.query(
      `SELECT * FROM items WHERE household_id = $1`,
      [household_id]
    );
    const items = itemsResult.rows;

    if (items.length === 0) return res.json({ plan: [], total_savings: 0 });

    // Batch calculate stacks for all items
    const batchResults = await batchCalculate(items);

    // Group by store (best deal per item)
    const byStore = {};
    let totalSavings = 0;

    for (const result of batchResults) {
      if (!result.best_stack) continue;

      const storeId = result.best_stack.store_id;
      const storeName = result.best_stack.store_name;

      if (!byStore[storeId]) {
        byStore[storeId] = {
          store_id: storeId,
          store_name: storeName,
          items: [],
          trip_savings: 0,
          trip_total: 0,
        };
      }

      const s = result.best_stack;
      byStore[storeId].items.push({
        item_id: result.item_id,
        item_name: result.item_name,
        item_brand: result.item_brand,
        base_price: s.base_price,
        final_price: s.final_price,
        savings_total: s.savings_total,
        savings_pct: s.savings_pct,
        is_near_free: s.is_near_free,
        is_free: s.is_free,
        is_profit: s.is_profit,
        stack_breakdown: s.stack_breakdown,
        deal_id: s.deal_id,
      });

      byStore[storeId].trip_savings += s.savings_total || 0;
      byStore[storeId].trip_total += s.final_price || 0;
      totalSavings += s.savings_total || 0;
    }

    // Sort stores by trip savings desc
    const plan = Object.values(byStore).sort((a, b) => b.trip_savings - a.trip_savings);

    // Items with no deals
    const unmatchedItems = batchResults
      .filter((r) => !r.best_stack)
      .map((r) => ({ item_id: r.item_id, item_name: r.item_name, item_brand: r.item_brand }));

    res.json({
      plan,
      unmatched_items: unmatchedItems,
      total_savings: parseFloat(totalSavings.toFixed(2)),
      near_free_count: batchResults.filter((r) => r.has_near_free).length,
      free_count: batchResults.filter((r) => r.has_free).length,
      profit_count: batchResults.filter((r) => r.has_profit).length,
    });
  } catch (err) {
    console.error('GET /api/shopping-plan error:', err);
    res.status(500).json({ error: 'Failed to generate shopping plan' });
  }
});

// ============================================================
// STATS (for dashboard)
// ============================================================

app.get('/api/stats', async (req, res) => {
  try {
    const [dealsCount, itemsCount, nearFreeCount] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM deals WHERE valid_until >= CURRENT_DATE OR valid_until IS NULL`),
      pool.query(`SELECT COUNT(*) FROM items`),
      pool.query(`SELECT COUNT(*) FROM deals WHERE sale_price < 0.25 AND (valid_until >= CURRENT_DATE OR valid_until IS NULL)`),
    ]);

    res.json({
      active_deals: parseInt(dealsCount.rows[0].count),
      list_items: parseInt(itemsCount.rows[0].count),
      near_free_deals: parseInt(nearFreeCount.rows[0].count),
    });
  } catch (err) {
    console.error('GET /api/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Catch-all: serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`PROVISION API running on port ${PORT}`);
});
