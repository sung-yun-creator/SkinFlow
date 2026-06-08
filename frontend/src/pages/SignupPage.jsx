import { Link } from "react-router-dom";

function SignupPage() {
  return (
    <main className="temp-page">
      <section className="temp-card">
        <span className="temp-label">회원가입</span>
        <h1 className="temp-title">나만의 피부 분석 이력을 시작하세요</h1>
        <p className="temp-description">
          SkinFlow는 분석 결과를 기반으로 성분, 제품, 식습관 가이드를 제공합니다.
        </p>

        <div className="temp-links">
          <Link className="temp-link" to="/dashboard">
            가입 완료 후 이동
          </Link>
          <Link className="temp-link secondary" to="/login">
            로그인으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default SignupPage;