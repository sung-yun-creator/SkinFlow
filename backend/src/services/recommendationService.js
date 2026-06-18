const recommendationRepository = require('../repositories/recommendationRepository');
const {
    INGREDIENT_REFERENCES,
    METRIC_INGREDIENT_META,
} = require('../constants/ingredientReference');
const {
    DIET_CHECK_REFERENCES,
    DIET_GUIDE_REFERENCES,
    DIET_ROUTINE_REFERENCES,
} = require('../constants/dietGuideReference');
const { toNumber } = require('../utils/number');

const OLIVE_YOUNG_SEARCH_BASE_URL = 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=';

function oliveYoungSearchUrl(keyword) {
    return `${OLIVE_YOUNG_SEARCH_BASE_URL}${encodeURIComponent(keyword)}`;
}

function scoreToMatch(score, index) {
    const metricScore = Number(score);

    if (!Number.isFinite(metricScore)) {
        return Math.max(80, 94 - index * 3);
    }

    return Math.max(70, Math.min(99, Math.round(100 - metricScore * 0.18 - index * 2)));
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

    return {
        id: ingredient.ingredient_id || null,
        name,
        type,
        description,
        match,
        reason: `${metric.name || meta.name} 지표를 기준으로 추천한 성분입니다.`,
        priority: index + 1,
        metricCode: metric.code,
        metricName: metric.name || meta.name,
        tags,
        card: {
            name,
            description,
            match,
            tags,
        },
    };
}

function getIngredientTags(ingredient, metricMeta) {
    const reference = INGREDIENT_REFERENCES.find((item) => item.name === ingredient.ingredient_name);

    return reference?.tags || metricMeta.tags;
}

function buildIngredientRecommendations(ingredients, concernMetrics) {
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

    return sourceIngredients
        .map((ingredient, index) => {
            const metricCode = ingredient.metricCode || getIngredientMetricCode(ingredient, concernMetrics);
            const metric = concernMetrics.find((item) => item.code === metricCode)
                || { code: metricCode, name: getMetricMeta(metricCode).name, score: null };

            const recommendation = toIngredientRecommendation(ingredient, metric, index);

            return {
                ...recommendation,
                sortMatch: recommendation.match + (metric.code === focusMetricCode ? 8 : 0),
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
    };
}

function applyProductSearchUrls(products) {
    const usedIngredientKeys = new Set();

    return products.map((product) => {
        const linkCandidates = product.linkIngredients || product.matchedIngredients || [];
        const linkIngredient = pickProductLinkIngredient(linkCandidates, usedIngredientKeys);
        const productUrl = linkIngredient?.name
            ? oliveYoungSearchUrl(linkIngredient.name)
            : product.productUrl;

        if (linkIngredient) {
            usedIngredientKeys.add(getIngredientKey(linkIngredient));
        }

        const { linkIngredients, ...publicProduct } = product;
        const displayedMatchedIngredient = toPublicMatchedIngredient(linkIngredient);
        const displayedMatchedIngredients = displayedMatchedIngredient ? [displayedMatchedIngredient] : [];

        return {
            ...publicProduct,
            productUrl,
            matchedIngredients: displayedMatchedIngredients,
            linkIngredient: displayedMatchedIngredient,
            card: {
                ...product.card,
                productUrl,
                matchedIngredients: displayedMatchedIngredients,
            },
        };
    });
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

function toDietGuide(guide, index) {
    const title = guide.guide_title || guide.title;
    const reference = DIET_GUIDE_REFERENCES.find((item) => item.title === title);
    const priority = guide.priority || reference?.priority || `${index + 1}순위`;

    return {
        id: guide.diet_guide_id || null,
        recommendationId: guide.analysis_recommendation_id || null,
        ingredientId: guide.ingredient_id || null,
        ingredientName: guide.ingredient_name || null,
        category: guide.diet_category || guide.category,
        title,
        content: guide.guide_content || guide.content,
        reason: guide.recommend_reason || guide.reason,
        priority,
        createdAt: guide.created_at || null,
        card: {
            title,
            description: guide.guide_content || guide.content,
            tag: guide.diet_category || guide.category,
            priority,
        },
    };
}

function buildFallbackDietGuides() {
    return DIET_GUIDE_REFERENCES.map(toDietGuide);
}

async function buildIngredientRecommendationResult(analysisContext) {
    const ingredients = await recommendationRepository.findIngredients();
    const concernMetrics = getConcernMetrics(analysisContext?.metrics || []);
    const focusMetric = concernMetrics[0] || null;
    const analysisId = analysisContext?.analysis.skin_analysis_id || null;
    let ingredientSource = ingredients.length > 0 ? 'database' : 'fallback';
    let recommendations = [];

    if (analysisId) {
        const storedIngredients = await recommendationRepository.findIngredientRecommendationsByAnalysisId(analysisId);

        if (storedIngredients.length > 0) {
            ingredientSource = 'stored';
            recommendations = buildStoredIngredientRecommendations(storedIngredients, concernMetrics);
        }
    }

    if (recommendations.length === 0) {
        recommendations = buildIngredientRecommendations(ingredients, concernMetrics);

        if (analysisId && ingredients.length > 0) {
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
            recommendationCount: recommendations.length,
            ingredientSource,
        },
        ingredients: recommendations,
    };
}

async function getIngredientRecommendations(userId) {
    const latestAnalysis = await recommendationRepository.findLatestAnalysisWithMetricsByUserId(userId);
    const result = await buildIngredientRecommendationResult(latestAnalysis);

    return {
        ...result,
        source: latestAnalysis ? 'latest_analysis' : 'default',
    };
}

async function getDietGuideRecommendations(userId) {
    const latestAnalysis = await recommendationRepository.findLatestAnalysisWithMetricsByUserId(userId);
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

    let dietGuides = await recommendationRepository.findDietGuidesByAnalysisId(latestAnalysisId);

    if (dietGuides.length === 0) {
        dietGuides = await recommendationRepository.createDietGuidesForAnalysis(
            latestAnalysisId,
            DIET_GUIDE_REFERENCES,
        );
    }

    return {
        source: 'latest_analysis',
        summary: {
            analysisId: latestAnalysisId,
            analyzedAt: latestAnalysis.analysis.analyzed_at || latestAnalysis.analysis.created_at || null,
            totalScore: toNumber(latestAnalysis.analysis.total_skin_score),
            guideSource: 'database',
            guideCount: dietGuides.length,
            message: null,
        },
        guides: dietGuides.map(toDietGuide),
        routines: DIET_ROUTINE_REFERENCES,
        checks: DIET_CHECK_REFERENCES,
    };
}

async function getProductRecommendations(userId) {
    const ingredientResult = await getIngredientRecommendations(userId);
    const analysisId = ingredientResult.summary.analysisId || null;
    let productSource = 'empty_database';
    let products = [];

    if (analysisId) {
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

        if (analysisId && products.length > 0) {
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
            message: productSource !== 'empty_database'
                ? null
                : '등록된 제품 데이터가 아직 없습니다.',
        },
        products,
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

    if (dietGuides.length === 0) {
        dietGuides = buildFallbackDietGuides();
    }

    return {
        analysis: analysisContext.analysis,
        metrics: analysisContext.metrics,
        ingredients: ingredientResult.ingredients,
        products,
        dietGuides: dietGuides.map(toDietGuide),
        routines: DIET_ROUTINE_REFERENCES,
        checks: DIET_CHECK_REFERENCES,
    };
}

module.exports = {
    getDietGuideRecommendations,
    getIngredientRecommendations,
    getProductRecommendations,
    getRecommendationSnapshotForAnalysis,
};
