/**
 * gps.js — Módulo de geolocalización del Visor AAA Madre de Dios
 * 
 * Extraído de jsmapa/index.js (líneas 491-894).
 * Provee: gpsProvider (híbrido Capacitor/Web), iniciarGPS(), exportar track.
 * 
 * Depende de: util.js (AppState, sanitize), Leaflet (L)
 */

// === PROVEEDOR DE GEOLOCALIZACIÓN HÍBRIDO ===
// Usa el plugin nativo de Capacitor cuando está disponible,
// fallback a navigator.geolocation en web
var gpsProvider = (function() {
    var isNative = typeof window !== 'undefined' &&
        window.Capacitor &&
        window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform();

    if (isNative) {
        console.log('[GPS] Usando proveedor NATIVO (Capacitor)');
    } else {
        console.log('[GPS] Usando proveedor WEB (navigator.geolocation)');
    }

    return {
        isNative: function() { return isNative; },

        getCurrentPosition: function(opts) {
            return new Promise(function(resolve, reject) {
                if (isNative) {
                    window.Capacitor.Plugins.Geolocation.getCurrentPosition({
                        enableHighAccuracy: true,
                        timeout: (opts && opts.timeout) || 30000
                    }).then(function(pos) {
                        resolve({
                            coords: {
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                                accuracy: pos.coords.accuracy,
                                altitude: pos.coords.altitude
                            }
                        });
                    }).catch(function(err) {
                        reject(err);
                    });
                } else {
                    navigator.geolocation.getCurrentPosition(resolve, reject, opts || {
                        enableHighAccuracy: true,
                        timeout: 30000,
                        maximumAge: 0
                    });
                }
            });
        },

        watchPosition: function(opts, onSuccess, onError) {
            var wrappedSuccess = function(pos) {
                onSuccess({
                    coords: {
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude
                    }
                });
            };

            if (isNative) {
                return window.Capacitor.Plugins.Geolocation.watchPosition(
                    { enableHighAccuracy: true, timeout: (opts && opts.timeout) || 30000 },
                    function(pos, err) {
                        if (err) {
                            if (onError) onError(err);
                        } else {
                            wrappedSuccess(pos);
                        }
                    }
                );
            } else {
                return navigator.geolocation.watchPosition(wrappedSuccess, onError, opts || {
                    enableHighAccuracy: true,
                    timeout: 30000,
                    maximumAge: 0
                });
            }
        },

        clearWatch: function(id) {
            if (isNative) {
                window.Capacitor.Plugins.Geolocation.clearWatch({ id: id });
            } else {
                navigator.geolocation.clearWatch(id);
            }
        }
    };
})();

// === FUNCIÓN PRINCIPAL — INICIAR GPS ===
function iniciarGPS() {
    var gs = AppState.gps;
    var map = AppState.map;
    console.log('[GPS] ===== BOTÓN GPS TOCADO =====');

    if (!navigator.geolocation && !gpsProvider.isNative()) {
        alert('Tu dispositivo no soporta GPS');
        return;
    }

    // Si ya está activo, detener
    if (gs.watchId !== null) {
        console.log('[GPS] Deteniendo seguimiento...');
        gpsProvider.clearWatch(gs.watchId);
        gs.watchId = null;
        gs.active = false;
        if (gs.precisionIndicator) {
            map.removeControl(gs.precisionIndicator);
            gs.precisionIndicator = null;
        }
        agregarBotonesExportarGPS();
        var btnGps = document.getElementById('btn-gps');
        if (btnGps) {
            btnGps.textContent = '📍 GPS';
            btnGps.style.background = '#4CAF50';
        }
        return;
    }

    console.log('[GPS] Limpiando capas anteriores...');

    // Limpiar todo
    if (gs.marker) { map.removeLayer(gs.marker); gs.marker = null; }
    if (gs.pathLayer) { map.removeLayer(gs.pathLayer); gs.pathLayer = null; }
    if (gs.botonMiUbicacion) { gs.botonMiUbicacion.remove(); gs.botonMiUbicacion = null; }
    if (gs.precisionIndicator) { map.removeControl(gs.precisionIndicator); gs.precisionIndicator = null; }

    gs.trackCoords = [];
    gs.reintentos = 0;
    gs.intentosInicial = 0;
    gs.ultimaPosicionBuena = null;

    // Crear polyline para el track
    gs.pathLayer = L.polyline([], {
        color: '#2196F3',
        weight: 5,
        opacity: 0.9
    }).addTo(map);

    console.log('[GPS] Solicitando posición inicial...');

    // Actualizar botón
    var btnGps = document.getElementById('btn-gps');
    if (btnGps) {
        btnGps.textContent = '⏳ Buscando...';
        btnGps.style.background = '#FF9800';
    }

    // Indicador en el mapa
    gs.precisionIndicator = L.control({ position: 'topright' });
    gs.precisionIndicator.onAdd = function(m) {
        this._div = L.DomUtil.create('div', 'gps-precision-indicator');
        this._div.style.cssText = 'background:white;padding:8px;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.3);font-size:12px;font-family:sans-serif;';
        this._div.innerHTML = '⏳ Buscando GPS...';
        return this._div;
    };
    gs.precisionIndicator.addTo(map);

    // Obtener posición inicial
    gpsProvider.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
    }).then(function(pos) {
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            var prec = pos.coords.accuracy;
            var alt = pos.coords.altitude;

            console.log('[GPS] POSICIÓN OBTENIDA: lat=' + lat + ', lng=' + lng + ', prec=' + prec + 'm, alt=' + alt);

            // Confirmar con usuario
            var confirmar = confirm('📍 Ubicación encontrada:\n\nLat: ' + lat.toFixed(6) + '\nLng: ' + lng.toFixed(6) + '\nPrecisión: ±' + Math.round(prec) + 'm\n\n¿Estás en esta posición?');

            if (confirmar) {
                // Iniciar seguimiento
                gs.trackCoords.push([lat, lng]);
                gs.pathLayer.setLatLngs(gs.trackCoords);

                gs.marker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'gps-marker',
                        html: '<div style="background:#4CAF50;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    }),
                    zIndexOffset: 1000
                }).addTo(map);

                gs.marker.bindPopup('<b>📍 Mi ubicación</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6) + '<br>Precisión: ±' + Math.round(prec) + 'm').openPopup();
                gs.ultimaPosicionBuena = [lat, lng];
                gs.active = true;

                // Actualizar indicador
                gs.precisionIndicator._div.innerHTML = '📍 GPS ACTIVO<br>Precisión: ±' + Math.round(prec) + 'm<br>Lat: ' + lat.toFixed(4) + '<br>Lng: ' + lng.toFixed(4);
                gs.precisionIndicator._div.style.color = 'green';

                // Actualizar botón
                if (btnGps) {
                    btnGps.textContent = '📍 GPS ACTIVO';
                    btnGps.style.background = '#2196F3';
                }

                // Agregar botón Mi Ubicación
                if (!gs.botonMiUbicacion) {
                    var btn = document.createElement('button');
                    btn.id = 'btn-mi-ubicacion';
                    btn.innerHTML = '🎯 Mi Ubicación';
                    btn.className = 'btn-mi-ubicacion';
                    btn.onclick = function() {
                        if (gs.marker) {
                            map.setView(gs.marker.getLatLng(), 17);
                            gs.marker.openPopup();
                        }
                    };
                    var gpsBox = document.getElementById('gps-box');
                    if (gpsBox) gpsBox.appendChild(btn);
                    gs.botonMiUbicacion = btn;
                }

                // Centrar mapa
                map.setView([lat, lng], 17);

                // Iniciar seguimiento continuo
                console.log('[GPS] Iniciando watchPosition...');

                gs.watchId = gpsProvider.watchPosition(
                    { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
                    function(pos) {
                        var lat = pos.coords.latitude;
                        var lng = pos.coords.longitude;
                        var prec = pos.coords.accuracy;

                        console.log('[GPS] ACTUALIZACION: ' + lat + ', ' + lng + ' (±' + prec + 'm)');

                        gs.ultimaPosicionBuena = [lat, lng];
                        gs.trackCoords.push([lat, lng]);
                        gs.pathLayer.setLatLngs(gs.trackCoords);

                        if (gs.marker) {
                            gs.marker.setLatLng([lat, lng]);
                            gs.marker.setPopupContent('<b>📍 Mi ubicación</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6) + '<br>Precisión: ±' + Math.round(prec) + 'm<br>Puntos: ' + gs.trackCoords.length);
                        }

                        gs.precisionIndicator._div.innerHTML = '📍 GPS ACTIVO<br>Precisión: ±' + Math.round(prec) + 'm<br>Puntos: ' + gs.trackCoords.length;
                        // NOTA: ya no hacemos setView() en cada update para permitir que el usuario panee libremente
                    },
                    function(err) {
                        console.log('[GPS] Error watch: ' + err.message);
                        gs.reintentos++;
                        if (gs.reintentos >= gs.maxReintentos) {
                            alert('⚠️ GPS perdió señal');
                            gpsProvider.clearWatch(gs.watchId);
                            gs.watchId = null;
                            gs.active = false;
                            if (btnGps) {
                                btnGps.textContent = '📍 GPS';
                                btnGps.style.background = '#4CAF50';
                            }
                        }
                    }
                );
            } else {
                // Usuario rechaza - reintentar
                console.log('[GPS] Usuario rechaza posición, reintentando...');
                if (gs.intentosInicial < gs.maxIntentosInicial) {
                    gs.intentosInicial++;
                    setTimeout(iniciarGPS, 2000);
                } else {
                    alert('No se pudo obtener tu ubicación. Intenta de nuevo.');
                }
            }
        }).catch(function(err) {
            console.log('[GPS] Error inicial: ' + err.message + ' código: ' + err.code);
            var msg = '';
            if (err.code === 1) msg = 'Permiso denegado. Activa en: Ajustes → Permisos → Ubicación';
            else if (err.code === 2) msg = 'GPS desactivado. Actívalo en ajustes.';
            else msg = 'Timeout. Intenta afuera y espera.';

            alert('❌ Error GPS: ' + msg);

            if (btnGps) {
                btnGps.textContent = '📍 GPS';
                btnGps.style.background = '#4CAF50';
            }
        });
}

// === BOTÓN "EXPORTAR RUTA" DEL HTML ===
function initExportarGPS() {
    var btnExportGps = document.getElementById('btn-export-gps');
    if (btnExportGps) {
        btnExportGps.addEventListener('click', function() {
            var coords = AppState.gps.trackCoords;
            if (!coords || coords.length === 0) {
                alert('No hay track GPS para exportar. Inicia el GPS primero.');
                return;
            }
            var geojson = { type: 'FeatureCollection', features: [{
                type: 'Feature',
                properties: { name: 'Track GPS', puntos: coords.length },
                geometry: { type: 'LineString', coordinates: coords.map(function(c) { return [c[1], c[0]]; }) }
            }]};
            var blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'track_gps_' + Date.now() + '.geojson';
            link.click();
        });
    }
}

// === AGREGAR BOTONES DE EXPORTAR TRACK GPS (aparecen al detener) ===
function agregarBotonesExportarGPS() {
    var gs = AppState.gps;
    if (gs.trackCoords.length === 0) return;

    var infoDiv = document.getElementById('controls');
    if (!infoDiv) return;

    // Verificar si ya existen los botones
    if (document.getElementById('gps-export-btns')) return;

    var exportDiv = document.createElement('div');
    exportDiv.id = 'gps-export-btns';
    exportDiv.innerHTML = '<b>📍 Track GPS (' + gs.trackCoords.length + ' puntos)</b><br>' +
        '<button id="btn-gps-gpx" class="btn-gps-export gpx">📥 GPX</button>' +
        '<button id="btn-gps-geojson" class="btn-gps-export geojson">📥 GeoJSON</button>' +
        '<button id="btn-gps-txt" class="btn-gps-export txt">📥 TXT</button>' +
        '<button id="btn-gps-limpiar" class="btn-gps-export limpiar">🗑️ Limpiar</button>';
    infoDiv.appendChild(exportDiv);

    var map = AppState.map;

    // GPX
    document.getElementById('btn-gps-gpx').onclick = function() {
        var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1"><trk><name>Track GPS</name><trkseg>\n';
        gs.trackCoords.forEach(function(c) {
            gpx += '  <trkpt lat="' + c[0] + '" lon="' + c[1] + '"></trkpt>\n';
        });
        gpx += '</trkseg></trk></gpx>';
        var blob = new Blob([gpx], { type: 'application/gpx+xml' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'track_gps_' + Date.now() + '.gpx';
        link.click();
    };

    // GeoJSON
    document.getElementById('btn-gps-geojson').onclick = function() {
        var geojson = { type: 'FeatureCollection', features: [{
            type: 'Feature',
            properties: { name: 'Track GPS', puntos: gs.trackCoords.length },
            geometry: { type: 'LineString', coordinates: gs.trackCoords.map(function(c) { return [c[1], c[0]]; }) }
        }]};
        var blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'track_gps_' + Date.now() + '.geojson';
        link.click();
    };

    // TXT
    document.getElementById('btn-gps-txt').onclick = function() {
        var txt = 'Latitud,Longitud\n';
        gs.trackCoords.forEach(function(c) {
            txt += c[0].toFixed(6) + ',' + c[1].toFixed(6) + '\n';
        });
        var blob = new Blob([txt], { type: 'text/plain' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'track_gps_' + Date.now() + '.csv';
        link.click();
    };

    // Limpiar
    document.getElementById('btn-gps-limpiar').onclick = function() {
        if (gs.marker) { map.removeLayer(gs.marker); gs.marker = null; }
        if (gs.pathLayer) { map.removeLayer(gs.pathLayer); gs.pathLayer = null; }
        gs.trackCoords = [];
        gs.active = false;
        var expDiv = document.getElementById('gps-export-btns');
        if (expDiv) expDiv.remove();
    };
}

// === DETECCIÓN CHROME MÓVIL (advertencia GPS) ===
(function() {
    var isChromeMobile = /Chrome/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
    var isEdgeMobile = /Edg/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);

    if (isChromeMobile && !isEdgeMobile) {
        console.log('[GPS] Detectado Chrome móvil - puede haber problemas de ubicación');
        console.log('%c⚠️ CHROME MÓVIL: Si el GPS no funciona bien, probá en Edge o desactivá "Vista de escritorio"', 'background: yellow; color: black; padding: 4px;');
    }
})();

// === INICIALIZAR BOTÓN GPS ===
function initGPSButton() {
    var btnGps = document.getElementById('btn-gps');
    if (btnGps) {
        btnGps.addEventListener('click', iniciarGPS);
    }
    initExportarGPS();
}
