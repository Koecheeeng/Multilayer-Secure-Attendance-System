/**
 * Setup script to initialize attendance_records table in Supabase
 * 
 * IMPORTANT: This must be run ONCE in Supabase SQL Editor or via authenticated endpoint
 * 
 * To run:
 * 1. Go to https://app.supabase.com/project/exbkjyumgylzhxpomfnx/sql
 * 2. Click "New Query"
 * 3. Paste all the SQL below
 * 4. Click "Run"
 */

-- Drop existing table if it exists (be careful!)
-- DROP TABLE IF EXISTS public.attendance_records;

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Staff information
  staff_id UUID NOT NULL,
  staff_code VARCHAR(50),
  staff_name VARCHAR(255),
  
  -- Network validation layer
  network_pass BOOLEAN DEFAULT FALSE,
  network_ip INET,
  network_asn VARCHAR(50),
  network_isp VARCHAR(255),
  
  -- GPS validation layer
  gps_pass BOOLEAN DEFAULT FALSE,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  gps_accuracy DECIMAL(10, 2),
  gps_distance DECIMAL(10, 2),
  
  -- QR validation layer
  qr_pass BOOLEAN DEFAULT FALSE,
  qr_session_id VARCHAR(255),
  
  -- Overall result
  overall_pass BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_checked_at ON public.attendance_records(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_overall_pass ON public.attendance_records(overall_pass);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow insert for all" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow select for all" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.attendance_records;

-- Create policies
CREATE POLICY "Allow insert for all" ON public.attendance_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for all" ON public.attendance_records
  FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.attendance_records TO anon;
GRANT SELECT, INSERT ON public.attendance_records TO authenticated;
GRANT USAGE ON SEQUENCE auth.users_id_seq TO anon;
