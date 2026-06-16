const express = require('express');
const {
    listDietGuideRecommendations,
    listIngredientRecommendations,
    listProductRecommendations,
} = require('../controllers/recommendationController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/ingredients', authenticate, asyncHandler(listIngredientRecommendations));
router.get('/products', authenticate, asyncHandler(listProductRecommendations));
router.get('/diet-guides', authenticate, asyncHandler(listDietGuideRecommendations));

module.exports = router;
