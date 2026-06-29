const analysisRecommendationRepository = require('./recommendation/analysisRecommendationRepository');
const dietGuideRecommendationRepository = require('./recommendation/dietGuideRecommendationRepository');
const ingredientRecommendationRepository = require('./recommendation/ingredientRecommendationRepository');
const productRecommendationRepository = require('./recommendation/productRecommendationRepository');

// 기존 service import 경로를 유지하기 위한 추천 repository 집계 파일입니다.
function createDietGuidesForAnalysis(analysisId, guides) {
    return dietGuideRecommendationRepository.createDietGuidesForAnalysis(
        analysisId,
        guides,
        analysisRecommendationRepository.createAnalysisRecommendation,
    );
}

function createIngredientRecommendationsForAnalysis(analysisId, ingredients) {
    return ingredientRecommendationRepository.createIngredientRecommendationsForAnalysis(
        analysisId,
        ingredients,
        analysisRecommendationRepository.createAnalysisRecommendation,
    );
}

function createProductRecommendationsForAnalysis(analysisId, products) {
    return productRecommendationRepository.createProductRecommendationsForAnalysis(
        analysisId,
        products,
        analysisRecommendationRepository.createAnalysisRecommendation,
    );
}

module.exports = {
    createDietGuidesForAnalysis,
    createIngredientRecommendationsForAnalysis,
    createProductRecommendationsForAnalysis,
    findActiveProductsWithIngredients: productRecommendationRepository.findActiveProductsWithIngredients,
    findAnalysisWithMetricsByUserIdAndAnalysisId: analysisRecommendationRepository.findAnalysisWithMetricsByUserIdAndAnalysisId,
    findDietGuidesByAnalysisId: dietGuideRecommendationRepository.findDietGuidesByAnalysisId,
    findIngredientRecommendationsByAnalysisId: ingredientRecommendationRepository.findIngredientRecommendationsByAnalysisId,
    findIngredients: ingredientRecommendationRepository.findIngredients,
    findLatestAnalysisWithMetricsByUserId: analysisRecommendationRepository.findLatestAnalysisWithMetricsByUserId,
    findProductRecommendationsByAnalysisId: productRecommendationRepository.findProductRecommendationsByAnalysisId,
};
