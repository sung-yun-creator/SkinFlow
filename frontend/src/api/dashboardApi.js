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

const nextActionLabelMap = {
  "Start your first skin analysis": "피부 분석 시작하기",
  "Start skin analysis": "피부 분석 시작하기",
  "View recommendations": "맞춤 추천 보기",
  "Check recommendations": "맞춤 추천 보기",
};

const nextActionDescriptionMap = {
  "Upload a skin image to see your score, metrics, and recommendations.":
    "얼굴 이미지를 업로드하고 피부 분석 결과와 추천 정보를 확인해보세요.",
  "Complete your first skin analysis to receive personalized recommendations.":
    "첫 피부 분석을 완료하면 맞춤 추천 정보를 확인할 수 있습니다.",
  "Review your latest recommendations based on your skin analysis.":
    "최근 피부 분석 결과를 바탕으로 맞춤 추천 정보를 확인해보세요.",
};

function translateNextActionLabel(label) {
  if (!label) return defaultDashboard.nextAction.label;

  return nextActionLabelMap[label] || label;
}

function translateNextActionDescription(description) {
  if (!description) return defaultDashboard.nextAction.description;

  return nextActionDescriptionMap[description] || description;
}

function normalizeNextAction(nextAction) {
  if (!nextAction || typeof nextAction !== "object") {
    return defaultDashboard.nextAction;
  }

  const rawLabel =
    nextAction.label ||
    nextAction.title ||
    defaultDashboard.nextAction.label;

  const rawDescription =
    nextAction.description ||
    nextAction.summary ||
    defaultDashboard.nextAction.description;

  return {
    ...defaultDashboard.nextAction,
    ...nextAction,
    label: translateNextActionLabel(rawLabel),
    path:
      nextAction.path ||
      nextAction.url ||
      nextAction.href ||
      defaultDashboard.nextAction.path,
    description: translateNextActionDescription(rawDescription),
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