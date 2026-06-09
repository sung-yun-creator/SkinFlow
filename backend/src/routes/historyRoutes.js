const express = require('express');
const { getHistoryById, listHistory } = require('../controllers/historyController');
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

router.get('/', authenticate, asyncHandler(listHistory));
router.get('/:analysisId', authenticate, asyncHandler(getHistoryById));

module.exports = router;
