const express = require('express');
const { getDashboardOverview } = require('../controllers/dashboardController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 홈/대시보드 화면에서 필요한 사용자 요약 정보를 한 번에 조회합니다.
// 대시보드는 사용자별 분석/추천 요약을 포함하므로 로그인 토큰이 필요합니다.
router.get('/', authenticate, asyncHandler(getDashboardOverview));

module.exports = router;
