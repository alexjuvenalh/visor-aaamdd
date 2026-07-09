/**
 * search.js — Módulo de búsqueda del Visor AAA Madre de Dios
 * 
 * Búsqueda unificada sobre todas las capas (4 principales + 8 base).
 * 
 * v2: Agregadas capas base (aaa, ala, departamento, provincia, distrito,
 *     carta, rio_principal, rio). Río y Río Principal se buscan solo
 *     si ya fueron cargados (lazy load).
 */

function buscarEnCampo(prop, campo, texto) {
    if (!prop || !prop[campo]) return false;
    return String(prop[campo]).toUpperCase().includes(texto);
}

function buscarPorResolucion() {
    var inputBuscar = document.getElementById('buscar-input');
    if (!inputBuscar) return;

    var texto = inputBuscar.value.trim().toUpperCase();
    if (!texto) return;

    console.log('[Busqueda] Buscando: ' + texto);

    var resultados = [];
    var data = AppState.data;

    // Helper: buscar en una capa
    function buscarEnCapa(nombreCapa, geojson, campos) {
        if (!geojson || !geojson.features) return;
        geojson.features.forEach(function(f) {
            var p = f.properties;
            if (!p) return;
            for (var i = 0; i < campos.length; i++) {
                if (buscarEnCampo(p, campos[i], texto)) {
                    resultados.push({ tipo: nombreCapa, data: f });
                    return;
                }
            }
        });
    }

    // Capas principales
    buscarEnCapa('Faja Marginal', data.faja_poligono, ['numero_resolucion', 'cut', 'resumen']);
    buscarEnCapa('Hito', data.faja_hito, ['numero_resolucion', 'cut', 'resumen']);
    buscarEnCapa('Uso Temporal', data.uso_temporal, ['numero_resolucion', 'cut', 'nombre_o_razon_social', 'numero_documento', 'resumen']);
    buscarEnCapa('RADA Fuente', data.rada_por_fuente, ['resolucion', 'cur', 'usuario', 'documento']);

    // Capas base
    buscarEnCapa('AAA', data.aaa, ['nombre_aaa', 'cod_aaa']);
    buscarEnCapa('ALA', data.ala, ['nombre_ala', 'codigo_ala']);
    buscarEnCapa('Departamento', data.departamento, ['nombre_departamento', 'codigo_departamento']);
    buscarEnCapa('Provincia', data.provincia, ['nombre_provincia', 'codigo_provincia']);
    buscarEnCapa('Distrito', data.distrito, ['nombre_distrito', 'nombre_provincia', 'nombre_departamento']);
    buscarEnCapa('Carta IGN', data.carta, ['carta', 'fila', 'columna', 'zona']);
    buscarEnCapa('Lagos / Lagunas', data.lago_laguna, ['nombre', 'cod_laguna']);
    buscarEnCapa('Cuenca Transf.', data.cuenca_transfronteriza, ['nombre', 'cod_cuenca']);
    buscarEnCapa('Unidad Hidrog.', data.unidad_hidrografica, ['nombre']);
    // Río y Río Principal solo si ya fueron cargados (lazy)
    if (data.rio_principal) buscarEnCapa('Rio Principal', data.rio_principal, ['nombre_rio', 'codigo_rio']);
    if (data.rio) buscarEnCapa('Rio', data.rio, ['nombre_rio', 'codigo_rio']);

    console.log('[Busqueda] Resultados: ' + resultados.length);

    if (resultados.length === 0) {
        alert('No se encontro ningun resultado para: ' + inputBuscar.value);
        return;
    }

    var msg = 'Se encontraron ' + resultados.length + ' resultado(s):\n';
    var counts = {};
    resultados.forEach(function(r) { counts[r.tipo] = (counts[r.tipo] || 0) + 1; });
    for (var tipo in counts) { msg += '- ' + tipo + ': ' + counts[tipo] + '\n'; }
    console.log('[Busqueda] ' + msg);

    // Ir al primer resultado
    var feature = resultados[0].data;
    var layer = L.geoJson(feature);
    var bounds = layer.getBounds();
    var mapa = AppState.map;
    if (!mapa) { alert('Mapa no inicializado'); return; }
    if (bounds.isValid()) { mapa.fitBounds(bounds, { padding: [50, 50] }); }
    else if (feature.geometry.type === 'Point') { var c = feature.geometry.coordinates; mapa.setView([c[1], c[0]], 15); }
}

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
