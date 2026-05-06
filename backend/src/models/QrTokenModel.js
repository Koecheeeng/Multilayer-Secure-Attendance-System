/**
 * backend/src/models/QrTokenModel.js
 *
 * Pure data model for a QR attendance token.
 * Zero fetch(), zero DOM access.
 */

/** Token lifetime in milliseconds */
const TOKEN_LIFETIME_MS = 15000;

class QrTokenModel {
    /**
     * @param {Object} data
     * @param {string} data.token - Hex token string
     * @param {string} data.sessionId - Lecturer session identifier
     * @param {number} [data.createdAt] - Unix timestamp ms (defaults to now)
     * @param {number} [data.expiresAt] - Unix timestamp ms (defaults to createdAt + TOKEN_LIFETIME_MS)
     */
    constructor(data) {
        this._token = data.token;
        this._sessionId = data.sessionId;
        this._createdAt = data.createdAt || Date.now();
        this._expiresAt = data.expiresAt || (this._createdAt + TOKEN_LIFETIME_MS);
    }

    /** @returns {string} The hex token string */
    get token() {
        return this._token;
    }

    /** @returns {string} The session identifier */
    get sessionId() {
        return this._sessionId;
    }

    /** @returns {number} Creation timestamp in ms */
    get createdAt() {
        return this._createdAt;
    }

    /** @returns {number} Expiry timestamp in ms */
    get expiresAt() {
        return this._expiresAt;
    }

    /** @returns {boolean} True if the token has expired */
    get isExpired() {
        return Date.now() >= this._expiresAt;
    }

    /** @returns {number} Milliseconds remaining before expiry (0 if expired) */
    get remainingMs() {
        return Math.max(0, this._expiresAt - Date.now());
    }

    /**
     * Serializes the token to a plain object
     * @returns {Object}
     */
    toJSON() {
        return {
            token: this._token,
            sessionId: this._sessionId,
            createdAt: this._createdAt,
            expiresAt: this._expiresAt,
            isExpired: this.isExpired,
            remainingMs: this.remainingMs
        };
    }
}

module.exports = { QrTokenModel, TOKEN_LIFETIME_MS };
