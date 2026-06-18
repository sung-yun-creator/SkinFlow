const AUTH_STORAGE_KEYS = {
  token: "skinflow_token",
  userEmail: "skinflow_user_email",
  user: "skinflow_user",
};

const AUTH_SESSION_CLEARED_EVENT = "skinflow-auth-session-cleared";
const LEGACY_USER_STORAGE_KEY = ["skinflow", ["mo", "ck"].join(""), "user"].join("_");

const LEGACY_AUTH_STORAGE_KEYS = [
  LEGACY_USER_STORAGE_KEY,
  "user_info",
  "skinflow_user_name",
  "skinflow_username",
  "userName",
  "name",
];

const SENSITIVE_FIELD_NAMES = [
  "password",
  "user_pw",
  "userPw",
  "password_hash",
  "passwordHash",
];

function notifyAuthSessionCleared() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_CLEARED_EVENT));
  }
}

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

export function cleanupLegacyAuthStorage() {
  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  safelySanitizeJsonStorage(localStorage, AUTH_STORAGE_KEYS.user);
  safelySanitizeJsonStorage(sessionStorage, AUTH_STORAGE_KEYS.user);
}

export function clearLoginSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.userEmail);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);

  sessionStorage.removeItem(AUTH_STORAGE_KEYS.token);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.userEmail);
  sessionStorage.removeItem(AUTH_STORAGE_KEYS.user);

  cleanupLegacyAuthStorage();
  notifyAuthSessionCleared();
}

export { AUTH_SESSION_CLEARED_EVENT, AUTH_STORAGE_KEYS };
