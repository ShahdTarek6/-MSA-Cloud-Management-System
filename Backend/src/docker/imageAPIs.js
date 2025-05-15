const express = require('express');
const { docker } = require('./index');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Helper functions
const bool = (v, d = false) => (v === undefined ? d : ['1', 'true', 'True', true].includes(v));
const handleError = (res, error) => {
    console.error('Docker API Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Internal Server Error' });
};

// Validate Dockerfile content
function validateDockerfile(content) {
    const errors = [];
    const lines = content.split(/\r?\n/).map(l => l.trim());
    const fromRegex = /^FROM\s+.+/i;
    const cmdRegex = /^CMD\s+/i;
    const dangerousRegex = /rm\s+-rf\s+\//i;
    const maxSize = 1024; // 1KB

    if (!lines[0] || !fromRegex.test(lines[0])) {
        errors.push('Dockerfile must start with a valid FROM instruction.');
    }
    if (dangerousRegex.test(content)) {
        errors.push("Dockerfile contains dangerous commands like 'rm -rf /'.");
    }
    if (content.length > maxSize) {
        errors.push('Dockerfile exceeds maximum allowed size (1KB).');
    }
    if (!lines.some(line => cmdRegex.test(line))) {
        errors.push('Warning: Dockerfile does not contain a CMD instruction.');
    }
    return errors;
}

// List images
router.get('/', async (req, res) => {
    try {
        const images = await docker.listImages({
            all: bool(req.query.all),
            digests: bool(req.query.digests),
            filters: req.query.filters ? JSON.parse(req.query.filters) : undefined
        });
        res.json(images);
    } catch (error) {
        handleError(res, error);
    }
});

// Get image details
router.get('/:name/json', async (req, res) => {
    try {
        const info = await docker.getImage(req.params.name).inspect();
        res.json(info);
    } catch (error) {
        handleError(res, error);
    }
});

// Get image history
router.get('/:name/history', async (req, res) => {
    try {
        const history = await docker.getImage(req.params.name).history();
        res.json(history);
    } catch (error) {
        handleError(res, error);
    }
});

// Create/Pull image
router.post('/create', async (req, res) => {
    try {
        const opts = {
            fromImage: req.query.fromImage,
            fromSrc: req.query.fromSrc,
            repo: req.query.repo,
            tag: req.query.tag,
            platform: req.query.platform || ''
        };

        // Handle registry authentication
        const auth = req.headers['x-registry-auth'];
        if (auth) {
            opts.authconfig = JSON.parse(Buffer.from(auth, 'base64').toString());
        }

        const stream = await docker.createImage(opts, req);
        stream.pipe(res);
    } catch (error) {
        handleError(res, error);
    }
});

// Pull image helper endpoint
router.post('/pull', async (req, res) => {
    try {
        if (!req.query.fromImage) {
            throw new Error('fromImage query param required');
        }
        const tag = req.query.tag ? `:${req.query.tag}` : '';
        const stream = await docker.pull(`${req.query.fromImage}${tag}`);
        stream.pipe(res);
    } catch (error) {
        handleError(res, error);
    }
});

// Tag image
router.post('/:name/tag', async (req, res) => {
    try {
        await docker.getImage(req.params.name).tag({
            repo: req.query.repo,
            tag: req.query.tag
        });
        res.sendStatus(201);
    } catch (error) {
        handleError(res, error);
    }
});

// Push image
router.post('/:name/push', async (req, res) => {
    try {
        const opts = { tag: req.query.tag };
        const auth = req.headers['x-registry-auth'];
        if (auth) {
            opts.authconfig = JSON.parse(Buffer.from(auth, 'base64').toString());
        }
        const stream = await docker.getImage(req.params.name).push(opts);
        stream.pipe(res);
    } catch (error) {
        handleError(res, error);
    }
});

// Delete image
router.delete('/:name', async (req, res) => {
    try {
        await docker.getImage(req.params.name).remove({
            force: bool(req.query.force),
            noprune: bool(req.query.noprune)
        });
        res.sendStatus(200);
    } catch (error) {
        handleError(res, error);
    }
});

// Search Docker Hub
router.get('/search', async (req, res) => {
    try {
        if (!req.query.term) {
            throw new Error('term query param required');
        }
        const opts = { 
            term: req.query.term,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            filters: req.query.filters ? JSON.parse(req.query.filters) : undefined
        };
        const results = await docker.searchImages(opts);
        res.json(results);
    } catch (error) {
        handleError(res, error);
    }
});

// Prune unused images
router.post('/prune', async (req, res) => {
    try {
        const opts = {
            filters: req.query.filters ? JSON.parse(req.query.filters) : undefined
        };
        const results = await docker.pruneImages(opts);
        res.json(results);
    } catch (error) {
        handleError(res, error);
    }
});

// Load images from tarball
router.post('/load', async (req, res) => {
    try {
        const stream = await docker.loadImage(req, {
            quiet: bool(req.query.quiet)
        });
        stream.pipe(res);
    } catch (error) {
        handleError(res, error);
    }
});

router.post('/dockerfile', async (req, res) => {
    try {
        let { filePath, content } = req.body;

        if (!filePath || !content) {
            return res.status(400).json({ message: 'filePath and content are required.' });
        }

        let finalPath = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(process.cwd(), filePath);

        const looksLikeDir =
            finalPath.endsWith(path.sep) ||
            !path.extname(finalPath) ||
            path.basename(finalPath).toLowerCase() === '';

        if (looksLikeDir || (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory())) {
            finalPath = path.join(finalPath, 'Dockerfile');
        }

        const allErrors = validateDockerfile(content);
        const errors = allErrors.filter(e => !e.startsWith('Warning'));
        const warnings = allErrors.filter(e => e.startsWith('Warning'));

        if (errors.length) {
            return res.status(400).json({ errors });
        }

        fs.mkdirSync(path.dirname(finalPath), { recursive: true });
        fs.writeFileSync(finalPath, content);

        return res.json({
            message: `Dockerfile written to ${finalPath}`,
            warnings
        });

    } catch (err) {
        console.error('Error writing Dockerfile:', err);
        return res.status(500).json({ message: err.message || 'Internal server error.' });
    }
});




// List Dockerfiles endpoint
router.get('/dockerfiles', async (req, res) => {
    try {
        const basePath = req.query.basePath || process.env.HOME || process.env.USERPROFILE || process.cwd();

        const walk = (dir, filelist = []) => {
            fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
                const filepath = path.join(dir, dirent.name);
                if (dirent.isDirectory()) {
                    try {
                        filelist = walk(filepath, filelist);
                    } catch (_) {}
                } else if (dirent.isFile() && dirent.name.toLowerCase().includes('dockerfile')) {
                    filelist.push({ filePath: filepath });
                }
            });
            return filelist;
        };

        const dockerfiles = walk(basePath);
        res.json(dockerfiles);
    } catch (error) {
        console.error('Error listing Dockerfiles:', error);
        res.status(500).json({ message: error.message || 'Failed to list Dockerfiles.' });
    }
});



// View Dockerfile content
router.get('/dockerfile', async (req, res) => {
    try {
        const { filePath } = req.query;
        if (!filePath) return res.status(400).json({ message: 'filePath is required.' });
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Dockerfile not found.' });
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ content });
    } catch (error) {
        handleError(res, error);
    }
});

// Edit Dockerfile
router.put('/dockerfile', async (req, res) => {
    try {
        const { filePath, content } = req.body;
        if (!filePath || !content) {
            return res.status(400).json({ message: 'filePath and content are required.' });
        }
        const errors = validateDockerfile(content);
        if (errors.some(e => !e.startsWith('Warning'))) {
            return res.status(400).json({ errors });
        }
        fs.writeFileSync(filePath, content);
        res.json({ message: 'Dockerfile updated successfully.', warnings: errors.filter(e => e.startsWith('Warning')) });
    } catch (error) {
        handleError(res, error);
    }
});

// Delete Dockerfile
router.delete('/dockerfile', async (req, res) => {
    try {
        const { filePath } = req.query;
        if (!filePath) return res.status(400).json({ message: 'filePath is required.' });
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Dockerfile not found.' });
        fs.unlinkSync(filePath);
        res.json({ message: 'Dockerfile deleted successfully.' });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;
