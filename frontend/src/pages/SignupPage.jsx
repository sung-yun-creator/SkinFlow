import { Link } from "react-router-dom";
import {
  Mail,
  LockKeyhole,
  UserRound,
  Calendar,
  Droplets,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";

function SignupPage() {
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
            기본 피부 정보를 등록하면 SkinFlow가 피부 분석 결과를 더 이해하기 쉬운
            흐름으로 정리하고 맞춤 관리 방향을 제공합니다.
          </p>

          <div className="auth-preview-panel">
            <div className="auth-preview-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <strong>가입 후 이용 가능 기능</strong>
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

          <form className="auth-form">
            <label className="form-field">
              <span>이름</span>
              <div className="input-box">
                <UserRound size={18} />
                <input type="text" placeholder="이름을 입력하세요" />
              </div>
            </label>

            <label className="form-field">
              <span>이메일</span>
              <div className="input-box">
                <Mail size={18} />
                <input type="email" placeholder="skinflow@example.com" />
              </div>
            </label>

            <label className="form-field">
              <span>비밀번호</span>
              <div className="input-box">
                <LockKeyhole size={18} />
                <input type="password" placeholder="비밀번호를 입력하세요" />
              </div>
            </label>

            <div className="form-grid-2">
              <label className="form-field">
                <span>생년월일</span>
                <div className="input-box">
                  <Calendar size={18} />
                  <input type="date" />
                </div>
              </label>

              <label className="form-field">
                <span>피부 타입</span>
                <div className="input-box">
                  <Droplets size={18} />
                  <select defaultValue="">
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
            </div>

            <label className="check-row agree-row">
              <input type="checkbox" />
              <span>서비스 이용약관과 개인정보 처리방침에 동의합니다.</span>
            </label>

            <Button to="/dashboard" size="lg" full>
              회원가입 완료하기 <ArrowRight size={18} />
            </Button>
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