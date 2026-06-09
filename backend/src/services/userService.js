const userRepository = require('../repositories/userRepository');

async function findUserByEmail(email) {
    return userRepository.findUserByEmail(email);
}

async function createUser({ name, email, passwordHash, gender, birthDate, skinType }) {
    return userRepository.createUser({ name, email, passwordHash, gender, birthDate, skinType });
}

module.exports = {
    createUser,
    findUserByEmail,
};
