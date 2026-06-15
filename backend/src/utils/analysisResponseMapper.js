const { toNumber } = require('./number');

function toMetric(metric) {
    return {
        id: metric.skin_metric_id,
        code: metric.metric_code || null,
        name: metric.metric_name || null,
        value: toNumber(metric.metric_value),
        score: toNumber(metric.metric_score),
        grade: metric.grade_name || null,
        unit: metric.unit_name || null,
    };
}

function groupMetricsByAnalysisId(metrics) {
    return metrics.reduce((grouped, metric) => {
        const key = metric.skin_analysis_id;

        if (!grouped[key]) {
            grouped[key] = [];
        }

        grouped[key].push(toMetric(metric));

        return grouped;
    }, {});
}

function toAnalysis(record, { metrics } = {}) {
    const analysis = {
        analysisId: record.skin_analysis_id,
        analyzedAt: record.analyzed_at || record.created_at || null,
        totalScore: toNumber(record.total_skin_score),
        status: record.grade_name || record.analysis_status || null,
        statusDescription: record.grade_description || null,
        summary: record.summary_text || null,
    };

    if (metrics !== undefined) {
        analysis.metrics = metrics;
    }

    return analysis;
}

function toRecommendation(recommendation, { includeAnalysisId = false } = {}) {
    const mappedRecommendation = {
        id: recommendation.analysis_recommendation_id,
        type: recommendation.recommendation_type,
        title: recommendation.recommendation_title,
        content: recommendation.recommendation_content,
        createdAt: recommendation.created_at,
    };

    if (includeAnalysisId) {
        mappedRecommendation.analysisId = recommendation.skin_analysis_id;
    }

    return mappedRecommendation;
}

module.exports = {
    groupMetricsByAnalysisId,
    toAnalysis,
    toMetric,
    toRecommendation,
};
