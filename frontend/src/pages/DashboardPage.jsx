import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  Leaf,
  LineChart,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";

const flowSteps = [
  {
    step: "01",
    title: "피부 분석 시작",
    description: "웹캠 촬영 또는 이미지 업로드로 색소침착과 주름 중심 분석을 시작합니다.",
    to: "/analysis/capture",
    icon: Camera,
  },
  {
    step: "02",
    title: "분석 결과 확인",
    description: "종합 점수와 지표별 상태를 시각적으로 확인하고 관리 방향을 파악합니다.",
    to: "/analysis/result",
    icon: LineChart,
  },
  {
    step: "03",
    title: "맞춤 추천 확인",
    description: "분석 결과를 바탕으로 기능성 성분, 제품, 식습관 가이드를 확인합니다.",
    to: "/recommendations",
    icon: Sparkles,
  },
  {
    step: "04",
    title: "분석 이력 관리",
    description: "이전 분석 결과를 모아보고 피부 상태 변화 흐름을 확인합니다.",
    to: "/history",
    icon: History,
  },
];

const quickActionCards = [
  {
    icon: Camera,
    title: "피부 분석 시작",
    description: "처음 이용한다면 여기서 시작하세요. 얼굴 이미지를 기반으로 피부 상태를 분석합니다.",
    to: "/analysis/capture",
    buttonText: "분석 시작",
    variant: "primary",
  },
  {
    icon: Sparkles,
    title: "맞춤 추천",
    description: "분석 결과를 기반으로 성분 추천, 제품 추천, 식습관 가이드를 확인합니다.",
    to: "/recommendations",
    buttonText: "추천 보기",
    variant: "secondary",
  },
  {
    icon: History,
    title: "분석 이력",
    description: "과거 분석 결과와 추천 내용을 다시 확인하고 변화 흐름을 관리합니다.",
    to: "/history",
    buttonText: "이력 보기",
    variant: "secondary",
  },
  {
    icon: User,
    title: "마이페이지",
    description: "피부 타입, 최근 활동, 분석 횟수 등 내 정보를 한곳에서 확인합니다.",
    to: "/mypage",
    buttonText: "내 정보 보기",
    variant: "secondary",
  },
];

const recentMetrics = [
  {
    label: "색소침착",
    value: "첫 분석 후 표시",
    score: 0,
  },
  {
    label: "주름",
    value: "첫 분석 후 표시",
    score: 0,
  },
  {
    label: "종합 점수",
    value: "분석 전",
    score: 0,
  },
];

const guideItems = [
  "분석 결과는 의료적 판단이 아닌 피부 관리 참고 정보로 제공됩니다.",
  "색소침착과 주름 지표를 중심으로 현재 피부 상태를 이해할 수 있게 돕습니다.",
  "추천 성분과 제품은 피부 관리 방향을 정리하기 위한 참고 정보입니다.",
];

function DashboardPage() {
  return (
    <PageLayout>
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <Badge>SkinFlow 홈</Badge>

          <h1>
            피부 분석부터 추천까지
            <br />
            한번에 관리하세요
          </h1>

          <p>
            SkinFlow는 얼굴 이미지를 기반으로 피부 상태를 분석하고,
            분석 결과에 따라 성분 추천, 제품 추천, 식습관 가이드,
            분석 이력 관리를 연결해주는 라이프케어 서비스입니다.
          </p>

          <div className="dashboard-actions">
            <Button to="/analysis/capture" size="lg">
              피부 분석 시작하기 <Camera size={18} />
            </Button>
            <Button to="/recommendations" variant="secondary" size="lg">
              맞춤 추천 보기
            </Button>
          </div>
        </div>

        <Card className="dashboard-summary-card">
          <div className="dashboard-summary-top">
            <div>
              <span className="dashboard-card-label">처음 시작하기</span>
              <h2>첫 분석을 진행해보세요</h2>
              <p>분석 완료 후 종합 점수와 추천 정보가 이곳에 표시됩니다.</p>
            </div>
            <Badge variant="primary">분석 전</Badge>
          </div>

          <div className="dashboard-score-visual">
            <div className="dashboard-score-ring">
              <span>0</span>
              <small>/100</small>
            </div>
            <div className="dashboard-score-note">
              <ShieldCheck size={18} />
              <span>사진 분석 후 결과와 추천이 연결됩니다</span>
            </div>
          </div>

          <div className="dashboard-metric-list">
            {recentMetrics.map((metric) => (
              <div className="dashboard-metric-row" key={metric.label}>
                <div>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
                <div className="metric-progress">
                  <span style={{ width: `${metric.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="dashboard-section">
        <SectionTitle
          eyebrow="서비스 흐름"
          title="처음 사용하는 사람도 흐름을 바로 이해할 수 있게"
          description="상단 메뉴에 모든 세부 페이지를 나열하지 않고, 핵심 사용 흐름에 따라 분석·추천·이력·내 정보로 자연스럽게 이동할 수 있도록 구성했습니다."
        />

        <div className="dashboard-recommend-grid">
          {flowSteps.map((item) => {
            const Icon = item.icon;

            return (
              <Card className="dashboard-recommend-card" key={item.title}>
                <div className="recommend-icon">
                  <Icon size={24} />
                </div>
                <span className="dashboard-card-label">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Button to={item.to} variant="secondary" size="sm">
                  이동하기 <ChevronRight size={16} />
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <SectionTitle
          eyebrow="빠른 이동"
          title="필요한 기능으로 바로 이동하세요"
          description="분석 시작, 맞춤 추천, 분석 이력, 마이페이지를 카드 형태로 묶어 사용자가 다음 행동을 쉽게 선택할 수 있도록 했습니다."
        />

        <div className="dashboard-recommend-grid">
          {quickActionCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card className="dashboard-recommend-card" key={item.title}>
                <div className="recommend-icon">
                  <Icon size={24} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Button
                  to={item.to}
                  variant={item.variant === "primary" ? "primary" : "secondary"}
                  size="sm"
                >
                  {item.buttonText} <ChevronRight size={16} />
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <Card className="dashboard-history-card">
          <div className="card-title-row">
            <div>
              <span className="dashboard-card-label">다음 단계</span>
              <h2>추천 확인 전, 분석이 먼저 필요해요</h2>
            </div>
            <Button to="/analysis/capture" variant="ghost" size="sm">
              분석 시작 <ArrowRight size={16} />
            </Button>
          </div>

          <div className="history-list">
            <div className="history-item">
              <div className="history-date-icon">
                <CalendarDays size={18} />
              </div>
              <div className="history-content">
                <strong>1단계. 피부 분석</strong>
                <span>색소침착과 주름 중심으로 피부 상태를 분석합니다.</span>
              </div>
              <div className="history-score">
                <strong>01</strong>
                <span>시작</span>
              </div>
            </div>

            <div className="history-item">
              <div className="history-date-icon">
                <Sparkles size={18} />
              </div>
              <div className="history-content">
                <strong>2단계. 맞춤 추천</strong>
                <span>분석 결과에 맞는 성분, 제품, 식습관 가이드를 확인합니다.</span>
              </div>
              <div className="history-score">
                <strong>02</strong>
                <span>추천</span>
              </div>
            </div>

            <div className="history-item">
              <div className="history-date-icon">
                <History size={18} />
              </div>
              <div className="history-content">
                <strong>3단계. 이력 관리</strong>
                <span>분석 이력에서 이전 결과와 추천 내용을 다시 확인합니다.</span>
              </div>
              <div className="history-score">
                <strong>03</strong>
                <span>관리</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="dashboard-guide-card">
          <div className="guide-card-icon">
            <ClipboardList size={28} />
          </div>

          <h2>오늘의 관리 가이드</h2>
          <p>
            피부 관리는 한 번의 결과보다 꾸준한 기록과 생활 습관 관리가
            중요합니다. 아래 내용은 피부 관리에 참고할 수 있는 일반 가이드입니다.
          </p>

          <div className="guide-check-list">
            {guideItems.map((item) => (
              <label key={item}>
                <CheckCircle2 size={18} />
                <span>{item}</span>
              </label>
            ))}
          </div>

          <Button to="/diet-guide" full>
            식습관 가이드 보기 <Leaf size={18} />
          </Button>
        </Card>
      </section>
    </PageLayout>
  );
}

export default DashboardPage;
