-- Phase 9: Chicagoland Clearance Hunter
-- Additive migration — adds zip_code, store_id, chicagoland columns to penny_deals

ALTER TABLE penny_deals
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS store_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS chicagoland BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'CLEARANCE';

CREATE INDEX IF NOT EXISTS penny_deals_chicagoland_idx ON penny_deals(chicagoland);
CREATE INDEX IF NOT EXISTS penny_deals_zip_code_idx ON penny_deals(zip_code);
CREATE INDEX IF NOT EXISTS penny_deals_tier_idx ON penny_deals(tier);
