/**
 * src/models/NetworkResult.js
 *
 * Data model for network validation result.
 * Holds IP, ASN, geolocation, and match data.
 */
class NetworkResult {
    constructor({ ip, isIpv6, isp, org, asn, asnName, location, coordinates,
                  timezone, timezoneOffset, connType, isProxy,
                  asnMatch, prefixMatch, countryMatch, matchedPrefix }) {
        this.ip = ip;
        this.isIpv6 = isIpv6;
        this.isp = isp;
        this.org = org;
        this.asn = asn;
        this.asnName = asnName;
        this.location = location;
        this.coordinates = coordinates;
        this.timezone = timezone;
        this.timezoneOffset = timezoneOffset;
        this.connType = connType;
        this.isProxy = isProxy;
        this.asnMatch = asnMatch;
        this.prefixMatch = prefixMatch;
        this.countryMatch = countryMatch;
        this.matchedPrefix = matchedPrefix;
    }

    get overallPass() {
        return this.asnMatch && this.prefixMatch && this.countryMatch;
    }

    get hasWarning() {
        return this.isProxy;
    }
}

module.exports = NetworkResult;
