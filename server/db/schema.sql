-- PROVISION Phase 1 Schema
-- Run against Supabase / PostgreSQL

-- Items (My List)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  notes TEXT,
  household_id TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores directory
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  chain TEXT,
  type TEXT, -- grocery, warehouse, dollar, home_improvement, etc.
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'IL',
  zip TEXT,
  lat NUMERIC,
  lng NUMERIC,
  coupon_stacking_policy JSONB DEFAULT '{"store_plus_manufacturer": true, "max_coupons_per_transaction": null}',
  active BOOLEAN DEFAULT TRUE
);

-- Deals (current sale prices)
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  item_brand TEXT,
  store_id UUID REFERENCES stores(id),
  sale_price NUMERIC,
  original_price NUMERIC,
  unit TEXT,
  discount_pct NUMERIC,
  source TEXT,
  source_url TEXT,
  valid_from DATE,
  valid_until DATE,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manufacturer coupons
CREATE TABLE IF NOT EXISTS manufacturer_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  item_brand TEXT,
  value NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('dollar_off', 'pct_off', 'free')) DEFAULT 'dollar_off',
  min_quantity INTEGER DEFAULT 1,
  source TEXT,
  source_url TEXT,
  valid_until DATE,
  categories TEXT[],
  upc TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Computed stack results
CREATE TABLE IF NOT EXISTS stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  base_price NUMERIC,
  store_coupon_value NUMERIC DEFAULT 0,
  manufacturer_coupon_value NUMERIC DEFAULT 0,
  rebate_value NUMERIC DEFAULT 0,
  final_price NUMERIC,
  savings_total NUMERIC,
  savings_pct NUMERIC,
  stack_breakdown JSONB,
  is_free BOOLEAN DEFAULT FALSE,
  is_profit BOOLEAN DEFAULT FALSE,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  item_brand TEXT,
  store_id UUID REFERENCES stores(id),
  price NUMERIC NOT NULL,
  date_observed DATE DEFAULT CURRENT_DATE,
  source TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_store_id ON deals(store_id);
CREATE INDEX IF NOT EXISTS idx_deals_item_name ON deals(item_name);
CREATE INDEX IF NOT EXISTS idx_deals_valid_until ON deals(valid_until);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_items_household ON items(household_id);
CREATE INDEX IF NOT EXISTS idx_stacks_item_id ON stacks(item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(item_name, store_id);

-- ============================================================
-- SEED DATA: Stores
-- ============================================================
INSERT INTO stores (name, chain, type, city, state, zip, coupon_stacking_policy) VALUES
  ('Jewel-Osco', 'Kroger', 'grocery', 'Chicago', 'IL', '60614', '{"store_plus_manufacturer": true, "digital_plus_paper": true, "max_coupons_per_item": 1}'),
  ('Mariano''s', 'Kroger', 'grocery', 'Chicago', 'IL', '60607', '{"store_plus_manufacturer": true, "digital_plus_paper": true, "max_coupons_per_item": 1}'),
  ('Aldi', 'Aldi', 'grocery', 'Chicago', 'IL', '60618', '{"store_plus_manufacturer": false, "notes": "Aldi does not accept manufacturer coupons"}'),
  ('Tony''s Finer Foods', 'Tony''s', 'grocery', 'Chicago', 'IL', '60647', '{"store_plus_manufacturer": true, "max_coupons_per_item": 1}'),
  ('H Mart', 'H Mart', 'grocery', 'Niles', 'IL', '60714', '{"store_plus_manufacturer": true}'),
  ('Seafood City', 'Seafood City', 'grocery', 'Niles', 'IL', '60714', '{"store_plus_manufacturer": true}'),
  ('Target', 'Target', 'general', 'Chicago', 'IL', '60618', '{"store_plus_manufacturer": true, "target_circle_plus_manufacturer": true, "max_coupons_per_item": 2}'),
  ('Walmart', 'Walmart', 'general', 'Chicago', 'IL', '60639', '{"store_plus_manufacturer": true, "price_match": true}'),
  ('Sam''s Club', 'Walmart', 'warehouse', 'Melrose Park', 'IL', '60160', '{"store_plus_manufacturer": false, "membership_required": true}'),
  ('Costco', 'Costco', 'warehouse', 'Bridgeview', 'IL', '60455', '{"store_plus_manufacturer": false, "membership_required": true}'),
  ('Dollar General', 'Dollar General', 'dollar', 'Chicago', 'IL', '60629', '{"store_plus_manufacturer": true, "digital_plus_paper": true}'),
  ('Dollar Tree', 'Dollar Tree', 'dollar', 'Chicago', 'IL', '60651', '{"store_plus_manufacturer": true}'),
  ('Restaurant Depot', 'Restaurant Depot', 'wholesale', 'Chicago', 'IL', '60638', '{"store_plus_manufacturer": false, "notes": "Free membership, bulk pricing"}'),
  ('Home Depot', 'Home Depot', 'home_improvement', 'Chicago', 'IL', '60632', '{"store_plus_manufacturer": true, "price_match": true}'),
  ('Menards', 'Menards', 'home_improvement', 'Melrose Park', 'IL', '60160', '{"store_plus_manufacturer": true, "rebate_11pct": true}'),
  ('Lowe''s', 'Lowe''s', 'home_improvement', 'Chicago', 'IL', '60638', '{"store_plus_manufacturer": true, "price_match": true}')
ON CONFLICT DO NOTHING;

-- Sample deals (for testing stack calculator)
INSERT INTO deals (item_name, item_brand, store_id, sale_price, original_price, unit, discount_pct, source, valid_from, valid_until, category)
SELECT
  'Tide Pods Laundry Detergent', 'Tide', s.id, 8.99, 12.99, '42ct', 30.8, 'kroger_api', CURRENT_DATE, CURRENT_DATE + 7, 'household'
FROM stores s WHERE s.name = 'Jewel-Osco'
ON CONFLICT DO NOTHING;

INSERT INTO deals (item_name, item_brand, store_id, sale_price, original_price, unit, discount_pct, source, valid_from, valid_until, category)
SELECT
  'Pantene Shampoo', 'Pantene', s.id, 2.99, 5.49, '12oz', 45.5, 'kroger_api', CURRENT_DATE, CURRENT_DATE + 7, 'personal_care'
FROM stores s WHERE s.name = 'Jewel-Osco'
ON CONFLICT DO NOTHING;

INSERT INTO deals (item_name, item_brand, store_id, sale_price, original_price, unit, discount_pct, source, valid_from, valid_until, category)
SELECT
  'Cheerios', 'General Mills', s.id, 3.49, 5.29, '18oz', 34.0, 'kroger_api', CURRENT_DATE, CURRENT_DATE + 7, 'food'
FROM stores s WHERE s.name = 'Mariano''s'
ON CONFLICT DO NOTHING;

INSERT INTO deals (item_name, item_brand, store_id, sale_price, original_price, unit, discount_pct, source, valid_from, valid_until, category)
SELECT
  'Bounty Paper Towels', 'Bounty', s.id, 11.97, 16.94, '8 rolls', 29.3, 'walmart_api', CURRENT_DATE, CURRENT_DATE + 14, 'household'
FROM stores s WHERE s.name = 'Walmart'
ON CONFLICT DO NOTHING;

-- Sample manufacturer coupons
INSERT INTO manufacturer_coupons (item_name, item_brand, value, type, min_quantity, source, valid_until, categories) VALUES
  ('Tide Pods', 'Tide', 2.00, 'dollar_off', 1, 'coupons.com', CURRENT_DATE + 30, ARRAY['household', 'laundry']),
  ('Pantene', 'Pantene', 1.00, 'dollar_off', 1, 'p&g_everyday', CURRENT_DATE + 30, ARRAY['personal_care', 'hair_care']),
  ('Bounty', 'Bounty', 0.50, 'dollar_off', 1, 'smartsource', CURRENT_DATE + 14, ARRAY['household', 'paper_goods']),
  ('Cheerios', 'General Mills', 1.00, 'dollar_off', 2, 'coupons.com', CURRENT_DATE + 21, ARRAY['food', 'cereal'])
ON CONFLICT DO NOTHING;

-- Sample My List items
INSERT INTO items (name, brand, category, quantity, unit) VALUES
  ('Tide Pods Laundry Detergent', 'Tide', 'household', 1, '42ct'),
  ('Pantene Shampoo', 'Pantene', 'personal_care', 2, '12oz'),
  ('Cheerios', 'General Mills', 'food', 1, '18oz'),
  ('Bounty Paper Towels', 'Bounty', 'household', 1, '8 rolls')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Phase 2 Schema Additions
-- ============================================================

-- Pharmacy / Rx prices
CREATE TABLE IF NOT EXISTS rx_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  drug_generic TEXT,
  ndc TEXT,
  quantity INTEGER DEFAULT 30,
  dosage TEXT,
  form TEXT, -- tablet, capsule, liquid, etc.
  source TEXT NOT NULL, -- goodrx, costplus, walmart, walgreens, etc.
  price NUMERIC NOT NULL,
  pharmacy_name TEXT,
  store_id UUID REFERENCES stores(id),
  coupon_url TEXT,
  is_generic BOOLEAN DEFAULT FALSE,
  household_member TEXT, -- who it's for (encrypted in prod)
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Rx list (local-storage based on client, but server-side optional)
CREATE TABLE IF NOT EXISTS rx_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id TEXT DEFAULT 'default',
  drug_name TEXT NOT NULL,
  drug_generic TEXT,
  dosage TEXT,
  quantity INTEGER DEFAULT 30,
  form TEXT,
  member_name TEXT, -- optional, stored locally
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals extended with quality/categorization fields
ALTER TABLE deals ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 5; -- 1-10, higher = better quality
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_store_brand BOOLEAN DEFAULT FALSE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS national_brand_compare JSONB; -- {brand, price, savings_vs_national}
ALTER TABLE deals ADD COLUMN IF NOT EXISTS processed_score INTEGER DEFAULT 5; -- 1=ultra-processed, 10=whole food
ALTER TABLE deals ADD COLUMN IF NOT EXISTS flipp_item_id TEXT; -- for dedup
ALTER TABLE deals ADD COLUMN IF NOT EXISTS target_circle_url TEXT; -- Target Circle deep link

-- Rebates table (M002/S02)
CREATE TABLE IF NOT EXISTS rebates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  item_brand TEXT,
  rebate_amount NUMERIC NOT NULL,
  source TEXT NOT NULL, -- ibotta, fetch, checkout51
  source_url TEXT,
  deep_link TEXT,
  valid_until DATE,
  min_quantity INTEGER DEFAULT 1,
  categories TEXT[],
  upc TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals dedup index
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_flipp_item_id ON deals(flipp_item_id) WHERE flipp_item_id IS NOT NULL;

-- Rx indexes
CREATE INDEX IF NOT EXISTS idx_rx_prices_drug ON rx_prices(drug_name);
CREATE INDEX IF NOT EXISTS idx_rx_list_household ON rx_list(household_id);
CREATE INDEX IF NOT EXISTS idx_rebates_item ON rebates(item_name);

-- Additional stores for Phase 2 coverage
INSERT INTO stores (name, chain, type, city, state, zip, coupon_stacking_policy) VALUES
  ('GoodRx', 'GoodRx', 'pharmacy', 'Chicago', 'IL', '60601', '{"notes": "Coupon/price comparison service"}'),
  ('Cost Plus Drugs', 'Cost Plus Drugs', 'pharmacy', 'Online', 'IL', '00000', '{"notes": "Mark Cuban pharmacy — direct cost pricing"}'),
  ('Walmart Pharmacy', 'Walmart', 'pharmacy', 'Chicago', 'IL', '60639', '{"generic_4_list": true, "generic_10_list": true}'),
  ('Costco Pharmacy', 'Costco', 'pharmacy', 'Bridgeview', 'IL', '60455', '{"membership_not_required_for_rx": true}'),
  ('Sam''s Club Pharmacy', 'Walmart', 'pharmacy', 'Melrose Park', 'IL', '60160', '{"membership_not_required_for_rx": true}'),
  ('Walgreens', 'Walgreens', 'pharmacy', 'Chicago', 'IL', '60614', '{"store_plus_manufacturer": true, "rewards": "myWalgreens"}'),
  ('CVS', 'CVS', 'pharmacy', 'Chicago', 'IL', '60618', '{"store_plus_manufacturer": true, "rewards": "ExtraBucks"}'),
  ('Jewel-Osco Pharmacy', 'Kroger', 'pharmacy', 'Chicago', 'IL', '60614', '{"kroger_loyalty": true}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Phase 3-4 Schema: Pantry Inventory + Gas + Amazon
-- ============================================================

-- Pantry Inventory
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id TEXT DEFAULT 'default',
  item_name TEXT NOT NULL,
  item_brand TEXT,
  category TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  location TEXT DEFAULT 'pantry', -- pantry, freezer, long_term, fridge, garage
  expiry_date DATE,
  purchase_date DATE DEFAULT CURRENT_DATE,
  purchase_price NUMERIC,
  store_name TEXT,
  barcode TEXT,
  notes TEXT,
  reorder_threshold NUMERIC, -- alert when qty drops below this
  is_long_term_storage BOOLEAN DEFAULT FALSE,
  seal_date DATE, -- for mylar bags / sealed buckets
  shelf_life_months INTEGER, -- projected shelf life
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Donation log
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

-- Gas prices log
CREATE TABLE IF NOT EXISTS gas_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name TEXT,
  station_type TEXT, -- sam's, costco, bp, amoco, etc.
  zip TEXT,
  regular_price NUMERIC,
  midgrade_price NUMERIC,
  premium_price NUMERIC,
  diesel_price NUMERIC,
  source TEXT DEFAULT 'manual',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Amazon watchlist
CREATE TABLE IF NOT EXISTS amazon_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id TEXT DEFAULT 'default',
  asin TEXT NOT NULL,
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

-- Jewel Fuel Rewards tracker
CREATE TABLE IF NOT EXISTS fuel_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id TEXT DEFAULT 'default',
  program TEXT DEFAULT 'jewel', -- jewel, kroger, samsplus
  balance_points INTEGER DEFAULT 0,
  expires_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pantry indexes
CREATE INDEX IF NOT EXISTS idx_pantry_household ON pantry_items(household_id);
CREATE INDEX IF NOT EXISTS idx_pantry_expiry ON pantry_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_pantry_location ON pantry_items(location);
CREATE INDEX IF NOT EXISTS idx_amazon_watchlist_household ON amazon_watchlist(household_id);
CREATE INDEX IF NOT EXISTS idx_donations_household ON donations(household_id);
