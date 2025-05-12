const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Import QEMU routes
const VMAPIs = require('./VMAPIs');
const VDAPIs = require('./VDAPIs');

// Create necessary directories
const DISK_DIR = path.resolve(__dirname, '..', '..', '..', 'disks');
const ISO_DIR = path.resolve(__dirname, '..', '..', '..', 'iso');
const VM_DIR = path.resolve(__dirname, '..', '..', '..', 'vms');

[DISK_DIR, ISO_DIR, VM_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

// Mount QEMU routes
router.use('/vms', VMAPIs);
router.use('/disks', VDAPIs);

module.exports = router;
