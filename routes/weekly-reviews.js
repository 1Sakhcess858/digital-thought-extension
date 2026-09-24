const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// ---------- helpers ----------

function daysBetween(a, b) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((b - a) / msPerDay);
}

// GET /api/weekly-reviews/status
// Returns: { due: true|false, daysSinceLast: N, lastReview: {...}|null }
router.get('/status', (req, res) => {
    const sql = 'SELECT * FROM weekly_reviews WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1';
    db.get(sql, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!row) {
            return res.json({ due: true, daysSinceLast: null, lastReview: null });
        }

        const last = new Date(row.created_at.replace(' ', 'T'));
        const now = new Date();
        const days = daysBetween(last, now);

        res.json({
            due: days >= 7,
            daysSinceLast: days,
            lastReview: row
        });
    });
});

// GET /api/weekly-reviews/sample
// Returns a sample of recent content to help the user write the review
router.get('/sample', (req, res) => {
    const sample = {
        thoughts: [],
        commitment: null,
        promptResponse: null,
        echo: null,
        why: null,
        fiveYear: null
    };

    db.all(
        "SELECT id, type, content FROM thoughts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 3",
        [],
        (err, thoughts) => {
            if (err) return res.status(500).json({ error: err.message });
            sample.thoughts = thoughts || [];

            db.get(
                "SELECT id, text, why, horizon FROM commitments WHERE deleted_at IS NULL AND status = 'open' ORDER BY created_at DESC LIMIT 1",
                [],
                (err2, commitment) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    sample.commitment = commitment || null;

                    db.get(
                        "SELECT id, prompt_text, response FROM prompt_responses WHERE deleted_at IS NULL AND skipped = 0 ORDER BY created_at DESC LIMIT 1",
                        [],
                        (err3, response) => {
                            if (err3) return res.status(500).json({ error: err3.message });
                            sample.promptResponse = response || null;

                            db.get(
                                "SELECT id, content FROM echoes ORDER BY created_at DESC LIMIT 1",
                                [],
                                (err4, echo) => {
                                    if (err4) return res.status(500).json({ error: err4.message });
                                    sample.echo = echo || null;

                                    db.get(
                                        "SELECT value FROM settings WHERE key = 'why'",
                                        [],
                                        (err5, whyRow) => {
                                            if (err5) return res.status(500).json({ error: err5.message });
                                            sample.why = whyRow ? whyRow.value : null;

                                            db.get(
                                                "SELECT id, text FROM future_answers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1",
                                                [],
                                                (err6, futureRow) => {
                                                    if (err6) return res.status(500).json({ error: err6.message });
                                                    sample.fiveYear = futureRow || null;
                                                    res.json(sample);
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// GET /api/weekly-reviews
// List all reviews, newest first
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM weekly_reviews WHERE deleted_at IS NULL ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// POST /api/weekly-reviews
// Save a new review
router.post('/', (req, res) => {
    const { content } = req.body;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required.' });
    }
    if (content.length > 10000) {
        return res.status(400).json({ error: 'Review too long (max 10000 characters).' });
    }

    const sql = 'INSERT INTO weekly_reviews (content) VALUES (?)';
    db.run(sql, [content], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, content });
    });
});

// DELETE /api/weekly-reviews/:id
// Soft delete
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid review id.' });
    }

    const sql = 'UPDATE weekly_reviews SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL';
    db.run(sql, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Review not found.' });
        }
        res.json({ id, deleted: true });
    });
});

module.exports = router;