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
