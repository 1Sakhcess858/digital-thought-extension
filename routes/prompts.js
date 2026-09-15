const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

const VALID_BUCKETS = ['morning', 'afternoon', 'evening', 'night'];

// ---------- helpers ----------

function bucketForHour(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
}

// ---------- prompts: read ----------

// GET /api/prompts - list active prompts, optionally filtered by bucket
router.get('/', (req, res) => {
    const { bucket } = req.query;

    let sql = 'SELECT * FROM prompts WHERE active = 1';
    const params = [];

    if (bucket) {
        if (!VALID_BUCKETS.includes(bucket)) {
            return res.status(400).json({ error: 'Invalid bucket.' });
        }
        sql += ' AND time_of_day = ?';
        params.push(bucket);
    }

    sql += ' ORDER BY time_of_day ASC, sort_order ASC, id ASC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET /api/prompts/current - prompts for the current time bucket (server time)
router.get('/current', (req, res) => {
    const hour = new Date().getHours();
    const bucket = bucketForHour(hour);

    const sql = 'SELECT * FROM prompts WHERE active = 1 AND time_of_day = ? ORDER BY sort_order ASC, id ASC';
    db.all(sql, [bucket], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ bucket, prompts: rows });
    });
});

// GET /api/prompts/all - list every prompt, active or not (for the editor)
router.get('/all', (req, res) => {
    const sql = 'SELECT * FROM prompts ORDER BY time_of_day ASC, sort_order ASC, id ASC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// ---------- prompts: write ----------

// POST /api/prompts - create a new prompt
router.post('/', (req, res) => {
    const { time_of_day, text, sort_order } = req.body;

    if (!time_of_day || !text) {
        return res.status(400).json({ error: 'time_of_day and text are required.' });
    }
    if (!VALID_BUCKETS.includes(time_of_day)) {
        return res.status(400).json({ error: 'Invalid time_of_day.' });
    }
    if (text.length > 500) {
        return res.status(400).json({ error: 'Prompt text too long (max 500 characters).' });
    }

    const sql = 'INSERT INTO prompts (time_of_day, text, sort_order) VALUES (?, ?, ?)';
    db.run(sql, [time_of_day, text, sort_order || 0], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, time_of_day, text, sort_order: sort_order || 0 });
    });
});

// PATCH /api/prompts/:id - edit a prompt's text, bucket, order, or active state
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid prompt id.' });
    }

    const { text, time_of_day, sort_order, active } = req.body;

    const fields = [];
    const values = [];

    if (text !== undefined) {
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text cannot be empty.' });
        }
        if (text.length > 500) {
            return res.status(400).json({ error: 'Prompt text too long (max 500 characters).' });
        }
        fields.push('text = ?');
        values.push(text);
    }
    if (time_of_day !== undefined) {
        if (!VALID_BUCKETS.includes(time_of_day)) {
            return res.status(400).json({ error: 'Invalid time_of_day.' });
        }
        fields.push('time_of_day = ?');
        values.push(time_of_day);
    }
    if (sort_order !== undefined) {
        fields.push('sort_order = ?');
        values.push(sort_order);
    }
    if (active !== undefined) {
        fields.push('active = ?');
        values.push(active ? 1 : 0);
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'Nothing to update.' });
    }

    values.push(id);

    const sql = `UPDATE prompts SET ${fields.join(', ')} WHERE id = ?`;
    db.run(sql, values, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Prompt not found.' });
        }
        res.json({ id, updated: true });
    });
});

// DELETE /api/prompts/:id - hard-delete a prompt definition
// Note: existing responses keep their own prompt_text snapshot and stay.
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid prompt id.' });
    }

    const sql = 'DELETE FROM prompts WHERE id = ?';
    db.run(sql, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Prompt not found.' });
        }
        res.json({ id, deleted: true });
    });
});

// ---------- responses ----------

// POST /api/prompts/responses - save an answer or a skip
router.post('/responses', (req, res) => {
    const { prompt_id, response, skipped } = req.body;

    if (!prompt_id) {
        return res.status(400).json({ error: 'prompt_id is required.' });
    }
    if (!skipped && (!response || !response.trim())) {
        return res.status(400).json({ error: 'response is required unless skipping.' });
    }
    if (response && response.length > 10000) {
        return res.status(400).json({ error: 'Response too long (max 10000 characters).' });
    }

    db.get('SELECT id, text, time_of_day FROM prompts WHERE id = ?', [prompt_id], (err, prompt) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!prompt) {
            return res.status(404).json({ error: 'Prompt not found.' });
        }

        const sql = 'INSERT INTO prompt_responses (prompt_id, prompt_text, response, time_of_day, skipped) VALUES (?, ?, ?, ?, ?)';
        const values = [
            prompt.id,
            prompt.text,
            skipped ? null : response,
            prompt.time_of_day,
            skipped ? 1 : 0
        ];

        db.run(sql, values, function (insertErr) {
            if (insertErr) {
                return res.status(500).json({ error: insertErr.message });
            }
            res.json({
                id: this.lastID,
                prompt_id: prompt.id,
                prompt_text: prompt.text,
                response: skipped ? null : response,
                time_of_day: prompt.time_of_day,
                skipped: skipped ? 1 : 0
            });
        });
    });
});

// GET /api/prompts/responses - list responses, newest first
// Optional query: ?bucket=morning | ?limit=50
router.get('/responses', (req, res) => {
    const { bucket, limit } = req.query;

    let sql = 'SELECT * FROM prompt_responses WHERE deleted_at IS NULL';
    const params = [];

    if (bucket) {
        if (!VALID_BUCKETS.includes(bucket)) {
            return res.status(400).json({ error: 'Invalid bucket.' });
        }
        sql += ' AND time_of_day = ?';
        params.push(bucket);
    }

    sql += ' ORDER BY created_at DESC';

    const maxRows = limit ? Math.min(parseInt(limit, 10) || 100, 500) : 500;
    sql += ' LIMIT ?';
    params.push(maxRows);

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// DELETE /api/prompts/responses/:id - soft-delete a response
router.delete('/responses/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid response id.' });
    }

    const sql = 'UPDATE prompt_responses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
    db.run(sql, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Response not found.' });
        }
        res.json({ id, deleted: true });
    });
});

module.exports = router;