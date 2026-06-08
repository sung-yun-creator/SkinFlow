import { Routes, Route } from "react-router-dom";

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

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/analysis/capture" element={<AnalysisCapturePage />} />
      <Route path="/analysis/loading" element={<AnalysisLoadingPage />} />
      <Route path="/analysis/result" element={<AnalysisResultPage />} />
      <Route path="/recommendations" element={<RecommendationPage />} />
      <Route path="/diet-guide" element={<DietGuidePage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/mypage" element={<MyPage />} />
    </Routes>
  );
}

export default App;