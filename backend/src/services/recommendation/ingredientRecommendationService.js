const recommendationRepository = require('../../repositories/recommendationRepository');
const {
    INGREDIENT_REFERENCES,
    METRIC_INGREDIENT_META,
} = require('../../constants/ingredientReference');
const { toNumber } = require('../../utils/number');
const {
    applyFocusMetric,
    formatMetricScoreText,
    getConcernMetrics,
    getMetricMeta,
    getScoreBand,
    normalizeFocusMetric,
    normalizeText,
} = require('./recommendationMetricUtils');

const INGREDIENT_BAND_PRIORITY = {
    pigmentation: {
        intensive: ['트라넥사믹애씨드', '알부틴', '비타민C', '글루타치온'],
        support: ['나이아신아마이드', '비타민C 유도체', '감초추출물', '알파-비사보롤'],
        maintain: ['감초추출물', '닥나무추출물', '나이아신아마이드', '글루타치온'],
        default: ['나이아신아마이드', '비타민C', '알부틴'],
    },
    wrinkle: {
        intensive: ['레티놀', '레티날', '아데노신', '펩타이드'],
        support: ['펩타이드', '바쿠치올', '콜라겐', '토코페롤'],
        maintain: ['세라마이드', '콜라겐', '엘라스틴', '펩타이드'],
        default: ['아데노신', '레티놀', '펩타이드'],
    },
};

// 성분 추천 후보 생성과 분석 이력별 저장/재사용 흐름을 담당합니다.
function scoreToMatch(score, index) {
    const metricScore = Number(score);

    if (!Number.isFinite(metricScore)) {
        return Math.max(80, 94 - index * 3);
    }

    return Math.max(70, Math.min(99, Math.round(100 - metricScore * 0.18 - index * 2)));
}

function getIngredientBandWeight(ingredientName, metricCode, scoreBandCode) {
    const priorityNames = INGREDIENT_BAND_PRIORITY[metricCode]?.[scoreBandCode]
        || INGREDIENT_BAND_PRIORITY[metricCode]?.default
        || [];
    const priorityIndex = priorityNames.indexOf(ingredientName);

    return priorityIndex === -1 ? 0 : 14 - priorityIndex * 3;
}

function getIngredientMetricCode(ingredient, concernMetrics) {
    if (METRIC_INGREDIENT_META[ingredient.ingredient_type]) {
        return ingredient.ingredient_type;
    }

    const text = normalizeText(
        ingredient.ingredient_name,
        ingredient.ingredient_type,
        ingredient.description,
    );

    const matchedMetric = concernMetrics.find((metric) => {
        const meta = getMetricMeta(metric.code);

        return meta.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    });

    return matchedMetric?.code || concernMetrics[0]?.code || 'pigmentation';
}

function getIngredientTags(ingredient, metricMeta) {
    const reference = INGREDIENT_REFERENCES.find((item) => item.name === ingredient.ingredient_name);

    return reference?.tags || metricMeta.tags;
}

function toIngredientRecommendation(ingredient, metric, index) {
    const meta = getMetricMeta(metric.code);
    const name = ingredient.ingredient_name || ingredient.name;
    const type = ingredient.ingredient_type || ingredient.type || null;
    const description = ingredient.description;
    const match = scoreToMatch(metric.score, index);
    const tags = ingredient.tags || getIngredientTags(ingredient, meta);
    const scoreBand = getScoreBand(metric.score);
    const metricName = metric.name || meta.name;
    const reason = `${metricName}${formatMetricScoreText(metric.score)} ${scoreBand.label} 기준으로 참고할 수 있는 성분입니다.`;
    const referenceBasis = {
        metricCode: metric.code,
        metricName,
        metricScore: metric.score,
        metricGrade: metric.grade || null,
        scoreBand: scoreBand.label,
        scoreBandCode: scoreBand.code,
        source: 'latest_analysis',
    };

    return {
        id: ingredient.ingredient_id || null,
        name,
        type,
        description,
        match,
        reason,
        recommendationReason: reason,
        referenceBasis,
        priority: index + 1,
        metricCode: metric.code,
        metricName,
        scoreBand: scoreBand.label,
        tags,
        card: {
            name,
            description,
            match,
            reason,
            referenceBasis,
            tags,
        },
    };
}

function buildIngredientRecommendations(ingredients, concernMetrics, options = {}) {
    // DB 성분이 있으면 DB를 우선 사용하고, 없을 때만 코드에 있는 기본 성분표를 사용합니다.
    const focusMetricCode = concernMetrics[0]?.code || 'pigmentation';
    const sourceIngredients = ingredients.length > 0
        ? ingredients
        : INGREDIENT_REFERENCES.map((ingredient) => ({
            ingredient_id: null,
            ingredient_name: ingredient.name,
            ingredient_type: ingredient.type,
            description: ingredient.description,
            tags: ingredient.tags,
            metricCode: ingredient.type,
        }));

    const focusIngredients = options.focusOnly
        ? sourceIngredients.filter((ingredient) => {
            const metricCode = ingredient.metricCode || getIngredientMetricCode(ingredient, concernMetrics);

            return metricCode === focusMetricCode;
        })
        : [];
    const recommendationIngredients = focusIngredients.length > 0 ? focusIngredients : sourceIngredients;

    return recommendationIngredients
        .map((ingredient, index) => {
            const metricCode = ingredient.metricCode || getIngredientMetricCode(ingredient, concernMetrics);
            const metric = concernMetrics.find((item) => item.code === metricCode)
                || { code: metricCode, name: getMetricMeta(metricCode).name, score: null };

            const recommendation = toIngredientRecommendation(ingredient, metric, index);
            const scoreBand = getScoreBand(metric.score);
            const bandWeight = getIngredientBandWeight(recommendation.name, metric.code, scoreBand.code);

            return {
                ...recommendation,
                sortMatch: recommendation.match
                    + (metric.code === focusMetricCode ? 10 : 0)
                    + bandWeight,
            };
        })
        .sort((left, right) => right.sortMatch - left.sortMatch)
        .slice(0, 3)
        .map(({ sortMatch, ...ingredient }, index) => ({
            ...ingredient,
            priority: index + 1,
        }));
}

function buildStoredIngredientRecommendations(storedIngredients, concernMetrics) {
    return storedIngredients.map((ingredient, index) => {
        const metricCode = getIngredientMetricCode(ingredient, concernMetrics);
        const metric = concernMetrics.find((item) => item.code === metricCode)
            || { code: metricCode, name: getMetricMeta(metricCode).name, score: null };
        const recommendation = toIngredientRecommendation(ingredient, metric, index);
        const match = toNumber(ingredient.match_score) || recommendation.match;

        return {
            ...recommendation,
            match,
            priority: index + 1,
            card: {
                ...recommendation.card,
                match,
            },
        };
    });
}

async function buildIngredientRecommendationResult(analysisContext, options = {}) {
    const ingredients = await recommendationRepository.findIngredients();
    const requestedFocusMetricCode = normalizeFocusMetric(options.focus);
    const concernMetrics = applyFocusMetric(
        getConcernMetrics(analysisContext?.metrics || []),
        requestedFocusMetricCode,
    );
    const focusMetric = concernMetrics[0] || null;
    const analysisId = analysisContext?.analysis.skin_analysis_id || null;
    const isManualFocus = Boolean(requestedFocusMetricCode);
    let ingredientSource = ingredients.length > 0 ? 'database' : 'fallback';
    let recommendations = [];

    if (analysisId && !isManualFocus) {
        const storedIngredients = await recommendationRepository.findIngredientRecommendationsByAnalysisId(analysisId);

        if (storedIngredients.length > 0) {
            ingredientSource = 'stored';
            recommendations = buildStoredIngredientRecommendations(storedIngredients, concernMetrics);
        }
    }

    if (recommendations.length === 0) {
        recommendations = buildIngredientRecommendations(ingredients, concernMetrics, {
            focusOnly: isManualFocus,
        });

        if (analysisId && ingredients.length > 0 && !isManualFocus) {
            const storedIngredients = await recommendationRepository.createIngredientRecommendationsForAnalysis(
                analysisId,
                recommendations,
            );

            if (storedIngredients.length > 0) {
                ingredientSource = 'created';
                recommendations = buildStoredIngredientRecommendations(storedIngredients, concernMetrics);
            }
        }
    }

    return {
        source: analysisContext ? 'analysis' : 'default',
        summary: {
            analysisId,
            analyzedAt: analysisContext?.analysis.analyzed_at || analysisContext?.analysis.created_at || null,
            totalScore: toNumber(analysisContext?.analysis.total_skin_score),
            focusMetric,
            recommendationMode: isManualFocus ? 'manual' : 'auto',
            selectedMetricCode: focusMetric?.code || requestedFocusMetricCode || null,
            selectedMetricName: focusMetric?.name || (requestedFocusMetricCode ? getMetricMeta(requestedFocusMetricCode).name : null),
            recommendationCount: recommendations.length,
            ingredientSource,
            message: isManualFocus
                ? `${focusMetric?.name || getMetricMeta(requestedFocusMetricCode).name} 지표를 사용자가 선택해 추천했습니다.`
                : '최근 분석 결과에서 관리 우선 지표를 자동으로 선택해 추천했습니다.',
        },
        ingredients: recommendations,
    };
}

module.exports = {
    buildIngredientRecommendationResult,
};
