const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Create the dockerfiles directory if it doesn't exist
const dockerfilesDir = path.join(__dirname, 'dockerfiles');
fs.mkdirSync(dockerfilesDir, { recursive: true });

// Helper functions
const handleError = (res, error) => {
    console.error('Dockerfile API Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Internal Server Error' });
};

// Validate Dockerfile content
function validateDockerfile(content) {
    const errors = [];
    const lines = content.split(/\r?\n/).map(l => l.trim());
    const fromRegex = /^FROM\s+.+/i;
    const cmdRegex = /^CMD\s+/i;
    const dangerousRegex = /rm\s+-rf\s+\//i;
    const maxSize = 1024 * 10; // 10KB

    if (!lines[0] || !fromRegex.test(lines[0])) {
        errors.push('Dockerfile must start with a valid FROM instruction.');
    }
    if (dangerousRegex.test(content)) {
        errors.push("Dockerfile contains dangerous commands like 'rm -rf /'.");
    }
    if (content.length > maxSize) {
        errors.push('Dockerfile exceeds maximum allowed size (10KB).');
    }
    if (!lines.some(line => cmdRegex.test(line))) {
        errors.push('Warning: Dockerfile does not contain a CMD instruction.');
    }
    return errors;
}

// List all Dockerfiles
router.get('/', async (req, res) => {
    try {
        const files = await fs.promises.readdir(dockerfilesDir);
        const dockerfiles = await Promise.all(files.map(async file => {
            const filePath = path.join(dockerfilesDir, file);
            try {
                const content = await fs.promises.readFile(filePath, 'utf-8');
                return {
                    name: file,
                    filePath: path.relative(dockerfilesDir, filePath),
                    content
                };
            } catch (err) {
                console.warn(`Error reading file ${file}:`, err);
                return null;
            }
        }));
        
        // Filter out any null entries from failed reads
        res.json(dockerfiles.filter(Boolean));
    } catch (error) {
        handleError(res, error);
    }
});

// Get Dockerfile by name
router.get('/:name', async (req, res) => {
    try {
        const filePath = path.join(dockerfilesDir, req.params.name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Dockerfile not found' });
        }
        const content = await fs.promises.readFile(filePath, 'utf-8');
        res.json({ content });
    } catch (error) {
        handleError(res, error);
    }
});

// Create new Dockerfile
router.post('/', async (req, res) => {
    try {
        let { filePath, content } = req.body;

        if (!content) {
            return res.status(400).json({ message: 'content is required.' });
        }

        if (!filePath) {
            filePath = `Dockerfile_${Date.now()}`;
        }

        // Ensure we only use the filename part
        const filename = path.basename(filePath);
        const finalPath = path.join(dockerfilesDir, filename);

        // Validate Dockerfile content
        const allErrors = validateDockerfile(content);
        const errors = allErrors.filter(e => !e.startsWith('Warning'));
        const warnings = allErrors.filter(e => e.startsWith('Warning'));

        if (errors.length) {
            return res.status(400).json({ errors });
        }

        await fs.promises.writeFile(finalPath, content);
        res.status(201).json({
            message: `Dockerfile created successfully`,
            warnings,
            name: filename,
            filePath: filename
        });
    } catch (error) {
        handleError(res, error);
    }
});

// Update Dockerfile
router.put('/:name', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'content is required.' });
        }

        const filePath = path.join(dockerfilesDir, req.params.name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Dockerfile not found' });
        }

        // Validate Dockerfile content
        const allErrors = validateDockerfile(content);
        const errors = allErrors.filter(e => !e.startsWith('Warning'));
        const warnings = allErrors.filter(e => e.startsWith('Warning'));

        if (errors.length) {
            return res.status(400).json({ errors });
        }

        await fs.promises.writeFile(filePath, content);
        res.json({
            message: 'Dockerfile updated successfully',
            warnings
        });
    } catch (error) {
        handleError(res, error);
    }
});

// Delete Dockerfile
router.delete('/:name', async (req, res) => {
    try {
        const filePath = path.join(dockerfilesDir, req.params.name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Dockerfile not found' });
        }
        await fs.promises.unlink(filePath);
        res.json({ message: 'Dockerfile deleted successfully' });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;
