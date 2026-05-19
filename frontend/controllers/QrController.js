/**
 * frontend/controllers/QrController.js
 *
 * Controller for QR code session management on the manager page.
 * Orchestrates: calls apiService → passes QrResult to view.
 * Zero DOM access, zero business logic.
 * * ROLE: The "Brain" that coordinates the 15-second security rotation.
 */

/** * Strict security requirement: Tokens must rotate every 15 seconds 
 * to prevent students from sharing screenshots.
/** Auto-refresh interval in milliseconds */

const QR_LIFETIME_MS = 15000; 
const POLL_INTERVAL_MS = 2000; 

class QrController {
    constructor(apiService, view) {
        this._apiService = apiService;
        this._view = view;
        this._qrTimer = null;
        this._pollTimer = null;
        this._sessionId = null;
        this._attendanceCount = 0; 
    }

    init() {
        const btnStart = document.getElementById('btnStartSession');
        const btnStop = document.getElementById('btnStopSession');
        const sessionInput = document.getElementById('sessionIdInput');

        if (btnStart) {
            btnStart.addEventListener('click', () => {
                const id = sessionInput ? sessionInput.value.trim() : '';
                if (id) this.startSession(id);
            });
        }

        if (btnStop) {
            btnStop.addEventListener('click', () => {
                this.stopSession();
            });
        }

        if (sessionInput) {
            sessionInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const id = sessionInput.value.trim();
                    if (id) this.startSession(id);
                }
            });
        }
    }

    startSession(sessionId) {
        this.stopSession(); 
        this._sessionId = sessionId;
        this._attendanceCount = 0; 

        this._generateNewQr();
        this._fetchLiveAttendance();

        this._pollTimer = setInterval(() => this._fetchLiveAttendance(), POLL_INTERVAL_MS);
        
        this._startQrTimer();
    }

    stopSession() {
        if (this._qrTimer) clearInterval(this._qrTimer);
        if (this._pollTimer) clearInterval(this._pollTimer);
        this._qrTimer = null;
        this._pollTimer = null;
        this._sessionId = null;
        this._view.renderIdle();
    }

    _startQrTimer() {
        if (this._qrTimer) clearInterval(this._qrTimer);
        this._qrTimer = setInterval(() => this._generateNewQr(), QR_LIFETIME_MS);
    }

    async _generateNewQr() {
        if (!this._sessionId) return;
        this._view.showLoading();
        try {
            const qrResult = await this._apiService.generateQrToken(this._sessionId);
            if (!qrResult.isValid) {
                this._view.renderError('Token QR invalide reçu du serveur');
                return;
            }
            this._view.renderQr(qrResult);
        } catch (err) {
            console.error('Erreur génération QR:', err);
            this._view.renderError(err.message || 'Impossible de générer le QR code');
        }
    }

    async _fetchLiveAttendance() {
        if (!this._sessionId) return;
        try {
            const liveAttendance = await this._apiService.getLiveAttendance(this._sessionId);
            
            
            if (this._view.renderLiveAttendance) {
                this._view.renderLiveAttendance(liveAttendance);
            }

            
            if (liveAttendance.length > this._attendanceCount) {
                this._attendanceCount = liveAttendance.length; 
                
                this._generateNewQr(); 
                this._startQrTimer();  
            }

        } catch (err) {
            console.error('Erreur de monitoring DB:', err);
        }
    }
}