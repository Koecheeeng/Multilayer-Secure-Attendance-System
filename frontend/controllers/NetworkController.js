/**
 * frontend/controllers/NetworkController.js
 *
 * Controller layer for network validation.
 * Calls AttendanceApiService and updates NetworkView.
 */
class NetworkController {
    constructor(apiService, view) {
        this.apiService = apiService;
        this.view = view;
    }

    init() {
        const btnCheck = document.getElementById('btnCheck');
        if (btnCheck) {
            btnCheck.addEventListener('click', () => this.run());
        }
    }

    async run() {
        this.view.showLoading();
        try {
            const data = await this.apiService.fetchNetworkResult();
            this.view.render(data.result, data.venueAsnInfo);
        } catch (error) {
            console.error('Network check failed:', error);
            this.view.renderError(error);
        }
    }
}
