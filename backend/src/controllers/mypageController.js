const { getMypage } = require('../services/mypageService');

async function getMyPage(req, res) {
    const mypage = await getMypage(req.user.userId);

    if (!mypage) {
        return res.status(404).json({ message: 'User not found.' });
    }

    return res.json(mypage);
}

module.exports = {
    getMyPage,
};
