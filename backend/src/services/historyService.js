const historyRepository = require('../repositories/historyRepository');
const { toNumber } = require('../utils/number');

function groupMetricsByAnalysisId(metrics) {
    // 여러 분석의 지표 목록을 analysisId 기준으로 묶어 응답 만들 때 바로 찾을 수 있게 합니다.
    return metrics.reduce((grouped, metric) => {
        const key = metric.skin_analysis_id;

        if (!grouped[key]) {
            grouped[key] = [];
        }

        grouped[key].push({
            id: metric.skin_metric_id,
            code: metric.metric_code || null,
            name: metric.metric_name || null,
            value: toNumber(metric.metric_value),
            score: toNumber(metric.metric_score),
            grade: metric.grade_name || null,
            unit: metric.unit_name || null,
        });

        return grouped;
    }, {});
}

function toHistoryRecord(record, metricsByAnalysisId) {
    const metrics = metricsByAnalysisId[record.skin_analysis_id] || [];

    return {
        analysisId: record.skin_analysis_id,
        analyzedAt: record.analyzed_at || record.created_at || null,
        totalScore: toNumber(record.total_skin_score),
        status: record.grade_name || record.analysis_status || null,
        statusDescription: record.grade_description || null,
        summary: record.summary_text || null,
        metrics,
    };
}

function toSummary(summary) {
    const latestTotalScore = toNumber(summary.latest_total_score);
    const earliestTotalScore = toNumber(summary.earliest_total_score);
    // 처음 분석 점수와 최근 분석 점수를 비교해 변화량을 계산합니다.
    const scoreDiff = latestTotalScore === null || earliestTotalScore === null
        ? null
        : latestTotalScore - earliestTotalScore;

    return {
        analysisCount: Number(summary.analysis_count || 0),
        latestTotalScore,
        latestAnalyzedAt: summary.latest_analyzed_at || null,
        latestStatus: summary.latest_grade_name || summary.latest_status || null,
        scoreDiff,
    };
}

function toRecommendation(recommendation) {
    return {
        id: recommendation.analysis_recommendation_id,
        type: recommendation.recommendation_type,
        title: recommendation.recommendation_title,
        content: recommendation.recommendation_content,
        createdAt: recommendation.created_at,
    };
}

async function getHistory(userId, options = {}) {
    const limit = Number(options.limit || 20);
    const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20;

    // 요약과 목록은 서로 의존하지 않으므로 동시에 조회합니다.
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
