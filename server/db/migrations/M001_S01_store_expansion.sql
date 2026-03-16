-- M001/S01 — Store Connector Expansion
-- Fixes Sam's Club chain mapping and updates coupon stacking policies
-- for Aldi, Target, Sam's Club, and Costco.
-- Run against Supabase SQL editor.

-- Fix Sam's Club chain (was 'Walmart', breaks store color mapping in UI)
UPDATE stores
SET chain = 'Sam''s Club'
WHERE name = 'Sam''s Club';

-- Aldi: confirm no coupons, ALDI Finds are weekly specials only
UPDATE stores
SET coupon_stacking_policy = '{
  "store_plus_manufacturer": false,
  "notes": "Aldi does not accept any coupons. ALDI Finds are limited weekly specials. Price is always final."
}'::jsonb
WHERE name = 'Aldi';

-- Target: full stacking policy with Target Circle details
UPDATE stores
SET coupon_stacking_policy = '{
  "store_plus_manufacturer": true,
  "target_circle_plus_manufacturer": true,
  "max_coupons_per_item": 2,
  "digital_plus_paper": true,
  "circle_url": "https://www.target.com/circle",
  "notes": "Stack: Sale + Target Circle offer (digital) + 1 manufacturer coupon. Circle offers auto-apply at checkout with Circle account."
}'::jsonb
WHERE name = 'Target';

-- Sam's Club: Instant Savings + rebate apps, no traditional coupons
UPDATE stores
SET coupon_stacking_policy = '{
  "store_plus_manufacturer": false,
  "membership_required": true,
  "instant_savings": true,
  "ibotta_accepted": true,
  "fetch_accepted": true,
  "notes": "No traditional coupons. Instant Savings apply automatically (booklet). Ibotta and Fetch rebates work via their apps post-purchase."
}'::jsonb
WHERE name = 'Sam''s Club';

-- Costco: Instant Savings + Executive 2% cashback, no coupons
UPDATE stores
SET coupon_stacking_policy = '{
  "store_plus_manufacturer": false,
  "membership_required": true,
  "instant_savings": true,
  "executive_rewards_pct": 2,
  "notes": "No coupons accepted. Instant Savings apply automatically. Executive members earn 2% annual reward on purchases."
}'::jsonb
WHERE name = 'Costco';

-- Ensure flipp_item_id and target_circle_url columns exist (idempotent)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS flipp_item_id TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS target_circle_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_flipp_item_id ON deals(flipp_item_id) WHERE flipp_item_id IS NOT NULL;
