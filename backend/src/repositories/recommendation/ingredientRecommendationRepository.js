const pool = require('../../config/db');

// 성분 원본 데이터와 분석별 추천 성분 저장 결과를 다루는 repository입니다.
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

async function createIngredientRecommendationsForAnalysis(analysisId, ingredients, createAnalysisRecommendation) {
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

module.exports = {
    createIngredientRecommendationsForAnalysis,
    findIngredientRecommendationsByAnalysisId,
    findIngredients,
};
