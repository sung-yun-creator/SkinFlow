const pool = require('../config/db');
const userRepository = require('./userRepository');

async function findProfileByUserId(userId) {
    return userRepository.findUserById(userId);
}

async function findAnalysisSummaryByUserId(userId) {
    const [rows] = await pool.query(
        `
            SELECT
                COUNT(sa.skin_analysis_id) AS analysis_count,
                latest.skin_analysis_id AS latest_analysis_id,
                latest.total_skin_score AS latest_total_score,
                latest.analysis_status AS latest_status,
                latest.analyzed_at AS latest_analyzed_at,
                sg.grade_name AS latest_grade_name
            FROM t_user u
            LEFT JOIN t_skin_analysis sa
                ON sa.user_id = u.user_id
            LEFT JOIN (
                SELECT skin_analysis_id, user_id, skin_grade_id, total_skin_score, analysis_status, analyzed_at, created_at
                FROM t_skin_analysis
                WHERE user_id = ?
                ORDER BY COALESCE(analyzed_at, created_at) DESC, skin_analysis_id DESC
                LIMIT 1
            ) latest
                ON latest.user_id = u.user_id
            LEFT JOIN t_skin_grade sg
                ON sg.skin_grade_id = latest.skin_grade_id
            WHERE u.user_id = ?
            GROUP BY
                latest.skin_analysis_id,
                latest.total_skin_score,
                latest.analysis_status,
                latest.analyzed_at,
                sg.grade_name
        `,
        [userId, userId],
    );

    return rows[0] || null;
}

async function findMainConcernByAnalysisId(analysisId) {
    if (!analysisId) {
        return null;
    }

    const [rows] = await pool.query(
        `
            SELECT
                sm.metric_score,
                sm.grade_name,
                smt.metric_name
            FROM t_skin_metric sm
            LEFT JOIN t_skin_metric_type smt
                ON smt.skin_metric_type_id = sm.skin_metric_type_id
            WHERE sm.skin_analysis_id = ?
            ORDER BY sm.metric_score ASC, sm.skin_metric_id ASC
            LIMIT 1
        `,
        [analysisId],
    );

    return rows[0] || null;
}

async function findRecentAnalysesByUserId(userId, limit = 3) {
    const [rows] = await pool.query(
        `
            SELECT
                sa.skin_analysis_id,
                sa.total_skin_score,
                sa.analysis_status,
                sa.analyzed_at,
                sa.created_at,
                sg.grade_name
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

async function findRecentActivityByUserId(userId, limit = 5) {
    const [rows] = await pool.query(
        `
            SELECT
                'analysis' AS activity_type,
                sa.skin_analysis_id,
                '피부 분석 완료' AS activity_title,
                sa.analysis_status AS activity_status,
                sa.total_skin_score,
                NULL AS activity_content,
                COALESCE(sa.analyzed_at, sa.created_at) AS occurred_at
            FROM t_skin_analysis sa
            WHERE sa.user_id = ?

            UNION ALL

            SELECT
                'recommendation' AS activity_type,
                sa.skin_analysis_id,
                COALESCE(ar.recommendation_title, '맞춤 추천 생성') AS activity_title,
                ar.recommendation_type AS activity_status,
                NULL AS total_skin_score,
                ar.recommendation_content AS activity_content,
                ar.created_at AS occurred_at
            FROM t_analysis_recommendation ar
            INNER JOIN t_skin_analysis sa
                ON sa.skin_analysis_id = ar.skin_analysis_id
            WHERE sa.user_id = ?

            UNION ALL

            SELECT
                'diet_guide' AS activity_type,
                sa.skin_analysis_id,
                COALESCE(rdg.guide_title, '식습관 가이드 생성') AS activity_title,
                rdg.diet_category AS activity_status,
                NULL AS total_skin_score,
                rdg.recommend_reason AS activity_content,
                rdg.created_at AS occurred_at
            FROM t_recommendation_diet_guide rdg
            INNER JOIN t_analysis_recommendation ar
                ON ar.analysis_recommendation_id = rdg.analysis_recommendation_id
            INNER JOIN t_skin_analysis sa
                ON sa.skin_analysis_id = ar.skin_analysis_id
            WHERE sa.user_id = ?

            ORDER BY occurred_at DESC
            LIMIT ?
        `,
        [userId, userId, userId, limit],
    );

    return rows;
}

module.exports = {
    findAnalysisSummaryByUserId,
    findMainConcernByAnalysisId,
    findProfileByUserId,
    findRecentActivityByUserId,
    findRecentAnalysesByUserId,
};
