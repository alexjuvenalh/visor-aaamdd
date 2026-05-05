const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from root
app.use(express.static(__dirname, {
  index: ['index.html', 'index.htm']
}));

// Handle SPA or direct file requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Visor GIS ANA Madre de Dios - http://localhost:${port}`);
});