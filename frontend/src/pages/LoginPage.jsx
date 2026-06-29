// 로그인 페이지입니다.
// 이메일/비밀번호 로그인과 비밀번호 재설정 흐름을 담당하는 화면입니다.
// 이 파일은 화면 표시와 사용자 동작 처리를 담당하며, 백엔드/DB/AI 로직은 여기서 직접 수정하지 않습니다.
// 주석은 코드 흐름 이해를 돕기 위한 설명이며 실제 동작에는 영향을 주지 않습니다.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, LockKeyhole, ArrowRight, ShieldCheck, KeyRound, Send } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import {
  cleanupLegacyAuthStorage,
  getAuthErrorMessage,
  login,
  resetPassword,
  saveLoginSession,
  sendPasswordResetCode,
} from "../api/authApi";

// 비밀번호 재설정 폼은 로그인 폼과 분리합니다.
// 로그인 실패와 재설정 실패 메시지가 섞이지 않도록 별도 상태로 관리합니다.
// 비밀번호 재설정 폼의 초기값입니다. 로그인 폼과 별도로 관리합니다.
const passwordResetInitialForm = {
  email: "",
  code: "",
  newPassword: "",
  confirmPassword: "",
};
 // 로그인 화면 전체를 담당하는 React 컴포넌트입니다.

function LoginPage() {
  const navigate = useNavigate();

  // 로그인 폼과 비밀번호 재설정 폼을 분리해 에러/성공 메시지가 서로 섞이지 않게 관리합니다.
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [passwordResetForm, setPasswordResetForm] = useState(passwordResetInitialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingResetCode, setIsSendingResetCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [accountHelpOpen, setAccountHelpOpen] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState("");
  const [passwordResetMessage, setPasswordResetMessage] = useState("");

  // 로그인 페이지 진입 시 예전 방식으로 저장된 인증 정보를 정리합니다.
  useEffect(() => {
    cleanupLegacyAuthStorage();
  }, []);
   // 이메일/비밀번호 입력값을 로그인 form 상태에 반영합니다.

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  }
   // 비밀번호 재설정 패널의 이메일, 인증번호, 새 비밀번호 입력값을 관리합니다.

  function handlePasswordResetChange(event) {
    const { name, value } = event.target;

    setPasswordResetForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  }

  // 계정 찾기 패널을 열 때 로그인 폼의 이메일을 재사용해 입력 부담을 줄입니다.
  // 패널을 여닫을 때 이전 성공/실패 메시지는 초기화해 현재 행동만 보이게 합니다.
  // 계정 도움말/비밀번호 재설정 패널을 열고 닫습니다.
  function handleAccountHelpToggle() {
    setAccountHelpOpen((currentValue) => {
      const nextValue = !currentValue;

      if (nextValue) {
        setPasswordResetForm((prevForm) => ({
          ...prevForm,
          email: prevForm.email || form.email,
        }));
      }

      setPasswordResetError("");
      setPasswordResetMessage("");

      return nextValue;
    });
  }

  // 비밀번호 찾기는 가입 이메일 확인 → 인증 코드 발송 → 새 비밀번호 설정 순서입니다.
  // 이메일 형식만 먼저 확인하고, 가입 여부 판단은 백엔드 응답을 따릅니다.
  // 가입 이메일로 비밀번호 재설정 인증번호 발송을 요청합니다.
  async function handleSendPasswordResetCode() {
    const email = passwordResetForm.email.trim();

    if (!email) {
      setPasswordResetError("가입 이메일을 입력해 주세요.");
      setPasswordResetMessage("");
      return;
    }

    if (!email.includes("@")) {
      setPasswordResetError("이메일 형식을 확인해 주세요.");
      setPasswordResetMessage("");
      return;
    }

    try {
      setIsSendingResetCode(true);
      setPasswordResetError("");
      setPasswordResetMessage("");

      await sendPasswordResetCode(email);
      setPasswordResetMessage("입력한 이메일로 인증 코드를 보냈습니다.");
    } catch (error) {
      setPasswordResetError(
        getAuthErrorMessage(error, "인증 코드를 보내지 못했습니다. 이메일을 확인해 주세요.")
      );
    } finally {
      setIsSendingResetCode(false);
    }
  }

  // 새 비밀번호는 화면 상태로만 잠시 보관하고 성공 후 즉시 비웁니다.
  // 성공하면 로그인 폼 이메일을 채워 사용자가 바로 로그인할 수 있게 합니다.
  // 인증번호와 새 비밀번호를 확인한 뒤 비밀번호 재설정 API를 호출합니다.
  async function handleResetPassword() {
    const email = passwordResetForm.email.trim();
    const code = passwordResetForm.code.trim();
    const newPassword = passwordResetForm.newPassword;

    if (!email) {
      setPasswordResetError("가입 이메일을 입력해 주세요.");
      setPasswordResetMessage("");
      return;
    }

    if (!code) {
      setPasswordResetError("인증 코드를 입력해 주세요.");
      setPasswordResetMessage("");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordResetError("새 비밀번호는 8자 이상으로 입력해 주세요.");
      setPasswordResetMessage("");
      return;
    }

    if (newPassword !== passwordResetForm.confirmPassword) {
      setPasswordResetError("새 비밀번호 확인값이 일치하지 않습니다.");
      setPasswordResetMessage("");
      return;
    }

    try {
      setIsResettingPassword(true);
      setPasswordResetError("");
      setPasswordResetMessage("");

      await resetPassword({ email, code, newPassword });
      setForm((prevForm) => ({
        ...prevForm,
        email,
        password: "",
      }));
      setPasswordResetForm({
        email,
        code: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordResetMessage("새 비밀번호로 로그인해 주세요.");
    } catch (error) {
      setPasswordResetError(
        getAuthErrorMessage(error, "비밀번호를 재설정하지 못했습니다. 인증 코드를 확인해 주세요.")
      );
    } finally {
      setIsResettingPassword(false);
    }
  }

  // 로그인 성공 시 공통 세션 저장 함수에서 토큰과 사용자 정보를 정리합니다.
  // 실패하거나 완료된 뒤에는 비밀번호 입력값을 비워 민감한 값이 화면 상태에 오래 남지 않게 합니다.
  // 로그인 API를 호출하고 성공 시 세션 저장 후 대시보드로 이동합니다.
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

  // 아래 JSX는 로그인 입력 폼, 계정 도움말, 비밀번호 재설정 패널을 화면에 그립니다.
  return (
    <PageLayout showBottomNav={false}>
      <section className="auth-page">
        <div className="auth-copy">
          <Badge>계정 로그인</Badge>

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

            <button className="auth-submit-button" type="submit" disabled={isLoading}>
              {isLoading ? "로그인 중..." : "로그인하기"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-account-help">
            <button
              type="button"
              className="auth-account-help-button"
              onClick={handleAccountHelpToggle}
            >
              아이디, 비밀번호 찾기
            </button>

            {accountHelpOpen && (
              <div className="auth-reset-panel">
                <div className="auth-reset-heading">
                  <strong>비밀번호 재설정</strong>
                  <p>가입 이메일로 인증 코드를 받은 뒤 새 비밀번호를 설정할 수 있습니다.</p>
                </div>

                <div className="auth-reset-grid">
                  <label className="form-field">
                    <span>가입 이메일</span>
                    <div className="input-box">
                      <Mail size={18} />
                      <input
                        type="email"
                        name="email"
                        placeholder="가입 이메일을 입력하세요"
                        value={passwordResetForm.email}
                        onChange={handlePasswordResetChange}
                        autoComplete="email"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>인증 코드</span>
                    <div className="input-box">
                      <KeyRound size={18} />
                      <input
                        type="text"
                        name="code"
                        placeholder="인증 코드를 입력하세요"
                        value={passwordResetForm.code}
                        onChange={handlePasswordResetChange}
                        autoComplete="one-time-code"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>새 비밀번호</span>
                    <div className="input-box">
                      <LockKeyhole size={18} />
                      <input
                        type="password"
                        name="newPassword"
                        placeholder="8자 이상 입력하세요"
                        value={passwordResetForm.newPassword}
                        onChange={handlePasswordResetChange}
                        autoComplete="new-password"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>새 비밀번호 확인</span>
                    <div className="input-box">
                      <LockKeyhole size={18} />
                      <input
                        type="password"
                        name="confirmPassword"
                        placeholder="새 비밀번호를 다시 입력하세요"
                        value={passwordResetForm.confirmPassword}
                        onChange={handlePasswordResetChange}
                        autoComplete="new-password"
                      />
                    </div>
                  </label>
                </div>

                {passwordResetError && <p className="form-error-text">{passwordResetError}</p>}
                {passwordResetMessage && <p className="form-success-text">{passwordResetMessage}</p>}

                <div className="auth-inline-actions auth-reset-actions">
                  <button
                    type="button"
                    onClick={handleSendPasswordResetCode}
                    disabled={isSendingResetCode || isResettingPassword}
                  >
                    <Send size={15} />
                    {isSendingResetCode ? "발송 중" : "인증 코드 받기"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={isSendingResetCode || isResettingPassword}
                  >
                    <ArrowRight size={15} />
                    {isResettingPassword ? "재설정 중" : "비밀번호 재설정"}
                  </button>
                </div>
              </div>
            )}
          </div>

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
