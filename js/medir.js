/**
 * medir.js — Herramienta de medicion de distancias
 * 
 * Similar a la regla de Google Earth: clic en el mapa para 
 * agregar puntos, clic derecho para terminar.
 * 
 * Info de distancia: tarjeta flotante en el mapa (no en el panel).
 * 
 * Depende de: util.js (AppState), Leaflet (L)
 */

(function() {
    'use strict';

    var activo = false;
    var puntos = [];              // [{latlng: L.LatLng, marker: L.CircleMarker}]
    var polyline = null;          // L.Polyline
    var tooltipFijo = null;       // L.Tooltip (fijo en ultimo punto, muestra total)
    var tempLine = null;          // linea temporal mouse→ultimo punto
    var infoCard = null;          // tarjeta flotante en el mapa con distancias
    var mapClickHandler = null;
    var keydownHandler = null;
    var dblclickHandler = null;
    var mousemoveHandler = null;
    var contextmenuHandler = null;

    /**
     * Formatea distancia: < 1000 m → "567 m", >= 1000 → "12.3 km"
     */
    function formatDist(metros) {
        if (metros < 1000) {
            return Math.round(metros) + ' m';
        }
        return (metros / 1000).toFixed(2) + ' km';
    }

    /**
     * Calcula distancia total entre todos los puntos.
     */
    function calcDistanciaTotal() {
        var total = 0;
        for (var i = 1; i < puntos.length; i++) {
            total += puntos[i-1].latlng.distanceTo(puntos[i].latlng);
        }
        return total;
    }

    /**
     * Crea o actualiza la tarjeta flotante de info en el mapa.
     */
    function actualizarInfoCard() {
        if (!infoCard) {
            infoCard = document.createElement('div');
            infoCard.id = 'medir-flotante';
            infoCard.style.cssText =
                'position:absolute;bottom:30px;left:50%;transform:translateX(-50%);' +
                'background:rgba(255,255,255,0.92);padding:8px 16px;border-radius:8px;' +
                'box-shadow:0 2px 12px rgba(0,0,0,0.25);font-size:13px;font-family:sans-serif;' +
                'z-index:1000;white-space:nowrap;pointer-events:none;' +
                'border:1px solid rgba(0,0,0,0.1);';
            var mapDiv = document.getElementById('map');
            if (mapDiv) mapDiv.appendChild(infoCard);
        }

        if (puntos.length === 0) {
            infoCard.innerHTML = '📏 <b>Clic</b> para iniciar — <b>Clic derecho</b> para terminar';
            infoCard.style.display = '';
        } else if (puntos.length === 1) {
            infoCard.innerHTML = '📏 1 punto — seguí haciendo clic';
            infoCard.style.display = '';
        } else {
            var total = calcDistanciaTotal();
            var ultimo = puntos[puntos.length-2].latlng.distanceTo(puntos[puntos.length-1].latlng);
            infoCard.innerHTML =
                '📏 Total: <b>' + formatDist(total) + '</b>' +
                ' &nbsp;|&nbsp; Tramo: ' + formatDist(ultimo) +
                ' &nbsp;|&nbsp; Puntos: ' + puntos.length;
            infoCard.style.display = '';
        }
    }

    /**
     * Oculta y remueve la tarjeta flotante.
     */
    function removerInfoCard() {
        if (infoCard) {
            if (infoCard.parentNode) infoCard.parentNode.removeChild(infoCard);
            infoCard = null;
        }
    }

    /**
     * Redibuja la polyline con todos los puntos.
     */
    function redibujar() {
        var map = AppState.map;
        if (!map) return;

        if (polyline) { map.removeLayer(polyline); polyline = null; }

        if (puntos.length < 2) return;

        var coords = puntos.map(function(p) { return p.latlng; });
        polyline = L.polyline(coords, {
            color: '#2196F3',
            weight: 3,
            dashArray: '8, 6',
            opacity: 0.9
        }).addTo(map);
    }

    /**
     * Agrega un punto en la posicion del clic.
     */
    function agregarPunto(latlng) {
        var map = AppState.map;
        if (!map) return;

        var marker = L.circleMarker(latlng, {
            radius: 5,
            color: '#1565C0',
            fillColor: '#2196F3',
            fillOpacity: 1,
            weight: 2
        }).addTo(map);

        puntos.push({ latlng: latlng, marker: marker });
        redibujar();

        // Tooltip fijo en el ultimo punto con distancia acumulada
        if (puntos.length >= 2) {
            if (tooltipFijo) { map.removeLayer(tooltipFijo); }
            var total = calcDistanciaTotal();
            tooltipFijo = L.tooltip({
                permanent: true,
                direction: 'top',
                className: 'medir-tooltip'
            })
            .setLatLng(latlng)
            .setContent('<b>' + formatDist(total) + '</b>')
            .addTo(map);
        }

        actualizarInfoCard();
    }

    /**
     * Activa el modo medicion.
     */
    function activar() {
        var map = AppState.map;
        if (!map) return;

        // Limpiar medicion anterior (marcadores, lineas)
        puntos.forEach(function(p) { map.removeLayer(p.marker); });
        puntos = [];
        if (polyline) { map.removeLayer(polyline); polyline = null; }
        if (tooltipFijo) { map.removeLayer(tooltipFijo); tooltipFijo = null; }
        if (tempLine) { map.removeLayer(tempLine); tempLine = null; }

        activo = true;

        // Desactivar zoom por doble clic mientras medimos
        map.doubleClickZoom.disable();

        // Cambiar cursor
        map.getContainer().style.cursor = 'crosshair';

        // Handler de clic en el mapa → agrega punto
        mapClickHandler = function(e) {
            if (!activo) return;
            agregarPunto(e.latlng);
        };
        map.on('click', mapClickHandler);

        // Handler de mouse move → linea temporal punteada
        mousemoveHandler = function(e) {
            if (!activo) return;
            var ultimo = puntos.length > 0 ? puntos[puntos.length-1].latlng : null;
            if (ultimo) {
                if (tempLine) { map.removeLayer(tempLine); }
                tempLine = L.polyline([ultimo, e.latlng], {
                    color: '#2196F3',
                    weight: 2,
                    dashArray: '4, 8',
                    opacity: 0.6
                }).addTo(map);
            }
        };
        map.on('mousemove', mousemoveHandler);

        // Doble clic = terminar (secundario)
        dblclickHandler = function(e) {
            if (!activo) return;
            L.DomEvent.stop(e);
            // Remover punto duplicado del 2do click del doble clic
            if (puntos.length > 0) {
                var duplicado = puntos.pop();
                map.removeLayer(duplicado.marker);
            }
            redibujar();
            if (puntos.length >= 2 && tooltipFijo) {
                map.removeLayer(tooltipFijo);
                tooltipFijo = L.tooltip({
                    permanent: true, direction: 'top', className: 'medir-tooltip'
                })
                .setLatLng(puntos[puntos.length-1].latlng)
                .setContent('<b>' + formatDist(calcDistanciaTotal()) + '</b>')
                .addTo(map);
            }
            actualizarInfoCard();
            desactivar(true);
        };
        map.on('dblclick', dblclickHandler);

        // Clic derecho = terminar (primario — mas confiable)
        contextmenuHandler = function(e) {
            if (!activo) return;
            L.DomEvent.stop(e);
            desactivar(true);
        };
        map.on('contextmenu', contextmenuHandler);

        // Tecla Escape = cancelar
        keydownHandler = function(e) {
            if (e.key === 'Escape' && activo) {
                desactivar(false);
            }
        };
        document.addEventListener('keydown', keydownHandler);

        // Mostrar tarjeta flotante
        actualizarInfoCard();

        // Actualizar boton
        var btn = document.getElementById('btn-medir');
        if (btn) {
            btn.textContent = '📏 Midiendo...';
            btn.style.background = '#FF9800';
        }

        console.log('[Medir] Modo medicion activado (clic = punto, clic derecho = terminar)');
    }

    /**
     * Desactiva el modo medicion.
     * @param {boolean} mantener - si true, mantiene las lineas visibles
     */
    function desactivar(mantener) {
        var map = AppState.map;
        if (!map) return;

        activo = false;

        // Restaurar cursor
        map.getContainer().style.cursor = '';

        // Reactivar zoom por doble clic
        map.doubleClickZoom.enable();

        // Quitar handlers
        if (mapClickHandler)    { map.off('click', mapClickHandler); mapClickHandler = null; }
        if (mousemoveHandler)   { map.off('mousemove', mousemoveHandler); mousemoveHandler = null; }
        if (dblclickHandler)    { map.off('dblclick', dblclickHandler); dblclickHandler = null; }
        if (contextmenuHandler) { map.off('contextmenu', contextmenuHandler); contextmenuHandler = null; }
        if (keydownHandler)     { document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }

        // Quitar linea temporal
        if (tempLine) { map.removeLayer(tempLine); tempLine = null; }

        if (!mantener) {
            limpiar();
        } else {
            // Mantener lineas y tooltip fijo
            actualizarInfoCard();
            console.log('[Medir] Medicion finalizada. Distancia: ' + formatDist(calcDistanciaTotal()));
        }

        // Restaurar boton
        var btn = document.getElementById('btn-medir');
        if (btn) {
            btn.textContent = '📏';
            btn.style.background = '#2196F3';
        }
    }

    /**
     * Limpia todas las lineas y puntos.
     */
    function limpiar() {
        var map = AppState.map;
        if (!map) return;

        puntos.forEach(function(p) { map.removeLayer(p.marker); });
        puntos = [];
        if (polyline)    { map.removeLayer(polyline); polyline = null; }
        if (tooltipFijo) { map.removeLayer(tooltipFijo); tooltipFijo = null; }
        if (tempLine)    { map.removeLayer(tempLine); tempLine = null; }
        removerInfoCard();
    }

    /**
     * Toggle: activa/desactiva el modo medicion.
     */
    function toggleMedir() {
        if (activo) {
            desactivar(true);
        } else {
            activar();
        }
    }

    // === INICIALIZAR BOTONES ===
    function initMedir() {
        var btnMedir = document.getElementById('btn-medir');
        if (btnMedir) {
            btnMedir.addEventListener('click', toggleMedir);
        }

        var btnLimpiar = document.getElementById('btn-limpiar-medir');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', function() {
                if (activo) desactivar(false);
                else limpiar();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMedir);
    } else {
        initMedir();
    }

})();
