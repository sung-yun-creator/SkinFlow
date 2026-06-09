const mypageRepository = require('../repositories/mypageRepository');

function toNumber(value) {
    if (value === null || value === undefined) {
        return null;
    }

    return Number(value);
}

function toActivityDescription(activity) {
    if (activity.activity_content) {
        return activity.activity_content;
    }

    const score = toNumber(activity.total_skin_score);
    const scoreText = score === null ? '점수 없음' : `종합 점수 ${Math.round(score)}점`;
    const statusText = activity.activity_status || '상태 없음';

    return `${scoreText} · ${statusText}`;
}

function toRecentActivity(activities) {
    return activities.map((activity) => ({
        type: activity.activity_type,
        title: activity.activity_title,
        description: toActivityDescription(activity),
        occurredAt: activity.occurred_at || null,
        skinAnalysisId: activity.skin_analysis_id,
        totalScore: toNumber(activity.total_skin_score),
        status: activity.activity_status || null,
    }));
}

function toMypageResponse(user, analysisSummary, mainConcern, recentActivity) {
    const latestTotalScore = analysisSummary ? toNumber(analysisSummary.latest_total_score) : null;

    return {
        profile: {
            id: user.user_id,
            name: user.user_name,
            email: user.email,
            gender: user.gender,
            birthDate: user.birth_date || null,
            skinType: user.skin_type || null,
            createdAt: user.created_at || null,
        },
        stats: {
            analysisCount: analysisSummary ? Number(analysisSummary.analysis_count) : 0,
            latestTotalScore,
            latestStatus: analysisSummary?.latest_grade_name || analysisSummary?.latest_status || null,
            latestAnalyzedAt: analysisSummary?.latest_analyzed_at || null,
            mainConcern: mainConcern?.metric_name || null,
            mainConcernScore: mainConcern ? toNumber(mainConcern.metric_score) : null,
            mainConcernGrade: mainConcern?.grade_name || null,
        },
        recentActivity: toRecentActivity(recentActivity),
    };
}

async function getMypage(userId) {
    const [
        user,
        analysisSummary,
        recentActivity,
    ] = await Promise.all([
        mypageRepository.findProfileByUserId(userId),
        mypageRepository.findAnalysisSummaryByUserId(userId),
        mypageRepository.findRecentActivityByUserId(userId),
    ]);

    if (!user) {
        return null;
    }

    const mainConcern = await mypageRepository.findMainConcernByAnalysisId(
        analysisSummary?.latest_analysis_id,
    );

    return toMypageResponse(user, analysisSummary, mainConcern, recentActivity);
}

module.exports = {
    getMypage,
};
