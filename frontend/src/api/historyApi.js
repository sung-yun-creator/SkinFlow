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

export async function getHistoryLlmReport(analysisId) {
  return http.get(`/api/history/${analysisId}/llm-report`);
}

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
    series: Array.isArray(data?.series)
      ? data.series.map((item) => ({
          ...item,
          data: Array.isArray(item?.data) ? item.data : [],
          points: Array.isArray(item?.points) ? item.points : [],
        }))
      : [],
  };
}
