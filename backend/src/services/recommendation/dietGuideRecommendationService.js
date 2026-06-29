const {
    DIET_CHECK_REFERENCES,
    DIET_GUIDE_REFERENCES,
    DIET_QUESTION_REFERENCES,
    DIET_ROUTINE_REFERENCES,
} = require('../../constants/dietGuideReference');
const { toNumber } = require('../../utils/number');
const {
    formatMetricScoreText,
    getConcernMetrics,
    getMetricMeta,
    getScoreBand,
    uniqueByMetricCode,
} = require('./recommendationMetricUtils');

const MAX_DIET_GUIDE_COUNT = 3;

// 식습관 가이드 응답 조립만 담당합니다. API 응답 필드는 기존 recommendationService 계약을 유지합니다.
function buildDietGuideReferenceBasis(analysisContext) {
    if (!analysisContext?.analysis) {
        return {
            source: 'default',
            message: '분석 이력이 없어 기본 식습관 가이드를 제공합니다.',
        };
    }

    const concernMetrics = getConcernMetrics(analysisContext.metrics || []);
    const focusMetric = concernMetrics[0] || null;

    return {
        source: 'latest_analysis',
        analysisId: analysisContext.analysis.skin_analysis_id,
        analyzedAt: analysisContext.analysis.analyzed_at || analysisContext.analysis.created_at || null,
        totalScore: toNumber(analysisContext.analysis.total_skin_score),
        grade: analysisContext.analysis.grade_name || null,
        focusMetric: focusMetric
            ? {
                code: focusMetric.code,
                name: focusMetric.name,
                score: focusMetric.score,
                grade: focusMetric.grade,
                scoreBand: getScoreBand(focusMetric.score).label,
            }
            : null,
    };
}

function toDietGuide(guide, index, analysisContext = null) {
    const title = guide.guide_title || guide.title;
    const reference = DIET_GUIDE_REFERENCES.find((item) => item.title === title);
    const priority = guide.priority || reference?.priority || `${index + 1}순위`;
    const referenceBasis = buildDietGuideReferenceBasis(analysisContext);
    const reason = guide.recommend_reason || guide.reason;

    return {
        id: guide.diet_guide_id || null,
        recommendationId: guide.analysis_recommendation_id || null,
        ingredientId: guide.ingredient_id || null,
        ingredientName: guide.ingredient_name || null,
        category: guide.diet_category || guide.category,
        title,
        content: guide.guide_content || guide.content,
        reason,
        recommendationReason: reason,
        referenceBasis,
        priority,
        createdAt: guide.created_at || null,
        card: {
            title,
            description: guide.guide_content || guide.content,
            tag: guide.diet_category || guide.category,
            priority,
            reason,
            referenceBasis,
        },
    };
}

function buildFallbackDietGuides() {
    return DIET_GUIDE_REFERENCES.map((guide, index) => toDietGuide(guide, index));
}

function buildDefaultDietGuideResponse() {
    return {
        source: 'default',
        summary: {
            analysisId: null,
            analyzedAt: null,
            totalScore: null,
            guideSource: 'fallback',
            guideCount: DIET_GUIDE_REFERENCES.length,
            message: '분석 이력이 없어 기본 식습관 가이드를 제공합니다.',
        },
        guides: buildFallbackDietGuides(),
        routines: DIET_ROUTINE_REFERENCES,
        checks: DIET_CHECK_REFERENCES,
    };
}

function getMetricQuestionReference(metric) {
    const scoreBand = getScoreBand(metric?.score);
    const metricReferences = DIET_QUESTION_REFERENCES[metric?.code] || {};

    return {
        reference: metricReferences[scoreBand.code] || metricReferences.default || null,
        scoreBand,
    };
}

function formatIngredientNames(ingredients, metricCode, limit = 2) {
    const names = ingredients
        .filter((ingredient) => !metricCode || ingredient.metricCode === metricCode)
        .map((ingredient) => ingredient.name)
        .filter(Boolean);

    return [...new Set(names)].slice(0, limit);
}

function buildDietReason(reference, metric, scoreBand, ingredientNames) {
    const metricName = metric?.name || getMetricMeta(metric?.code).name;
    const scoreText = metric?.score !== null && metric?.score !== undefined
        ? `${Math.round(metric.score)}점`
        : '점수 확인 전';
    const ingredientText = ingredientNames.length > 0
        ? ` 맞춤추천 성분(${ingredientNames.join(', ')})과도 함께 확인할 수 있습니다.`
        : '';

    return `${metricName} ${scoreText} ${scoreBand.label} 기준입니다. ${reference.reason}${ingredientText}`;
}

function toPersonalizedDietGuide(reference, metric, index, ingredients = [], analysisContext = null) {
    const { scoreBand } = getMetricQuestionReference(metric);
    const ingredientNames = formatIngredientNames(ingredients, metric?.code);
    const metricName = metric?.name || getMetricMeta(metric?.code).name;

    return toDietGuide(
        {
            ...reference,
            reason: buildDietReason(reference, metric, scoreBand, ingredientNames),
            priority: `${metricName} ${scoreBand.label}`,
            ingredient_name: ingredientNames[0] || null,
        },
        index,
        analysisContext,
    );
}

function buildPersonalizedDietGuides(analysisContext, ingredients = []) {
    if (!analysisContext?.analysis) {
        return buildFallbackDietGuides();
    }

    const concernMetrics = uniqueByMetricCode(getConcernMetrics(analysisContext.metrics || []));
    const metricGuides = concernMetrics
        .map((metric, index) => {
            const { reference } = getMetricQuestionReference(metric);

            return reference
                ? toPersonalizedDietGuide(reference, metric, index, ingredients, analysisContext)
                : null;
        })
        .filter(Boolean);
    const commonGuides = [
        DIET_QUESTION_REFERENCES.hydration,
        DIET_QUESTION_REFERENCES.trigger,
    ].map((reference, index) => toDietGuide(reference, metricGuides.length + index, analysisContext));

    return [...metricGuides, ...commonGuides].slice(0, MAX_DIET_GUIDE_COUNT);
}

function buildPersonalizedDietRoutines(analysisContext) {
    if (!analysisContext?.analysis) {
        return DIET_ROUTINE_REFERENCES;
    }

    const concernMetrics = uniqueByMetricCode(getConcernMetrics(analysisContext.metrics || []));
    const focusMetric = concernMetrics[0] || null;
    const secondMetric = concernMetrics[1] || null;
    const focusMeta = getMetricMeta(focusMetric?.code);

    return [
        {
            time: '아침',
            text: focusMetric?.code === 'wrinkle'
                ? '아침에는 물 한 잔과 삶은 달걀, 플레인 요거트처럼 부담 없는 음식으로 하루를 시작해보세요.'
                : '아침에는 물 한 잔과 키위, 오렌지, 토마토처럼 산뜻한 과일이나 채소를 곁들여보세요.',
            category: focusMeta.name,
        },
        {
            time: '점심',
            text: focusMetric?.code === 'wrinkle'
                ? '점심에는 닭가슴살 샐러드나 두부 덮밥처럼 든든하지만 무겁지 않은 식사를 선택해보세요.'
                : '점심에는 브로콜리, 파프리카, 닭가슴살 샐러드처럼 색이 다양한 식사를 골라보는 것도 좋습니다.',
            category: '맞춤추천 연계',
        },
        {
            time: '저녁',
            text: secondMetric?.code === 'wrinkle'
                ? '저녁에는 늦은 야식을 잠시 줄이고, 잠들기 전 몸에 부담이 적은 루틴으로 마무리해보세요.'
                : '저녁에는 단 음료나 달콤한 간식을 잠시 쉬고, 늦은 야식도 조금 덜어내보세요.',
            category: secondMetric?.name || '생활 루틴',
        },
    ];
}

function buildPersonalizedDietChecks(analysisContext) {
    if (!analysisContext?.analysis) {
        return DIET_CHECK_REFERENCES;
    }

    const concernMetrics = uniqueByMetricCode(getConcernMetrics(analysisContext.metrics || []));
    const focusMetric = concernMetrics[0] || null;
    const secondMetric = concernMetrics[1] || null;
    const focusMeta = getMetricMeta(focusMetric?.code);
    const secondMeta = getMetricMeta(secondMetric?.code);
    const focusLabel = focusMetric?.code === 'wrinkle'
        ? '단백질 식품 하나 챙기기'
        : '과일이나 채소 하나 챙기기';
    const secondLabel = secondMetric?.code === 'wrinkle'
        ? '물 자주 마시기'
        : '자외선 차단 함께 챙기기';
    const focusDescription = focusMetric?.code === 'wrinkle'
        ? '단백질, 비타민 C, 오메가-3 식품처럼 탄력 관리에 참고할 수 있는 식품을 오늘 식사에 하나 넣어봅니다.'
        : '비타민 C 과일이나 항산화 채소처럼 피부톤 관리에 참고할 수 있는 식품을 오늘 식사에 하나 포함합니다.';

    return [
        {
            title: focusLabel,
            category: focusMeta.name,
            description: focusDescription,
        },
        {
            title: '오늘 먹은 간식 한 번 돌아보기',
            category: '맞춤추천',
            description: '단 음료, 과자, 패스트푸드처럼 자주 반복되는 간식이 있었는지 가볍게 확인합니다.',
        },
        {
            title: secondLabel,
            category: secondMeta.name,
            description: secondMetric?.code === 'wrinkle'
                ? '수분, 단백질, 수면 루틴을 함께 확인합니다.'
                : '자외선 차단, 항산화 식품, 피부 자극 최소화를 함께 확인합니다.',
        },
        {
            title: '단 음료와 늦은 야식 빈도 줄이기',
            category: '생활 루틴',
            description: '피부 컨디션을 흔들 수 있는 반복 습관을 오늘 한 번만 줄여봅니다.',
        },
    ];
}

module.exports = {
    buildDefaultDietGuideResponse,
    buildPersonalizedDietChecks,
    buildPersonalizedDietGuides,
    buildPersonalizedDietRoutines,
    toDietGuide,
};
