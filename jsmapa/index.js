(function (window) {
    'use strict';

    function sanitize(str) {
        if (str == null) return '';
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    // Cargar datos desde API si no existen
    function cargarDatosAPI() {
        return fetch('http://localhost:3000/api/poligonos-faja')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                window.faja_poligono = data;
                console.log('Datos faja cargados:', data.features.length);
                return data;
            })
            .catch(function(e) {
                console.error('Error cargando faja:', e);
                return null;
            });
    }

    function initMap() {
        var self = this;
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

        // Expose map globally for other scripts
        window.map = map;

        // Estilo para polígonos de Faja Marginal (rojo)
        var fajaStyle = {
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.4,
            weight: 2
        };

        // Estilo para polígonos de Uso Temporal (azul)
        var usoTempStyle = {
            color: '#0000ff',
            fillColor: '#0000ff',
            fillOpacity: 0.4,
            weight: 2
        };

        var polygonStyle = fajaStyle; // por defecto

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
        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend');
            div.innerHTML += '<h4>Leyenda</h4>';
            div.innerHTML += '<div><span style="background:#ff7800;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:2px;"></span> Faja Marginal</div>';
            div.innerHTML += '<div><span style="background:#ffff00;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Hitos Faja</div>';
            div.innerHTML += '<div><span style="background:#00ff00;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:2px;"></span> Uso Temporal</div>';
            div.innerHTML += '<div><span style="background:#0000ff;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> RADA Fuente</div>';

            return div;
        };
        legend.addTo(map);

        // ============================================
        // CAPAS - FAJA MARGINAL
        // ============================================
        var faja_marginal = null;

        function getFajaMarginal() {
            if (!faja_marginal && window.faja_poligono) {
                faja_marginal = L.geoJson(window.faja_poligono, {
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
                            content += '<b>Archivo:</b> <a target="_blank" href="http://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.archivo) + '">📄 Ver PDF</a>';
                        }
                        layer.bindPopup(content);
                    }
                });
            }
            return faja_marginal;
        }

        // ============================================
        // CAPAS - HITOS (con clusterización)
        // ============================================
        var hito_cluster = null;

        function getHitoFaja() {
            if (!hito_cluster && window.faja_hito) {
                var hito_faja = L.geoJson(window.faja_hito, {
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
                            content += '<b>Archivo:</b> <a target="_blank" href="http://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.archivo) + '">📄 Ver PDF</a>';
                        }
                        layer.bindPopup(content);
                    }
                });

                hito_cluster = L.markerClusterGroup({
                    maxClusterRadius: 50,
                    spiderfyOnMaxZoom: true,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true
                });
                hito_cluster.addLayer(hito_faja);
            }
            return hito_cluster;
        }

        // ============================================
        // CAPAS - AUTORIZACIONES
        // ============================================
        var aut = null;

        function getAut() {
            if (!aut && window.uso_temporal) {
                aut = L.geoJson(window.uso_temporal, {
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
                            content += '<b>Archivo:</b> <a target="_blank" href="http://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.archivo) + '">📄 Ver PDF</a>';
                        }
                        layer.bindPopup(content);
                    }
                });
            }
            return aut;
        }
        // CAPAS - RADA
        // ============================================
        var rada_fuente_cluster = null;
        
        // Colores para RADA por Uso
        var coloresRADA = {
            'Acuícola': '#00FFFF',
            'Minero': '#BFBF00',
            'Poblacional': '#FF0000',
            'Otros Usos': '#808080',
            'Agrícola': '#00FF00',
            'Doméstico - Poblacional': '#0080FF',
            'Industrial': '#8000FF',
            'Recreativo': '#00BF00',
            'Pecuario': '#804000',
            'Energético': '#0000FF',
            'Turístico': '#FF00FF'
        };

        function getRadaFuente() {
            if (!rada_fuente_cluster && window.rada_por_fuente && window.rada_por_fuente.features) {
                console.log('Creando RADA con', window.rada_por_fuente.features.length, 'puntos');
                
                var rada_fuente = L.geoJson(window.rada_por_fuente, {
                    pointToLayer: function(feature, latlng) {
                        var uso = feature.properties.Uso || 'Otro';
                        var color = coloresRADA[uso] || '#808080';
                        return L.circleMarker(latlng, {
                            radius: 6,
                            fillColor: color,
                            color: '#000',
                            weight: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: function(feature, layer) {
                        var p = feature.properties;
                        var content = '<div style="max-width:250px;max-height:200px;overflow:auto;">';
                        
                        // Campos importantes a mostrar
                        var camposImportantes = ['Uso', 'Usuario', 'Documento', 'Resolució', 'Fecha', 'Fuente', 'Lugar_Uso', 'Volumen (m', 'Area (ha)', 'ALA', 'AAA', 'Departamen', 'Provincia', 'Distrito', 'CUR', 'Zona', 'Este', 'Norte', 'DATUM'];
                        var camposPDF = ['Archivo'];
                        
                        // Mostrar campos importantes
                        camposImportantes.forEach(function(key) {
                            if (p[key] !== null && p[key] !== undefined && p[key] !== '') {
                                content += '<b>' + key + ':</b> ' + sanitize(String(p[key])) + '<br/>';
                            }
                        });
                        
                        // Mostrar PDF si existe
                        if (p.Archivo) {
                            content += '<b>Archivo:</b> <a target="_blank" href="http://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.Archivo) + '">📄 Ver PDF</a><br/>';
                        }
                        
                        content += '</div>';
                        layer.bindPopup(content);
                    }
                });

                rada_fuente_cluster = L.markerClusterGroup({
                    maxClusterRadius: 50
                });
                rada_fuente_cluster.addLayer(rada_fuente);
            }
            return rada_fuente_cluster;
        }



        // ============================================
        // EVENT LISTENERS
        // ============================================
        var checkBoxFaja = document.getElementById("chkFaja");
        var checkBoxHito = document.getElementById("chkHito");
        var checkBoxAut = document.getElementById("chkAut");
        var checkBoxRadaFuente = document.getElementById("chkRadaFuente");


        if (checkBoxFaja) {
            checkBoxFaja.addEventListener("click", function() {
                if (checkBoxFaja.checked) {
                    var capa = getFajaMarginal();
                    if (capa) capa.addTo(map);
                } else {
                    var capa = getFajaMarginal();
                    if (capa) map.removeLayer(capa);
                }
            });
        }

        if (checkBoxHito) {
            checkBoxHito.addEventListener("click", function() {
                if (checkBoxHito.checked) {
                    var capa = getHitoFaja();
                    if (capa) capa.addTo(map);
                } else {
                    var capa = getHitoFaja();
                    if (capa) map.removeLayer(capa);
                }
            });
        }

        if (checkBoxAut) {
            checkBoxAut.addEventListener("click", function() {
                if (checkBoxAut.checked) {
                    var capa = getAut();
                    if (capa) capa.addTo(map);
                } else {
                    var capa = getAut();
                    if (capa) map.removeLayer(capa);
                }
            });
        }

        if (checkBoxRadaFuente) {
            checkBoxRadaFuente.addEventListener("click", function() {
                if (checkBoxRadaFuente.checked) {
                    var capa = getRadaFuente();
                    if (capa) capa.addTo(map);
                } else {
                    var capa = getRadaFuente();
                    if (capa) map.removeLayer(capa);
                }
            });
        }





        console.log('Visor ANA inicializado correctamente');
        console.log('Fajas disponibles:', window.faja_poligono?.features?.length || 0);
        console.log('Autorizaciones disponibles:', window.uso_temporal?.features?.length || 0);
    }

        // Buscar por número de resolución
        var btnBuscar = document.getElementById('btn-buscar');
        var inputBuscar = document.getElementById('buscar-input');
        if (btnBuscar && inputBuscar) {
            btnBuscar.addEventListener('click', buscarPorResolucion);
            inputBuscar.addEventListener('keypress', function(e) { if (e.key === 'Enter') buscarPorResolucion(); });
        }

        // Función para buscar en un campo específico
        function buscarEnCampo(prop, campo, texto) {
            if (!prop || !prop[campo]) return false;
            return String(prop[campo]).toUpperCase().includes(texto);
        }

        // Función de búsqueda unificada
        function buscarPorResolucion() {
            var texto = inputBuscar.value.trim().toUpperCase();
            if (!texto) return;
            
            console.log('[Búsqueda] Buscando: ' + texto);
            
            var resultados = [];
            
            // 1. Faja Marginal - busca por numero_resolucion, cut, resumen
            if (window.faja_poligono && window.faja_poligono.features) {
                window.faja_poligono.features.forEach(function(f) {
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
            
            // 2. Hitos - busca por numero_resolucion, cut, resumen
            if (window.faja_hito && window.faja_hito.features) {
                window.faja_hito.features.forEach(function(f) {
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
            
            // 3. Uso Temporal - busca por numero_resolucion, cut, nombre_o_razon_social, numero_documento, resumen
            if (window.uso_temporal && window.uso_temporal.features) {
                window.uso_temporal.features.forEach(function(f) {
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
            
            // 4. RADA Fuente - busca por Resolució, CUR, Usuario, Documento
            if (window.rada_por_fuente && window.rada_por_fuente.features) {
                window.rada_por_fuente.features.forEach(function(f) {
                    var p = f.properties;
                    if (p && (
                        buscarEnCampo(p, 'Resolució', texto) ||
                        buscarEnCampo(p, 'CUR', texto) ||
                        buscarEnCampo(p, 'Usuario', texto) ||
                        buscarEnCampo(p, 'Documento', texto)
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
            
            // Mostrar mensaje con cantidad de resultados por tipo
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
            var mapa = window.map;
            if (!mapa) { alert('Mapa no inicializado'); return; }
            if (bounds.isValid()) { mapa.fitBounds(bounds, { padding: [50, 50] }); }
            else if (feature.geometry.type === 'Point') { var c = feature.geometry.coordinates; mapa.setView([c[1], c[0]], 15); }
        }

// GPS - VERSIÓN SIMPLE Y FUNCIONAL
        var gpsMarker = null;
        var gpsWatchId = null;
        var gpsTrackCoords = [];
        var gpsPathLayer = null;
        var gpsReintentos = 0;
        var gpsMaxReintentos = 10;
        var gpsUltimaPosicionBuena = null;
        var gpsBotonMiUbicacion = null;
        var gpsIndicatorPrecision = null;
        var gpsIntentosInicial = 0;
        var gpsMaxIntentosInicial = 5;

        // Función principal - INICIAR GPS
        function iniciarGPS() {
            console.log('[GPS] ===== BOTÓN GPS TOCADO =====');

            if (!navigator.geolocation) {
                alert('Tu navegador no soporta GPS');
                return;
            }

            // Si ya está activo, detener
            if (gpsWatchId !== null) {
                console.log('[GPS] Deteniendo seguimiento...');
                navigator.geolocation.clearWatch(gpsWatchId);
                gpsWatchId = null;
                if (gpsIndicatorPrecision) {
                    window.map.removeControl(gpsIndicatorPrecision);
                    gpsIndicatorPrecision = null;
                }
                agregarBotonesExportarGPS();
                var btnGps = document.getElementById('btn-gps');
                if (btnGps) {
                    btnGps.textContent = '📍 GPS';
                    btnGps.style.background = '#4CAF50';
                }
                return;
            }

            console.log('[GPS] Limpiando capas anteriores...');

            // Limpiar todo
            if (gpsMarker) { window.map.removeLayer(gpsMarker); gpsMarker = null; }
            if (gpsPathLayer) { window.map.removeLayer(gpsPathLayer); gpsPathLayer = null; }
            if (gpsBotonMiUbicacion) { gpsBotonMiUbicacion.remove(); gpsBotonMiUbicacion = null; }
            if (gpsIndicatorPrecision) { window.map.removeControl(gpsIndicatorPrecision); gpsIndicatorPrecision = null; }

            gpsTrackCoords = [];
            gpsReintentos = 0;
            gpsIntentosInicial = 0;
            gpsUltimaPosicionBuena = null;

            // Crear polyline para el track
            gpsPathLayer = L.polyline([], {
                color: '#2196F3',
                weight: 5,
                opacity: 0.9
            }).addTo(window.map);

            console.log('[GPS] Solicitando posición inicial...');

            // Actualizar botón
            var btnGps = document.getElementById('btn-gps');
            if (btnGps) {
                btnGps.textContent = '⏳ Buscando...';
                btnGps.style.background = '#FF9800';
            }

            // Indicador en el mapa
            gpsIndicatorPrecision = L.control({ position: 'topright' });
            gpsIndicatorPrecision.onAdd = function(map) {
                this._div = L.DomUtil.create('div', 'gps-precision-indicator');
                this._div.style.cssText = 'background:white;padding:8px;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.3);font-size:12px;font-family:sans-serif;';
                this._div.innerHTML = '⏳ Buscando GPS...';
                return this._div;
            };
            gpsIndicatorPrecision.addTo(window.map);

            // Obtener posición inicial
            navigator.geolocation.getCurrentPosition(
                function(pos) {
                    var lat = pos.coords.latitude;
                    var lng = pos.coords.longitude;
                    var prec = pos.coords.accuracy;
                    var alt = pos.coords.altitude;

                    console.log('[GPS] POSICIÓN OBTENIDA: lat=' + lat + ', lng=' + lng + ', prec=' + prec + 'm, alt=' + alt);

                    // Confirmar con usuario
                    var confirmar = confirm('📍 Ubicación encontrada:\n\nLat: ' + lat.toFixed(6) + '\nLng: ' + lng.toFixed(6) + '\nPrecisión: ±' + Math.round(prec) + 'm\n\n¿Estás en esta posición?');

                    if (confirmar) {
                        // Iniciar seguimiento
                        gpsTrackCoords.push([lat, lng]);
                        gpsPathLayer.setLatLngs(gpsTrackCoords);

                        gpsMarker = L.marker([lat, lng], {
                            icon: L.divIcon({
                                className: 'gps-marker',
                                html: '<div style="background:#4CAF50;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
                                iconSize: [20, 20],
                                iconAnchor: [10, 10]
                            }),
                            zIndexOffset: 1000
                        }).addTo(window.map);

                        gpsMarker.bindPopup('<b>📍 Mi ubicación</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6) + '<br>Precisión: ±' + Math.round(prec) + 'm').openPopup();
                        gpsUltimaPosicionBuena = [lat, lng];

                        // Actualizar indicador
                        gpsIndicatorPrecision._div.innerHTML = '📍 GPS ACTIVO<br>Precisión: ±' + Math.round(prec) + 'm<br>Lat: ' + lat.toFixed(4) + '<br>Lng: ' + lng.toFixed(4);
                        gpsIndicatorPrecision._div.style.color = 'green';

                        // Actualizar botón
                        if (btnGps) {
                            btnGps.textContent = '📍 GPS ACTIVO';
                            btnGps.style.background = '#2196F3';
                        }

                        // Agregar botón Mi Ubicación
                        if (!gpsBotonMiUbicacion) {
                            var btn = document.createElement('button');
                            btn.id = 'btn-mi-ubicacion';
                            btn.innerHTML = '🎯 Mi Ubicación';
                            btn.style.cssText = 'margin-top:5px;padding:5px 10px;cursor:pointer;background:#673AB7;color:white;border:none;border-radius:3px;font-size:11px;width:100%;';
                            btn.onclick = function() {
                                if (gpsMarker) {
                                    window.map.setView(gpsMarker.getLatLng(), 17);
                                    gpsMarker.openPopup();
                                }
                            };
                            var gpsBox = document.getElementById('gps-box');
                            if (gpsBox) gpsBox.appendChild(btn);
                            gpsBotonMiUbicacion = btn;
                        }

                        // Centrar mapa
                        window.map.setView([lat, lng], 17);

                        // Iniciar seguimiento continuo
                        console.log('[GPS] Iniciando watchPosition...');

                        gpsWatchId = navigator.geolocation.watchPosition(
                            function(pos) {
                                var lat = pos.coords.latitude;
                                var lng = pos.coords.longitude;
                                var prec = pos.coords.accuracy;

                                console.log('[GPS] ACTUALIZACION: ' + lat + ', ' + lng + ' (±' + prec + 'm)');

                                gpsUltimaPosicionBuena = [lat, lng];
                                gpsTrackCoords.push([lat, lng]);
                                gpsPathLayer.setLatLngs(gpsTrackCoords);

                                if (gpsMarker) {
                                    gpsMarker.setLatLng([lat, lng]);
                                    gpsMarker.setPopupContent('<b>📍 Mi ubicación</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6) + '<br>Precisión: ±' + Math.round(prec) + 'm<br>Puntos: ' + gpsTrackCoords.length);
                                }

                                gpsIndicatorPrecision._div.innerHTML = '📍 GPS ACTIVO<br>Precisión: ±' + Math.round(prec) + 'm<br>Puntos: ' + gpsTrackCoords.length;
                                window.map.setView([lat, lng], 17);
                            },
                            function(err) {
                                console.log('[GPS] Error watch: ' + err.message);
                                gpsReintentos++;
                                if (gpsReintentos >= gpsMaxReintentos) {
                                    alert('⚠️ GPS perdió señal');
                                    navigator.geolocation.clearWatch(gpsWatchId);
                                    gpsWatchId = null;
                                    if (btnGps) {
                                        btnGps.textContent = '📍 GPS';
                                        btnGps.style.background = '#4CAF50';
                                    }
                                }
                            },
                            {
                                enableHighAccuracy: true,
                                timeout: 30000,
                                maximumAge: 0,
                                distanceFilter: 0
                            }
                        );
                    } else {
                        // Usuario rechaza - reintentar
                        console.log('[GPS] Usuario rechaza posición, reintentando...');
                        if (gpsIntentosInicial < gpsMaxIntentosInicial) {
                            gpsIntentosInicial++;
                            setTimeout(iniciarGPS, 2000);
                        } else {
                            alert('No se pudo obtener tu ubicación. Intenta de nuevo.');
                        }
                    }
                },
                function(err) {
                    console.log('[GPS] Error inicial: ' + err.message + ' código: ' + err.code);
                    var msg = '';
                    if (err.code === 1) msg = 'Permiso denegado. Activa en: Ajustes → Permisos → Ubicación';
                    else if (err.code === 2) msg = 'GPS desactivado. Actívalo en ajustes.';
                    else msg = 'Timeout. Intenta afuera y espera.';

                    alert('❌ Error GPS: ' + msg);

                    if (btnGps) {
                        btnGps.textContent = '📍 GPS';
                        btnGps.style.background = '#4CAF50';
                    }
                },
{
                    // FUERZA GPS PURO - ignora ubicación por red
                    enableHighAccuracy: true, 
                    timeout: 30000, 
                    maximumAge: 0
                }
            );
        }

        // Asignar botón
        var btnGps = document.getElementById('btn-gps');
        if (btnGps) {
            btnGps.addEventListener('click', iniciarGPS);
        }

        // Detectar si es Chrome móvil y mostrar advertencia
        (function() {
            var isChromeMobile = /Chrome/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
            var isEdgeMobile = /Edg/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent);
            
            if (isChromeMobile && !isEdgeMobile) {
                console.log('[GPS] Detectado Chrome móvil - puede haber problemas de ubicación');
                // Agregar advertencia en consola para el usuario
                console.log('%c⚠️ CHROME MÓVIL: Si el GPS no funciona bien, probá en Edge o desactivá "Vista de escritorio"', 'background: yellow; color: black; padding: 4px;');
            }
        })();

// Botón "Exportar Ruta" del HTML
        var btnExportGps = document.getElementById('btn-export-gps');
        if (btnExportGps) {
            btnExportGps.addEventListener('click', function() {
                if (!gpsTrackCoords || gpsTrackCoords.length === 0) {
                    alert('No hay track GPS para exportar. Inicia el GPS primero.');
                    return;
                }
                // Exportar como GeoJSON por defecto
                var geojson = { type: 'FeatureCollection', features: [{
                    type: 'Feature',
                    properties: { name: 'Track GPS', puntos: gpsTrackCoords.length },
                    geometry: { type: 'LineString', coordinates: gpsTrackCoords.map(function(c) { return [c[1], c[0]]; }) }
                }]};
                var blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'track_gps_' + Date.now() + '.geojson';
                link.click();
            });
        }
        
        // Función para agregar botones de exportar track GPS
        function agregarBotonesExportarGPS() {
            if (gpsTrackCoords.length === 0) return;
            
            var infoDiv = document.getElementById('controls');
            if (!infoDiv) return;
            
            // Verificar si ya existen los botones
            if (document.getElementById('gps-export-btns')) return;
            
            var exportDiv = document.createElement('div');
            exportDiv.id = 'gps-export-btns';
            exportDiv.style.cssText = 'margin-top:10px;padding:10px;background:#e3f2fd;border-radius:5px;';
            exportDiv.innerHTML = '<b>📍 Track GPS (' + gpsTrackCoords.length + ' puntos)</b><br>' +
                '<button id="btn-gps-gpx" style="margin:3px;padding:3px 8px;cursor:pointer;background:#4CAF50;color:white;border:none;border-radius:3px;">📥 GPX</button>' +
                '<button id="btn-gps-geojson" style="margin:3px;padding:3px 8px;cursor:pointer;background:#2196F3;color:white;border:none;border-radius:3px;">📥 GeoJSON</button>' +
                '<button id="btn-gps-txt" style="margin:3px;padding:3px 8px;cursor:pointer;background:#ff9800;color:white;border:none;border-radius:3px;">📥 TXT</button>' +
                '<button id="btn-gps-limpiar" style="margin:3px;padding:3px 8px;cursor:pointer;background:#f44336;color:white;border:none;border-radius:3px;">🗑️ Limpiar</button>';
            infoDiv.appendChild(exportDiv);
            
            // GPX
            document.getElementById('btn-gps-gpx').onclick = function() {
                var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1"><trk><name>Track GPS</name><trkseg>\n';
                gpsTrackCoords.forEach(function(c) {
                    gpx += '  <trkpt lat="' + c[0] + '" lon="' + c[1] + '"></trkpt>\n';
                });
                gpx += '</trkseg></trk></gpx>';
                var blob = new Blob([gpx], { type: 'application/gpx+xml' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'track_gps_' + Date.now() + '.gpx';
                link.click();
            };
            
            // GeoJSON
            document.getElementById('btn-gps-geojson').onclick = function() {
                var geojson = { type: 'FeatureCollection', features: [{
                    type: 'Feature',
                    properties: { name: 'Track GPS', puntos: gpsTrackCoords.length },
                    geometry: { type: 'LineString', coordinates: gpsTrackCoords.map(function(c) { return [c[1], c[0]]; }) }
                }]};
                var blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'track_gps_' + Date.now() + '.geojson';
                link.click();
            };
            
            // TXT
            document.getElementById('btn-gps-txt').onclick = function() {
                var txt = 'Latitud,Longitud\n';
                gpsTrackCoords.forEach(function(c) {
                    txt += c[0].toFixed(6) + ',' + c[1].toFixed(6) + '\n';
                });
                var blob = new Blob([txt], { type: 'text/plain' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'track_gps_' + Date.now() + '.csv';
                link.click();
            };
            
            // Limpiar
            document.getElementById('btn-gps-limpiar').onclick = function() {
                if (gpsMarker) { window.map.removeLayer(gpsMarker); gpsMarker = null; }
                if (gpsPathLayer) { window.map.removeLayer(gpsPathLayer); gpsPathLayer = null; }
                gpsTrackCoords = [];
                var exportDiv = document.getElementById('gps-export-btns');
                if (exportDiv) exportDiv.remove();
            };
        }

    window.addEventListener('load', function () {
        initMap();
    });

}(window));