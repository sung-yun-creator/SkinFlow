const express = require('express');
const cors = require('cors');
const analysisRoutes = require('./routes/analysisRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const historyRoutes = require('./routes/historyRoutes');
const mypageRoutes = require('./routes/mypageRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();

// 프론트 개발 서버 요청을 허용하고 JSON 요청 본문을 읽을 수 있게 준비합니다.
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'SkinFlow backend is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/mypage', mypageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/recommendations', recommendationRoutes);

// 각 라우트에서 next(error)로 넘긴 에러를 마지막에 JSON 응답으로 변환합니다.
app.use((error, req, res, next) => {
    console.error(error);

    if (error.status) {
        return res.status(error.status).json({
            code: error.code || 'REQUEST_FAILED',
            message: error.message,
            result: error.result || null,
        });
    }

    if (error.name === 'MulterError' || error.message === '이미지 파일만 업로드할 수 있습니다.') {
        return res.status(400).json({
            code: error.code || 'IMAGE_UPLOAD_INVALID',
            message: error.message,
        });
    }

    return res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 내부 오류가 발생했습니다.',
    });
});

module.exports = app;
