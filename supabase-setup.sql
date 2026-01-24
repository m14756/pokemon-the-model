-- =============================================
-- Pokémon - The Model: Supabase Database Setup
-- =============================================
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- =============================================

-- Create the cards table
CREATE TABLE IF NOT EXISTS cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Card identification
  name TEXT NOT NULL,
  set_name TEXT NOT NULL,
  card_number TEXT,
  rarity TEXT,
  
  -- Images and links
  image_url TEXT,
  tcgplayer_url TEXT,
  
  -- Pricing data
  price_nm DECIMAL(10, 2),
  price_psa9 DECIMAL(10, 2),
  price_psa10 DECIMAL(10, 2),
  price_multiple DECIMAL(5, 1),
  
  -- PSA Population data
  pop_total INTEGER,
  pop_psa10 INTEGER,
  pop_psa9 INTEGER,
  pop_psa8 INTEGER,
  psa10_rate DECIMAL(5, 2),
  
  -- Grading analysis
  grading_score INTEGER,
  grading_recommendation TEXT,
  grading_reasoning TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'success',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_set_name ON cards(set_name);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at DESC);

-- Enable Row Level Security (RLS)
-- For now, we allow all operations (public access)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read all cards
CREATE POLICY "Allow public read access" ON cards
  FOR SELECT
  USING (true);

-- Policy: Allow anyone to insert cards
CREATE POLICY "Allow public insert access" ON cards
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anyone to update cards
CREATE POLICY "Allow public update access" ON cards
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anyone to delete cards
CREATE POLICY "Allow public delete access" ON cards
  FOR DELETE
  USING (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on updates
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DONE! Your database is ready.
-- =============================================
-- Now go to Settings > API and copy:
-- 1. Project URL
-- 2. anon public key
-- Add them to your .env file.
-- =============================================
