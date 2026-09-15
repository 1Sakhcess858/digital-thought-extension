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
    if (title.length > 200) {
        return res.status(400).json({ error: 'Title too long (max 200 characters).' });
    }
    if (description && description.length > 2000) {
        return res.status(400).json({ error: 'Description too long (max 2000 characters).' });
    }

    const sql = 'INSERT INTO threads (title, description) VALUES (?, ?)';
    db.run(sql, [title, description || ''], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, title, description });
    });
});

// GET: List all non-deleted threads with thought counts
router.get('/', (req, res) => {
    const sql = `
        SELECT
            threads.id,
            threads.title,
            threads.description,
            threads.created_at,
            COUNT(thoughts.id) AS thought_count
        FROM threads
        LEFT JOIN thoughts ON thoughts.thread_id = threads.id
                          AND thoughts.deleted_at IS NULL
        WHERE threads.deleted_at IS NULL
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

// PATCH: Edit a thread title and/or description
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thread id.' });
    }

    const { title, description } = req.body;

    const fields = [];
    const values = [];

    if (title !== undefined) {
        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title cannot be empty.' });
        }
        if (title.length > 200) {
            return res.status(400).json({ error: 'Title too long (max 200 characters).' });
        }
        fields.push('title = ?');
        values.push(title);
    }
    if (description !== undefined) {
        if (description && description.length > 2000) {
            return res.status(400).json({ error: 'Description too long (max 2000 characters).' });
        }
        fields.push('description = ?');
        values.push(description || '');
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'Nothing to update.' });
    }

    values.push(id);

    const sql = `UPDATE threads SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    db.run(sql, values, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Thread not found.' });
        }
        res.json({ id, updated: true });
    });
});

// DELETE: Soft-delete a thread and un-thread all its thoughts
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thread id.' });
    }

    // First: un-thread all thoughts pointing at this thread
    const unthreadSql = 'UPDATE thoughts SET thread_id = NULL WHERE thread_id = ?';
    db.run(unthreadSql, [id], (unthreadErr) => {
        if (unthreadErr) {
            return res.status(500).json({ error: unthreadErr.message });
        }

        // Second: soft-delete the thread itself
        const deleteSql = 'UPDATE threads SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
        db.run(deleteSql, [id], function (deleteErr) {
            if (deleteErr) {
                return res.status(500).json({ error: deleteErr.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Thread not found.' });
            }
            res.json({ id, deleted: true });
        });
    });
});

module.exports = router;