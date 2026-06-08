import { Link } from "react-router-dom";

function DietGuidePage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">식습관 가이드</span>
        <h1 className="temp-title">피부 관리를 위한 식습관 정보를 확인하세요</h1>
        <p className="temp-description">
          피부 분석 결과를 바탕으로 참고할 수 있는 식습관 관리 방향을 제공합니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/history">
            분석 이력 확인하기
          </Link>
          <Link className="temp-link secondary" to="/dashboard">
            대시보드로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}

export default DietGuidePage;