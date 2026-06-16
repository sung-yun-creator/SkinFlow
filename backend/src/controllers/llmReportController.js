const { getOrCreateLlmReport } = require('../services/llmReportService');

async function getLlmReportByAnalysisId(req, res) {
    const analysisId = Number(req.params.analysisId);

    if (!Number.isInteger(analysisId) || analysisId <= 0) {
        return res.status(400).json({ message: '올바른 분석 ID가 필요합니다.' });
    }

    const report = await getOrCreateLlmReport(req.user.userId, analysisId);

    if (!report) {
        return res.status(404).json({ message: '분석 이력을 찾을 수 없습니다.' });
    }

    return res.json(report);
}

module.exports = {
    getLlmReportByAnalysisId,
};
