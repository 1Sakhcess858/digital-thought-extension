require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const thoughtsRoute = require('./routes/thoughts');
const threadsRoute = require('./routes/threads');
const settingsRoute = require('./routes/settings');
const echoesRoute = require('./routes/echoes');
const reflectionsRoute = require('./routes/reflections');
const goalsRoute = require('./routes/goals');
const futureRoute = require('./routes/future');

app.use('/api/thoughts', thoughtsRoute);
app.use('/api/threads', threadsRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/echoes', echoesRoute);
app.use('/api/reflections', reflectionsRoute);
app.use('/api/goals', goalsRoute);
app.use('/api/future', futureRoute);

app.get('/api/status', (req, res) => {
    res.json({ status: 'D.T.E. is running' });
});

// NEW: 404 handler for unknown API routes.
// Must come AFTER all real routes, or it will shadow them.
// Only handles /api/* so that static files still 404 normally.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// NEW: Global error handler.
// Express 5 forwards rejected promises here automatically.
// Must have exactly 4 parameters, or Express will not recognize it.
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`D.T.E. server running at http://localhost:${PORT}`);
});