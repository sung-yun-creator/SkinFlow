import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">SkinFlow</span>
        <h1 className="temp-title">AI 피부 분석 기반 통합 라이프케어 솔루션</h1>
        <p className="temp-description">
          얼굴 이미지를 기반으로 색소침착과 주름 상태를 분석하고,
          성분·제품·식습관 가이드까지 한 번에 확인할 수 있는 서비스입니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/login">
            로그인
          </Link>
          <Link className="temp-link secondary" to="/dashboard">
            대시보드 보기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;