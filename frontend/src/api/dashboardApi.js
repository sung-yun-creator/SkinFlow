// dashboardApi.js
// 대시보드 화면에서 사용하는 API 함수입니다.
// 최근 분석 요약, 주요 관리 지표, 추천 미리보기, 다음 행동 안내를 한 번에 정리합니다.
import http from "./http";

// 대시보드 기본값입니다.
// 첫 분석 전 사용자도 빈 카드 대신 안내 문구와 CTA가 보이도록 합니다.
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

// 백엔드에서 영어 안내 문구가 내려와도 사용자 화면에는 한국어 버튼으로 보여주기 위한 매핑입니다.
const nextActionLabelMap = {
  "Start your first skin analysis": "피부 분석 시작하기",
  "Start skin analysis": "피부 분석 시작하기",
  "View recommendations": "맞춤 추천 보기",
  "Check recommendations": "맞춤 추천 보기",
  "Review your latest recommendations": "맞춤 추천 보기",
};

// 다음 행동 설명 문구를 한국어로 바꿔주는 매핑입니다.
const nextActionDescriptionMap = {
  "Upload a skin image to see your score, metrics, and recommendations.":
    "얼굴 이미지를 업로드하고 피부 분석 결과와 추천 정보를 확인해보세요.",
  "Complete your first skin analysis to receive personalized recommendations.":
    "첫 피부 분석을 완료하면 맞춤 추천 정보를 확인할 수 있습니다.",
  "Review your latest recommendations based on your skin analysis.":
    "최근 피부 분석 결과를 바탕으로 맞춤 추천 정보를 확인해보세요.",
  "Use your latest analysis result to check recommended ingredients, products, and care guides.":
    "최근 피부 분석 결과를 바탕으로 성분 추천, 제품 추천, 관리 가이드를 확인해보세요.",
};

// nextAction의 버튼 라벨을 화면용 문구로 정리합니다.
function translateNextActionLabel(label) {
  if (!label) return defaultDashboard.nextAction.label;

  return nextActionLabelMap[label] || label;
}

// nextAction의 설명 문구를 화면용 문구로 정리합니다.
function translateNextActionDescription(description) {
  if (!description) return defaultDashboard.nextAction.description;

  return nextActionDescriptionMap[description] || description;
}

// 백엔드 nextAction 응답을 버튼에서 바로 쓸 수 있는 label/path/description 구조로 통일합니다.
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

  const actionPath =
    nextAction.path ||
    nextAction.to ||
    nextAction.url ||
    nextAction.href ||
    defaultDashboard.nextAction.path;

  return {
    ...defaultDashboard.nextAction,
    ...nextAction,
    label: translateNextActionLabel(rawLabel),
    path: actionPath,
    description: translateNextActionDescription(rawDescription),
  };
}

// 대시보드 진입 시 필요한 데이터를 가져오고, 배열/기본값을 안전하게 정리합니다.
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