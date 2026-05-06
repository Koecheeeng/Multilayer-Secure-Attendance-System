/**
 * frontend/admin-verification.js
 *
 * Self-contained verification logic for the admin dashboard.
 * Handles network check and location check tabs within the verification panel.
 */
(function () {
  'use strict';

  const API_BASE = '/api';

  // ===== Models =====
  class NetworkResult {
    constructor(d) { Object.assign(this, d); }
    get overallPass() { return this.asnMatch && this.prefixMatch && this.countryMatch; }
    get hasWarning() { return this.isProxy; }
  }

  class LocationResult {
    constructor(d) { Object.assign(this, d); }
    get isSuccess() { return this.error === null; }
  }

  // ===== API =====
  async function fetchNetwork() {
    const r = await fetch(`${API_BASE}/network/check`);
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    const j = await r.json();
    if (!j.success) throw new Error(j.error || 'Backend error');
    return { result: new NetworkResult(j.data), venueAsnInfo: j.venueAsnInfo };
  }

  async function fetchLocation(lat, lon, accuracy) {
    const r = await fetch(`${API_BASE}/location/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon, accuracy })
    });
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    const j = await r.json();
    if (!j.success) throw new Error(j.error || 'Backend error');
    return { result: new LocationResult(j.data), maxAccuracy: j.maxAccuracy, locations: j.locations };
  }

  // ===== Helpers =====
  const $ = id => document.getElementById(id);

  function setCheck(id, status, detail) {
    const item = $(id);
    if (!item) return;
    item.className = 'v-check-item ' + status;
    $(id + 'Status').textContent = status === 'pass' ? '[ OK ]' : status === 'fail' ? '[ !! ]' : '[ ?? ]';
    $(id + 'Detail').textContent = detail;
  }

  function setBanner(bid, iid, tid, sid, status, title, subtitle) {
    const b = $(bid);
    if (!b) return;
    b.className = 'v-result-banner ' + status;
    $(tid).textContent = title;
    $(sid).textContent = subtitle;
    const sym = status === 'pass' ? '[ OK ]' : status === 'fail' ? '[ !! ]' : '[ ?? ]';
    $(iid).innerHTML = '<span style="font-size:14px;font-weight:800;">' + sym + '</span>';
  }

  function fmtDist(m) { return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(2) + ' km'; }

  // ===== Network Check =====
  async function runNetworkCheck() {
    const btn = $('vBtnCheck');
    if (btn) btn.disabled = true;
    $('vResultBanner').className = 'v-result-banner';
    $('vResultIcon').innerHTML = '<div class="v-spinner"></div>';
    $('vResultTitle').textContent = 'Checking your network…';
    $('vResultSubtitle').textContent = 'Fetching IP information and validating ASN';

    ['vIpAddress','vIpVersion','vIspName','vOrgName','vAsnNumber','vAsnName','vLocation','vCoordinates','vTimezone','vTimezoneOffset','vConnType','vConnProxy']
      .forEach(f => { const el = $(f); if (el) el.textContent = '—'; });

    ['vCheckAsn','vCheckPrefix','vCheckCountry','vCheckProxy'].forEach(id => {
      const el = $(id);
      if (el) { el.className = 'v-check-item'; $(id + 'Status').textContent = '⏳'; $(id + 'Detail').textContent = 'Pending…'; }
    });

    try {
      const { result: r, venueAsnInfo: v } = await fetchNetwork();
      if (btn) btn.disabled = false;

      $('vIpAddress').textContent = r.ip;
      $('vIpVersion').textContent = r.isIpv6 ? 'IPv6 Address' : 'IPv4 Address';
      $('vIspName').textContent = r.isp;
      $('vOrgName').textContent = r.org ? 'Org: ' + r.org : '';
      $('vAsnNumber').textContent = r.asn;
      $('vAsnName').textContent = r.asnName;
      $('vLocation').textContent = r.location;
      $('vCoordinates').textContent = r.coordinates;
      $('vTimezone').textContent = r.timezone;
      $('vTimezoneOffset').textContent = r.timezoneOffset;
      $('vConnType').textContent = r.connType;
      $('vConnProxy').textContent = r.isProxy ? '⚠️ VPN / Proxy detected' : '✓ No VPN / Proxy detected';

      $('vRefOrg').textContent = v.name;
      $('vRefAsn').textContent = v.asn;
      $('vRefPrefix').textContent = 'Target Network: ' + v.asn + ' — Subnet 45.251.4.0/22';

      if (r.asnMatch) setCheck('vCheckAsn', 'pass', 'Your ASN is ' + r.asn + ' — matches ' + v.asn + ' (' + v.name + ')');
      else setCheck('vCheckAsn', 'fail', 'Your ASN is ' + r.asn + ' (' + r.asnName + ') — expected ' + v.asn);

      if (r.prefixMatch) setCheck('vCheckPrefix', 'pass', 'IP ' + r.ip + ' is within ' + r.matchedPrefix);
      else setCheck('vCheckPrefix', 'fail', 'IP ' + r.ip + ' does not fall within any known Pustaka Dakwah prefix');

      if (r.countryMatch) setCheck('vCheckCountry', 'pass', 'Country code: ID (Indonesia)');
      else setCheck('vCheckCountry', 'fail', 'Country mismatch — expected ID (Indonesia)');

      if (!r.isProxy) setCheck('vCheckProxy', 'pass', 'No VPN or Proxy detected');
      else setCheck('vCheckProxy', 'warn', 'VPN or Proxy detected — connection may be tunneled');

      if (r.overallPass && !r.hasWarning) {
        setBanner('vResultBanner','vResultIcon','vResultTitle','vResultSubtitle','pass',
          '✓ Connected via Pustaka Dakwah Network', 'ASN ' + v.asn + ' confirmed • IP ' + r.ip + ' within known prefix range');
      } else if (r.overallPass) {
        setBanner('vResultBanner','vResultIcon','vResultTitle','vResultSubtitle','warn',
          'Pustaka Dakwah Network (with warnings)', 'ASN matches but VPN/Proxy detected');
      } else {
        setBanner('vResultBanner','vResultIcon','vResultTitle','vResultSubtitle','fail',
          '✗ Not on Pustaka Dakwah Network', 'Your network: ' + r.asn + ' — ' + (r.isp || r.asnName));
      }
    } catch (err) {
      if (btn) btn.disabled = false;
      console.error('Network check failed:', err);
      setBanner('vResultBanner','vResultIcon','vResultTitle','vResultSubtitle','warn',
        '⚠ Check Failed', 'Could not complete network validation — ' + err.message);
    }
  }

  // ===== Location Check =====
  let leafletMap = null;

  function renderLocResult(result, maxAccuracy) {
    $('vGeoGate').style.display = 'none';
    $('vLocResults').style.display = 'block';
    const btnGeo = $('vBtnGeo');
    if (btnGeo) { btnGeo.disabled = false; btnGeo.textContent = 'Authorize GPS'; }

    if (!result.isSuccess) {
      renderLocError(result.error);
      return;
    }

    const loc = result.nearestLocation;
    $('vLocCoords').textContent = result.latitude.toFixed(6) + ', ' + result.longitude.toFixed(6);
    $('vLocCoordsDetail').textContent = 'Raw: ' + result.latitude + ', ' + result.longitude;
    $('vLocLocation').textContent = loc.abbrev + ' — ' + loc.name;
    $('vLocLocationDetail').textContent = 'Branch: ' + loc.branch;
    $('vLocDistance').textContent = fmtDist(result.distance);
    $('vLocDistanceDetail').textContent = result.withinGeofence
      ? 'Within ' + loc.abbrev + ' (' + loc.radius + 'm radius)'
      : 'Outside Pustaka Dakwah by ' + fmtDist(result.distance - loc.radius);
    $('vLocAccuracy').textContent = '±' + Math.round(result.accuracy) + ' m';
    $('vLocAccuracyDetail').textContent = result.accuracy <= maxAccuracy ? 'Good GPS signal' : 'Low GPS accuracy';

    setCheck('vCheckGeo', 'pass', 'Browser geolocation permission was granted');
    if (result.withinGeofence) setCheck('vCheckVenue', 'pass', 'Within ' + loc.abbrev + ' — ' + fmtDist(result.distance) + ' away');
    else setCheck('vCheckVenue', 'fail', 'Not within geofence — nearest: ' + loc.abbrev + ' at ' + fmtDist(result.distance));
    if (result.accuracy <= maxAccuracy) setCheck('vCheckAccuracy', 'pass', 'GPS accuracy: ±' + Math.round(result.accuracy) + 'm (threshold: ' + maxAccuracy + 'm)');
    else setCheck('vCheckAccuracy', 'warn', 'GPS accuracy: ±' + Math.round(result.accuracy) + 'm — exceeds ' + maxAccuracy + 'm threshold');

    if (result.withinGeofence && result.accuracy <= maxAccuracy) {
      setBanner('vLocBanner','vLocBannerIcon','vLocBannerTitle','vLocBannerSubtitle','pass',
        '✓ Located within ' + loc.abbrev + ' — ' + loc.branch,
        fmtDist(result.distance) + ' from ' + loc.name + ' • GPS ±' + Math.round(result.accuracy) + 'm');
    } else {
      setBanner('vLocBanner','vLocBannerIcon','vLocBannerTitle','vLocBannerSubtitle','fail',
        '✗ Not within Pustaka Dakwah',
        'Nearest: ' + loc.abbrev + ' (' + loc.branch + ') — ' + fmtDist(result.distance) + ' away');
    }
  }

  function renderLocError(error) {
    $('vGeoGate').style.display = 'none';
    $('vLocResults').style.display = 'block';
    $('vLocCoords').textContent = 'Unavailable';
    $('vLocCoordsDetail').textContent = error.message || error;
    $('vLocLocation').textContent = '—';
    $('vLocLocationDetail').textContent = 'Cannot determine';
    $('vLocDistance').textContent = '—';
    $('vLocDistanceDetail').textContent = 'Cannot calculate';
    $('vLocAccuracy').textContent = '—';
    $('vLocAccuracyDetail').textContent = 'No GPS data';
    setCheck('vCheckGeo', 'fail', 'Geolocation denied — ' + (error.message || error));
    setCheck('vCheckVenue', 'fail', 'Cannot verify without location access');
    setCheck('vCheckAccuracy', 'fail', 'No GPS data available');
    setBanner('vLocBanner','vLocBannerIcon','vLocBannerTitle','vLocBannerSubtitle','fail',
      '✗ Location Check Failed', (error.message || error) + '. Location access is REQUIRED.');
  }

  function initMap(result, locations) {
    if (!result.isSuccess) return;
    const container = $('vMapContainer');
    if (!container || typeof L === 'undefined') return;

    const uLat = result.latitude, uLon = result.longitude;
    const nearest = result.nearestLocation;

    if (leafletMap) { leafletMap.remove(); leafletMap = null; }

    const R = 6371000;
    const vc = { lat: -5.3792377, lng: 105.2365897 };
    const dLat = (vc.lat - uLat) * Math.PI / 180;
    const dLon = (vc.lng - uLon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(uLat * Math.PI / 180) * Math.cos(vc.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const distV = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const zoom = distV > 50000 ? 6 : distV > 5000 ? 11 : 15;

    leafletMap = L.map(container).setView([uLat, uLon], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(leafletMap);

    const uIcon = L.divIcon({ className: '', html: '<div style="width:18px;height:18px;background:#6366f1;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(99,102,241,0.6);"></div>', iconSize: [18,18], iconAnchor: [9,9] });
    L.marker([uLat, uLon], { icon: uIcon }).addTo(leafletMap).bindPopup('<b>Your Position</b><br>' + uLat.toFixed(5) + ', ' + uLon.toFixed(5));

    for (const loc of locations) {
      const isN = loc.name === nearest.name;
      L.circle([loc.lat, loc.lng], { radius: loc.radius, color: isN ? '#22c55e' : '#6366f1', fillColor: isN ? '#22c55e' : '#6366f1', fillOpacity: isN ? 0.15 : 0.06, weight: isN ? 2 : 1, dashArray: isN ? null : '4 4' }).addTo(leafletMap);
      const lIcon = L.divIcon({ className: '', html: '<div style="width:10px;height:10px;background:' + (isN ? '#22c55e' : '#94a3b8') + ';border:2px solid ' + (isN ? '#fff' : '#64748b') + ';border-radius:50%;"></div>', iconSize: [10,10], iconAnchor: [5,5] });
      L.marker([loc.lat, loc.lng], { icon: lIcon }).addTo(leafletMap).bindPopup('<b>' + loc.abbrev + '</b><br>' + loc.name);
    }

    if (distV > 2000) {
      leafletMap.fitBounds(L.latLngBounds([uLat, uLon], [nearest.lat, nearest.lng]).pad(0.3));
    }
  }

  function requestGeo() {
    const btnGeo = $('vBtnGeo');
    if (btnGeo) { btnGeo.disabled = true; btnGeo.textContent = 'Requesting…'; }
    $('vLocResults').style.display = 'none';
    $('vLocBanner').className = 'v-result-banner';
    $('vLocBannerIcon').innerHTML = '<div class="v-spinner"></div>';
    $('vLocBannerTitle').textContent = 'Acquiring GPS position…';
    $('vLocBannerSubtitle').textContent = 'This may take a few seconds';

    ['vCheckGeo','vCheckVenue','vCheckAccuracy'].forEach(id => {
      const el = $(id);
      if (el) { el.className = 'v-check-item'; $(id + 'Status').textContent = '⏳'; $(id + 'Detail').textContent = 'Pending…'; }
    });

    if (!navigator.geolocation) { renderLocError({ message: 'Geolocation not supported' }); return; }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy } = pos.coords;
          const data = await fetchLocation(latitude, longitude, accuracy);
          renderLocResult(data.result, data.maxAccuracy);
          initMap(data.result, data.locations);
        } catch (e) { console.error(e); renderLocError(e); }
      },
      (err) => {
        const reasons = { 1: 'You denied the location permission', 2: 'Location unavailable', 3: 'Location request timed out' };
        renderLocError({ message: reasons[err.code] || err.message || 'Unknown error' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // ===== Tab Switching =====
  function switchVerifyTab(tabId) {
    document.querySelectorAll('.verify-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.vtab === tabId));
    document.querySelectorAll('.verify-tab-content').forEach(c => c.classList.toggle('active', c.id === 'vTab' + tabId.charAt(0).toUpperCase() + tabId.slice(1)));

    if (tabId === 'network' && !($('vIpAddress')?.textContent || '').match(/\d/)) runNetworkCheck();
    if (tabId === 'location' && leafletMap) setTimeout(() => leafletMap.invalidateSize(), 100);
  }

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    // Tab buttons
    document.querySelectorAll('.verify-tab-btn').forEach(b => {
      b.addEventListener('click', () => switchVerifyTab(b.dataset.vtab));
    });

    // Network refresh
    const btnCheck = $('vBtnCheck');
    if (btnCheck) btnCheck.addEventListener('click', () => runNetworkCheck());

    // Location buttons
    const btnGeo = $('vBtnGeo');
    if (btnGeo) btnGeo.addEventListener('click', () => requestGeo());
    const btnRefresh = $('vBtnRefreshLoc');
    if (btnRefresh) btnRefresh.addEventListener('click', () => requestGeo());

    // Auto-run network check when verification tab is shown
    const verifyNav = document.querySelector('[data-nav="verification"]');
    if (verifyNav) {
      verifyNav.addEventListener('click', () => {
        setTimeout(() => {
          if (!($('vIpAddress')?.textContent || '').match(/\d/)) runNetworkCheck();
        }, 200);
      });
    }
  });
})();
