const { getMypage } = require('../services/mypageService');

async function getMyPage(req, res) {
    const mypage = await getMypage(req.user.userId);

    if (!mypage) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.json(mypage);
}

module.exports = {
    getMyPage,
};
