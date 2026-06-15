const {
    getIngredientRecommendations,
    getProductRecommendations,
} = require('../services/recommendationService');

async function listIngredientRecommendations(req, res) {
    const recommendations = await getIngredientRecommendations(req.user.userId);

    return res.json(recommendations);
}

async function listProductRecommendations(req, res) {
    const recommendations = await getProductRecommendations(req.user.userId);

    return res.json(recommendations);
}

module.exports = {
    listIngredientRecommendations,
    listProductRecommendations,
};
