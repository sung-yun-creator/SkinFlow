import { Link } from "react-router-dom";

function RecommendationPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">맞춤 추천</span>
        <h1 className="temp-title">분석 결과 기반 성분과 제품을 추천합니다</h1>
        <p className="temp-description">
          색소침착과 주름 분석 결과를 기준으로 기능성 성분과 화장품 제품을 제안합니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/diet-guide">
            식습관 가이드 보기
          </Link>
          <Link className="temp-link secondary" to="/history">
            분석 이력 보기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default RecommendationPage;