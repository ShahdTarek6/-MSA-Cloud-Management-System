const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const DOCKERFILES_DIR = path.join(__dirname, '../../dockerfiles'); // Adjust path as needed

// Helper functions
const sanitizePath = (filePath) => {
    // Prevent directory traversal
    const fullPath = path.resolve(DOCKERFILES_DIR, filePath);
    if (!fullPath.startsWith(DOCKERFILES_DIR)) throw new Error('Invalid file path');
    return fullPath;
};

const ensureDirExists = async (filePath) => {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
};

// List all Dockerfiles
router.get('/images/dockerfiles', async (req, res) => {
    try {
        const files = await fs.readdir(DOCKERFILES_DIR, { withFileTypes: true });
        const dockerfiles = [];

        for (const file of files) {
            const fullPath = path.join(DOCKERFILES_DIR, file.name);
            const content = await fs.readFile(fullPath, 'utf-8');
            dockerfiles.push({ filePath: file.name, content });
        }

        res.json(dockerfiles);
    } catch (error) {
        console.error('List error:', error);
        res.status(500).json({ message: 'Failed to list Dockerfiles' });
    }
});

// Create Dockerfile
router.post('/images/dockerfile', async (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath || !content) return res.status(400).json({ message: 'Missing filePath or content' });

    try {
        const fullPath = sanitizePath(filePath);
        await ensureDirExists(fullPath);
        await fs.writeFile(fullPath, content, 'utf-8');
        res.json({ message: 'Dockerfile created successfully' });
    } catch (error) {
        console.error('Create error:', error);
        res.status(500).json({ message: 'Failed to create Dockerfile' });
    }
});

// Update Dockerfile
router.put('/images/dockerfile', async (req, res) => {
    const { filePath, content } = req.body;
    if (!filePath || !content) return res.status(400).json({ message: 'Missing filePath or content' });

    try {
        const fullPath = sanitizePath(filePath);
        await fs.writeFile(fullPath, content, 'utf-8');
        res.json({ message: 'Dockerfile updated successfully' });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ message: 'Failed to update Dockerfile' });
    }
});

// Delete Dockerfile
router.delete('/images/dockerfile', async (req, res) => {
    const { filePath } = req.query;
    if (!filePath) return res.status(400).json({ message: 'Missing filePath' });

    try {
        const fullPath = sanitizePath(filePath);
        await fs.unlink(fullPath);
        res.json({ message: 'Dockerfile deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Failed to delete Dockerfile' });
    }
});

module.exports = router;
