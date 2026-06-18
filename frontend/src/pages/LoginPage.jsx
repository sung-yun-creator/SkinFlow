import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import {
  cleanupLegacyAuthStorage,
  getAuthErrorMessage,
  login,
  saveLoginSession,
} from "../api/authApi";

function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  useEffect(() => {
    cleanupLegacyAuthStorage();
  }, []);

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
      setLoginError("이메일과 비밀번호를 입력해 주세요.");
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
          "이메일 또는 비밀번호를 확인해 주세요."
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
            피부 분석 결과와
            <br />
            맞춤 추천을 이어서 확인하세요
          </h1>

          <p>
            로그인 후 분석 이력과 관리 가이드를 안전하게 확인할 수 있습니다.
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
            <p>이메일과 비밀번호로 SkinFlow 관리 흐름을 이어가세요.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>이메일</span>
              <div className="input-box">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder="이메일을 입력하세요"
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

            <p
              className="auth-helper-text"
              style={{
                margin: "-2px 0 4px",
                color: "#64748b",
                fontSize: 12,
                fontWeight: 700,
                lineHeight: 1.55,
                wordBreak: "keep-all",
              }}
            >
              로그인 정보가 기억나지 않으면 팀 관리자에게 문의해 주세요.
            </p>

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
