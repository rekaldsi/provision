/**
 * PROVISION — Supabase migration via HTTP RPC
 * Uses Supabase service role key to run DDL via REST API
 */
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return text;
}

// Alternative: use Supabase management API
async function runSQLManagement(sql) {
  const projectRef = 'zvyslqwmmjhawplhnhmb';
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// Use pg with session pooler instead
const { Pool } = require('pg');

async function runWithSessionPooler() {
  // Try direct connection string with sslmode
  const dbUrl = process.env.DATABASE_URL;
  // Parse and reconstruct with port 6543 (session mode)
  const parsed = new URL(dbUrl);
  parsed.port = '6543';
  const sessionUrl = parsed.toString();
  
  console.log('[Migrate] Trying session pooler (port 6543)...');
  const pool = new Pool({ 
    connectionString: sessionUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  const client = await pool.connect();
  return { client, pool };
}

const STATEMENTS = [
  // Phase 2: Pharmacy
  `CREATE TABLE IF NOT EXISTS rx_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id TEXT DEFAULT 'default',
    drug_name TEXT NOT NULL,
    drug_generic TEXT,
    dosage TEXT,
    quantity INTEGER DEFAULT 30,
    form TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS rx_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drug_name TEXT NOT NULL,
    source TEXT NOT NULL,
    price NUMERIC NOT NULL,
    pharmacy_name TEXT,
    coupon_url TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
  )`,
  // Phase 2: Rebates
  `CREATE TABLE IF NOT EXISTS rebates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    item_brand TEXT,
    rebate_amount NUMERIC NOT NULL,
    source TEXT NOT NULL,
    source_url TEXT,
    deep_link TEXT,
    valid_until DATE,
    min_quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  // Phase 2: Deals columns
  `ALTER TABLE deals ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 5`,
  `ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_store_brand BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE deals ADD COLUMN IF NOT EXISTS processed_score INTEGER DEFAULT 5`,
  `ALTER TABLE deals ADD COLUMN IF NOT EXISTS flipp_item_id TEXT`,
  `ALTER TABLE deals ADD COLUMN IF NOT EXISTS target_circle_url TEXT`,
  `ALTER TABLE deals ADD COLUMN IF NOT EXISTS store_coupon_value NUMERIC DEFAULT 0`,
  // Dedup index
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_flipp_item_id ON deals(flipp_item_id) WHERE flipp_item_id IS NOT NULL`,
  // Phase 3-4: Pantry
  `CREATE TABLE IF NOT EXISTS pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id TEXT DEFAULT 'default',
    item_name TEXT NOT NULL,
    item_brand TEXT,
    category TEXT,
    quantity NUMERIC DEFAULT 1,
    unit TEXT,
    location TEXT DEFAULT 'pantry',
    expiry_date DATE,
    purchase_date DATE DEFAULT CURRENT_DATE,
    purchase_price NUMERIC,
    store_name TEXT,
    notes TEXT,
    reorder_threshold NUMERIC,
    is_long_term_storage BOOLEAN DEFAULT FALSE,
    shelf_life_months INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id TEXT DEFAULT 'default',
    item_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT,
    retail_value NUMERIC,
    pantry_name TEXT,
    donation_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  // Phase 5: Gas
  `CREATE TABLE IF NOT EXISTS gas_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_name TEXT,
    zip TEXT,
    regular_price NUMERIC,
    premium_price NUMERIC,
    source TEXT DEFAULT 'manual',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS fuel_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id TEXT DEFAULT 'default',
    program TEXT DEFAULT 'jewel',
    balance_points INTEGER DEFAULT 0,
    expires_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, program)
  )`,
  // Phase 6: Amazon
  `CREATE TABLE IF NOT EXISTS amazon_watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id TEXT DEFAULT 'default',
    asin TEXT,
    item_name TEXT NOT NULL,
    target_price NUMERIC,
    current_price NUMERIC,
    all_time_low NUMERIC,
    camel_url TEXT,
    amazon_url TEXT,
    category TEXT,
    is_subscribe_save BOOLEAN DEFAULT FALSE,
    notes TEXT,
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_rx_list_household ON rx_list(household_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rebates_item ON rebates(item_name)`,
  `CREATE INDEX IF NOT EXISTS idx_pantry_household ON pantry_items(household_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pantry_expiry ON pantry_items(expiry_date)`,
  `CREATE INDEX IF NOT EXISTS idx_amazon_watchlist_household ON amazon_watchlist(household_id)`,
  `CREATE INDEX IF NOT EXISTS idx_donations_household ON donations(household_id)`,
  // Pharmacy stores
  `INSERT INTO stores (name, chain, type, city, state, zip, coupon_stacking_policy) VALUES
    ('GoodRx', 'GoodRx', 'pharmacy', 'Online', 'IL', '00000', '{"notes": "Coupon service"}'),
    ('Cost Plus Drugs', 'Cost Plus Drugs', 'pharmacy', 'Online', 'IL', '00000', '{"notes": "Mark Cuban pharmacy"}'),
    ('Walmart Pharmacy', 'Walmart', 'pharmacy', 'Chicago', 'IL', '60639', '{"generic_4_list": true}'),
    ('Costco Pharmacy', 'Costco', 'pharmacy', 'Bridgeview', 'IL', '60455', '{"membership_not_required_for_rx": true}'),
    ('Walgreens', 'Walgreens', 'pharmacy', 'Chicago', 'IL', '60614', '{"rewards": "myWalgreens"}'),
    ('CVS', 'CVS', 'pharmacy', 'Chicago', 'IL', '60618', '{"rewards": "ExtraBucks"}')
  ON CONFLICT DO NOTHING`,
];

async function main() {
  let client, pool;
  try {
    ({ client, pool } = await runWithSessionPooler());
    console.log('[Migrate] Connected via session pooler');

    for (const stmt of STATEMENTS) {
      const label = stmt.slice(0, 60).replace(/\n/g, ' ').trim();
      try {
        await client.query(stmt);
        console.log(`  ✅ ${label}`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`  ⚪ Skip (exists): ${label}`);
        } else {
          console.error(`  ❌ ${label}: ${err.message}`);
        }
      }
    }
    console.log('\n[Migrate] ✅ Migration complete!');
  } catch (err) {
    console.error('[Migrate] Connection failed:', err.message);
    console.log('\nFallback: Apply these tables via Supabase SQL Editor manually if needed.');
    console.log('https://supabase.com/dashboard/project/zvyslqwmmjhawplhnhmb/sql');
  } finally {
    client?.release?.();
    pool?.end?.();
  }
}

main();
