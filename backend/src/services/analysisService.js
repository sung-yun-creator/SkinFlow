const DEFAULT_AI_SERVER_URL = 'http://localhost:8000';
const DEFAULT_AI_SERVER_TIMEOUT_MS = 30000;
const analysisRepository = require('../repositories/analysisRepository');

function getAiServerUrl() {
    return (process.env.AI_SERVER_URL || DEFAULT_AI_SERVER_URL).replace(/\/$/, '');
}

function getAiServerTimeoutMs() {
    const timeout = Number(process.env.AI_SERVER_TIMEOUT_MS || DEFAULT_AI_SERVER_TIMEOUT_MS);

    return Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_AI_SERVER_TIMEOUT_MS;
}

function createAiServerTimeoutError(timeoutMs) {
    const error = new Error('AI 서버 응답 시간이 초과되었습니다. 다시 시도해 주세요.');
    error.status = 504;
    error.result = {
        status: 'ai_server_timeout',
        retryable: true,
        timeoutMs,
    };

    return error;
}

// 백엔드는 이미지를 저장하지 않고, 메모리에 있는 파일 버퍼만 AI 서버로 전달합니다.
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
        error.status = response.status;
        error.result = result;
        throw error;
    }

    return result;
}

async function extractRoi(file) {
    return requestAiServer('/extract-roi', file);
}

// AI 서버 응답 중 DB에 저장할 수 있는 pixel 좌표만 골라냅니다.
function toStoredRois(roiResult) {
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
    // 다른 사용자의 분석 결과에 ROI가 저장되지 않도록 먼저 소유자를 확인합니다.
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

async function analyzeSkin(file) {
    return requestAiServer('/analyze-skin', file);
}

module.exports = {
    analyzeSkin,
    extractAndSaveRoi,
    extractRoi,
};
