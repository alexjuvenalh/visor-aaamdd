/**
 * util.js — Utilidades compartidas del Visor AAA Madre de Dios
 * 
 * Provee sanitize() y AppState para todos los módulos.
 * Carga: después de Leaflet, antes de cualquier módulo de app.
 */

/**
 * Sanitiza una cadena para uso seguro en HTML (previene XSS).
 * ÚNICA fuente de verdad — eliminada la duplicación anterior.
 */
function sanitize(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/**
 * AppState — Estado global encapsulado de la aplicación.
 * Reemplaza el uso disperso de window.* para variables de estado.
 * 
 * Compatibilidad: las propiedades se sincronizan con window.*
 * para scripts legacy (descargas.js, archivos.js, coordenadas.js).
 */
var AppState = {
    /** @type {L.Map} — Referencia al mapa Leaflet */
    map: null,

    /** Datos GeoJSON cargados */
    data: {
        faja_poligono: null,
        faja_hito: null,
        uso_temporal: null,
        rada_por_fuente: null,
        rada_por_derecho: { type: 'FeatureCollection', features: [] }
    },

    /** Capas Leaflet activas (creadas lazy, cacheadas) */
    layers: {
        faja: null,
        hito: null,
        uso: null,
        rada: null
    },

    /** Estado GPS */
    gps: {
        active: false,
        marker: null,
        watchId: null,
        trackCoords: [],
        pathLayer: null,
        precisionIndicator: null,
        ultimaPosicionBuena: null,
        reintentos: 0,
        maxReintentos: 10,
        intentosInicial: 0,
        maxIntentosInicial: 5,
        botonMiUbicacion: null
    },

    /** Capa de archivo subido (KML/GPX/GeoJSON) */
    fileLayer: null,

    /**
     * Sincroniza AppState.data → window.* para compatibilidad legacy.
     * Llama esto después de cargar datos.
     */
    syncToWindow: function() {
        for (var key in AppState.data) {
            if (AppState.data.hasOwnProperty(key)) {
                window[key] = AppState.data[key];
            }
        }
        window.map = AppState.map;
    }
};
