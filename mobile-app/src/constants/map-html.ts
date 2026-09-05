import boundaryData from './rangpur-boundary.json';

function buildMapHtml(): string {
  const boundaryJson = JSON.stringify(boundaryData);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    body { background: #e2e8f0; }
    .donor-marker {
      background: #16a34a;
      border: 2px solid #fff;
      border-radius: 50%;
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 11px; font-weight: 800;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .request-marker {
      background: #dc2626;
      border: 2px solid #fff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .request-marker span {
      transform: rotate(45deg);
      color: #fff; font-size: 10px; font-weight: 800;
    }
    .request-critical {
      background: #991b1b;
      box-shadow: 0 0 0 3px rgba(220,38,38,0.4), 0 2px 6px rgba(0,0,0,0.3);
    }
    .user-marker {
      background: #3b82f6;
      border: 3px solid #fff;
      border-radius: 50%;
      width: 16px; height: 16px;
      box-shadow: 0 0 0 4px rgba(59,130,246,0.3);
    }
    .leaflet-popup-content { margin: 8px 12px; font-family: -apple-system, sans-serif; }
    .popup-title { font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .popup-row { font-size: 12px; color: #64748b; margin-bottom: 2px; }
    .popup-badge { display: inline-block; background: #fef2f2; color: #dc2626; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-right: 4px; }
    .popup-btn { display: inline-block; background: #dc2626; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-decoration: none; margin-top: 4px; }
    .count-badge {
      background: #fff; border: 2px solid #16a34a; border-radius: 12px;
      padding: 2px 8px; font-size: 11px; font-weight: 700; color: #16a34a;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var boundary = ${boundaryJson};
    var map = L.map('map', {
      center: [25.7439, 89.2752],
      zoom: 10,
      minZoom: 8,
      maxBounds: [[25.03, 88.08], [26.64, 89.89]],
      maxBoundsViscosity: 1.0,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      subdomains: 'abc',
      maxZoom: 19,
    }).addTo(map);

    // Rangpur boundary — inverted tint
    var outerWorldRing = [[-84,-180],[-84,180],[84,180],[84,-180]];
    L.polygon([outerWorldRing].concat(boundary), {
      color: 'transparent',
      fillColor: '#e11d48',
      fillOpacity: 0.12,
      weight: 0,
      interactive: false,
    }).addTo(map);

    boundary.forEach(function(ring) {
      L.polyline(ring, {
        color: '#dc2626',
        weight: 2.5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    });

    var markerLayer = L.layerGroup().addTo(map);
    var userMarker = null;

    function updateMarkers(dataStr) {
      markerLayer.clearLayers();
      var data = JSON.parse(dataStr);
      var donors = data.donors || [];
      var requests = data.requests || [];

      // Cluster donors by upazila
      var clusters = {};
      donors.forEach(function(d) {
        if (d.lat == null || d.lng == null) return;
        var key = (d.upazila || d.district || 'unknown');
        if (!clusters[key]) clusters[key] = { lat: d.lat, lng: d.lng, count: 0, groups: {}, eligible: 0 };
        clusters[key].count++;
        if (d.eligibleTypesCount > 0) clusters[key].eligible++;
        var bg = d.bloodGroup || '?';
        clusters[key].groups[bg] = (clusters[key].groups[bg] || 0) + 1;
      });

      Object.keys(clusters).forEach(function(key) {
        var c = clusters[key];
        var icon = L.divIcon({
          className: '',
          html: '<div class="donor-marker">' + c.count + '</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        var m = L.marker([c.lat, c.lng], { icon: icon });
        var groupChips = Object.keys(c.groups).map(function(bg) {
          return '<span class="popup-badge">' + bg + ': ' + c.groups[bg] + '</span>';
        }).join('');
        m.bindPopup(
          '<div class="popup-title">' + key + '</div>' +
          '<div class="popup-row">' + c.count + ' donors (' + c.eligible + ' eligible)</div>' +
          '<div class="popup-row">' + groupChips + '</div>'
        );
        markerLayer.addLayer(m);
      });

      // Request markers
      requests.forEach(function(r) {
        if (r.lat == null || r.lng == null) return;
        var cls = 'request-marker' + (r.urgency === 'critical' ? ' request-critical' : '');
        var icon = L.divIcon({
          className: '',
          html: '<div class="' + cls + '"><span>' + (r.bloodGroup || '?') + '</span></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        var m = L.marker([r.lat, r.lng], { icon: icon });
        var urgencyBadge = r.urgency === 'critical' ? '<span class="popup-badge" style="background:#fef2f2;color:#991b1b">CRITICAL</span>' :
                           r.urgency === 'urgent' ? '<span class="popup-badge" style="background:#fef3c7;color:#92400e">URGENT</span>' : '';
        var popup = '<div class="popup-title">' + (r.patientName || 'Patient') + '</div>' +
          '<div class="popup-row">' + urgencyBadge + ' ' + (r.bloodGroup || '') + ' - ' + (r.unitsNeeded || 1) + ' unit(s)</div>' +
          '<div class="popup-row">' + (r.hospitalName || '') + '</div>' +
          '<div class="popup-row">' + (r.upazila || '') + ', ' + (r.district || '') + '</div>';
        if (r.phone) {
          popup += '<a class="popup-btn" href="tel:' + r.phone + '">Call Now</a>';
        }
        m.bindPopup(popup);
        markerLayer.addLayer(m);
      });
    }

    function setUserLocation(lat, lng) {
      if (userMarker) map.removeLayer(userMarker);
      var icon = L.divIcon({
        className: '',
        html: '<div class="user-marker"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
    }

    function fitToData() {
      var layers = markerLayer.getLayers();
      if (layers.length > 0) {
        var group = L.featureGroup(layers);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }

    // Listen for data from React Native
    window.addEventListener('message', function(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'markers') updateMarkers(msg.data);
        if (msg.type === 'userLocation') setUserLocation(msg.lat, msg.lng);
        if (msg.type === 'fit') fitToData();
      } catch (err) {}
    });
  </script>
</body>
</html>`;
}

export const MAP_HTML = buildMapHtml();