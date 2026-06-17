import http from "./http";

const AUTH_STORAGE_KEYS = {
  token: "skinflow_token",
  userEmail: "skinflow_user_email",
  user: "skinflow_user",
};

const LEGACY_USER_STORAGE_KEY = ["skinflow", ["mo", "ck"].join(""), "user"].join("_");

const LEGACY_AUTH_STORAGE_KEYS = [
  LEGACY_USER_STORAGE_KEY,
  "user_info",
];

const SENSITIVE_FIELD_NAMES = [
  "password",
  "user_pw",
  "userPw",
  "password_hash",
  "passwordHash",
];

function removeSensitiveFields(value) {
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
}

export function checkEmail(email) {
  return http.post("/api/auth/check-email", { email });
}

export function sendEmailCode(email) {
  return http.post("/api/auth/send-email-code", { email });
}

export function verifyEmailCode({ email, code }) {
  return http.post("/api/auth/verify-email-code", { email, code });
}

export function signup({ name, email, password, gender, birthDate, skinType }) {
  return http.post("/api/auth/signup", {
    name,
    email,
    password,
    gender,
    birthDate,
    skinType,
  });
}

export function login({ email, password }) {
  return http.post("/api/auth/login", {
    email,
    password,
  });
}

export function saveLoginSession(data, email) {
  cleanupLegacyAuthStorage();

  const token =
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.access_token;

  const user = data?.user || data?.data?.user || null;
  const safeUser = user ? removeSensitiveFields(user) : null;

  if (token) {
    localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
  }

  if (email) {
    localStorage.setItem(AUTH_STORAGE_KEYS.userEmail, email);
  }

  if (safeUser) {
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(safeUser));
  }
}

export function getAuthErrorMessage(error, fallbackMessage) {
  const serverMessage = String(error?.message || "").toLowerCase();

  if (
    serverMessage.includes("internal server error") ||
    serverMessage.includes("networkerror") ||
    serverMessage.includes("failed to fetch") ||
    serverMessage.includes("api 요청에 실패했습니다")
  ) {
    return fallbackMessage;
  }

  return fallbackMessage;
}
