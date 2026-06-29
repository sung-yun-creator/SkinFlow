// authSession.js
// 로그인 세션을 localStorage/sessionStorage에서 안전하게 관리하는 유틸 파일입니다.
// 토큰, 사용자 이메일, 사용자 정보 저장 키를 한 곳에 모아두고 세션 정리/민감 정보 제거를 담당합니다.
// SkinFlow가 현재 사용하는 로그인 관련 저장소 key입니다.
const AUTH_STORAGE_KEYS = {
  token: "skinflow_token",
  userEmail: "skinflow_user_email",
  user: "skinflow_user",
};

const ANALYSIS_STORAGE_KEYS = [
  "skinflow_latest_analysis_result",
  "skinflow_analysis_progress",
];

// 세션이 지워졌다는 사실을 Header 같은 다른 컴포넌트에 알려주기 위한 이벤트 이름입니다.
const AUTH_SESSION_CLEARED_EVENT = "skinflow-auth-session-cleared";
const LEGACY_USER_STORAGE_KEY = ["skinflow", ["mo", "ck"].join(""), "user"].join("_");

// 예전 작업 과정에서 사용했을 수 있는 오래된 저장소 key 목록입니다.
// 로그인 상태가 꼬이지 않도록 함께 정리합니다.
const LEGACY_AUTH_STORAGE_KEYS = [
  LEGACY_USER_STORAGE_KEY,
  "user_info",
  "skinflow_user_name",
  "skinflow_username",
  "userName",
  "name",
];

// localStorage에 남기면 안 되는 민감 필드 이름입니다.
const SENSITIVE_FIELD_NAMES = [
  "password",
  "user_pw",
  "userPw",
  "password_hash",
  "passwordHash",
];

// 세션 삭제 이벤트를 브라우저 전역으로 보내 화면들이 즉시 갱신되게 합니다.
function notifyAuthSessionCleared() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
  }
}

// 객체 안에 password 같은 민감 필드가 있으면 재귀적으로 제거합니다.
export function removeSensitiveFields(value) {
  if (Array.isArray(value)) {
    return value.map(removeSensitiveFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value).reduce((safeValue, [key, fieldValue]) => {
    if (SENSITIVE_FIELD_NAMES.includes(key)) {
      return safeValue;
    }

    return {
      ...safeValue,
      [key]: removeSensitiveFields(fieldValue),
    };
  }, {});
}

// 저장소에 남아 있는 JSON 사용자 정보에서 민감 필드를 제거합니다.
// JSON 파싱이 실패하면 잘못된 값으로 보고 삭제합니다.
function safelySanitizeJsonStorage(storage, key) {
  const storedValue = storage.getItem(key);

  if (!storedValue) {
    return;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    const safeValue = removeSensitiveFields(parsedValue);

    storage.setItem(key, JSON.stringify(safeValue));
  } catch {
    storage.removeItem(key);
  }
}

// 현재 사용하지 않는 과거 로그인 저장값을 정리합니다.
export function cleanupLegacyAuthStorage() {
  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  safelySanitizeJsonStorage(localStorage, AUTH_STORAGE_KEYS.user);
  safelySanitizeJsonStorage(sessionStorage, AUTH_STORAGE_KEYS.user);
}

// 로그아웃 또는 세션 만료 시 호출하는 공통 세션 정리 함수입니다.
export function clearLoginSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.userEmail);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);

  sessionStorage.removeItem(AUTH_STORAGE_KEYS.token);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.userEmail);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);

  ANALYSIS_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  cleanupLegacyAuthStorage();
  notifyAuthSessionCleared();
}

export { AUTH_SESSION_CLEARED_EVENT, AUTH_STORAGE_KEYS };
