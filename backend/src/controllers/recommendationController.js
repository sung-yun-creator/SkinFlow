const {
    getDietGuideRecommendations,
    getFocusOptions,
    getIngredientRecommendations,
    getProductRecommendations,
} = require('../services/recommendationService');
const { validateFocusMetric } = require('../services/recommendation/recommendationMetricUtils');

// recommendation controller는 analysisId/focus 쿼리를 검증한 뒤 service 결과를 그대로 응답합니다.
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

// focus는 색소침착/주름 수동 선택값이며, 비어 있으면 기존 자동 추천 흐름을 사용합니다.
function parseOptionalFocus(value) {
    return validateFocusMetric(value);
}

// 프론트가 드롭다운/버튼 UI를 만들 수 있도록 선택 가능한 추천 기준과 현재 선택 상태를 내려줍니다.
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
