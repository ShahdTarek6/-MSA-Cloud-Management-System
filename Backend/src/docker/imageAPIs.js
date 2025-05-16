const express = require('express');
const fs = require('fs');
const path = require('path');
const tar = require('tar-fs');
const { docker } = require('./index');
const router = express.Router();

// Helper functions
const bool = (v, d = false) => (v === undefined ? d : ['1', 'true', 'True', true].includes(v));
const handleError = (res, error) => {
    console.error('Docker API Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Internal Server Error' });
};

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

// Dockerfile Routes
const dockerfileRouter = express.Router();

// Create Dockerfile
dockerfileRouter.post('/', async (req, res) => {
    try {
        let { filePath, content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'content is required.' });
        }

        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        fs.mkdirSync(dockerfilesDir, { recursive: true });

        if (!filePath) {
            filePath = `Dockerfile_${Date.now()}`;
        }

        const finalPath = path.join(dockerfilesDir, path.basename(filePath));
        const allErrors = validateDockerfile(content);
        const errors = allErrors.filter(e => !e.startsWith('Warning'));
        const warnings = allErrors.filter(e => e.startsWith('Warning'));

        if (errors.length) {
            return res.status(400).json({ errors });
        }

        fs.writeFileSync(finalPath, content);
        return res.json({
            message: `Dockerfile written to ${finalPath}`,
            warnings
        });
    } catch (err) {
        console.error('Error creating Dockerfile:', err);
        return res.status(500).json({ message: err.message || 'Internal server error.' });
    }
});

// List Dockerfiles
dockerfileRouter.get('/', async (req, res) => {
    try {
        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        fs.mkdirSync(dockerfilesDir, { recursive: true });
        
        const files = fs.readdirSync(dockerfilesDir);
        const dockerfiles = files.map(file => ({
            filePath: path.join(dockerfilesDir, file),
            name: file
        }));
        
        res.json(dockerfiles);
    } catch (error) {
        console.error('Error listing Dockerfiles:', error);
        res.status(500).json({ message: error.message || 'Failed to list Dockerfiles.' });
    }
});

// View Dockerfile
dockerfileRouter.get('/:name', async (req, res) => {
    try {
        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        const fullPath = path.join(dockerfilesDir, req.params.name);
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ message: 'Dockerfile not found.' });
        }
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading Dockerfile:', error);
        handleError(res, error);
    }
});

// Update Dockerfile
dockerfileRouter.put('/:name', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ message: 'content is required.' });
        }
        
        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        const fullPath = path.join(dockerfilesDir, req.params.name);
        
        const errors = validateDockerfile(content);
        if (errors.some(e => !e.startsWith('Warning'))) {
            return res.status(400).json({ errors });
        }
        
        fs.writeFileSync(fullPath, content);
        res.json({ 
            message: 'Dockerfile updated successfully.',
            warnings: errors.filter(e => e.startsWith('Warning'))
        });
    } catch (error) {
        console.error('Error updating Dockerfile:', error);
        handleError(res, error);
    }
});

// Delete Dockerfile
dockerfileRouter.delete('/:name', async (req, res) => {
    try {
        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        const fullPath = path.join(dockerfilesDir, req.params.name);
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ message: 'Dockerfile not found.' });
        }
        
        fs.unlinkSync(fullPath);
        res.json({ message: 'Dockerfile deleted successfully.' });
    } catch (error) {
        console.error('Error deleting Dockerfile:', error);
        handleError(res, error);
    }
});

router.use('/dockerfile', dockerfileRouter);

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

        if (!content) {
            return res.status(400).json({ message: 'content is required.' });
        }

        // Use the dockerfiles directory
        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        fs.mkdirSync(dockerfilesDir, { recursive: true });

        // If no filePath is provided, generate a unique name
        if (!filePath) {
            filePath = `Dockerfile_${Date.now()}`;
        }

        // Ensure the file is created in the dockerfiles directory
        const finalPath = path.join(dockerfilesDir, path.basename(filePath));

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
        // Search for Dockerfiles in the workspace (recursive)
        const walk = (dir, filelist = []) => {
            fs.readdirSync(dir).forEach(file => {
                const filepath = path.join(dir, file);
                if (fs.statSync(filepath).isDirectory()) {
                    filelist = walk(filepath, filelist);
                } else if (file.toLowerCase().includes('dockerfile')) {
                    filelist.push({ filePath: filepath });
                }
            });
            return filelist;
        };
        const root = process.cwd();
        const dockerfiles = walk(root);
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
        
        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        const fullPath = path.join(dockerfilesDir, path.basename(filePath));
        
        if (!fs.existsSync(fullPath)) return res.status(404).json({ message: 'Dockerfile not found.' });
        const content = fs.readFileSync(fullPath, 'utf-8');
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
        
        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        const fullPath = path.join(dockerfilesDir, path.basename(filePath));
        
        const errors = validateDockerfile(content);
        if (errors.some(e => !e.startsWith('Warning'))) {
            return res.status(400).json({ errors });
        }
        fs.writeFileSync(fullPath, content);
        res.json({ message: 'Dockerfile updated successfully.', warnings: errors.filter(e => e.startsWith('Warning')) });
    } catch (error) {
        handleError(res, error);
    }
});

// Delete Dockerfile
router.delete('/dockerfile', async (req, res) => {
    try {
        const { filePath } = req.query;
        if (!filePath) {
            return res.status(400).json({ message: 'filePath is required.' });
        }
        
        const dockerfilesDir = path.join(__dirname, 'dockerfiles');
        // Ensure we only use the filename part, not the full path
        const filename = path.basename(filePath);
        const fullPath = path.join(dockerfilesDir, filename);
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ message: `Dockerfile "${filename}" not found.` });
        }
        
        fs.unlinkSync(fullPath);
        res.json({ message: `Dockerfile "${filename}" deleted successfully.` });
    } catch (error) {
        console.error('Error deleting Dockerfile:', error);
        handleError(res, error);
    }
});

// POST /build-image
router.post('/build-image', async (req, res) => {
    try {
        const { dockerfilePath, imageTag } = req.body;

        if (!dockerfilePath || !imageTag) {
            return res.status(400).json({ message: 'dockerfilePath and imageTag are required.' });
        }

        if (!fs.existsSync(dockerfilePath)) {
            return res.status(404).json({ message: `Path not found: ${dockerfilePath}` });
        }

        const isFile = fs.statSync(dockerfilePath).isFile();
        const contextPath = isFile ? path.dirname(dockerfilePath) : dockerfilePath;
        const dockerfileName = isFile ? path.basename(dockerfilePath) : 'Dockerfile';

        const tarStream = tar.pack(contextPath);

        const stream = await docker.buildImage(tarStream, {
            t: imageTag,
            dockerfile: dockerfileName
        });

        docker.modem.followProgress(stream, (err, output) => {
            if (err) {
                console.error('Docker build failed:', err);
                return res.status(500).json({ message: err.message || 'Build failed.' });
            }
            res.status(201).json({ message: `✅ Image '${imageTag}' built successfully.` });
        });

    } catch (error) {
        console.error('Build error:', error);
        res.status(500).json({ message: error.message || 'Internal server error.' });
    }
});


 
module.exports = router;
