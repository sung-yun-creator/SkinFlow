// http.js
// 프론트엔드의 모든 API 요청이 거쳐 가는 공통 fetch 래퍼입니다.
// 토큰 헤더 추가, JSON/FormData 구분, 401 세션 만료 처리, 공통 에러 변환을 한 곳에서 담당합니다.
import { clearLoginSession } from "./authSession";

// 배포/개발 환경에 따라 API 서버 주소가 달라질 수 있어 환경변수를 먼저 사용합니다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// API 실패 정보를 화면에서 다루기 쉽게 만든 커스텀 에러 클래스입니다.
class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.code = options.code || "API_REQUEST_FAILED";
    this.status = options.status || 0;
    this.result = options.result || null;
    this.data = options.data || null;
  }
}

// 이미지 업로드처럼 FormData로 보내야 하는 요청인지 확인합니다.
function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

// 백엔드 응답은 화면 메시지(message)와 분기 코드(code)를 함께 줄 수 있습니다.
// 화면에서는 친절한 메시지를 보여주고, 컴포넌트에서는 code/status로 안전하게 분기합니다.
function createApiError(response, data) {
  const message =
    data?.message ||
    data?.error ||
    data?.detail ||
    `API 요청에 실패했습니다. 상태 코드: ${response.status}`;

  return new ApiError(message, {
    code: data?.code || "API_REQUEST_FAILED",
    status: response.status,
    result: data?.result || null,
    data,
  });
}

// 로그인 세션이 만료되었을 때 사용자를 로그인 페이지로 보내는 함수입니다.
function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

// 보호 API에서 401이 내려오면 로그인 상태가 더 이상 유효하지 않은 흐름입니다.
// 만료된 토큰을 남겨두면 헤더/하단 네비가 로그인 상태처럼 보일 수 있어 공통으로 세션을 정리합니다.
// 보호 API에서 401이 오면 저장된 로그인 정보를 정리합니다.
function handleUnauthorizedResponse(response, data) {
  if (response.status !== 401) {
    return;
  }

  if (data?.code === "AUTH_IDLE_TIMEOUT" || response.status === 401) {
    clearLoginSession();
    redirectToLogin();
  }
}

// 실제 fetch 요청을 수행하는 핵심 함수입니다.
// 아래 http.get/post/patch/postForm 함수들은 모두 이 request를 사용합니다.
async function request(path, options = {}) {
  const token = localStorage.getItem("skinflow_token");
  const body = options.body;
  const shouldSendFormData = isFormData(body);

  // FormData 요청은 브라우저가 boundary를 자동으로 붙여야 하므로 Content-Type을 직접 지정하지 않습니다.
  // 일반 JSON 요청만 명시적으로 application/json 헤더를 사용합니다.
  const headers = {
    ...(shouldSendFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      "서버에 연결하지 못했습니다. 백엔드 서버 실행 상태와 API 주소를 확인해 주세요.",
      {
        code: "NETWORK_ERROR",
        status: 0,
        data: { originalMessage: error.message },
      },
    );
  }

  const contentType = response.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    handleUnauthorizedResponse(response, data);
    throw createApiError(response, data);
  }

  return data;
}

// 화면이나 API 파일에서 사용하기 쉬운 형태로 HTTP 메서드를 묶어둔 객체입니다.
const http = {
  // GET: 데이터를 조회할 때 사용합니다.
  get(path, options = {}) {
    return request(path, {
      ...options,
      method: "GET",
    });
  },

  // POST: 로그인, 회원가입, 추천 요청처럼 데이터를 생성하거나 실행할 때 사용합니다.
  post(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // PATCH: 프로필 수정, 비밀번호 변경처럼 일부 정보를 수정할 때 사용합니다.
  patch(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  // postForm: 이미지 파일 업로드처럼 FormData를 서버에 보낼 때 사용합니다.
  postForm(path, formData, options = {}) {
    return request(path, {
      ...options,
      method: "POST",
      body: formData,
    });
  },
};

export default http;
export { ApiError };
