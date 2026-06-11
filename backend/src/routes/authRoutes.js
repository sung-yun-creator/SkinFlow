const express = require('express');
const {
    checkEmail,
    login,
    sendEmailCode,
    signup,
    verifyEmail,
} = require('../controllers/authController');
const asyncHandler = require('../middlewares/asyncHandler');

const router = express.Router();

router.post('/check-email', asyncHandler(checkEmail));
router.post('/send-email-code', asyncHandler(sendEmailCode));
router.post('/verify-email-code', asyncHandler(verifyEmail));
router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));

module.exports = router;
