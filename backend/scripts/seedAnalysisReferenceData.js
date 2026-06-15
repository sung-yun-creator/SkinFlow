require('dotenv').config();

const pool = require('../src/config/db');
const { ANALYSIS_GRADES, ANALYSIS_METRIC_TYPES } = require('../src/constants/analysisReference');

async function upsertGrade(connection, grade) {
    const [rows] = await connection.query(
        `
            SELECT skin_grade_id
            FROM t_skin_grade
            WHERE grade_code = ?
            LIMIT 1
        `,
        [grade.code],
    );

    if (rows.length > 0) {
        await connection.query(
            `
                UPDATE t_skin_grade
                SET grade_name = ?,
                    grade_description = ?
                WHERE skin_grade_id = ?
            `,
            [grade.name, grade.description, rows[0].skin_grade_id],
        );
        return;
    }

    await connection.query(
        `
            INSERT INTO t_skin_grade (
                grade_code,
                grade_name,
                grade_description
            )
            VALUES (?, ?, ?)
        `,
        [grade.code, grade.name, grade.description],
    );
}

async function upsertMetricType(connection, metricType) {
    const [rows] = await connection.query(
        `
            SELECT skin_metric_type_id
            FROM t_skin_metric_type
            WHERE metric_code = ?
            LIMIT 1
        `,
        [metricType.code],
    );

    if (rows.length > 0) {
        await connection.query(
            `
                UPDATE t_skin_metric_type
                SET metric_name = ?,
                    unit_name = ?,
                    description = ?
                WHERE skin_metric_type_id = ?
            `,
            [metricType.name, metricType.unit, metricType.description, rows[0].skin_metric_type_id],
        );
        return;
    }

    await connection.query(
        `
            INSERT INTO t_skin_metric_type (
                metric_code,
                metric_name,
                unit_name,
                description
            )
            VALUES (?, ?, ?, ?)
        `,
        [metricType.code, metricType.name, metricType.unit, metricType.description],
    );
}

async function seed() {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        for (const grade of ANALYSIS_GRADES) {
            await upsertGrade(connection, grade);
        }

        for (const metricType of ANALYSIS_METRIC_TYPES) {
            await upsertMetricType(connection, metricType);
        }

        await connection.commit();
        console.log('Analysis reference data has been seeded.');
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

seed().catch((error) => {
    console.error('Failed to seed analysis reference data:', error);
    process.exit(1);
});
