/**
 * frontend/models/NetworkResult.js
 *
 * Client-side data model for network validation result.
 */
class NetworkResult {
    constructor(data) {
        Object.assign(this, data);
    }

    get overallPass() {
        return this.asnMatch && this.prefixMatch && this.countryMatch;
    }

    get hasWarning() {
        return this.isProxy;
    }
}
