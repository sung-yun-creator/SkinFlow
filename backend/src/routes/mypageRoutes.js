const express = require('express');
const {
    getMyPage,
    sendMyPagePasswordCode,
    updateMyPagePassword,
    updateMyPageProfile,
} = require('../controllers/mypageController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 마이페이지 조회는 프로필, 분석 요약, 최근 활동을 한 번에 내려줍니다.
router.get('/', authenticate, asyncHandler(getMyPage));

// 로그인한 사용자가 자신의 기본 프로필 정보를 수정하는 API입니다.
router.patch('/profile', authenticate, asyncHandler(updateMyPageProfile));

// 비밀번호 변경은 현재 계정 이메일로 인증 코드를 보낸 뒤, 코드 확인 후 해시를 교체합니다.
router.post('/password-code', authenticate, asyncHandler(sendMyPagePasswordCode));
router.patch('/password', authenticate, asyncHandler(updateMyPagePassword));

module.exports = router;
