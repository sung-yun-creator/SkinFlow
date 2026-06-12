const { analyzeAndSaveSkin, extractAndSaveRoi, extractRoi } = require('../services/analysisService');

function validateImageFile(req, res) {
    if (!req.file) {
        res.status(400).json({
            code: 'IMAGE_FILE_REQUIRED',
            message: '이미지 파일을 첨부해 주세요.',
        });
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

    const analysis = await analyzeAndSaveSkin(req.user.userId, req.file);

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
        return res.status(400).json({
            code: 'ANALYSIS_ID_INVALID',
            message: '올바른 분석 ID가 필요합니다.',
        });
    }

    const roi = await extractAndSaveRoi(req.user.userId, analysisId, req.file);

    if (!roi) {
        return res.status(404).json({
            code: 'ANALYSIS_NOT_FOUND',
            message: '분석 이력을 찾을 수 없습니다.',
        });
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
