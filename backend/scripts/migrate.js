/**
 * Migration script to create attendance_records table
 * Run with: npm run migrate
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('🔄 Creating attendance_records table...');
  
  const sql = `
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

    CREATE INDEX IF NOT EXISTS idx_attendance_records_checked_at ON public.attendance_records(checked_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_id ON public.attendance_records(staff_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_overall_pass ON public.attendance_records(overall_pass);

    ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Enable insert for all" ON public.attendance_records;
    DROP POLICY IF EXISTS "Enable read for all" ON public.attendance_records;

    CREATE POLICY "Enable insert for all" ON public.attendance_records
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Enable read for all" ON public.attendance_records
        FOR SELECT USING (true);
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // Fallback: try using raw SQL via different approach
      console.warn('ℹ️  RPC method not available, attempting direct query...');
      
      // Try creating table with individual queries
      const queries = [
        `CREATE TABLE IF NOT EXISTS public.attendance_records (
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
        );`,
        `CREATE INDEX IF NOT EXISTS idx_attendance_records_checked_at ON public.attendance_records(checked_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_id ON public.attendance_records(staff_id);`,
        `ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;`,
      ];

      for (const query of queries) {
        const { error: queryError } = await supabase.rpc('exec_sql', { sql: query }).catch(() => ({error: null}));
        if (queryError) console.error('Query error:', queryError);
      }

      console.log('⚠️  Manual SQL execution via RPC not available.');
      console.log('📋 Please execute the SQL manually in Supabase dashboard:');
      console.log('   1. Go to SQL Editor');
      console.log('   2. Run the SQL from backend/migrations/001_create_attendance_records.sql');
    } else {
      console.log('✅ Table created successfully!');
    }
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    console.log('\n📋 Please execute the SQL manually:');
    console.log('   1. Go to https://app.supabase.com → your project');
    console.log('   2. SQL Editor → paste backend/migrations/001_create_attendance_records.sql');
    console.log('   3. Click Run');
    process.exit(1);
  }
}

migrate();
