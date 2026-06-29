const pool = require('../../config/db');

// 식습관 추천 row 조회/생성을 담당합니다.
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

async function createDietGuidesForAnalysis(analysisId, guides, createAnalysisRecommendation) {
    // 식습관 가이드는 공통 추천 행을 만든 뒤 상세 가이드 테이블에 여러 건 저장합니다.
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const recommendationId = await createAnalysisRecommendation(connection, {
            analysisId,
            type: 'diet_guide',
            title: '식습관 가이드',
            content: '피부 분석 후 참고할 수 있는 기본 식습관 가이드입니다.',
        });

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

module.exports = {
    createDietGuidesForAnalysis,
    findDietGuidesByAnalysisId,
};
