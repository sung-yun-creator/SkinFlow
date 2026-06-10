import {
  ArrowRight,
  Camera,
  History,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";

function LandingPage() {
  const isLoggedIn = Boolean(localStorage.getItem("skinflow_token"));

  return (
    <PageLayout showBottomNav={false}>
      <section className="landing-hero">
        <div className="landing-hero-content">
          <Badge>AI Beauty-Tech</Badge>

          <h1>
            내 피부 흐름을 이해하고,
            <br />
            맞춤 관리로 이어가세요
          </h1>

          <p>
            SkinFlow는 얼굴 이미지를 기반으로 색소침착과 주름 상태를 분석하고,
            분석 결과를 피부 관리 참고 정보, 기능성 성분 추천, 화장품 제품 추천,
            식습관 가이드와 연결하는 통합 라이프케어 솔루션입니다.
          </p>

          <div className="landing-actions">
            {isLoggedIn ? (
              <>
                <Button to="/analysis/capture" size="lg">
                  피부 분석 시작하기 <ArrowRight size={18} />
                </Button>
                <Button to="/dashboard" variant="secondary" size="lg">
                  내 대시보드 보기
                </Button>
              </>
            ) : (
              <>
                <Button to="/signup" size="lg">
                  회원가입하고 시작하기 <ArrowRight size={18} />
                </Button>
                <Button to="/login" variant="secondary" size="lg">
                  로그인하기
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="landing-preview-card">
          <div className="preview-header">
            <div>
              <p>분석 결과 미리보기</p>
              <h3>피부 관리 참고 정보</h3>
            </div>
            <Badge variant="accent">예시</Badge>
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
              <span>추천 흐름</span>
              <strong>성분·제품·식습관</strong>
            </div>
          </div>
        </Card>
      </section>

      <section className="landing-section">
        <SectionTitle
          align="center"
          eyebrow="Service Flow"
          title="분석 결과를 이해하고 다음 행동까지 연결합니다"
          description="SkinFlow는 분석 결과를 단순히 보여주는 데서 끝나지 않고, 사용자가 바로 확인할 수 있는 성분·제품 추천과 식습관 가이드, 분석 이력 관리 흐름까지 제공합니다."
        />

        <div className="feature-grid">
          <Card className="feature-card">
            <Camera className="feature-icon" size={28} />
            <h3>피부 이미지 분석</h3>
            <p>
              웹캠 또는 업로드 이미지를 기반으로 색소침착과 주름 지표를 분석하고,
              사용자가 이해하기 쉬운 결과 화면으로 제공합니다.
            </p>
          </Card>

          <Card className="feature-card">
            <Sparkles className="feature-icon" size={28} />
            <h3>맞춤 추천 연결</h3>
            <p>
              분석 결과를 바탕으로 기능성 성분, 화장품 제품 추천, 식습관 가이드를
              하나의 흐름으로 확인할 수 있습니다.
            </p>
          </Card>

          <Card className="feature-card">
            <History className="feature-icon" size={28} />
            <h3>분석 이력 관리</h3>
            <p>
              날짜별 피부 분석 결과와 추천 정보를 저장해 피부 변화 흐름을
              꾸준히 확인할 수 있도록 돕습니다.
            </p>
          </Card>
        </div>
      </section>

      <section className="landing-section">
        <SectionTitle
          align="center"
          eyebrow="Why SkinFlow"
          title="처음 사용하는 사람도 흐름을 쉽게 따라갈 수 있습니다"
          description="회원가입 후 피부 분석을 시작하고, 분석 결과를 확인한 뒤 추천 정보와 식습관 가이드, 분석 이력까지 자연스럽게 이어지는 사용자 흐름을 기준으로 설계했습니다."
        />

        <div className="feature-grid">
          <Card className="feature-card">
            <ShieldCheck className="feature-icon" size={28} />
            <h3>참고 정보 중심 안내</h3>
            <p>
              분석 결과는 피부 관리에 참고할 수 있는 정보로 제공되며,
              사용자가 자신의 피부 상태를 이해하는 데 초점을 둡니다.
            </p>
          </Card>

          <Card className="feature-card">
            <Utensils className="feature-icon" size={28} />
            <h3>생활 관리 가이드</h3>
            <p>
              성분과 제품 추천뿐 아니라 식습관 가이드를 함께 제공해
              일상 관리 방향까지 확인할 수 있습니다.
            </p>
          </Card>

          <Card className="feature-card">
            <ArrowRight className="feature-icon" size={28} />
            <h3>명확한 다음 단계</h3>
            <p>
              랜딩페이지에서 회원가입, 로그인, 분석 시작, 대시보드 이동까지
              사용자의 상태에 맞는 다음 행동을 제공합니다.
            </p>
          </Card>
        </div>
      </section>
    </PageLayout>
  );
}

export default LandingPage;
