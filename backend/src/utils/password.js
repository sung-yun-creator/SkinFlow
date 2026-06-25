const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// 비밀번호는 평문 저장 없이 bcrypt 해시 생성/검증 함수만 외부에 제공합니다.
async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, storedPassword) {
    return bcrypt.compare(password, storedPassword);
}

module.exports = {
    hashPassword,
    verifyPassword,
};
