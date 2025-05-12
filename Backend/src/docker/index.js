const express = require('express');
const router = express.Router();

// Import Docker routes
const containerAPIs = require('./containerAPIs');
const imageAPIs = require('./imageAPIs');

// Mount Docker routes
router.use('/containers', containerAPIs);
router.use('/images', imageAPIs);

module.exports = router;
