const mypageRepository = require('../repositories/mypageRepository');
const { updateUserPasswordHash, updateUserProfile } = require('./userService');
const {
    clearEmailVerification,
    sendExistingEmailVerificationCode,
    verifyEmailCode,
} = require('./emailVerificationService');
const { hashPassword } = require('../utils/password');
const { toNumber } = require('../utils/number');

const ALLOWED_GENDERS = new Set(['M', 'F']);
const ALLOWED_SKIN_TYPES = new Set(['dry', 'oily', 'combination', 'sensitive', 'normal']);

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

function toProfileResponse(user) {
    return {
        id: user.user_id,
        name: user.user_name,
        email: user.email,
        gender: user.gender,
        birthDate: user.birth_date || null,
        skinType: user.skin_type || null,
        createdAt: user.created_at || null,
    };
}

function createValidationError(message, field, code = 'PROFILE_UPDATE_INVALID') {
    const error = new Error(message);
    error.status = 400;
    error.code = code;
    error.field = field;
    return error;
}

function normalizeBirthDate(value) {
    if (!value) {
        return null;
    }

    const birthDate = String(value).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        throw createValidationError('생년월일 형식이 올바르지 않습니다.', 'birthDate');
    }

    const parsedDate = new Date(`${birthDate}T00:00:00.000Z`);

    if (Number.isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
        throw createValidationError('생년월일을 다시 확인해 주세요.', 'birthDate');
    }

    return birthDate;
}

function normalizeProfileInput(profile) {
    // DB에 넣기 전 프론트 입력값을 허용 범위로 정리하고 검증합니다.
    const name = String(profile.name || '').trim();
    const gender = String(profile.gender || '').trim().toUpperCase();
    const skinType = String(profile.skinType || '').trim().toLowerCase();

    if (name.length < 2 || name.length > 30) {
        throw createValidationError('이름은 2자 이상 30자 이하로 입력해 주세요.', 'name');
    }

    if (!ALLOWED_GENDERS.has(gender)) {
        throw createValidationError('성별을 선택해 주세요.', 'gender');
    }

    if (!ALLOWED_SKIN_TYPES.has(skinType)) {
        throw createValidationError('피부 타입을 선택해 주세요.', 'skinType');
    }

    return {
        name,
        gender,
        birthDate: normalizeBirthDate(profile.birthDate),
        skinType,
    };
}

function normalizePasswordInput({ newPassword, verificationCode } = {}) {
    // 비밀번호 변경은 새 비밀번호와 이메일 인증 코드가 모두 있어야 진행합니다.
    const password = String(newPassword || '');
    const code = String(verificationCode || '').trim();

    if (password.length < 8) {
        throw createValidationError('비밀번호는 8자 이상이어야 합니다.', 'newPassword', 'PASSWORD_UPDATE_INVALID');
    }

    if (!code) {
        throw createValidationError('이메일 인증 코드를 입력해 주세요.', 'verificationCode', 'PASSWORD_UPDATE_INVALID');
    }

    return {
        newPassword: password,
        verificationCode: code,
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

async function updateMypageProfile(userId, profile) {
    // 입력값 검증 후 t_user를 업데이트하고, 프론트가 다시 쓸 수 있는 profile 형태로 반환합니다.
    const nextProfile = normalizeProfileInput(profile || {});
    const user = await updateUserProfile(userId, nextProfile);

    if (!user) {
        return null;
    }

    return {
        profile: toProfileResponse(user),
    };
}

async function sendMypagePasswordCode(userId) {
    // 로그인한 사용자의 현재 이메일을 DB에서 조회해 인증 코드를 발송합니다.
    const user = await mypageRepository.findProfileByUserId(userId);

    if (!user) {
        return null;
    }

    const result = await sendExistingEmailVerificationCode(user.email);

    if (!result.exists) {
        return null;
    }

    return {
        email: user.email,
        expiresIn: result.expiresIn,
    };
}

async function updateMypagePassword(userId, input) {
    // 사용자 이메일 기준으로 인증 코드를 검증한 뒤 비밀번호 해시를 교체합니다.
    const user = await mypageRepository.findProfileByUserId(userId);

    if (!user) {
        return null;
    }

    const { newPassword, verificationCode } = normalizePasswordInput(input);
    const verified = verifyEmailCode(user.email, verificationCode);

    if (!verified) {
        throw createValidationError(
            '이메일 인증 코드가 올바르지 않거나 만료되었습니다.',
            'verificationCode',
            'PASSWORD_UPDATE_INVALID',
        );
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await updateUserPasswordHash(userId, passwordHash);

    clearEmailVerification(user.email);

    return {
        updated,
    };
}

module.exports = {
    getMypage,
    sendMypagePasswordCode,
    updateMypagePassword,
    updateMypageProfile,
};
