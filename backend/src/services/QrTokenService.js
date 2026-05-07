/**
 * backend/src/services/QrTokenService.js
 *
 * Business logic for QR token generation and validation.
 * Uses Node crypto for secure random token generation.
 */
const crypto = require('crypto');
const { QrTokenModel, TOKEN_LIFETIME_MS } = require('../models/QrTokenModel');

class QrTokenService {
    constructor() {
        /** @type {Map<string, QrTokenModel>} Active tokens keyed by token string */
        this._activeTokens = new Map();
    }

    /**
     * Generates a new QR token for the given session
     * @param {string} sessionId - Lecturer session identifier
     * @returns {QrTokenModel} The newly created token
     */
    generateToken(sessionId) {
        this._purgeExpired();

        const tokenString = this._randomHex();
        const tokenModel = new QrTokenModel({
            token: tokenString,
            sessionId: sessionId
        });

        this._activeTokens.set(tokenString, tokenModel);
        return tokenModel;
    }

    /**
     * Validates a token string against the active token store
     * @param {string} tokenString - The token to validate
     * @returns {{ valid: boolean, sessionId: string|null, reason: string }}
     */
    validateToken(tokenString) {
        this._purgeExpired();

        if (!tokenString || typeof tokenString !== 'string') {
            return { valid: false, sessionId: null, reason: 'Token is missing or invalid' };
        }

        const tokenModel = this._activeTokens.get(tokenString);

        if (!tokenModel) {
            return { valid: false, sessionId: null, reason: 'Token not found or already expired' };
        }

        if (tokenModel.isExpired) {
            this._activeTokens.delete(tokenString);
            return { valid: false, sessionId: tokenModel.sessionId, reason: 'Token has expired' };
        }

        // Token is valid — consume it (one-time use)
        this._activeTokens.delete(tokenString);
        return { valid: true, sessionId: tokenModel.sessionId, reason: 'Token accepted' };
    }

    /**
     * Returns the configured token lifetime
     * @returns {number}
     */
    getTokenLifetimeMs() {
        return TOKEN_LIFETIME_MS;
    }

    /**
     * Generates a short 6-character alphanumeric code (uppercase + digits)
     * @returns {string}
     * @private
     */
    _randomHex() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
        const bytes = crypto.randomBytes(6);
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[bytes[i] % chars.length];
        }
        return code;
    }

    /**
     * Removes all expired tokens from the active store
     * @private
     */
    _purgeExpired() {
        for (const [key, model] of this._activeTokens) {
            if (model.isExpired) {
                this._activeTokens.delete(key);
            }
        }
    }
}

module.exports = QrTokenService;
