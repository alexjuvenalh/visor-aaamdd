var kmlLayer = null;

function sanitize(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function parsearKMLManual(text) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(text, 'text/xml');
    var features = [];
    var placemarks = doc.querySelectorAll('Placemark');
    for (var i = 0; i < placemarks.length; i++) {
        var pm = placemarks[i];
        var name = pm.querySelector('name');
        var desc = pm.querySelector('description');
        var geometry = null;
        var point = pm.querySelector('Point');
        if (point) {
            var coordText = point.querySelector('coordinates');
            if (coordText && coordText.textContent) {
                var parts = coordText.textContent.trim().split(',');
                if (parts.length >= 2) {
                    geometry = { type: 'Point', coordinates: [parseFloat(parts[0]), parseFloat(parts[1])] };
                }
            }
        }
        if (!geometry) {
            var line = pm.querySelector('LineString');
            if (line) {
                var coordText = line.querySelector('coordinates');
                if (coordText && coordText.textContent) {
                    var coordPairs = coordText.textContent.trim().split(/\s+/);
                    var coords = [];
                    for (var j = 0; j < coordPairs.length; j++) {
                        var cp = coordPairs[j].trim();
                        if (cp) {
                            var parts = cp.split(',');
                            if (parts.length >= 2) coords.push([parseFloat(parts[0]), parseFloat(parts[1])]);
                        }
                    }
                    if (coords.length > 0) geometry = { type: 'LineString', coordinates: coords };
                }
            }
        }
        if (!geometry) {
            var polygon = pm.querySelector('Polygon');
            if (polygon) {
                var ring = polygon.querySelector('LinearRing');
                if (ring) {
                    var coordText = ring.querySelector('coordinates');
                    if (coordText && coordText.textContent) {
                        var coordPairs = coordText.textContent.trim().split(/\s+/);
                        var coords = [];
                        for (var j = 0; j < coordPairs.length; j++) {
                            var cp = coordPairs[j].trim();
                            if (cp) {
                                var parts = cp.split(',');
                                if (parts.length >= 2) coords.push([parseFloat(parts[0]), parseFloat(parts[1])]);
                            }
                        }
                        if (coords.length > 0) geometry = { type: 'Polygon', coordinates: [coords] };
                    }
                }
            }
        }
        if (geometry) {
            features.push({ type: 'Feature', properties: { name: name ? name.textContent : '', description: desc ? desc.textContent : '' }, geometry: geometry });
        }
    }
    return { type: 'FeatureCollection', features: features };
}

function inicializar() {
    var fileInput = document.getElementById('file-kml');
    if (!fileInput) { setTimeout(inicializar, 300); return; }
    fileInput.onclick = function(e) { e.target.value = ''; };
    fileInput.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (!window.map) return;
        procesarArchivo(file);
    };
    var btnLimpiar = document.getElementById('btn-limpiar-kml');
    if (btnLimpiar) {
        btnLimpiar.onclick = function() {
            if (kmlLayer && window.map) {
                window.map.removeLayer(kmlLayer);
                kmlLayer = null;
                document.getElementById('file-kml').value = '';
            }
        };
    }
}

function procesarArchivo(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    var reader = new FileReader();
    reader.onload = function(event) {
        var text = event.target.result;
        var geojson = null;
        if (ext === 'kml') {
            if (typeof toGeoJSON !== 'undefined') {
                var parser = new DOMParser();
                var doc = parser.parseFromString(text, 'text/xml');
                geojson = toGeoJSON.kml(doc);
            }
            if (!geojson || !geojson.features || geojson.features.length === 0) {
                geojson = parsearKMLManual(text);
            }
        } else if (ext === 'gpx') {
            if (typeof toGeoJSON !== 'undefined') {
                var parser = new DOMParser();
                var doc = parser.parseFromString(text, 'text/xml');
                geojson = toGeoJSON.gpx(doc);
            }
        } else if (ext === 'json' || ext === 'geojson') {
            geojson = JSON.parse(text);
        }
        if (!geojson || !geojson.features || geojson.features.length === 0) return;
        var mapa = window.map;
        if (kmlLayer) mapa.removeLayer(kmlLayer);
        kmlLayer = L.geoJson(geojson, {
            style: { color: '#ff0000', weight: 3 },
            pointToLayer: function(f, latlng) { return L.circleMarker(latlng, { radius: 8, fillColor: '#ff0000', fillOpacity: 1 }); },
            onEachFeature: function(feature, layer) {
                var props = feature.properties || {};
                var content = '<b>Feature</b><br/>';
                for (var key in props) content += key + ': ' + sanitize(props[key]) + '<br/>';
                layer.bindPopup(content);
            }
        }).addTo(mapa);
        document.getElementById('file-kml').value = '';
        var bounds = kmlLayer.getBounds();
        if (bounds.isValid()) mapa.fitBounds(bounds);
    };
    reader.readAsText(file);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicializar);
else inicializar();