const express = require('express');
const { sendChatMessage } = require('../controllers/chatController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticate, asyncHandler(sendChatMessage));

module.exports = router;
