/**
 * cargador-datos.js — Cargador dinámico de datos GeoJSON
 * 
 * FASE 1: 4 capas principales (eager) → dispara el mapa enseguida.
 * FASE 2: 9 capas base (background) → cargan sin bloquear.
 * 
 * GitHub primero (timeout 3s), local como fallback.
 *   • Con internet: GitHub responde → datos frescos sin recompilar APK.
 *   • Sin internet: timeout 3s → carga datos del APK (offline).
 *   • Web: GitHub CDN responde rápido (distribuido).
 * 
 * Río Principal y Río → lazy load al activar checkbox (jsmapa/index.js).
 */

var PRIMARY_FILES = [
    { name: 'faja_poligono',  varname: 'faja_poligono',    url: 'visor/geojson/faja_poligono.json' },
    { name: 'faja_hito',      varname: 'faja_hito',        url: 'visor/geojson/faja_hito.json' },
    { name: 'uso_temporal',   varname: 'uso_temporal',     url: 'visor/geojson/uso_temporal.json' },
    { name: 'rada_fuente',    varname: 'rada_por_fuente',  url: 'visor/geojson/rada_fuente.json' }
];

var BASE_FILES = [
    { name: 'aaa',            varname: 'aaa',              url: 'visor/geojson/aaa.json' },
    { name: 'ala',            varname: 'ala',              url: 'visor/geojson/ala.json' },
    { name: 'departamento',   varname: 'departamento',     url: 'visor/geojson/departamento.json' },
    { name: 'provincia',      varname: 'provincia',        url: 'visor/geojson/provincia.json' },
    { name: 'distrito',       varname: 'distrito',         url: 'visor/geojson/distrito.json' },
    { name: 'carta',          varname: 'carta',            url: 'visor/geojson/carta.json' },
    { name: 'lago_laguna',    varname: 'lago_laguna',      url: 'visor/geojson/lago_laguna.json' },
    { name: 'cuenca_transf',  varname: 'cuenca_transfronteriza', url: 'visor/geojson/cuenca_transfronteriza.json' },
    { name: 'unidad_hidro',   varname: 'unidad_hidrografica', url: 'visor/geojson/unidad_hidrografica.json' }
];

var GITHUB_BASE = 'https://raw.githubusercontent.com/alexjuvenalh/visor-aaamdd/master/';

/**
 * Carga un archivo: GitHub primero (timeout 3s), local como fallback.
 */
function cargarArchivo(file) {
    var localUrl = file.url;
    var githubUrl = GITHUB_BASE + file.url;

    function fetchJson(url, origen) {
        return fetch(url).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json().then(function(data) {
                return { data: data, origen: origen };
            });
        });
    }

    // GitHub primero con timeout de 3s, local como fallback
    var githubWithTimeout = new Promise(function(resolve, reject) {
        var timeout = setTimeout(function() {
            reject(new Error('timeout'));
        }, 3000);
        
        fetchJson(githubUrl, 'GitHub').then(function(result) {
            clearTimeout(timeout);
            resolve(result);
        }).catch(function(err) {
            clearTimeout(timeout);
            reject(err);
        });
    });

    return githubWithTimeout.catch(function() {
        return fetchJson(localUrl, 'local');
    })
    .then(function(result) {
        AppState.data[file.varname] = result.data;
        window[file.varname] = result.data;
        console.log('✅ ' + file.name + ' desde ' + result.origen + ' (' + (result.data.features ? result.data.features.length : 0) + ' features)');
        return { name: file.name, ok: true };
    })
    .catch(function(err) {
        console.error('❌ No se pudo cargar ' + file.name, err);
        return { name: file.name, ok: false };
    });
}

function cargarDatos() {
    var mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.style.background = '#f5f5f5';
        mapDiv.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;font-family:sans-serif;">' +
            '<div style="font-size:40px;margin-bottom:10px;">🗺️</div>' +
            '<div style="font-size:16px;">Cargando datos...</div></div>';
    }

    var t0 = performance.now();

    // FASE 1: capas principales → mostrar mapa enseguida
    Promise.all(PRIMARY_FILES.map(cargarArchivo))
        .then(function(resultados) {
            var exitos = resultados.filter(function(r) { return r.ok; }).length;
            var fallos = resultados.filter(function(r) { return !r.ok; }).length;

            AppState.data.rada_por_derecho = AppState.data.rada_por_derecho || { type: 'FeatureCollection', features: [] };
            window.rada_por_derecho = AppState.data.rada_por_derecho;

            var t1 = performance.now();
            var tiempo = ((t1 - t0) / 1000).toFixed(1);

            console.log('📊 Capas principales (' + tiempo + 's):');
            PRIMARY_FILES.forEach(function(f) {
                var d = AppState.data[f.varname];
                if (d && d.features) console.log('   ' + f.name + ': ' + d.features.length);
            });

            if (mapDiv) { mapDiv.style.background = ''; mapDiv.innerHTML = ''; }

            // Disparar el mapa — YA, sin esperar capas base
            window.dispatchEvent(new Event('datos-cargados'));

            // FASE 2: capas base en segundo plano (no bloquean)
            Promise.all(BASE_FILES.map(cargarArchivo))
                .then(function(resBase) {
                    var t2 = performance.now();
                    console.log('📊 Capas base (' + ((t2 - t1) / 1000).toFixed(1) + 's):');
                    BASE_FILES.forEach(function(f) {
                        var d = AppState.data[f.varname];
                        if (d && d.features) console.log('   ' + f.name + ': ' + d.features.length);
                    });
                    console.log('   Río Principal + Ríos → carga bajo demanda');
                    console.log('✅ Todas las capas listas (' + ((t2 - t0) / 1000).toFixed(1) + 's total)');
                });
        });
}

cargarDatos();
