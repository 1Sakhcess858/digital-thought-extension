const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

const VALID_HORIZONS = ['day', 'week', 'month', 'year'];
const VALID_STATUSES = ['open', 'done', 'dropped'];

// ---------- helpers ----------

function logEvent(commitmentId, event, callback) {
    const sql = 'INSERT INTO commitment_events (commitment_id, event) VALUES (?, ?)';
    db.run(sql, [commitmentId, event], callback || function () {});
}

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
}

// ---------- read ----------

// GET /api/commitments
// Optional query: ?horizon=day|week|month|year&status=open|done|dropped
router.get('/', (req, res) => {
    const { horizon, status } = req.query;

    let sql = 'SELECT * FROM commitments WHERE deleted_at IS NULL';
    const params = [];

    if (horizon) {
        if (!VALID_HORIZONS.includes(horizon)) {
            return res.status(400).json({ error: 'Invalid horizon.' });
        }
        sql += ' AND horizon = ?';
        params.push(horizon);
    }

    if (status) {
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }
        sql += ' AND status = ?';
        params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET /api/commitments/today
router.get('/today', (req, res) => {
    const today = todayISO();
    const sql = `
        SELECT * FROM commitments
        WHERE deleted_at IS NULL
          AND status = 'open'
          AND (horizon = 'day' OR due_date = ?)
        ORDER BY created_at DESC
    `;
    db.all(sql, [today], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ horizon: 'day', date: today, commitments: rows });
    });
});

// GET /api/commitments/week
router.get('/week', (req, res) => {
    const sql = `
        SELECT * FROM commitments
        WHERE deleted_at IS NULL
          AND status = 'open'
          AND horizon = 'week'
        ORDER BY created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ horizon: 'week', commitments: rows });
    });
});

// GET /api/commitments/month
router.get('/month', (req, res) => {
    const sql = `
        SELECT * FROM commitments
        WHERE deleted_at IS NULL
          AND status = 'open'
          AND horizon = 'month'
        ORDER BY created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ horizon: 'month', commitments: rows });
    });
});

// GET /api/commitments/year
router.get('/year', (req, res) => {
    const sql = `
        SELECT * FROM commitments
        WHERE deleted_at IS NULL
          AND status = 'open'
          AND horizon = 'year'
        ORDER BY created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ horizon: 'year', commitments: rows });
    });
});

// GET /api/commitments/:id/history
router.get('/:id/history', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid commitment id.' });
    }

    const sql = 'SELECT * FROM commitment_events WHERE commitment_id = ? ORDER BY created_at ASC';
    db.all(sql, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ---------- write ----------

// POST /api/commitments
router.post('/', (req, res) => {
    const { text, horizon, why, goal_id, due_date } = req.body;

    if (!text || !horizon) {
        return res.status(400).json({ error: 'text and horizon are required.' });
    }
    if (!VALID_HORIZONS.includes(horizon)) {
        return res.status(400).json({ error: 'Invalid horizon.' });
    }
    if (text.length > 500) {
        return res.status(400).json({ error: 'Text too long (max 500 characters).' });
    }
    if (why && why.length > 2000) {
        return res.status(400).json({ error: 'Why too long (max 2000 characters).' });
    }

    const sql = 'INSERT INTO commitments (text, horizon, why, goal_id, due_date) VALUES (?, ?, ?, ?, ?)';
    const values = [text, horizon, why || null, goal_id || null, due_date || null];

    db.run(sql, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const newId = this.lastID;
        logEvent(newId, 'created', () => {
            res.json({ id: newId, text, horizon, why: why || null, goal_id: goal_id || null, due_date: due_date || null, status: 'open' });
        });
    });
});

// PATCH /api/commitments/:id
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid commitment id.' });
    }

    const { text, horizon, why, due_date } = req.body;

    const fields = [];
    const values = [];

    if (text !== undefined) {
        if (!text.trim()) return res.status(400).json({ error: 'Text cannot be empty.' });
        if (text.length > 500) return res.status(400).json({ error: 'Text too long.' });
        fields.push('text = ?');
        values.push(text);
    }
    if (horizon !== undefined) {
        if (!VALID_HORIZONS.includes(horizon)) return res.status(400).json({ error: 'Invalid horizon.' });
        fields.push('horizon = ?');
        values.push(horizon);
    }
    if (why !== undefined) {
        if (why && why.length > 2000) return res.status(400).json({ error: 'Why too long.' });
        fields.push('why = ?');
        values.push(why || '');
    }
    if (due_date !== undefined) {
        fields.push('due_date = ?');
        values.push(due_date || null);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    values.push(id);
    const sql = `UPDATE commitments SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`;

    db.run(sql, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Commitment not found.' });
        res.json({ id, updated: true });
    });
});

// POST /api/commitments/:id/done
router.post('/:id/done', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid commitment id.' });

    const sql = "UPDATE commitments SET status = 'done', completed_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL AND status != 'done'";
    db.run(sql, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Commitment not found or already done.' });
        logEvent(id, 'done', () => res.json({ id, status: 'done' }));
    });
});

// POST /api/commitments/:id/drop
router.post('/:id/drop', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid commitment id.' });

    const sql = "UPDATE commitments SET status = 'dropped' WHERE id = ? AND deleted_at IS NULL AND status = 'open'";
    db.run(sql, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Commitment not found or not open.' });
        logEvent(id, 'dropped', () => res.json({ id, status: 'dropped' }));
    });
});

// POST /api/commitments/:id/reopen
router.post('/:id/reopen', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid commitment id.' });

    const sql = "UPDATE commitments SET status = 'open', completed_at = NULL WHERE id = ? AND deleted_at IS NULL AND status != 'open'";
    db.run(sql, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Commitment not found or already open.' });
        logEvent(id, 'reopened', () => res.json({ id, status: 'open' }));
    });
});

// DELETE /api/commitments/:id
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid commitment id.' });

    const sql = 'UPDATE commitments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
    db.run(sql, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Commitment not found.' });
        res.json({ id, deleted: true });
    });
});

module.exports = router;