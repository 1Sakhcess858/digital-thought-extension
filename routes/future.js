const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// POST: Create a future message
router.post('/', (req, res) => {
    const { message, unlock_date } = req.body;

    if (!message || !unlock_date) {
        return res.status(400).json({ error: 'Message and unlock date are required.' });
    }

    const sql = 'INSERT INTO future_messages (message, unlock_date) VALUES (?, ?)';
    db.run(sql, [message, unlock_date], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message, unlock_date });
    });
});

// GET: List all future messages
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM future_messages ORDER BY unlock_date ASC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// PUT: Save a response
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { response } = req.body;

    const sql = 'UPDATE future_messages SET response = ? WHERE id = ?';
    db.run(sql, [response, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

module.exports = router;