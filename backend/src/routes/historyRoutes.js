const express = require('express');
const { getHistoryById, listHistory } = require('../controllers/historyController');
const { getLlmReportByAnalysisId } = require('../controllers/llmReportController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticate, asyncHandler(listHistory));
router.get('/:analysisId/llm-report', authenticate, asyncHandler(getLlmReportByAnalysisId));
router.get('/:analysisId', authenticate, asyncHandler(getHistoryById));

module.exports = router;
