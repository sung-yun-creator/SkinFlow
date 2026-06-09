const { analyzeSkin, extractAndSaveRoi, extractRoi } = require('../services/analysisService');

function validateImageFile(req, res) {
    if (!req.file) {
        res.status(400).json({ message: 'Image file is required.' });
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
        return res.status(400).json({ message: 'Valid analysis id is required.' });
    }

    const roi = await extractAndSaveRoi(req.user.userId, analysisId, req.file);

    if (!roi) {
        return res.status(404).json({ message: 'Analysis history not found.' });
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
