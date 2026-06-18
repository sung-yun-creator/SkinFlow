const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const sessionActivityByUserId = new Map();

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
    const sessionKey = getSessionActivityKey(payload);

    if (!sessionKey) {
        return true;
    }

    const lastActivityAt =
        sessionActivityByUserId.get(sessionKey) || getPayloadIssuedAt(payload);

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
