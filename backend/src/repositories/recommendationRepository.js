const pool = require('../config/db');

// 추천 repository는 분석 이력에 연결된 성분, 제품, 식습관 추천 데이터를 조회/생성합니다.
async function findLatestAnalysisWithMetricsByUserId(userId) {
    // 최신 분석과 지표를 함께 가져와 추천 기준 데이터로 사용합니다.
    const [analysisRows] = await pool.query(
        `
            SELECT
                sa.skin_analysis_id,
                sa.total_skin_score,
                sa.analysis_status,
                sa.summary_text,
                sa.analyzed_at,
                sa.created_at,
                sg.grade_name,
                sg.grade_description
            FROM t_skin_analysis sa
            LEFT JOIN t_skin_grade sg
                ON sg.skin_grade_id = sa.skin_grade_id
            WHERE sa.user_id = ?
            ORDER BY COALESCE(sa.analyzed_at, sa.created_at) DESC, sa.skin_analysis_id DESC
            LIMIT 1
        `,
        [userId],
    );

    const analysis = analysisRows[0] || null;

    if (!analysis) {
        return null;
    }

    const [metricRows] = await pool.query(
        `
            SELECT
                sm.skin_metric_id,
                sm.metric_value,
                sm.metric_score,
                sm.grade_name,
                smt.metric_code,
                smt.metric_name,
                smt.unit_name
            FROM t_skin_metric sm
            LEFT JOIN t_skin_metric_type smt
                ON smt.skin_metric_type_id = sm.skin_metric_type_id
            WHERE sm.skin_analysis_id = ?
            ORDER BY sm.metric_score ASC, sm.skin_metric_id ASC
        `,
        [analysis.skin_analysis_id],
    );

    return {
        analysis,
        metrics: metricRows,
    };
}

async function findAnalysisWithMetricsByUserIdAndAnalysisId(userId, analysisId) {
    const [analysisRows] = await pool.query(
        `
            SELECT
                sa.skin_analysis_id,
                sa.total_skin_score,
                sa.analysis_status,
                sa.summary_text,
                sa.analyzed_at,
                sa.created_at,
                sg.grade_name,
                sg.grade_description
            FROM t_skin_analysis sa
            LEFT JOIN t_skin_grade sg
                ON sg.skin_grade_id = sa.skin_grade_id
            WHERE sa.user_id = ?
                AND sa.skin_analysis_id = ?
            LIMIT 1
        `,
        [userId, analysisId],
    );

    const analysis = analysisRows[0] || null;

    if (!analysis) {
        return null;
    }

    const [metricRows] = await pool.query(
        `
            SELECT
                sm.skin_metric_id,
                sm.metric_value,
                sm.metric_score,
                sm.grade_name,
                smt.metric_code,
                smt.metric_name,
                smt.unit_name
            FROM t_skin_metric sm
            LEFT JOIN t_skin_metric_type smt
                ON smt.skin_metric_type_id = sm.skin_metric_type_id
            WHERE sm.skin_analysis_id = ?
            ORDER BY sm.metric_score ASC, sm.skin_metric_id ASC
        `,
        [analysis.skin_analysis_id],
    );

    return {
        analysis,
        metrics: metricRows,
    };
}

async function findIngredients() {
    const [rows] = await pool.query(
        `
            SELECT
                ingredient_id,
                ingredient_name,
                ingredient_type,
                description
            FROM t_ingredient
            ORDER BY ingredient_id ASC
        `,
    );

    return rows;
}

async function findDietGuidesByAnalysisId(analysisId) {
    if (!analysisId) {
        return [];
    }

    const [rows] = await pool.query(
        `
            SELECT
                rdg.diet_guide_id,
                rdg.analysis_recommendation_id,
                rdg.ingredient_id,
                rdg.diet_category,
                rdg.guide_title,
                rdg.guide_content,
                rdg.recommend_reason,
                rdg.created_at,
                i.ingredient_name
            FROM t_recommendation_diet_guide rdg
            INNER JOIN t_analysis_recommendation ar
                ON ar.analysis_recommendation_id = rdg.analysis_recommendation_id
            LEFT JOIN t_ingredient i
                ON i.ingredient_id = rdg.ingredient_id
            WHERE ar.skin_analysis_id = ?
                AND ar.recommendation_type = 'diet_guide'
            ORDER BY rdg.diet_guide_id ASC
        `,
        [analysisId],
    );

    return rows;
}

async function createAnalysisRecommendation(connection, {
    analysisId,
    type,
    title,
    content,
}) {
    const [result] = await connection.query(
        `
            INSERT INTO t_analysis_recommendation (
                skin_analysis_id,
                recommendation_type,
                recommendation_title,
                recommendation_content,
                created_at
            )
            VALUES (?, ?, ?, ?, NOW())
        `,
        [analysisId, type, title, content],
    );

    return result.insertId;
}

async function createDietGuidesForAnalysis(analysisId, guides) {
    // 식습관 가이드는 공통 추천 행을 만든 뒤 상세 가이드 테이블에 여러 건 저장합니다.
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [recommendationResult] = await connection.query(
            `
                INSERT INTO t_analysis_recommendation (
                    skin_analysis_id,
                    recommendation_type,
                    recommendation_title,
                    recommendation_content,
                    created_at
                )
                VALUES (?, 'diet_guide', ?, ?, NOW())
            `,
            [
                analysisId,
                '식습관 가이드',
                '피부 분석 후 참고할 수 있는 기본 식습관 가이드입니다.',
            ],
        );
        const recommendationId = recommendationResult.insertId;

        for (const guide of guides) {
            await connection.query(
                `
                    INSERT INTO t_recommendation_diet_guide (
                        analysis_recommendation_id,
                        ingredient_id,
                        diet_category,
                        guide_title,
                        guide_content,
                        recommend_reason
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    recommendationId,
                    guide.ingredientId || null,
                    guide.category,
                    guide.title,
                    guide.content,
                    guide.reason,
                ],
            );
        }

        await connection.commit();

        return findDietGuidesByAnalysisId(analysisId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function findIngredientRecommendationsByAnalysisId(analysisId) {
    if (!analysisId) {
        return [];
    }

    const [rows] = await pool.query(
        `
            SELECT
                ri.analysis_recommendation_id,
                ri.ingredient_id,
                ri.match_score,
                i.ingredient_name,
                i.ingredient_type,
                i.description
            FROM t_recommendation_ingredient ri
            INNER JOIN t_analysis_recommendation ar
                ON ar.analysis_recommendation_id = ri.analysis_recommendation_id
            LEFT JOIN t_ingredient i
                ON i.ingredient_id = ri.ingredient_id
            WHERE ar.skin_analysis_id = ?
                AND ar.recommendation_type = 'ingredient'
            ORDER BY ri.match_score DESC, ri.ingredient_id ASC
        `,
        [analysisId],
    );

    return rows;
}

async function createIngredientRecommendationsForAnalysis(analysisId, ingredients) {
    // 추천 성분은 분석 추천 묶음과 성분별 매칭 점수를 함께 저장합니다.
    const storableIngredients = ingredients.filter((ingredient) => ingredient.id);

    if (storableIngredients.length === 0) {
        return [];
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const recommendationId = await createAnalysisRecommendation(connection, {
            analysisId,
            type: 'ingredient',
            title: '추천 성분',
            content: '피부 분석 결과를 기준으로 추천된 성분입니다.',
        });

        await connection.query(
            `
                INSERT INTO t_recommendation_ingredient (
                    analysis_recommendation_id,
                    ingredient_id,
                    match_score
                )
                VALUES ?
            `,
            [
                storableIngredients.map((ingredient) => [
                    recommendationId,
                    ingredient.id,
                    ingredient.match,
                ]),
            ],
        );

        await connection.commit();

        return findIngredientRecommendationsByAnalysisId(analysisId);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

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

async function createProductRecommendationsForAnalysis(analysisId, products) {
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
    createDietGuidesForAnalysis,
    createIngredientRecommendationsForAnalysis,
    createProductRecommendationsForAnalysis,
    findActiveProductsWithIngredients,
    findAnalysisWithMetricsByUserIdAndAnalysisId,
    findDietGuidesByAnalysisId,
    findIngredientRecommendationsByAnalysisId,
    findIngredients,
    findLatestAnalysisWithMetricsByUserId,
    findProductRecommendationsByAnalysisId,
};
