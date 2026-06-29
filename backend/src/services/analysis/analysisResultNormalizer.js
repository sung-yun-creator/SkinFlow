const {
    findGradeByScore,
    findScoreGradeByScore,
} = require('../../constants/analysisReference');

// AI 서버 원본 응답을 DB 저장과 프론트 응답에 맞는 분석 결과 구조로 정규화합니다.
function toScore(value) {
    const score = Number(value);

    if (!Number.isFinite(score)) {
        return null;
    }

    return Math.max(0, Math.min(100, Number(score.toFixed(2))));
}

function firstDefined(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== '');
}

function calculateAge(birthDate) {
    if (!birthDate) {
        return null;
    }

    const parsedDate = new Date(birthDate);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    const today = new Date();
    let age = today.getFullYear() - parsedDate.getFullYear();
    const hasBirthdayPassed = today.getMonth() > parsedDate.getMonth()
        || (today.getMonth() === parsedDate.getMonth() && today.getDate() >= parsedDate.getDate());

    if (!hasBirthdayPassed) {
        age -= 1;
    }

    return age >= 0 && age < 130 ? age : null;
}

function getAgeBandLabel(birthDate) {
    const age = calculateAge(birthDate);

    if (age === null) {
        return null;
    }

    if (age < 20) {
        return '10대 이하';
    }

    if (age >= 60) {
        return '60대 이상';
    }

    return `${Math.floor(age / 10) * 10}대`;
}

function getGenderLabel(gender) {
    const normalizedGender = String(gender || '').trim().toUpperCase();

    if (['F', 'FEMALE', 'WOMAN', '여성'].includes(normalizedGender)) {
        return '여성';
    }

    if (['M', 'MALE', 'MAN', '남성'].includes(normalizedGender)) {
        return '남성';
    }

    return null;
}

function getPrimaryCareMetric(metrics) {
    return [...metrics].sort((left, right) => left.score - right.score)[0] || null;
}

function toScoreGrade(score) {
    const scoreGrade = findScoreGradeByScore(score);

    return {
        code: scoreGrade.code,
        label: scoreGrade.label,
        description: scoreGrade.description,
    };
}

function getMetricCareLabel(metric) {
    if (metric?.code === 'pigmentation') {
        return '색소침착';
    }

    if (metric?.code === 'wrinkle') {
        return '주름';
    }

    return metric?.name || '피부 지표';
}

function getMetricCareAdvice(metric) {
    if (metric?.code === 'pigmentation') {
        return '자외선 차단과 피부톤 관리를 우선해보세요.';
    }

    if (metric?.code === 'wrinkle') {
        return '보습과 탄력 관리 루틴을 우선해보세요.';
    }

    return '낮게 나온 지표를 중심으로 관리해보세요.';
}

function buildProfileSummary({ totalScore, metrics, scoreGrade }, userProfile = null) {
    const ageBandLabel = getAgeBandLabel(userProfile?.birth_date || userProfile?.birthDate);
    const genderLabel = getGenderLabel(userProfile?.gender);
    const profileLabel = [ageBandLabel, genderLabel].filter(Boolean).join(' ');
    const scoreLabel = `${Math.round(totalScore)}점`;
    const gradeLabel = scoreGrade?.label || toScoreGrade(totalScore).label;
    const careMetric = getPrimaryCareMetric(metrics);
    const careLabel = getMetricCareLabel(careMetric);
    const careAdvice = getMetricCareAdvice(careMetric);

    if (profileLabel) {
        return `${profileLabel} 기준 피부 점수는 ${scoreLabel}, ${gradeLabel}입니다. ${careLabel} 점수가 낮아 ${careAdvice}`;
    }

    return `현재 피부 점수는 ${scoreLabel}, ${gradeLabel}입니다. ${careLabel} 점수가 낮아 ${careAdvice}`;
}
function normalizeMetric(code, label, source) {
    if (source === null || source === undefined || source === '') {
        return null;
    }

    const metricSource = typeof source === 'object' ? source : { score: source, value: source };
    const score = toScore(firstDefined(
        metricSource.score,
        metricSource.metric_score,
        metricSource.metricScore,
        metricSource.value,
        metricSource.metric_value,
        metricSource.metricValue,
        metricSource.probability,
    ));

    if (score === null) {
        return null;
    }

    const value = Number(firstDefined(
        metricSource.metric_value,
        metricSource.metricValue,
        metricSource.value,
        score,
    ));
    const metricGrade = findGradeByScore(score);
    const scoreGrade = toScoreGrade(score);

    return {
        code,
        name: label,
        value: Number.isFinite(value) ? Number(value.toFixed(4)) : score,
        score,
        grade: {
            code: metricGrade.code,
            name: metricGrade.name,
            description: metricGrade.description,
        },
        scoreGrade,
    };
}

function findMetricSource(result, code) {
    if (!result || typeof result !== 'object') {
        return null;
    }

    if (Array.isArray(result.metrics)) {
        return result.metrics.find((metric) => {
            const metricCode = metric.code || metric.metric_code || metric.type || metric.name;
            return String(metricCode || '').toLowerCase() === code;
        });
    }

    return firstDefined(result[code], result[`${code}_score`], result[`${code}Score`], null);
}

function toSafeRawResult(aiResult) {
    if (!aiResult?.privacy_image) {
        return aiResult;
    }

    const { data_base64, ...privacyImage } = aiResult.privacy_image;

    return {
        ...aiResult,
        privacy_image: privacyImage,
    };
}

function normalizeAnalysisResult(aiResult, userProfile = null) {
    // AI 서버 응답 형태가 조금 달라도 프론트/DB가 쓰는 공통 분석 구조로 맞춥니다.
    const prediction = aiResult?.prediction || {};
    const predictionResult = prediction.result || aiResult?.result || null;
    const predictionStatus = prediction.status || aiResult?.status || 'ok';
    const roiStatus = aiResult?.roi?.status || prediction.roi?.status || null;

    if (roiStatus && roiStatus !== 'ok') {
        return {
            code: 'ROI_EXTRACTION_REQUIRED',
            persistable: false,
            status: roiStatus,
            message: aiResult?.roi?.message
                || prediction.message
                || 'ROI를 추출하지 못했습니다. 얼굴이 잘 보이는 사진으로 다시 시도해 주세요.',
            retryable: aiResult?.roi?.retryable ?? prediction.retryable ?? true,
            roi: aiResult?.roi || prediction.roi || null,
            raw: toSafeRawResult(aiResult),
        };
    }

    if (!predictionResult || predictionStatus === 'pending') {
        // 결과가 준비되지 않았거나 실패 상태면 분석 이력을 남기지 않도록 persistable=false로 표시합니다.
        return {
            code: predictionStatus === 'pending' ? 'AI_MODEL_PENDING' : 'ANALYSIS_RESULT_NOT_READY',
            persistable: false,
            status: predictionStatus,
            message: prediction.message || 'AI 모델 분석 결과가 아직 준비되지 않았습니다.',
            roi: aiResult?.roi || null,
            raw: toSafeRawResult(aiResult),
        };
    }

    const metrics = [
        normalizeMetric('pigmentation', '색소침착', findMetricSource(predictionResult, 'pigmentation')),
        normalizeMetric('wrinkle', '주름', findMetricSource(predictionResult, 'wrinkle')),
    ].filter(Boolean);

    if (metrics.length === 0) {
        // 색소침착/주름 지표가 없으면 저장 가능한 분석 결과로 보지 않습니다.
        return {
            code: 'ANALYSIS_RESULT_INVALID',
            persistable: false,
            status: 'invalid_result',
            message: 'AI 분석 결과에서 저장 가능한 피부 지표를 찾지 못했습니다.',
            roi: aiResult?.roi || null,
            raw: toSafeRawResult(aiResult),
        };
    }

    const totalScore = toScore(firstDefined(
        predictionResult.totalScore,
        predictionResult.total_score,
        predictionResult.skin_score,
        predictionResult.score,
        metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length,
    ));
    const grade = findGradeByScore(totalScore);
    const scoreGrade = toScoreGrade(totalScore);

    return {
        persistable: true,
        status: 'completed',
        totalScore,
        grade: {
            code: grade.code,
            name: grade.name,
            description: grade.description,
        },
        scoreGrade,
        summary: firstDefined(
            buildProfileSummary({ totalScore, metrics, scoreGrade }, userProfile),
            predictionResult.summary,
            predictionResult.summary_text,
            prediction.message,
        ),
        metrics,
        roi: aiResult?.roi || null,
        raw: toSafeRawResult(aiResult),
    };
}


module.exports = {
    buildProfileSummary,
    normalizeAnalysisResult,
    toScoreGrade,
};
