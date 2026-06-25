const userRepository = require('../repositories/userRepository');

// 사용자 계정 관련 service는 controller/mypage service와 repository 사이의 얇은 연결 계층입니다.
async function findUserByEmail(email) {
    return userRepository.findUserByEmail(email);
}

async function createUser({ name, email, passwordHash, gender, birthDate, skinType }) {
    return userRepository.createUser({ name, email, passwordHash, gender, birthDate, skinType });
}

async function updateUserProfile(userId, profile) {
    return userRepository.updateUserProfile(userId, profile);
}

async function updateUserPasswordHash(userId, passwordHash) {
    return userRepository.updateUserPasswordHash(userId, passwordHash);
}

module.exports = {
    createUser,
    findUserByEmail,
    updateUserPasswordHash,
    updateUserProfile,
};
