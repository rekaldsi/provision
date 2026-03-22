CREATE TABLE IF NOT EXISTS penny_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  item TEXT NOT NULL,
  category TEXT,
  price DECIMAL(10,2) DEFAULT 0.01,
  original_price DECIMAL(10,2),
  savings_pct DECIMAL(5,2),
  spotted_date DATE DEFAULT CURRENT_DATE,
  expires_approx DATE,
  source_url TEXT,
  source_name TEXT,
  bulk_worthy BOOLEAN DEFAULT false,
  bulk_notes TEXT,
  location_type TEXT DEFAULT 'in_store',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS penny_deals_store_idx ON penny_deals(store);
CREATE INDEX IF NOT EXISTS penny_deals_spotted_date_idx ON penny_deals(spotted_date);
CREATE INDEX IF NOT EXISTS penny_deals_bulk_worthy_idx ON penny_deals(bulk_worthy);
