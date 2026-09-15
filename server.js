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
const promptsRoute = require('./routes/prompts');

app.use('/api/thoughts', thoughtsRoute);
app.use('/api/threads', threadsRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/echoes', echoesRoute);
app.use('/api/reflections', reflectionsRoute);
app.use('/api/goals', goalsRoute);
app.use('/api/future', futureRoute);
app.use('/api/prompts', promptsRoute);

app.get('/api/status', (req, res) => {
    res.json({ status: 'D.T.E. is running' });
});

// 404 handler for unknown API routes.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// Global error handler.
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`D.T.E. server running at http://localhost:${PORT}`);
});