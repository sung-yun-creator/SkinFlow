const mypageRepository = require('../repositories/mypageRepository');
const { toNumber } = require('../utils/number');

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
    // DB에서 union으로 가져온 여러 활동을 프론트가 쓰기 쉬운 공통 형태로 바꿉니다.
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
            latestStatus: analysisSummary?.latest_status || null,
            latestGradeName: analysisSummary?.latest_grade_name || null,
            latestAnalyzedAt: analysisSummary?.latest_analyzed_at || null,
            mainConcern: mainConcern?.metric_name || null,
            mainConcernScore: mainConcern ? toNumber(mainConcern.metric_score) : null,
            mainConcernGrade: mainConcern?.grade_name || null,
        },
        recentActivity: toRecentActivity(recentActivity),
    };
}

async function getMypage(userId) {
    // 프로필, 분석 요약, 최근 활동은 서로 독립적이라 동시에 조회합니다.
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

    // 가장 최근 분석에서 점수가 낮은 지표를 대표 관심 항목으로 사용합니다.
    const mainConcern = await mypageRepository.findMainConcernByAnalysisId(
        analysisSummary?.latest_analysis_id,
    );

    return toMypageResponse(user, analysisSummary, mainConcern, recentActivity);
}

module.exports = {
    getMypage,
};
