const express = require('express');
const { listIngredientRecommendations } = require('../controllers/recommendationController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/ingredients', authenticate, asyncHandler(listIngredientRecommendations));

module.exports = router;
