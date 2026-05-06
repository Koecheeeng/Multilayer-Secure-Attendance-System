/**
 * frontend/views/QrView.js
 *
 * View layer for QR code display on the manager page.
 * DOM-only: receives data objects and renders. Never calls services.
 */
class QrView {
    constructor() {
        this._countdownTimer = null;
    }

    /**
     * Shows a loading state in the QR display area
     */
    showLoading() {
        this.stopCountdown();
        const banner = document.getElementById('qrBanner');
        const image = document.getElementById('qrImage');
        const tokenDisplay = document.getElementById('qrTokenDisplay');
        const countdown = document.getElementById('qrCountdown');

        if (banner) {
            banner.className = 'result-banner';
            const title = banner.querySelector('.result-text h2');
            const subtitle = banner.querySelector('.result-text p');
            if (title) title.textContent = 'Generating QR Code...';
            if (subtitle) subtitle.textContent = 'Please wait';
        }

        if (image) image.src = '';
        if (tokenDisplay) tokenDisplay.textContent = '—';
        if (countdown) countdown.textContent = '—';
    }

    /**
     * Renders a QR result to the manager UI
     * @param {QrResult} qrResult - The QR result model
     */
    renderQr(qrResult) {
        const banner = document.getElementById('qrBanner');
        const image = document.getElementById('qrImage');
        const tokenDisplay = document.getElementById('qrTokenDisplay');

        if (banner) {
            banner.className = 'result-banner pass';
            const title = banner.querySelector('.result-text h2');
            const subtitle = banner.querySelector('.result-text p');
            if (title) title.textContent = 'QR Code Active';
            if (subtitle) subtitle.textContent = `Session: ${qrResult.sessionId}`;
        }

        if (image) {
            image.src = qrResult.qrImageUrl;
            image.alt = 'Attendance QR Code';
        }

        if (tokenDisplay) {
            tokenDisplay.textContent = qrResult.tokenString.substring(0, 16) + '…';
            tokenDisplay.title = qrResult.tokenString;
        }

        this.startCountdown(qrResult.expiresAt);
    }

    /**
     * Starts a visual countdown timer toward the expiry time
     * @param {number} expiresAt - Expiry timestamp in ms
     */
    startCountdown(expiresAt) {
        this.stopCountdown();

        const countdown = document.getElementById('qrCountdown');
        if (!countdown) return;

        const tick = () => {
            const remaining = Math.max(0, expiresAt - Date.now());
            const seconds = Math.ceil(remaining / 1000);
            countdown.textContent = `${seconds}s`;

            if (remaining <= 0) {
                countdown.textContent = 'Refreshing…';
                this.stopCountdown();
            }
        };

        tick();
        this._countdownTimer = setInterval(tick, 250);
    }

    /**
     * Stops the active countdown timer
     */
    stopCountdown() {
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer);
            this._countdownTimer = null;
        }
    }

    /**
     * Renders an error message in the QR display area
     * @param {string} msg - Error message to display
     */
    renderError(msg) {
        this.stopCountdown();
        const banner = document.getElementById('qrBanner');
        const image = document.getElementById('qrImage');
        const tokenDisplay = document.getElementById('qrTokenDisplay');
        const countdown = document.getElementById('qrCountdown');

        if (banner) {
            banner.className = 'result-banner fail';
            const title = banner.querySelector('.result-text h2');
            const subtitle = banner.querySelector('.result-text p');
            if (title) title.textContent = 'Error';
            if (subtitle) subtitle.textContent = msg;
        }

        if (image) image.src = '';
        if (tokenDisplay) tokenDisplay.textContent = '—';
        if (countdown) countdown.textContent = '—';
    }

    /**
     * Renders the idle/stopped state
     */
    renderIdle() {
        this.stopCountdown();
        const banner = document.getElementById('qrBanner');
        const image = document.getElementById('qrImage');
        const tokenDisplay = document.getElementById('qrTokenDisplay');
        const countdown = document.getElementById('qrCountdown');

        if (banner) {
            banner.className = 'result-banner';
            const title = banner.querySelector('.result-text h2');
            const subtitle = banner.querySelector('.result-text p');
            if (title) title.textContent = 'Session Stopped';
            if (subtitle) subtitle.textContent = 'Start a session to generate QR codes';
        }

        if (image) image.src = '';
        if (tokenDisplay) tokenDisplay.textContent = '—';
        if (countdown) countdown.textContent = '—';
    }
}
