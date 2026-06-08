import { Link } from "react-router-dom";

function HistoryPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">분석 이력</span>
        <h1 className="temp-title">피부 변화 흐름을 확인하세요</h1>
        <p className="temp-description">
          날짜별 피부 분석 결과와 추천 정보를 다시 확인할 수 있습니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/dashboard">
            대시보드로 이동
          </Link>
          <Link className="temp-link secondary" to="/mypage">
            마이페이지
          </Link>
        </div>
      </section>
    </main>
  );
}

export default HistoryPage;