const {
    getDietGuideRecommendations,
    getFocusOptions,
    getIngredientRecommendations,
    getProductRecommendations,
} = require('../services/recommendationService');
const { validateFocusMetric } = require('../services/recommendation/recommendationMetricUtils');

function parseOptionalAnalysisId(value) {
    if (value === undefined || value === null || String(value).trim() === '') {
        return null;
    }

    const analysisId = Number(value);

    if (!Number.isInteger(analysisId) || analysisId <= 0) {
        const error = new Error('유효한 분석 ID가 아닙니다.');
        error.status = 400;
        error.code = 'INVALID_ANALYSIS_ID';
        throw error;
    }

    return analysisId;
}

function parseOptionalFocus(value) {
    return validateFocusMetric(value);
}

async function listFocusOptions(req, res) {
    const focusOptions = await getFocusOptions(req.user.userId, {
        analysisId: parseOptionalAnalysisId(req.query.analysisId),
        focus: parseOptionalFocus(req.query.focus),
    });

    return res.json(focusOptions);
}

async function listDietGuideRecommendations(req, res) {
    const recommendations = await getDietGuideRecommendations(req.user.userId, {
        analysisId: parseOptionalAnalysisId(req.query.analysisId),
        focus: parseOptionalFocus(req.query.focus),
    });

    return res.json(recommendations);
}

async function listIngredientRecommendations(req, res) {
    const recommendations = await getIngredientRecommendations(req.user.userId, {
        analysisId: parseOptionalAnalysisId(req.query.analysisId),
        focus: parseOptionalFocus(req.query.focus),
    });

    return res.json(recommendations);
}

async function listProductRecommendations(req, res) {
    const recommendations = await getProductRecommendations(req.user.userId, {
        analysisId: parseOptionalAnalysisId(req.query.analysisId),
        focus: parseOptionalFocus(req.query.focus),
    });

    return res.json(recommendations);
}

module.exports = {
    listFocusOptions,
    listDietGuideRecommendations,
    listIngredientRecommendations,
    listProductRecommendations,
};
