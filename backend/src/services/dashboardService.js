const dashboardRepository = require('../repositories/dashboardRepository');
const { toNumber } = require('../utils/number');

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

function toAnalysis(record) {
    return {
        analysisId: record.skin_analysis_id,
        analyzedAt: record.analyzed_at || record.created_at || null,
        totalScore: toNumber(record.total_skin_score),
        status: record.grade_name || record.analysis_status || null,
        statusDescription: record.grade_description || null,
        summary: record.summary_text || null,
    };
}

function toMainConcern(metrics) {
    const scoredMetrics = metrics.filter((metric) => metric.score !== null);

    if (scoredMetrics.length === 0) {
        return null;
    }

    return scoredMetrics.reduce((lowest, metric) => (
        metric.score < lowest.score ? metric : lowest
    ));
}

function toRecommendation(recommendation) {
    return {
        id: recommendation.analysis_recommendation_id,
        analysisId: recommendation.skin_analysis_id,
        type: recommendation.recommendation_type,
        title: recommendation.recommendation_title,
        content: recommendation.recommendation_content,
        createdAt: recommendation.created_at,
    };
}

function toDietGuide(guide) {
    return {
        id: guide.diet_guide_id,
        recommendationId: guide.analysis_recommendation_id,
        category: guide.diet_category || null,
        title: guide.guide_title,
        content: guide.guide_content || null,
        reason: guide.recommend_reason || null,
        ingredientId: guide.ingredient_id || null,
        ingredientName: guide.ingredient_name || null,
        createdAt: guide.created_at,
    };
}

function toNextAction(summary) {
    // 분석 이력이 없으면 첫 분석으로, 있으면 추천 확인으로 이어지게 안내합니다.
    if (!summary || !summary.latest_analysis_id) {
        return {
            type: 'analysis',
            title: 'Start your first skin analysis',
            description: 'Upload a skin image to see your score, metrics, and recommendations.',
            to: '/analysis/capture',
        };
    }

    return {
        type: 'recommendation',
        title: 'Review your latest recommendations',
        description: 'Use your latest analysis result to check recommended ingredients, products, and care guides.',
        to: '/recommendations',
    };
}

function toDashboardResponse(user, summary, metrics, recentAnalyses, recommendations, dietGuides) {
    // 프론트 대시보드가 바로 사용할 수 있도록 DB snake_case 값을 camelCase로 정리합니다.
    const latestTotalScore = summary ? toNumber(summary.latest_total_score) : null;
    const earliestTotalScore = summary ? toNumber(summary.earliest_total_score) : null;
    const scoreDiff = latestTotalScore === null || earliestTotalScore === null
        ? null
        : latestTotalScore - earliestTotalScore;
    const mappedMetrics = metrics.map(toMetric);
    const mainConcern = toMainConcern(mappedMetrics);

    return {
        profile: {
            id: user.user_id,
            name: user.user_name,
            email: user.email,
            skinType: user.skin_type || null,
        },
        summary: {
            analysisCount: Number(summary?.analysis_count || 0),
            latestTotalScore,
            latestStatus: summary?.latest_grade_name || summary?.latest_status || null,
            latestAnalyzedAt: summary?.latest_analyzed_at || summary?.latest_created_at || null,
            latestSummary: summary?.latest_summary || null,
            scoreDiff,
        },
        latestAnalysis: summary?.latest_analysis_id
            ? {
                analysisId: summary.latest_analysis_id,
                analyzedAt: summary.latest_analyzed_at || summary.latest_created_at || null,
                totalScore: latestTotalScore,
                status: summary.latest_grade_name || summary.latest_status || null,
                statusDescription: summary.latest_grade_description || null,
                summary: summary.latest_summary || null,
                metrics: mappedMetrics,
            }
            : null,
        mainConcern,
        recentAnalyses: recentAnalyses.map(toAnalysis),
        recommendations: recommendations.map(toRecommendation),
        dietGuides: dietGuides.map(toDietGuide),
        nextAction: toNextAction(summary),
    };
}

async function getDashboard(userId) {
    // 프로필과 분석 요약을 먼저 확인하고, 최신 분석 기준의 부가 데이터를 모읍니다.
    const [user, summary] = await Promise.all([
        dashboardRepository.findProfileByUserId(userId),
        dashboardRepository.findDashboardSummaryByUserId(userId),
    ]);

    if (!user) {
        return null;
    }

    const latestAnalysisId = summary?.latest_analysis_id;
    const [
        metrics,
        recentAnalyses,
        recommendations,
        dietGuides,
    ] = await Promise.all([
        dashboardRepository.findMetricsByAnalysisId(latestAnalysisId),
        dashboardRepository.findRecentAnalysesByUserId(userId),
        dashboardRepository.findRecentRecommendationsByUserId(userId),
        dashboardRepository.findRecentDietGuidesByUserId(userId),
    ]);

    return toDashboardResponse(
        user,
        summary,
        metrics,
        recentAnalyses,
        recommendations,
        dietGuides,
    );
}

module.exports = {
    getDashboard,
};
