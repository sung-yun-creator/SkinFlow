const { getIngredientRecommendations } = require('../services/recommendationService');

async function listIngredientRecommendations(req, res) {
    const recommendations = await getIngredientRecommendations(req.user.userId);

    return res.json(recommendations);
}

module.exports = {
    listIngredientRecommendations,
};
