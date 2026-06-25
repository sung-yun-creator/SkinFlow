import { clearLoginSession } from "./authSession";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

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

function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

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

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function handleUnauthorizedResponse(response, data) {
  if (response.status !== 401) {
    return;
  }

  if (data?.code === "AUTH_IDLE_TIMEOUT" || response.status === 401) {
    clearLoginSession();
    redirectToLogin();
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem("skinflow_token");
  const body = options.body;
  const shouldSendFormData = isFormData(body);

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

const http = {
  get(path, options = {}) {
    return request(path, {
      ...options,
      method: "GET",
    });
  },

  post(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch(path, body, options = {}) {
    return request(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

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
