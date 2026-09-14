const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// POST: Create a new Echo
router.post('/', (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required.' });
    }
    if (content.length > 500) {
        return res.status(400).json({ error: 'Echo too long (max 500 characters).' });
    }
    const sql = 'INSERT INTO echoes (content) VALUES (?)';
    db.run(sql, [content], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, content });
    });
});

// GET: List all Echoes
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM echoes ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

module.exports = router;