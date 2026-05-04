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

        // Exponer mapa globalmente para otros scripts
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

        function getRadaFuente() {
            if (!rada_fuente_cluster && window.rada_por_fuente) {
                var rada_fuente = L.geoJson(window.rada_por_fuente, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: 6,
                            fillColor: '#0000ff',
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
                if (window.faja_poligono && window.faja_poligono.features) {
                    window.faja_poligono.features.forEach(function(f) {
                        var p = f.properties;
                        csv += '"Faja Marginal","' + (p.nombre_faja_marginal || '') + '","' + (p.numero_resolucion || '') + '","' + (p.distrito || '') + '"\n';
                    });
                }
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
            btnBuscar.addEventListener('click', function() {
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
            });
            inputBuscar.addEventListener('keypress', function(e) { 
                if (e.key === 'Enter') btnBuscar.click(); 
            });
        }

        // GPS
        var gpsMarker = null;
        var btnGps = document.getElementById('btn-gps');
        if (btnGps) {
            btnGps.addEventListener('click', function() {
                if (!navigator.geolocation) { alert('Tu navegador no soporta GPS'); return; }
                navigator.geolocation.getCurrentPosition(function(pos) {
                    var lat = pos.coords.latitude, lng = pos.coords.longitude, prec = pos.coords.accuracy;
                    if (gpsMarker) map.removeLayer(gpsMarker);
                    gpsMarker = L.marker([lat, lng], {
                        icon: L.divIcon({ className: 'gps-marker', html: '<div style="background:#2196F3;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>', iconSize: [20, 20], iconAnchor: [10, 10] })
                    }).addTo(map);
                    map.setView([lat, lng], 16);
                    gpsMarker.bindPopup('<b>📍 Tu ubicación</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6) + '<br>Precisión: ±' + Math.round(prec) + 'm').openPopup();
                }, function(err) { alert('Error GPS: ' + err.message); }, { enableHighAccuracy: true, timeout: 30000 });
            });
        }

        console.log('Visor ANA inicializado correctamente');
    }

    window.addEventListener('load', function () {
        initMap();
    });

}(window));