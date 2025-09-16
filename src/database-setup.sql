-- Supabase Database Setup for Arya Honda KPI Dashboard
-- Run this script in your Supabase SQL editor to create the required tables

-- Table for storing KPI data from CSV uploads
CREATE TABLE IF NOT EXISTS kpi_data (
  id BIGSERIAL PRIMARY KEY,
  tags TEXT NOT NULL,
  parameters TEXT NOT NULL,
  monthly_target DECIMAL NOT NULL DEFAULT 0,
  target_mtd DECIMAL NOT NULL DEFAULT 0,
  actual_as_on_date DECIMAL NOT NULL DEFAULT 0,
  shortfall DECIMAL NOT NULL DEFAULT 0,
  percentage_ach DECIMAL NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking upload sessions
CREATE TABLE IF NOT EXISTS upload_sessions (
  id BIGSERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  location TEXT NOT NULL,
  records_count INTEGER NOT NULL DEFAULT 0,
  file_size BIGINT NOT NULL DEFAULT 0,
  upload_status TEXT NOT NULL CHECK (upload_status IN ('success', 'error', 'processing')),
  error_messages TEXT[],
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kpi_data_location ON kpi_data(location);
CREATE INDEX IF NOT EXISTS idx_kpi_data_created_at ON kpi_data(created_at);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_location ON upload_sessions(location);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_created_at ON upload_sessions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE kpi_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (you can modify these based on your security needs)
-- Allow anonymous users to read all data
CREATE POLICY "Allow anonymous select on kpi_data" ON kpi_data
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous select on upload_sessions" ON upload_sessions
  FOR SELECT USING (true);

-- Allow anonymous users to insert new data
CREATE POLICY "Allow anonymous insert on kpi_data" ON kpi_data
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous insert on upload_sessions" ON upload_sessions
  FOR INSERT WITH CHECK (true);

-- Allow anonymous users to delete data (for replacing location data)
CREATE POLICY "Allow anonymous delete on kpi_data" ON kpi_data
  FOR DELETE USING (true);

-- Create updated_at trigger function for kpi_data
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for kpi_data
DROP TRIGGER IF EXISTS update_kpi_data_updated_at ON kpi_data;
CREATE TRIGGER update_kpi_data_updated_at
  BEFORE UPDATE ON kpi_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

