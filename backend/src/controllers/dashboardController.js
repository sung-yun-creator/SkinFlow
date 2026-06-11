const { getDashboard } = require('../services/dashboardService');

async function getDashboardOverview(req, res) {
    // 로그인한 사용자의 대시보드 요약 데이터를 한 번에 내려줍니다.
    const dashboard = await getDashboard(req.user.userId);

    if (!dashboard) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.json(dashboard);
}

module.exports = {
    getDashboardOverview,
};
