import http from "./http";

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
  const token =
    data?.token ||
    data?.accessToken ||
    data?.access_token ||
    data?.data?.token ||
    data?.data?.accessToken ||
    data?.data?.access_token;

  const user = data?.user || data?.data?.user || null;

  if (token) {
    localStorage.setItem("skinflow_token", token);
  }

  if (email) {
    localStorage.setItem("skinflow_user_email", email);
  }

  if (user) {
    localStorage.setItem("skinflow_user", JSON.stringify(user));
  }
}
