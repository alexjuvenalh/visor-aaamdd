const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from root - with proper MIME types
app.use(express.static(__dirname, {
  index: ['index.html', 'index.htm'],
  etag: false,
  lastModified: false
}));

// Handle SPA or direct file requests - serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle other routes - try to serve static, fallback to index
app.use((req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  const fs = require('fs');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`Visor GIS ANA Madre de Dios - http://localhost:${port}`);
  console.log('Archivos estáticos sirviendo desde:', __dirname);
});