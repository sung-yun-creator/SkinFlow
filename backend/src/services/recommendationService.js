const recommendationRepository = require('../repositories/recommendationRepository');
const { buildIngredientRecommendationResult } = require('./recommendation/ingredientRecommendationService');
const {
    buildProductRecommendationResult,
    buildProductRecommendations,
    buildStoredProductRecommendations,
} = require('./recommendation/productRecommendationService');
const {
    buildDefaultDietGuideResponse,
    buildPersonalizedDietChecks,
    buildPersonalizedDietGuides,
    buildPersonalizedDietRoutines,
    toDietGuide,
} = require('./recommendation/dietGuideRecommendationService');
const { toNumber } = require('../utils/number');

// 추천 service는 최신 분석 또는 사용자가 선택한 분석 이력을 기준으로 추천 응답을 조합합니다.
function createAnalysisNotFoundError() {
    const error = new Error('분석 이력을 찾을 수 없습니다.');
    error.status = 404;
    error.code = 'ANALYSIS_NOT_FOUND';
    return error;
}

async function findAnalysisContextForRecommendations(userId, analysisId = null) {
    if (!analysisId) {
        return recommendationRepository.findLatestAnalysisWithMetricsByUserId(userId);
    }

    const analysisContext = await recommendationRepository.findAnalysisWithMetricsByUserIdAndAnalysisId(userId, analysisId);

    if (!analysisContext) {
        throw createAnalysisNotFoundError();
    }

    return analysisContext;
}

async function getIngredientRecommendations(userId, options = {}) {
    const analysisContext = await findAnalysisContextForRecommendations(userId, options.analysisId);
    const result = await buildIngredientRecommendationResult(analysisContext, options);

    return {
        ...result,
        source: analysisContext
            ? options.analysisId ? 'selected_analysis' : 'latest_analysis'
            : 'default',
        summary: {
            ...result.summary,
            source: analysisContext
                ? options.analysisId ? 'selected_analysis' : 'latest_analysis'
                : 'default',
            message: options.analysisId && analysisContext
                ? '선택한 분석 이력 기준으로 추천했습니다.'
                : result.summary.message,
        },
    };
}

async function getDietGuideRecommendations(userId, options = {}) {
    // 식습관 가이드는 최신 분석 또는 선택 분석 ID 기준으로 질문형 가이드와 체크 항목을 만듭니다.
    const latestAnalysis = await findAnalysisContextForRecommendations(userId, options.analysisId);
    const latestAnalysisId = latestAnalysis?.analysis.skin_analysis_id || null;

    if (!latestAnalysisId) {
        return buildDefaultDietGuideResponse();
    }

    const ingredientResult = await buildIngredientRecommendationResult(latestAnalysis);
    const personalizedGuides = buildPersonalizedDietGuides(latestAnalysis, ingredientResult.ingredients);
    const personalizedRoutines = buildPersonalizedDietRoutines(latestAnalysis, ingredientResult.ingredients);
    const personalizedChecks = buildPersonalizedDietChecks(latestAnalysis, ingredientResult.ingredients);
    let dietGuides = await recommendationRepository.findDietGuidesByAnalysisId(latestAnalysisId);

    if (dietGuides.length === 0) {
        dietGuides = await recommendationRepository.createDietGuidesForAnalysis(
            latestAnalysisId,
            personalizedGuides,
        );
    }

    return {
        source: options.analysisId ? 'selected_analysis' : 'latest_analysis',
        summary: {
            analysisId: latestAnalysisId,
            analyzedAt: latestAnalysis.analysis.analyzed_at || latestAnalysis.analysis.created_at || null,
            totalScore: toNumber(latestAnalysis.analysis.total_skin_score),
            guideSource: 'personalized',
            guideCount: personalizedGuides.length,
            focusMetric: ingredientResult.summary.focusMetric || null,
            recommendedIngredients: ingredientResult.ingredients.slice(0, 3).map((ingredient) => ingredient.name),
            message: options.analysisId ? '선택한 분석 이력 기준의 식습관 가이드입니다.' : null,
        },
        guides: personalizedGuides,
        routines: personalizedRoutines,
        checks: personalizedChecks,
    };
}

async function getProductRecommendations(userId, options = {}) {
    // 제품 추천은 먼저 추천 성분을 만든 뒤, 제품-성분 매칭으로 후보를 좁힙니다.
    const ingredientResult = await getIngredientRecommendations(userId, options);
    return buildProductRecommendationResult(ingredientResult, options);
}

async function getRecommendationSnapshotForAnalysis(userId, analysisId) {
    // 상세 리포트는 특정 분석 이력 기준으로 성분/제품/식습관 스냅샷을 다시 맞춰 가져옵니다.
    const analysisContext = await recommendationRepository.findAnalysisWithMetricsByUserIdAndAnalysisId(userId, analysisId);

    if (!analysisContext) {
        return null;
    }

    const ingredientResult = await buildIngredientRecommendationResult(analysisContext);
    let storedProductRows = await recommendationRepository.findProductRecommendationsByAnalysisId(analysisId);

    if (storedProductRows.length === 0) {
        const productRows = await recommendationRepository.findActiveProductsWithIngredients();
        const products = buildProductRecommendations(productRows, ingredientResult.ingredients);
        storedProductRows = await recommendationRepository.createProductRecommendationsForAnalysis(analysisId, products);
    }

    const products = storedProductRows.length > 0
        ? buildStoredProductRecommendations(storedProductRows, ingredientResult.ingredients)
        : [];
    let dietGuides = await recommendationRepository.findDietGuidesByAnalysisId(analysisId);
    const personalizedDietGuides = buildPersonalizedDietGuides(analysisContext, ingredientResult.ingredients);

    if (dietGuides.length === 0) {
        dietGuides = personalizedDietGuides;
    }

    return {
        analysis: analysisContext.analysis,
        metrics: analysisContext.metrics,
        ingredients: ingredientResult.ingredients,
        products,
        dietGuides: personalizedDietGuides.length > 0
            ? personalizedDietGuides
            : dietGuides.map((guide, index) => toDietGuide(guide, index, analysisContext)),
        routines: buildPersonalizedDietRoutines(analysisContext, ingredientResult.ingredients),
        checks: buildPersonalizedDietChecks(analysisContext, ingredientResult.ingredients),
    };
}

module.exports = {
    getDietGuideRecommendations,
    getIngredientRecommendations,
    getProductRecommendations,
    getRecommendationSnapshotForAnalysis,
};
