const {
    getMypage,
    sendMypagePasswordCode,
    updateMypagePassword,
    updateMypageProfile,
} = require('../services/mypageService');

async function getMyPage(req, res) {
    const mypage = await getMypage(req.user.userId);

    if (!mypage) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.json(mypage);
}

async function updateMyPageProfile(req, res) {
    // 인증 미들웨어가 넣어준 req.user.userId 기준으로 본인 프로필만 수정합니다.
    const result = await updateMypageProfile(req.user.userId, req.body);

    if (!result) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.json(result);
}

async function sendMyPagePasswordCode(req, res) {
    // 프론트에서 이메일을 다시 받지 않고, 현재 로그인 계정의 이메일로 인증 코드를 보냅니다.
    const result = await sendMypagePasswordCode(req.user.userId);

    if (!result) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.json({
        message: '비밀번호 변경 인증 코드가 발송되었습니다.',
        email: result.email,
        expiresIn: result.expiresIn,
    });
}

async function updateMyPagePassword(req, res) {
    // 인증 코드 검증과 비밀번호 해시 교체는 service 계층에서 한 번에 처리합니다.
    const result = await updateMypagePassword(req.user.userId, req.body);

    if (!result) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.json({
        message: '비밀번호가 변경되었습니다.',
        updated: result.updated,
    });
}

module.exports = {
    getMyPage,
    sendMyPagePasswordCode,
    updateMyPagePassword,
    updateMyPageProfile,
};
