(function (window) {
    'use strict';

    // Constante para URLs de archivos PDF del ANA
    var ANA_BASE_URL = '' + ANA_BASE_URL + '';

    function sanitize(str) {
        if (str == null) return '';
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    // ============================================
    // MODO ONLINE/OFFLINE - Fase 2: Carga Inteligente
    // ============================================
    
    // Clave para localStorage
    var STORAGE_KEY = 'visor_ana_datos';
    var STORAGE_FECHA_KEY = 'visor_ana_fecha';

    // Guardar datos en localStorage
    function guardarEnCache(datos) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
            localStorage.setItem(STORAGE_FECHA_KEY, new Date().toISOString());
            console.log('✅ Datos guardados en caché local');
        } catch (e) {
            console.warn('⚠️ No se pudo guardar en cache:', e.message);
        }
    }

    // Cargar datos desde localStorage
    function cargarDesdeCache() {
        try {
            var datos = localStorage.getItem(STORAGE_KEY);
            var fecha = localStorage.getItem(STORAGE_FECHA_KEY);
            if (datos) {
                var parsed = JSON.parse(datos);
                console.log('📦 Datos cargados desde caché local');
                if (fecha) {
                    console.log('   Fecha:', new Date(fecha).toLocaleString());
                    fechaDatosOffline = fecha;
                    actualizarIndicadorFecha(fecha);
                }
                return parsed;
            }
        } catch (e) {
            console.warn('⚠️ Error leyendo caché:', e.message);
        }
        return null;
    }

    // Función para cargar todos los datos de forma inteligente
    function cargarDatosInteligente(callback) {
        // Si está offline, usar cache o datos embebidos
        if (!navigator.onLine) {
            console.log('📴Modo offline - buscando datos...');
            var datosCache = cargarDesdeCache();
            if (datosCache) {
                window.faja_poligono = datosCache.faja_poligono || window.faja_poligono;
                window.faja_hito = datosCache.faja_hito || window.faja_hito;
                window.uso_temporal = datosCache.uso_temporal || window.uso_temporal;
                window.rada_por_fuente = datosCache.rada_por_fuente || window.rada_por_fuente;
                window.rada_por_derecho = datosCache.rada_por_derecho || window.rada_por_derecho;
                console.log('✅ Datos cargados desde caché');
                if (callback) callback();
                return;
            }
            // Si no hay cache, usar datos embebidos (ya definidos en HTML)
            console.log('📦 Usando datos embebidos (offline)');
            if (callback) callback();
            return;
        }

        // Si está online, intentar cargar de la API
        console.log('🌐 Modo online - intentando cargar de API...');
        
        var endpoints = [
            { key: 'faja_poligono', url: '/api/poligonos-faja' },
            { key: 'faja_hito', url: '/api/hitos-faja' },
            { key: 'uso_temporal', url: '/api/poligonos-autorizacion' },
            { key: 'rada_por_fuente', url: '/api/derechos' }, // temporal
            { key: 'rada_por_derecho', url: '/api/derechos' } // temporal
        ];

        var datosCargados = {};
        var errores = 0;
        var completados = 0;

        endpoints.forEach(function(ep) {
            fetch('http://localhost:3000' + ep.url)
                .then(function(r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function(data) {
                    datosCargados[ep.key] = data;
                    console.log('   ✅ ' + ep.key + ':', data.features ? data.features.length : 0);
                    completados++;
                    if (completados === endpoints.length) {
                        // Todos los datos cargados, guardar en cache y usar
                        window.faja_poligono = datosCargados.faja_poligono || window.faja_poligono;
                        window.faja_hito = datosCargados.faja_hito || window.faja_hito;
                        window.uso_temporal = datosCargados.uso_temporal || window.uso_temporal;
                        window.rada_por_fuente = datosCargados.rada_por_fuente || window.rada_por_fuente;
                        window.rada_por_derecho = datosCargados.rada_por_derecho || window.rada_por_derecho;
                        
                        // Guardar en cache
                        guardarEnCache(datosCargados);
                        
                        console.log('✅ Todos los datos cargados de API y guardados en caché');
                        if (callback) callback();
                    }
                })
                .catch(function(e) {
                    console.warn('   ⚠️ Error en ' + ep.key + ':', e.message);
                    errores++;
                    completados++;
                    // Usar datos embebidos si fallan
                    if (completados === endpoints.length) {
                        console.log('⚠️ Algunos datos fallaron, usando embebidos + cache');
                        var datosCache = cargarDesdeCache();
                        if (datosCache) {
                            window.faja_poligono = datosCache.faja_poligono || window.faja_poligono;
                            window.faja_hito = datosCache.faja_hito || window.faja_hito;
                            window.uso_temporal = datosCache.uso_temporal || window.uso_temporal;
                        }
                        if (callback) callback();
                    }
                });
        });
    }

    // Actualizar indicador con fecha de datos
    function actualizarIndicadorFecha(fecha) {
        var el = document.getElementById('online-indicator');
        if (el && fecha) {
            var fechaObj = new Date(fecha);
            var diasDiff = Math.floor((Date.now() - fechaObj.getTime()) / (1000 * 60 * 60 * 24));
            var mensajeFecha = '';
            if (diasDiff === 0) mensajeFecha = ' (hoy)';
            else if (diasDiff === 1) mensajeFecha = ' (ayer)';
            else mensajeFecha = ' (' + diasDiff + ' días)';
            
            // Agregarinfo de fecha al indicador
            el.title = 'Datos: ' + fechaObj.toLocaleString() + mensajeFecha;
        }
    }

    // Función para forzar actualización de datos
    function forzarActualizacion(callback) {
        console.log('🔄 Forzando actualización de datos...');
        // Limpiar cache
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_FECHA_KEY);
        } catch(e) {}
        
        // Recargar desde API
        cargarDatosInteligente(callback);
    }

    // Alias para compatibilidad
    var cargarDatosAPI = cargarDatosInteligente;

    // ============================================
    // FIN MODO ONLINE/OFFLINE - Fase 2
    // =========================================

    // ============================================
    // MODO ONLINE/OFFLINE - Fase 3: Sincronización
    // ============================================

    // Estado de sincronización
    var sincronizando = false;
    var btnSync = null;

    // Inicializar botón de sincronización
    function inicializarSync() {
        btnSync = document.getElementById('btn-sync');
        if (btnSync) {
            btnSync.addEventListener('click', function() {
                if (sincronizando) {
                    alert('⏳ Sincronización en progreso...');
                    return;
                }
                sincronizarDatos(function(actualizado) {
                    if (actualizado) {
                        alert('✅ Datos sincronizados correctamente');
                    } else {
                        alert('ℹ️ Los datos ya están actualizados o no hay cambios');
                    }
                });
            });
        }
    }

    // Función principal de sincronización
    function sincronizarDatos(callback) {
        if (!navigator.onLine) {
            alert('📴 No hay conexión a internet');
            if (callback) callback(false);
            return;
        }

        sincronizando = true;
        if (btnSync) {
            btnSync.innerHTML = '⏳...';
            btnSync.disabled = true;
        }

        console.log('🔄 Iniciando sincronización...');

        var endpoints = [
            { key: 'faja_poligono', url: '/api/poligonos-faja' },
            { key: 'faja_hito', url: '/api/hitos-faja' },
            { key: 'uso_temporal', url: '/api/poligonos-autorizacion' }
        ];

        var datosNuevos = {};
        var errores = 0;
        var completados = 0;

        endpoints.forEach(function(ep) {
            fetch('http://localhost:3000' + ep.url)
                .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                .then(function(data) {
                    datosNuevos[ep.key] = data;
                    console.log('   ✅ ' + ep.key + ':', data.features ? data.features.length : 0);
                    completados++;
                    verificarFinSync(completados, endpoints.length, datosNuevos, errores, callback);
                })
                .catch(function(e) {
                    console.warn('   ⚠️ Error en ' + ep.key + ':', e.message);
                    errores++;
                    completados++;
                    verificarFinSync(completados, endpoints.length, datosNuevos, errores, callback);
                });
        });
    }

    function verificarFinSync(completados, total, datos, errores, callback) {
        if (completados === total) {
            sincronizando = false;
            if (btnSync) { btnSync.innerHTML = '🔄 Sincronizar'; btnSync.disabled = false; }

            var hayCambios = false;
            var datosActuales = { faja_poligono: window.faja_poligono, faja_hito: window.faja_hito, uso_temporal: window.uso_temporal };

            Object.keys(datos).forEach(function(key) {
                var actual = datosActuales[key] ? datosActuales[key].features.length : 0;
                var nuevo = datos[key] ? datos[key].features.length : 0;
                if (actual !== nuevo) { console.log('📊 ' + key + ': ' + actual + ' → ' + nuevo); hayCambios = true; }
            });

            if (errores < total && hayCambios) {
                window.faja_poligono = datos.faja_poligono || window.faja_poligono;
                window.faja_hito = datos.faja_hito || window.faja_hito;
                window.uso_temporal = datos.uso_temporal || window.uso_temporal;
                guardarEnCache(datos);
                console.log('✅ Datos actualizados');
                mostrarNotificacion('✅ Datos sincronizados', 'success');
                if (callback) callback(true);
            } else if (errores === total) {
                mostrarNotificacion('❌ Error al sincronizar', 'error');
                if (callback) callback(false);
            } else { console.log('ℹ️ Sin cambios'); if (callback) callback(false); }
        }
    }

    // Verificar actualizaciones disponibles
    function verificarActualizaciones(callback) {
        if (!navigator.onLine) { if (callback) callback(false, 'Sin conexión'); return; }
        fetch('http://localhost:3000/api/estadisticas')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var fajasActual = window.faja_poligono ? window.faja_poligono.features.length : 0;
                var authActual = window.uso_temporal ? window.uso_temporal.features.length : 0;
                var hayCambios = (data.fajas_marginales !== fajasActual) || (data.autorizaciones_temporales !== authActual);
                var mensaje = 'Fajas: ' + fajasActual + '→' + data.fajas_marginales + ', Auth: ' + authActual + '→' + data.autorizaciones_temporales;
                if (callback) callback(hayCambios, hayCambios ? mensaje : 'Sin cambios');
            })
            .catch(function(e) { if (callback) callback(false, 'Error: ' + e.message); });
    }

    // Mostrar notificación temporal
    function mostrarNotificacion(mensaje, tipo) {
        var notif = document.createElement('div');
        notif.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:15px 20px;border-radius:8px;z-index:2000;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-weight:bold;animation:fadeIn 0.3s;';
        notif.style.background = (tipo === 'success' ? '#4CAF50' : (tipo === 'error' ? '#f44336' : '#2196F3'));
        notif.style.color = 'white';
        notif.innerHTML = mensaje;
        document.body.appendChild(notif);
        setTimeout(function() { notif.style.animation = 'fadeOut 0.3s'; setTimeout(function() { notif.remove(); }, 300); }, 3000);
    }

    // Agregar estilos
    if (!document.getElementById('notif-styles')) {
        var style = document.createElement('style');
        style.id = 'notif-styles';
        style.textContent = '@keyframes fadeIn {from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}} @keyframes fadeOut {from{opacity:1;transform:translateY(0);}to{opacity:0;transform:translateY(20px);}}';
        document.head.appendChild(style);
    }

    // ============================================
    // FIN MODO ONLINE/OFFLINE - Fase 3
    // =========================================

    // ============================================
    // MODO ONLINE/OFFLINE - Fase 1
    // ============================================
    var modoOnline = true;
    var indicadorOnline = null;
    var bannerOffline = null;
    var fechaDatosOffline = null;

    // Crear indicador de modo online/offline
    function crearIndicadorOnline() {
        if (!indicadorOnline) {
            indicadorOnline = L.control({ position: 'topright' });
            indicadorOnline.onAdd = function(map) {
                var div = L.DomUtil.create('div', 'online-indicator');
                div.id = 'online-indicator';
                div.style.cssText = 'background:rgba(76,175,80,0.9);color:white;padding:8px 15px;border-radius:20px;font-size:12px;font-weight:bold;box-shadow:0 2px 10px rgba(0,0,0,0.3);z-index:1000;display:flex;align-items:center;gap:5px;';
                div.innerHTML = '<span style="font-size:14px;">🌐</span> <span>Online</span>';
                return div;
            };
            indicadorOnline.addTo(map);
        }
    }

    // Actualizar indicador según estado
    function actualizarIndicadorOnline(online) {
        crearIndicadorOnline();
        var el = document.getElementById('online-indicator');
        if (el) {
            if (online) {
                el.style.background = 'rgba(76,175,80,0.9)';
                el.innerHTML = '<span style="font-size:14px;">🌐</span> <span>Online</span>';
            } else {
                el.style.background = 'rgba(158,158,158,0.9)';
                el.innerHTML = '<span style="font-size:14px;">📴</span> <span>Offline</span>';
            }
        }
        modoOnline = online;
        console.log('📡 Modo:', online ? 'Online' : 'Offline');
    }

    // Mostrar banner de offline
    function mostrarBannerOffline() {
        if (!bannerOffline) {
            bannerOffline = document.createElement('div');
            bannerOffline.id = 'banner-offline';
            bannerOffline.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(255,152,0,0.95);color:white;padding:12px;text-align:center;font-weight:bold;z-index:2000;display:none;';
            bannerOffline.innerHTML = '📴 Sin conexión - Usando datos offline';
            document.body.insertBefore(bannerOffline, document.body.firstChild);
        }
        bannerOffline.style.display = 'block';
        // Ajustar mapa si hay banner
        var mapEl = document.getElementById('map');
        if (mapEl) mapEl.style.marginTop = '44px';
    }

    // Ocultar banner de offline
    function ocultarBannerOffline() {
        if (bannerOffline) {
            bannerOffline.style.display = 'none';
        }
        var mapEl = document.getElementById('map');
        if (mapEl) mapEl.style.marginTop = '0';
    }

    // Inicializar detección de conexión
    function inicializarDeteccionOnline() {
        // Estado inicial
        actualizarIndicadorOnline(navigator.onLine);

        // Cargar datos de forma inteligente al inicio
        cargarDatosInteligente(function() {
            console.log('✅ Datos inicializados');
            // Verificar si hay datos en cache y mostrar fecha
            try {
                var fecha = localStorage.getItem(STORAGE_FECHA_KEY);
                if (fecha) actualizarIndicadorFecha(fecha);
            } catch(e) {}
        });

        // Escuchar cambios de conexión
        window.addEventListener('online', function() {
            console.log('✅ Conexión restaurada');
            actualizarIndicadorOnline(true);
            ocultarBannerOffline();
            // Intentar cargar datos frescos
            forzarActualizacion(function() {
                console.log('✅ Datos actualizados desde la API');
            });
        });

        window.addEventListener('offline', function() {
            console.log('⚠️ Conexión perdida');
            actualizarIndicadorOnline(false);
            mostrarBannerOffline();
        });
    }

    // Obtener fecha de datos offline
    function obtenerFechaDatos() {
        try {
            // Intentar leer metadata
            // Por ahora usamos una variable global si está disponible
            if (window.datosMeta && window.datosMeta.fecha_exportacion) {
                return window.datosMeta.fecha_exportacion;
            }
        } catch(e) {}
        return null;
    }

    // ============================================
    // FIN MODO ONLINE/OFFLINE
    // ============================================

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
                            content += '<b>Archivo:</b> <a target="_blank" href="' + ANA_BASE_URL + '' + sanitize(p.archivo) + '">📄 Ver PDF</a>';
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
                            content += '<b>Archivo:</b> <a target="_blank" href="' + ANA_BASE_URL + '' + sanitize(p.archivo) + '">📄 Ver PDF</a>';
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
                            content += '<b>Archivo:</b> <a target="_blank" href="' + ANA_BASE_URL + '' + sanitize(p.archivo) + '">📄 Ver PDF</a>';
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

        // ============================================
        // GPS - Seguimiento en tiempo real (Fase 1 + Fase 2)
        // ============================================
        var gpsMarker = null;
        var gpsWatchId = null;
        var gpsBtn = document.getElementById('btn-gps');
        var gpsIndicator = null;
        var gpsPath = null;
        var gpsPathShadow = null; // Sombra del trail
        var gpsPathCoords = [];
        var gpsInicioMarker = null; // Marker de inicio
        var gpsFinMarker = null; // Marker de posición actual
        var btnCentrar = null; // Botón flotante centrar
        var ultimaPosicion = null; // Para seguimiento
        
        // Variables Fase 4 - Mobile Optimization
        var gpsPerdidoTimeout = null; // Timer para detectar pérdida de señal
        var gpsUltimaActualizacion = Date.now(); // Para calcular timeout
        var gpsIntervaloActual = 1000; // Intervalo actual en ms
        var gpsEstaPerdido = false; // Estado de señal perdida
        var gpsUltimaVelocidad = 0; // Para calcular intervalo adaptativo
        var gpsContadorTimeouts = 0; // Contador de timeouts consecutivos

        // Crear indicador visual de GPS mejorado
        function crearIndicadorGPS() {
            if (!gpsIndicator) {
                gpsIndicator = L.control({ position: 'topright' });
                gpsIndicator.onAdd = function(map) {
                    var div = L.DomUtil.create('div', 'gps-status');
                    div.id = 'gps-status-indicator';
                    div.style.cssText = 'background:rgba(33,150,243,0.9);color:white;padding:10px 15px;border-radius:8px;font-size:12px;display:none;box-shadow:0 2px 10px rgba(0,0,0,0.3);z-index:1000;min-width:180px;';
                    div.innerHTML = '📡 Buscando GPS...';
                    return div;
                };
                gpsIndicator.addTo(map);
            }
        }

        function mostrarIndicador(mostrar, mensaje, precision) {
            crearIndicadorGPS();
            var el = document.getElementById('gps-status-indicator');
            if (el) {
                if (mostrar) {
                    el.style.display = 'block';
                    el.innerHTML = mensaje || '📡 Buscando GPS...';
                } else {
                    // Mostrar estado cuando está activo
                    if (precision !== undefined) {
                        var calidad = precision < 10 ? '🟢' : (precision < 25 ? '🟡' : '🔴');
                        el.innerHTML = '<b>GPS Activo</b><br/>' + calidad + ' ±' + Math.round(precision) + 'm';
                    }
                }
            }
        }

        // Crear botón flotante para centrar posición
        function crearBotonCentrar() {
            if (!btnCentrar) {
                btnCentrar = L.control({ position: 'bottomright' });
                btnCentrar.onAdd = function(map) {
                    var div = L.DomUtil.create('div', 'btn-centrar-gps');
                    div.id = 'btn-centrar-gps';
                    div.innerHTML = '🎯';
                    div.title = 'Centrar en mi posición';
                    div.style.cssText = 'background:white;width:40px;height:40px;border-radius:50%;border:2px solid #2196F3;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.3);z-index:1000;transition:transform 0.2s;';
                    div.onclick = function() {
                        if (ultimaPosicion) {
                            map.setView([ultimaPosicion.lat, ultimaPosicion.lng], 16);
                        }
                    };
                    div.onmouseover = function() { this.style.transform = 'scale(1.1)'; };
                    div.onmouseout = function() { this.style.transform = 'scale(1)'; };
                    return div;
                };
                btnCentrar.addTo(map);
                btnCentrar.hide = function() { 
                    var el = document.getElementById('btn-centrar-gps'); 
                    if (el) el.style.display = 'none'; 
                };
                btnCentrar.show = function() { 
                    var el = document.getElementById('btn-centrar-gps'); 
                    if (el) el.style.display = 'flex'; 
                };
                btnCentrar.hide();
            }
        }

        function obtenerIconoGPS(heading) {
            var rotation = heading !== null && !isNaN(heading) ? heading : 0;
            var tieneDireccion = heading !== null && !isNaN(heading);
            
            // Crear icono con flecha grande y visible
            var html = '<div style="width:50px;height:50px;position:relative;">';
            
            // Flecha de dirección (solo si hay heading)
            if (tieneDireccion) {
                html += '<div style="position:absolute;top:0;left:10px;width:0;height:0;border-left:15px solid transparent;border-right:15px solid transparent;border-bottom:30px solid #FF5722;transform:rotate(' + rotation + 'deg);transform-origin:center 30px;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.3));"></div>';
            }
            
            // Círculo principal con animación de pulso
            html += '<div style="background:linear-gradient(135deg,#2196F3,#1976D2);width:30px;height:30px;border-radius:50%;border:3px solid white;position:absolute;top:10px;left:10px;box-shadow:0 3px 8px rgba(0,0,0,0.4);animation:pulse 2s infinite;">' +
                    '<div style="width:10px;height:10px;background:white;border-radius:50%;position:absolute;top:7px;left:7px;"></div></div>';
            
            // Círculo de precisión
            html += '<div style="position:absolute;top:5px;left:5px;width:40px;height:40px;border:2px solid rgba(33,150,243,0.3);border-radius:50%;"></div>';
            
            html += '</div>';
            
            // Agregar CSS de animación si no existe
            if (!document.getElementById('gps-marker-css')) {
                var style = document.createElement('style');
                style.id = 'gps-marker-css';
                style.textContent = '@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }';
                document.head.appendChild(style);
            }
            
            return L.divIcon({
                className: 'gps-marker-animated',
                html: html,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
            });
        }

        // ============================================
        // Fase 4: Mobile Optimization
        // ============================================

        // Verificar permisos usando Permission API
        function verificarPermisosGPS() {
            return new Promise(function(resolve, reject) {
                // Verificar si la API de permisos está disponible
                if (navigator.permissions && navigator.permissions.query) {
                    navigator.permissions.query({ name: 'geolocation' })
                        .then(function(permissionStatus) {
                            if (permissionStatus.state === 'granted') {
                                resolve('granted');
                            } else if (permissionStatus.state === 'prompt') {
                                resolve('prompt');
                            } else {
                                resolve('denied');
                            }
                        })
                        .catch(function() {
                            resolve('unknown'); // API no soportada, continuar normalmente
                        });
                } else {
                    resolve('unknown'); // API no soportada
                }
            });
        }

        // Calcular intervalo adaptativo según velocidad
        function obtenerIntervaloAdaptativo(speed) {
            // Convertir m/s a km/h
            var speedKmh = speed * 3.6;
            
            if (speedKmh < 1) {
                // Estático o muy lento - actualizar cada 3 segundos
                return 3000;
            } else if (speedKmh < 10) {
                // Caminando - actualizar cada 1.5 segundos
                return 1500;
            } else if (speedKmh < 30) {
                // En bicicleta - actualizar cada 1 segundo
                return 1000;
            } else {
                // En vehículo - actualizar cada 500ms
                return 500;
            }
        }

        // Mostrar indicador de señal perdida
        function mostrarSenyalPerdida() {
            gpsEstaPerdido = true;
            crearIndicadorGPS();
            var el = document.getElementById('gps-status-indicator');
            if (el) {
                el.style.display = 'block';
                el.style.background = 'rgba(255,152,0,0.9)';
                el.innerHTML = '⚠️ GPS perdido<br/>Buscando señal...';
            }
            // Agregar marker de espera
            if (!gpsMarkerPerdido) {
                gpsMarkerPerdido = L.circleMarker([map.getCenter().lat, map.getCenter().lng], {
                    radius: 20,
                    fillColor: 'orange',
                    color: 'white',
                    weight: 2,
                    fillOpacity: 0.5,
                    className: 'gps-pulse-warning'
                }).addTo(map).bindPopup('⚠️ Buscando señal GPS...');
            }
            // Reproducir sonido de alerta (solo una vez)
            reproducirAlertaSonido();
        }

        // Recuperar señal
        function recuperarSenyal() {
            gpsEstaPerdido = false;
            gpsContadorTimeouts = 0;
            if (gpsMarkerPerdido) {
                map.removeLayer(gpsMarkerPerdido);
                gpsMarkerPerdido = null;
            }
        }

        var gpsMarkerPerdido = null; // Marker de señal perdida

        // ============================================
        // Fase 5: Exportación de rutas y alertas
        // ============================================

        // Generar archivo GPX de la ruta
        function exportarRutaGPX() {
            if (gpsPathCoords.length === 0) {
                alert('No hay ruta para exportar');
                return;
            }

            var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
            gpx += '<gpx version="1.1" creator="Visor ANA MDD">\n';
            gpx += '  <trk>\n';
            gpx += '    <name>Ruta GPS - ' + new Date().toLocaleString() + '</name>\n';
            gpx += '    <trkseg>\n';
            
            gpsPathCoords.forEach(function(coord) {
                gpx += '      <trkpt lat="' + coord[0] + '" lon="' + coord[1] + '"></trkpt>\n';
            });
            
            gpx += '    </trkseg>\n';
            gpx += '  </trk>\n';
            gpx += '</gpx>';

            var blob = new Blob([gpx], { type: 'application/gpx+xml' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'ruta_gps_' + Date.now() + '.gpx';
            link.click();
            console.log('✅ Ruta exportada a GPX');
        }

        // Generar archivo GeoJSON de la ruta
        function exportarRutaGeoJSON() {
            if (gpsPathCoords.length === 0) {
                alert('No hay ruta para exportar');
                return;
            }

            var geojson = {
                type: 'Feature',
                properties: {
                    name: 'Ruta GPS',
                    fecha: new Date().toISOString(),
                    puntos: gpsPathCoords.length
                },
                geometry: {
                    type: 'LineString',
                    coordinates: gpsPathCoords
                }
            };

            var blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'ruta_gps_' + Date.now() + '.geojson';
            link.click();
            console.log('✅ Ruta exportada a GeoJSON');
        }

        // Generar texto simple con coordenadas
        function exportarRutaTexto() {
            if (gpsPathCoords.length === 0) {
                alert('No hay ruta para exportar');
                return;
            }

            var texto = 'RUTA GPS - Visor ANA MDD\n';
            texto += 'Fecha: ' + new Date().toLocaleString() + '\n';
            texto += 'Puntos: ' + gpsPathCoords.length + '\n';
            texto += '------------------------\n\n';
            
            gpsPathCoords.forEach(function(coord, i) {
                texto += (i + 1) + '. ' + coord[0].toFixed(6) + ', ' + coord[1].toFixed(6) + '\n';
            });

            var blob = new Blob([texto], { type: 'text/plain' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'ruta_gps_' + Date.now() + '.txt';
            link.click();
            console.log('✅ Ruta exportada a TXT');
        }

        // Reproducir sonido de alerta
        function reproducirAlertaSonido() {
            try {
                // Crear un tono simple usando Web Audio API
                var AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    var audioCtx = new AudioContext();
                    var oscillator = audioCtx.createOscillator();
                    var gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota A5
                    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime + 0.2); // Nota A4
                    
                    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.5);
                }
            } catch (e) {
                console.log('Audio no disponible:', e);
            }
        }

        // Crear botón de exportación en el mapa
        function crearBotonExportar() {
            var btnExport = L.control({ position: 'bottomright' });
            btnExport.onAdd = function(map) {
                var div = L.DomUtil.create('div', 'btn-export-gps');
                div.id = 'btn-export-gps';
                div.innerHTML = '💾';
                div.title = 'Exportar ruta GPS';
                div.style.cssText = 'background:white;width:40px;height:40px;border-radius:50%;border:2px solid #4CAF50;cursor:pointer;font-size:18px;display:none;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.3);z-index:1000;';
                div.onclick = function() {
                    // Mostrar menú de opciones
                    var opciones = prompt('Selecciona formato de exportación:\n1 = GPX\n2 = GeoJSON\n3 = Texto', '1');
                    if (opciones === '1') exportarRutaGPX();
                    else if (opciones === '2') exportarRutaGeoJSON();
                    else if (opciones === '3') exportarRutaTexto();
                };
                div.onmouseover = function() { this.style.transform = 'scale(1.1)'; };
                div.onmouseout = function() { this.style.transform = 'scale(1)'; };
                return div;
            };
            btnExport.addTo(map);
            btnExport.mostrar = function() {
                var el = document.getElementById('btn-export-gps');
                if (el && gpsPathCoords.length > 0) el.style.display = 'flex';
            };
            btnExport.ocultar = function() {
                var el = document.getElementById('btn-export-gps');
                if (el) el.style.display = 'none';
            };
            btnExport.ocultar();
            return btnExport;
        }

        var gpsBtnExportar = null; // Referencia al botón de exportación
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            var prec = pos.coords.accuracy;
            var heading = pos.coords.heading;
            var speed = pos.coords.speed !== null ? pos.coords.speed : 0; // m/s
            var altitude = pos.coords.altitude; // metros

            // Resetear timeout de pérdida de señal
            if (gpsPerdidoTimeout) {
                clearTimeout(gpsPerdidoTimeout);
                gpsPerdidoTimeout = null;
            }
            gpsUltimaActualizacion = Date.now();
            gpsContadorTimeouts = 0;
            
            // Recuperar señal si estaba perdida
            if (gpsEstaPerdido) {
                recuperarSenyal();
            }
            
            // Actualizar velocidad para intervalo adaptativo
            gpsUltimaVelocidad = speed;

            // Guardar última posición para botón centrar
            ultimaPosicion = { lat: lat, lng: lng };

            // Agregar coordenadas al path
            gpsPathCoords.push([lat, lng]);
            
            // Crear o mejorar trail con estilo más visible
            if (gpsPath) {
                gpsPath.setLatLngs(gpsPathCoords);
            } else {
                // Trail principal (línea sólida)
                gpsPath = L.polyline(gpsPathCoords, {
                    color: '#2196F3',
                    weight: 5,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(map);
                
                // Trail sombra para mejor visibilidad
                gpsPathShadow = L.polyline(gpsPathCoords, {
                    color: 'white',
                    weight: 8,
                    opacity: 0.5
                }).addTo(map);
            }
            
            // Actualizar trail sombra también
            if (gpsPathShadow) {
                gpsPathShadow.setLatLngs(gpsPathCoords);
            }

            // Crear marcadores de inicio y fin
            var inicioMarker = null;
            var finMarker = null;
            
            // Marker de inicio (solo la primera vez)
            if (gpsPathCoords.length === 1 && !gpsInicioMarker) {
                gpsInicioMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    fillColor: '#4CAF50',
                    color: 'white',
                    weight: 2,
                    fillOpacity: 1
                }).bindPopup('🚩 Inicio').addTo(map);
            }
            
            // Marker de fin (siempre actualizar)
            if (gpsFinMarker) {
                map.removeLayer(gpsFinMarker);
            }
            gpsFinMarker = L.circleMarker([lat, lng], {
                radius: 6,
                fillColor: '#2196F3',
                color: 'white',
                weight: 2,
                fillOpacity: 1
            }).bindPopup('📍 Actual').addTo(map);

            // Crear o actualizar marker principal
            if (!gpsMarker) {
                gpsMarker = L.marker([lat, lng], {
                    icon: obtenerIconoGPS(heading),
                    zIndexOffset: 1000,
                    riseAngle: 0,
                    riseOnHover: true
                }).addTo(map);
            } else {
                // Animación suave de movimiento
                gpsMarker.setLatLng([lat, lng]);
                gpsMarker.setIcon(obtenerIconoGPS(heading));
            }

            // Calcular calidad
            var precisionTexto = prec < 10 ? 'Excelente' : (prec < 25 ? 'Buena' : (prec < 50 ? 'Regular' : 'Baja'));
            var precisionColor = prec < 10 ? 'green' : (prec < 25 ? '#8BC34A' : (prec < 50 ? 'orange' : 'red'));

            // Mostrar velocidad en km/h si está disponible
            var speedKmh = speed !== null ? (speed * 3.6).toFixed(1) : 'N/D';
            var altitudeText = altitude !== null ? altitude.toFixed(0) + ' m' : 'N/D';

            // Actualizar popup con información mejorada
            gpsMarker.bindPopup(
                '<div style="min-width:180px;font-size:12px;">' +
                '<b style="font-size:14px;">📍 Mi ubicación</b><br/>' +
                '<hr style="border:0;border-top:1px solid #ddd;margin:8px 0;">' +
                '<b>Lat:</b> ' + lat.toFixed(6) + '<br/>' +
                '<b>Lng:</b> ' + lng.toFixed(6) + '<br/>' +
                '<b>Altitud:</b> ' + altitudeText + '<br/>' +
                '<b>Velocidad:</b> ' + speedKmh + ' km/h<br/>' +
                '<hr style="border:0;border-top:1px solid #ddd;margin:8px 0;">' +
                '<b>Precisión:</b> ±' + Math.round(prec) + 'm<br/>' +
                '<b>Calidad:</b> <span style="color:' + precisionColor + ';font-weight:bold;">' + precisionTexto + '</span><br/>' +
                '<b>Puntos ruta:</b> ' + gpsPathCoords.length +
                '</div>'
            ).openPopup();

            // Mostrar botón centrar
            crearBotonCentrar();
            if (btnCentrar) btnCentrar.show();

            // Actualizar indicador con precisión
            mostrarIndicador(false, null, prec);

            // Actualizar botón GPS
            gpsBtn.innerHTML = '📍 GPS: ON';
            gpsBtn.style.background = '#f44336';

            // Configurar timeout para detectar pérdida de señal (5 segundos)
            gpsPerdidoTimeout = setTimeout(function() {
                gpsContadorTimeouts++;
                if (gpsContadorTimeouts >= 2 && !gpsEstaPerdido) {
                    mostrarSenyalPerdida();
                }
            }, 5000);

            // Mostrar botón de exportar si hay ruta
            if (!gpsBtnExportar) {
                gpsBtnExportar = crearBotonExportar();
            }
            gpsBtnExportar.mostrar();
        }

        function manejarErrorGPS(err) {
            gpsContadorTimeouts++;
            
            // Si hay muchos timeouts seguidos, mostrar advertencia
            if (gpsContadorTimeouts >= 3 && !gpsEstaPerdido) {
                mostrarSenyalPerdida();
            }
            
            // Solo mostrar error si es error de permisos o varios timeouts
            if (err.code === 1 || gpsContadorTimeouts >= 5) {
                mostrarIndicador(false);
                var mensajes = {
                    1: '❌ Permiso denegado. Habilita GPS en ajustes del navegador.',
                    2: '❌ Posición no disponible. Intenta de nuevo.',
                    3: '❌ Tiempo de espera agotado. Intenta de nuevo.',
                    0: '❌ Error desconocido: ' + err.message
                };
                var msg = mensajes[err.code] || mensajes[0];
                console.error('GPS Error:', msg);
                alert(msg);
                gpsBtn.innerHTML = '📍 GPS';
                gpsBtn.style.background = '#4CAF50';
                // Limpiar todos los elementos en caso de error
                if (gpsPath) { map.removeLayer(gpsPath); gpsPath = null; }
                if (gpsPathShadow) { map.removeLayer(gpsPathShadow); gpsPathShadow = null; }
                if (gpsInicioMarker) { map.removeLayer(gpsInicioMarker); gpsInicioMarker = null; }
                if (gpsFinMarker) { map.removeLayer(gpsFinMarker); gpsFinMarker = null; }
                if (gpsMarker) { map.removeLayer(gpsMarker); gpsMarker = null; }
                if (gpsMarkerPerdido) { map.removeLayer(gpsMarkerPerdido); gpsMarkerPerdido = null; }
                // Ocultar botón centrar en caso de error
                if (btnCentrar) btnCentrar.hide();
                if (gpsBtnExportar) gpsBtnExportar.ocultar();
                // Resetear contadores
                gpsContadorTimeouts = 0;
                gpsEstaPerdido = false;
            }
            // Si es solo timeout, no mostrar error, seguir intentando
        }

        if (gpsBtn) {
            gpsBtn.addEventListener('click', function() {
                if (!navigator.geolocation) {
                    alert('❌ Tu navegador no soporta GPS');
                    return;
                }

                // Si ya está activo, detener seguimiento
                if (gpsWatchId !== null) {
                    navigator.geolocation.clearWatch(gpsWatchId);
                    gpsWatchId = null;
                    gpsPathCoords = [];
                    
                    // Limpiar todos los elementos del GPS
                    if (gpsPath) {
                        map.removeLayer(gpsPath);
                        gpsPath = null;
                    }
                    if (gpsPathShadow) {
                        map.removeLayer(gpsPathShadow);
                        gpsPathShadow = null;
                    }
                    if (gpsInicioMarker) {
                        map.removeLayer(gpsInicioMarker);
                        gpsInicioMarker = null;
                    }
                    if (gpsFinMarker) {
                        map.removeLayer(gpsFinMarker);
                        gpsFinMarker = null;
                    }
                    if (gpsMarker) {
                        map.removeLayer(gpsMarker);
                        gpsMarker = null;
                    }
                    if (gpsMarkerPerdido) {
                        map.removeLayer(gpsMarkerPerdido);
                        gpsMarkerPerdido = null;
                    }
                    // Resetear contadores
                    gpsContadorTimeouts = 0;
                    gpsEstaPerdido = false;
                    if (gpsPerdidoTimeout) {
                        clearTimeout(gpsPerdidoTimeout);
                        gpsPerdidoTimeout = null;
                    }
                    
                    mostrarIndicador(false);
                    gpsBtn.innerHTML = '📍 GPS';
                    gpsBtn.style.background = '#4CAF50';
                    // Ocultar botón centrar
                    if (btnCentrar) btnCentrar.hide();
                    if (gpsBtnExportar) gpsBtnExportar.ocultar();
                    return;
                }

                // Iniciar seguimiento con watchPosition
                mostrarIndicador(true, '📡 Solicitando permisos GPS...');
                gpsBtn.innerHTML = '⏳...';
                
                // Resetear contadores
                gpsContadorTimeouts = 0;
                gpsEstaPerdido = false;
                gpsUltimaVelocidad = 0;
                
                // Verificar permisos primero (Permission API)
                verificarPermisosGPS().then(function(estadoPermiso) {
                    if (estadoPermiso === 'denied') {
                        alert('❌ Permiso de GPS denegado. Por favor habilítalo en los ajustes del navegador.');
                        gpsBtn.innerHTML = '📍 GPS';
                        gpsBtn.style.background = '#4CAF50';
                        mostrarIndicador(false);
                        return;
                    }
                    
                    // Iniciar seguimiento con watchPosition y opciones optimizadas
                    gpsWatchId = navigator.geolocation.watchPosition(
                        actualizarPosicion,
                        manejarErrorGPS,
                        {
                            enableHighAccuracy: true, // Precisión máxima
                            maximumAge: 0, // No usar posición en caché
                            timeout: 10000 // 10 segundos timeout
                        }
                    );
                    
                    console.log('GPS iniciado - Estado permisos:', estadoPermiso);
                });
            });
        }

        console.log('Visor ANA inicializado correctamente');
    }

    window.addEventListener('load', function () {
        // Inicializar detección online/offline primero
        inicializarDeteccionOnline();
        // Inicializar sincronización
        inicializarSync();
        // Luego inicializar el mapa
        initMap();
    });

}(window));