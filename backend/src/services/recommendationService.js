const recommendationRepository = require('../repositories/recommendationRepository');
const {
    INGREDIENT_REFERENCES,
    METRIC_INGREDIENT_META,
} = require('../constants/ingredientReference');
const {
    DIET_CHECK_REFERENCES,
    DIET_GUIDE_REFERENCES,
    DIET_QUESTION_REFERENCES,
    DIET_ROUTINE_REFERENCES,
} = require('../constants/dietGuideReference');
const { toNumber } = require('../utils/number');

const OLIVE_YOUNG_SEARCH_BASE_URL = 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=';
const MAX_DIET_GUIDE_COUNT = 3;

// 추천 service는 최신 분석 또는 사용자가 선택한 분석 이력을 기준으로 추천 응답을 조합합니다.
function oliveYoungSearchUrl(keyword) {
    return `${OLIVE_YOUNG_SEARCH_BASE_URL}${encodeURIComponent(keyword)}`;
}

function isOliveYoungSearchUrl(url) {
    return typeof url === 'string' && url.includes('/store/search/getSearchMain.do');
}

function scoreToMatch(score, index) {
    const metricScore = Number(score);

    if (!Number.isFinite(metricScore)) {
        return Math.max(80, 94 - index * 3);
    }

    return Math.max(70, Math.min(99, Math.round(100 - metricScore * 0.18 - index * 2)));
}

function getScoreBand(score) {
    const metricScore = Number(score);

    if (!Number.isFinite(metricScore)) {
        return {
            code: 'default',
            label: '기본 추천',
            description: '분석 점수가 명확하지 않아 기본 관리 성분을 참고합니다.',
        };
    }

    if (metricScore < 60) {
        return {
            code: 'intensive',
            label: '집중 관리',
            description: '점수가 낮아 우선 관리가 필요한 지표입니다.',
        };
    }

    if (metricScore < 80) {
        return {
            code: 'support',
            label: '개선 보조',
            description: '주의 구간의 지표를 보완하기 위한 성분을 참고합니다.',
        };
    }

    return {
        code: 'maintain',
        label: '유지 관리',
        description: '상태 유지를 돕는 순한 관리 성분을 참고합니다.',
    };
}

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

function getIngredientBandWeight(ingredientName, metricCode, scoreBandCode) {
    const priorityNames = INGREDIENT_BAND_PRIORITY[metricCode]?.[scoreBandCode]
        || INGREDIENT_BAND_PRIORITY[metricCode]?.default
        || [];
    const priorityIndex = priorityNames.indexOf(ingredientName);

    return priorityIndex === -1 ? 0 : 14 - priorityIndex * 3;
}

function formatMetricScoreText(score) {
    const metricScore = Number(score);

    return Number.isFinite(metricScore) ? ` ${Math.round(metricScore)}점` : '';
}

function normalizeText(...values) {
    return values.filter(Boolean).join(' ').toLowerCase();
}

function getMetricMeta(metricCode) {
    return METRIC_INGREDIENT_META[metricCode] || {
        name: metricCode || 'skin metric',
        tags: ['피부관리'],
        keywords: [metricCode || 'skin'],
    };
}

function getConcernMetrics(metrics) {
    // 점수가 낮은 지표일수록 우선 관리 대상으로 보기 위해 추천 기준으로 변환합니다.
    const validMetrics = metrics
        .map((metric) => ({
            code: metric.metric_code || null,
            name: metric.metric_name || null,
            score: toNumber(metric.metric_score),
            grade: metric.grade_name || null,
        }))
        .filter((metric) => metric.code && metric.score !== null);

    return validMetrics.length > 0
        ? validMetrics
        : [
            { code: 'pigmentation', name: '색소침착', score: null, grade: null },
            { code: 'wrinkle', name: '주름', score: null, grade: null },
        ];
}

function normalizeFocusMetric(focus) {
    // 프론트에서 사용자가 색소침착/주름을 직접 선택하면 쿼리값을 내부 지표 코드로 맞춥니다.
    const normalizedFocus = String(focus || '').trim().toLowerCase();

    if (['pigmentation', 'pigment', 'spot', 'tone', 'color', '색소', '색소침착'].includes(normalizedFocus)) {
        return 'pigmentation';
    }

    if (['wrinkle', 'wrinkles', 'elastic', 'firm', '주름', '탄력'].includes(normalizedFocus)) {
        return 'wrinkle';
    }

    return null;
}

function applyFocusMetric(concernMetrics, focusMetricCode) {
    if (!focusMetricCode) {
        return concernMetrics;
    }

    const focusedMetric = concernMetrics.find((metric) => metric.code === focusMetricCode);

    if (!focusedMetric) {
        return concernMetrics;
    }

    return [
        focusedMetric,
        ...concernMetrics.filter((metric) => metric.code !== focusMetricCode),
    ];
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

function getIngredientTags(ingredient, metricMeta) {
    const reference = INGREDIENT_REFERENCES.find((item) => item.name === ingredient.ingredient_name);

    return reference?.tags || metricMeta.tags;
}

function buildIngredientRecommendations(ingredients, concernMetrics) {
    // DB 성분이 있으면 DB를 우선 사용하고, 없을 때만 코드에 있는 기본 성분표를 사용합니다.
    const sortedConcernMetrics = [...concernMetrics].sort((left, right) => {
        const leftScore = left.score === null ? 999 : left.score;
        const rightScore = right.score === null ? 999 : right.score;

        return leftScore - rightScore;
    });
    const focusMetricCode = sortedConcernMetrics[0]?.code || 'pigmentation';
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

    return sourceIngredients
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

function groupProducts(productRows) {
    const productMap = new Map();

    productRows.forEach((row) => {
        if (!productMap.has(row.product_id)) {
            productMap.set(row.product_id, {
                product_id: row.product_id,
                brand_name: row.brand_name,
                product_name: row.product_name,
                product_type: row.product_type,
                price_amount: toNumber(row.price_amount),
                product_url: row.product_url,
                description: row.product_description,
                product_img: row.product_img,
                ingredients: [],
            });
        }

        if (row.ingredient_id) {
            productMap.get(row.product_id).ingredients.push({
                ingredient_id: row.ingredient_id,
                ingredient_name: row.ingredient_name,
                ingredient_type: row.ingredient_type,
                ingredient_pct: toNumber(row.ingredient_pct),
                description: row.ingredient_description,
            });
        }
    });

    return [...productMap.values()];
}

function sortMatchedIngredientsByProductFit(matchedIngredients) {
    return [...matchedIngredients].sort((left, right) => (
        (right.productIngredientRank || 0) - (left.productIngredientRank || 0)
        || (left.priority || 999) - (right.priority || 999)
        || right.match - left.match
        || left.id - right.id
    ));
}

function getIngredientKey(ingredient) {
    return ingredient?.id ? `id:${ingredient.id}` : `name:${ingredient?.name || ''}`;
}

function pickProductLinkIngredient(matchedIngredients, usedIngredientKeys) {
    const sortedIngredients = sortMatchedIngredientsByProductFit(matchedIngredients);

    return sortedIngredients.find((ingredient) => !usedIngredientKeys.has(getIngredientKey(ingredient)))
        || sortedIngredients[0]
        || null;
}

function toPublicMatchedIngredient(ingredient) {
    if (!ingredient) {
        return null;
    }

    return {
        id: ingredient.id,
        name: ingredient.name,
        match: ingredient.match,
        tags: ingredient.tags,
        referenceBasis: ingredient.referenceBasis || null,
    };
}

function applyProductSearchUrls(products) {
    // 상세 URL이 DB에 있으면 그대로 사용하고, 없으면 검색 URL을 별도 필드로 내려줍니다.
    const usedIngredientKeys = new Set();

    return products.map((product) => {
        const linkCandidates = product.linkIngredients || product.matchedIngredients || [];
        const linkIngredient = pickProductLinkIngredient(linkCandidates, usedIngredientKeys);
        const hasDirectProductUrl = product.productUrl && !isOliveYoungSearchUrl(product.productUrl);
        const productUrl = hasDirectProductUrl ? product.productUrl : null;
        const productSearchUrl = product.productName
            ? oliveYoungSearchUrl(product.productName)
            : (linkIngredient?.name ? oliveYoungSearchUrl(linkIngredient.name) : null);
        const productLinkType = hasDirectProductUrl ? 'product_detail' : 'missing_product_detail';
        const linkKeyword = product.productName || linkIngredient?.name || null;

        if (linkIngredient) {
            usedIngredientKeys.add(getIngredientKey(linkIngredient));
        }

        const { linkIngredients, ...publicProduct } = product;
        const displayedMatchedIngredient = toPublicMatchedIngredient(linkIngredient);
        const displayedMatchedIngredients = displayedMatchedIngredient ? [displayedMatchedIngredient] : [];

        return {
            ...publicProduct,
            productUrl,
            productSearchUrl,
            productLinkType,
            linkKeyword,
            matchedIngredients: displayedMatchedIngredients,
            linkIngredient: displayedMatchedIngredient,
            recommendationReason: buildProductRecommendationReason(product, displayedMatchedIngredient),
            referenceBasis: buildProductReferenceBasis(product, displayedMatchedIngredient, productLinkType),
            card: {
                ...product.card,
                productUrl,
                productSearchUrl,
                productLinkType,
                linkKeyword,
                matchedIngredients: displayedMatchedIngredients,
                recommendationReason: buildProductRecommendationReason(product, displayedMatchedIngredient),
            },
        };
    });
}

function buildProductRecommendationReason(product, displayedMatchedIngredient) {
    if (!displayedMatchedIngredient) {
        return '등록된 제품 DB를 기준으로 추천된 제품입니다.';
    }

    const basis = displayedMatchedIngredient.referenceBasis;
    const metricText = basis?.metricName
        ? `${basis.metricName}${formatMetricScoreText(basis.metricScore)}`
        : '최근 분석 결과';

    return `${metricText} 기준으로 추천된 ${displayedMatchedIngredient.name} 성분과 연결되는 제품입니다.`;
}

function buildProductReferenceBasis(product, displayedMatchedIngredient, productLinkType) {
    return {
        productSource: 'LOCAL_DB',
        productId: product.id,
        productName: product.productName,
        productLinkType,
        matchedIngredient: displayedMatchedIngredient
            ? {
                id: displayedMatchedIngredient.id,
                name: displayedMatchedIngredient.name,
                match: displayedMatchedIngredient.match,
            }
            : null,
        ingredientReference: displayedMatchedIngredient?.referenceBasis || null,
    };
}

function buildStoredProductRecommendations(productRows, ingredientRecommendations) {
    const recommendedIngredients = new Map(
        ingredientRecommendations
            .filter((ingredient) => ingredient.id)
            .map((ingredient) => [ingredient.id, ingredient]),
    );

    const products = groupProducts(productRows)
        .map((product) => {
            const sourceRows = productRows.filter((row) => row.product_id === product.product_id);
            const source = sourceRows[0] || {};
            const matchedIngredients = product.ingredients
                .map((ingredient) => {
                    const recommendation = recommendedIngredients.get(ingredient.ingredient_id);

                    if (!recommendation) {
                        return null;
                    }

                    return {
                        id: ingredient.ingredient_id,
                        name: ingredient.ingredient_name,
                        match: recommendation.match,
                        tags: recommendation.tags,
                        priority: recommendation.priority,
                        referenceBasis: recommendation.referenceBasis,
                        productIngredientRank: toNumber(ingredient.ingredient_pct) || 0,
                    };
                })
                .filter(Boolean)
                .sort((left, right) => right.match - left.match || left.id - right.id);
            const tags = [...new Set(matchedIngredients.flatMap((ingredient) => ingredient.tags || []))].slice(0, 4);
            const match = toNumber(source.match_score) || 0;
            const rank = toNumber(source.rank_no) || null;

            return {
                id: product.product_id,
                brandName: product.brand_name,
                productName: product.product_name,
                productType: product.product_type,
                priceAmount: product.price_amount,
                productUrl: product.product_url,
                imageUrl: product.product_img,
                description: product.description,
                match,
                matchedIngredients,
                linkIngredients: matchedIngredients,
                tags,
                rank,
                card: {
                    brandName: product.brand_name,
                    name: product.product_name,
                    description: product.description,
                    match,
                    tags,
                    productUrl: product.product_url,
                    imageUrl: product.product_img,
                },
            };
        })
        .sort((left, right) => (left.rank || 999) - (right.rank || 999) || right.match - left.match || left.id - right.id)
        .map((product, index) => ({
            ...product,
            rank: product.rank || index + 1,
        }))
        .map((product) => ({
            ...product,
            linkIngredients: sortMatchedIngredientsByProductFit(product.linkIngredients),
        }));

    return applyProductSearchUrls(products);
}

function buildProductRecommendations(productRows, ingredientRecommendations) {
    const recommendedIngredients = new Map(
        ingredientRecommendations
            .filter((ingredient) => ingredient.id)
            .map((ingredient) => [ingredient.id, ingredient]),
    );

    const products = groupProducts(productRows)
        .map((product) => {
            const ingredientRanks = product.ingredients
                .map((ingredient) => toNumber(ingredient.ingredient_pct))
                .filter((rank) => rank !== null);
            const primaryIngredientRank = ingredientRanks.length > 0
                ? Math.max(...ingredientRanks)
                : null;
            const matchedIngredients = product.ingredients
                .map((ingredient) => {
                    const recommendation = recommendedIngredients.get(ingredient.ingredient_id);

                    if (!recommendation) {
                        return null;
                    }

                    return {
                        id: ingredient.ingredient_id,
                        name: ingredient.ingredient_name,
                        match: recommendation.match,
                        tags: recommendation.tags,
                        priority: recommendation.priority,
                        referenceBasis: recommendation.referenceBasis,
                        productIngredientRank: toNumber(ingredient.ingredient_pct) || 0,
                    };
                })
                .filter(Boolean);

            if (matchedIngredients.length === 0) {
                return null;
            }

            const primaryMatchedIngredients = primaryIngredientRank === null
                ? matchedIngredients
                : matchedIngredients.filter((ingredient) => ingredient.productIngredientRank === primaryIngredientRank);
            const matchIngredients = primaryMatchedIngredients.length > 0
                ? primaryMatchedIngredients
                : matchedIngredients;
            const match = Math.round(
                matchIngredients.reduce((sum, ingredient) => sum + ingredient.match, 0)
                / matchIngredients.length,
            );
            const sortedMatchedIngredients = sortMatchedIngredientsByProductFit(matchedIngredients);
            const tags = [...new Set(sortedMatchedIngredients.flatMap((ingredient) => ingredient.tags || []))].slice(0, 4);

            return {
                id: product.product_id,
                brandName: product.brand_name,
                productName: product.product_name,
                productType: product.product_type,
                priceAmount: product.price_amount,
                productUrl: product.product_url,
                imageUrl: product.product_img,
                description: product.description,
                match,
                matchedIngredients: sortedMatchedIngredients,
                linkIngredients: sortedMatchedIngredients,
                tags,
                card: {
                    brandName: product.brand_name,
                    name: product.product_name,
                    description: product.description,
                    match,
                    tags,
                    productUrl: product.product_url,
                    imageUrl: product.product_img,
                },
            };
        })
        .filter(Boolean)
        .sort((left, right) => right.match - left.match || left.id - right.id)
        .slice(0, 3)
        .map((product, index) => ({
            ...product,
            rank: index + 1,
        }));

    return applyProductSearchUrls(products);
}

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

function uniqueByMetricCode(metrics) {
    const seen = new Set();

    return metrics.filter((metric) => {
        if (!metric?.code || seen.has(metric.code)) {
            return false;
        }

        seen.add(metric.code);
        return true;
    });
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

function buildPersonalizedDietRoutines(analysisContext, ingredients = []) {
    if (!analysisContext?.analysis) {
        return DIET_ROUTINE_REFERENCES;
    }

    const concernMetrics = uniqueByMetricCode(getConcernMetrics(analysisContext.metrics || []));
    const focusMetric = concernMetrics[0] || null;
    const secondMetric = concernMetrics[1] || null;
    const focusMeta = getMetricMeta(focusMetric?.code);
    const focusIngredient = formatIngredientNames(ingredients, focusMetric?.code, 1)[0];
    const secondIngredient = formatIngredientNames(ingredients, secondMetric?.code, 1)[0];

    return [
        {
            time: '아침',
            text: focusMetric?.code === 'wrinkle'
                ? '단백질 식품과 물 한 잔으로 탄력 관리 루틴을 시작해보세요.'
                : '비타민 C 과일이나 채소를 곁들이고 자외선 차단도 함께 챙겨보세요.',
            category: focusMeta.name,
        },
        {
            time: '점심',
            text: focusIngredient
                ? `${focusIngredient} 추천 흐름과 맞춰 채소, 단백질, 과일을 균형 있게 선택해보세요.`
                : '채소와 단백질이 포함된 식사를 선택해 피부 컨디션을 안정적으로 유지해보세요.',
            category: '맞춤추천 연계',
        },
        {
            time: '저녁',
            text: secondIngredient
                ? `${secondIngredient} 관리 방향을 떠올리며 단 음료와 늦은 야식 빈도를 줄여보세요.`
                : '야식과 과한 당 섭취를 줄이고 충분한 수면으로 회복 루틴을 준비하세요.',
            category: secondMetric?.name || '생활 루틴',
        },
    ];
}

function buildPersonalizedDietChecks(analysisContext, ingredients = []) {
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

async function buildIngredientRecommendationResult(analysisContext, options = {}) {
    // 자동 추천은 분석 이력의 낮은 지표를, 수동 추천은 focus로 선택한 지표를 우선합니다.
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
        // 자동 추천은 같은 분석 이력에서 이미 만든 추천이 있으면 재사용합니다.
        const storedIngredients = await recommendationRepository.findIngredientRecommendationsByAnalysisId(analysisId);

        if (storedIngredients.length > 0) {
            ingredientSource = 'stored';
            recommendations = buildStoredIngredientRecommendations(storedIngredients, concernMetrics);
        }
    }

    if (recommendations.length === 0) {
        recommendations = buildIngredientRecommendations(ingredients, concernMetrics);

        if (analysisId && ingredients.length > 0 && !isManualFocus) {
            // DB 성분으로 새로 계산한 자동 추천은 분석 이력에 저장해 이후 상세 리포트와 맞춥니다.
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
    const requestedFocusMetricCode = normalizeFocusMetric(options.focus);
    const ingredientResult = await getIngredientRecommendations(userId, options);
    const analysisId = ingredientResult.summary.analysisId || null;
    const isManualFocus = Boolean(requestedFocusMetricCode);
    let productSource = 'empty_database';
    let products = [];

    if (analysisId && !isManualFocus) {
        const storedProductRows = await recommendationRepository.findProductRecommendationsByAnalysisId(analysisId);

        if (storedProductRows.length > 0) {
            productSource = 'stored';
            products = buildStoredProductRecommendations(storedProductRows, ingredientResult.ingredients);
        }
    }

    if (products.length === 0) {
        const productRows = await recommendationRepository.findActiveProductsWithIngredients();
        productSource = productRows.length > 0 ? 'database' : 'empty_database';
        products = buildProductRecommendations(productRows, ingredientResult.ingredients);

        if (analysisId && products.length > 0 && !isManualFocus) {
            const storedProductRows = await recommendationRepository.createProductRecommendationsForAnalysis(
                analysisId,
                products,
            );

            if (storedProductRows.length > 0) {
                productSource = 'created';
                products = buildStoredProductRecommendations(storedProductRows, ingredientResult.ingredients);
            }
        }
    }

    return {
        source: ingredientResult.source,
        summary: {
            ...ingredientResult.summary,
            recommendationCount: products.length,
            ingredientRecommendationCount: ingredientResult.ingredients.length,
            productSource,
            recommendationMode: isManualFocus ? 'manual' : ingredientResult.summary.recommendationMode,
            selectedMetricCode: ingredientResult.summary.selectedMetricCode,
            selectedMetricName: ingredientResult.summary.selectedMetricName,
            message: productSource !== 'empty_database'
                ? ingredientResult.summary.message
                : '등록된 제품 데이터가 아직 없습니다.',
        },
        products,
    };
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
