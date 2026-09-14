const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// POST: Create a new thought
router.post('/', (req, res) => {
    const { type, content, thread_id } = req.body;

    if (!type || !content) {
        return res.status(400).json({ error: 'Type and content are required.' });
    }

    const sql = 'INSERT INTO thoughts (type, content, thread_id) VALUES (?, ?, ?)';
    db.run(sql, [type, content, thread_id || null], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, type, content, thread_id: thread_id || null });
    });
});

// GET: List all thoughts, each with its thread title if any
router.get('/', (req, res) => {
    const sql = `
        SELECT
            thoughts.id,
            thoughts.type,
            thoughts.content,
            thoughts.thread_id,
            thoughts.created_at,
            threads.title AS thread_title
        FROM thoughts
        LEFT JOIN threads ON thoughts.thread_id = threads.id
        ORDER BY thoughts.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// PATCH: Change a thought's thread assignment
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thought id.' });
    }

    const { thread_id } = req.body;

    const sql = 'UPDATE thoughts SET thread_id = ? WHERE id = ?';
    db.run(sql, [thread_id || null, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Thought not found.' });
        }
        res.json({ id, thread_id: thread_id || null });
    });
});

module.exports = router;