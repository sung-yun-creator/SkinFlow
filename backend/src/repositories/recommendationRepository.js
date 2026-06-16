const pool = require('../config/db');

async function findLatestAnalysisWithMetricsByUserId(userId) {
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

async function createDietGuidesForAnalysis(analysisId, guides) {
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

module.exports = {
    createDietGuidesForAnalysis,
    findActiveProductsWithIngredients,
    findDietGuidesByAnalysisId,
    findIngredients,
    findLatestAnalysisWithMetricsByUserId,
};
