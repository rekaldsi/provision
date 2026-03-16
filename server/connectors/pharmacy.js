/**
 * PROVISION — Pharmacy Intelligence Module
 * Sources:
 *   - GoodRx (API or scraped widget data)
 *   - Mark Cuban's Cost Plus Drugs (costplusdrugs.com scrape)
 *   - Walmart $4/$10 generic list (static)
 *   - Costco / Sam's pharmacy notes (static)
 *
 * Family Rx list: stored in localStorage on client (no PHI on server).
 * Server only handles price lookups — no patient data stored without encryption.
 */

const axios = require('axios');

// ── Walmart $4 Generic List (static, authoritative) ──────────────────────────
// Source: Walmart pharmacy $4/30-day, $10/90-day generics program
const WALMART_GENERICS = [
  // Cardiovascular
  { drug: 'Amlodipine', dosages: ['2.5mg', '5mg', '10mg'], qty30: 4, qty90: 10 },
  { drug: 'Atenolol', dosages: ['25mg', '50mg', '100mg'], qty30: 4, qty90: 10 },
  { drug: 'Benazepril', dosages: ['5mg', '10mg', '20mg', '40mg'], qty30: 4, qty90: 10 },
  { drug: 'Carvedilol', dosages: ['3.125mg', '6.25mg', '12.5mg', '25mg'], qty30: 4, qty90: 10 },
  { drug: 'Enalapril', dosages: ['2.5mg', '5mg', '10mg', '20mg'], qty30: 4, qty90: 10 },
  { drug: 'Furosemide', dosages: ['20mg', '40mg', '80mg'], qty30: 4, qty90: 10 },
  { drug: 'Hydrochlorothiazide', dosages: ['12.5mg', '25mg'], qty30: 4, qty90: 10 },
  { drug: 'Lisinopril', dosages: ['2.5mg', '5mg', '10mg', '20mg', '40mg'], qty30: 4, qty90: 10 },
  { drug: 'Losartan', dosages: ['25mg', '50mg', '100mg'], qty30: 4, qty90: 10 },
  { drug: 'Metoprolol Succinate', dosages: ['25mg', '50mg', '100mg', '200mg'], qty30: 4, qty90: 10 },
  { drug: 'Metoprolol Tartrate', dosages: ['25mg', '50mg', '100mg'], qty30: 4, qty90: 10 },
  { drug: 'Simvastatin', dosages: ['5mg', '10mg', '20mg', '40mg', '80mg'], qty30: 4, qty90: 10 },
  { drug: 'Atorvastatin', dosages: ['10mg', '20mg', '40mg', '80mg'], qty30: 4, qty90: 10 },
  // Diabetes
  { drug: 'Metformin', dosages: ['500mg', '850mg', '1000mg'], qty30: 4, qty90: 10 },
  { drug: 'Glipizide', dosages: ['5mg', '10mg'], qty30: 4, qty90: 10 },
  { drug: 'Glimepiride', dosages: ['1mg', '2mg', '4mg'], qty30: 4, qty90: 10 },
  // Thyroid
  { drug: 'Levothyroxine', dosages: ['25mcg', '50mcg', '75mcg', '100mcg', '125mcg', '150mcg'], qty30: 4, qty90: 10 },
  // Antibiotics
  { drug: 'Amoxicillin', dosages: ['250mg', '500mg', '875mg'], qty30: 4, qty90: 10 },
  { drug: 'Azithromycin', dosages: ['250mg', '500mg'], qty30: 4, qty90: 10 },
  { drug: 'Ciprofloxacin', dosages: ['250mg', '500mg', '750mg'], qty30: 4, qty90: 10 },
  { drug: 'Doxycycline', dosages: ['50mg', '100mg'], qty30: 4, qty90: 10 },
  // Mental health / neuro
  { drug: 'Sertraline', dosages: ['25mg', '50mg', '100mg'], qty30: 4, qty90: 10 },
  { drug: 'Fluoxetine', dosages: ['10mg', '20mg', '40mg'], qty30: 4, qty90: 10 },
  { drug: 'Escitalopram', dosages: ['5mg', '10mg', '20mg'], qty30: 4, qty90: 10 },
  { drug: 'Bupropion', dosages: ['75mg', '100mg', '150mg', '300mg'], qty30: 4, qty90: 10 },
  { drug: 'Trazodone', dosages: ['50mg', '100mg', '150mg'], qty30: 4, qty90: 10 },
  { drug: 'Gabapentin', dosages: ['100mg', '300mg', '400mg', '600mg', '800mg'], qty30: 4, qty90: 10 },
  // Pain / anti-inflammatory
  { drug: 'Ibuprofen (Rx)', dosages: ['400mg', '600mg', '800mg'], qty30: 4, qty90: 10 },
  { drug: 'Naproxen', dosages: ['250mg', '375mg', '500mg'], qty30: 4, qty90: 10 },
  { drug: 'Meloxicam', dosages: ['7.5mg', '15mg'], qty30: 4, qty90: 10 },
  // Allergy / respiratory
  { drug: 'Cetirizine', dosages: ['5mg', '10mg'], qty30: 4, qty90: 10 },
  { drug: 'Loratadine', dosages: ['10mg'], qty30: 4, qty90: 10 },
  { drug: 'Montelukast', dosages: ['4mg', '5mg', '10mg'], qty30: 4, qty90: 10 },
  { drug: 'Albuterol Inhaler', dosages: ['90mcg'], qty30: 4, qty90: 10 },
  // GI
  { drug: 'Omeprazole', dosages: ['10mg', '20mg', '40mg'], qty30: 4, qty90: 10 },
  { drug: 'Pantoprazole', dosages: ['20mg', '40mg'], qty30: 4, qty90: 10 },
  { drug: 'Ondansetron', dosages: ['4mg', '8mg'], qty30: 4, qty90: 10 },
  // Other
  { drug: 'Prednisone', dosages: ['1mg', '2.5mg', '5mg', '10mg', '20mg', '50mg'], qty30: 4, qty90: 10 },
  { drug: 'Tamsulosin', dosages: ['0.4mg'], qty30: 4, qty90: 10 },
  { drug: 'Finasteride', dosages: ['1mg', '5mg'], qty30: 4, qty90: 10 },
];

// ── Costco / Sam's Pharmacy notes (static) ───────────────────────────────────
const WAREHOUSE_RX_NOTES = {
  "Costco Pharmacy": {
    note: "Membership NOT required to use Costco pharmacy. Often 30-50% cheaper than retail chains.",
    url: "https://www.costco.com/pharmacy.html",
    advantage: "No membership needed. Competitive pricing on generics.",
  },
  "Sam's Club Pharmacy": {
    note: "Sam's Club $0 Plus Member Benefit. Non-members can still use pharmacy.",
    url: "https://www.samsclub.com/pharmacy",
    advantage: "Plus members get additional Rx discounts.",
  },
};

// ── GoodRx API (free key approach) ──────────────────────────────────────────
// GoodRx has a free public API for price lookups
async function lookupGoodRx(drugName, zip = '60646') {
  try {
    // GoodRx public prices endpoint (no API key required for basic lookup)
    const url = `https://www.goodrx.com/api/v3/druginfo/?drug=${encodeURIComponent(drugName)}&format=json`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Accept': 'application/json',
        'Referer': 'https://www.goodrx.com/',
      },
      timeout: 10000,
    });

    if (data && data.data && data.data.prices) {
      return data.data.prices.map(p => ({
        source: 'goodrx',
        pharmacy_name: p.pharmacy || 'GoodRx',
        price: parseFloat(p.price) || null,
        coupon_url: `https://www.goodrx.com/${encodeURIComponent(drugName.toLowerCase().replace(/\s+/g, '-'))}`,
        quantity: p.quantity || 30,
      }));
    }
    return [];
  } catch (err) {
    console.warn('[Pharmacy] GoodRx lookup failed:', err.message);
    return [];
  }
}

// ── Cost Plus Drugs scraper ──────────────────────────────────────────────────
async function lookupCostPlus(drugName) {
  try {
    const url = `https://costplusdrugs.com/medications/search/?query=${encodeURIComponent(drugName)}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 10000,
    });

    // Parse price from response — Cost Plus shows "From $X.XX" format
    const priceMatch = data.match(/\$(\d+\.\d{2})/);
    if (priceMatch) {
      return [{
        source: 'costplus',
        pharmacy_name: 'Cost Plus Drugs (costplusdrugs.com)',
        price: parseFloat(priceMatch[1]),
        coupon_url: url,
        quantity: 30,
        note: "Mark Cuban's Cost Plus Drugs — transparent pricing at cost + 15%",
      }];
    }
    return [];
  } catch (err) {
    console.warn('[Pharmacy] Cost Plus lookup failed:', err.message);
    return [];
  }
}

// ── Walmart generic list lookup ───────────────────────────────────────────────
function lookupWalmartGeneric(drugName) {
  const name = drugName.toLowerCase().trim();
  const match = WALMART_GENERICS.find(g =>
    g.drug.toLowerCase().includes(name) || name.includes(g.drug.toLowerCase())
  );
  if (!match) return null;
  return {
    source: 'walmart_generic_list',
    pharmacy_name: 'Walmart Pharmacy',
    price: match.qty30,
    price_90_day: match.qty90,
    quantity: 30,
    dosages_covered: match.dosages,
    note: `Walmart $${match.qty30}/30-day, $${match.qty90}/90-day generic program`,
    url: 'https://www.walmart.com/pharmacy/clinical-services/generic-drugs',
    is_on_walmart_list: true,
  };
}

// ── Full comparison lookup ────────────────────────────────────────────────────
async function getRxPrices(drugName, zip = '60646') {
  const [goodrxPrices, costPlusPrices] = await Promise.all([
    lookupGoodRx(drugName, zip),
    lookupCostPlus(drugName),
  ]);

  const walmartGeneric = lookupWalmartGeneric(drugName);

  const allPrices = [
    ...goodrxPrices,
    ...costPlusPrices,
    ...(walmartGeneric ? [walmartGeneric] : []),
  ];

  // Add warehouse pharmacy notes
  const warehouseNotes = Object.entries(WAREHOUSE_RX_NOTES).map(([name, info]) => ({
    source: 'warehouse_note',
    pharmacy_name: name,
    price: null,
    note: info.note,
    url: info.url,
    advantage: info.advantage,
  }));

  const sorted = allPrices
    .filter(p => p.price !== null)
    .sort((a, b) => a.price - b.price);

  const cheapest = sorted[0] || null;

  return {
    drug_name: drugName,
    prices: sorted,
    warehouse_notes: warehouseNotes,
    cheapest,
    walmart_generic: walmartGeneric,
    on_walmart_4_list: !!walmartGeneric,
    comparison_note: cheapest
      ? `Best price: $${cheapest.price} at ${cheapest.pharmacy_name}`
      : `No automated prices found. Check GoodRx.com or costplusdrugs.com manually.`,
    goodrx_url: `https://www.goodrx.com/${encodeURIComponent(drugName.toLowerCase().replace(/\s+/g, '-'))}`,
    costplus_url: `https://costplusdrugs.com/medications/search/?query=${encodeURIComponent(drugName)}`,
  };
}

module.exports = {
  getRxPrices,
  lookupWalmartGeneric,
  lookupGoodRx,
  lookupCostPlus,
  WALMART_GENERICS,
  WAREHOUSE_RX_NOTES,
};
