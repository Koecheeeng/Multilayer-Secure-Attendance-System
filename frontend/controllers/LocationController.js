/**
 * frontend/controllers/LocationController.js
 *
 * Controller layer for location validation.
 * Requests geolocation, calls AttendanceApiService, and updates LocationView.
 */
class LocationController {
    constructor(apiService, view) {
        this.apiService = apiService;
        this.view = view;
    }

    init() {
        const btnGeo = document.getElementById('btnGeo');
        if (btnGeo) {
            btnGeo.addEventListener('click', () => this.requestGeolocation());
        }
        
        const refreshBtn = document.getElementById('btnRefreshLoc');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.requestGeolocation());
        }
    }

    requestGeolocation() {
        this.view.showLoading();

        if (!navigator.geolocation) {
            this.view.renderError({ message: 'Geolocation is not supported by this browser' });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude, accuracy } = position.coords;
                    const data = await this.apiService.validateLocation(latitude, longitude, accuracy);
                    this.view.render(data.result, data.maxAccuracy);
                    this.view.initMap(data.result, data.locations);
                } catch (err) {
                    console.error('Backend validation failed:', err);
                    this.view.renderError(err);
                }
            },
            (error) => {
                let reason = '';
                switch (error.code) {
                    case 1: reason = 'You denied the location permission request'; break;
                    case 2: reason = 'Location information is unavailable on this device'; break;
                    case 3: reason = 'Location request timed out'; break;
                    default: reason = error.message || 'An unknown error occurred';
                }
                this.view.renderError({ message: reason });
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    }

    invalidateMap() {
        this.view.invalidateMap();
    }
}
