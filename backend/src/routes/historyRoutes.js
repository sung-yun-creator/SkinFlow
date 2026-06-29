const express = require('express');
const { getHistoryById, getHistoryTrendScores, listHistory } = require('../controllers/historyController');
const { getLlmReportByAnalysisId } = require('../controllers/llmReportController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 분석 이력 목록, 상세 이력, 상세 리포트를 모두 사용자 본인 데이터로 제한합니다.
router.get('/', authenticate, asyncHandler(listHistory));
router.get('/score-trends', authenticate, asyncHandler(getHistoryTrendScores));
router.get('/:analysisId/llm-report', authenticate, asyncHandler(getLlmReportByAnalysisId));
router.get('/:analysisId', authenticate, asyncHandler(getHistoryById));

module.exports = router;
