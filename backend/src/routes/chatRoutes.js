const express = require('express');
const { sendChatMessage } = require('../controllers/chatController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 챗봇은 로그인 사용자 요청을 받아 RAG/LLM 답변 서비스로 전달합니다.
router.post('/', authenticate, asyncHandler(sendChatMessage));

module.exports = router;
