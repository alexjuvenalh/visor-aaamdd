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

        // Exponer el mapa globalmente para funciones KML
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
            div.innerHTML += '<div style="margin-top:5px;padding-top:5px;border-top:1px solid #ccc;"><b>RADA Fuente:</b></div>';
            div.innerHTML += '<div><span style="background:#00FFFF;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Acuícola</div>';
            div.innerHTML += '<div><span style="background:#BFBF00;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Minero</div>';
            div.innerHTML += '<div><span style="background:#FF0000;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Poblacional</div>';
            div.innerHTML += '<div><span style="background:#00FF00;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Agrícola</div>';
            div.innerHTML += '<div><span style="background:#0080FF;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Doméstico</div>';
            div.innerHTML += '<div><span style="background:#8000FF;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Industrial</div>';
            div.innerHTML += '<div><span style="background:#808080;width:12px;height:12px;display:inline-block;margin-right:5px;border-radius:50%;"></span> Otros</div>';
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

        // Colores para categorización de RADA por Uso
        var coloresUsoRADA = {
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
                console.log('Creando capa RADA con', window.rada_por_fuente.features.length, 'features');
                
                // Debug primer feature
                console.log('Primer feature Uso:', window.rada_por_fuente.features[0].properties.Uso);
                console.log('ColoresRADA:', coloresUsoRADA);
                
                var rada_fuente = L.geoJson(window.rada_por_fuente, {
                    pointToLayer: function(feature, latlng) {
                        var uso = feature.properties.Uso || 'Otro';
                        console.log('Feature uso:', uso, 'color:', coloresUsoRADA[uso]);
                        var color = coloresUsoRADA[uso] || '#808080';
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
                        // Agregar todos los campos disponibles
                        for (var key in p) {
                            if (p[key] !== null && p[key] !== undefined && p[key] !== '') {
                                content += '<b>' + key + ':</b> ' + sanitize(String(p[key])) + '<br/>';
                            }
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

        // Buscar por número de resolución
        var btnBuscar = document.getElementById('btn-buscar');
        var inputBuscar = document.getElementById('buscar-input');
        if (btnBuscar && inputBuscar) {
            btnBuscar.addEventListener('click', buscarPorResolucion);
            inputBuscar.addEventListener('keypress', function(e) { if (e.key === 'Enter') buscarPorResolucion(); });

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
                if (bounds.isValid()) { map.fitBounds(bounds, { padding: [50, 50] }); }
                else if (feature.geometry.type === 'Point') { var c = feature.geometry.coordinates; map.setView([c[1], c[0]], 15); }
            }
        }

        // GPS con seguimiento en tiempo real
        var gpsMarker = null;
        var gpsWatchId = null;
        var gpsPathCoords = [];
        var gpsPathLine = null;
        var gpsBtn = document.getElementById('btn-gps');
        var gpsEstaActivo = false;
        var gpsIndicator = null;
        var btnCentrar = null;

        // Crear indicador de estado GPS
        function crearIndicadorGPS() {
            if (!gpsIndicator) {
                gpsIndicator = L.control({ position: 'topright' });
                gpsIndicator.onAdd = function(map) {
                    var div = L.DomUtil.create('div', 'gps-status');
                    div.id = 'gps-status-indicator';
                    div.style.cssText = 'background:rgba(33,150,243,0.9);color:white;padding:8px 12px;border-radius:6px;font-size:11px;display:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:1000;';
                    div.innerHTML = '📡 GPS...';
                    return div;
                };
                gpsIndicator.addTo(map);
            }
        }

        function mostrarIndicador(texto, precision) {
            crearIndicadorGPS();
            var el = document.getElementById('gps-status-indicator');
            if (el) {
                el.style.display = 'block';
                if (precision !== undefined) {
                    var color = precision < 15 ? '#4CAF50' : (precision < 30 ? '#FF9800' : '#f44336');
                    el.innerHTML = '<span style="color:' + color + '">●</span> <b>GPS Activo</b><br>±' + Math.round(precision) + 'm<br>Puntos: ' + gpsPathCoords.length;
                } else {
                    el.innerHTML = texto;
                }
            }
        }

        // Crear botón flotante para centrar
        function crearBotonCentrar() {
            if (!btnCentrar) {
                btnCentrar = L.control({ position: 'bottomright' });
                btnCentrar.onAdd = function(map) {
                    var div = L.DomUtil.create('div', 'btn-centrar');
                    div.id = 'btn-centrar-gps';
                    div.innerHTML = '🎯';
                    div.title = 'Centrar en mi posición';
                    div.style.cssText = 'background:white;width:36px;height:36px;border-radius:50%;border:2px solid #2196F3;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:1000;';
                    div.onclick = function() {
                        if (gpsPathCoords.length > 0) {
                            var ultimo = gpsPathCoords[gpsPathCoords.length - 1];
                            map.setView([ultimo[0], ultimo[1]], 16);
                        }
                    };
                    return div;
                };
                btnCentrar.addTo(map);
            }
        }

        // Actualizar posición
        function actualizarPosicion(pos) {
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            var prec = pos.coords.accuracy;
            var speed = pos.coords.speed || 0;

            // Guardar coordenadas
            gpsPathCoords.push([lat, lng]);

            // Crear o actualizar marcador
            if (gpsMarker) map.removeLayer(gpsMarker);

            var markerHtml = '<div style="background:#2196F3;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.4);position:relative;">' +
                '<div style="width:8px;height:8px;background:white;border-radius:50%;position:absolute;top:5px;left:5px;"></div></div>';

            gpsMarker = L.marker([lat, lng], {
                icon: L.divIcon({ className: 'gps-marker', html: markerHtml, iconSize: [24, 24], iconAnchor: [12, 12] })
            }).addTo(map);

            var speedKmh = speed ? Math.round(speed * 3.6) : 0;
            gpsMarker.bindPopup('<b>📍 Mi ubicación</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6) + '<br>Precisión: ±' + Math.round(prec) + 'm' + (speedKmh > 0 ? '<br>Velocidad: ' + speedKmh + ' km/h' : '')).openPopup();

            // Dibujar trayectoria
            if (gpsPathLine) map.removeLayer(gpsPathLine);
            gpsPathLine = L.polyline(gpsPathCoords, { color: '#2196F3', weight: 4, opacity: 0.7 }).addTo(map);

            // Actualizar indicador
            mostrarIndicador(null, prec);

            // Mostrar botón centrar
            if (btnCentrar) document.getElementById('btn-centrar-gps').style.display = 'flex';

            gpsEstaActivo = true;
        }

        // Manejar errores
        function manejarErrorGPS(err) {
            if (err.code === 1) alert('Permiso GPS denegado');
            else if (err.code === 2) alert('GPS no disponible');
            else if (err.code === 3) alert('Tiempo agotado');
            else alert('Error GPS: ' + err.message);
        }

        // Alternar GPS
        function toggleGPS() {
            if (!navigator.geolocation) { alert('Tu navegador no soporta GPS'); return; }

            if (gpsEstaActivo) {
                // Detener seguimiento
                if (gpsWatchId !== null) {
                    navigator.geolocation.clearWatch(gpsWatchId);
                    gpsWatchId = null;
                }
                gpsEstaActivo = false;
                gpsBtn.innerHTML = '📍 GPS';
                var el = document.getElementById('gps-status-indicator');
                if (el) el.style.display = 'none';
                alert('GPS detenido.\nTrayectoria: ' + gpsPathCoords.length + ' puntos');
            } else {
                // Iniciar seguimiento
                gpsPathCoords = [];
                gpsBtn.innerHTML = '⏹️ Detener';
                gpsWatchId = navigator.geolocation.watchPosition(actualizarPosicion, manejarErrorGPS, {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 30000
                });
            }
        }

        if (gpsBtn) {
            gpsBtn.addEventListener('click', toggleGPS);
            crearBotonCentrar();
        }

        // Exportar ruta GPS
        var btnExportGps = document.getElementById('btn-export-gps');
        if (btnExportGps) {
            btnExportGps.addEventListener('click', function() {
                if (gpsPathCoords.length === 0) {
                    alert('No hay trayectoria para exportar.\nIniciá el GPS primero.');
                    return;
                }

                var opciones = prompt('Exportar como:\n1 = GPX\n2 = GeoJSON\n3 = Texto\n(Ingresá 1, 2 o 3)', '1');
                if (!opciones) return;

                if (opciones === '1') {
                    // GPX
                    var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1"><trk><name>Ruta GPS</name><trkseg>\n';
                    gpsPathCoords.forEach(function(c) {
                        gpx += '<trkpt lat="' + c[0] + '" lon="' + c[1] + '"></trkpt>\n';
                    });
                    gpx += '</trkseg></trk></gpx>';
                    var blob = new Blob([gpx], { type: 'application/gpx+xml' });
                    var link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'ruta_gps_' + Date.now() + '.gpx';
                    link.click();
                    alert('✅ Ruta exportada a GPX');
                } else if (opciones === '2') {
                    // GeoJSON
                    var geojson = JSON.stringify({
                        type: 'Feature',
                        properties: { puntos: gpsPathCoords.length, fecha: new Date().toISOString() },
                        geometry: { type: 'LineString', coordinates: gpsPathCoords }
                    }, null, 2);
                    var blob = new Blob([geojson], { type: 'application/json' });
                    var link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'ruta_gps_' + Date.now() + '.geojson';
                    link.click();
                    alert('✅ Ruta exportada a GeoJSON');
                } else if (opciones === '3') {
                    // Texto
                    var texto = 'RUTA GPS - Visor ANA\nPuntos: ' + gpsPathCoords.length + '\nFecha: ' + new Date().toLocaleString() + '\n\n';
                    gpsPathCoords.forEach(function(c, i) {
                        texto += (i + 1) + '. ' + c[0].toFixed(6) + ', ' + c[1].toFixed(6) + '\n';
                    });
                    var blob = new Blob([texto], { type: 'text/plain' });
                    var link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'ruta_gps_' + Date.now() + '.txt';
                    link.click();
                    alert('✅ Ruta exportada a TXT');
                }
            });

        console.log('Visor ANA inicializado correctamente');
        console.log('Fajas disponibles:', window.faja_poligono?.features?.length || 0);
        console.log('Hitos disponibles:', window.faja_hito?.features?.length || 0);
        console.log('Autorizaciones disponibles:', window.uso_temporal?.features?.length || 0);
    }

    window.addEventListener('load', function () {
        initMap();
    });

}(window));