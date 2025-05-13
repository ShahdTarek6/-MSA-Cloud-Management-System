const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Import QEMU routes
const VMAPIs = require('./VMAPIs');
const VDAPIs = require('./VDAPIs');
const ISOAPIs = require('./ISOAPIs');

// Create necessary directories relative to Backend folder
const BACKEND_DIR = path.resolve(__dirname, '.');
const DISK_DIR = path.join(BACKEND_DIR, 'disks');
const ISO_DIR = path.join(BACKEND_DIR, 'iso');
const VM_DIR = path.join(BACKEND_DIR, 'vms');

[DISK_DIR, ISO_DIR, VM_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

// Export directory paths for other modules to use
const paths = {
  DISK_DIR,
  ISO_DIR,
  VM_DIR
};

// Mount QEMU routes
router.use('/vms', VMAPIs);
router.use('/disks', VDAPIs);
router.use('/iso', ISOAPIs);

module.exports = { router, paths };
