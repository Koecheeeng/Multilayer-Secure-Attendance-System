/**
 * frontend/controllers/QrController.js
 *
 * Controller for QR code session management on the manager page.
 * Orchestrates: calls apiService → passes QrResult to view.
 * Zero DOM access, zero business logic.
 */

/** Auto-refresh interval in milliseconds */
const QR_REFRESH_MS = 15000;

class QrController {
    /**
     * @param {AttendanceApiService} apiService - The shared API service
     * @param {QrView} view - The QR view instance
     */
    constructor(apiService, view) {
        this._apiService = apiService;
        this._view = view;
        this._refreshTimer = null;
        this._sessionId = null;
    }

    /**
     * Initializes event listeners for session control buttons
     */
    init() {
        const btnStart = document.getElementById('btnStartSession');
        const btnStop = document.getElementById('btnStopSession');
        const sessionInput = document.getElementById('sessionIdInput');

        if (btnStart) {
            btnStart.addEventListener('click', () => {
                const id = sessionInput ? sessionInput.value.trim() : '';
                if (id) {
                    this.startSession(id);
                }
            });
        }

        if (btnStop) {
            btnStop.addEventListener('click', () => {
                this.stopSession();
            });
        }

        // Allow Enter key in the input field
        if (sessionInput) {
            sessionInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const id = sessionInput.value.trim();
                    if (id) {
                        this.startSession(id);
                    }
                }
            });
        }
    }

    /**
     * Starts a QR session: fetches first token and begins auto-refresh
     * @param {string} sessionId - Lecturer session identifier
     */
    startSession(sessionId) {
        // Always clear any existing timer before starting new one
        this._clearTimer();
        this._sessionId = sessionId;

        this._fetchAndRender();
        this._refreshTimer = setInterval(() => this._fetchAndRender(), QR_REFRESH_MS);
    }

    /**
     * Stops the active QR session and clears the refresh timer
     */
    stopSession() {
        this._clearTimer();
        this._sessionId = null;
        this._view.renderIdle();
    }

    /**
     * Fetches a new QR token from the API and passes it to the view
     * @private
     */
    async _fetchAndRender() {
        if (!this._sessionId) return;

        this._view.showLoading();
        try {
            const qrResult = await this._apiService.generateQrToken(this._sessionId);
            if (!qrResult.isValid) {
                this._view.renderError('Received invalid QR data from server');
                return;
            }
            this._view.renderQr(qrResult);
        } catch (err) {
            console.error('QR fetch error:', err);
            this._view.renderError(err.message || 'Failed to generate QR code');
        }
    }

    /**
     * Clears the refresh interval timer
     * @private
     */
    _clearTimer() {
        if (this._refreshTimer) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
    }
}
