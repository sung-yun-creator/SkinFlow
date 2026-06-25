const DEFAULT_AI_SERVER_URL = 'http://localhost:8000';
const DEFAULT_AI_SERVER_TIMEOUT_MS = 30000;
const analysisRepository = require('../repositories/analysisRepository');
const { findGradeByScore } = require('../constants/analysisReference');
const { deleteStoredImage, savePrivacyImage } = require('./analysisImageStorageService');

// 분석 service는 AI 서버 호출, 결과 정규화, DB 저장 여부 판단을 담당합니다.
function getAiServerUrl() {
    return (process.env.AI_SERVER_URL || DEFAULT_AI_SERVER_URL).replace(/\/$/, '');
}

function getAiServerTimeoutMs() {
    const timeout = Number(process.env.AI_SERVER_TIMEOUT_MS || DEFAULT_AI_SERVER_TIMEOUT_MS);

    return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_AI_SERVER_TIMEOUT_MS;
}

function createAiServerTimeoutError(timeoutMs) {
    const error = new Error('AI 서버 응답 시간이 초과되었습니다. 다시 시도해 주세요.');
    error.code = 'AI_SERVER_TIMEOUT';
    error.status = 504;
    error.result = {
        status: 'ai_server_timeout',
        retryable: true,
        timeoutMs,
    };

    return error;
}

// 원본 이미지는 디스크에 저장하지 않고 메모리에 있는 파일 버퍼만 AI 서버로 전달합니다.
async function requestAiServer(path, file) {
    const formData = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    const timeoutMs = getAiServerTimeoutMs();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    formData.append('file', blob, file.originalname);

    let response;

    try {
        response = await fetch(`${getAiServerUrl()}${path}`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw createAiServerTimeoutError(timeoutMs);
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
        const message = result?.message || result?.detail || 'AI 서버 요청에 실패했습니다.';
        const error = new Error(message);
        error.code = 'AI_SERVER_REQUEST_FAILED';
        error.status = response.status;
        error.result = result;
        throw error;
    }

    return result;
}

async function extractRoi(file) {
    return requestAiServer('/extract-roi', file);
}

function toStoredRois(roiResult) {
    // AI 서버가 ok 상태로 반환한 얼굴/부위 ROI만 DB 저장 대상 좌표로 변환합니다.
    if (roiResult?.roi?.status !== 'ok') {
        return [];
    }

    const regions = [];

    if (roiResult.roi.face?.pixel) {
        regions.push(roiResult.roi.face);
    }

    if (Array.isArray(roiResult.roi.regions)) {
        regions.push(...roiResult.roi.regions);
    }

    return regions.filter((region) => region.name && region.pixel);
}

async function extractAndSaveRoi(userId, analysisId, file) {
    // 다른 사용자의 분석 이력에 ROI가 저장되지 않도록 먼저 소유자 검사를 합니다.
    const analysis = await analysisRepository.findAnalysisByIdAndUserId(userId, analysisId);

    if (!analysis) {
        return null;
    }

    const roiResult = await extractRoi(file);
    const rois = toStoredRois(roiResult);

    if (roiResult?.roi?.status !== 'ok') {
        return {
            ...roiResult,
            saved: {
                analysisId,
                roiCount: 0,
                skipped: true,
            },
        };
    }

    const savedCount = await analysisRepository.replaceAnalysisRois(analysisId, rois);

    return {
        ...roiResult,
        saved: {
            analysisId,
            roiCount: savedCount,
        },
    };
}

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

async function analyzeSkin(file) {
    return requestAiServer('/analyze-skin', file);
}

async function analyzeAndSaveSkin(userId, file) {
    const aiResult = await analyzeSkin(file);
    const normalized = normalizeAnalysisResult(aiResult);

    if (!normalized.persistable) {
        // 실패/대기/비정상 결과는 사용자에게 반환만 하고 DB 분석 이력은 만들지 않습니다.
        return {
            saved: false,
            ...normalized,
        };
    }

    // 저장 가능한 결과일 때만 마스킹 이미지를 파일로 남기고 분석 데이터와 연결합니다.
    const storedImage = await savePrivacyImage(aiResult?.privacy_image);

    try {
        const savedAnalysis = await analysisRepository.createAnalysisWithMetrics(userId, normalized, storedImage);

        return {
            saved: true,
            ...savedAnalysis,
            roi: normalized.roi,
        };
    } catch (error) {
        await deleteStoredImage(storedImage).catch(() => {});
        throw error;
    }
}

module.exports = {
    analyzeAndSaveSkin,
    analyzeSkin,
    extractAndSaveRoi,
    extractRoi,
    normalizeAnalysisResult,
};
