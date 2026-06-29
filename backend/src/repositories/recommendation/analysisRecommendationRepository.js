const pool = require('../../config/db');

// 추천 기준으로 사용할 분석 이력과 공통 추천 부모 row를 다루는 repository입니다.
async function findMetricsByAnalysisId(analysisId) {
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
        [analysisId],
    );

    return metricRows;
}

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

    return {
        analysis,
        metrics: await findMetricsByAnalysisId(analysis.skin_analysis_id),
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

    return {
        analysis,
        metrics: await findMetricsByAnalysisId(analysis.skin_analysis_id),
    };
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

module.exports = {
    createAnalysisRecommendation,
    findAnalysisWithMetricsByUserIdAndAnalysisId,
    findLatestAnalysisWithMetricsByUserId,
};
