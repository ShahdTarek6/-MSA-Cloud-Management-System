const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Create the default dockerfiles directory if it doesn't exist
const defaultDockerfilesDir = path.join(__dirname, 'dockerfiles');
fs.mkdirSync(defaultDockerfilesDir, { recursive: true });

// Helper functions
const handleError = (res, error) => {
    console.error('Dockerfile API Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Internal Server Error' });
};

// Validate path to prevent directory traversal
const validatePath = (basePath, filePath) => {
    const resolvedPath = path.resolve(basePath, filePath);
    return resolvedPath.startsWith(basePath) ? resolvedPath : null;
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

// Helper function to get directory tree
const getDirectoryTree = (dirPath) => {
    const stats = fs.statSync(dirPath);
    const name = path.basename(dirPath);

    if (!stats.isDirectory()) {
        return {
            name,
            path: dirPath,
            type: 'file'
        };
    }

    try {
        const items = fs.readdirSync(dirPath);
        const children = items
            .map(item => {
                const fullPath = path.join(dirPath, item);
                try {
                    // Skip node_modules, .git directories and hidden files
                    if (item === 'node_modules' || item === '.git' || item.startsWith('.')) {
                        return null;
                    }
                    return getDirectoryTree(fullPath);
                } catch (err) {
                    console.warn(`Skipping ${fullPath} due to error:`, err);
                    return null;
                }
            })
            .filter(item => item !== null)
            .sort((a, b) => {
                // Directories first, then files
                if (a.type === 'directory' && b.type !== 'directory') return -1;
                if (a.type !== 'directory' && b.type === 'directory') return 1;
                return a.name.localeCompare(b.name);
            });

        return {
            name,
            path: dirPath,
            type: 'directory',
            children
        };
    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
        return {
            name,
            path: dirPath,
            type: 'directory',
            error: err.message,
            children: []
        };
    }
};

// Get directory tree
router.get('/directory-tree', (req, res) => {
    try {
        // Start from the workspace root
        const workspaceRoot = process.cwd();
        const tree = getDirectoryTree(workspaceRoot);
        res.json([tree]); // Wrap in array to match frontend expectation
    } catch (error) {
        console.error('Error getting directory tree:', error);
        res.status(500).json({ message: error.message || 'Failed to get directory tree' });
    }
});

// List all Dockerfiles
router.get('/', async (req, res) => {
    try {
        // Get Dockerfiles from the default directory
        const dockerfiles = [];
        const files = await fs.promises.readdir(defaultDockerfilesDir, { withFileTypes: true });
        
        for (const file of files) {
            const fullPath = path.join(defaultDockerfilesDir, file.name);
            // Check for both Dockerfile and .dockerfile extension
            if (file.isFile() && (file.name.toLowerCase().endsWith('.dockerfile') || file.name.toLowerCase() === 'dockerfile')) {
                try {
                    const content = await fs.promises.readFile(fullPath, 'utf-8');
                    dockerfiles.push({
                        name: file.name,
                        filePath: fullPath,
                        absolutePath: fullPath,
                        content
                    });
                } catch (err) {
                    console.warn(`Error reading file ${fullPath}:`, err);
                }
            }
        }
        
        res.json(dockerfiles.filter(Boolean));
    } catch (error) {
        console.error('Error listing Dockerfiles:', error);
        res.status(500).json({ message: error.message || 'Failed to list Dockerfiles.' });
    }
});

// Get Dockerfile by name
router.get('/:name', async (req, res) => {
    try {
        const filePath = path.join(defaultDockerfilesDir, req.params.name);
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
            filePath = path.join(defaultDockerfilesDir, `Dockerfile_${Date.now()}.dockerfile`);
        }

        // Ensure the directory exists
        const dir = path.dirname(filePath);
        await fs.promises.mkdir(dir, { recursive: true });

        // Validate Dockerfile content
        const allErrors = validateDockerfile(content);
        const errors = allErrors.filter(e => !e.startsWith('Warning'));
        const warnings = allErrors.filter(e => e.startsWith('Warning'));

        if (errors.length) {
            return res.status(400).json({ errors });
        }

        await fs.promises.writeFile(filePath, content);
        res.status(201).json({
            message: 'Dockerfile created successfully',
            warnings,
            name: path.basename(filePath),
            filePath: filePath
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

        const filePath = path.join(defaultDockerfilesDir, req.params.name);
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
        const filePath = path.join(defaultDockerfilesDir, req.params.name);
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
