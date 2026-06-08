import { ArrowRight, Camera, History, Sparkles } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";

function LandingPage() {
  return (
    <PageLayout showBottomNav={false}>
      <section className="landing-hero">
        <div className="landing-hero-content">
          <Badge>AI Beauty-Tech</Badge>

          <h1>
            피부 분석부터 맞춤 추천까지,
            <br />
            SkinFlow로 한 번에 관리하세요
          </h1>

          <p>
            얼굴 이미지를 기반으로 색소침착과 주름 상태를 분석하고,
            기능성 성분·화장품 제품·식습관 가이드를 연결해주는 통합 라이프케어 솔루션입니다.
          </p>

          <div className="landing-actions">
            <Button to="/analysis/capture" size="lg">
              피부 분석 시작하기 <ArrowRight size={18} />
            </Button>
            <Button to="/dashboard" variant="secondary" size="lg">
              대시보드 보기
            </Button>
          </div>
        </div>

        <Card className="landing-preview-card">
          <div className="preview-header">
            <div>
              <p>오늘의 피부 분석</p>
              <h3>종합 점수 82점</h3>
            </div>
            <Badge variant="accent">주의</Badge>
          </div>

          <div className="preview-score-circle">
            <span>82</span>
            <small>/100</small>
          </div>

          <div className="preview-metrics">
            <div>
              <span>색소침착</span>
              <strong>주의</strong>
            </div>
            <div>
              <span>주름</span>
              <strong>양호</strong>
            </div>
            <div>
              <span>추천</span>
              <strong>성분 3개</strong>
            </div>
          </div>
        </Card>
      </section>

      <section className="landing-section">
        <SectionTitle
          align="center"
          eyebrow="Service Flow"
          title="분석 결과를 이해하고 다음 행동까지 연결합니다"
          description="SkinFlow는 단순 분석 결과 제공에 그치지 않고, 사용자가 바로 실천할 수 있는 성분·제품·식습관 가이드까지 제공합니다."
        />

        <div className="feature-grid">
          <Card className="feature-card">
            <Camera className="feature-icon" size={28} />
            <h3>피부 이미지 분석</h3>
            <p>웹캠 또는 업로드 이미지를 기반으로 색소침착과 주름 지표를 분석합니다.</p>
          </Card>

          <Card className="feature-card">
            <Sparkles className="feature-icon" size={28} />
            <h3>맞춤 추천</h3>
            <p>분석 결과를 바탕으로 기능성 성분과 화장품 제품 추천 정보를 제공합니다.</p>
          </Card>

          <Card className="feature-card">
            <History className="feature-icon" size={28} />
            <h3>분석 이력 관리</h3>
            <p>날짜별 피부 분석 결과를 저장하고 피부 변화 흐름을 확인할 수 있습니다.</p>
          </Card>
        </div>
      </section>
    </PageLayout>
  );
}

export default LandingPage;