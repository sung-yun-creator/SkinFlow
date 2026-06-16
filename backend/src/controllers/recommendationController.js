const {
    getDietGuideRecommendations,
    getIngredientRecommendations,
    getProductRecommendations,
} = require('../services/recommendationService');

async function listDietGuideRecommendations(req, res) {
    const recommendations = await getDietGuideRecommendations(req.user.userId);

    return res.json(recommendations);
}

async function listIngredientRecommendations(req, res) {
    const recommendations = await getIngredientRecommendations(req.user.userId);

    return res.json(recommendations);
}

async function listProductRecommendations(req, res) {
    const recommendations = await getProductRecommendations(req.user.userId);

    return res.json(recommendations);
}

module.exports = {
    listDietGuideRecommendations,
    listIngredientRecommendations,
    listProductRecommendations,
};
