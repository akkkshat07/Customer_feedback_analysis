const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');
const uploadRoutes = require('./routes/upload');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', require('./routes/chat'));

app.get('/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ status: 'up', dbTime: result.rows[0].now });
    } catch (error) {
        res.status(500).json({ status: 'down', error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
