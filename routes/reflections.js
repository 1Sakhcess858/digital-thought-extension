const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// POST: Save a reflection
router.post('/', (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required.' });
    }
    if (content.length > 10000) {
        return res.status(400).json({ error: 'Content too long (max 10000 characters).' });
    }
    const sql = 'INSERT INTO reflections (content) VALUES (?)';
    db.run(sql, [content], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, content });
    });
});

// GET: List all reflections
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM reflections ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

module.exports = router;