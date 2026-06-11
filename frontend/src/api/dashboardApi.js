import http from "./http";

const defaultDashboard = {
  profile: {
    name: "사용자",
    email: "",
    skinType: "미설정",
  },
  summary: {
    analysisCount: 0,
    latestTotalScore: null,
    latestStatus: null,
    latestAnalyzedAt: null,
    latestSummary: null,
    scoreDiff: null,
  },
  latestAnalysis: null,
  mainConcern: null,
  recentAnalyses: [],
  recommendations: [],
  dietGuides: [],
  nextAction: {
    label: "피부 분석 시작하기",
    path: "/analysis/capture",
    description: "첫 분석을 진행하고 맞춤 관리 흐름을 확인해보세요.",
  },
};

function normalizeNextAction(nextAction) {
  if (!nextAction || typeof nextAction !== "object") {
    return defaultDashboard.nextAction;
  }

  return {
    ...defaultDashboard.nextAction,
    ...nextAction,
    label:
      nextAction.label ||
      nextAction.title ||
      defaultDashboard.nextAction.label,
    path:
      nextAction.path ||
      nextAction.url ||
      nextAction.href ||
      defaultDashboard.nextAction.path,
    description:
      nextAction.description ||
      nextAction.summary ||
      defaultDashboard.nextAction.description,
  };
}

export async function getDashboard() {
  const data = await http.get("/api/dashboard");

  return {
    profile: {
      ...defaultDashboard.profile,
      ...(data?.profile || {}),
    },
    summary: {
      ...defaultDashboard.summary,
      ...(data?.summary || {}),
    },
    latestAnalysis: data?.latestAnalysis || null,
    mainConcern: data?.mainConcern || null,
    recentAnalyses: Array.isArray(data?.recentAnalyses)
      ? data.recentAnalyses
      : [],
    recommendations: Array.isArray(data?.recommendations)
      ? data.recommendations
      : [],
    dietGuides: Array.isArray(data?.dietGuides) ? data.dietGuides : [],
    nextAction: normalizeNextAction(data?.nextAction),
  };
}