const express = require('express');
const {
    checkEmail,
    login,
    resetPassword,
    sendPasswordResetCode,
    sendEmailCode,
    signup,
    verifyEmail,
} = require('../controllers/authController');
const asyncHandler = require('../middlewares/asyncHandler');

const router = express.Router();

// 회원가입 전 이메일 인증 흐름입니다. 가입되지 않은 이메일인지 확인한 뒤 인증 코드를 발송/검증합니다.
router.post('/check-email', asyncHandler(checkEmail));
router.post('/send-email-code', asyncHandler(sendEmailCode));
router.post('/verify-email-code', asyncHandler(verifyEmail));

// 로그인 전 비밀번호 찾기 흐름입니다. 가입된 이메일에 인증 코드를 보내고 새 비밀번호로 재설정합니다.
router.post('/password-reset-code', asyncHandler(sendPasswordResetCode));
router.post('/reset-password', asyncHandler(resetPassword));

// 실제 계정 생성/로그인은 인증 흐름을 통과한 뒤 사용자 정보를 저장하거나 JWT를 발급합니다.
router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));

module.exports = router;
