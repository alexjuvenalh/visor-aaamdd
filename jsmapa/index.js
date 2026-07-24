/**
 * jsmapa/index.js — Mapa principal del Visor AAA Madre de Dios
 * 
 * Inicializa Leaflet, define capas (4 principales + 8 base),
 * conecta checkboxes de ambos paneles, toggle y abrirPDF.
 * 
 * Leyenda: bottomleft. Panel Capas Base: topright (flotante).
 * 
 * Módulos extraídos: GPS → js/gps.js, Búsqueda → js/search.js,
 * Utilidades → js/util.js
 */

(function (window) {
    'use strict';

    function initMap() {
        if (!AppState.data.faja_poligono || !AppState.data.faja_hito) {
            console.log('⏳ Esperando carga de datos...');
            window.addEventListener('datos-cargados', function() {
                console.log('📦 Datos recibidos, inicializando mapa...');
                initMap();
            });
            return;
        }

        var L = window.L;

        // Capa base - Google Maps satélite
        var osm = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['', '1', '2', '3'],
            attribution: 'Google Maps'
        });

        var map = L.map('map', {
            center: [-12.5933100, -69.1891300],
            zoom: 8,
        }).addLayer(osm);

        AppState.map = map;
        window.map = map;

        // ============================================
        // ESTILOS
        // ============================================
        var fajaStyle = { color: '#ff0000', fillColor: '#ff0000', fillOpacity: 0.4, weight: 2 };
        var usoTempStyle = { color: '#0000ff', fillColor: '#0000ff', fillOpacity: 0.4, weight: 2 };
        var pointStyle = { radius: 6, fillColor: '#ffff00', color: '#000', weight: 1, fillOpacity: 0.8 };

        // Estilos capas base (colores que NO chocan con faja rojo ni uso temporal azul)
        var baseStyles = {
            aaa:            { color: '#800000', weight: 2, fillOpacity: 0 },       // maroon
            ala:            { color: '#FF8C00', weight: 2, fillOpacity: 0 },       // dark orange
            departamento:   { color: '#2E8B57', weight: 2, fillOpacity: 0 },       // sea green
            provincia:      { color: '#8B008B', weight: 1.5, fillOpacity: 0 },     // dark magenta
            distrito:       { color: '#B8860B', weight: 1, fillOpacity: 0 },       // dark goldenrod
            carta:          { color: '#A0522D', weight: 1, dashArray: '5,5', fillOpacity: 0 }, // sienna dashed
            rio_principal:  { color: '#1E90FF', weight: 2 },                        // dodger blue
            rio:            { color: '#48D1CC', weight: 1, opacity: 0.7 },          // turquoise
            lago_laguna:    { color: '#008B8B', weight: 2, fillOpacity: 0.15 },     // dark cyan
            cuenca_transfronteriza: { color: '#B22222', weight: 2, fillOpacity: 0.1, dashArray: '8,4' }, // firebrick
            unidad_hidrografica:    { color: '#6B8E23', weight: 2, fillOpacity: 0.15 }  // olive drab
        };

        // ============================================
        // LEYENDA (bottomleft)
        // ============================================
        var legend = L.control({ position: 'bottomleft' });
        legend.onAdd = function (m) {
            var div = L.DomUtil.create('div', 'info legend');

            // === VERSIÓN COMPLETA (desktop) ===
            var full = L.DomUtil.create('div', 'legend-full');
            full.innerHTML = '<h4>Leyenda</h4>';
            full.innerHTML += '<div><span style="background:#ff0000;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:2px;"></span> Faja Marginal</div>';
            full.innerHTML += '<div><span style="background:#ffff00;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Hitos Faja</div>';
            full.innerHTML += '<div><span style="background:#0000ff;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:2px;"></span> Uso Temporal</div>';
            full.innerHTML += '<div style="margin-top:6px;border-top:1px solid #ccc;padding-top:4px;font-weight:bold;font-size:12px;">RADA Fuente</div>';

            var usosRADA = [
                'ACUÍCOLA', 'MINERO', 'POBLACIONAL', 'OTROS USOS', 'AGRÍCOLA',
                'DOMÉSTICO - POBLACIONAL', 'INDUSTRIAL', 'RECREATIVO', 'PECUARIO',
                'ENERGÉTICO', 'TURÍSTICO'
            ];
            usosRADA.forEach(function(uso) {
                var svgMini = iconosRADA[uso] || '';
                if (svgMini) {
                    full.innerHTML += '<div style="display:flex;align-items:center;gap:4px;line-height:1.3;">' +
                        '<span style="width:14px;height:14px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">' + svgMini + '</span>' +
                        '<span style="font-size:11px;">' + uso + '</span>' +
                        '</div>';
                }
            });
            div.appendChild(full);

            // === VERSIÓN COMPACTA (móvil) ===
            var compact = L.DomUtil.create('div', 'legend-compact');
            compact.innerHTML =
                '<span class="legend-dot" style="display:flex;align-items:center;gap:3px;">' +
                  '<span style="background:#ff0000;width:8px;height:8px;display:inline-block;border-radius:2px;flex-shrink:0;"></span>Faja' +
                '</span>' +
                '<span class="legend-dot" style="display:flex;align-items:center;gap:3px;">' +
                  '<span style="background:#ffff00;width:8px;height:8px;display:inline-block;border-radius:50%;flex-shrink:0;"></span>Hitos' +
                '</span>' +
                '<span class="legend-dot" style="display:flex;align-items:center;gap:3px;">' +
                  '<span style="background:#0000ff;width:8px;height:8px;display:inline-block;border-radius:2px;flex-shrink:0;"></span>Uso' +
                '</span>' +
                '<button class="btn-leyenda-rada" title="Ver íconos RADA">🛈</button>';

            // Toggle: al tocar ℹ️, mostrar/esconder minileyenda RADA
            var radaMini = L.DomUtil.create('div', 'rada-mini-leyenda');
            radaMini.style.cssText = 'display:none;position:absolute;bottom:100%;left:0;margin-bottom:4px;background:white;padding:6px 8px;border-radius:4px;box-shadow:0 0 8px rgba(0,0,0,0.2);font-size:11px;max-height:40vh;overflow-y:auto;z-index:1000;';

            var radaContent = '';
            usosRADA.forEach(function(uso) {
                var svgMini = iconosRADA[uso] || '';
                if (svgMini) {
                    radaContent += '<div style="display:flex;align-items:center;gap:4px;line-height:1.5;white-space:nowrap;">' +
                        '<span style="width:14px;height:14px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">' + svgMini + '</span>' +
                        '<span>' + uso + '</span></div>';
                }
            });
            radaMini.innerHTML = radaContent;

            var btnRada = compact.querySelector('.btn-leyenda-rada');
            btnRada.addEventListener('click', function(e) {
                e.stopPropagation();
                if (radaMini.style.display === 'none') {
                    radaMini.style.display = 'block';
                } else {
                    radaMini.style.display = 'none';
                }
            });

            // Cerrar radaMini al tocar fuera
            L.DomEvent.on(document, 'click', function(e) {
                if (radaMini.style.display === 'block' && !compact.contains(e.target)) {
                    radaMini.style.display = 'none';
                }
            });

            div.appendChild(compact);
            div.appendChild(radaMini);
            L.DomEvent.disableClickPropagation(div);

            return div;
        };
        legend.addTo(map);

        // ============================================
        // PANEL CAPAS BASE (topright) — flotante
        // ============================================
        var capasBaseControl = L.control({ position: 'topright' });
        capasBaseControl.onAdd = function (m) {
            var div = L.DomUtil.create('div', 'info legend capas-base-panel collapsed');

            // Toggle button (visible solo en móvil)
            var toggleBtn = L.DomUtil.create('div', 'capas-base-toggle');
            toggleBtn.innerHTML = '🗂️';
            toggleBtn.title = 'Capas Base';
            div.appendChild(toggleBtn);

            // Contenido del panel
            var content = L.DomUtil.create('div', 'capas-base-content');
            content.innerHTML = '<h4>🗂️ Capas Base</h4>';

            var capas = [
                { id: 'chkBaseAAA',      label: 'AAA',              color: '#800000' },
                { id: 'chkBaseALA',      label: 'ALA',              color: '#FF8C00' },
                { id: 'chkBaseDepto',    label: 'Departamento',     color: '#2E8B57' },
                { id: 'chkBaseProv',     label: 'Provincia',        color: '#8B008B' },
                { id: 'chkBaseDist',     label: 'Distrito',         color: '#B8860B' },
                { id: 'chkBaseCarta',    label: 'Carta IGN',        color: '#A0522D', dash: true },
                { id: 'chkBaseRioPrin',  label: 'Río Principal',    color: '#1E90FF', line: true },
                { id: 'chkBaseRio',      label: 'Ríos',             color: '#48D1CC', line: true },
                { id: 'chkBaseLaguna',   label: 'Lagos / Lagunas',  color: '#008B8B', fill: true },
                { id: 'chkBaseCuencaT',  label: 'Cuenca Transf.',   color: '#B22222', fill: true, dash: true },
                { id: 'chkBaseUniHidro', label: 'Unidad Hidrog.',   color: '#6B8E23', fill: true }
            ];

            capas.forEach(function(c) {
                var spanStyle = 'background:' + c.color + ';width:14px;height:14px;display:inline-block;margin-right:5px;';
                if (c.line) {
                    spanStyle += 'border-bottom:3px solid ' + c.color + ';background:transparent;height:0;vertical-align:middle;position:relative;top:-2px;';
                } else if (c.fill) {
                    spanStyle += 'opacity:0.5;border:1px solid ' + c.color + ';border-radius:2px;';
                } else if (c.dash) {
                    spanStyle += 'border:2px dashed ' + c.color + ';background:transparent;border-radius:0;';
                } else {
                    spanStyle += 'border:2px solid ' + c.color + ';background:transparent;border-radius:2px;';
                }
                content.innerHTML += '<div style="margin-bottom:2px;">' +
                    '<label style="cursor:pointer;font-size:12px;display:flex;align-items:center;">' +
                    '<input type="checkbox" id="' + c.id + '" style="margin-right:4px;">' +
                    '<span style="' + spanStyle + '"></span>' + c.label +
                    '</label></div>';
            });
            div.appendChild(content);

            // Toggle lógica
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                div.classList.toggle('collapsed');
                toggleBtn.innerHTML = div.classList.contains('collapsed') ? '🗂️' : '✕';
                toggleBtn.title = div.classList.contains('collapsed') ? 'Capas Base' : 'Cerrar';
            });

            // Cerrar al tocar el mapa (solo en móvil)
            map.on('click', function() {
                if (window.innerWidth <= 480 && !div.classList.contains('collapsed')) {
                    div.classList.add('collapsed');
                    toggleBtn.innerHTML = '🗂️';
                    toggleBtn.title = 'Capas Base';
                }
            });

            // Auto-colapsar al marcar un checkbox (solo en móvil)
            var checkboxes = content.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(function(cb) {
                cb.addEventListener('change', function() {
                    if (window.innerWidth <= 480) {
                        div.classList.add('collapsed');
                        toggleBtn.innerHTML = '🗂️';
                        toggleBtn.title = 'Capas Base';
                    }
                });
            });

            // Prevent map click/drag when interacting with the panel
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            return div;
        };
        capasBaseControl.addTo(map);

        // ============================================
        // CAPAS PRINCIPALES (existentes)
        // ============================================

        function getFajaMarginal() {
            if (!AppState.layers.faja && AppState.data.faja_poligono) {
                AppState.layers.faja = L.geoJson(AppState.data.faja_poligono, {
                    style: fajaStyle,
                    onEachFeature: popupFajaMarginal
                });
            }
            return AppState.layers.faja;
        }

        function getHitoFaja() {
            if (!AppState.layers.hito && AppState.data.faja_hito) {
                var hito_faja = L.geoJson(AppState.data.faja_hito, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, pointStyle);
                    },
                    onEachFeature: popupHitoFaja
                });
                var cluster = L.markerClusterGroup({
                    maxClusterRadius: 50, spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false, zoomToBoundsOnClick: true
                });
                cluster.addLayer(hito_faja);
                AppState.layers.hito = cluster;
            }
            return AppState.layers.hito;
        }

        function getAut() {
            if (!AppState.layers.uso && AppState.data.uso_temporal) {
                AppState.layers.uso = L.geoJson(AppState.data.uso_temporal, {
                    style: usoTempStyle,
                    onEachFeature: popupUsoTemporal
                });
            }
            return AppState.layers.uso;
        }

        function getRadaFuente() {
            if (!AppState.layers.rada && AppState.data.rada_por_fuente?.features) {
                console.log('Creando RADA con', AppState.data.rada_por_fuente.features.length, 'puntos');
                var rada_fuente = L.geoJson(AppState.data.rada_por_fuente, {
                    pointToLayer: radaPointToLayer,
                    onEachFeature: popupRada
                });
                var cluster = L.markerClusterGroup({ maxClusterRadius: 50 });
                cluster.addLayer(rada_fuente);
                AppState.layers.rada = cluster;
            }
            return AppState.layers.rada;
        }

        // ============================================
        // CAPAS BASE (nuevas — carga lazy para ríos)
        // ============================================

        // Helper: carga un GeoJSON bajo demanda (para capas pesadas)
        function lazyLoadGeoJSON(url, key, callback) {
            if (AppState.data[key]) {
                callback(AppState.data[key]);
                return;
            }
            console.log('🔄 Cargando ' + key + ' desde ' + url + '...');
            fetch(url)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    AppState.data[key] = data;
                    window[key] = data;
                    console.log('✅ ' + key + ' cargado (' + (data.features ? data.features.length : 0) + ' features)');
                    callback(data);
                })
                .catch(function(err) {
                    console.error('❌ Error cargando ' + key, err);
                    alert('No se pudo cargar la capa ' + key);
                });
        }

        function addBaseLayer(key, style, popupFn) {
            if (AppState.layers['base_' + key]) return;
            var data = AppState.data[key];
            if (!data) return;
            AppState.layers['base_' + key] = L.geoJson(data, {
                style: style,
                onEachFeature: popupFn || genericPopup
            });
        }

        function getBaseLayer(key, style, popupFn) {
            if (!AppState.layers['base_' + key]) {
                if (AppState.data[key]) {
                    addBaseLayer(key, style, popupFn);
                }
            }
            return AppState.layers['base_' + key];
        }

        // Capas livianas (eager) — datos ya cargados por cargar-datos.js
        function getAAA()     { return getBaseLayer('aaa', baseStyles.aaa); }
        function getALA()     { return getBaseLayer('ala', baseStyles.ala); }
        function getDepto()   { return getBaseLayer('departamento', baseStyles.departamento); }
        function getProv()    { return getBaseLayer('provincia', baseStyles.provincia); }
        function getDist()    { return getBaseLayer('distrito', baseStyles.distrito); }
        function getCarta()   { return getBaseLayer('carta', baseStyles.carta); }
        function getLaguna()  { return getBaseLayer('lago_laguna', baseStyles.lago_laguna); }
        function getCuencaT() { return getBaseLayer('cuenca_transfronteriza', baseStyles.cuenca_transfronteriza); }
        function getUniHidro(){ return getBaseLayer('unidad_hidrografica', baseStyles.unidad_hidrografica); }

        // Capas pesadas (lazy) — cargan al primer clic del checkbox
        function getRioPrincipal(cb) {
            lazyLoadGeoJSON('visor/geojson/rio_principal.json', 'rio_principal', function() {
                addBaseLayer('rio_principal', baseStyles.rio_principal);
                if (AppState.layers['base_rio_principal']) {
                    AppState.layers['base_rio_principal'].addTo(map);
                }
            });
            return AppState.layers['base_rio_principal'];
        }

        function getRio(cb) {
            lazyLoadGeoJSON('visor/geojson/rio.json', 'rio', function() {
                addBaseLayer('rio', baseStyles.rio);
                if (AppState.layers['base_rio']) {
                    AppState.layers['base_rio'].addTo(map);
                }
            });
            return AppState.layers['base_rio'];
        }

        // ============================================
        // POPUPS
        // ============================================

        function genericPopup(feature, layer) {
            var p = feature.properties;
            var content = '';
            for (var key in p) {
                if (p[key] !== null && p[key] !== undefined && p[key] !== '') {
                    content += '<b>' + key + ':</b> ' + sanitize(String(p[key])) + '<br/>';
                }
            }
            layer.bindPopup(content);
        }

        function popupFajaMarginal(feature, layer) {
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

        function popupHitoFaja(feature, layer) {
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

        function popupUsoTemporal(feature, layer) {
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

        function radaPointToLayer(feature, latlng) {
            var uso = (feature.properties.uso || 'OTROS USOS').toUpperCase();
            var svg = iconosRADA[uso] || iconosRADA['OTROS USOS'];
            var html = '<div style="text-align:center;line-height:1;">' +
                '<div style="width:28px;height:28px;">' + svg + '</div>' +
                '<div style="font-size:9px;font-weight:bold;color:#333;text-shadow:0 0 2px #fff,0 0 2px #fff;margin-top:1px;max-width:70px;word-wrap:break-word;line-height:1.1;">' + uso + '</div></div>';
            return L.marker(latlng, {
                icon: L.divIcon({ className: 'rada-icono', html: html, iconSize: [80, 44], iconAnchor: [40, 14], popupAnchor: [0, -14] })
            });
        }

        function popupRada(feature, layer) {
            var p = feature.properties;
            var content = '<div style="max-width:250px;max-height:200px;overflow:auto;">';
            var campos = [
                ['uso', 'Uso'], ['usuario', 'Usuario'], ['documento', 'Documento'],
                ['resolucion', 'Resolución'], ['fecha', 'Fecha'], ['fuente', 'Fuente'],
                ['lugar_de_uso', 'Lugar de Uso'], ['volumen', 'Volumen (m³)'],
                ['area', 'Área (ha)'], ['ala', 'ALA'], ['aaa', 'AAA'],
                ['departamento', 'Departamento'], ['provincia', 'Provincia'],
                ['distrito', 'Distrito'], ['cur', 'CUR'], ['zona', 'Zona'],
                ['este', 'Este'], ['norte', 'Norte'], ['datum', 'DATUM']
            ];
            campos.forEach(function(item) {
                if (p[item[0]] !== null && p[item[0]] !== undefined && p[item[0]] !== '') {
                    content += '<b>' + item[1] + ':</b> ' + sanitize(String(p[item[0]])) + '<br/>';
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

        // ============================================
        // CHECKBOX WIRING
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

        // Capas principales
        wireCheckbox('chkFaja', getFajaMarginal);
        wireCheckbox('chkHito', getHitoFaja);
        wireCheckbox('chkAut', getAut);
        wireCheckbox('chkRadaFuente', getRadaFuente);

        // Capas base (panel derecho) — se cablean con delay porque el control
        // se crea después de initMap(). Usamos MutationObserver o setTimeout.
        setTimeout(function() {
            wireCheckbox('chkBaseAAA', getAAA);
            wireCheckbox('chkBaseALA', getALA);
            wireCheckbox('chkBaseDepto', getDepto);
            wireCheckbox('chkBaseProv', getProv);
            wireCheckbox('chkBaseDist', getDist);
            wireCheckbox('chkBaseCarta', getCarta);
            wireCheckbox('chkBaseLaguna', getLaguna);
            wireCheckbox('chkBaseCuencaT', getCuencaT);
            wireCheckbox('chkBaseUniHidro', getUniHidro);
            wireCheckbox('chkBaseRioPrin', getRioPrincipal);
            wireCheckbox('chkBaseRio', getRio);
        }, 100);

        console.log('Visor ANA inicializado');
        console.log('Fajas:', AppState.data.faja_poligono?.features?.length || 0);
        console.log('AUT:', AppState.data.uso_temporal?.features?.length || 0);
        if (AppState.data.aaa) console.log('Capas base cargadas:', Object.keys(baseStyles).length);
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
        initSearch();
        initGPSButton();
    });

}(window));

function abrirPDF(e, urlPrimaria, urlFallback) {
    e.preventDefault();
    fetch(urlPrimaria, { method: 'HEAD' })
        .then(function(r) {
            if (r.ok) { window.open(urlPrimaria, '_blank'); }
            else { window.open(urlFallback, '_blank'); }
        })
        .catch(function() { window.open(urlFallback, '_blank'); });
}
