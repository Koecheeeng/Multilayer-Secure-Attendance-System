/**
 * src/db/init.js
 * 
 * Auto-initialize database tables on backend startup.
 * Checks if required tables exist.
 */

const supabase = require('../config/supabase');

async function initDatabase() {
  console.log('[DB] Checking database tables...');
  
  try {
    // Check if attendance_records table exists by trying a simple query
    const { error: checkError } = await supabase
      .from('attendance_records')
      .select('id')
      .limit(1);

    if (checkError && checkError.message.includes('not found')) {
      console.log('[DB] ⚠️  attendance_records table not found!');
      return false;
    } else if (!checkError) {
      console.log('[DB] ✅ attendance_records table ready');
      return true;
    } else {
      console.error('[DB] Error checking table:', checkError.message);
      return false;
    }
  } catch (err) {
    console.error('[DB] Init error:', err.message);
    return false;
  }
}

module.exports = { initDatabase };
