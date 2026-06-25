const {
    getDietGuideRecommendations,
    getIngredientRecommendations,
    getProductRecommendations,
} = require('../services/recommendationService');

// 추천 controller는 focus와 선택 분석 ID 쿼리를 검증한 뒤 service 결과를 반환합니다.
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

async function listDietGuideRecommendations(req, res) {
    const recommendations = await getDietGuideRecommendations(req.user.userId, {
        analysisId: parseOptionalAnalysisId(req.query.analysisId),
    });

    return res.json(recommendations);
}

async function listIngredientRecommendations(req, res) {
    // focus 쿼리가 있으면 사용자가 선택한 관리 지표를 우선해 추천합니다.
    const recommendations = await getIngredientRecommendations(req.user.userId, {
        analysisId: parseOptionalAnalysisId(req.query.analysisId),
        focus: req.query.focus,
    });

    return res.json(recommendations);
}

async function listProductRecommendations(req, res) {
    // 제품 추천도 성분 추천과 같은 focus 기준을 공유합니다.
    const recommendations = await getProductRecommendations(req.user.userId, {
        analysisId: parseOptionalAnalysisId(req.query.analysisId),
        focus: req.query.focus,
    });

    return res.json(recommendations);
}

module.exports = {
    listDietGuideRecommendations,
    listIngredientRecommendations,
    listProductRecommendations,
};
