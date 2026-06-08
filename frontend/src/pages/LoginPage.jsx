import { Link } from "react-router-dom";

function LoginPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">로그인</span>
        <h1 className="temp-title">SkinFlow에 다시 오신 것을 환영합니다</h1>
        <p className="temp-description">
          피부 분석 결과와 추천 이력을 확인하려면 로그인해주세요.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/dashboard">
            로그인 후 대시보드 이동
          </Link>
          <Link className="temp-link secondary" to="/signup">
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;