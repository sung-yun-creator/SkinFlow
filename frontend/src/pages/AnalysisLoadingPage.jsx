import { Link } from "react-router-dom";

function AnalysisLoadingPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">분석 진행 중</span>
        <h1 className="temp-title">피부 상태를 분석하고 있어요</h1>
        <p className="temp-description">
          얼굴 영역과 피부 관심 영역을 확인한 뒤 색소침착과 주름 지표를 분석합니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/analysis/result">
            분석 결과 확인하기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AnalysisLoadingPage;