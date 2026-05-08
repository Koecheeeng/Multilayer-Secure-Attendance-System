/**
 * src/controllers/AttendanceController.js
 *
 * Controller for handling API requests.
 */
const IpValidationService = require('../services/IpValidationService');
const GeolocationService = require('../services/GeolocationService');

class AttendanceController {
    constructor() {
        this.ipValidationService = new IpValidationService();
        this.geolocationService = new GeolocationService();
    }

    /**
     * Handles network check request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async checkNetwork(req, res) {
        try {
            let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            if (clientIp === '::1' || clientIp === '127.0.0.1') {
                clientIp = ''; // Let ip-api use public IP
            }
            
            const result = await this.ipValidationService.fetchAndValidate(clientIp);
            res.json({
                success: true,
                data: { ...result, overallPass: result.overallPass },
                venueAsnInfo: this.ipValidationService.getVenueAsnInfo()
            });
        } catch (error) {
            console.error('Network check error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Handles location check request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    checkLocation(req, res) {
        try {
            const { lat, lon, accuracy } = req.body;
            if (lat === undefined || lon === undefined || accuracy === undefined) {
                return res.status(400).json({ success: false, error: 'Missing lat, lon, or accuracy' });
            }

            const locationData = this.geolocationService.validateLocation(lat, lon, accuracy);
            res.json({
                success: true,
                data: locationData,
                maxAccuracy: this.geolocationService.getMaxAccuracy(),
                locations: this.geolocationService.getLocations()
            });
        } catch (error) {
            console.error('Location check error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = AttendanceController;
