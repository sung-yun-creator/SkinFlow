import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getAuthErrorMessage, login, saveLoginSession } from "../api/authApi";

function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.email || !form.password) {
      setLoginError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setLoginError("");

      const data = await login({
        email: form.email,
        password: form.password,
      });

      saveLoginSession(data, form.email);
      navigate("/dashboard");
    } catch (error) {
      console.error("로그인 API 호출 실패:", error);
      setLoginError(
        getAuthErrorMessage(
          error,
          "로그인에 실패했습니다. 이메일 또는 비밀번호를 확인해주세요."
        )
      );
    } finally {
      setIsLoading(false);
      setForm((prevForm) => ({
        ...prevForm,
        password: "",
      }));
    }
  }

  return (
    <PageLayout showBottomNav={false}>
      <section className="auth-page">
        <div className="auth-copy">
          <Badge>SkinFlow Account</Badge>

          <h1>
            나만의 피부 분석 이력을
            <br />
            안전하게 관리하세요
          </h1>

          <p>
            로그인하면 최근 피부 분석 결과, 맞춤 성분·제품 추천, 식습관 가이드와
            분석 이력을 한곳에서 확인할 수 있습니다.
          </p>

          <div className="auth-benefit-list">
            <div className="auth-benefit-item">
              <ShieldCheck size={20} />
              <span>피부 분석 결과와 추천 이력 관리</span>
            </div>
            <div className="auth-benefit-item">
              <ShieldCheck size={20} />
              <span>색소침착·주름 분석 결과 확인</span>
            </div>
            <div className="auth-benefit-item">
              <ShieldCheck size={20} />
              <span>성분·제품·식습관 가이드 확인</span>
            </div>
          </div>
        </div>

        <Card className="auth-card">
          <div className="auth-card-header">
            <Badge variant="primary">로그인</Badge>
            <h2>SkinFlow에 오신 것을 환영합니다</h2>
            <p>이메일과 비밀번호를 입력해 서비스를 시작하세요.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>이메일</span>
              <div className="input-box">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder="skinflow@example.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </label>

            <label className="form-field">
              <span>비밀번호</span>
              <div className="input-box">
                <LockKeyhole size={18} />
                <input
                  type="password"
                  name="password"
                  placeholder="비밀번호를 입력하세요"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </div>
            </label>

            {loginError && <p className="form-error-text">{loginError}</p>}

            <div className="auth-form-options">
              <label className="check-row">
                <input type="checkbox" />
                <span>로그인 상태 유지</span>
              </label>

              <button type="button" className="text-button">
                비밀번호 찾기
              </button>
            </div>

            <button className="auth-submit-button" type="submit" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인하기"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-switch">
            <span>아직 계정이 없나요?</span>
            <Link to="/signup">회원가입</Link>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}

export default LoginPage;