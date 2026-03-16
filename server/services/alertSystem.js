/**
 * PROVISION — Alert System (Phase 3)
 * Tier classification: Near Free / Free / Profit
 * Visual badge system for UI
 */

// Alert tier thresholds
const TIERS = {
  PROFIT: { label: 'PROFIT', color: '#fbbf24', bgColor: '#422006', emoji: '🤑', threshold: price => price < 0 },
  FREE: { label: 'FREE', color: '#4ade80', bgColor: '#052e16', emoji: '🆓', threshold: price => price === 0 },
  NEAR_FREE: { label: 'NEAR FREE', color: '#eab308', bgColor: '#422006', emoji: '⚡', threshold: price => price > 0 && price < 0.25 },
  HOT: { label: 'HOT DEAL', color: '#ef4444', bgColor: '#450a0a', emoji: '🔥', threshold: (price, original) => original && (1 - price / original) >= 0.5 },
  GOOD: { label: 'GOOD DEAL', color: '#22c55e', bgColor: '#052e16', emoji: '✅', threshold: (price, original) => original && (1 - price / original) >= 0.25 },
};

function classifyDeal(finalPrice, originalPrice = null) {
  if (finalPrice == null) return null;

  if (TIERS.PROFIT.threshold(finalPrice)) return { ...TIERS.PROFIT };
  if (TIERS.FREE.threshold(finalPrice)) return { ...TIERS.FREE };
  if (TIERS.NEAR_FREE.threshold(finalPrice)) return { ...TIERS.NEAR_FREE };
  if (originalPrice && TIERS.HOT.threshold(finalPrice, originalPrice)) return { ...TIERS.HOT };
  if (originalPrice && TIERS.GOOD.threshold(finalPrice, originalPrice)) return { ...TIERS.GOOD };
  return null;
}

function classifyStack(stack) {
  const { final_price, original_price, savings_pct } = stack;
  const tier = classifyDeal(final_price, original_price);
  return {
    ...stack,
    tier,
    is_near_free: final_price != null && final_price > 0 && final_price < 0.25,
    is_free: final_price != null && final_price <= 0 && final_price >= 0,
    is_profit: final_price != null && final_price < 0,
    alert_priority: tier?.label === 'PROFIT' ? 1 : tier?.label === 'FREE' ? 2 : tier?.label === 'NEAR FREE' ? 3 : tier?.label === 'HOT DEAL' ? 4 : tier?.label === 'GOOD DEAL' ? 5 : 99,
  };
}

module.exports = { classifyDeal, classifyStack, TIERS };
