const express = require('express');
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

module.exports = router;
