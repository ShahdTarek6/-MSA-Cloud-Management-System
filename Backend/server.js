const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

// Import route modules
const dockerAPIs = require('./src/docker');
const { router: qemuAPIs } = require('./src/qemu');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../'));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'); 
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Mount API routes
app.use('/api/docker', dockerAPIs);
app.use('/api/qemu', qemuAPIs);

// Simple endpoint logging
app.use((req, res, next) => {
  if (!req.path.includes('favicon')) { // Ignore favicon requests
    console.log(`🔹 Endpoint hit: ${req.method} ${req.path}`);
  }
  next();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


