const { getHistory, getHistoryDetail } = require('../services/historyService');

async function listHistory(req, res) {
    const history = await getHistory(req.user.userId, {
        limit: req.query.limit,
    });

    return res.json(history);
}

async function getHistoryById(req, res) {
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

module.exports = {
    getHistoryById,
    listHistory,
};
