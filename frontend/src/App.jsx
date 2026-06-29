// React Router에서 페이지 주소별 화면을 연결하기 위해 사용하는 컴포넌트입니다.
// Routes는 전체 주소 목록을 감싸고, Route는 하나의 주소와 하나의 페이지를 연결합니다.
import { Routes, Route } from "react-router-dom";

// 아래 import들은 SkinFlow에서 실제로 보여줄 페이지 컴포넌트입니다.
// App.jsx는 각 페이지의 세부 기능을 직접 처리하지 않고,
// "어떤 주소로 들어오면 어떤 페이지를 보여줄지"만 담당합니다.
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import AnalysisCapturePage from "./pages/AnalysisCapturePage";
import AnalysisLoadingPage from "./pages/AnalysisLoadingPage";
import AnalysisResultPage from "./pages/AnalysisResultPage";
import RecommendationPage from "./pages/RecommendationPage";
import DietGuidePage from "./pages/DietGuidePage";
import HistoryPage from "./pages/HistoryPage";
import MyPage from "./pages/MyPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    // Routes 안에 있는 Route 목록이 SkinFlow의 전체 화면 이동표 역할을 합니다.
    // 예를 들어 사용자가 /dashboard 주소로 이동하면 DashboardPage가 화면에 표시됩니다.
    <Routes>
      {/* 랜딩 페이지: 로그인 전 사용자가 처음 보는 서비스 소개 화면입니다. */}
      <Route path="/" element={<LandingPage />} />

      {/* 로그인/회원가입 페이지: 계정 생성과 로그인 진입 흐름을 담당합니다. */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* 대시보드: 로그인 후 최근 분석 요약, 추천 이동, 이력 이동을 보여주는 홈 화면입니다. */}
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* 분석 촬영 페이지: 사용자가 얼굴 이미지를 업로드하거나 웹캠 촬영을 시작하는 화면입니다. */}
      <Route path="/analysis/capture" element={<AnalysisCapturePage />} />

      {/* 분석 진행 페이지: 이미지 전송 후 ROI 추출, AI 분석, 결과 저장 흐름을 기다리는 화면입니다. */}
      <Route path="/analysis/loading" element={<AnalysisLoadingPage />} />

      {/* 분석 결과 페이지: 완료된 분석 결과의 점수, 지표, 관리 안내, 추천 이동 버튼을 보여줍니다. */}
      <Route path="/analysis/result" element={<AnalysisResultPage />} />

      {/* 맞춤 추천 페이지: 분석 결과 기반 성분 추천과 제품 추천을 보여주는 화면입니다. */}
      <Route path="/recommendations" element={<RecommendationPage />} />

      {/* 식습관 가이드 페이지: 분석 결과 또는 기본 기준에 맞춘 식습관/생활 루틴 안내 화면입니다. */}
      <Route path="/diet-guide" element={<DietGuidePage />} />

      {/* 분석 이력 페이지: 과거 분석 기록, 점수 추이, 상세 결과 확인 흐름을 담당합니다. */}
      <Route path="/history" element={<HistoryPage />} />

      {/* 마이페이지: 사용자 프로필, 최근 활동, 계정 관리 흐름을 보여주는 화면입니다. */}
      <Route path="/mypage" element={<MyPage />} />

      {/* 설정 페이지: 표시 방식처럼 서비스 사용 환경과 안내 정보를 정리하는 화면입니다. */}
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;
