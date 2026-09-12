require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const thoughtsRoute = require('./routes/thoughts');
const threadsRoute = require('./routes/threads');

app.use('/api/thoughts', thoughtsRoute);
app.use('/api/threads', threadsRoute);

app.get('/api/status', (req, res) => {
    res.json({ status: 'D.T.E. is running' });
});

app.listen(PORT, () => {
    console.log(`D.T.E. server running at http://localhost:${PORT}`);
});