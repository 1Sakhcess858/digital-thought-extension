const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// GET: Retrieve a setting by key
router.get('/:key', (req, res) => {
    const { key } = req.params;
    const sql = 'SELECT value FROM settings WHERE key = ?';
    db.get(sql, [key], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ key, value: row ? row.value : null });
    });
});

// POST: Save a setting
router.post('/', (req, res) => {
    const { key, value } = req.body;

    if (!key) {
        return res.status(400).json({ error: 'Key is required.' });
    }
    if (key.length > 100) {
        return res.status(400).json({ error: 'Key too long (max 100 characters).' });
    }
    if (value && value.length > 10000) {
        return res.status(400).json({ error: 'Value too long (max 10000 characters).' });
    }
    const sql = `
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `;
    db.run(sql, [key, value], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ key, value });
    });
});

module.exports = router;