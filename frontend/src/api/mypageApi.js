import http from "./http";

const defaultMyPage = {
  profile: {
    name: "사용자",
    email: "skinflow@example.com",
    skinType: "미설정",
    createdAt: null,
  },
  stats: {
    analysisCount: 0,
    latestTotalScore: null,
    mainConcern: null,
    latestAnalyzedAt: null,
  },
  recentActivity: [],
};

export async function getMyPage() {
  const data = await http.get("/api/mypage");

  return {
    profile: {
      ...defaultMyPage.profile,
      ...(data?.profile || {}),
    },
    stats: {
      ...defaultMyPage.stats,
      ...(data?.stats || {}),
    },
    recentActivity: Array.isArray(data?.recentActivity)
      ? data.recentActivity
      : [],
  };
}
