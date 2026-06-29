const { findGradeByScore } = require('../../constants/analysisReference');

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

function normalizeAnalysisResult(aiResult) {
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

    return {
        persistable: true,
        status: 'completed',
        totalScore,
        grade: {
            code: grade.code,
            name: grade.name,
            description: grade.description,
        },
        summary: firstDefined(
            predictionResult.summary,
            predictionResult.summary_text,
            prediction.message,
            `${grade.name} 상태입니다. 색소침착과 주름 지표를 기준으로 산출한 결과입니다.`,
        ),
        metrics,
        roi: aiResult?.roi || null,
        raw: toSafeRawResult(aiResult),
    };
}


module.exports = {
    normalizeAnalysisResult,
};
