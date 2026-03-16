/**
 * PROVISION — Gas Intelligence Module (Phase 5)
 * Sources:
 *   - GasBuddy area average (free API)
 *   - Sam's Club / Costco pump note (static)
 *   - Jewel Fuel Rewards tracker (manual balance input)
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sam's / Costco member gas savings (static notes — actual prices vary by location)
const WAREHOUSE_GAS = {
  "Sam's Club": {
    note: "Sam's Plus members save avg $0.05-0.08/gal over area avg. Non-members can purchase gas.",
    typical_savings: 0.06,
    url: 'https://www.samsclub.com/fuel',
    requires_membership: false,
    plus_benefit: 'Sam\'s Plus: Instant Savings on gas in-club',
  },
  'Costco': {
    note: "Costco Kirkland gas typically $0.05-0.15/gal below area avg. Membership required for gas.",
    typical_savings: 0.10,
    url: 'https://www.costco.com/gasoline',
    requires_membership: true,
    plus_benefit: 'Executive members get 2% cashback on all Costco purchases incl. gas',
  },
};

// Jewel Fuel Rewards logic
function computeJewelFuelRewards(fuelPointBalance) {
  if (!fuelPointBalance || fuelPointBalance <= 0) return null;

  const centsOff = Math.floor(fuelPointBalance / 100); // 100 pts = $0.10/gal
  const maxGallons = 35; // Jewel cap per fill-up

  return {
    points: fuelPointBalance,
    cents_per_gallon: centsOff * 10, // in cents
    dollars_per_gallon: (centsOff * 0.10).toFixed(2),
    max_savings_per_fillup: (centsOff * 0.10 * maxGallons).toFixed(2),
    threshold_alert: fuelPointBalance >= 100,
    redemption_note: `${fuelPointBalance} pts = $${(centsOff * 0.10).toFixed(2)}/gal off (max ${maxGallons} gal = save $${(centsOff * 0.10 * maxGallons).toFixed(2)})`,
    expires_note: 'Fuel rewards expire at end of next month after earning',
    stations: 'BP, Amoco, Mobil, Jewel gas stations',
  };
}

// GasBuddy area average lookup (using their free public endpoint)
async function getAreaGasPrice(zipCode = '60646') {
  try {
    // GasBuddy has a public API endpoint for area averages
    const url = `https://www.gasbuddy.com/api/gas-prices/areas?zipCode=${zipCode}&fuel=1`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Accept': 'application/json',
        'Referer': 'https://www.gasbuddy.com/',
      },
      timeout: 8000,
    });

    if (data && data.data) {
      return {
        area: zipCode,
        regular: data.data.regular_avg,
        midgrade: data.data.midgrade_avg,
        premium: data.data.premium_avg,
        diesel: data.data.diesel_avg,
        source: 'gasbuddy',
        updated: new Date().toISOString(),
      };
    }
    return null;
  } catch (err) {
    // GasBuddy API may not be publicly accessible — return null gracefully
    console.warn('[Gas] GasBuddy lookup failed:', err.message);
    return null;
  }
}

async function getGasIntelligence(zipCode = '60646', fuelPointBalance = 0) {
  const [areaAvg] = await Promise.all([
    getAreaGasPrice(zipCode),
  ]);

  const fuelRewards = computeJewelFuelRewards(fuelPointBalance);

  const warehouseNotes = Object.entries(WAREHOUSE_GAS).map(([name, info]) => ({
    name,
    ...info,
    effective_price: areaAvg?.regular
      ? parseFloat((areaAvg.regular - info.typical_savings).toFixed(3))
      : null,
  }));

  return {
    zip: zipCode,
    area_average: areaAvg,
    warehouse_gas: warehouseNotes,
    jewel_fuel_rewards: fuelRewards,
    tip: areaAvg?.regular
      ? `Area avg: $${areaAvg.regular}/gal. ${
          warehouseNotes[0].effective_price
            ? `Sam's Club est. $${warehouseNotes[0].effective_price}/gal, Costco est. $${warehouseNotes[1].effective_price}/gal.`
            : ''
        }`
      : 'Check GasBuddy.com for live local prices.',
    gasbuddy_url: `https://www.gasbuddy.com/gasprices/illinois/chicago`,
  };
}

module.exports = { getGasIntelligence, computeJewelFuelRewards, WAREHOUSE_GAS };
