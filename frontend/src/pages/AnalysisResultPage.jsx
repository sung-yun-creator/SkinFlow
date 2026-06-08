import { Link } from "react-router-dom";

function AnalysisResultPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">분석 결과</span>
        <h1 className="temp-title">색소침착과 주름 분석 결과를 확인하세요</h1>
        <p className="temp-description">
          분석 결과를 바탕으로 피부 상태 설명과 맞춤 추천 정보를 제공합니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/recommendations">
            추천 결과 보기
          </Link>
          <Link className="temp-link secondary" to="/diet-guide">
            식습관 가이드 보기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AnalysisResultPage;