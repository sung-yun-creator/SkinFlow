const jwt = require('jsonwebtoken');

const DEFAULT_EXPIRES_IN = '1d';

// 로그인 성공 후 발급하는 JWT 생성/검증을 한 곳에서 처리합니다.
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
