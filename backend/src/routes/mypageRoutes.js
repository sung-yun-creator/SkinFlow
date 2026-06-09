const express = require('express');
const { getMyPage } = require('../controllers/mypageController');
const { authenticate } = require('../middlewares/authMiddleware');

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

router.get('/', authenticate, asyncHandler(getMyPage));

module.exports = router;
