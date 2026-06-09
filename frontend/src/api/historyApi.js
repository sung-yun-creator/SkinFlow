import http from "./http";

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
