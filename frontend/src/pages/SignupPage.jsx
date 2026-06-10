import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  LockKeyhole,
  UserRound,
  Calendar,
  Droplets,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import {
  checkEmail,
  getAuthErrorMessage,
  sendEmailCode,
  verifyEmailCode,
  signup,
} from "../api/authApi";

function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    gender: "",
    birthDate: "",
    skinType: "",
    code: "",
    agree: false,
  });

  const [emailChecked, setEmailChecked] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState("");
  const [signupError, setSignupError] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prevForm) => ({
      ...prevForm,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "email") {
      setEmailChecked(false);
      setCodeSent(false);
      setCodeVerified(false);
    }

    if (name === "code") {
      setCodeVerified(false);
    }
  }

  async function handleCheckEmail() {
    if (!form.email) {
      setSignupError("이메일을 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setSignupError("");
      setSignupMessage("");

      await checkEmail(form.email);

      setEmailChecked(true);
      setSignupMessage("사용 가능한 이메일입니다.");
    } catch (error) {
      console.error("이메일 중복 확인 API 호출 실패:", error);
      setSignupError(
        getAuthErrorMessage(
          error,
          "이메일 중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
      setEmailChecked(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendEmailCode() {
    if (!emailChecked) {
      setSignupError("먼저 이메일 중복 확인을 진행해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setSignupError("");
      setSignupMessage("");

      await sendEmailCode(form.email);

      setCodeSent(true);
      setSignupMessage("이메일 인증번호를 발송했습니다.");
    } catch (error) {
      console.error("이메일 인증번호 발송 API 호출 실패:", error);
      setSignupError(
        getAuthErrorMessage(
          error,
          "인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요."
        )
      );
      setCodeSent(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyEmailCode() {
    if (!form.code) {
      setSignupError("인증번호를 입력해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setSignupError("");
      setSignupMessage("");

      await verifyEmailCode({
        email: form.email,
        code: form.code,
      });

      setCodeVerified(true);
      setSignupMessage("이메일 인증이 완료되었습니다.");
    } catch (error) {
      console.error("이메일 인증번호 확인 API 호출 실패:", error);
      setSignupError(
        getAuthErrorMessage(
          error,
          "인증번호 확인에 실패했습니다. 인증번호를 다시 확인해주세요."
        )
      );
      setCodeVerified(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.gender ||
      !form.birthDate ||
      !form.skinType
    ) {
      setSignupError("회원가입에 필요한 정보를 모두 입력해주세요.");
      return;
    }

    if (!emailChecked) {
      setSignupError("이메일 중복 확인을 먼저 진행해주세요.");
      return;
    }

    if (!codeSent) {
      setSignupError("이메일 인증번호 발송을 먼저 진행해주세요.");
      return;
    }

    if (!codeVerified) {
      setSignupError("이메일 인증을 완료한 후 회원가입을 진행해주세요.");
      return;
    }

    if (!form.agree) {
      setSignupError("서비스 이용약관과 개인정보 처리방침에 동의해주세요.");
      return;
    }

    try {
      setIsLoading(true);
      setSignupError("");
      setSignupMessage("");

      await signup({
        name: form.name,
        email: form.email,
        password: form.password,
        gender: form.gender,
        birthDate: form.birthDate,
        skinType: form.skinType,
      });

      setSignupMessage("회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.");

      setTimeout(() => {
        navigate("/login");
      }, 700);
    } catch (error) {
      console.error("회원가입 API 호출 실패:", error);
      setSignupError(
        getAuthErrorMessage(
          error,
          "회원가입에 실패했습니다. 입력 정보를 확인한 후 다시 시도해주세요."
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
      <section className="auth-page signup-page">
        <div className="auth-copy">
          <Badge>Personal Skin Care</Badge>

          <h1>
            피부 분석부터 추천까지
            <br />
            나에게 맞게 시작하세요
          </h1>

          <p>
            기본 피부 정보를 등록하면 SkinFlow가 피부 분석 결과를 이해하기 쉬운
            흐름으로 정리하고 맞춤 관리 방향을 제공합니다.
          </p>

          <div className="auth-preview-panel">
            <div className="auth-preview-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <strong>가입 후 이용 가능한 기능</strong>
              <span>피부 분석, 추천 결과, 식습관 가이드, 분석 이력 관리</span>
            </div>
          </div>
        </div>

        <Card className="auth-card signup-card">
          <div className="auth-card-header">
            <Badge variant="primary">회원가입</Badge>
            <h2>SkinFlow 계정 만들기</h2>
            <p>피부 분석 이력을 관리하기 위한 기본 정보를 입력해주세요.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>이름</span>
              <div className="input-box">
                <UserRound size={18} />
                <input
                  type="text"
                  name="name"
                  placeholder="이름을 입력하세요"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
            </label>

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

            <div className="auth-inline-actions">
              <button type="button" onClick={handleCheckEmail} disabled={isLoading}>
                이메일 중복 확인
              </button>
              <button
                type="button"
                onClick={handleSendEmailCode}
                disabled={isLoading || !emailChecked}
              >
                인증번호 발송
              </button>
            </div>

            <label className="form-field">
              <span>인증번호</span>
              <div className="input-box">
                <ShieldCheck size={18} />
                <input
                  type="text"
                  name="code"
                  placeholder="이메일 인증번호를 입력하세요"
                  value={form.code}
                  onChange={handleChange}
                />
              </div>
            </label>

            <div className="auth-inline-actions">
              <button
                type="button"
                onClick={handleVerifyEmailCode}
                disabled={isLoading || !codeSent}
              >
                인증번호 확인
              </button>
            </div>

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
                  autoComplete="new-password"
                />
              </div>
            </label>

            <div className="form-grid-2">
              <label className="form-field">
                <span>성별</span>
                <div className="input-box">
                  <UserRound size={18} />
                  <select name="gender" value={form.gender} onChange={handleChange}>
                    <option value="" disabled>
                      선택
                    </option>
                    <option value="M">남성</option>
                    <option value="F">여성</option>
                  </select>
                </div>
              </label>

              <label className="form-field">
                <span>생년월일</span>
                <div className="input-box">
                  <Calendar size={18} />
                  <input
                    type="date"
                    name="birthDate"
                    value={form.birthDate}
                    onChange={handleChange}
                  />
                </div>
              </label>
            </div>

            <label className="form-field">
              <span>피부 타입</span>
              <div className="input-box">
                <Droplets size={18} />
                <select
                  name="skinType"
                  value={form.skinType}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    선택
                  </option>
                  <option value="dry">건성</option>
                  <option value="oily">지성</option>
                  <option value="combination">복합성</option>
                  <option value="sensitive">민감성</option>
                  <option value="normal">중성</option>
                </select>
              </div>
            </label>

            {signupMessage && <p className="form-success-text">{signupMessage}</p>}
            {signupError && <p className="form-error-text">{signupError}</p>}

            <label className="check-row agree-row">
              <input
                type="checkbox"
                name="agree"
                checked={form.agree}
                onChange={handleChange}
              />
              <span>서비스 이용약관과 개인정보 처리방침에 동의합니다.</span>
            </label>

            <button className="auth-submit-button" type="submit" disabled={isLoading}>
              {isLoading ? "처리 중..." : "회원가입 완료하기"}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="auth-switch">
            <span>이미 계정이 있나요?</span>
            <Link to="/login">로그인</Link>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}

export default SignupPage;