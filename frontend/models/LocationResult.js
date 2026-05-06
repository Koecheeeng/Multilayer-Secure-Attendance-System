/**
 * frontend/models/LocationResult.js
 *
 * Client-side data model for location validation result.
 */
class LocationResult {
    constructor(data) {
        Object.assign(this, data);
    }

    get isSuccess() {
        return this.error === null;
    }
}
