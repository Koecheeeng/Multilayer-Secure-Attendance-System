/**
 * src/services/IpValidationService.js
 *
 * Service layer for network validation.
 * Fetches IP data from ip-api.com and validates ASN, IP prefix, country, and proxy.
 *
 * @returns {NetworkResult}
 */
const fetch = require('node-fetch');
const NetworkResult = require('../models/NetworkResult');

const VENUE_ASN = process.env.VENUE_ASN || 'AS38511';           // TODO: set to Pustaka Dakwah WiFi ASN
const VENUE_ASN_NAME = process.env.VENUE_ASN_NAME || 'Pustaka Dakwah'; // TODO: set to Pustaka Dakwah ISP name
const VENUE_IPV4_PREFIXES = [
    { cidr: '45.251.4.0/22', network: '45.251.4.0', mask: 22 }
];
const VENUE_IPV6_PREFIXES = [];

class IpValidationService {
    _ipToLong(ip) {
        const parts = ip.split('.').map(Number);
        return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    }

    _isIpInCidr(ip, network, maskBits) {
        const ipLong = this._ipToLong(ip);
        const netLong = this._ipToLong(network);
        const mask = (~0 << (32 - maskBits)) >>> 0;
        return (ipLong & mask) === (netLong & mask);
    }

    _isIpv6InPrefix(ip, prefix) {
        const prefixPart = prefix.split('::')[0].toLowerCase();
        return ip.toLowerCase().startsWith(prefixPart);
    }

    _checkIpInVenuePrefixes(ip) {
        if (ip.includes(':')) {
            if (!VENUE_IPV6_PREFIXES || VENUE_IPV6_PREFIXES.length === 0) return { match: false, matchedPrefix: null, isIpv6: true };
            for (const prefix of VENUE_IPV6_PREFIXES) {
                if (this._isIpv6InPrefix(ip, prefix)) {
                    return { match: true, matchedPrefix: prefix, isIpv6: true };
                }
            }
            return { match: false, matchedPrefix: null, isIpv6: true };
        }
        for (const prefix of VENUE_IPV4_PREFIXES) {
            if (this._isIpInCidr(ip, prefix.network, prefix.mask)) {
                return { match: true, matchedPrefix: prefix.cidr, isIpv6: false };
            }
        }
        return { match: false, matchedPrefix: null, isIpv6: false };
    }

    /**
     * Fetch IP data and validate
     * @param {string} clientIp 
     * @returns {Promise<NetworkResult>}
     */
    async fetchAndValidate(clientIp) {
        const url = clientIp
            ? `http://ip-api.com/json/${clientIp}?fields=status,message,query,continent,country,countryCode,region,regionName,city,zip,lat,lon,timezone,offset,isp,org,as,asname,mobile,proxy,hosting`
            : `http://ip-api.com/json/?fields=status,message,query,continent,country,countryCode,region,regionName,city,zip,lat,lon,timezone,offset,isp,org,as,asname,mobile,proxy,hosting`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed: ' + response.status);
        const data = await response.json();
        if (data.status === 'fail') throw new Error(data.message || 'API returned failure');

        const ip = data.query;
        const prefixResult = this._checkIpInVenuePrefixes(ip);

        const asParts = (data.as || '').split(' ');
        const asNumber = asParts[0] || '—';
        const asnName = asParts.slice(1).join(' ') || data.asname || '—';

        const asnMatch = asNumber.toUpperCase() === VENUE_ASN;
        const countryMatch = data.countryCode === 'ID';

        const location = [data.city, data.regionName, data.country].filter(Boolean).join(', ');
        const coordinates = data.lat && data.lon ? `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}` : '—';

        const offsetHrs = data.offset != null ? (data.offset / 3600) : null;
        const timezoneOffset = offsetHrs != null ? `UTC${offsetHrs >= 0 ? '+' : ''}${offsetHrs}` : '—';

        const connParts = [];
        if (data.mobile) connParts.push('Mobile');
        if (data.hosting) connParts.push('Hosting/Datacenter');
        if (!data.mobile && !data.hosting) connParts.push('Fixed Line / Broadband');

        return new NetworkResult({
            ip: ip,
            isIpv6: prefixResult.isIpv6,
            isp: data.isp || 'Unknown',
            org: data.org || null,
            asn: asNumber,
            asnName: asnName,
            location: location,
            coordinates: coordinates,
            timezone: data.timezone || '—',
            timezoneOffset: timezoneOffset,
            connType: connParts.join(', '),
            isProxy: !!data.proxy,
            asnMatch: asnMatch,
            prefixMatch: prefixResult.match,
            countryMatch: countryMatch,
            matchedPrefix: prefixResult.matchedPrefix
        });
    }

    getVenueAsnInfo() {
        return {
            asn: VENUE_ASN,
            name: VENUE_ASN_NAME
        };
    }
}

module.exports = IpValidationService;
