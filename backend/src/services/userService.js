const pool = require('../config/db');

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        `
            SELECT user_id, user_name, email, password_hash, gender, birth_date, skin_type, is_actvie, created_at
            FROM t_user
            WHERE email = ?
        `,
        [email],
    );

    return rows[0] || null;
}

async function createUser({ name, email, passwordHash, gender, birthDate, skinType }) {
    const [result] = await pool.query(
        `
            INSERT INTO t_user (
                email,
                password_hash,
                user_name,
                gender,
                birth_date,
                skin_type,
                is_actvie,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'Y', NOW())
        `,
        [email, passwordHash, name, gender, birthDate, skinType],
    );

    return {
        user_id: result.insertId,
        user_name: name,
        name,
        email,
        gender,
        birth_date: birthDate,
        skin_type: skinType,
    };
}

module.exports = {
    findUserByEmail,
    createUser,
};
