'use strict';

function classifyTier(price, originalPrice) {
  if (!price || price <= 0) return null;
  if (price <= 0.25) return { tier: 'PENNY', label: 'Penny Deal', color: '#ef4444' };
  if (originalPrice && originalPrice > 0) {
    const savingsPct = ((originalPrice - price) / originalPrice) * 100;
    if (savingsPct >= 70) return { tier: 'DEEP', label: 'Deep Clearance', color: '#f97316' };
    if (savingsPct >= 30) return { tier: 'CLEARANCE', label: 'Clearance', color: '#eab308' };
  }
  return null;
}

module.exports = { classifyTier };
