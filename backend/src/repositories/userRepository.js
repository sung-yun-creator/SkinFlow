const pool = require('../config/db');

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        `
            SELECT user_id, user_name, email, password_hash, gender, birth_date, skin_type, is_active, created_at
            FROM t_user
            WHERE email = ?
        `,
        [email],
    );

    return rows[0] || null;
}

async function findUserById(userId) {
    const [rows] = await pool.query(
        `
            SELECT user_id, user_name, email, gender, birth_date, skin_type, created_at
            FROM t_user
            WHERE user_id = ?
        `,
        [userId],
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
                is_active,
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

async function updateUserProfile(userId, { name, gender, birthDate, skinType }) {
    // 마이페이지에서 수정 가능한 기본 프로필 컬럼만 갱신합니다. 이메일은 계정 식별값이라 제외합니다.
    await pool.query(
        `
            UPDATE t_user
            SET
                user_name = ?,
                gender = ?,
                birth_date = ?,
                skin_type = ?,
                updated_at = NOW()
            WHERE user_id = ?
        `,
        [name, gender, birthDate, skinType, userId],
    );

    return findUserById(userId);
}

async function updateUserPasswordHash(userId, passwordHash) {
    // 새 비밀번호는 service에서 해시로 만든 뒤 이 함수에서는 해시 값만 저장합니다.
    const [result] = await pool.query(
        `
            UPDATE t_user
            SET
                password_hash = ?,
                updated_at = NOW()
            WHERE user_id = ?
        `,
        [passwordHash, userId],
    );

    return result.affectedRows > 0;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    updateUserPasswordHash,
    updateUserProfile,
};
