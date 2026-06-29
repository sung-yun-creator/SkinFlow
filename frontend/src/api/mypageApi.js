// mypageApi.js
// 마이페이지 화면에서 사용하는 API 함수들을 모아둔 파일입니다.
// 화면 컴포넌트는 이 파일의 함수를 호출하고, 이 파일은 백엔드 응답을 화면에서 쓰기 좋은 형태로 정리합니다.
import http from "./http";

// 마이페이지는 분석 기록이 없는 사용자도 접근할 수 있습니다.
// null 응답을 기본값과 합쳐 카드가 비어 보이거나 깨지지 않게 합니다.
// 백엔드에서 일부 값이 null로 내려와도 화면 카드가 깨지지 않게 기본값을 준비합니다.
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

// 마이페이지 초기 진입 시 프로필, 분석 통계, 최근 활동을 가져옵니다.
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

// 이메일은 이번 수정 범위에 포함하지 않고, 백엔드가 허용한 프로필 필드만 전달합니다.
// 이름, 성별, 생년월일, 피부 타입처럼 백엔드가 허용한 프로필 정보만 수정합니다.
export function updateMyPageProfile(profile) {
  return http.patch("/api/mypage/profile", profile);
}

// 로그인 사용자의 현재 이메일로 인증 코드가 발송되므로 화면에서 이메일 입력칸을 따로 받지 않습니다.
// 비밀번호 변경 전 인증 코드를 요청합니다.
export function sendMyPagePasswordCode() {
  return http.post("/api/mypage/password-code");
}

// 사용자가 입력한 인증 코드와 새 비밀번호를 보내 실제 비밀번호 변경을 요청합니다.
export function updateMyPagePassword({ verificationCode, newPassword }) {
  return http.patch("/api/mypage/password", {
    verificationCode,
    newPassword,
  });
}
