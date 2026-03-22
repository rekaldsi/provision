-- Phase 9: Add Chicagoland fields to penny_deals
ALTER TABLE penny_deals
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS store_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS chicagoland BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_penny_deals_chicagoland ON penny_deals(chicagoland);
CREATE INDEX IF NOT EXISTS idx_penny_deals_zip_code ON penny_deals(zip_code);
