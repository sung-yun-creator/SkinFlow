import http from "./http";

const defaultMyPage = {
  profile: {
    name: "사용자",
    email: null,
    gender: null,
    birthDate: null,
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

export function updateMyPageProfile(profile) {
  return http.patch("/api/mypage/profile", profile);
}

export function sendMyPagePasswordCode() {
  return http.post("/api/mypage/password-code");
}

export function updateMyPagePassword({ verificationCode, newPassword }) {
  return http.patch("/api/mypage/password", {
    verificationCode,
    newPassword,
  });
}
