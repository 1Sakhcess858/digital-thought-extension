const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// POST: Create a new thought
router.post('/', (req, res) => {
    const { type, content } = req.body;

    if (!type || !content) {
        return res.status(400).json({ error: 'Type and content are required.' });
    }

    const sql = 'INSERT INTO thoughts (type, content) VALUES (?, ?)';
    db.run(sql, [type, content], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, type, content });
    });
});

// GET: List all thoughts
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM thoughts ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

module.exports = router;