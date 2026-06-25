const express = require('express');
const {
    listDietGuideRecommendations,
    listIngredientRecommendations,
    listProductRecommendations,
} = require('../controllers/recommendationController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 추천 API는 최신 분석 이력을 기준으로 성분, 제품, 식습관 가이드를 각각 제공합니다.
router.get('/ingredients', authenticate, asyncHandler(listIngredientRecommendations));
router.get('/products', authenticate, asyncHandler(listProductRecommendations));
router.get('/diet-guides', authenticate, asyncHandler(listDietGuideRecommendations));

module.exports = router;
