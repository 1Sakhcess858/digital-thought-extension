const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// GET /api/identity
// Aggregates everything needed for the Me Identity page.
router.get('/', (req, res) => {
    const result = {
        generatedAt: new Date().toISOString(),
        why: null,
        fiveYear: null,
        commitments: {
            day: [],
            week: [],
            month: [],
            year: []
        },
        reflections: [],
        echoes: [],
        randomThoughts: [],
        week: {
            thoughtsCount: 0,
            promptResponsesCount: 0,
            commitmentsCompletedCount: 0,
            daysSinceLastCapture: null
        }
    };

    const weekAgoISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);

    // WHY
    db.get("SELECT value FROM settings WHERE key = 'why'", [], (err, whyRow) => {
        if (err) return res.status(500).json({ error: err.message });
        result.why = whyRow ? whyRow.value : null;

        // Five-year answer (latest)
        db.get(
            'SELECT id, text, created_at FROM future_answers WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
            [],
            (err2, fiveRow) => {
                if (err2) return res.status(500).json({ error: err2.message });
                result.fiveYear = fiveRow || null;

                // Current open commitments grouped by horizon
                db.all(
                    "SELECT id, text, horizon, why, due_date FROM commitments WHERE deleted_at IS NULL AND status = 'open' ORDER BY created_at DESC",
                    [],
                    (err3, commitments) => {
                        if (err3) return res.status(500).json({ error: err3.message });
                        (commitments || []).forEach(c => {
                            if (result.commitments[c.horizon]) {
                                result.commitments[c.horizon].push(c);
                            }
                        });

                        // Last 3 reflections
                        db.all(
                            'SELECT id, content, created_at FROM reflections ORDER BY created_at DESC LIMIT 3',
                            [],
                            (err4, reflections) => {
                                if (err4) return res.status(500).json({ error: err4.message });
                                result.reflections = reflections || [];

                                // All echoes
                                db.all(
                                    'SELECT id, content, created_at FROM echoes ORDER BY created_at DESC',
                                    [],
                                    (err5, echoes) => {
                                        if (err5) return res.status(500).json({ error: err5.message });
                                        result.echoes = echoes || [];

                                        // 5 random thoughts from the last 30 days
                                        db.all(
                                            `SELECT id, type, content, created_at
                                             FROM thoughts
                                             WHERE deleted_at IS NULL
                                               AND created_at >= datetime('now', '-30 days')
                                             ORDER BY RANDOM()
                                             LIMIT 5`,
                                            [],
                                            (err6, randoms) => {
                                                if (err6) return res.status(500).json({ error: err6.message });
                                                result.randomThoughts = randoms || [];

                                                // Week in numbers
                                                db.get(
                                                    'SELECT COUNT(*) AS n FROM thoughts WHERE deleted_at IS NULL AND created_at >= ?',
                                                    [weekAgoISO],
                                                    (err7, wThoughts) => {
                                                        if (err7) return res.status(500).json({ error: err7.message });
                                                        result.week.thoughtsCount = wThoughts ? wThoughts.n : 0;

                                                        db.get(
                                                            'SELECT COUNT(*) AS n FROM prompt_responses WHERE deleted_at IS NULL AND skipped = 0 AND created_at >= ?',
                                                            [weekAgoISO],
                                                            (err8, wPrompts) => {
                                                                if (err8) return res.status(500).json({ error: err8.message });
                                                                result.week.promptResponsesCount = wPrompts ? wPrompts.n : 0;

                                                                db.get(
                                                                    "SELECT COUNT(*) AS n FROM commitments WHERE deleted_at IS NULL AND status = 'done' AND completed_at >= ?",
                                                                    [weekAgoISO],
                                                                    (err9, wCommits) => {
                                                                        if (err9) return res.status(500).json({ error: err9.message });
                                                                        result.week.commitmentsCompletedCount = wCommits ? wCommits.n : 0;

                                                                        db.get(
                                                                            "SELECT CAST(julianday('now') - julianday(MAX(created_at)) AS INTEGER) AS days FROM thoughts WHERE deleted_at IS NULL",
                                                                            [],
                                                                            (err10, lastCapture) => {
                                                                                if (err10) return res.status(500).json({ error: err10.message });
                                                                                result.week.daysSinceLastCapture = lastCapture && lastCapture.days !== null ? lastCapture.days : null;

                                                                                res.json(result);
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
                            }
                        );
                    }
                );
            }
        );
    });
});

module.exports = router;