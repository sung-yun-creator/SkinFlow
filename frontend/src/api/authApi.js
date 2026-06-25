import http from "./http";
import {
  AUTH_STORAGE_KEYS,
  cleanupLegacyAuthStorage,
  clearLoginSession,
  removeSensitiveFields,
} from "./authSession";

export { cleanupLegacyAuthStorage, clearLoginSession };

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

export function sendPasswordResetCode(email) {
  return http.post("/api/auth/password-reset-code", { email });
}

export function resetPassword({ email, code, newPassword }) {
  return http.post("/api/auth/reset-password", {
    email,
    code,
    newPassword,
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

  return error?.message || fallbackMessage;
}
