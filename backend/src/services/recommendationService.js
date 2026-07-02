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
const {
    applyFocusMetric,
    getConcernMetrics,
    getFocusMetricOptions,
    getMetricMeta,
} = require('./recommendation/recommendationMetricUtils');
const { toNumber } = require('../utils/number');

// 추천 service는 최신 분석 또는 선택한 분석 이력을 기준으로 성분/제품/식습관 응답을 조합합니다.
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

// 식습관 가이드처럼 분석 context를 직접 넘기는 흐름에서 수동 focus를 먼저 반영해 지표 순서를 맞춥니다.
function withFocusMetric(analysisContext, focusMetricCode = null) {
    if (!analysisContext || !focusMetricCode) {
        return analysisContext;
    }

    return {
        ...analysisContext,
        metrics: applyFocusMetric(getConcernMetrics(analysisContext.metrics || []), focusMetricCode),
    };
}

// 프론트 선택 UI가 사용할 focus 옵션 목록과 현재 자동/수동 선택 상태를 제공합니다.
async function getFocusOptions(userId, options = {}) {
    const analysisContext = await findAnalysisContextForRecommendations(userId, options.analysisId);
    const focusOptions = getFocusMetricOptions(analysisContext, options.focus);
    const selectedOption = focusOptions.find((option) => option.selected) || null;

    return {
        source: analysisContext
            ? options.analysisId ? 'selected_analysis' : 'latest_analysis'
            : 'default',
        summary: {
            analysisId: analysisContext?.analysis.skin_analysis_id || null,
            analyzedAt: analysisContext?.analysis.analyzed_at || analysisContext?.analysis.created_at || null,
            totalScore: toNumber(analysisContext?.analysis.total_skin_score),
            selectedMetricCode: selectedOption?.code || null,
            selectedMetricName: selectedOption?.name || null,
            message: '추천 화면에서 선택할 수 있는 관리 지표입니다.',
        },
        options: focusOptions,
    };
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
            focusOptions: getFocusMetricOptions(analysisContext, options.focus),
            message: options.analysisId && analysisContext && !options.focus
                ? '선택한 분석 이력 기준으로 추천했습니다.'
                : result.summary.message,
        },
    };
}

async function getDietGuideRecommendations(userId, options = {}) {
    const latestAnalysis = await findAnalysisContextForRecommendations(userId, options.analysisId);
    const latestAnalysisId = latestAnalysis?.analysis.skin_analysis_id || null;

    if (!latestAnalysisId) {
        return buildDefaultDietGuideResponse();
    }

    const focusedAnalysis = withFocusMetric(latestAnalysis, options.focus);
    const ingredientResult = await buildIngredientRecommendationResult(focusedAnalysis, options);
    const personalizedGuides = buildPersonalizedDietGuides(focusedAnalysis, ingredientResult.ingredients);
    const personalizedRoutines = buildPersonalizedDietRoutines(focusedAnalysis, ingredientResult.ingredients);
    const personalizedChecks = buildPersonalizedDietChecks(focusedAnalysis, ingredientResult.ingredients);
    let dietGuides = await recommendationRepository.findDietGuidesByAnalysisId(latestAnalysisId);

    // 사용자가 직접 선택한 focus 결과는 DB에 저장하지 않고, 자동 추천일 때만 기본 식습관 가이드를 저장합니다.
    if (dietGuides.length === 0 && !options.focus) {
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
            guideSource: options.focus ? 'manual_focus' : 'personalized',
            guideCount: personalizedGuides.length,
            focusMetric: ingredientResult.summary.focusMetric || null,
            focusOptions: getFocusMetricOptions(latestAnalysis, options.focus),
            selectedMetricCode: ingredientResult.summary.selectedMetricCode,
            selectedMetricName: ingredientResult.summary.selectedMetricName,
            recommendationMode: options.focus ? 'manual' : 'auto',
            recommendedIngredients: ingredientResult.ingredients.slice(0, 3).map((ingredient) => ingredient.name),
            message: options.focus
                ? `${ingredientResult.summary.selectedMetricName || getMetricMeta(options.focus).name} 지표를 선택해 식습관 가이드를 추천했습니다.`
                : options.analysisId ? '선택한 분석 이력 기준의 식습관 가이드입니다.' : null,
        },
        guides: personalizedGuides,
        routines: personalizedRoutines,
        checks: personalizedChecks,
    };
}

async function getProductRecommendations(userId, options = {}) {
    const ingredientResult = await getIngredientRecommendations(userId, options);
    const result = await buildProductRecommendationResult(ingredientResult, options);

    return {
        ...result,
        summary: {
            ...result.summary,
            focusOptions: ingredientResult.summary.focusOptions,
        },
    };
}

async function getRecommendationSnapshotForAnalysis(userId, analysisId) {
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
    getFocusOptions,
    getIngredientRecommendations,
    getProductRecommendations,
    getRecommendationSnapshotForAnalysis,
};
