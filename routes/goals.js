const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// POST: Create a new goal
router.post('/', (req, res) => {
    const { title, why, progress, next_action, thread_id } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
    }
    if (title.length > 200) {
        return res.status(400).json({ error: 'Title too long (max 200 characters).' });
    }
    if (why && why.length > 2000) {
        return res.status(400).json({ error: 'Why too long (max 2000 characters).' });
    }
    if (next_action && next_action.length > 2000) {
        return res.status(400).json({ error: 'Next action too long (max 2000 characters).' });
    }
    if (progress !== undefined && progress !== null) {
        const p = Number(progress);
        if (!Number.isInteger(p) || p < 0 || p > 100) {
            return res.status(400).json({ error: 'Progress must be an integer between 0 and 100.' });
        }
    }

    const sql = 'INSERT INTO goals (title, why, progress, next_action, thread_id) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [title, why || '', progress || 0, next_action || '', thread_id || null], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, title, why, progress, next_action, thread_id });
    });
});

// GET: List all goals
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM goals ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// PUT: Update a goal (progress and next action)
router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid goal id.' });
    }

    const { progress, next_action } = req.body;

    if (progress !== undefined && progress !== null) {
        const p = Number(progress);
        if (!Number.isInteger(p) || p < 0 || p > 100) {
            return res.status(400).json({ error: 'Progress must be an integer between 0 and 100.' });
        }
    }
    if (next_action && next_action.length > 2000) {
        return res.status(400).json({ error: 'Next action too long (max 2000 characters).' });
    }

    const sql = 'UPDATE goals SET progress = ?, next_action = ? WHERE id = ?';
    db.run(sql, [progress, next_action, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Goal not found.' });
        }
        res.json({ success: true });
    });
});
module.exports = router;