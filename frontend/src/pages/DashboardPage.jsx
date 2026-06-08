import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronRight,
  ClipboardList,
  History,
  Leaf,
  LineChart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";

const recentMetrics = [
  {
    label: "색소침착",
    value: "주의",
    score: 72,
  },
  {
    label: "주름",
    value: "양호",
    score: 86,
  },
  {
    label: "종합 점수",
    value: "82점",
    score: 82,
  },
];

const recommendationCards = [
  {
    icon: Sparkles,
    title: "기능성 성분 추천",
    description: "색소침착 관리에 참고할 수 있는 성분 3개가 준비되어 있어요.",
    to: "/recommendations",
  },
  {
    icon: Leaf,
    title: "식습관 가이드",
    description: "피부 관리를 위한 수분·항산화 중심 식습관 가이드를 확인하세요.",
    to: "/diet-guide",
  },
  {
    icon: History,
    title: "분석 이력",
    description: "이전 피부 분석 결과와 점수 변화 흐름을 다시 확인할 수 있어요.",
    to: "/history",
  },
];

const historyItems = [
  {
    date: "2026.06.08",
    title: "최근 피부 분석",
    score: 82,
    status: "주의",
  },
  {
    date: "2026.06.01",
    title: "이전 피부 분석",
    score: 78,
    status: "주의",
  },
  {
    date: "2026.05.25",
    title: "초기 피부 분석",
    score: 74,
    status: "주의",
  },
];

function DashboardPage() {
  return (
    <PageLayout>
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <Badge>Dashboard</Badge>

          <h1>
            안녕하세요, 사용자님
            <br />
            오늘의 피부 흐름을 확인해보세요
          </h1>

          <p>
            최근 피부 분석 결과와 맞춤 추천 정보를 한눈에 확인하고,
            새로운 피부 분석을 바로 시작할 수 있습니다.
          </p>

          <div className="dashboard-actions">
            <Button to="/analysis/capture" size="lg">
              피부 분석 시작하기 <Camera size={18} />
            </Button>
            <Button to="/history" variant="secondary" size="lg">
              분석 이력 보기
            </Button>
          </div>
        </div>

        <Card className="dashboard-summary-card">
          <div className="dashboard-summary-top">
            <div>
              <span className="dashboard-card-label">최근 분석 결과</span>
              <h2>종합 점수 82점</h2>
              <p>2026.06.08 기준 분석 결과</p>
            </div>
            <Badge variant="accent">주의</Badge>
          </div>

          <div className="dashboard-score-visual">
            <div className="dashboard-score-ring">
              <span>82</span>
              <small>/100</small>
            </div>
            <div className="dashboard-score-note">
              <TrendingUp size={18} />
              <span>이전 분석 대비 4점 상승</span>
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
          eyebrow="Quick Actions"
          title="다음 관리 방향을 바로 확인하세요"
          description="분석 결과를 바탕으로 추천 성분, 식습관 가이드, 분석 이력을 빠르게 확인할 수 있습니다."
        />

        <div className="dashboard-recommend-grid">
          {recommendationCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card className="dashboard-recommend-card" key={item.title}>
                <div className="recommend-icon">
                  <Icon size={24} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Button to={item.to} variant="secondary" size="sm">
                  확인하기 <ChevronRight size={16} />
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
              <span className="dashboard-card-label">History</span>
              <h2>최근 분석 이력</h2>
            </div>
            <Button to="/history" variant="ghost" size="sm">
              전체 보기 <ArrowRight size={16} />
            </Button>
          </div>

          <div className="history-list">
            {historyItems.map((item) => (
              <div className="history-item" key={item.date}>
                <div className="history-date-icon">
                  <CalendarDays size={18} />
                </div>
                <div className="history-content">
                  <strong>{item.title}</strong>
                  <span>{item.date}</span>
                </div>
                <div className="history-score">
                  <strong>{item.score}</strong>
                  <span>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="dashboard-guide-card">
          <div className="guide-card-icon">
            <ClipboardList size={28} />
          </div>

          <h2>오늘의 관리 체크</h2>
          <p>
            분석 결과는 참고 정보입니다. 꾸준한 수분 섭취, 자외선 차단,
            충분한 수면을 함께 관리해보세요.
          </p>

          <div className="guide-check-list">
            <label>
              <input type="checkbox" />
              <span>자외선 차단제 바르기</span>
            </label>
            <label>
              <input type="checkbox" />
              <span>물 충분히 마시기</span>
            </label>
            <label>
              <input type="checkbox" />
              <span>피부 자극 줄이기</span>
            </label>
          </div>

          <Button to="/diet-guide" full>
            식습관 가이드 보기 <LineChart size={18} />
          </Button>
        </Card>
      </section>
    </PageLayout>
  );
}

export default DashboardPage;