const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const sessionActivityByUserId = new Map();

// JWT 자체 만료와 별개로, 서버 메모리에서 사용자별 마지막 활동 시간을 관리합니다.
function getIdleTimeoutMs() {
    const configuredTimeout = Number(process.env.AUTH_IDLE_TIMEOUT_MS);

    return Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : DEFAULT_IDLE_TIMEOUT_MS;
}

function getPayloadIssuedAt(payload) {
    if (!payload?.iat) {
        return null;
    }

    return payload.iat * 1000;
}

function getSessionActivityKey(payload) {
    return payload?.userId ? String(payload.userId) : null;
}

function isSessionIdleExpired(payload, now = Date.now()) {
    // 마지막 활동 시각이 설정된 유휴 시간보다 오래되면 재로그인이 필요합니다.
    const sessionKey = getSessionActivityKey(payload);

    if (!sessionKey) {
        return true;
    }

    const storedActivityAt = sessionActivityByUserId.get(sessionKey) || 0;
    const issuedAt = getPayloadIssuedAt(payload) || 0;
    const lastActivityAt = Math.max(storedActivityAt, issuedAt);

    if (!lastActivityAt) {
        return true;
    }

    return now - lastActivityAt > getIdleTimeoutMs();
}

function touchSessionActivity(payload, now = Date.now()) {
    const sessionKey = getSessionActivityKey(payload);

    if (!sessionKey) {
        return;
    }

    sessionActivityByUserId.set(sessionKey, now);
}

function clearSessionActivity(payload) {
    const sessionKey = getSessionActivityKey(payload);

    if (!sessionKey) {
        return;
    }

    sessionActivityByUserId.delete(sessionKey);
}

module.exports = {
    clearSessionActivity,
    isSessionIdleExpired,
    touchSessionActivity,
};
