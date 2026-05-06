/**
 * frontend/app.js
 *
 * Thin orchestrator: tab switching + instantiation of
 * controllers, services, and views.
 */

const apiService = new AttendanceApiService();

const networkView = new NetworkView();
const networkController = new NetworkController(apiService, networkView);

const locationView = new LocationView();
const locationController = new LocationController(apiService, locationView);

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tabBtn' + capitalize(tabId)).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab' + capitalize(tabId)).classList.add('active');

    if (tabId === 'network' && !document.getElementById('ipAddress').textContent.match(/\d/)) {
        networkController.run();
    }

    if (tabId === 'location') {
        locationController.invalidateMap();
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

document.addEventListener('DOMContentLoaded', () => {
    // Attach tab button listeners
    const btnNetwork = document.getElementById('tabBtnNetwork');
    const btnLocation = document.getElementById('tabBtnLocation');
    
    if (btnNetwork) btnNetwork.addEventListener('click', () => switchTab('network'));
    if (btnLocation) btnLocation.addEventListener('click', () => switchTab('location'));
    
    // Attach other listeners in controllers
    networkController.init();
    locationController.init();

    // Remove any leftover onclick attributes
    document.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));

    // Run first check
    networkController.run();
});
