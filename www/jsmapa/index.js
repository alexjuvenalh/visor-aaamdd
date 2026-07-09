/**
 * jsmapa/index.js — Mapa principal del Visor AAA Madre de Dios
 * 
 * Inicializa Leaflet, define las 4 capas (Faja, Hitos, Uso Temporal, RADA),
 * conecta los checkboxes, toggle del panel, y abrirPDF.
 * 
 * Módulos extraídos:
 *   - GPS → js/gps.js
 *   - Búsqueda → js/search.js
 *   - Utilidades → js/util.js
 * 
 * Depende de: util.js (AppState, sanitize), iconos-rada.js (iconosRADA)
 */

(function (window) {
    'use strict';

    function initMap() {
        // Si los datos aún no se cargaron, esperar
        if (!AppState.data.faja_poligono || !AppState.data.faja_hito) {
            console.log('⏳ Esperando carga de datos...');
            window.addEventListener('datos-cargados', function() {
                console.log('📦 Datos recibidos, inicializando mapa...');
                initMap();
            });
            return;
        }

        var L = window.L;

        // Capa base - Google Maps satélite (sin API key)
        var osm = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['', '1', '2', '3'],
            attribution: 'Google Maps'
        });

        var map = L.map('map', {
            center: [-12.5933100, -69.1891300],
            zoom: 8,
        }).addLayer(osm);

        // Guardar en AppState + compatibilidad window
        AppState.map = map;
        window.map = map;

        // ============================================
        // ESTILOS
        // ============================================
        var fajaStyle = {
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.4,
            weight: 2
        };

        var usoTempStyle = {
            color: '#0000ff',
            fillColor: '#0000ff',
            fillOpacity: 0.4,
            weight: 2
        };

        var pointStyle = {
            radius: 6,
            fillColor: '#ffff00',
            color: '#000',
            weight: 1,
            fillOpacity: 0.8
        };

        // ============================================
        // LEYENDA
        // ============================================
        var legend = L.control({ position: 'bottomright' });
        legend.onAdd = function (m) {
            var div = L.DomUtil.create('div', 'info legend');
            div.innerHTML += '<h4>Leyenda</h4>';
            div.innerHTML += '<div><span style="background:#ff0000;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:2px;"></span> Faja Marginal</div>';
            div.innerHTML += '<div><span style="background:#ffff00;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Hitos Faja</div>';
            div.innerHTML += '<div><span style="background:#0000ff;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:2px;"></span> Uso Temporal</div>';
            div.innerHTML += '<div style="margin-top:6px;border-top:1px solid #ccc;padding-top:4px;font-weight:bold;font-size:12px;">RADA Fuente</div>';

            var usosRADA = [
                'ACUÍCOLA', 'MINERO', 'POBLACIONAL', 'OTROS USOS', 'AGRÍCOLA',
                'DOMÉSTICO - POBLACIONAL', 'INDUSTRIAL', 'RECREATIVO', 'PECUARIO',
                'ENERGÉTICO', 'TURÍSTICO'
            ];
            usosRADA.forEach(function(uso) {
                var svgMini = iconosRADA[uso] || '';
                if (svgMini) {
                    div.innerHTML += '<div style="display:flex;align-items:center;gap:4px;line-height:1.3;">' +
                        '<span style="width:14px;height:14px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">' + svgMini + '</span>' +
                        '<span style="font-size:11px;">' + uso + '</span>' +
                        '</div>';
                }
            });

            return div;
        };
        legend.addTo(map);

        // ============================================
        // CAPAS — Lazy getters (creadas al primer uso)
        // ============================================

        // --- FAJA MARGINAL ---
        function getFajaMarginal() {
            if (!AppState.layers.faja && AppState.data.faja_poligono) {
                AppState.layers.faja = L.geoJson(AppState.data.faja_poligono, {
                    style: fajaStyle,
                    onEachFeature: function(feature, layer) {
                        var p = feature.properties;
                        var content = '';
                        content += '<b>Clase:</b> ' + sanitize(p.clase_resolucion) + '<br/>';
                        content += '<b>Nombre:</b> ' + sanitize(p.nombre_faja_marginal) + '<br/>';
                        content += '<b>Nombre Faja:</b> ' + sanitize(p.nombre_faja) + '<br/>';
                        content += '<b>Resolución:</b> ' + sanitize(p.numero_resolucion) + '<br/>';
                        content += '<b>Fecha:</b> ' + sanitize(p.fecha_resolucion) + '<br/>';
                        content += '<b>CUT:</b> ' + sanitize(p.cut) + '<br/>';
                        content += '<b>AAA:</b> ' + sanitize(p.aaa) + '<br/>';
                        content += '<b>ALA:</b> ' + sanitize(p.ala) + '<br/>';
                        content += '<b>Margen:</b> ' + sanitize(p.margen) + '<br/>';
                        content += '<b>Departamento:</b> ' + sanitize(p.departamento) + '<br/>';
                        content += '<b>Provincia:</b> ' + sanitize(p.provincia) + '<br/>';
                        content += '<b>Distrito:</b> ' + sanitize(p.distrito) + '<br/>';
                        content += '<b>Sector:</b> ' + sanitize(p.sector) + '<br/>';
                        content += '<b>Resumen:</b> ' + sanitize(p.resumen) + '<br/>';
                        if (p.archivo) {
                            content += '<b>Archivo:</b> <a target="_blank" href="https://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.archivo) + (p.archivo.toLowerCase().endsWith('.pdf') ? '' : '.pdf') + '">📄 Ver PDF</a>';
                        }
                        layer.bindPopup(content);
                    }
                });
            }
            return AppState.layers.faja;
        }

        // --- HITOS FAJA ---
        function getHitoFaja() {
            if (!AppState.layers.hito && AppState.data.faja_hito) {
                var hito_faja = L.geoJson(AppState.data.faja_hito, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, pointStyle);
                    },
                    onEachFeature: function(feature, layer) {
                        var p = feature.properties;
                        var content = '';
                        content += '<b>Clase:</b> ' + sanitize(p.clase_resolucion) + '<br/>';
                        content += '<b>Hito:</b> ' + sanitize(p.hito) + '<br/>';
                        content += '<b>Resolución:</b> ' + sanitize(p.numero_resolucion) + '<br/>';
                        content += '<b>Fecha:</b> ' + sanitize(p.fecha_resolucion) + '<br/>';
                        content += '<b>CUT:</b> ' + sanitize(p.cut) + '<br/>';
                        content += '<b>AAA:</b> ' + sanitize(p.aaa) + '<br/>';
                        content += '<b>ALA:</b> ' + sanitize(p.ala) + '<br/>';
                        content += '<b>Margen:</b> ' + sanitize(p.margen) + '<br/>';
                        content += '<b>Ancho Faja:</b> ' + sanitize(p.ancho_faja) + '<br/>';
                        content += '<b>Tipo:</b> ' + sanitize(p.tipo) + '<br/>';
                        content += '<b>Fuente:</b> ' + sanitize(p.nombre_fuente) + '<br/>';
                        content += '<b>Este:</b> ' + sanitize(p.este) + '<br/>';
                        content += '<b>Norte:</b> ' + sanitize(p.norte) + '<br/>';
                        content += '<b>Departamento:</b> ' + sanitize(p.departamento) + '<br/>';
                        content += '<b>Provincia:</b> ' + sanitize(p.provincia) + '<br/>';
                        content += '<b>Distrito:</b> ' + sanitize(p.distrito) + '<br/>';
                        content += '<b>Sector:</b> ' + sanitize(p.sector) + '<br/>';
                        content += '<b>Resumen:</b> ' + sanitize(p.resumen) + '<br/>';
                        if (p.archivo) {
                            content += '<b>Archivo:</b> <a target="_blank" href="https://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.archivo) + (p.archivo.toLowerCase().endsWith('.pdf') ? '' : '.pdf') + '">📄 Ver PDF</a>';
                        }
                        layer.bindPopup(content);
                    }
                });

                var cluster = L.markerClusterGroup({
                    maxClusterRadius: 50,
                    spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true
                });
                cluster.addLayer(hito_faja);
                AppState.layers.hito = cluster;
            }
            return AppState.layers.hito;
        }

        // --- USO TEMPORAL ---
        function getAut() {
            if (!AppState.layers.uso && AppState.data.uso_temporal) {
                AppState.layers.uso = L.geoJson(AppState.data.uso_temporal, {
                    style: usoTempStyle,
                    onEachFeature: function(feature, layer) {
                        var p = feature.properties;
                        var content = '';
                        content += '<b>Clase:</b> ' + sanitize(p.clase_resolucion) + '<br/>';
                        content += '<b>Usuario:</b> ' + sanitize(p.nombre_o_razon_social) + '<br/>';
                        content += '<b>Documento:</b> ' + sanitize(p.tipo_documento) + ' ' + sanitize(p.numero_documento) + '<br/>';
                        content += '<b>Resolución:</b> ' + sanitize(p.numero_resolucion) + '<br/>';
                        content += '<b>Fecha:</b> ' + sanitize(p.fecha_resolucion) + '<br/>';
                        content += '<b>CUT:</b> ' + sanitize(p.cut) + '<br/>';
                        content += '<b>AAA:</b> ' + sanitize(p.aaa) + '<br/>';
                        content += '<b>ALA:</b> ' + sanitize(p.ala) + '<br/>';
                        content += '<b>Tipo:</b> ' + sanitize(p.tipo_aut) + '<br/>';
                        content += '<b>Área Total:</b> ' + sanitize(p.area_total) + '<br/>';
                        content += '<b>Área Otorgada:</b> ' + sanitize(p.area_otorgada) + '<br/>';
                        content += '<b>Bien Asociado:</b> ' + sanitize(p.bien_asociado) + '<br/>';
                        content += '<b>Período:</b> ' + sanitize(p.periodo_autorizacion) + '<br/>';
                        content += '<b>Fecha Aut:</b> ' + sanitize(p.fecha_autorizacion) + '<br/>';
                        content += '<b>Departamento:</b> ' + sanitize(p.departamento) + '<br/>';
                        content += '<b>Provincia:</b> ' + sanitize(p.provincia) + '<br/>';
                        content += '<b>Distrito:</b> ' + sanitize(p.distrito) + '<br/>';
                        content += '<b>Sector:</b> ' + sanitize(p.sector) + '<br/>';
                        content += '<b>Resumen:</b> ' + sanitize(p.resumen) + '<br/>';
                        if (p.archivo) {
                            content += '<b>Archivo:</b> <a target="_blank" href="https://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.archivo) + (p.archivo.toLowerCase().endsWith('.pdf') ? '' : '.pdf') + '">📄 Ver PDF</a>';
                        }
                        layer.bindPopup(content);
                    }
                });
            }
            return AppState.layers.uso;
        }

        // --- RADA FUENTE ---
        function getRadaFuente() {
            if (!AppState.layers.rada && AppState.data.rada_por_fuente && AppState.data.rada_por_fuente.features) {
                console.log('Creando RADA con', AppState.data.rada_por_fuente.features.length, 'puntos');

                var rada_fuente = L.geoJson(AppState.data.rada_por_fuente, {
                    pointToLayer: function(feature, latlng) {
                        var uso = (feature.properties.uso || 'OTROS USOS').toUpperCase();
                        var svg = iconosRADA[uso] || iconosRADA['OTROS USOS'];
                        var html = '<div style="text-align:center;line-height:1;">' +
                            '<div style="width:28px;height:28px;">' + svg + '</div>' +
                            '<div style="font-size:9px;font-weight:bold;color:#333;text-shadow:0 0 2px #fff,0 0 2px #fff;margin-top:1px;max-width:70px;word-wrap:break-word;line-height:1.1;">' + uso + '</div>' +
                            '</div>';
                        return L.marker(latlng, {
                            icon: L.divIcon({
                                className: 'rada-icono',
                                html: html,
                                iconSize: [80, 44],
                                iconAnchor: [40, 14],
                                popupAnchor: [0, -14]
                            })
                        });
                    },
                    onEachFeature: function(feature, layer) {
                        var p = feature.properties;
                        var content = '<div style="max-width:250px;max-height:200px;overflow:auto;">';

                        var camposImportantes = [
                            ['uso', 'Uso'], ['usuario', 'Usuario'], ['documento', 'Documento'],
                            ['resolucion', 'Resolución'], ['fecha', 'Fecha'], ['fuente', 'Fuente'],
                            ['lugar_de_uso', 'Lugar de Uso'], ['volumen', 'Volumen (m³)'],
                            ['area', 'Área (ha)'], ['ala', 'ALA'], ['aaa', 'AAA'],
                            ['departamento', 'Departamento'], ['provincia', 'Provincia'],
                            ['distrito', 'Distrito'], ['cur', 'CUR'], ['zona', 'Zona'],
                            ['este', 'Este'], ['norte', 'Norte'], ['datum', 'DATUM']
                        ];

                        camposImportantes.forEach(function(item) {
                            var key = item[0], label = item[1];
                            if (p[key] !== null && p[key] !== undefined && p[key] !== '') {
                                content += '<b>' + label + ':</b> ' + sanitize(String(p[key])) + '<br/>';
                            }
                        });

                        if (p.archivo) {
                            var archivoLimpio = sanitize(p.archivo);
                            var ext = archivoLimpio.toLowerCase().endsWith('.pdf') ? '' : '.pdf';
                            var prefijo = p.archivo.split('-')[0];
                            var url1 = 'https://filedarh.ana.gob.pe/dir_rada/' + prefijo + '/' + archivoLimpio + ext;
                            var url2 = 'https://snirh.ana.gob.pe/MIDARH/output/Resolucion/' + archivoLimpio + ext;
                            content += '<b>Archivo:</b> <a href="#" onclick="abrirPDF(event,\'' + url1 + '\',\'' + url2 + '\')" style="color:#0066cc;text-decoration:underline;">📄 Ver PDF</a><br/>';
                        }

                        content += '</div>';
                        layer.bindPopup(content);
                    }
                });

                var cluster = L.markerClusterGroup({
                    maxClusterRadius: 50
                });
                cluster.addLayer(rada_fuente);
                AppState.layers.rada = cluster;
            }
            return AppState.layers.rada;
        }

        // ============================================
        // CHECKBOX EVENT LISTENERS
        // ============================================
        function wireCheckbox(id, getter) {
            var cb = document.getElementById(id);
            if (!cb) return;
            cb.addEventListener('click', function() {
                if (cb.checked) {
                    var capa = getter();
                    if (capa) capa.addTo(map);
                } else {
                    var capa = getter();
                    if (capa) map.removeLayer(capa);
                }
            });
        }

        wireCheckbox('chkFaja', getFajaMarginal);
        wireCheckbox('chkHito', getHitoFaja);
        wireCheckbox('chkAut', getAut);
        wireCheckbox('chkRadaFuente', getRadaFuente);

        console.log('Visor ANA inicializado correctamente');
        console.log('Fajas disponibles:', AppState.data.faja_poligono?.features?.length || 0);
        console.log('Autorizaciones disponibles:', AppState.data.uso_temporal?.features?.length || 0);
    }

    // === TOGGLE DE PANEL DE CONTROLES (MÓVIL) ===
    window.toggleControls = function() {
        var ctrl = document.getElementById('controls');
        if (!ctrl) return;
        if (ctrl.classList.contains('controls-collapsed')) {
            ctrl.classList.remove('controls-collapsed');
            ctrl.classList.add('controls-expanded');
        } else {
            ctrl.classList.remove('controls-expanded');
            ctrl.classList.add('controls-collapsed');
        }
    };

    // === INICIALIZAR AL CARGAR ===
    window.addEventListener('load', function () {
        initMap();
        // Inicializar submódulos (search, GPS)
        initSearch();
        initGPSButton();
    });

}(window));

/**
 * Abre un PDF intentando la URL primaria (filedarh).
 * Si falla (CORS, 404, red), abre automáticamente la URL de fallback (snirh).
 * Totalmente transparente para el usuario: un clic, sin decisiones.
 */
function abrirPDF(e, urlPrimaria, urlFallback) {
    e.preventDefault();
    fetch(urlPrimaria, { method: 'HEAD' })
        .then(function(r) {
            if (r.ok) {
                window.open(urlPrimaria, '_blank');
            } else {
                window.open(urlFallback, '_blank');
            }
        })
        .catch(function() {
            window.open(urlFallback, '_blank');
        });
}
