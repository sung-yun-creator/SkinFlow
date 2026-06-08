import { Link } from "react-router-dom";

function AnalysisCapturePage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">피부 분석</span>
        <h1 className="temp-title">얼굴 이미지를 촬영하거나 업로드하세요</h1>
        <p className="temp-description">
          밝은 곳에서 정면 얼굴이 잘 보이도록 촬영하면 더 안정적인 분석이 가능합니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/analysis/loading">
            분석 요청하기
          </Link>
          <Link className="temp-link secondary" to="/dashboard">
            대시보드로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AnalysisCapturePage;