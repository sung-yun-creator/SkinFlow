// authApi.js
// 로그인, 회원가입, 이메일 인증, 비밀번호 재설정 API를 모아둔 파일입니다.
// 화면 컴포넌트는 이 함수들을 호출하고, 세션 저장/에러 메시지 정리는 여기서 공통으로 처리합니다.
import http from "./http";
import {
  AUTH_STORAGE_KEYS,
  cleanupLegacyAuthStorage,
  clearLoginSession,
  removeSensitiveFields,
} from "./authSession";

// 다른 파일에서도 세션 정리 함수를 사용할 수 있도록 다시 export합니다.
export { cleanupLegacyAuthStorage, clearLoginSession };

// 회원가입 전에 이메일 중복 여부를 확인합니다.
export function checkEmail(email) {
  return http.post("/api/auth/check-email", { email });
}

// 회원가입 이메일 인증번호를 발송합니다.
export function sendEmailCode(email) {
  return http.post("/api/auth/send-email-code", { email });
}

// 사용자가 입력한 이메일 인증번호가 맞는지 확인합니다.
export function verifyEmailCode({ email, code }) {
  return http.post("/api/auth/verify-email-code", { email, code });
}

// 회원가입 최종 요청입니다.
// 화면에서 입력받은 필수 사용자 정보를 백엔드로 전달합니다.
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

// 로그인 요청입니다.
// 성공 응답의 토큰은 saveLoginSession에서 저장합니다.
export function login({ email, password }) {
  return http.post("/api/auth/login", {
    email,
    password,
  });
}

// 로그인하지 않은 사용자가 비밀번호를 재설정할 때 사용하는 흐름입니다.
// 마이페이지 비밀번호 변경과 달리 사용자가 입력한 가입 이메일을 기준으로 인증 코드를 보냅니다.
// 로그인 화면에서 비밀번호 찾기 인증 코드를 요청할 때 사용합니다.
export function sendPasswordResetCode(email) {
  return http.post("/api/auth/password-reset-code", { email });
}

// 인증 코드와 새 비밀번호를 보내 비밀번호 재설정을 완료합니다.
export function resetPassword({ email, code, newPassword }) {
  return http.post("/api/auth/reset-password", {
    email,
    code,
    newPassword,
  });
}

// 로그인 성공 후 필요한 최소 정보만 저장합니다.
// 비밀번호 같은 민감한 값은 removeSensitiveFields를 거쳐 localStorage에 남지 않도록 합니다.
// 로그인 성공 응답에서 토큰과 사용자 정보를 꺼내 브라우저 저장소에 보관합니다.
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

// 서버 내부 오류 문구가 그대로 노출되면 사용자가 원인을 이해하기 어렵습니다.
// 네트워크/서버성 메시지는 화면별 fallback 문구로 바꿔 안내합니다.
// 서버 오류 문구를 그대로 보여주지 않고 사용자가 이해할 수 있는 안내 문구로 바꿉니다.
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
