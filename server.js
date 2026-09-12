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

app.listen(PORT, () => {
    console.log(`D.T.E. server running at http://localhost:${PORT}`);
});