/**
 * src/routes/attendanceRoutes.js
 *
 * Express routes for attendance validation and check-in.
 */
const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/AttendanceController');
const QrController = require('../controllers/QrController');
const CheckInController = require('../controllers/CheckInController');
const QrTokenService = require('../services/QrTokenService');

// Shared QR token service instance — tokens generated here are validated in check-in
const sharedQrTokenService = new QrTokenService();

const attendanceController = new AttendanceController();
const qrController = new QrController(sharedQrTokenService);
const checkInController = new CheckInController(sharedQrTokenService);

const requireAuth = require('../middleware/requireAuth');

// Staff self-lookup after login — returns their own staff profile
router.get('/staff/me', requireAuth, async (req, res) => {
    try {
        const supabase = require('../config/supabase');
        const userEmail = req.authUser.email;

        const { data, error } = await supabase
            .from('staff_profiles')
            .select('id, staff_code, full_name, department, position, email, status')
            .eq('email', userEmail)
            .eq('status', 'active')
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                error: 'No active staff profile found for this account'
            });
        }

        res.json({ success: true, data });
    } catch (err) {
        console.error('Staff /me error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Check if a staff email exists and whether password is already set
router.post('/staff/check-email', async (req, res) => {
    try {
        const supabase = require('../config/supabase');
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'email is required' });

        const trimmedEmail = String(email).trim().toLowerCase();

        const { data, error } = await supabase
            .from('staff_profiles')
            .select('id, full_name, password_set')
            .eq('email', trimmedEmail)
            .eq('status', 'active')
            .single();

        if (error || !data) {
            return res.json({ success: true, exists: false });
        }

        res.json({ success: true, exists: true, password_set: !!data.password_set, name: data.full_name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Set password for a staff account (first time only, no email sent)
router.post('/staff/set-password', async (req, res) => {
    try {
        const supabase = require('../config/supabase');
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const trimmedEmail = String(email).trim().toLowerCase();
        console.log('[SetPassword] Looking up staff:', trimmedEmail);

        // 1. Find staff by email (case-insensitive)
        const { data: staffList, error: staffErr } = await supabase
            .from('staff_profiles')
            .select('*')
            .ilike('email', trimmedEmail)
            .eq('status', 'active');

        if (staffErr) {
            console.error('[SetPassword] DB query error:', staffErr.message, staffErr.code);
            return res.status(500).json({ success: false, error: 'Database error: ' + staffErr.message });
        }

        console.log('[SetPassword] Query result count:', staffList ? staffList.length : 0);

        const staff = staffList && staffList.length > 0 ? staffList[0] : null;

        if (!staff) {
            return res.status(404).json({ success: false, error: 'No staff account found for this email. Make sure admin has registered your email.' });
        }

        console.log('[SetPassword] Found staff:', staff.id, staff.full_name, 'email in DB:', staff.email);

        // Check if password was already set
        if (staff.password_set) {
            return res.status(409).json({ success: false, error: 'Password already set. Use Sign In or contact admin to reset.' });
        }

        let authUserId = staff.auth_user_id || null;

        // 2. If no auth account exists yet, create one now with the password
        if (!authUserId) {
            console.log('[SetPassword] No auth account found, creating one...');
            const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
                email: trimmedEmail,
                password: password,
                email_confirm: true,
                user_metadata: { full_name: staff.full_name || '', role: 'staff' }
            });

            if (createErr) {
                console.error('[SetPassword] Auth create error:', createErr.message);
                throw createErr;
            }
            authUserId = newAuth.user.id;
            console.log('[SetPassword] Auth user created:', authUserId);

            // Link auth user to staff profile (ignore if column doesn't exist yet)
            try {
                await supabase
                    .from('staff_profiles')
                    .update({ auth_user_id: authUserId })
                    .eq('id', staff.id);
            } catch (e) {
                console.log('[SetPassword] Warning: could not update auth_user_id:', e.message);
            }

            // Create profiles row for auth middleware
            await supabase
                .from('profiles')
                .upsert({ id: authUserId, full_name: staff.full_name || '', role: 'staff' }, { onConflict: 'id' });
        } else {
            // Auth account exists, just set the password
            const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
                password: password
            });
            if (updateErr) throw updateErr;
        }

        // 3. Mark password as set (ignore if column doesn't exist yet)
        try {
            await supabase
                .from('staff_profiles')
                .update({ password_set: true })
                .eq('id', staff.id);
        } catch (e) {
            console.log('[SetPassword] Warning: could not update password_set:', e.message);
        }

        console.log('[SetPassword] Success for', trimmedEmail);
        res.json({ success: true, message: 'Password set successfully. You can now sign in.' });
    } catch (err) {
        console.error('[SetPassword] Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Staff shift lookup — returns today's shift for the authenticated staff member
router.get('/staff/my-shift', requireAuth, async (req, res) => {
    try {
        const supabase = require('../config/supabase');
        const AdminController = require('../controllers/AdminController');
        const userEmail = req.authUser.email;

        // Find staff by email
        const { data: staff } = await supabase
            .from('staff_profiles')
            .select('id')
            .eq('email', userEmail)
            .eq('status', 'active')
            .single();

        if (!staff) {
            return res.json({ success: true, data: null, message: 'No staff profile found' });
        }

        const now = new Date();
        const shift = await AdminController.getStaffShiftForDate(staff.id, now);

        if (!shift) {
            return res.json({ success: true, data: null, message: 'No shift assigned for today' });
        }

        // Calculate if currently late (5 min grace) — compare in UTC+7
        const [h, m] = shift.start_time.split(':').map(Number);
        const nowUtc7Hours = (now.getUTCHours() + 7) % 24;
        const nowUtc7Minutes = now.getUTCMinutes();
        const nowTotalMin = nowUtc7Hours * 60 + nowUtc7Minutes;
        const shiftTotalMin = h * 60 + m;
        const diffMin = nowTotalMin - shiftTotalMin;
        const isLate = diffMin > 5;
        const lateMinutes = isLate ? diffMin : 0;

        res.json({
            success: true,
            data: {
                ...shift,
                is_late: isLate,
                late_minutes: lateMinutes,
                current_time: now.toISOString()
            }
        });
    } catch (err) {
        console.error('Staff shift lookup error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/network/check', (req, res) => attendanceController.checkNetwork(req, res));
router.post('/location/validate', (req, res) => attendanceController.checkLocation(req, res));

router.get('/qr/generate', (req, res) => qrController.generateQr(req, res));
router.post('/qr/validate', (req, res) => qrController.validateQr(req, res));

// Staff check-in (multilayer: QR + Network + GPS)
router.post('/attendance/checkin', (req, res) => checkInController.checkIn(req, res));

// Setup endpoint - creates attendance_records table
function isMissingAttendanceTableError(error) {
    if (!error) {
        return false;
    }

    return ['PGRST205', 'PGRST116', '42P01'].includes(error.code);
}

router.get('/setup', async (req, res) => {
    try {
        console.log('[Setup] GET /api/setup - Checking status...');
        const supabase = require('../config/supabase');
        
        // Test if table exists
        const { error } = await supabase
            .from('attendance_records')
            .select('id')
            .limit(1);

        if (!isMissingAttendanceTableError(error)) {
            return res.json({ success: true, message: 'Table already exists' });
        }

        // Table doesn't exist - provide SQL to run
        const setupSQL = `CREATE TABLE IF NOT EXISTS public.attendance_records (
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

CREATE INDEX IF NOT EXISTS idx_attendance_checked_at ON public.attendance_records(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance_records(staff_id);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow select" ON public.attendance_records;
CREATE POLICY "Allow insert" ON public.attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select" ON public.attendance_records FOR SELECT USING (true);`;

        res.json({ 
            success: false, 
            message: 'Table not found. Please run the SQL in Supabase SQL Editor',
            sql: setupSQL,
            instructions: [
                '1. Go to https://app.supabase.com/project/exbkjyumgylzhxpomfnx/sql',
                '2. Click "New Query"',
                '3. Paste the SQL provided in the "sql" field',
                '4. Click Run',
                '5. Refresh this page'
            ]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/setup', async (req, res) => {
    try {
        console.log('[Setup] POST /api/setup - Checking status...');
        const supabase = require('../config/supabase');
        
        // Test if table exists
        const { error } = await supabase
            .from('attendance_records')
            .select('id')
            .limit(1);

        if (!isMissingAttendanceTableError(error)) {
            return res.json({ success: true, message: 'Table already exists' });
        }

        // Table doesn't exist - provide SQL to run
        const setupSQL = `CREATE TABLE IF NOT EXISTS public.attendance_records (
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

CREATE INDEX IF NOT EXISTS idx_attendance_checked_at ON public.attendance_records(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance_records(staff_id);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow select" ON public.attendance_records;
CREATE POLICY "Allow insert" ON public.attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select" ON public.attendance_records FOR SELECT USING (true);`;

        res.json({ 
            success: false, 
            message: 'Table not found. Please run the SQL in Supabase SQL Editor',
            sql: setupSQL,
            instructions: [
                '1. Go to https://app.supabase.com/project/exbkjyumgylzhxpomfnx/sql',
                '2. Click "New Query"',
                '3. Paste the SQL provided in the "sql" field',
                '4. Click Run',
                '5. Refresh this page'
            ]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Staff list for check-in dropdown (public, no auth needed)
router.get('/staff/active', async (req, res) => {
    try {
        const supabase = require('../config/supabase');
        const { data, error } = await supabase
            .from('staff_profiles')
            .select('id, staff_code, full_name, department, position')
            .eq('status', 'active')
            .order('full_name', { ascending: true });
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/attendance/live', async (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'sessionId is required' });
        }

        const supabase = require('../config/supabase');

        const { data, error } = await supabase
            .from('attendance_records')
            .select('id, staff_name, checked_at, overall_pass')
            .eq('qr_session_id', sessionId)
            .order('checked_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data: data || [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Public endpoint for viewing today's attendance (for testing/display purposes)
router.get('/attendance/today-public', async (req, res) => {
    try {
        const supabase = require('../config/supabase');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('attendance_records')
            .select('*')
            .gte('checked_at', todayStart.toISOString())
            .order('checked_at', { ascending: false });

        if (error) throw error;

        const records = data || [];
        const uniqueStaff = new Set(records.map(r => r.staff_id)).size;
        const passCount = records.filter(r => r.overall_pass).length;

        res.json({
            success: true,
            data: {
                total: records.length,
                unique_staff: uniqueStaff,
                pass_count: passCount,
                fail_count: records.length - passCount,
                pass_rate: records.length > 0 ? Math.round((passCount / records.length) * 100) : 0,
                latest: records[0] || null,
                records
            }
        });
    } catch (err) {
        console.error('Public attendance error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;