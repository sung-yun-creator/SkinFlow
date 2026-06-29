const { getHistory, getHistoryDetail, getHistoryScoreTrends } = require('../services/historyService');

// 분석 이력 controller는 목록/상세 조회 요청을 사용자 ID 기준으로 service에 위임합니다.
async function listHistory(req, res) {
    const history = await getHistory(req.user.userId, {
        limit: req.query.limit,
    });

    return res.json(history);
}

async function getHistoryById(req, res) {
    // URL 파라미터가 잘못되면 DB 조회 전에 바로 400으로 응답합니다.
    const analysisId = Number(req.params.analysisId);

    if (!Number.isInteger(analysisId) || analysisId <= 0) {
        return res.status(400).json({ message: '올바른 분석 ID가 필요합니다.' });
    }

    const history = await getHistoryDetail(req.user.userId, analysisId);

    if (!history) {
        return res.status(404).json({ message: '분석 이력을 찾을 수 없습니다.' });
    }

    return res.json(history);
}

async function getHistoryTrendScores(req, res) {
    const trends = await getHistoryScoreTrends(req.user.userId, {
        limit: req.query.limit,
    });

    return res.json(trends);
}

module.exports = {
    getHistoryById,
    getHistoryTrendScores,
    listHistory,
};
