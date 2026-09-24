const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// ---------- areas ----------

// GET: list all areas
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM life_areas WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST: create a new area (uncommon — defaults are seeded)
router.post('/', (req, res) => {
    const { key, name, description, color, sort_order } = req.body;

    if (!key || !name) {
        return res.status(400).json({ error: 'key and name are required.' });
    }

    const sql = 'INSERT INTO life_areas (key, name, description, color, sort_order) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [key, name, description || '', color || '#7A7A7A', sort_order || 0], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, key, name });
    });
});

// PATCH: edit an area
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid area id.' });
    }

    const { name, description, color, sort_order } = req.body;

    const fields = [];
    const values = [];

    if (name !== undefined) {
        if (!name.trim()) return res.status(400).json({ error: 'Name cannot be empty.' });
        fields.push('name = ?');
        values.push(name);
    }
    if (description !== undefined) {
        fields.push('description = ?');
        values.push(description);
    }
    if (color !== undefined) {
        fields.push('color = ?');
        values.push(color);
    }
    if (sort_order !== undefined) {
        fields.push('sort_order = ?');
        values.push(sort_order);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    values.push(id);
    const sql = `UPDATE life_areas SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    db.run(sql, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Area not found.' });
        res.json({ id, updated: true });
    });
});

// DELETE: soft delete an area
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid area id.' });
    }

    const sql = 'UPDATE life_areas SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
    db.run(sql, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Area not found.' });
        res.json({ id, deleted: true });
    });
});

// ---------- ratings ----------

// GET: rating history for one area
router.get('/:id/ratings', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid area id.' });
    }

    const sql = 'SELECT * FROM area_ratings WHERE area_id = ? ORDER BY recorded_at DESC';
    db.all(sql, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET: latest rating for every area
router.get('/ratings/latest', (req, res) => {
    const sql = `
        SELECT a.id AS area_id, a.name, a.color,
               (SELECT rating FROM area_ratings r WHERE r.area_id = a.id ORDER BY recorded_at DESC LIMIT 1) AS rating,
               (SELECT note FROM area_ratings r WHERE r.area_id = a.id ORDER BY recorded_at DESC LIMIT 1) AS note,
               (SELECT recorded_at FROM area_ratings r WHERE r.area_id = a.id ORDER BY recorded_at DESC LIMIT 1) AS recorded_at
        FROM life_areas a
        WHERE a.deleted_at IS NULL
        ORDER BY a.sort_order ASC, a.id ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST: save a rating for one area
router.post('/:id/ratings', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid area id.' });
    }

    const { rating, note } = req.body;
    const r = parseInt(rating, 10);

    if (!Number.isInteger(r) || r < 1 || r > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    const sql = 'INSERT INTO area_ratings (area_id, rating, note) VALUES (?, ?, ?)';
    db.run(sql, [id, r, note || ''], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, area_id: id, rating: r, note: note || '' });
    });
});

// ---------- meta ----------

// GET: all blueprint meta as an object
router.get('/meta', (req, res) => {
    db.all('SELECT key, value FROM blueprint_meta', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const obj = {};
        rows.forEach(r => { obj[r.key] = r.value; });
        res.json(obj);
    });
});

// POST: save a meta key
router.post('/meta', (req, res) => {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required.' });

    const sql = `
        INSERT INTO blueprint_meta (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `;
    db.run(sql, [key, value], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ key, value });
    });
});

// ---------- milestones ----------

// GET: list all milestones (optionally filtered by area_id)
router.get('/milestones/all', (req, res) => {
    const { area_id } = req.query;

    let sql = `
        SELECT m.*, a.name AS area_name, a.color AS area_color
        FROM milestones m
        JOIN life_areas a ON a.id = m.area_id
        WHERE m.deleted_at IS NULL
    `;
    const params = [];

    if (area_id) {
        sql += ' AND m.area_id = ?';
        params.push(parseInt(area_id, 10));
    }

    sql += ' ORDER BY m.area_id ASC, m.year_index ASC, m.created_at ASC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST: create a milestone
router.post('/milestones', (req, res) => {
    const { area_id, year_index, text, why } = req.body;

    const areaId = parseInt(area_id, 10);
    const yearIndex = parseInt(year_index, 10);

    if (!Number.isInteger(areaId) || !Number.isInteger(yearIndex)) {
        return res.status(400).json({ error: 'area_id and year_index are required as numbers.' });
    }
    if (yearIndex < 1 || yearIndex > 5) {
        return res.status(400).json({ error: 'year_index must be between 1 and 5.' });
    }
    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Milestone text is required.' });
    }
    if (text.length > 500) {
        return res.status(400).json({ error: 'Milestone text too long (max 500 characters).' });
    }

    const sql = 'INSERT INTO milestones (area_id, year_index, text, why) VALUES (?, ?, ?, ?)';
    db.run(sql, [areaId, yearIndex, text, why || null], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, area_id: areaId, year_index: yearIndex, text, why: why || null, status: 'planned' });
    });
});

// PATCH: edit or mark a milestone
router.patch('/milestones/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid milestone id.' });
    }

    const { text, why, status } = req.body;

    const fields = [];
    const values = [];

    if (text !== undefined) {
        if (!text.trim()) return res.status(400).json({ error: 'Text cannot be empty.' });
        if (text.length > 500) return res.status(400).json({ error: 'Text too long (max 500 characters).' });
        fields.push('text = ?');
        values.push(text);
    }
    if (why !== undefined) {
        fields.push('why = ?');
        values.push(why || null);
    }
    if (status !== undefined) {
        if (!['planned', 'in_progress', 'done', 'dropped'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }
        fields.push('status = ?');
        values.push(status);

        if (status === 'done') {
            fields.push('completed_at = CURRENT_TIMESTAMP');
        } else {
            fields.push('completed_at = NULL');
        }
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    values.push(id);
    const sql = `UPDATE milestones SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`;
    db.run(sql, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Milestone not found.' });
        res.json({ id, updated: true });
    });
});

// DELETE: soft delete
router.delete('/milestones/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid milestone id.' });
    }

    const sql = 'UPDATE milestones SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
    db.run(sql, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Milestone not found.' });
        res.json({ id, deleted: true });
    });
});


module.exports = router;