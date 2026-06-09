const jwt = require('jsonwebtoken');

const DEFAULT_EXPIRES_IN = '1d';

function signToken(payload) {
    const secret = process.env.JWT_SECRET || 'skinflow-dev-secret';

    return jwt.sign(payload, secret, {
        expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN,
    });
}

function verifyToken(token) {
    const secret = process.env.JWT_SECRET || 'skinflow-dev-secret';

    return jwt.verify(token, secret);
}

module.exports = {
    signToken,
    verifyToken,
};
