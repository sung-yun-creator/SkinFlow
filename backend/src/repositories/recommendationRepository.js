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

module.exports = {
    findIngredients,
    findLatestAnalysisWithMetricsByUserId,
};
