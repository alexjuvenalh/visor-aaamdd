/**
 * search.js — Módulo de búsqueda del Visor AAA Madre de Dios
 * 
 * Extraído de jsmapa/index.js (líneas 383-489).
 * Búsqueda unificada sobre todas las capas: Faja, Hitos, Uso Temporal, RADA.
 * 
 * Depende de: util.js (AppState, sanitize), Leaflet (L)
 */

/**
 * Busca un texto en un campo específico de las properties (case-insensitive).
 */
function buscarEnCampo(prop, campo, texto) {
    if (!prop || !prop[campo]) return false;
    return String(prop[campo]).toUpperCase().includes(texto);
}

/**
 * Búsqueda unificada sobre las 4 capas.
 * Escanea todas las features y navega al primer resultado.
 */
function buscarPorResolucion() {
    var inputBuscar = document.getElementById('buscar-input');
    if (!inputBuscar) return;

    var texto = inputBuscar.value.trim().toUpperCase();
    if (!texto) return;

    console.log('[Búsqueda] Buscando: ' + texto);

    var resultados = [];
    var data = AppState.data;

    // 1. Faja Marginal — numero_resolucion, cut, resumen
    if (data.faja_poligono && data.faja_poligono.features) {
        data.faja_poligono.features.forEach(function(f) {
            var p = f.properties;
            if (p && (
                buscarEnCampo(p, 'numero_resolucion', texto) ||
                buscarEnCampo(p, 'cut', texto) ||
                buscarEnCampo(p, 'resumen', texto)
            )) {
                resultados.push({ tipo: 'Faja Marginal', data: f });
            }
        });
    }

    // 2. Hitos — numero_resolucion, cut, resumen
    if (data.faja_hito && data.faja_hito.features) {
        data.faja_hito.features.forEach(function(f) {
            var p = f.properties;
            if (p && (
                buscarEnCampo(p, 'numero_resolucion', texto) ||
                buscarEnCampo(p, 'cut', texto) ||
                buscarEnCampo(p, 'resumen', texto)
            )) {
                resultados.push({ tipo: 'Hito', data: f });
            }
        });
    }

    // 3. Uso Temporal — numero_resolucion, cut, nombre_o_razon_social, numero_documento, resumen
    if (data.uso_temporal && data.uso_temporal.features) {
        data.uso_temporal.features.forEach(function(f) {
            var p = f.properties;
            if (p && (
                buscarEnCampo(p, 'numero_resolucion', texto) ||
                buscarEnCampo(p, 'cut', texto) ||
                buscarEnCampo(p, 'nombre_o_razon_social', texto) ||
                buscarEnCampo(p, 'numero_documento', texto) ||
                buscarEnCampo(p, 'resumen', texto)
            )) {
                resultados.push({ tipo: 'Uso Temporal', data: f });
            }
        });
    }

    // 4. RADA Fuente — resolucion, cur, usuario, documento
    if (data.rada_por_fuente && data.rada_por_fuente.features) {
        data.rada_por_fuente.features.forEach(function(f) {
            var p = f.properties;
            if (p && (
                buscarEnCampo(p, 'resolucion', texto) ||
                buscarEnCampo(p, 'cur', texto) ||
                buscarEnCampo(p, 'usuario', texto) ||
                buscarEnCampo(p, 'documento', texto)
            )) {
                resultados.push({ tipo: 'RADA Fuente', data: f });
            }
        });
    }

    console.log('[Búsqueda] Resultados encontrados: ' + resultados.length);

    if (resultados.length === 0) {
        alert('No se encontró ningún resultado para: ' + inputBuscar.value);
        return;
    }

    // Mostrar resumen en consola
    var msg = 'Se encontraron ' + resultados.length + ' resultado(s):\n';
    var counts = { 'Faja Marginal': 0, 'Hito': 0, 'Uso Temporal': 0, 'RADA Fuente': 0 };
    resultados.forEach(function(r) { counts[r.tipo]++; });
    for (var tipo in counts) {
        if (counts[tipo] > 0) msg += '- ' + tipo + ': ' + counts[tipo] + '\n';
    }
    console.log('[Búsqueda] ' + msg);

    // Ir al primer resultado
    var feature = resultados[0].data;
    var layer = L.geoJson(feature);
    var bounds = layer.getBounds();
    var mapa = AppState.map;
    if (!mapa) { alert('Mapa no inicializado'); return; }
    if (bounds.isValid()) { mapa.fitBounds(bounds, { padding: [50, 50] }); }
    else if (feature.geometry.type === 'Point') { var c = feature.geometry.coordinates; mapa.setView([c[1], c[0]], 15); }
}

/**
 * Inicializa el input de búsqueda y el botón.
 */
function initSearch() {
    var btnBuscar = document.getElementById('btn-buscar');
    var inputBuscar = document.getElementById('buscar-input');
    if (btnBuscar && inputBuscar) {
        btnBuscar.addEventListener('click', buscarPorResolucion);
        inputBuscar.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') buscarPorResolucion();
        });
    }
}
