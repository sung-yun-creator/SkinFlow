const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
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
app.use('/api/mypage', mypageRoutes);

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
});

module.exports = app;
