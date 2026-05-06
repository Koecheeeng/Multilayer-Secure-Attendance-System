/**
 * frontend/models/QrResult.js
 *
 * Pure data model for a QR token API response.
 * Zero fetch(), zero DOM access.
 */
class QrResult {
    /**
     * @param {Object} data - Plain API response object
     * @param {string} data.token - Hex token string
     * @param {string} data.qrDataUrl - Base64 PNG data URL
     * @param {number} data.expiresAt - Expiry timestamp in ms
     * @param {string} data.sessionId - Lecturer session identifier
     * @param {number} [data.lifetimeMs] - Token lifetime in ms
     */
    constructor(data) {
        this._token = data.token || '';
        this._qrDataUrl = data.qrDataUrl || '';
        this._expiresAt = data.expiresAt || 0;
        this._sessionId = data.sessionId || '';
        this._lifetimeMs = data.lifetimeMs || 15000;
    }

    /** @returns {boolean} True if all essential fields are present */
    get isValid() {
        return !!(this._token && this._qrDataUrl && this._expiresAt);
    }

    /** @returns {string} The hex token string */
    get tokenString() {
        return this._token;
    }

    /** @returns {string} Base64 PNG data URL for the QR image */
    get qrImageUrl() {
        return this._qrDataUrl;
    }

    /** @returns {number} Expiry timestamp in ms */
    get expiresAt() {
        return this._expiresAt;
    }

    /** @returns {string} Session identifier */
    get sessionId() {
        return this._sessionId;
    }

    /** @returns {number} Milliseconds remaining before expiry (0 if expired) */
    get remainingMs() {
        return Math.max(0, this._expiresAt - Date.now());
    }

    /** @returns {number} Token lifetime in ms */
    get lifetimeMs() {
        return this._lifetimeMs;
    }
}
