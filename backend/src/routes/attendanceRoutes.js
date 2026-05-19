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

router.get('/network/check', (req, res) => attendanceController.checkNetwork(req, res));
router.post('/location/validate', (req, res) => attendanceController.checkLocation(req, res));

router.get('/qr/generate', (req, res) => qrController.generateQr(req, res));
router.post('/qr/validate', (req, res) => qrController.validateQr(req, res));

// Staff check-in (multilayer: QR + Network + GPS)
router.post('/attendance/checkin', (req, res) => checkInController.checkIn(req, res));

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
            return res.status(400).json({ success: false, error: 'sessionId est requis' });
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

module.exports = router;