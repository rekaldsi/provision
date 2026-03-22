'use strict';

const BULK_CATEGORIES = new Set(['food', 'household', 'garden', 'health']);

/**
 * Returns true if the item is worth buying in bulk.
 * Criteria: price <= $0.10 AND category in [food, household, garden, health]
 */
function scoreBulkWorthiness(item) {
  const price = parseFloat(item.price ?? 0);
  const category = (item.category || '').toLowerCase().trim();
  const matchesCategory = Array.from(BULK_CATEGORIES).some((c) => category.includes(c));
  return price <= 0.10 && matchesCategory;
}

/**
 * Estimate retail value of a pallet purchase.
 * Assumes retail is typically 10x the clearance price.
 * Returns { totalCost, estimatedRetailValue, savings }
 */
function getPalletValue(price, qty) {
  const p = parseFloat(price) || 0;
  const q = parseInt(qty, 10) || 0;
  const totalCost = parseFloat((p * q).toFixed(2));
  const estimatedRetailValue = parseFloat((p * q * 10).toFixed(2));
  const savings = parseFloat((estimatedRetailValue - totalCost).toFixed(2));
  return { totalCost, estimatedRetailValue, savings };
}

module.exports = { scoreBulkWorthiness, getPalletValue };
