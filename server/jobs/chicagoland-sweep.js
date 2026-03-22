'use strict';
const { createClient } = require('@supabase/supabase-js');
const { classifyTier } = require('../services/pennyTierClassifier');

// Import all scrapers
const scrapers = [
  require('../scrapers/target-clearance-scraper'),
  require('../scrapers/homedepot-clearance-scraper'),
  require('../scrapers/lowes-clearance-scraper'),
  require('../scrapers/bestbuy-clearance-scraper'),
  require('../scrapers/menards-clearance-scraper'),
  require('../scrapers/meijer-clearance-scraper'),
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSweep() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
  );

  let allDeals = [];

  for (const scraper of scrapers) {
    try {
      const name = scraper.scraperName || scraper.name || 'unknown';
      console.log(`Running scraper: ${name}...`);
      const deals = await scraper.scrape();
      console.log(`  Got ${deals.length} deals`);
      allDeals = allDeals.concat(deals);
      await sleep(5000); // 5s between scrapers
    } catch (err) {
      console.error(`Scraper error:`, err.message);
    }
  }

  // Classify tiers
  const classified = allDeals.map((deal) => {
    const tierInfo = classifyTier(deal.price, deal.original_price);
    return { ...deal, tier: tierInfo?.tier || null, chicagoland: true };
  });

  console.log(`Total deals collected: ${classified.length}`);

  // Upsert to Supabase
  if (classified.length > 0) {
    const { error } = await supabase
      .from('penny_deals')
      .upsert(classified, { onConflict: 'source_url' });
    if (error) console.error('Supabase upsert error:', error.message);
    else console.log(`Upserted ${classified.length} deals to penny_deals`);
  }

  return classified;
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  runSweep()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runSweep };
