require("dotenv").config();
const app = require('./app');
const { startAnalysisImageCleanupSchedule } = require('./services/analysisImageCleanupService');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    startAnalysisImageCleanupSchedule();
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
