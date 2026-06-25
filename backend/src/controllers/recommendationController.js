const {
    getDietGuideRecommendations,
    getIngredientRecommendations,
    getProductRecommendations,
} = require('../services/recommendationService');

// 추천 controller는 쿼리 옵션만 받아 service 결과를 그대로 API 응답으로 반환합니다.
async function listDietGuideRecommendations(req, res) {
    const recommendations = await getDietGuideRecommendations(req.user.userId);

    return res.json(recommendations);
}

async function listIngredientRecommendations(req, res) {
    // focus 쿼리가 있으면 사용자가 선택한 관리 지표를 우선해 추천합니다.
    const recommendations = await getIngredientRecommendations(req.user.userId, {
        focus: req.query.focus,
    });

    return res.json(recommendations);
}

async function listProductRecommendations(req, res) {
    // 제품 추천도 성분 추천과 같은 focus 기준을 공유합니다.
    const recommendations = await getProductRecommendations(req.user.userId, {
        focus: req.query.focus,
    });

    return res.json(recommendations);
}

module.exports = {
    listDietGuideRecommendations,
    listIngredientRecommendations,
    listProductRecommendations,
};
