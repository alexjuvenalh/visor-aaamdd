/**
 * cargador-datos.js — Cargador dinámico de datos GeoJSON
 * 
 * Carga en PARALELO con Promise.all().
 * GitHub primero, local como fallback (offline).
 * 
 * v4: +6 capas base livianas (eager). Río y Río Principal
 *     se cargan lazy al activar su checkbox (jsmapa/index.js).
 */

var GEOJSON_FILES = [
    // Capas principales (existentes)
    { name: 'faja_poligono',  varname: 'faja_poligono',    url: 'visor/geojson/faja_poligono.json' },
    { name: 'faja_hito',      varname: 'faja_hito',        url: 'visor/geojson/faja_hito.json' },
    { name: 'uso_temporal',   varname: 'uso_temporal',     url: 'visor/geojson/uso_temporal.json' },
    { name: 'rada_fuente',    varname: 'rada_por_fuente',  url: 'visor/geojson/rada_fuente.json' },
    // Capas base livianas (eager — <1 MB c/u)
    { name: 'aaa',            varname: 'aaa',              url: 'visor/geojson/aaa.json' },
    { name: 'ala',            varname: 'ala',              url: 'visor/geojson/ala.json' },
    { name: 'departamento',   varname: 'departamento',     url: 'visor/geojson/departamento.json' },
    { name: 'provincia',      varname: 'provincia',        url: 'visor/geojson/provincia.json' },
    { name: 'distrito',       varname: 'distrito',         url: 'visor/geojson/distrito.json' },
    { name: 'carta',          varname: 'carta',            url: 'visor/geojson/carta.json' },
    // Capas base nuevas — agua y territorio
    { name: 'lago_laguna',   varname: 'lago_laguna',     url: 'visor/geojson/lago_laguna.json' },
    { name: 'cuenca_transf', varname: 'cuenca_transfronteriza', url: 'visor/geojson/cuenca_transfronteriza.json' },
    { name: 'unidad_hidro',  varname: 'unidad_hidrografica', url: 'visor/geojson/unidad_hidrografica.json' }
    // rio_principal (2.5 MB) y rio (10.2 MB) → lazy load en jsmapa/index.js
];

var GITHUB_BASE = 'https://raw.githubusercontent.com/alexjuvenalh/visor-aaamdd/master/';

function cargarArchivo(file) {
    return fetch(GITHUB_BASE + file.url)
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function(data) {
            AppState.data[file.varname] = data;
            window[file.varname] = data;
            console.log('✅ ' + file.name + ' desde GitHub (' + (data.features ? data.features.length : 0) + ' features)');
            return { name: file.name, ok: true };
        })
        .catch(function() {
            return fetch(file.url)
                .then(function(r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function(data) {
                    AppState.data[file.varname] = data;
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
    var mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.style.background = '#f5f5f5';
        mapDiv.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#666;font-family:sans-serif;">' +
            '<div style="font-size:40px;margin-bottom:10px;">🗺️</div>' +
            '<div style="font-size:16px;">Cargando datos...</div></div>';
    }

    var t0 = performance.now();

    return Promise.all(GEOJSON_FILES.map(cargarArchivo))
        .then(function(resultados) {
            var exitos = resultados.filter(function(r) { return r.ok; }).length;
            var fallos = resultados.filter(function(r) { return !r.ok; }).length;

            AppState.data.rada_por_derecho = AppState.data.rada_por_derecho || { type: 'FeatureCollection', features: [] };
            window.rada_por_derecho = AppState.data.rada_por_derecho;

            var t1 = performance.now();
            var tiempo = ((t1 - t0) / 1000).toFixed(1);

            console.log('');
            console.log('📊 Resumen de carga (' + tiempo + 's):');
            GEOJSON_FILES.forEach(function(f) {
                var d = AppState.data[f.varname];
                if (d && d.features) console.log('   ' + f.name + ': ' + d.features.length);
            });
            if (fallos > 0) console.warn('   ⚠️ ' + fallos + ' archivo(s) no se pudieron cargar');
            console.log('   Río Principal + Ríos → carga bajo demanda');
            console.log('');

            if (mapDiv) { mapDiv.style.background = ''; mapDiv.innerHTML = ''; }

            window.dispatchEvent(new Event('datos-cargados'));
        });
}

cargarDatos();
