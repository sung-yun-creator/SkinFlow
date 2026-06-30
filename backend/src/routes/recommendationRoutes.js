const express = require('express');
const {
    listDietGuideRecommendations,
    listFocusOptions,
    listIngredientRecommendations,
    listProductRecommendations,
} = require('../controllers/recommendationController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 추천 API는 기본적으로 최신 분석을 사용하고, analysisId 쿼리가 있으면 해당 분석 이력을 기준으로 제공합니다.
// focus 쿼리에는 pigmentation 또는 wrinkle을 넘겨 사용자가 선택한 관리 지표를 반영할 수 있습니다.
router.get('/focus-options', authenticate, asyncHandler(listFocusOptions));
router.get('/ingredients', authenticate, asyncHandler(listIngredientRecommendations));
router.get('/products', authenticate, asyncHandler(listProductRecommendations));
router.get('/diet-guides', authenticate, asyncHandler(listDietGuideRecommendations));

module.exports = router;
