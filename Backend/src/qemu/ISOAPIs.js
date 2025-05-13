const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '.');
const ISO_DIR = path.join(BACKEND_DIR, 'iso');

// Configure multer for ISO uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, ISO_DIR);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.iso')) {
      cb(null, true);
    } else {
      cb(new Error('Only .iso files are allowed'));
    }
  }
});

// Ensure ISO directory exists
if (!fs.existsSync(ISO_DIR)) {
  fs.mkdirSync(ISO_DIR, { recursive: true });
  console.log(`Created directory: ${ISO_DIR}`);
}

// List ISO files
router.get('/list', (req, res) => {
  const files = fs.readdirSync(ISO_DIR).filter(file => file.toLowerCase().endsWith('.iso'));
  res.json(files);
});

// Upload ISO file
router.post('/upload', upload.single('iso'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No ISO file uploaded' });
  }
  res.json({ message: `ISO file ${req.file.originalname} uploaded successfully` });
});

module.exports = router;
