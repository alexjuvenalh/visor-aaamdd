/**
 * Búsqueda por coordenadas UTM WGS84 Zona 19 Sur
 * Convierte UTM → Lat/Lng y navega el mapa a la ubicación.
 * 
 * Usa proj4js para la transformación.
 * Depende de: proj4 (CDN), window.map (jsmapa/index.js)
 */

(function() {
    'use strict';

    // Definir proyección UTM Zona 19 Sur (EPSG:32719)
    proj4.defs('EPSG:32719', '+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs');

    var marcadorActual = null;

    function utmALatLng(x, y) {
        try {
            return proj4('EPSG:32719', 'EPSG:4326', [x, y]);
        } catch (e) {
            console.error('Error convirtiendo coordenadas:', e);
            return null;
        }
    }

    function irACoordenadas() {
        var inputX = document.getElementById('coord-x');
        var inputY = document.getElementById('coord-y');

        var x = parseFloat(inputX.value);
        var y = parseFloat(inputY.value);

        if (isNaN(x) || isNaN(y)) {
            alert('Ingresá valores numéricos válidos para X (Este) e Y (Norte).');
            return;
        }

        // Rangos aproximados Zona 19S - Madre de Dios
        if (x < 150000 || x > 550000) {
            alert('X (Este) fuera del rango esperado para Zona 19S (150,000 - 550,000).\nVerificá el valor.');
            return;
        }
        if (y < 8200000 || y > 8900000) {
            alert('Y (Norte) fuera del rango esperado para Zona 19S (8,200,000 - 8,900,000).\nVerificá el valor.');
            return;
        }

        var resultado = utmALatLng(x, y);
        if (!resultado) {
            alert('No se pudo convertir las coordenadas. Verificá los valores.');
            return;
        }

        var lng = resultado[0];
        var lat = resultado[1];
        var map = window.map;

        if (!map) {
            alert('El mapa aún no está listo. Esperá que cargue y probá de nuevo.');
            return;
        }

        // Limpiar marcador anterior
        if (marcadorActual) {
            map.removeLayer(marcadorActual);
        }

        // Crear marcador (usa ícono default de Leaflet)
        marcadorActual = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(
                '<b>📍 Coordenadas UTM 19S</b><br>' +
                'X: ' + x.toFixed(0) + ' m<br>' +
                'Y: ' + y.toFixed(0) + ' m<br>' +
                '<small>Lat: ' + lat.toFixed(6) + ' | Lng: ' + lng.toFixed(6) + '</small>'
            )
            .openPopup();

        map.setView([lat, lng], 16);

        console.log('🎯 Navegando a: X=' + x + ' Y=' + y + ' → Lat=' + lat.toFixed(6) + ' Lng=' + lng.toFixed(6));
    }

    function manejarEnter(e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            irACoordenadas();
        }
    }

    function inicializar() {
        var btnIr = document.getElementById('btn-ir-coordenada');
        var inputX = document.getElementById('coord-x');
        var inputY = document.getElementById('coord-y');

        if (btnIr) btnIr.addEventListener('click', irACoordenadas);
        if (inputX) inputX.addEventListener('keydown', manejarEnter);
        if (inputY) inputY.addEventListener('keydown', manejarEnter);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializar);
    } else {
        inicializar();
    }
})();
