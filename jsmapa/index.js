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

        // Capa base
        var osm = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
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

        // FileLayer
        L.Control.FileLayerLoad.LABEL = '<img class="icon" src="imagenes/Folder.svg" alt="file icon"/>';
        var control = L.Control.fileLayerLoad({
            fitBounds: true,
            layerOptions: {
                style: polygonStyle,
                pointToLayer: function (data, latlng) {
                    return L.circleMarker(latlng, { style: pointStyle });
                }
            }
        });
        control.addTo(map);

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
            div.innerHTML += '<div><span style="background:#ff00ff;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> RADA Derecho</div>';
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
                        var camposImportantes = ['Uso', 'Usuario', 'Documento', 'Resolució', 'Fecha', 'Fuente', 'Lugar_Uso', 'Volumen (m', 'Area (ha)', 'ALA', 'AAA', 'Departamen', 'Provincia', 'Distrito'];
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

        var rada_derecho_cluster = null;

        function getRadaDerecho() {
            if (!rada_derecho_cluster && window.rada_por_derecho) {
                var rada_derecho = L.geoJson(window.rada_por_derecho, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: 6,
                            fillColor: '#ff00ff',
                            color: '#000',
                            weight: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: function(feature, layer) {
                        var p = feature.properties;
                        layer.bindPopup('<b>Usuario:</b> ' + sanitize(p.usuario));
                    }
                });

                rada_derecho_cluster = L.markerClusterGroup({
                    maxClusterRadius: 50
                });
                rada_derecho_cluster.addLayer(rada_derecho);
            }
            return rada_derecho_cluster;
        }

        // ============================================
        // EVENT LISTENERS
        // ============================================
        var checkBoxFaja = document.getElementById("chkFaja");
        var checkBoxHito = document.getElementById("chkHito");
        var checkBoxAut = document.getElementById("chkAut");
        var checkBoxRadaFuente = document.getElementById("chkRadaFuente");
        var checkBoxRadaDerecho = document.getElementById("chkRadaDerecho");

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

        if (checkBoxRadaDerecho) {
            checkBoxRadaDerecho.addEventListener("click", function() {
                if (checkBoxRadaDerecho.checked) {
                    var capa = getRadaDerecho();
                    if (capa) capa.addTo(map);
                } else {
                    var capa = getRadaDerecho();
                    if (capa) map.removeLayer(capa);
                }
            });
        }

        // Exportar
        var btnExportar = document.getElementById("btn-exportar");
        if (btnExportar) {
            btnExportar.addEventListener("click", function() {
                var csv = 'Capa,Nombre,Resolución,Distrito\n';
                // Faja marginal
                if (window.faja_poligono && window.faja_poligono.features) {
                    window.faja_poligono.features.forEach(function(f) {
                        var p = f.properties;
                        csv += '"Faja Marginal","' + (p.nombre_faja_marginal || '') + '","' + (p.numero_resolucion || '') + '","' + (p.distrito || '') + '"\n';
                    });
                }
                // Autorizaciones
                if (window.uso_temporal && window.uso_temporal.features) {
                    window.uso_temporal.features.forEach(function(f) {
                        var p = f.properties;
                        csv += '"Uso Temporal","' + (p.nombre_o_razon_social || '') + '","' + (p.numero_resolucion || '') + '","' + (p.distrito || '') + '"\n';
                    });
                }

                var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'visor_ana_datos.csv';
                link.click();
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

        function buscarPorResolucion() {
            var texto = inputBuscar.value.trim().toUpperCase();
            if (!texto) return;
            var resultados = [];
            if (window.faja_poligono && window.faja_poligono.features) {
                window.faja_poligono.features.forEach(function(f) {
                    if (f.properties && f.properties.numero_resolucion && f.properties.numero_resolucion.toUpperCase().includes(texto)) {
                        resultados.push({ tipo: 'Faja Marginal', data: f });
                    }
                });
            }
            if (window.faja_hito && window.faja_hito.features) {
                window.faja_hito.features.forEach(function(f) {
                    if (f.properties && f.properties.numero_resolucion && f.properties.numero_resolucion.toUpperCase().includes(texto)) {
                        resultados.push({ tipo: 'Hito', data: f });
                    }
                });
            }
            if (window.uso_temporal && window.uso_temporal.features) {
                window.uso_temporal.features.forEach(function(f) {
                    if (f.properties && f.properties.numero_resolucion && f.properties.numero_resolucion.toUpperCase().includes(texto)) {
                        resultados.push({ tipo: 'Uso Temporal', data: f });
                    }
                });
            }
            if (resultados.length === 0) { alert('No se encontró: ' + inputBuscar.value); return; }
            var feature = resultados[0].data;
            var layer = L.geoJson(feature);
            var bounds = layer.getBounds();
            var mapa = window.map;
            if (!mapa) { alert('Mapa no inicializado'); return; }
            if (bounds.isValid()) { mapa.fitBounds(bounds, { padding: [50, 50] }); }
            else if (feature.geometry.type === 'Point') { var c = feature.geometry.coordinates; mapa.setView([c[1], c[0]], 15); }
        }

        // GPS - Estilo Google Earth - Seguimiento en tiempo real
        var gpsMarker = null;
        var gpsTrack = null;
        var gpsWatchId = null;
        var gpsTrackCoords = [];
        var gpsPathLayer = null;
        var gpsReintentos = 0;
        var gpsMaxReintentos = 10;
        var gpsEstado = 'inactivo';
        var gpsPrecisionMinima = 100;
        var gpsUltimaPosicionBuena = null;
        var gpsBotonMiUbicacion = null;
        var gpsIntentosInicial = 0;
        var gpsMaxIntentosInicial = 5;

        // Función para crear marker de ubicación
        function crearMarkerGPS(lat, lng, precision) {
            var color = '#4CAF50';
            if (precision > 50) color = '#FF9800';
            if (precision > 100) color = '#f44336';

            return L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'gps-marker-container',
                    html: '<div style="position:relative;">' +
                        '<div style="background:' + color + ';width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>' +
                        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;background:white;border-radius:50%;"></div>' +
                        '</div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                }),
                zIndexOffset: 1000
            });
        }

        // Indicador de precisión
        var gpsIndicatorPrecision = null;
        function actualizarIndicadorPrecision(precision) {
            if (!gpsIndicatorPrecision) {
                gpsIndicatorPrecision = L.control({ position: 'topright' });
                gpsIndicatorPrecision.onAdd = function(map) {
                    this._div = L.DomUtil.create('div', 'gps-precision-indicator');
                    this._div.style.cssText = 'background:white;padding:5px 10px;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.3);font-size:12px;font-family:sans-serif;';
                    return this._div;
                };
                gpsIndicatorPrecision.addTo(window.map);
            }
            var color = 'green';
            if (precision > 50) color = 'orange';
            if (precision > 100) color = 'red';
            gpsIndicatorPrecision._div.innerHTML = '📍 Precisión: ±' + Math.round(precision) + 'm';
            gpsIndicatorPrecision._div.style.color = color;
        }

        // Función para mostrar estado
        function actualizarEstadoGPS(estado, mensaje) {
            gpsEstado = estado;
            console.log('[GPS] ' + estado + ': ' + mensaje);
            var btnGps = document.getElementById('btn-gps');
            if (!btnGps) return;
            if (estado === 'buscando') {
                btnGps.textContent = '⏳ Buscando...';
                btnGps.style.background = '#FF9800';
            } else if (estado === 'activo') {
                btnGps.textContent = '📍 GPS ACTIVO';
                btnGps.style.background = '#2196F3';
            } else if (estado === 'esperando') {
                btnGps.textContent = '⏳ Mejorando...';
                btnGps.style.background = '#9C27B0';
            } else {
                btnGps.textContent = '📍 GPS';
                btnGps.style.background = '#4CAF50';
            }
        }

        // Botón Mi Ubicación
        function agregarBotonMiUbicacion() {
            if (gpsBotonMiUbicacion) return;
            var btn = document.createElement('button');
            btn.id = 'btn-mi-ubicacion';
            btn.innerHTML = '🎯 Mi Ubicación';
            btn.style.cssText = 'margin-top:5px;padding:5px 10px;cursor:pointer;background:#673AB7;color:white;border:none;border-radius:3px;font-size:11px;width:100%;';
            btn.onclick = function() {
                if (gpsMarker && gpsUltimaPosicionBuena) {
                    window.map.setView(gpsMarker.getLatLng(), 17);
                    gpsMarker.openPopup();
                }
            };
            var gpsBox = document.getElementById('gps-box');
            if (gpsBox) gpsBox.appendChild(btn);
            gpsBotonMiUbicacion = btn;
        }

        // Función para intentar obtener posición inicial - CON REINTENTOS
        function obtenerPosicionInicialConReintentos() {
            gpsIntentosInicial++;
            console.log('[GPS] Intento de posición inicial: ' + gpsIntentosInicial + '/' + gpsMaxIntentosInicial);
            actualizarEstadoGPS('buscando', 'Intento ' + gpsIntentosInicial + '...');

            navigator.geolocation.getCurrentPosition(
                function(pos) {
                    // Éxito
                    var lat = pos.coords.latitude;
                    var lng = pos.coords.longitude;
                    var prec = pos.coords.accuracy;
                    console.log('[GPS] Posición obtenida: ' + lat + ', ' + lng + ' (±' + prec + 'm)');
                    iniciarSeguimientoGPS(lat, lng, prec);
                },
                function(err) {
                    // Error - reintentar automáticamente
                    console.log('[GPS] Error: ' + err.message + ' (código: ' + err.code + ')');
                    if (gpsIntentosInicial < gpsMaxIntentosInicial) {
                        console.log('[GPS] Reintentando en 2 segundos...');
                        actualizarEstadoGPS('buscando', 'Reintentando...');
                        setTimeout(obtenerPosicionInicialConReintentos, 2000);
                    } else {
                        // Máximo de intentos alcanzado
                        var msg = '';
                        if (err.code === 1) {
                            msg = '❌ PERMISO DENEGADO\n\nPara activar:\n• Chrome: Toca 🔒 → Ubicación → Permitir\n• O: Ajustes → Apps → Visor → Permisos → Ubicación';
                        } else if (err.code === 2) {
                            msg = '❌ GPS DESACTIVADO\n\nActiva el GPS:\n• Desliza desde arriba → toca icono de ubicación\n• O: Ajustes → Ubicación → ACTIVAR';
                        } else {
                            msg = '⏱️ TIMEOUT\n\nEl GPS tardó demasiado.\n\nIntenta:\n• Ir afuera\n• Activar y desactivar GPS\n• Esperar unos segundos';
                        }
                        alert(msg);
                        actualizarEstadoGPS('inactivo', 'Error - sin señal');
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 30000, // 30 segundos por intento
                    maximumAge: 0
                }
            );
        }

        // Función para iniciar seguimiento continuo
        function iniciarSeguimientoGPS(lat, lng, prec) {
            console.log('[GPS] Iniciando seguimiento con posición: ' + lat + ', ' + lng);

            // Agregar primer punto
            gpsTrackCoords.push([lat, lng]);
            gpsPathLayer.setLatLngs(gpsTrackCoords);

            // Crear marker
            gpsMarker = crearMarkerGPS(lat, lng, prec);
            gpsMarker.addTo(window.map);
            gpsMarker.bindPopup('<b>📍 Mi ubicación</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6) + '<br>Precisión: ±' + Math.round(prec) + 'm');
            gpsMarker.openPopup();

            gpsUltimaPosicionBuena = [lat, lng];

            // Indicador de precisión
            actualizarIndicadorPrecision(prec);

            // Botón Mi Ubicación
            agregarBotonMiUbicacion();

            // Centrar mapa
            var zoom = prec > 100 ? 13 : (prec > 50 ? 15 : 17);
            window.map.setView([lat, lng], zoom);

            // Iniciar watchPosition
            actualizarEstadoGPS('activo', 'Seguiendo...');

            gpsWatchId = navigator.geolocation.watchPosition(
                function(pos) {
                    var lat = pos.coords.latitude;
                    var lng = pos.coords.longitude;
                    var prec = pos.coords.accuracy;

                    // Ignorar posiciones muy imprecisas
                    if (prec > gpsPrecisionMinima && gpsTrackCoords.length > 0) {
                        console.log('[GPS] Ignorando posición imprecisa: ' + prec + 'm');
                        actualizarEstadoGPS('esperando', 'Precisión: ±' + Math.round(prec) + 'm');
                        actualizarIndicadorPrecision(prec);
                        return;
                    }

                    console.log('[GPS] Track: ' + lat + ', ' + lng + ' (±' + prec + 'm)');

                    gpsUltimaPosicionBuena = [lat, lng];
                    gpsTrackCoords.push([lat, lng]);
                    gpsPathLayer.setLatLngs(gpsTrackCoords);

                    if (gpsMarker) {
                        gpsMarker.setLatLng([lat, lng]);
                        gpsMarker.setPopupContent('<b>📍 Mi ubicación</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6) + '<br>Precisión: ±' + Math.round(prec) + 'm<br>Puntos: ' + gpsTrackCoords.length);
                    }

                    actualizarIndicadorPrecision(prec);
                    window.map.setView([lat, lng], 17);
                    actualizarEstadoGPS('activo', gpsTrackCoords.length + ' puntos');
                },
                function(err) {
                    console.log('[GPS] Error seguimiento: ' + err.message);
                    gpsReintentos++;
                    if (gpsReintentos < gpsMaxReintentos) {
                        console.log('[GPS] Reintentando seguimiento... (' + gpsReintentos + ')');
                    } else {
                        alert('⚠️ GPS perdió señal. Se detuvo.');
                        navigator.geolocation.clearWatch(gpsWatchId);
                        gpsWatchId = null;
                        actualizarEstadoGPS('inactivo', 'Señal perdida');
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 60000,
                    maximumAge: 0,
                    distanceFilter: 0
                }
            );
        }

        // Función principal - iniciar GPS
        function iniciarGPS() {
            if (!navigator.geolocation) {
                alert('Tu navegador no soporta GPS');
                return;
            }

            // Si ya está activo, detener
            if (gpsWatchId !== null) {
                navigator.geolocation.clearWatch(gpsWatchId);
                gpsWatchId = null;
                actualizarEstadoGPS('inactivo', 'Detenido');
                if (gpsIndicatorPrecision) {
                    window.map.removeControl(gpsIndicatorPrecision);
                    gpsIndicatorPrecision = null;
                }
                agregarBotonesExportarGPS();
                return;
            }

            // Limpiar
            if (gpsMarker) { window.map.removeLayer(gpsMarker); gpsMarker = null; }
            if (gpsPathLayer) { window.map.removeLayer(gpsPathLayer); gpsPathLayer = null; }
            if (gpsBotonMiUbicacion) { gpsBotonMiUbicacion.remove(); gpsBotonMiUbicacion = null; }
            if (gpsIndicatorPrecision) {
                window.map.removeControl(gpsIndicatorPrecision);
                gpsIndicatorPrecision = null;
            }
            gpsTrackCoords = [];
            gpsReintentos = 0;
            gpsIntentosInicial = 0;
            gpsUltimaPosicionBuena = null;

            // Crear track
            gpsPathLayer = L.polyline([], {
                color: '#2196F3',
                weight: 5,
                opacity: 0.9
            }).addTo(window.map);

            // Comenzar a obtener posición con reintentos
            obtenerPosicionInicialConReintentos();
        }

        // Event listener
        var btnGps = document.getElementById('btn-gps');
        if (btnGps) {
            btnGps.addEventListener('click', iniciarGPS);
        }
        
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