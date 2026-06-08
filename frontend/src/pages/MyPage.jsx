import { Link } from "react-router-dom";

function MyPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">마이페이지</span>
        <h1 className="temp-title">내 정보와 피부 분석 설정을 관리하세요</h1>
        <p className="temp-description">
          사용자 정보, 피부 타입, 분석 이력 접근 설정을 관리하는 화면입니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/dashboard">
            대시보드로 이동
          </Link>
          <Link className="temp-link secondary" to="/">
            처음으로
          </Link>
        </div>
      </section>
    </main>
  );
}

export default MyPage;