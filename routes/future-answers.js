const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// POST: Save a new 5-year answer
router.post('/', (req, res) => {
    const { text } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text is required.' });
    }
    if (text.length > 10000) {
        return res.status(400).json({ error: 'Answer too long (max 10000 characters).' });
    }

    const sql = 'INSERT INTO future_answers (text) VALUES (?)';
    db.run(sql, [text], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, text });
    });
});

// GET: List all non-deleted answers, newest first
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM future_answers WHERE deleted_at IS NULL ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET: Latest answer only
router.get('/latest', (req, res) => {
    const sql = 'SELECT * FROM future_answers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1';
    db.get(sql, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(row || null);
    });
});

// DELETE: Soft delete an answer
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid answer id.' });
    }

    const sql = 'UPDATE future_answers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
    db.run(sql, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Answer not found.' });
        }
        res.json({ id, deleted: true });
    });
});

module.exports = router;