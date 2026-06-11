const { verifyToken } = require('../utils/token');

function authenticate(req, res, next) {
    // 프론트는 보호 API를 호출할 때 Authorization: Bearer <token> 형식으로 보내야 합니다.
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }

    try {
        // 검증된 사용자 정보는 이후 controller/service에서 req.user로 사용합니다.
        req.user = verifyToken(token);
        return next();
    } catch (error) {
        return res.status(401).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
    }
}

module.exports = {
    authenticate,
};
