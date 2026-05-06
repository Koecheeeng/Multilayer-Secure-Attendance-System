/**
 * frontend/views/LocationView.js
 *
 * View layer for location validation.
 * Updates DOM elements and Leaflet map based on LocationResult model.
 */
class LocationView {
    constructor() {
        this._map = null;
        this._btnGeo = document.getElementById('btnGeo');
    }

    showLoading() {
        this._btnGeo.disabled = true;
        this._btnGeo.textContent = 'Requesting…';

        document.getElementById('locResults').style.display = 'none';
        document.getElementById('locBanner').className = 'result-banner';
        document.getElementById('locBannerIcon').innerHTML = '<div class="spinner"></div>';
        document.getElementById('locBannerTitle').textContent = 'Acquiring GPS position…';
        document.getElementById('locBannerSubtitle').textContent = 'This may take a few seconds';

        ['checkGeo', 'checkVenue', 'checkAccuracy'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.className = 'check-item';
                document.getElementById(id + 'Status').textContent = '⏳';
                document.getElementById(id + 'Detail').textContent = 'Pending…';
            }
        });
    }

    _formatDistance(meters) {
        if (meters < 1000) return Math.round(meters) + ' m';
        return (meters / 1000).toFixed(2) + ' km';
    }

    /**
     * Renders location result
     * @param {LocationResult} result 
     * @param {number} maxAccuracy 
     */
    render(result, maxAccuracy) {
        this._btnGeo.disabled = false;
        this._btnGeo.textContent = 'Authorize GPS';
        document.getElementById('geoGate').style.display = 'none';
        document.getElementById('locResults').style.display = 'block';

        if (!result.isSuccess) {
            this.renderError(result.error);
            return;
        }

        const location = result.nearestLocation;

        document.getElementById('locCoords').textContent = `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`;
        document.getElementById('locCoordsDetail').textContent = `Raw: ${result.latitude}, ${result.longitude}`;

        document.getElementById('locLocation').textContent = `${location.abbrev} — ${location.name}`;
        document.getElementById('locLocationDetail').textContent = `Branch: ${location.branch}`;

        document.getElementById('locDistance').textContent = this._formatDistance(result.distance);
        document.getElementById('locDistanceDetail').textContent = result.withinGeofence
            ? `Within ${location.abbrev} (${location.radius}m radius)`
            : `Outside KANOPI by ${this._formatDistance(result.distance - location.radius)}`;

        document.getElementById('locAccuracy').textContent = `±${Math.round(result.accuracy)} m`;
        document.getElementById('locAccuracyDetail').textContent = result.accuracy <= maxAccuracy ? 'Good GPS signal' : 'Low GPS accuracy — signal may be unreliable';

        this._setCheck('checkGeo', 'pass', 'Browser geolocation permission was granted');

        if (result.withinGeofence) {
            this._setCheck('checkVenue', 'pass', `Within ${location.abbrev} (${location.name}) — ${this._formatDistance(result.distance)} away`);
        } else {
            this._setCheck('checkVenue', 'fail', `Not within KANOPI geofence — nearest: ${location.abbrev} at ${this._formatDistance(result.distance)}`);
        }

        if (result.accuracy <= maxAccuracy) {
            this._setCheck('checkAccuracy', 'pass', `GPS accuracy: ±${Math.round(result.accuracy)}m (threshold: ${maxAccuracy}m)`);
        } else {
            this._setCheck('checkAccuracy', 'warn', `GPS accuracy: ±${Math.round(result.accuracy)}m — exceeds ${maxAccuracy}m threshold`);
        }

        if (result.withinGeofence && result.accuracy <= maxAccuracy) {
            this._setBanner('pass',
                `✓ Located within ${location.abbrev} — ${location.branch}`,
                `${this._formatDistance(result.distance)} from ${location.name} • GPS ±${Math.round(result.accuracy)}m`
            );
        } else {
            this._setBanner('fail',
                '✗ Not within KANOPI',
                `Nearest location: ${location.abbrev} (${location.branch}) — ${this._formatDistance(result.distance)} away`
            );
        }
    }

    renderError(error) {
        document.getElementById('geoGate').style.display = 'none';
        document.getElementById('locResults').style.display = 'block';
        
        document.getElementById('locCoords').textContent = 'Unavailable';
        document.getElementById('locCoordsDetail').textContent = error.message;
        document.getElementById('locLocation').textContent = '—';
        document.getElementById('locLocationDetail').textContent = 'Cannot determine without location';
        document.getElementById('locDistance').textContent = '—';
        document.getElementById('locDistanceDetail').textContent = 'Cannot calculate';
        document.getElementById('locAccuracy').textContent = '—';
        document.getElementById('locAccuracyDetail').textContent = 'No GPS data';

        this._setCheck('checkGeo', 'fail', `Geolocation denied — ${error.message}`);
        this._setCheck('checkVenue', 'fail', 'Cannot verify location presence without location access');
        this._setCheck('checkAccuracy', 'fail', 'No GPS data available');

        this._setBanner('fail',
            '✗ Location Check Failed',
            `${error.message}. Location access is REQUIRED for attendance verification.`
        );
    }

    /**
     * Initializes Leaflet map
     * @param {LocationResult} result 
     * @param {Array} locations 
     */
    initMap(result, locations) {
        if (!result.isSuccess) return;

        const container = document.getElementById('mapContainer');
        if (!container) return;
        
        const userLat = result.latitude;
        const userLon = result.longitude;
        const nearestLocation = result.nearestLocation;

        if (this._map) {
            this._map.remove();
            this._map = null;
        }

        const venueCenter = { lat: -5.3792377, lng: 105.2365897 };
        const R = 6371000;
        const dLat = (venueCenter.lat - userLat) * Math.PI / 180;
        const dLon = (venueCenter.lng - userLon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(venueCenter.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const distFromVenue = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        const zoomLevel = distFromVenue > 50000 ? 6 : distFromVenue > 5000 ? 11 : 15;

        this._map = L.map(container).setView([userLat, userLon], zoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this._map);

        const userIcon = L.divIcon({
            className: 'user-marker',
            html: `<div style="width:18px;height:18px;background:#6366f1;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(99,102,241,0.6);"></div>`,
            iconSize: [18, 18], iconAnchor: [9, 9]
        });
        L.marker([userLat, userLon], { icon: userIcon })
            .addTo(this._map)
            .bindPopup(`<b>Your Position</b><br>${userLat.toFixed(5)}, ${userLon.toFixed(5)}`);

        for (const loc of locations) {
            const isNearest = loc.name === nearestLocation.name;
            const dist = R * 2 * Math.asin(Math.sqrt(Math.sin((loc.lat - userLat) * Math.PI / 180 / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) * Math.sin((loc.lng - userLon) * Math.PI / 180 / 2) ** 2));

            L.circle([loc.lat, loc.lng], {
                radius: loc.radius,
                color: isNearest ? '#22c55e' : '#6366f1',
                fillColor: isNearest ? '#22c55e' : '#6366f1',
                fillOpacity: isNearest ? 0.15 : 0.06,
                weight: isNearest ? 2 : 1,
                dashArray: isNearest ? null : '4 4'
            }).addTo(this._map);

            const locIcon = L.divIcon({
                className: 'loc-marker',
                html: `<div style="width:10px;height:10px;background:${isNearest ? '#22c55e' : '#94a3b8'};border:2px solid ${isNearest ? '#fff' : '#64748b'};border-radius:50%;box-shadow:0 0 6px ${isNearest ? 'rgba(34,197,94,0.5)' : 'rgba(0,0,0,0.3)'};"></div>`,
                iconSize: [10, 10], iconAnchor: [5, 5]
            });
            L.marker([loc.lat, loc.lng], { icon: locIcon })
                .addTo(this._map)
                .bindPopup(`<b>${loc.abbrev}</b><br>${loc.name}<br>Branch: ${loc.branch}<br>Distance: ${this._formatDistance(dist)}`);
        }

        if (distFromVenue > 2000) {
            const bounds = L.latLngBounds(
                [userLat, userLon],
                [nearestLocation.lat, nearestLocation.lng]
            ).pad(0.3);
            this._map.fitBounds(bounds);
        }
    }

    invalidateMap() {
        if (this._map) {
            setTimeout(() => this._map.invalidateSize(), 100);
        }
    }

    _setCheck(id, status, detail) {
        const item = document.getElementById(id);
        if (!item) return;
        const statusEl = document.getElementById(id + 'Status');
        const detailEl = document.getElementById(id + 'Detail');
        item.className = 'check-item ' + status;
        statusEl.textContent = status === 'pass' ? '[ OK ]' : status === 'fail' ? '[ !! ]' : '[ ?? ]';
        detailEl.textContent = detail;
    }

    _setBanner(status, title, subtitle) {
        const banner = document.getElementById('locBanner');
        const icon = document.getElementById('locBannerIcon');
        if (!banner || !icon) return;
        banner.className = 'result-banner ' + status;
        document.getElementById('locBannerTitle').textContent = title;
        document.getElementById('locBannerSubtitle').textContent = subtitle;
        const symbol = status === 'pass' ? '[ OK ]' : status === 'fail' ? '[ !! ]' : '[ ?? ]';
        icon.innerHTML = `<span style="font-size:16px; font-weight:bold;">${symbol}</span>`;
    }
}
