-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    
    -- Timestamp
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key (optional, if staff_profiles exists)
    CONSTRAINT fk_staff FOREIGN KEY (staff_id) REFERENCES public.staff_profiles(id) ON DELETE SET NULL
);

-- Create index for date-based queries
CREATE INDEX idx_attendance_records_checked_at ON public.attendance_records(checked_at DESC);
CREATE INDEX idx_attendance_records_staff_id ON public.attendance_records(staff_id);
CREATE INDEX idx_attendance_records_overall_pass ON public.attendance_records(overall_pass);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to insert (for check-in)
CREATE POLICY "Enable insert for all" ON public.attendance_records
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users with admin/manager role to read
CREATE POLICY "Enable read for managers" ON public.attendance_records
    FOR SELECT USING (
        -- This is a simplified version; adjust based on your auth_users table
        true
    );
