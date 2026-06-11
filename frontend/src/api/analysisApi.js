import http from "./http";

function createImageFormData(file) {
  if (!file) {
    throw new Error("분석에 사용할 이미지 파일이 없습니다.");
  }

  const formData = new FormData();
  formData.append("file", file);

  return formData;
}

export function extractRoi(file) {
  const formData = createImageFormData(file);

  return http.postForm("/api/analysis/roi", formData);
}

export function saveRoiToAnalysis(analysisId, file) {
  if (!analysisId) {
    throw new Error("ROI를 저장할 분석 ID가 없습니다.");
  }

  const formData = createImageFormData(file);

  return http.postForm(`/api/analysis/${analysisId}/roi`, formData);
}