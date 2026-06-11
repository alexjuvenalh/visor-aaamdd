/**
 * Cargador dinámico de datos GeoJSON (optimizado)
 * 
 * Usa fetch() + .json() (JSON.parse nativo, 10-20x más rápido
 * que cargar como <script> con var = {...}).
 * 
 * Carga en PARALELO con Promise.all() en vez de secuencial.
 * 
 * Primero intenta desde GitHub (siempre actualizado), 
 * si falla (offline) usa los archivos locales .json.
 * 
 * Así la app Android NUNCA necesita rebuildear el APK
 * cuando se actualicen los datos — solo subir a GitHub.
 */

var GEOJSON_FILES = [
    { name: 'faja_poligono',  varname: 'faja_poligono',    url: 'visor/geojson/faja_poligono.json' },
    { name: 'faja_hito',      varname: 'faja_hito',        url: 'visor/geojson/faja_hito.json' },
    { name: 'uso_temporal',   varname: 'uso_temporal',     url: 'visor/geojson/uso_temporal.json' },
    { name: 'rada_fuente',    varname: 'rada_por_fuente',  url: 'visor/geojson/rada_fuente.json' }
];

var GITHUB_BASE = 'https://raw.githubusercontent.com/alexjuvenalh/visor-aaamdd/master/';

/**
 * Carga un archivo JSON usando fetch().
 * Intenta GitHub primero, local como fallback.
 * NUNCA rechaza — siempre resuelve con { name, ok }.
 */
function cargarArchivo(file) {
    return fetch(GITHUB_BASE + file.url)
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function(data) {
            window[file.varname] = data;
            console.log('✅ ' + file.name + ' desde GitHub (' + (data.features ? data.features.length : 0) + ' features)');
            return { name: file.name, ok: true };
        })
        .catch(function() {
            // Fallback: archivo local
            return fetch(file.url)
                .then(function(r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function(data) {
                    window[file.varname] = data;
                    console.log('✅ ' + file.name + ' desde local (' + (data.features ? data.features.length : 0) + ' features)');
                    return { name: file.name, ok: true };
                })
                .catch(function(err) {
                    console.error('❌ No se pudo cargar ' + file.name, err);
                    return { name: file.name, ok: false };
                });
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

    var t0 = performance.now();

    // Carga PARALELA: todos los archivos al mismo tiempo
    return Promise.all(GEOJSON_FILES.map(cargarArchivo))
        .then(function(resultados) {
            var exitos = resultados.filter(function(r) { return r.ok; }).length;
            var fallos = resultados.filter(function(r) { return !r.ok; }).length;

            // Asegurar que rada_por_derecho existe (aunque no tenga datos aún)
            window.rada_por_derecho = window.rada_por_derecho || { type: 'FeatureCollection', features: [] };

            var t1 = performance.now();
            var tiempo = ((t1 - t0) / 1000).toFixed(1);

            console.log('');
            console.log('📊 Resumen de carga (' + tiempo + 's):');
            if (window.faja_poligono) console.log('   Faja Marginal: ' + window.faja_poligono.features.length + ' polígonos');
            if (window.faja_hito) console.log('   Hitos Faja: ' + window.faja_hito.features.length + ' puntos');
            if (window.uso_temporal) console.log('   Uso Temporal: ' + window.uso_temporal.features.length + ' polígonos');
            if (window.rada_por_fuente) console.log('   RADA Fuente: ' + window.rada_por_fuente.features.length + ' puntos');
            if (fallos > 0) console.warn('   ⚠️ ' + fallos + ' archivo(s) no se pudieron cargar');
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
