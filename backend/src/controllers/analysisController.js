const { analyzeSkin, extractAndSaveRoi, extractRoi } = require('../services/analysisService');

// multer가 메모리에 올린 이미지 파일이 실제로 들어왔는지 공통으로 확인합니다.
function validateImageFile(req, res) {
    if (!req.file) {
        res.status(400).json({ message: '이미지 파일을 첨부해 주세요.' });
        return false;
    }

    return true;
}

async function extractAnalysisRoi(req, res) {
    if (!validateImageFile(req, res)) {
        return;
    }

    const roi = await extractRoi(req.file);

    return res.json({
        userId: req.user.userId,
        result: roi,
    });
}

async function requestSkinAnalysis(req, res) {
    if (!validateImageFile(req, res)) {
        return;
    }

    const analysis = await analyzeSkin(req.file);

    return res.json({
        userId: req.user.userId,
        result: analysis,
    });
}

async function saveAnalysisRoi(req, res) {
    if (!validateImageFile(req, res)) {
        return;
    }

    const analysisId = Number(req.params.analysisId);

    if (!Number.isInteger(analysisId) || analysisId <= 0) {
        return res.status(400).json({ message: '올바른 분석 ID가 필요합니다.' });
    }

    // 로그인한 사용자의 분석 이력에만 ROI를 저장할 수 있게 userId도 함께 넘깁니다.
    const roi = await extractAndSaveRoi(req.user.userId, analysisId, req.file);

    if (!roi) {
        return res.status(404).json({ message: '분석 이력을 찾을 수 없습니다.' });
    }

    return res.json({
        userId: req.user.userId,
        result: roi,
    });
}

module.exports = {
    extractAnalysisRoi,
    requestSkinAnalysis,
    saveAnalysisRoi,
};
