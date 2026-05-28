/**
 * Cargador dinámico de datos GeoJSON
 * 
 * Primero intenta desde GitHub (siempre actualizado), 
 * si falla (offline) usa los archivos locales.
 * 
 * Así la app Android NUNCA necesita rebuildear el APK
 * cuando se actualicen los datos — solo subir a GitHub.
 */

var GEOJSON_FILES = [
    { name: 'faja_poligono', url: 'visor/geojson/faja_poligono.js' },
    { name: 'faja_hito', url: 'visor/geojson/faja_hito.js' },
    { name: 'uso_temporal', url: 'visor/geojson/uso_temporal.js' },
    { name: 'rada_fuente', url: 'visor/geojson/rada_fuente.js' }
];

var GITHUB_BASE = 'https://raw.githubusercontent.com/alexjuvenalh/visor-aaamdd/master/';

function cargarScript(url) {
    return new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = url;
        s.onload = resolve;
        s.onerror = function() {
            reject(new Error('Error cargando: ' + url));
        };
        document.head.appendChild(s);
    });
}

function cargarDatos() {
    // Mostrar indicador de carga
    var mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.style.background = '#f5f5f5';
        mapDiv.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;font-family:sans-serif;">' +
            '<div style="font-size:40px;margin-bottom:10px;">🗺️</div>' +
            '<div style="font-size:16px;">Cargando datos...</div>' +
            '</div>';
    }

    var total = GEOJSON_FILES.length;
    var cargados = 0;

    return GEOJSON_FILES.reduce(function(promise, file) {
        return promise.then(function() {
            // Intentar desde GitHub primero
            return cargarScript(GITHUB_BASE + file.url)
                .then(function() {
                    cargados++;
                    console.log('✅ ' + file.name + ' desde GitHub');
                })
                .catch(function() {
                    // Fallback: archivo local
                    return cargarScript(file.url)
                        .then(function() {
                            cargados++;
                            console.log('✅ ' + file.name + ' desde local (fallback)');
                        })
                        .catch(function(err) {
                            console.error('❌ No se pudo cargar ' + file.name, err);
                        });
                });
        });
    }, Promise.resolve()).then(function() {
        // Mapear variables globales
        window.faja_poligono = window.faja_poligono || (typeof faja_poligono !== 'undefined' ? faja_poligono : null);
        window.faja_hito = window.faja_hito || (typeof faja_hito !== 'undefined' ? faja_hito : null);
        window.uso_temporal = window.uso_temporal || (typeof uso_temporal !== 'undefined' ? uso_temporal : null);
        window.rada_por_fuente = window.rada_por_fuente || (typeof rada_fuente !== 'undefined' ? rada_fuente : { type: 'FeatureCollection', features: [] });
        window.rada_por_derecho = { type: 'FeatureCollection', features: [] };

        console.log('');
        console.log('📊 Resumen de carga:');
        if (window.faja_poligono) console.log('   Faja Marginal: ' + window.faja_poligono.features.length + ' polígonos');
        if (window.faja_hito) console.log('   Hitos Faja: ' + window.faja_hito.features.length + ' puntos');
        if (window.uso_temporal) console.log('   Uso Temporal: ' + window.uso_temporal.features.length + ' polígonos');
        if (window.rada_por_fuente) console.log('   RADA Fuente: ' + window.rada_por_fuente.features.length + ' puntos');
        console.log('');

        // Limpiar indicador de carga
        if (mapDiv) {
            mapDiv.style.background = '';
            mapDiv.innerHTML = '';
        }

        // Disparar evento para que initMap() lo sepa
        window.dispatchEvent(new Event('datos-cargados'));
    });
}

// Iniciar carga ni bien se define el script
cargarDatos();
