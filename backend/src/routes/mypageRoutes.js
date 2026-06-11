const express = require('express');
const { getMyPage } = require('../controllers/mypageController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticate, asyncHandler(getMyPage));

module.exports = router;
