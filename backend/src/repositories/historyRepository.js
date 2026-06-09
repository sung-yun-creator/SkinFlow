const pool = require('../config/db');

async function findHistorySummaryByUserId(userId) {
    const [rows] = await pool.query(
        `
            SELECT
                COUNT(*) AS analysis_count,
                latest.total_skin_score AS latest_total_score,
                latest.analyzed_at AS latest_analyzed_at,
                latest.analysis_status AS latest_status,
                latest_grade.grade_name AS latest_grade_name,
                earliest.total_skin_score AS earliest_total_score
            FROM t_skin_analysis sa
            LEFT JOIN (
                SELECT skin_analysis_id, user_id, skin_grade_id, total_skin_score, analysis_status, analyzed_at, created_at
                FROM t_skin_analysis
                WHERE user_id = ?
                ORDER BY COALESCE(analyzed_at, created_at) DESC, skin_analysis_id DESC
                LIMIT 1
            ) latest
                ON latest.user_id = sa.user_id
            LEFT JOIN t_skin_grade latest_grade
                ON latest_grade.skin_grade_id = latest.skin_grade_id
            LEFT JOIN (
                SELECT user_id, total_skin_score
                FROM t_skin_analysis
                WHERE user_id = ?
                ORDER BY COALESCE(analyzed_at, created_at) ASC, skin_analysis_id ASC
                LIMIT 1
            ) earliest
                ON earliest.user_id = sa.user_id
            WHERE sa.user_id = ?
            GROUP BY
                latest.total_skin_score,
                latest.analyzed_at,
                latest.analysis_status,
                latest_grade.grade_name,
                earliest.total_skin_score
        `,
        [userId, userId, userId],
    );

    return rows[0] || {
        analysis_count: 0,
        latest_total_score: null,
        latest_analyzed_at: null,
        latest_status: null,
        latest_grade_name: null,
        earliest_total_score: null,
    };
}

async function findHistoryRecordsByUserId(userId, limit = 20) {
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

async function findHistoryRecordById(userId, analysisId) {
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
                AND sa.skin_analysis_id = ?
        `,
        [userId, analysisId],
    );

    return rows[0] || null;
}

async function findMetricsByAnalysisIds(analysisIds) {
    if (analysisIds.length === 0) {
        return [];
    }

    const [rows] = await pool.query(
        `
            SELECT
                sm.skin_analysis_id,
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
            WHERE sm.skin_analysis_id IN (?)
            ORDER BY sm.skin_analysis_id DESC, sm.skin_metric_id ASC
        `,
        [analysisIds],
    );

    return rows;
}

async function findRecommendationsByAnalysisId(analysisId) {
    const [rows] = await pool.query(
        `
            SELECT
                analysis_recommendation_id,
                recommendation_type,
                recommendation_title,
                recommendation_content,
                created_at
            FROM t_analysis_recommendation
            WHERE skin_analysis_id = ?
            ORDER BY created_at DESC, analysis_recommendation_id DESC
        `,
        [analysisId],
    );

    return rows;
}

module.exports = {
    findHistoryRecordById,
    findHistoryRecordsByUserId,
    findHistorySummaryByUserId,
    findMetricsByAnalysisIds,
    findRecommendationsByAnalysisId,
};
