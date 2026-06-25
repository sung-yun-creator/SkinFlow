const express = require('express');
const {
    listDietGuideRecommendations,
    listIngredientRecommendations,
    listProductRecommendations,
} = require('../controllers/recommendationController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 추천 API는 기본적으로 최신 분석을 사용하고, analysisId 쿼리가 있으면 해당 분석 이력을 기준으로 제공합니다.
router.get('/ingredients', authenticate, asyncHandler(listIngredientRecommendations));
router.get('/products', authenticate, asyncHandler(listProductRecommendations));
router.get('/diet-guides', authenticate, asyncHandler(listDietGuideRecommendations));

module.exports = router;
