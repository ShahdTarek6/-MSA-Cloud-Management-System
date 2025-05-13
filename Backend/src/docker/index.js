const express = require('express');
const Docker = require('dockerode');
const router = express.Router();

// Initialize Docker client with platform-specific settings
let docker;
if (process.platform === "win32") {
    docker = new Docker({ socketPath: '\\\\.\\pipe\\docker_engine' });
} else {
    docker = new Docker({ socketPath: '/var/run/docker.sock' });
}

// Export docker instance for use in other modules
exports.docker = docker;

// Import Docker routes
const containerAPIs = require('./containerAPIs');
const imageAPIs = require('./imageAPIs');

// Mount Docker routes
router.use('/containers', containerAPIs);
router.use('/images', imageAPIs);

module.exports = router;
