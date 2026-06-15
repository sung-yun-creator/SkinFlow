const pool = require('../config/db');

async function findGradeByCode(connection, gradeCode) {
    const [rows] = await connection.query(
        `
            SELECT skin_grade_id, grade_code, grade_name, grade_description
            FROM t_skin_grade
            WHERE grade_code = ?
            LIMIT 1
        `,
        [gradeCode],
    );

    return rows[0] || null;
}

async function findMetricTypesByCodes(connection, metricCodes) {
    if (metricCodes.length === 0) {
        return {};
    }

    const [rows] = await connection.query(
        `
            SELECT skin_metric_type_id, metric_code, metric_name, unit_name
            FROM t_skin_metric_type
            WHERE metric_code IN (?)
        `,
        [metricCodes],
    );

    return rows.reduce((byCode, row) => {
        byCode[row.metric_code] = row;
        return byCode;
    }, {});
}

async function createAnalysisWithMetrics(userId, analysis) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const grade = await findGradeByCode(connection, analysis.grade.code);

        if (!grade) {
            const error = new Error('분석 등급 기준 데이터가 없습니다. seed:analysis-reference를 먼저 실행해 주세요.');
            error.code = 'ANALYSIS_GRADE_REFERENCE_MISSING';
            error.status = 500;
            throw error;
        }

        const metricTypesByCode = await findMetricTypesByCodes(
            connection,
            analysis.metrics.map((metric) => metric.code),
        );
        const missingMetric = analysis.metrics.find((metric) => !metricTypesByCode[metric.code]);

        if (missingMetric) {
            const error = new Error(`피부 지표 기준 데이터가 없습니다: ${missingMetric.code}`);
            error.code = 'ANALYSIS_METRIC_REFERENCE_MISSING';
            error.status = 500;
            throw error;
        }

        const [analysisResult] = await connection.query(
            `
                INSERT INTO t_skin_analysis (
                    user_id,
                    skin_grade_id,
                    analysis_status,
                    total_skin_score,
                    summary_text,
                    analyzed_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            `,
            [
                userId,
                grade.skin_grade_id,
                analysis.status,
                analysis.totalScore,
                analysis.summary,
            ],
        );
        const analysisId = analysisResult.insertId;

        if (analysis.metrics.length > 0) {
            await connection.query(
                `
                    INSERT INTO t_skin_metric (
                        skin_analysis_id,
                        skin_metric_type_id,
                        metric_value,
                        metric_score,
                        grade_name
                    )
                    VALUES ?
                `,
                [
                    analysis.metrics.map((metric) => [
                        analysisId,
                        metricTypesByCode[metric.code].skin_metric_type_id,
                        metric.value,
                        metric.score,
                        metric.grade.name,
                    ]),
                ],
            );
        }

        await connection.commit();

        return {
            ...analysis,
            analysisId,
            grade: {
                code: grade.grade_code,
                name: grade.grade_name,
                description: grade.grade_description,
            },
            metrics: analysis.metrics.map((metric) => ({
                ...metric,
                name: metricTypesByCode[metric.code].metric_name,
                unit: metricTypesByCode[metric.code].unit_name,
            })),
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

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
    createAnalysisWithMetrics,
    findAnalysisByIdAndUserId,
    replaceAnalysisRois,
};
