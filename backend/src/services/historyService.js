const historyRepository = require('../repositories/historyRepository');
const {
    groupMetricsByAnalysisId,
    toAnalysis,
    toRecommendation,
} = require('../utils/analysisResponseMapper');
const { toNumber } = require('../utils/number');

function toHistoryRecord(record, metricsByAnalysisId) {
    return toAnalysis(record, {
        metrics: metricsByAnalysisId[record.skin_analysis_id] || [],
    });
}

function toSummary(summary) {
    const latestTotalScore = toNumber(summary.latest_total_score);
    const earliestTotalScore = toNumber(summary.earliest_total_score);
    const scoreDiff = latestTotalScore === null || earliestTotalScore === null
        ? null
        : latestTotalScore - earliestTotalScore;

    return {
        analysisCount: Number(summary.analysis_count || 0),
        latestTotalScore,
        latestAnalyzedAt: summary.latest_analyzed_at || null,
        latestStatus: summary.latest_status || null,
        latestGradeName: summary.latest_grade_name || null,
        scoreDiff,
    };
}

async function getHistory(userId, options = {}) {
    const limit = Number(options.limit || 20);
    const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20;

    const [summary, records] = await Promise.all([
        historyRepository.findHistorySummaryByUserId(userId),
        historyRepository.findHistoryRecordsByUserId(userId, safeLimit),
    ]);
    const analysisIds = records.map((record) => record.skin_analysis_id);
    const metrics = await historyRepository.findMetricsByAnalysisIds(analysisIds);
    const metricsByAnalysisId = groupMetricsByAnalysisId(metrics);

    return {
        summary: toSummary(summary),
        records: records.map((record) => toHistoryRecord(record, metricsByAnalysisId)),
    };
}

async function getHistoryDetail(userId, analysisId) {
    const record = await historyRepository.findHistoryRecordById(userId, analysisId);

    if (!record) {
        return null;
    }

    const [metrics, recommendations] = await Promise.all([
        historyRepository.findMetricsByAnalysisIds([analysisId]),
        historyRepository.findRecommendationsByAnalysisId(analysisId),
    ]);
    const metricsByAnalysisId = groupMetricsByAnalysisId(metrics);

    return {
        ...toHistoryRecord(record, metricsByAnalysisId),
        recommendations: recommendations.map(toRecommendation),
    };
}

module.exports = {
    getHistory,
    getHistoryDetail,
};
