const DEFAULT_AI_SERVER_URL = 'http://localhost:8000';
const DEFAULT_AI_SERVER_TIMEOUT_MS = 30000;

// AI 서버로 이미지 파일을 전달하고 ROI/피부 분석 원본 응답을 받아오는 호출부입니다.
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

async function analyzeSkin(file) {
    return requestAiServer('/analyze-skin', file);
}

module.exports = {
    analyzeSkin,
    extractRoi,
    requestAiServer,
};
