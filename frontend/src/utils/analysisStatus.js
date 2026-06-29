// 분석 결과 상태를 한 곳에서 관리하는 유틸 파일입니다.
// 여러 화면에서 "점수를 보여줘도 되는 분석 결과인지"를 같은 기준으로 판단하기 위해 사용합니다.
// 예: 분석 결과 화면, 대시보드, 분석 이력 화면에서 pending/failed 상태의 점수가 잘못 보이지 않도록 막습니다.
const INCOMPLETE_ANALYSIS_STATUSES = new Set([
  // 아직 분석이 끝나지 않은 상태입니다.
  // 이 상태에서는 사용자에게 점수를 보여주면 실제 결과처럼 오해할 수 있습니다.
  "pending",
  "processing",

  // AI 모델 또는 피부 분석 처리 흐름이 아직 준비되지 않은 상태입니다.
  // 백엔드/AI 서버가 결과를 만들기 전이므로 점수 노출을 막아야 합니다.
  "ai_model_pending",
  "analysis_pending",
  "analysis_waiting",
  "skin_analysis_processing",

  // ROI는 얼굴 이미지에서 분석할 피부 영역을 찾는 단계입니다.
  // ROI 단계가 끝나지 않으면 최종 피부 분석 점수로 보기 어렵습니다.
  "roi_pending",
  "roi_processing",

  // 실패 또는 오류 상태입니다.
  // 실패한 분석 결과는 점수 카드나 이력 그래프에 섞이면 사용자에게 혼란을 줄 수 있습니다.
  "failed",
  "error",
  "model_missing",
  "invalid_result",
]);

// 백엔드에서 내려오는 status 값은 대소문자나 공백이 섞일 수 있습니다.
// 비교 전에 항상 소문자 + 앞뒤 공백 제거 형태로 맞춰서 안정적으로 판단합니다.
function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

// 화면에 표시할 점수를 숫자로 바꿔주는 함수입니다.
// null, 빈 문자열, 숫자가 아닌 값은 화면에 보여주지 않도록 null로 돌려줍니다.
// 숫자로 변환 가능한 값은 0~100 사이로 제한해 점수 UI가 깨지지 않게 합니다.
export function toAnalysisScoreNumber(score) {
  // 점수가 아예 없으면 아직 표시할 수 있는 값이 없는 상태로 봅니다.
  if (score === null || score === undefined || score === "") {
    return null;
  }

  const numericScore = Number(score);

  // "abc"처럼 숫자로 바꿀 수 없는 값이면 점수로 사용할 수 없습니다.
  if (!Number.isFinite(numericScore)) {
    return null;
  }

  // 점수는 화면에서 0~100 기준으로 사용하므로 범위를 벗어나지 않게 보정합니다.
  // 소수점이 내려와도 사용자 화면에서는 정수 점수로 보여주기 위해 반올림합니다.
  return Math.max(0, Math.min(100, Math.round(numericScore)));
}

// 현재 분석 상태가 "완료 전/오류/대기" 상태인지 확인합니다.
// true가 나오면 점수나 완료 문구를 보여주면 안 됩니다.
export function isIncompleteAnalysisStatus(status) {
  return INCOMPLETE_ANALYSIS_STATUSES.has(normalizeStatus(status));
}

// 최종적으로 화면에 분석 점수를 보여줘도 되는지 판단하는 함수입니다.
// 페이지마다 같은 조건을 반복해서 쓰면 기준이 달라질 수 있기 때문에,
// 이 함수 하나로 점수 표시 여부를 통일합니다.
export function shouldShowAnalysisScore({ score, status, saved } = {}) {
  // saved가 false면 백엔드가 아직 분석 결과를 저장하지 못한 상태입니다.
  // 이 경우에는 점수가 있더라도 최종 결과처럼 보여주지 않습니다.
  if (saved === false) {
    return false;
  }

  // pending, processing, failed 같은 상태는 완료된 분석이 아니므로 점수를 숨깁니다.
  if (isIncompleteAnalysisStatus(status)) {
    return false;
  }

  // 저장 완료 상태이고, 점수도 정상 숫자로 변환될 때만 화면에 점수를 보여줍니다.
  return toAnalysisScoreNumber(score) !== null;
}
