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
    const { id } = req.params;
    const { progress, next_action } = req.body;

    const sql = 'UPDATE goals SET progress = ?, next_action = ? WHERE id = ?';
    db.run(sql, [progress, next_action, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

module.exports = router;