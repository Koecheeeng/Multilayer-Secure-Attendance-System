/**
 * frontend/views/NetworkView.js
 *
 * View layer for network validation.
 * Updates DOM elements based on a NetworkResult model.
 */
class NetworkView {
    constructor() {
        this._btnCheck = document.getElementById('btnCheck');
        this._resultBanner = document.getElementById('resultBanner');
        this._resultIcon = document.getElementById('resultIcon');
        this._resultTitle = document.getElementById('resultTitle');
        this._resultSubtitle = document.getElementById('resultSubtitle');
    }

    showLoading() {
        this._resultBanner.className = 'result-banner';
        this._resultIcon.innerHTML = '<div class="spinner"></div>';
        this._resultTitle.textContent = 'Checking your network…';
        this._resultSubtitle.textContent = 'Fetching IP information and validating ASN';
        this._btnCheck.disabled = true;

        const fields = ['ipAddress', 'ipVersion', 'ispName', 'orgName', 'asnNumber', 'asnName', 'location', 'coordinates', 'timezone', 'timezoneOffset', 'connType', 'connProxy'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.textContent = f.includes('Version') || f.includes('Name') || f.includes('Detail') || f.includes('Offset') || f.includes('Proxy') ? 'Detecting…' : '—';
        });

        ['checkAsn', 'checkPrefix', 'checkCountry', 'checkProxy'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.className = 'check-item';
                document.getElementById(id + 'Status').textContent = '⏳';
                document.getElementById(id + 'Detail').textContent = 'Pending…';
            }
        });
    }

    /**
     * Renders network result
     * @param {NetworkResult} result 
     * @param {Object} venueAsnInfo 
     */
    render(result, venueAsnInfo) {
        this._btnCheck.disabled = false;

        document.getElementById('ipAddress').textContent = result.ip;
        document.getElementById('ipVersion').textContent = result.isIpv6 ? 'IPv6 Address' : 'IPv4 Address';
        
        document.getElementById('ispName').textContent = result.isp;
        document.getElementById('orgName').textContent = result.org ? `Org: ${result.org}` : '';

        document.getElementById('asnNumber').textContent = result.asn;
        document.getElementById('asnName').textContent = result.asnName;

        document.getElementById('location').textContent = result.location;
        document.getElementById('coordinates').textContent = result.coordinates;

        document.getElementById('timezone').textContent = result.timezone;
        document.getElementById('timezoneOffset').textContent = result.timezoneOffset;

        document.getElementById('connType').textContent = result.connType;
        document.getElementById('connProxy').textContent = result.isProxy ? '⚠️ VPN / Proxy detected' : '✓ No VPN / Proxy detected';

        // Update Reference Section
        document.getElementById('refOrg').textContent = venueAsnInfo.name;
        document.getElementById('refAsn').textContent = venueAsnInfo.asn;
        document.getElementById('refPrefix').textContent = `Target Network: ${venueAsnInfo.asn} — Subnet 45.251.4.0/22`;

        if (result.asnMatch) {
            this._setCheck('checkAsn', 'pass', `Your ASN is ${result.asn} — matches ${venueAsnInfo.asn} (${venueAsnInfo.name})`);
        } else {
            this._setCheck('checkAsn', 'fail', `Your ASN is ${result.asn} (${result.asnName}) — expected ${venueAsnInfo.asn}`);
        }

        if (result.prefixMatch) {
            this._setCheck('checkPrefix', 'pass', `IP ${result.ip} is within ${result.matchedPrefix}`);
        } else {
            this._setCheck('checkPrefix', 'fail', `IP ${result.ip} does not fall within any known Pustaka Dakwah prefix`);
        }

        if (result.countryMatch) {
            this._setCheck('checkCountry', 'pass', `Country code: ID (Indonesia)`);
        } else {
            this._setCheck('checkCountry', 'fail', `Country mismatch — expected ID (Indonesia)`);
        }

        if (!result.isProxy) {
            this._setCheck('checkProxy', 'pass', 'No VPN or Proxy detected');
        } else {
            this._setCheck('checkProxy', 'warn', 'VPN or Proxy detected — connection may be tunneled');
        }

        if (result.overallPass && !result.hasWarning) {
            this._setBanner('pass',
                '✓ Connected via Pustaka Dakwah Network',
                `ASN ${venueAsnInfo.asn} confirmed • IP ${result.ip} within known Pustaka Dakwah prefix range`
            );
        } else if (result.overallPass && result.hasWarning) {
            this._setBanner('warn',
                'Pustaka Dakwah Network Detected (with warnings)',
                'ASN matches but a VPN/Proxy was detected'
            );
        } else {
            this._setBanner('fail',
                '✗ Not on Pustaka Dakwah Network',
                `Your network: ${result.asn} — ${result.isp || result.asnName}`
            );
        }
    }

    renderError(err) {
        this._btnCheck.disabled = false;
        this._setBanner('warn', '⚠ Check Failed', 'Could not complete network validation — ' + err.message);
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
        this._resultBanner.className = 'result-banner ' + status;
        this._resultTitle.textContent = title;
        this._resultSubtitle.textContent = subtitle;
        const symbol = status === 'pass' ? '[ OK ]' : status === 'fail' ? '[ !! ]' : '[ ?? ]';
        this._resultIcon.innerHTML = `<span style="font-size:16px; font-weight:bold;">${symbol}</span>`;
    }
}
