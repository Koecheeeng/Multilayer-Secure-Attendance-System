/**
 * src/db/setup.js
 * 
 * Database setup utilities - creates tables and RLS policies
 */

const supabase = require('../config/supabase');

async function setupAttendanceTable() {
  console.log('[Setup] Attempting to create attendance_records table...');
  
  try {
    // Use the service role key to execute raw SQL
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.attendance_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID NOT NULL,
          staff_code VARCHAR(50),
          staff_name VARCHAR(255),
          network_pass BOOLEAN DEFAULT FALSE,
          network_ip INET,
          network_asn VARCHAR(50),
          network_isp VARCHAR(255),
          gps_pass BOOLEAN DEFAULT FALSE,
          gps_lat DECIMAL(10, 8),
          gps_lng DECIMAL(11, 8),
          gps_accuracy DECIMAL(10, 2),
          gps_distance DECIMAL(10, 2),
          qr_pass BOOLEAN DEFAULT FALSE,
          qr_session_id VARCHAR(255),
          overall_pass BOOLEAN DEFAULT FALSE,
          checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (error && !error.message.includes('already exists')) {
      throw error;
    }

    console.log('[Setup] ✅ attendance_records table ready');
    return true;
  } catch (err) {
    console.log('[Setup] Could not auto-create table via RPC:', err.message);
    console.log('[Setup] ℹ️  Run POST /api/setup to initialize via authenticated request');
    return false;
  }
}

module.exports = { setupAttendanceTable };
