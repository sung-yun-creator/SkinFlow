// analysisApi.js
// 분석 촬영/업로드 화면에서 사용하는 이미지 분석 API 모음입니다.
// 업로드 이미지와 웹캠 촬영 이미지는 모두 File 객체로 맞춰 서버에 같은 방식으로 전송합니다.
import http from "./http";

// 분석 API는 multipart/form-data의 file 필드명을 기준으로 이미지를 받습니다.
// 화면에서 업로드와 웹캠 촬영을 다르게 보여도 서버에는 같은 파일 전송 흐름을 사용합니다.
// 이미지 파일을 multipart/form-data 형식으로 바꾸는 공통 함수입니다.
function createImageFormData(file) {
  if (!file) {
    throw new Error("분석에 사용할 이미지 파일이 없습니다.");
  }

  const formData = new FormData();
  formData.append("file", file);

  return formData;
}

// 얼굴 이미지에서 이마/양볼 등 분석할 관심 영역(ROI)을 먼저 추출합니다.
export function extractRoi(file) {
  const formData = createImageFormData(file);

  return http.postForm("/api/analysis/roi", formData);
}

// 실제 피부 분석 요청입니다.
// 백엔드는 이 파일을 받아 색소침착/주름 지표 결과를 생성합니다.
export function analyzeSkin(file) {
  const formData = createImageFormData(file);

  return http.postForm("/api/analysis/skin", formData);
}

// 이미 저장된 분석 이력에 ROI 좌표를 연결할 때 사용하는 보조 함수입니다.
// analysisId가 없으면 잘못된 이력에 연결될 수 있으므로 요청 전에 차단합니다.
// 이미 저장된 분석 결과에 ROI 좌표를 연결할 때 사용하는 함수입니다.
export function saveRoiToAnalysis(analysisId, file) {
  if (!analysisId) {
    throw new Error("ROI를 저장할 분석 ID가 없습니다.");
  }

  const formData = createImageFormData(file);

  return http.postForm(`/api/analysis/${analysisId}/roi`, formData);
}
