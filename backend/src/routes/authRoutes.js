const express = require('express');
const {
    checkEmail,
    login,
    sendEmailCode,
    signup,
    verifyEmail,
} = require('../controllers/authController');

const router = express.Router();

function asyncHandler(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}

router.post('/check-email', asyncHandler(checkEmail));
router.post('/send-email-code', asyncHandler(sendEmailCode));
router.post('/verify-email-code', asyncHandler(verifyEmail));
router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));

module.exports = router;
