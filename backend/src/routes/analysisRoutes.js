const express = require('express');
const multer = require('multer');
const { extractAnalysisRoi, requestSkinAnalysis, saveAnalysisRoi } = require('../controllers/analysisController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return callback(new Error('Only image files are allowed.'));
        }

        return callback(null, true);
    },
});

function asyncHandler(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}

router.post('/roi', authenticate, upload.single('file'), asyncHandler(extractAnalysisRoi));
router.post('/:analysisId/roi', authenticate, upload.single('file'), asyncHandler(saveAnalysisRoi));
router.post('/skin', authenticate, upload.single('file'), asyncHandler(requestSkinAnalysis));

module.exports = router;
