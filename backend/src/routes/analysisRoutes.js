const express = require('express');
const multer = require('multer');
const { extractAnalysisRoi, requestSkinAnalysis, saveAnalysisRoi } = require('../controllers/analysisController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 원본 이미지는 디스크에 저장하지 않고 메모리 버퍼로만 AI 서버에 전달합니다.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return callback(new Error('이미지 파일만 업로드할 수 있습니다.'));
        }

        return callback(null, true);
    },
});

// ROI 추출과 저장은 모두 로그인 토큰이 있어야 사용할 수 있습니다.
router.post('/roi', authenticate, upload.single('file'), asyncHandler(extractAnalysisRoi));
router.post('/:analysisId/roi', authenticate, upload.single('file'), asyncHandler(saveAnalysisRoi));
router.post('/skin', authenticate, upload.single('file'), asyncHandler(requestSkinAnalysis));

module.exports = router;
