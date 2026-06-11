const pool = require('../config/db');

// 로그인한 사용자가 가진 분석 이력인지 확인할 때 사용합니다.
async function findAnalysisByIdAndUserId(userId, analysisId) {
    const [rows] = await pool.query(
        `
            SELECT skin_analysis_id
            FROM t_skin_analysis
            WHERE user_id = ?
                AND skin_analysis_id = ?
            LIMIT 1
        `,
        [userId, analysisId],
    );

    return rows[0] || null;
}

async function replaceAnalysisRois(analysisId, rois) {
    const connection = await pool.getConnection();

    try {
        // 기존 ROI를 지우고 새 ROI를 넣는 작업은 하나의 트랜잭션으로 묶습니다.
        await connection.beginTransaction();
        await connection.query(
            `
                DELETE FROM t_analysis_roi
                WHERE skin_analysis_id = ?
            `,
            [analysisId],
        );

        if (rois.length > 0) {
            await connection.query(
                `
                    INSERT INTO t_analysis_roi (
                        skin_analysis_id,
                        roi_name,
                        x_position,
                        y_position,
                        width_size,
                        height_size
                    )
                    VALUES ?
                `,
                [
                    rois.map((roi) => [
                        analysisId,
                        roi.name,
                        roi.pixel.x,
                        roi.pixel.y,
                        roi.pixel.width,
                        roi.pixel.height,
                    ]),
                ],
            );
        }

        await connection.commit();

        return rois.length;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    findAnalysisByIdAndUserId,
    replaceAnalysisRois,
};
