const pool = require('../../config/db');

// 제품 원본 데이터와 분석별 추천 제품 저장 결과를 다루는 repository입니다.
async function findActiveProductsWithIngredients() {
    const [rows] = await pool.query(
        `
            SELECT
                p.product_id,
                p.brand_name,
                p.product_name,
                p.product_type,
                p.price_amount,
                p.product_url,
                p.description AS product_description,
                p.product_img,
                pi.ingredient_id,
                pi.ingredient_pct,
                i.ingredient_name,
                i.ingredient_type,
                i.description AS ingredient_description
            FROM t_product p
            LEFT JOIN t_product_ingredient pi
                ON pi.product_id = p.product_id
            LEFT JOIN t_ingredient i
                ON i.ingredient_id = pi.ingredient_id
            WHERE p.is_active = 1
            ORDER BY p.product_id ASC, pi.ingredient_pct DESC, pi.ingredient_id ASC
        `,
    );

    return rows;
}

async function findProductRecommendationsByAnalysisId(analysisId) {
    if (!analysisId) {
        return [];
    }

    const [rows] = await pool.query(
        `
            SELECT
                rp.analysis_recommendation_id,
                rp.product_id,
                rp.match_score,
                rp.rank_no,
                p.brand_name,
                p.product_name,
                p.product_type,
                p.price_amount,
                p.product_url,
                p.description AS product_description,
                p.product_img,
                pi.ingredient_id,
                pi.ingredient_pct,
                i.ingredient_name,
                i.ingredient_type,
                i.description AS ingredient_description
            FROM t_recommendation_product rp
            INNER JOIN t_analysis_recommendation ar
                ON ar.analysis_recommendation_id = rp.analysis_recommendation_id
            INNER JOIN t_product p
                ON p.product_id = rp.product_id
            LEFT JOIN t_product_ingredient pi
                ON pi.product_id = p.product_id
            LEFT JOIN t_ingredient i
                ON i.ingredient_id = pi.ingredient_id
            WHERE ar.skin_analysis_id = ?
                AND ar.recommendation_type = 'product'
            ORDER BY rp.rank_no ASC, rp.match_score DESC, rp.product_id ASC, pi.ingredient_pct DESC, pi.ingredient_id ASC
        `,
        [analysisId],
    );

    return rows;
}

async function createProductRecommendationsForAnalysis(analysisId, products, createAnalysisRecommendation) {
    // 추천 제품은 순위와 매칭 점수를 저장해 상세 리포트에서 같은 결과를 재사용합니다.
    const storableProducts = products.filter((product) => product.id);

    if (storableProducts.length === 0) {
        return [];
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const recommendationId = await createAnalysisRecommendation(connection, {
            analysisId,
            type: 'product',
            title: '추천 제품',
            content: '피부 분석 결과와 추천 성분을 기준으로 추천된 제품입니다.',
        });

        await connection.query(
            `
                INSERT INTO t_recommendation_product (
                    analysis_recommendation_id,
                    product_id,
                    match_score,
                    rank_no
                )
                VALUES ?
            `,
            [
                storableProducts.map((product) => [
                    recommendationId,
                    product.id,
                    product.match,
                    product.rank,
                ]),
            ],
        );

        await connection.commit();

        return findProductRecommendationsByAnalysisId(analysisId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    createProductRecommendationsForAnalysis,
    findActiveProductsWithIngredients,
    findProductRecommendationsByAnalysisId,
};
