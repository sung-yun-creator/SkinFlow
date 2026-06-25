const express = require('express');
const multer = require('multer');
const { extractAnalysisRoi, requestSkinAnalysis, saveAnalysisRoi } = require('../controllers/analysisController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// 분석 route는 이미지 업로드를 받아 ROI 추출 또는 피부 분석 controller로 넘깁니다.
function createInvalidImageTypeError() {
    const error = new Error('이미지 파일만 업로드할 수 있습니다.');
    error.code = 'IMAGE_UPLOAD_INVALID';
    return error;
}

// 원본 이미지는 디스크에 저장하지 않고 메모리 버퍼로만 AI 서버에 전달합니다.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            return callback(createInvalidImageTypeError());
        }

        return callback(null, true);
    },
});

// ROI 추출과 분석 요청은 모두 로그인한 사용자만 사용할 수 있습니다.
// /roi는 임시 ROI 확인, /:analysisId/roi는 기존 분석 이력에 ROI 저장, /skin은 분석 생성까지 처리합니다.
router.post('/roi', authenticate, upload.single('file'), asyncHandler(extractAnalysisRoi));
router.post('/:analysisId/roi', authenticate, upload.single('file'), asyncHandler(saveAnalysisRoi));
router.post('/skin', authenticate, upload.single('file'), asyncHandler(requestSkinAnalysis));

module.exports = router;
