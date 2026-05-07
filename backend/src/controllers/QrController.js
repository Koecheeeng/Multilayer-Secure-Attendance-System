/**
 * backend/src/controllers/QrController.js
 *
 * Controller for QR token generation and validation endpoints.
 * Orchestrates QrTokenService and returns HTTP responses.
 */
const QrTokenService = require('../services/QrTokenService');
const QRCode = require('qrcode');

class QrController {
    constructor(qrTokenService) {
        this.qrTokenService = qrTokenService || new QrTokenService();
    }

    /**
     * Generates a new QR token and returns it as a base64 PNG data URL
     * GET /api/qr/generate?sessionId=X
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    async generateQr(req, res) {
        try {
            const sessionId = req.query.sessionId;
            if (!sessionId) {
                return res.status(400).json({ success: false, error: 'Missing sessionId query parameter' });
            }

            const tokenModel = this.qrTokenService.generateToken(sessionId);
            const qrDataUrl = await QRCode.toDataURL(tokenModel.token, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });

            res.json({
                success: true,
                token: tokenModel.token,
                qrDataUrl: qrDataUrl,
                expiresAt: tokenModel.expiresAt,
                sessionId: tokenModel.sessionId,
                lifetimeMs: this.qrTokenService.getTokenLifetimeMs()
            });
        } catch (error) {
            console.error('QR generation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Validates a submitted QR token
     * POST /api/qr/validate  { token }
     * @param {Object} req - Express request
     * @param {Object} res - Express response
     */
    validateQr(req, res) {
        try {
            const { token } = req.body;
            if (!token) {
                return res.status(400).json({ success: false, error: 'Missing token in request body' });
            }

            const result = this.qrTokenService.validateToken(token);
            res.json({
                success: true,
                valid: result.valid,
                sessionId: result.sessionId,
                reason: result.reason
            });
        } catch (error) {
            console.error('QR validation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = QrController;
