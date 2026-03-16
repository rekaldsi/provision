-- PROVISION Phase 2-5 Migration
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zvyslqwmmjhawplhnhmb/sql

-- Phase 2: Pharmacy tables
CREATE TABLE IF NOT EXISTS rx_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id TEXT DEFAULT 'default',
  drug_name TEXT NOT NULL,
  drug_generic TEXT,
  dosage TEXT,
  quantity INTEGER DEFAULT 30,
  form TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rx_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  source TEXT NOT NULL,
  price NUMERIC NOT NULL,
  pharmacy_name TEXT,
  coupon_url TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 2: Rebates
CREATE TABLE IF NOT EXISTS rebates (
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
);

-- Phase 2: Deals columns
ALTER TABLE deals ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 5;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_store_brand BOOLEAN DEFAULT FALSE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS processed_score INTEGER DEFAULT 5;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS flipp_item_id TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS target_circle_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS store_coupon_value NUMERIC DEFAULT 0;

-- Dedup index for Flipp
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_flipp_item_id ON deals(flipp_item_id) WHERE flipp_item_id IS NOT NULL;

-- Phase 3-4: Pantry
CREATE TABLE IF NOT EXISTS pantry_items (
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
);

CREATE TABLE IF NOT EXISTS donations (
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
);

-- Phase 5: Gas
CREATE TABLE IF NOT EXISTS gas_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name TEXT,
  zip TEXT,
  regular_price NUMERIC,
  premium_price NUMERIC,
  source TEXT DEFAULT 'manual',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id TEXT DEFAULT 'default',
  program TEXT DEFAULT 'jewel',
  balance_points INTEGER DEFAULT 0,
  expires_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, program)
);

-- Phase 6: Amazon watchlist
CREATE TABLE IF NOT EXISTS amazon_watchlist (
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
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rx_list_household ON rx_list(household_id);
CREATE INDEX IF NOT EXISTS idx_rebates_item ON rebates(item_name);
CREATE INDEX IF NOT EXISTS idx_pantry_household ON pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_pantry_expiry ON pantry_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_amazon_watchlist_household ON amazon_watchlist(household_id);
CREATE INDEX IF NOT EXISTS idx_donations_household ON donations(household_id);

-- Pharmacy stores
INSERT INTO stores (name, chain, type, city, state, zip, coupon_stacking_policy) VALUES
  ('GoodRx', 'GoodRx', 'pharmacy', 'Online', 'IL', '00000', '{"notes": "Coupon service"}'),
  ('Cost Plus Drugs', 'Cost Plus Drugs', 'pharmacy', 'Online', 'IL', '00000', '{"notes": "Mark Cuban pharmacy"}'),
  ('Walmart Pharmacy', 'Walmart', 'pharmacy', 'Chicago', 'IL', '60639', '{"generic_4_list": true}'),
  ('Costco Pharmacy', 'Costco', 'pharmacy', 'Bridgeview', 'IL', '60455', '{"membership_not_required_for_rx": true}'),
  ('Walgreens', 'Walgreens', 'pharmacy', 'Chicago', 'IL', '60614', '{"rewards": "myWalgreens"}'),
  ('CVS', 'CVS', 'pharmacy', 'Chicago', 'IL', '60618', '{"rewards": "ExtraBucks"}')
ON CONFLICT DO NOTHING;
