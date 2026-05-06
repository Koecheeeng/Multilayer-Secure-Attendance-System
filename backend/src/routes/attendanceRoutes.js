/**
 * src/routes/attendanceRoutes.js
 *
 * Express routes for attendance validation.
 */
const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/AttendanceController');
const QrController = require('../controllers/QrController');

const attendanceController = new AttendanceController();
const qrController = new QrController();

router.get('/network/check', (req, res) => attendanceController.checkNetwork(req, res));
router.post('/location/validate', (req, res) => attendanceController.checkLocation(req, res));

router.get('/qr/generate', (req, res) => qrController.generateQr(req, res));
router.post('/qr/validate', (req, res) => qrController.validateQr(req, res));

module.exports = router;