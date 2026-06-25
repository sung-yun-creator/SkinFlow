const pool = require('../config/db');
const userRepository = require('./userRepository');

// 대시보드 repository는 첫 화면 요약에 필요한 프로필, 분석, 추천 데이터를 모읍니다.
async function findProfileByUserId(userId) {
    return userRepository.findUserById(userId);
}

async function findDashboardSummaryByUserId(userId) {
    // 전체 분석 수와 최신/최초 분석 점수를 함께 가져와 대시보드 요약에 사용합니다.
    const [rows] = await pool.query(
        `
            SELECT
                COUNT(sa.skin_analysis_id) AS analysis_count,
                latest.skin_analysis_id AS latest_analysis_id,
                latest.total_skin_score AS latest_total_score,
                latest.analysis_status AS latest_status,
                latest.summary_text AS latest_summary,
                latest.analyzed_at AS latest_analyzed_at,
                latest.created_at AS latest_created_at,
                latest_grade.grade_name AS latest_grade_name,
                latest_grade.grade_description AS latest_grade_description,
                earliest.total_skin_score AS earliest_total_score
            FROM t_user u
            LEFT JOIN t_skin_analysis sa
                ON sa.user_id = u.user_id
            LEFT JOIN (
                SELECT
                    skin_analysis_id,
                    user_id,
                    skin_grade_id,
                    total_skin_score,
                    analysis_status,
                    summary_text,
                    analyzed_at,
                    created_at
                FROM t_skin_analysis
                WHERE user_id = ?
                ORDER BY COALESCE(analyzed_at, created_at) DESC, skin_analysis_id DESC
                LIMIT 1
            ) latest
                ON latest.user_id = u.user_id
            LEFT JOIN t_skin_grade latest_grade
                ON latest_grade.skin_grade_id = latest.skin_grade_id
            LEFT JOIN (
                SELECT user_id, total_skin_score
                FROM t_skin_analysis
                WHERE user_id = ?
                ORDER BY COALESCE(analyzed_at, created_at) ASC, skin_analysis_id ASC
                LIMIT 1
            ) earliest
                ON earliest.user_id = u.user_id
            WHERE u.user_id = ?
            GROUP BY
                latest.skin_analysis_id,
                latest.total_skin_score,
                latest.analysis_status,
                latest.summary_text,
                latest.analyzed_at,
                latest.created_at,
                latest_grade.grade_name,
                latest_grade.grade_description,
                earliest.total_skin_score
        `,
        [userId, userId, userId],
    );

    return rows[0] || null;
}

async function findMetricsByAnalysisId(analysisId) {
    if (!analysisId) {
        return [];
    }

    // 최신 분석에 연결된 지표들을 점수/등급/단위 정보와 함께 조회합니다.
    const [rows] = await pool.query(
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
            ORDER BY sm.skin_metric_id ASC
        `,
        [analysisId],
    );

    return rows;
}

async function findRecentAnalysesByUserId(userId, limit = 3) {
    // 대시보드 하단에서 최근 분석 흐름을 보여주기 위한 간단한 목록입니다.
    const [rows] = await pool.query(
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
            LIMIT ?
        `,
        [userId, limit],
    );

    return rows;
}

async function findRecentRecommendationsByUserId(userId, limit = 3) {
    // 최신 추천 카드 영역에 노출할 최근 추천 내용을 가져옵니다.
    const [rows] = await pool.query(
        `
            SELECT
                ar.analysis_recommendation_id,
                ar.skin_analysis_id,
                ar.recommendation_type,
                ar.recommendation_title,
                ar.recommendation_content,
                ar.created_at
            FROM t_analysis_recommendation ar
            INNER JOIN t_skin_analysis sa
                ON sa.skin_analysis_id = ar.skin_analysis_id
            WHERE sa.user_id = ?
            ORDER BY ar.created_at DESC, ar.analysis_recommendation_id DESC
            LIMIT ?
        `,
        [userId, limit],
    );

    return rows;
}

async function findRecentDietGuidesByUserId(userId, limit = 3) {
    // 추천과 연결된 식습관 가이드를 최근순으로 가져옵니다.
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
            INNER JOIN t_skin_analysis sa
                ON sa.skin_analysis_id = ar.skin_analysis_id
            LEFT JOIN t_ingredient i
                ON i.ingredient_id = rdg.ingredient_id
            WHERE sa.user_id = ?
            ORDER BY rdg.created_at DESC, rdg.diet_guide_id DESC
            LIMIT ?
        `,
        [userId, limit],
    );

    return rows;
}

module.exports = {
    findDashboardSummaryByUserId,
    findMetricsByAnalysisId,
    findProfileByUserId,
    findRecentAnalysesByUserId,
    findRecentDietGuidesByUserId,
    findRecentRecommendationsByUserId,
};
