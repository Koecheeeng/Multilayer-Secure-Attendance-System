/**
 * frontend/services/AttendanceApiService.js
 *
 * API Service for communicating with the backend.
 * This is the ONLY file that makes HTTP calls.
 * * * DESIGN PATTERN: This acts as the "Service Layer" in your MVC architecture, 
 * abstracting fetch logic away from the Controllers.
 */
class AttendanceApiService {
    constructor() {
        this.baseUrl = '/api';
    }

    /**
     * Fetches network result from the backend
     * @returns {Promise<Object>} The API response
     */
    async fetchNetworkResult() {
        const response = await fetch(`${this.baseUrl}/network/check`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Backend returned an error');
        }
        return {
            result: new NetworkResult(json.data),
            venueAsnInfo: json.venueAsnInfo
        };
    }

    /**
     * Validates location coordinates with the backend
     * @param {number} lat 
     * @param {number} lon 
     * @param {number} accuracy 
     * @returns {Promise<Object>} The API response
     */
    async validateLocation(lat, lon, accuracy) {
        const response = await fetch(`${this.baseUrl}/location/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lon, accuracy })
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Backend returned an error');
        }
        return {
            result: new LocationResult(json.data),
            maxAccuracy: json.maxAccuracy,
            locations: json.locations
        };
    }

    /**
     * Generates a new QR token for the given session
     * @param {string} sessionId - Lecturer session identifier
     * @returns {Promise<QrResult>} The QR result model
     */
    async generateQrToken(sessionId) {
        const response = await fetch(`${this.baseUrl}/qr/generate?sessionId=${encodeURIComponent(sessionId)}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Backend returned an error');
        }
        return new QrResult(json);
    }

    /**
     * Validates a QR token with the backend
     * @param {string} token - The token string to validate
     * @returns {Promise<Object>} Plain validation result { valid, sessionId, reason }
     */
    async validateQrToken(token) {
        const response = await fetch(`${this.baseUrl}/qr/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Backend returned an error');
        }
        return {
            valid: json.valid,
            sessionId: json.sessionId,
            reason: json.reason
        };
    }
}
