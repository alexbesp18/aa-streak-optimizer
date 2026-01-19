-- AA Hotel Streak Optimizer Schema
-- Run this in Supabase SQL Editor

-- Hotel rates (one row per hotel per night)
CREATE TABLE IF NOT EXISTS hotel_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination TEXT NOT NULL,
    hotel_name TEXT NOT NULL,
    stay_date DATE NOT NULL,
    cash_price DECIMAL(10,2) NOT NULL,
    points_required INTEGER NOT NULL,
    pts_per_dollar DECIMAL(6,2) GENERATED ALWAYS AS (
        CASE WHEN cash_price > 0 THEN points_required / cash_price ELSE 0 END
    ) STORED,
    stars INTEGER DEFAULT 0,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(destination, hotel_name, stay_date, scraped_at)
);

-- Scrape jobs
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination TEXT NOT NULL,
    check_in_date DATE NOT NULL,
    mode TEXT DEFAULT 'optimal' CHECK (mode IN ('optimal', 'anomaly')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'partial', 'failed')),
    hotels_found INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_rates_destination_date
    ON hotel_rates(destination, stay_date, pts_per_dollar DESC);

CREATE INDEX IF NOT EXISTS idx_rates_historical
    ON hotel_rates(destination, hotel_name, stay_date);

CREATE INDEX IF NOT EXISTS idx_rates_scraped
    ON hotel_rates(scraped_at);

CREATE INDEX IF NOT EXISTS idx_jobs_status
    ON scrape_jobs(status, created_at DESC);

-- Row Level Security
ALTER TABLE hotel_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required)
CREATE POLICY "Public read access for hotel_rates"
    ON hotel_rates FOR SELECT
    USING (true);

CREATE POLICY "Public read access for scrape_jobs"
    ON scrape_jobs FOR SELECT
    USING (true);

-- Service role can insert/update (for API routes)
CREATE POLICY "Service role insert for hotel_rates"
    ON hotel_rates FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role insert for scrape_jobs"
    ON scrape_jobs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role update for scrape_jobs"
    ON scrape_jobs FOR UPDATE
    USING (true);
