const express = require('express');
const {
    listIngredientRecommendations,
    listProductRecommendations,
} = require('../controllers/recommendationController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/ingredients', authenticate, asyncHandler(listIngredientRecommendations));
router.get('/products', authenticate, asyncHandler(listProductRecommendations));

module.exports = router;
