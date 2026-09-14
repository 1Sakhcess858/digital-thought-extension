const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// POST: Create a new thread
router.post('/', (req, res) => {
    const { title, description } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required.' });
    }

    const sql = 'INSERT INTO threads (title, description) VALUES (?, ?)';
    db.run(sql, [title, description || ''], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, title, description });
    });
});

// GET: List all threads with thought counts
router.get('/', (req, res) => {
    const sql = `
        SELECT 
            threads.id,
            threads.title,
            threads.description,
            threads.created_at,
            COUNT(thoughts.id) AS thought_count
        FROM threads
               LEFT JOIN thoughts ON thoughts.thread_id = threads.id AND thoughts.deleted_at IS NULL
        GROUP BY threads.id
        ORDER BY threads.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

module.exports = router;