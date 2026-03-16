/**
 * PROVISION Stack Calculator Engine
 * Core mechanic: computes the final stacked price for any item at any store
 *
 * Stack layers (Phase 1):
 *   1. Base / sale price (from deals table)
 *   2. Store digital coupon (embedded in deals via store coupon fields)
 *   3. Manufacturer coupon (from manufacturer_coupons table)
 *   4. Rebate estimate (Phase 3 — placeholder for now)
 *
 * Flags:
 *   is_near_free: final_price < $0.25
 *   is_free: final_price <= $0.00
 *   is_profit: final_price < $0.00
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Calculate the full stack for one item at one store
 * @param {string} itemName - Item name (fuzzy matched)
 * @param {string} storeId - UUID of the store
 * @returns {Object} Stack result
 */
async function calculateStack(itemName, storeId) {
  const client = await pool.connect();

  try {
    // 1. Find best deal for this item at this store
    const dealResult = await client.query(
      `SELECT d.*, s.name AS store_name, s.coupon_stacking_policy
       FROM deals d
       JOIN stores s ON s.id = d.store_id
       WHERE d.store_id = $1
         AND (LOWER(d.item_name) LIKE LOWER($2) OR LOWER($2) LIKE LOWER('%' || d.item_name || '%'))
         AND (d.valid_until IS NULL OR d.valid_until >= CURRENT_DATE)
       ORDER BY d.sale_price ASC
       LIMIT 1`,
      [storeId, `%${itemName}%`]
    );

    const deal = dealResult.rows[0];
    const basePrice = deal ? parseFloat(deal.sale_price) : null;
    const originalPrice = deal ? parseFloat(deal.original_price) : null;
    const storeName = deal?.store_name || 'Unknown Store';
    const stackingPolicy = deal?.coupon_stacking_policy || {};

    // 2. Find applicable manufacturer coupons
    const mfrResult = await client.query(
      `SELECT *
       FROM manufacturer_coupons
       WHERE (LOWER(item_name) LIKE LOWER($1) OR LOWER($1) LIKE LOWER('%' || item_name || '%'))
         AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
       ORDER BY value DESC
       LIMIT 3`,
      [`%${itemName}%`]
    );

    const mfrCoupons = mfrResult.rows;
    const bestMfrCoupon = mfrCoupons[0] || null;

    // 3. Apply stacking rules
    const canStackMfr = stackingPolicy.store_plus_manufacturer !== false;

    // Stack math
    const storeCouponValue = 0; // Phase 1: store coupons come via deal price already
    let mfrCouponValue = 0;

    if (bestMfrCoupon && canStackMfr && basePrice != null) {
      if (bestMfrCoupon.type === 'dollar_off') {
        mfrCouponValue = parseFloat(bestMfrCoupon.value);
      } else if (bestMfrCoupon.type === 'pct_off') {
        mfrCouponValue = (parseFloat(bestMfrCoupon.value) / 100) * basePrice;
      } else if (bestMfrCoupon.type === 'free') {
        mfrCouponValue = basePrice || 0;
      }
    }

    const rebateValue = 0; // Phase 3 placeholder

    // Final price (floor at 0 for display; is_profit tracks negative)
    const rawFinalPrice = basePrice != null
      ? basePrice - storeCouponValue - mfrCouponValue - rebateValue
      : null;

    const finalPrice = rawFinalPrice != null ? Math.max(rawFinalPrice, 0) : null;
    const actualFinalPrice = rawFinalPrice; // pre-floor for profit flag

    const savingsTotal = basePrice != null && finalPrice != null
      ? basePrice - finalPrice
      : null;

    const savingsPct = originalPrice && originalPrice > 0 && savingsTotal != null
      ? Math.round((savingsTotal / originalPrice) * 100)
      : null;

    // Flags
    const isNearFree = rawFinalPrice != null && rawFinalPrice >= 0 && rawFinalPrice < 0.25;
    const isFree = rawFinalPrice != null && rawFinalPrice <= 0 && actualFinalPrice >= 0;
    const isProfit = rawFinalPrice != null && actualFinalPrice < 0;

    // Stack breakdown layers
    const stackBreakdown = [];

    if (deal) {
      stackBreakdown.push({
        layer: 'sale_price',
        label: `${storeName} Sale`,
        value: -parseFloat((originalPrice - basePrice || 0).toFixed(2)),
        price_after: basePrice,
        source: deal.source,
      });
    }

    if (mfrCouponValue > 0 && bestMfrCoupon) {
      stackBreakdown.push({
        layer: 'manufacturer_coupon',
        label: `Mfr Coupon — ${bestMfrCoupon.source || 'Unknown'}`,
        value: -parseFloat(mfrCouponValue.toFixed(2)),
        price_after: parseFloat((basePrice - mfrCouponValue).toFixed(2)),
        source: bestMfrCoupon.source,
        source_url: bestMfrCoupon.source_url,
        coupon_id: bestMfrCoupon.id,
      });
    }

    if (rebateValue > 0) {
      stackBreakdown.push({
        layer: 'rebate',
        label: 'Ibotta Rebate',
        value: -rebateValue,
        price_after: parseFloat((basePrice - mfrCouponValue - rebateValue).toFixed(2)),
        source: 'ibotta',
      });
    }

    return {
      item_name: itemName,
      store_id: storeId,
      store_name: storeName,
      deal_id: deal?.id || null,
      base_price: basePrice,
      original_price: originalPrice,
      store_coupon_value: storeCouponValue,
      manufacturer_coupon_value: parseFloat(mfrCouponValue.toFixed(2)),
      rebate_value: rebateValue,
      final_price: finalPrice != null ? parseFloat(finalPrice.toFixed(2)) : null,
      savings_total: savingsTotal != null ? parseFloat(savingsTotal.toFixed(2)) : null,
      savings_pct: savingsPct,
      is_near_free: isNearFree,
      is_free: isFree,
      is_profit: isProfit,
      stack_breakdown: stackBreakdown,
      stacking_policy: stackingPolicy,
      manufacturer_coupons_available: mfrCoupons.map((c) => ({
        id: c.id,
        value: c.value,
        type: c.type,
        source: c.source,
        valid_until: c.valid_until,
      })),
      computed_at: new Date().toISOString(),
    };
  } finally {
    client.release();
  }
}

/**
 * Batch calculate stacks for multiple items across all stores
 * @param {Array} items - Array of item objects from items table
 * @returns {Array} Stack results per item, best deal surfaced
 */
async function batchCalculate(items) {
  const client = await pool.connect();

  try {
    // Get all active stores
    const storeResult = await client.query(
      `SELECT id, name FROM stores WHERE active = TRUE`
    );
    const stores = storeResult.rows;

    const results = [];

    for (const item of items) {
      const itemStacks = [];

      for (const store of stores) {
        try {
          const stack = await calculateStack(item.name, store.id);
          if (stack.base_price != null) {
            itemStacks.push(stack);
          }
        } catch (err) {
          // Skip stores with errors silently
        }
      }

      // Sort by final price ascending (best deal first)
      itemStacks.sort((a, b) => (a.final_price ?? 9999) - (b.final_price ?? 9999));

      results.push({
        item_id: item.id,
        item_name: item.name,
        item_brand: item.brand || '',
        best_stack: itemStacks[0] || null,
        all_stacks: itemStacks,
        has_near_free: itemStacks.some((s) => s.is_near_free),
        has_free: itemStacks.some((s) => s.is_free),
        has_profit: itemStacks.some((s) => s.is_profit),
      });
    }

    return results;
  } finally {
    client.release();
  }
}

module.exports = { calculateStack, batchCalculate };
