require("dotenv").config();
const app = require('./app');
const { startAnalysisImageCleanupSchedule } = require('./services/analysisImageCleanupService');

const PORT = process.env.PORT || 3000;

// app 설정을 불러와 서버를 시작하고, 주기적으로 분석 이미지 정리 작업도 함께 실행합니다.
app.listen(PORT, () => {
    startAnalysisImageCleanupSchedule();
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
