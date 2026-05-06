/**
 * src/services/GeolocationService.js
 *
 * Service layer for geolocation validation.
 *
 * @returns {LocationResult}
 */
const LocationResult = require('../models/LocationResult');

const MAX_ACCURACY_METERS = 100;

const LOCATIONS = [
    {
        name: 'KANOPI',
        abbrev: 'KANOPI',
        branch: 'Bandar Lampung',
        lat: -5.3792377,
        lng: 105.2365897,
        radius: 100
    }
];

class GeolocationService {
    _haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = deg => deg * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    _findNearestLocation(lat, lon) {
        let nearest = null;
        let minDist = Infinity;
        let withinAny = false;

        for (const loc of LOCATIONS) {
            const dist = this._haversineDistance(lat, lon, loc.lat, loc.lng);
            if (dist < minDist) {
                minDist = dist;
                nearest = loc;
            }
            if (dist <= loc.radius) {
                withinAny = true;
            }
        }
        return {
            location: nearest,
            distance: minDist,
            withinGeofence: withinAny || (minDist <= nearest.radius)
        };
    }

    /**
     * Validates a given coordinate pair
     * @param {number} lat 
     * @param {number} lon 
     * @param {number} accuracy 
     * @returns {LocationResult}
     */
    validateLocation(lat, lon, accuracy) {
        const result = this._findNearestLocation(lat, lon);
        return new LocationResult({
            latitude: lat,
            longitude: lon,
            accuracy: accuracy,
            nearestLocation: result.location,
            distance: result.distance,
            withinGeofence: result.withinGeofence,
            error: null
        });
    }

    getMaxAccuracy() {
        return MAX_ACCURACY_METERS;
    }

    getLocations() {
        return LOCATIONS;
    }
}

module.exports = GeolocationService;
