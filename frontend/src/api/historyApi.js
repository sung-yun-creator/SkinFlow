// historyApi.js
// 분석 이력 화면에서 사용하는 API 함수들을 모아둔 파일입니다.
// 이력 목록, 상세 결과, LLM 요약 리포트, 점수 추이 그래프 데이터를 담당합니다.
import http from "./http";

// 이력 목록 API 기본 구조입니다.
// 분석 기록이 없는 사용자도 빈 상태 화면을 안정적으로 보여주기 위해 사용합니다.
const defaultHistory = {
  summary: {
    analysisCount: 0,
    latestTotalScore: null,
    latestAnalyzedAt: null,
    latestStatus: null,
    scoreDiff: null,
  },
  records: [],
};

// 상세 이력 API 기본 구조입니다.
const defaultHistoryDetail = {
  analysisId: null,
  analyzedAt: null,
  totalScore: null,
  status: null,
  statusDescription: null,
  summary: null,
  metrics: [],
  recommendations: [],
};

// 점수 추이 API가 비어 있거나 실패해도 그래프 영역이 깨지지 않도록 기본 구조를 고정합니다.
// labels/series가 빈 배열이면 화면에서는 빈 상태 카드를 보여줍니다.
// 그래프 API 기본 구조입니다.
const defaultHistoryScoreTrends = {
  summary: {
    pointCount: 0,
    limit: 7,
    metricCodes: ["total", "pigmentation", "wrinkle"],
  },
  labels: [],
  points: [],
  series: [],
};

// 분석 이력 목록과 상단 요약 통계를 가져옵니다.
export async function getHistory() {
  const data = await http.get("/api/history");

  return {
    summary: {
      ...defaultHistory.summary,
      ...(data?.summary || {}),
    },
    records: Array.isArray(data?.records) ? data.records : [],
  };
}

// 특정 분석 이력 하나의 상세 정보를 가져옵니다.
export async function getHistoryDetail(analysisId) {
  const data = await http.get(`/api/history/${analysisId}`);

  return {
    ...defaultHistoryDetail,
    ...(data || {}),
    metrics: Array.isArray(data?.metrics) ? data.metrics : [],
    recommendations: Array.isArray(data?.recommendations)
      ? data.recommendations
      : [],
  };
}

// 특정 분석 결과에 대한 LLM 요약 리포트를 가져옵니다.
export async function getHistoryLlmReport(analysisId) {
  return http.get(`/api/history/${analysisId}/llm-report`);
}

// 그래프 전용 API는 최근 N개를 오래된 순서부터 내려주므로 x축에 그대로 매핑할 수 있습니다.
// limit은 URL에 들어가기 전에 숫자로 정리해 잘못된 쿼리 생성을 막습니다.
// 점수 추이 그래프에 사용할 최근 N개 분석 데이터를 가져옵니다.
export async function getHistoryScoreTrends(limit = 7) {
  const numericLimit = Number(limit);
  const safeLimit = Number.isFinite(numericLimit)
    ? Math.max(1, Math.round(numericLimit))
    : defaultHistoryScoreTrends.summary.limit;
  const data = await http.get(`/api/history/score-trends?limit=${encodeURIComponent(safeLimit)}`);

  return {
    summary: {
      ...defaultHistoryScoreTrends.summary,
      ...(data?.summary || {}),
    },
    labels: Array.isArray(data?.labels) ? data.labels : [],
    points: Array.isArray(data?.points) ? data.points : [],
    // series[].data와 series[].points는 Recharts 변환에 바로 쓰이는 값이라 배열 형태를 보장합니다.
    series: Array.isArray(data?.series)
      ? data.series.map((item) => ({
          ...item,
          data: Array.isArray(item?.data) ? item.data : [],
          points: Array.isArray(item?.points) ? item.points : [],
        }))
      : [],
  };
}
