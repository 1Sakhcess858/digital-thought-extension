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
    if (message.length > 10000) {
        return res.status(400).json({ error: 'Message too long (max 10000 characters).' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(unlock_date)) {
        return res.status(400).json({ error: 'Unlock date must be in YYYY-MM-DD format.' });
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
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid message id.' });
    }

    const { response } = req.body;

    if (response && response.length > 10000) {
        return res.status(400).json({ error: 'Response too long (max 10000 characters).' });
    }

    const sql = 'UPDATE future_messages SET response = ? WHERE id = ?';
    db.run(sql, [response, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Message not found.' });
        }
        res.json({ success: true });
    });
});
module.exports = router;