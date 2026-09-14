const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

const ALLOWED_TYPES = ['Thought', 'Idea', 'Question', 'Lesson', 'Reflection', 'Goal'];

// POST: Create a new thought
router.post('/', (req, res) => {
    const { type, content, thread_id } = req.body;

    if (!type || !content) {
        return res.status(400).json({ error: 'Type and content are required.' });
    }
    if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type.' });
    }

    const sql = 'INSERT INTO thoughts (type, content, thread_id) VALUES (?, ?, ?)';
    db.run(sql, [type, content, thread_id || null], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, type, content, thread_id: thread_id || null });
    });
});

// GET: List all thoughts (excluding soft-deleted), each with thread title
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
        WHERE thoughts.deleted_at IS NULL
        ORDER BY thoughts.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET: One thought by id
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thought id.' });
    }

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
        WHERE thoughts.id = ? AND thoughts.deleted_at IS NULL
    `;
    db.get(sql, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Thought not found.' });
        }
        res.json(row);
    });
});

// PATCH: Edit a thought (content, type, and/or thread_id)
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thought id.' });
    }

    const { content, type, thread_id } = req.body;

    const fields = [];
    const values = [];

    if (content !== undefined) {
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content cannot be empty.' });
        }
        fields.push('content = ?');
        values.push(content);
    }
    if (type !== undefined) {
        if (!ALLOWED_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Invalid type.' });
        }
        fields.push('type = ?');
        values.push(type);
    }
    if (thread_id !== undefined) {
        fields.push('thread_id = ?');
        values.push(thread_id || null);
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'Nothing to update.' });
    }

    values.push(id);

    const sql = `UPDATE thoughts SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    db.run(sql, values, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Thought not found.' });
        }
        res.json({ id, updated: true });
    });
});

// DELETE: Soft-delete a thought
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thought id.' });
    }

    const sql = 'UPDATE thoughts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
    db.run(sql, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Thought not found.' });
        }
        res.json({ id, deleted: true });
    });
});

module.exports = router;