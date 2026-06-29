const historyRepository = require('../repositories/historyRepository');
const {
    groupMetricsByAnalysisId,
    toAnalysis,
    toRecommendation,
    toScoreGrade,
} = require('../utils/analysisResponseMapper');
const { toNumber } = require('../utils/number');

// 이력 service는 분석 목록/상세 데이터를 프론트 응답 형태로 묶어주는 계층입니다.
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

function toTrendLabel(record) {
    const rawDate = record.analyzed_at || record.created_at || null;

    if (!rawDate) {
        return `${record.skin_analysis_id}회차`;
    }

    if (rawDate instanceof Date) {
        return rawDate.toISOString().slice(0, 10);
    }

    return String(rawDate).split(/[T ]/)[0] || String(rawDate);
}

function toTrendPoint(record) {
    const totalScore = toNumber(record.total_skin_score);

    return {
        analysisId: record.skin_analysis_id,
        analyzedAt: record.analyzed_at || record.created_at || null,
        label: toTrendLabel(record),
        totalScore,
        scoreGrade: toScoreGrade(totalScore),
        status: record.analysis_status || null,
        gradeName: record.grade_name || null,
    };
}

function toScoreTrendResponse(records, metricsByAnalysisId, limit) {
    const orderedRecords = records.slice().reverse();
    const points = orderedRecords.map(toTrendPoint);
    const metricMap = new Map();

    orderedRecords.forEach((record) => {
        const metrics = metricsByAnalysisId[record.skin_analysis_id] || [];

        metrics.forEach((metric) => {
            if (!metric.code || metricMap.has(metric.code)) {
                return;
            }

            metricMap.set(metric.code, {
                code: metric.code,
                name: metric.name || metric.code,
                unit: metric.unit || null,
            });
        });
    });

    const series = [
        {
            code: 'total',
            name: '종합 점수',
            unit: '점',
            data: points.map((point) => point.totalScore),
            points: points.map((point) => ({
                analysisId: point.analysisId,
                analyzedAt: point.analyzedAt,
                label: point.label,
                score: point.totalScore,
                scoreGrade: point.scoreGrade,
                gradeName: point.gradeName,
                status: point.status,
            })),
        },
        ...Array.from(metricMap.values()).map((metricMeta) => ({
            ...metricMeta,
            data: orderedRecords.map((record) => {
                const metrics = metricsByAnalysisId[record.skin_analysis_id] || [];
                const metric = metrics.find((item) => item.code === metricMeta.code);

                return metric ? metric.score : null;
            }),
            points: orderedRecords.map((record) => {
                const metrics = metricsByAnalysisId[record.skin_analysis_id] || [];
                const metric = metrics.find((item) => item.code === metricMeta.code);

                return {
                    analysisId: record.skin_analysis_id,
                    analyzedAt: record.analyzed_at || record.created_at || null,
                    label: toTrendLabel(record),
                    score: metric ? metric.score : null,
                    scoreGrade: metric ? metric.scoreGrade : null,
                    gradeName: metric ? metric.grade : null,
                    status: record.analysis_status || null,
                };
            }),
        })),
    ];

    return {
        summary: {
            pointCount: points.length,
            limit,
            metricCodes: series.map((item) => item.code),
        },
        labels: points.map((point) => point.label),
        points,
        series,
    };
}

async function getHistory(userId, options = {}) {
    // 목록 조회는 요약, 최근 분석 목록, 각 분석의 지표를 합쳐 반환합니다.
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

async function getHistoryScoreTrends(userId, options = {}) {
    const limit = Number(options.limit || 20);
    const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20;
    const records = await historyRepository.findHistoryRecordsByUserId(userId, safeLimit);
    const analysisIds = records.map((record) => record.skin_analysis_id);
    const metrics = await historyRepository.findMetricsByAnalysisIds(analysisIds);
    const metricsByAnalysisId = groupMetricsByAnalysisId(metrics);

    return toScoreTrendResponse(records, metricsByAnalysisId, safeLimit);
}

async function getHistoryDetail(userId, analysisId) {
    // 상세 조회는 단일 분석 결과에 해당 분석에서 생성된 추천 요약을 함께 붙입니다.
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
    getHistoryScoreTrends,
};
