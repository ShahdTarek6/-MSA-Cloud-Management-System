const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '.');
const ISO_DIR = path.join(BACKEND_DIR, 'iso');

// Set max file size to 10GB
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;

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
  limits: {
    fileSize: MAX_FILE_SIZE // 10GB in bytes
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.iso')) {
      cb(null, true);
    } else {
      cb(new Error('Only .iso files are allowed'));
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds the limit of 10GB' });
    }
  }
  next(err);
};

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
router.post('/upload', upload.single('iso'), handleMulterError, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No ISO file uploaded' });
  }
  res.json({ 
    message: `ISO file ${req.file.originalname} uploaded successfully`,
    size: req.file.size,
    filename: req.file.filename
  });
});

module.exports = router;
