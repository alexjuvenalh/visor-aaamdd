const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_PORT = 3001;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Iniciar servidor de la API en segundo plano
const { spawn } = require('child_process');
const apiServer = spawn('node', ['server.js'], { cwd: 'api' });

apiServer.stdout.on('data', (data) => console.log('API: ' + data));
apiServer.stderr.on('data', (data) => console.error('API Error: ' + data));

// Servidor principal
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Si es una ruta de API, hacer proxy
  if (req.url.startsWith('/api/')) {
    const proxyReq = http.request({
      hostname: 'localhost',
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    req.pipe(proxyReq);
    return;
  }
  
  // Archivos estáticos
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        fs.readFile('./index.html', (err, c) => {
          if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(c, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor UI corriendo en http://localhost:${PORT}/`);
  console.log(`API proxy en http://localhost:${PORT}/api/*`);
});