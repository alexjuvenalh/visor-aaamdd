const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Gzip/Brotli compression — reduce GeoJSON de 32 MB a ~4 MB
app.use(compression({
    level: 6,           // balance velocidad/compresión
    threshold: 1024,    // comprimir todo > 1 KB
    filter: function(req, res) {
        // Forzar compresión incluso en JSON grandes
        return compression.filter(req, res);
    }
}));

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Cache: 1 hora para estáticos, fuerza revalidación
const cacheOpts = {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    setHeaders: function(res, filePath) {
        // GeoJSON: cache más agresivo (cambian poco)
        if (filePath.endsWith('.json')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
};

// Serve static files from root
app.use(express.static(__dirname, cacheOpts));

// Handle SPA or direct file requests
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Visor GIS ANA Madre de Dios - http://localhost:${port}`);
    console.log('Compresión gzip activa | Cache 1h |:', __dirname);
});
