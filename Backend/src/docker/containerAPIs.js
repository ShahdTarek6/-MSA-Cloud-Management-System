const express = require('express');
const { docker } = require('./index');
const router = express.Router();

// Helper functions
const bool = (v, d = false) => (v === undefined ? d : ['1', 'true', 'True', true].includes(v));
const handleError = (res, error) => {
    console.error('Docker API Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Internal Server Error' });
};

// List containers with query parameters
router.get('/', async (req, res) => {
    try {
        const opts = {
            all: bool(req.query.all),
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            size: bool(req.query.size),
            filters: req.query.filters ? JSON.parse(req.query.filters) : undefined,
        };
        const containers = await docker.listContainers(opts);
        res.json(containers);
    } catch (error) {
        handleError(res, error);
    }
});

// Create container
router.post('/', async (req, res) => {
    try {
        const container = await docker.createContainer({
            ...req.body,
            name: req.query.name
        });
        res.status(201).json({ Id: container.id, Warnings: [] });
    } catch (error) {
        handleError(res, error);
    }
});

// Get container details
router.get('/:id', async (req, res) => {
    try {
        const container = docker.getContainer(req.params.id);
        const info = await container.inspect({
            size: bool(req.query.size)
        });
        res.json(info);
    } catch (error) {
        handleError(res, error);
    }
});

// Container actions (start, stop, restart, kill, pause, unpause)
['start', 'stop', 'restart', 'kill', 'pause', 'unpause'].forEach(action => {
    router.post(`/:id/${action}`, async (req, res) => {
        try {
            await docker.getContainer(req.params.id)[action]();
            res.sendStatus(204);
        } catch (error) {
            handleError(res, error);
        }
    });
});

// Rename container
router.post('/:id/rename', async (req, res) => {
    try {
        await docker.getContainer(req.params.id).rename({ name: req.query.name });
        res.sendStatus(204);
    } catch (error) {
        handleError(res, error);
    }
});

// Update container
router.post('/:id/update', async (req, res) => {
    try {
        await docker.getContainer(req.params.id).update(req.body);
        res.sendStatus(204);
    } catch (error) {
        handleError(res, error);
    }
});

// Delete container
router.delete('/:id', async (req, res) => {
    try {
        await docker.getContainer(req.params.id).remove({
            v: bool(req.query.v), // Remove volumes
            force: bool(req.query.force), // Force remove
            link: bool(req.query.link) // Remove links
        });
        res.sendStatus(204);
    } catch (error) {
        handleError(res, error);
    }
});

// Get container logs
router.get('/:id/logs', async (req, res) => {
    try {
        const opts = {
            follow: bool(req.query.follow),
            stdout: bool(req.query.stdout, true),
            stderr: bool(req.query.stderr, true),
            since: req.query.since ? Number(req.query.since) : 0,
            until: req.query.until ? Number(req.query.until) : 0,
            timestamps: bool(req.query.timestamps),
            tail: req.query.tail !== undefined ? req.query.tail : 'all'
        };
        const stream = await docker.getContainer(req.params.id).logs({...opts, stream: opts.follow });
        
        if (opts.follow) {
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            stream.pipe(res);
        } else {
            const chunks = [];
            stream.on('data', c => chunks.push(c));
            stream.on('end', () => res.type('text/plain').send(Buffer.concat(chunks)));
        }
    } catch (error) {
        handleError(res, error);
    }
});

// Get container stats
router.get('/:id/stats', async (req, res) => {
    try {
        const stream = await docker.getContainer(req.params.id)
            .stats({ stream: bool(req.query.stream, true) });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        stream.pipe(res);
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;
