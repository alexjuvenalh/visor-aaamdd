/**
 * medir.js — Herramienta de medicion de distancias
 * 
 * Similar a la regla de Google Earth: clic en el mapa para 
 * agregar puntos, muestra distancia acumulada en tiempo real.
 * 
 * Depende de: util.js (AppState), Leaflet (L)
 */

(function() {
    'use strict';

    var activo = false;
    var puntos = [];           // [{latlng: L.LatLng, marker: L.CircleMarker}]
    var polyline = null;       // L.Polyline
    var tooltipFijo = null;    // L.Tooltip (fijo en ultimo punto, muestra total)
    var tempLine = null;       // linea temporal mouse→ultimo punto
    var mapClickHandler = null;
    var keydownHandler = null; // referencia para cleanup
    var dblclickHandler = null;// referencia para cleanup
    var mousemoveHandler = null;// referencia para cleanup

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
     * Actualiza el texto de distancia en el panel.
     */
    function actualizarInfo() {
        var info = document.getElementById('medir-info');
        if (!info) return;
        if (puntos.length < 2) {
            info.textContent = 'Clic en el mapa para empezar';
            return;
        }
        var total = calcDistanciaTotal();
        var ultimo = puntos.length >= 2
            ? puntos[puntos.length-2].latlng.distanceTo(puntos[puntos.length-1].latlng)
            : 0;

        info.innerHTML = 'Total: <b>' + formatDist(total) + '</b>';
        if (puntos.length >= 2) {
            info.innerHTML += ' | Tramo: ' + formatDist(ultimo);
        }
        info.innerHTML += ' | Puntos: ' + puntos.length;
    }

    /**
     * Redibuja la polyline con todos los puntos.
     */
    function redibujar() {
        var map = AppState.map;
        if (!map) return;

        // Limpiar capa anterior
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

        // Mover tooltip fijo al ultimo punto
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

        actualizarInfo();
    }

    /**
     * Activa el modo medicion.
     */
    function activar() {
        var map = AppState.map;
        if (!map) return;

        activo = true;
        puntos = [];
        if (polyline) { map.removeLayer(polyline); polyline = null; }
        if (tooltipFijo) { map.removeLayer(tooltipFijo); tooltipFijo = null; }

        // Desactivar zoom por doble clic mientras medimos
        // para que el dblclick siempre termine la medicion
        map.doubleClickZoom.disable();

        // Cambiar cursor
        map.getContainer().style.cursor = 'crosshair';

        // Handler de clic en el mapa
        mapClickHandler = function(e) {
            agregarPunto(e.latlng);
        };
        map.on('click', mapClickHandler);

        // Handler de mouse move: solo linea temporal (sin tooltip flotante
        // que tape la vista — la distancia se ve en el panel medir-info)
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

        // Doble clic = terminar.
        // El doble clic dispara click+click+dblclick; los 2 clicks agregan
        // 2 puntos en el mismo lugar. Removemos el duplicado y terminamos.
        dblclickHandler = function(e) {
            if (!activo) return;
            L.DomEvent.stop(e);
            // Remover el punto duplicado del 2do click
            if (puntos.length > 0) {
                var duplicado = puntos.pop();
                map.removeLayer(duplicado.marker);
            }
            // Actualizar polyline sin el duplicado
            redibujar();
            // Mover tooltip fijo al ultimo punto real
            if (puntos.length >= 2) {
                if (tooltipFijo) { map.removeLayer(tooltipFijo); }
                var ultimo = puntos[puntos.length-1].latlng;
                tooltipFijo = L.tooltip({
                    permanent: true,
                    direction: 'top',
                    className: 'medir-tooltip'
                })
                .setLatLng(ultimo)
                .setContent('<b>' + formatDist(calcDistanciaTotal()) + '</b>')
                .addTo(map);
            }
            actualizarInfo();
            desactivar(true);
        };
        map.on('dblclick', dblclickHandler);

        // Tecla Escape = cancelar
        keydownHandler = function(e) {
            if (e.key === 'Escape' && activo) {
                desactivar(false);
            }
        };
        document.addEventListener('keydown', keydownHandler);

        console.log('[Medir] Modo medicion activado');
        actualizarInfo();

        // Actualizar boton
        var btn = document.getElementById('btn-medir');
        if (btn) {
            btn.textContent = '📏 Midiendo...';
            btn.style.background = '#FF9800';
        }
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
        if (mapClickHandler) { map.off('click', mapClickHandler); mapClickHandler = null; }
        if (mousemoveHandler) { map.off('mousemove', mousemoveHandler); mousemoveHandler = null; }
        if (dblclickHandler) { map.off('dblclick', dblclickHandler); dblclickHandler = null; }
        if (keydownHandler) { document.removeEventListener('keydown', keydownHandler); keydownHandler = null; }

        // Quitar linea temporal
        if (tempLine) { map.removeLayer(tempLine); tempLine = null; }

        if (!mantener) {
            // Limpiar todo
            limpiar();
        } else {
            // Mantener lineas, quitar tooltips excepto el fijo
            console.log('[Medir] Medicion finalizada. Distancia: ' + formatDist(calcDistanciaTotal()));
        }

        // Restaurar boton
        var btn = document.getElementById('btn-medir');
        if (btn) {
            btn.textContent = '📏';
            btn.style.background = '#2196F3';
        }

        actualizarInfo();
    }

    /**
     * Limpia todas las lineas y puntos.
     */
    function limpiar() {
        var map = AppState.map;
        if (!map) return;

        puntos.forEach(function(p) { map.removeLayer(p.marker); });
        puntos = [];
        if (polyline) { map.removeLayer(polyline); polyline = null; }
        if (tooltipFijo) { map.removeLayer(tooltipFijo); tooltipFijo = null; }
        if (tempLine) { map.removeLayer(tempLine); tempLine = null; }

        actualizarInfo();
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
