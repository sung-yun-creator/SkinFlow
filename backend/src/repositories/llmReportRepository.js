const pool = require('../config/db');

// LLM 리포트 repository는 분석 상세 리포트 저장/재사용에 필요한 DB 접근을 담당합니다.
async function findReportByAnalysisId(userId, analysisId) {
    const [rows] = await pool.query(
        `
            SELECT
                le.llm_explanation_id,
                le.skin_analysis_id,
                le.prompt_text,
                le.explanation_text,
                le.language_code,
                le.created_at
            FROM t_llm_explanation le
            INNER JOIN t_skin_analysis sa
                ON sa.skin_analysis_id = le.skin_analysis_id
            WHERE sa.user_id = ?
                AND le.skin_analysis_id = ?
            ORDER BY le.created_at DESC, le.llm_explanation_id DESC
            LIMIT 1
        `,
        [userId, analysisId],
    );

    return rows[0] || null;
}

async function findRecentReportsByUserId(userId, excludedAnalysisId, limit = 10) {
    // 같은 입력 지문을 가진 과거 리포트를 찾기 위해 최근 리포트 후보를 조회합니다.
    const [rows] = await pool.query(
        `
            SELECT
                le.llm_explanation_id,
                le.skin_analysis_id,
                le.prompt_text,
                le.explanation_text,
                le.language_code,
                le.created_at
            FROM t_llm_explanation le
            INNER JOIN t_skin_analysis sa
                ON sa.skin_analysis_id = le.skin_analysis_id
            WHERE sa.user_id = ?
                AND le.skin_analysis_id <> ?
            ORDER BY le.created_at DESC, le.llm_explanation_id DESC
            LIMIT ?
        `,
        [userId, excludedAnalysisId, limit],
    );

    return rows;
}

async function findCareGuidesByAnalysisId(userId, analysisId) {
    const [rows] = await pool.query(
        `
            SELECT
                cg.care_guide_id,
                cg.skin_grade_id,
                cg.guide_title,
                cg.guide_content,
                cg.created_at
            FROM t_care_guide cg
            INNER JOIN t_skin_analysis sa
                ON sa.skin_grade_id = cg.skin_grade_id
            WHERE sa.user_id = ?
                AND sa.skin_analysis_id = ?
            ORDER BY cg.care_guide_id ASC
        `,
        [userId, analysisId],
    );

    return rows;
}

async function createReport({ analysisId, promptText, explanationText, languageCode = 'ko' }) {
    // LLM에 보낸 입력 요약과 생성 결과를 함께 저장해 이후 재조회/재사용이 가능하게 합니다.
    const [result] = await pool.query(
        `
            INSERT INTO t_llm_explanation (
                skin_analysis_id,
                prompt_text,
                explanation_text,
                language_code,
                created_at
            )
            VALUES (?, ?, ?, ?, NOW())
        `,
        [analysisId, promptText, explanationText, languageCode],
    );

    const [rows] = await pool.query(
        `
            SELECT
                llm_explanation_id,
                skin_analysis_id,
                prompt_text,
                explanation_text,
                language_code,
                created_at
            FROM t_llm_explanation
            WHERE llm_explanation_id = ?
            LIMIT 1
        `,
        [result.insertId],
    );

    return rows[0] || null;
}

module.exports = {
    createReport,
    findCareGuidesByAnalysisId,
    findRecentReportsByUserId,
    findReportByAnalysisId,
};
