const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

const ALLOWED_TYPES = ['Thought', 'Idea', 'Question', 'Lesson', 'Reflection', 'Goal'];

// POST: Create a new thought
router.post('/', (req, res) => {
    const { type, content, thread_id, why, next_step } = req.body;

    if (!type || !content) {
        return res.status(400).json({ error: 'Type and content are required.' });
    }
    if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type.' });
    }
    if (content.length > 10000) {
        return res.status(400).json({ error: 'Content too long (max 10000 characters).' });
    }
    if (why && why.length > 10000) {
        return res.status(400).json({ error: 'Why too long (max 10000 characters).' });
    }
    if (next_step && next_step.length > 10000) {
        return res.status(400).json({ error: 'Next step too long (max 10000 characters).' });
    }

    const sql = 'INSERT INTO thoughts (type, content, thread_id, why, next_step) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [type, content, thread_id || null, why || null, next_step || null], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: this.lastID,
            type,
            content,
            thread_id: thread_id || null,
            why: why || null,
            next_step: next_step || null
        });
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
            thoughts.why,
            thoughts.next_step,
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
            thoughts.why,
            thoughts.next_step,
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

// PATCH: Edit a thought (content, type, thread_id, why, and/or next_step)
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thought id.' });
    }

    const { content, type, thread_id, why, next_step } = req.body;

    const fields = [];
    const values = [];

    if (content !== undefined) {
        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content cannot be empty.' });
        }
        if (content.length > 10000) {
            return res.status(400).json({ error: 'Content too long (max 10000 characters).' });
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
    if (why !== undefined) {
        if (why && why.length > 10000) {
            return res.status(400).json({ error: 'Why too long (max 10000 characters).' });
        }
        fields.push('why = ?');
        values.push(why || null);
    }
    if (next_step !== undefined) {
        if (next_step && next_step.length > 10000) {
            return res.status(400).json({ error: 'Next step too long (max 10000 characters).' });
        }
        fields.push('next_step = ?');
        values.push(next_step || null);
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

// GET: List links for a thought (outgoing)
router.get('/:id/links', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thought id.' });
    }

    const sql = `
        SELECT t.id, t.type, t.content, t.thread_id, t.created_at
        FROM thought_links l
        JOIN thoughts t ON t.id = l.to_id
        WHERE l.from_id = ? AND t.deleted_at IS NULL
        ORDER BY l.created_at DESC
    `;
    db.all(sql, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST: Create a link from :id to { to_id }
router.post('/:id/links', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid thought id.' });
    }

    const toId = parseInt(req.body.to_id, 10);
    if (!Number.isInteger(toId)) {
        return res.status(400).json({ error: 'to_id is required and must be a number.' });
    }
    if (toId === id) {
        return res.status(400).json({ error: 'A thought cannot link to itself.' });
    }

    // Confirm both thoughts exist and are not deleted
    db.get('SELECT id FROM thoughts WHERE id = ? AND deleted_at IS NULL', [id], (err1, fromRow) => {
        if (err1) return res.status(500).json({ error: err1.message });
        if (!fromRow) return res.status(404).json({ error: 'Source thought not found.' });

        db.get('SELECT id FROM thoughts WHERE id = ? AND deleted_at IS NULL', [toId], (err2, toRow) => {
            if (err2) return res.status(500).json({ error: err2.message });
            if (!toRow) return res.status(404).json({ error: 'Target thought not found.' });

            const sql = 'INSERT OR IGNORE INTO thought_links (from_id, to_id) VALUES (?, ?)';
            db.run(sql, [id, toId], function (err3) {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json({ from_id: id, to_id: toId, created: this.changes > 0 });
            });
        });
    });
});

// DELETE: Remove a link
router.delete('/:id/links/:toId', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const toId = parseInt(req.params.toId, 10);
    if (!Number.isInteger(id) || !Number.isInteger(toId)) {
        return res.status(400).json({ error: 'Invalid ids.' });
    }

    const sql = 'DELETE FROM thought_links WHERE from_id = ? AND to_id = ?';
    db.run(sql, [id, toId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Link not found.' });
        }
        res.json({ deleted: true, from_id: id, to_id: toId });
    });
});

module.exports = router;