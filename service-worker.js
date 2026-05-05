// ============================================
// Service Worker - Visor GIS ANA MDD
// Fase 4: Offline Real
// ============================================

const CACHE_NAME = 'visor-ana-v1';
const RUNTIME_CACHE = 'visor-ana-runtime';

// Archivos locales para funcionar offline
const CRITICAL_FILES = [
    '/',
    '/index.html',
    '/jsmapa/index.js',
    '/css/estilosmapa.css',
    '/css/celular.css',
    '/css/tablet.css',
    '/css/computadora.css',
    '/leaflet/leaflet.js',
    '/leaflet/leaflet.css',
    '/imagenes/logo.png',
    '/imagenes/favicon.png'
];

// URLs externas a cachear (CDN)
const EXTERNAL_URLS = [
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js',
    'https://unpkg.com/togeojson@0.16.0',
    'https://unpkg.com/leaflet-filelayer@1.2.0'
];

// ============================================
// Install - Guardar archivos críticos en caché
// ============================================
self.addEventListener('install', function(event) {
    console.log('📦 Service Worker: Instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('💾 Guardando archivos locales en caché...');
                return cache.addAll(CRITICAL_FILES);
            })
            .then(function() {
                // También cachear recursos externos
                console.log('🌐 Cacheando recursos externos...');
                return Promise.all(
                    EXTERNAL_URLS.map(function(url) {
                        return fetch(url, { mode: 'cors' })
                            .then(function(response) {
                                if (response.ok) {
                                    return cache.put(url, response);
                                }
                            })
                            .catch(function(e) {
                                console.warn('⚠️ No se pudo cachear:', url);
                            });
                    })
                );
            })
            .then(function() {
                console.log('✅ Archivos críticos y externos guardados');
                return self.skipWaiting(); // Activar inmediatamente
            })
            .catch(function(err) {
                console.error('❌ Error guardando archivos:', err);
            })
    );
});

// ============================================
// Activate - Limpiar cachés antiguos
// ============================================
self.addEventListener('activate', function(event) {
    console.log('🚀 Service Worker: Activando...');
    
    event.waitUntil(
        caches.keys()
            .then(function(cacheNames) {
                return Promise.all(
                    cacheNames
                        .filter(function(name) {
                            return name !== CACHE_NAME && name !== RUNTIME_CACHE;
                        })
                        .map(function(name) {
                            console.log('🗑️ Eliminando caché antiguo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(function() {
                console.log('✅ Service Worker activo');
                return self.clients.claim(); // Tomar control inmediatamente
            })
    );
});

// ============================================
// Fetch - Estrategia de caché
// ============================================
self.addEventListener('fetch', function(event) {
    var request = event.request;
    var url = new URL(request.url);

    // Ignorar requests no-http (chrome-extension, etc)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Estrategia para API - Network first, fall back to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(function(response) {
                    // Guardar respuesta en caché runtime
                    var responseClone = response.clone();
                    caches.open(RUNTIME_CACHE).then(function(cache) {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(function() {
                    // Si falla, intentar desde caché
                    return caches.match(request);
                })
        );
        return;
    }

    // Estrategia para recursos estáticos - Cache first, fall back to network
    var esRecursoEstatico = 
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.gif') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico') ||
        url.pathname.endsWith('.woff') ||
        url.pathname.endsWith('.woff2');

    if (esRecursoEstatico) {
        event.respondWith(
            caches.match(request)
                .then(function(response) {
                    if (response) {
                        return response;
                    }
                    // Si no está en caché, descargar y guardar
                    return fetch(request).then(function(response) {
                        var responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then(function(cache) {
                            cache.put(request, responseClone);
                        });
                        return response;
                    });
                })
        );
        return;
    }

    // Para HTML principal - Network first, then cache
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(request)
                .catch(function() {
                    return caches.match('/index.html');
                })
        );
        return;
    }

    // Para otros archivos - Cache first, then network
    event.respondWith(
        caches.match(request)
            .then(function(response) {
                return response || fetch(request);
            })
    );
});

// ============================================
// Mensajes desde la página
// ============================================
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// ============================================
// Background Sync (para cuando vuelva la conexión)
// ============================================
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-datos') {
        console.log('🔄 Sincronización en background...');
        // Aquí se podría implementar sincronización automática
    }
});

console.log('✅ Service Worker cargado');