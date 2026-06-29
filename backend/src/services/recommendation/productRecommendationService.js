const recommendationRepository = require('../../repositories/recommendationRepository');
const { toNumber } = require('../../utils/number');
const {
    formatMetricScoreText,
    normalizeFocusMetric,
} = require('./recommendationMetricUtils');

const OLIVE_YOUNG_SEARCH_BASE_URL = 'https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=';

// 제품 추천 후보 생성, 기존 저장 결과 재사용, 올리브영 검색 URL 보강을 담당합니다.
function oliveYoungSearchUrl(keyword) {
    return `${OLIVE_YOUNG_SEARCH_BASE_URL}${encodeURIComponent(keyword)}`;
}

function isOliveYoungSearchUrl(url) {
    return typeof url === 'string' && url.includes('/store/search/getSearchMain.do');
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

async function buildProductRecommendationResult(ingredientResult, options = {}) {
    const requestedFocusMetricCode = normalizeFocusMetric(options.focus);
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

module.exports = {
    buildProductRecommendationResult,
    buildProductRecommendations,
    buildStoredProductRecommendations,
};
