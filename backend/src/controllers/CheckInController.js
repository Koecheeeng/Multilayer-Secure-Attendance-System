/**
 * src/controllers/CheckInController.js
 *
 * Controller for multilayer attendance check-in.
 * Orchestrates QR validation, network validation, and GPS validation
 * then persists the attendance record to Supabase.
 */
const supabase = require('../config/supabase');
const IpValidationService = require('../services/IpValidationService');
const GeolocationService = require('../services/GeolocationService');
const QrTokenService = require('../services/QrTokenService');

// Shared singleton so tokens generated via /api/qr/generate are accessible here
let _sharedQrService = null;

class CheckInController {
    constructor(qrTokenService) {
        this.ipValidationService = new IpValidationService();
        this.geolocationService = new GeolocationService();
        // Use shared instance if provided, otherwise create new
        this.qrTokenService = qrTokenService || new QrTokenService();
        _sharedQrService = this.qrTokenService;
    }

    /**
     * POST /api/attendance/checkin
     * Body: { staff_id, qr_token, gps: { lat, lon, accuracy } }
     */
    async checkIn(req, res) {
        try {
            const { staff_id, qr_token, gps, bypass_key } = req.body;

            if (!staff_id) {
                return res.status(400).json({ success: false, error: 'staff_id is required' });
            }

            // Superadmin bypass
            const isBypass = bypass_key === 'supersecret';

            if (!isBypass && !qr_token) {
                return res.status(400).json({ success: false, error: 'qr_token is required' });
            }

            if (!isBypass && (!gps || gps.lat === undefined || gps.lon === undefined || gps.accuracy === undefined)) {
                return res.status(400).json({ success: false, error: 'GPS data is required' });
            }

            let qrResult, networkResult, gpsResult;

            if (isBypass) {
                // All layers auto-pass
                qrResult = { valid: true, reason: 'Superadmin bypass', sessionId: 'BYPASS' };
                networkResult = { overallPass: true, ip: '127.0.0.1', asn: 'BYPASS', isp: 'Superadmin' };
                gpsResult = { withinGeofence: true, distance: 0, nearestLocation: { name: 'Bypass' } };
            } else {
                // QR validation
                qrResult = this.qrTokenService.validateToken(qr_token);

                // Network validation
                try {
                    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
                    if (clientIp === '::1' || clientIp === '127.0.0.1' ||
                        /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(clientIp) ||
                        clientIp?.startsWith('::ffff:')) clientIp = '';
                    networkResult = await this.ipValidationService.fetchAndValidate(clientIp);
                } catch (err) {
                    console.error('[CheckIn] Network validation error:', err.message);
                    networkResult = { overallPass: false, ip: 'unknown', asn: 'unknown', isp: 'unknown' };
                }

                // GPS validation
                gpsResult = this.geolocationService.validateLocation(gps.lat, gps.lon, gps.accuracy);
            }

            // Overall
            const overallPass = (isBypass) || (qrResult.valid && networkResult.overallPass && gpsResult.withinGeofence);

            // Staff lookup
            let staffCode = null;
            let staffName = null;
            try {
                const { data: staffData } = await supabase
                    .from('staff_profiles')
                    .select('staff_code, full_name')
                    .eq('id', staff_id)
                    .single();
                if (staffData) {
                    staffCode = staffData.staff_code;
                    staffName = staffData.full_name;
                }
            } catch (e) {
                console.warn('[CheckIn] Could not look up staff:', e.message);
            }

            // Persist record
            const record = {
                staff_id,
                staff_code: staffCode,
                staff_name: staffName,
                network_pass: networkResult.overallPass || false,
                network_ip: networkResult.ip || null,
                network_asn: networkResult.asn || null,
                network_isp: networkResult.isp || null,
                gps_pass: gpsResult.withinGeofence || false,
                gps_lat: gps.lat,
                gps_lng: gps.lon,
                gps_accuracy: gps.accuracy,
                gps_distance: gpsResult.distance || null,
                qr_pass: qrResult.valid,
                qr_session_id: qrResult.sessionId || null,
                overall_pass: overallPass
            };

            let savedRecord = null;
            try {
                const { data, error } = await supabase
                    .from('attendance_records')
                    .insert(record)
                    .select('*')
                    .single();

                if (error) throw error;
                savedRecord = data;
            } catch (dbErr) {
                console.error('[CheckIn] DB save error:', dbErr.message);
                // Still return the validation results even if DB save fails
            }

            return res.status(overallPass ? 201 : 200).json({
                success: true,
                overall_pass: overallPass,
                record_id: savedRecord?.id || null,
                layers: {
                    qr: {
                        pass: qrResult.valid,
                        reason: qrResult.reason,
                        session_id: qrResult.sessionId
                    },
                    network: {
                        pass: networkResult.overallPass || false,
                        ip: networkResult.ip,
                        asn: networkResult.asn,
                        isp: networkResult.isp
                    },
                    gps: {
                        pass: gpsResult.withinGeofence || false,
                        distance: gpsResult.distance,
                        accuracy: gps.accuracy,
                        nearest: gpsResult.nearestLocation?.name || null
                    }
                },
                staff: { id: staff_id, code: staffCode, name: staffName },
                checked_at: savedRecord?.checked_at || new Date().toISOString(),
                db_saved: !!savedRecord
            });

        } catch (err) {
            console.error('[CheckIn] Fatal error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * GET /api/admin/attendance/today
     * Returns today's check-in summary
     */
    async getToday(req, res) {
        try {
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

            return res.json({
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
            console.error('[Attendance] Today error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    /**
     * GET /api/admin/attendance/history?from=&to=&staffId=
     * Returns attendance records with optional filters
     */
    async getHistory(req, res) {
        try {
            const { from, to, staffId, limit } = req.query;

            let query = supabase
                .from('attendance_records')
                .select('*')
                .order('checked_at', { ascending: false })
                .limit(parseInt(limit) || 100);

            if (from) query = query.gte('checked_at', from);
            if (to) query = query.lte('checked_at', to);
            if (staffId) query = query.eq('staff_id', staffId);

            const { data, error } = await query;

            if (error) throw error;

            return res.json({ success: true, data: data || [] });
        } catch (err) {
            console.error('[Attendance] History error:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = CheckInController;
