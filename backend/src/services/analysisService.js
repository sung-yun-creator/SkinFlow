const DEFAULT_AI_SERVER_URL = 'http://localhost:8000';
const analysisRepository = require('../repositories/analysisRepository');

function getAiServerUrl() {
    return (process.env.AI_SERVER_URL || DEFAULT_AI_SERVER_URL).replace(/\/$/, '');
}

async function requestAiServer(path, file) {
    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });

    formData.append('file', blob, file.originalname);

    const response = await fetch(`${getAiServerUrl()}${path}`, {
        method: 'POST',
        body: formData,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const message = result?.message || result?.detail || 'AI server request failed.';
        const error = new Error(message);
        error.status = response.status;
        error.result = result;
        throw error;
    }

    return result;
}

async function extractRoi(file) {
    return requestAiServer('/extract-roi', file);
}

function toStoredRois(roiResult) {
    if (roiResult?.roi?.status !== 'ok') {
        return [];
    }

    const regions = [];

    if (roiResult.roi.face?.pixel) {
        regions.push(roiResult.roi.face);
    }

    if (Array.isArray(roiResult.roi.regions)) {
        regions.push(...roiResult.roi.regions);
    }

    return regions.filter((region) => region.name && region.pixel);
}

async function extractAndSaveRoi(userId, analysisId, file) {
    const analysis = await analysisRepository.findAnalysisByIdAndUserId(userId, analysisId);

    if (!analysis) {
        return null;
    }

    const roiResult = await extractRoi(file);
    const rois = toStoredRois(roiResult);

    if (roiResult?.roi?.status !== 'ok') {
        return {
            ...roiResult,
            saved: {
                analysisId,
                roiCount: 0,
                skipped: true,
            },
        };
    }

    const savedCount = await analysisRepository.replaceAnalysisRois(analysisId, rois);

    return {
        ...roiResult,
        saved: {
            analysisId,
            roiCount: savedCount,
        },
    };
}

async function analyzeSkin(file) {
    return requestAiServer('/analyze-skin', file);
}

module.exports = {
    analyzeSkin,
    extractAndSaveRoi,
    extractRoi,
};
