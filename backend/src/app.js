const express = require('express');
const cors = require('cors');
const analysisRoutes = require('./routes/analysisRoutes');
const authRoutes = require('./routes/authRoutes');
const historyRoutes = require('./routes/historyRoutes');
const mypageRoutes = require('./routes/mypageRoutes');

const app = express();

app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'SkinFlow backend is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/mypage', mypageRoutes);

app.use((error, req, res, next) => {
    console.error(error);
    if (error.status) {
        return res.status(error.status).json({
            message: error.message,
            result: error.result || null,
        });
    }

    if (error.name === 'MulterError' || error.message === 'Only image files are allowed.') {
        return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Internal server error.' });
});

module.exports = app;
