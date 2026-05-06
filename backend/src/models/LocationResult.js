/**
 * src/models/LocationResult.js
 *
 * Data model for location validation result.
 * Holds coordinates, accuracy, distance, and geofence status.
 */
class LocationResult {
    constructor({ latitude, longitude, accuracy, nearestLocation, distance, withinGeofence, error }) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;
        this.nearestLocation = nearestLocation;
        this.distance = distance;
        this.withinGeofence = withinGeofence;
        this.error = error || null;
    }

    get isSuccess() {
        return this.error === null;
    }
}

module.exports = LocationResult;
