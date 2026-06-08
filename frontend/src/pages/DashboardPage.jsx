import { Link } from "react-router-dom";

function DashboardPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">대시보드</span>
        <h1 className="temp-title">오늘의 피부 분석을 시작해보세요</h1>
        <p className="temp-description">
          최근 분석 결과를 확인하고 새로운 피부 분석을 진행할 수 있습니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/analysis/capture">
            피부 분석 시작하기
          </Link>
          <Link className="temp-link secondary" to="/history">
            분석 이력 보기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;