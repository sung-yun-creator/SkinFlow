import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  LineChart,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";

const historyItems = [
  {
    date: "2026.06.08",
    title: "최근 피부 분석",
    score: 82,
    status: "주의",
    pigmentation: 72,
    wrinkle: 86,
    recommendation: "나이아신아마이드 · 선크림 · 수분 관리",
  },
  {
    date: "2026.06.01",
    title: "이전 피부 분석",
    score: 78,
    status: "주의",
    pigmentation: 68,
    wrinkle: 84,
    recommendation: "비타민 C 유도체 · 보습 크림 · 항산화 식품",
  },
  {
    date: "2026.05.25",
    title: "초기 피부 분석",
    score: 74,
    status: "주의",
    pigmentation: 65,
    wrinkle: 82,
    recommendation: "자외선 차단 · 수분 섭취 · 피부 자극 줄이기",
  },
];

const trendItems = [
  {
    label: "2026.05.25",
    score: 74,
  },
  {
    label: "2026.06.01",
    score: 78,
  },
  {
    label: "2026.06.08",
    score: 82,
  },
];

const summaryItems = [
  {
    label: "총 분석 횟수",
    value: "3회",
  },
  {
    label: "최근 종합 점수",
    value: "82점",
  },
  {
    label: "점수 변화",
    value: "+8점",
  },
];

function HistoryPage() {
  return (
    <PageLayout>
      <section className="history-hero">
        <div className="history-copy">
          <Badge>Analysis History</Badge>

          <h1>
            피부 분석 이력을
            <br />
            한눈에 확인하세요
          </h1>

          <p>
            날짜별 피부 분석 결과와 추천 정보를 다시 확인하고, 종합 점수와
            주요 지표의 변화 흐름을 비교할 수 있습니다.
          </p>

          <div className="history-action-row">
            <Button to="/analysis/capture" size="lg">
              새 피부 분석 시작하기 <ArrowRight size={18} />
            </Button>
            <Button to="/analysis/result" variant="secondary" size="lg">
              최근 결과 보기
            </Button>
          </div>
        </div>

        <Card className="history-summary-card">
          <div className="history-summary-header">
            <div className="history-summary-icon">
              <History size={28} />
            </div>
            <div>
              <span className="history-card-label">History Summary</span>
              <h2>분석 이력 요약</h2>
            </div>
          </div>

          <div className="history-summary-list">
            {summaryItems.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="history-summary-notice">
            <TrendingUp size={18} />
            <span>최근 3회 분석 기준으로 종합 점수가 꾸준히 상승했습니다.</span>
          </div>
        </Card>
      </section>

      <section className="history-section">
        <SectionTitle
          eyebrow="Trend"
          title="종합 점수 변화 흐름"
          description="최근 피부 분석 이력을 기준으로 종합 점수의 변화 흐름을 시각적으로 확인할 수 있습니다."
        />

        <Card className="history-trend-card">
          <div className="trend-chart-area">
            <div className="trend-line" />
            {trendItems.map((item, index) => (
              <div
                className={`trend-point trend-point-${index + 1}`}
                key={item.label}
              >
                <strong>{item.score}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="trend-insight">
            <div className="trend-insight-icon">
              <Trophy size={24} />
            </div>
            <div>
              <strong>최근 분석 대비 점수가 개선되었습니다</strong>
              <span>
                동일한 조건에서 주기적으로 분석하면 피부 변화 흐름을 더 안정적으로
                비교할 수 있습니다.
              </span>
            </div>
          </div>
        </Card>
      </section>

      <section className="history-section">
        <div className="history-list-header">
          <SectionTitle
            eyebrow="Records"
            title="날짜별 분석 기록"
            description="각 분석 기록을 선택하면 당시의 점수, 지표, 추천 정보를 확인할 수 있습니다."
          />

          <div className="history-search-box">
            <Search size={18} />
            <input type="text" placeholder="분석 날짜 또는 키워드 검색" />
          </div>
        </div>

        <div className="history-record-list">
          {historyItems.map((item) => (
            <Card className="history-record-card" key={item.date}>
              <div className="history-record-top">
                <div className="record-date-icon">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <span>{item.date}</span>
                  <h3>{item.title}</h3>
                </div>
                <Badge variant="accent">{item.status}</Badge>
              </div>

              <div className="record-score-layout">
                <div className="record-score-box">
                  <span>종합 점수</span>
                  <strong>{item.score}</strong>
                  <small>/100</small>
                </div>

                <div className="record-metric-list">
                  <div>
                    <span>색소침착</span>
                    <strong>{item.pigmentation}</strong>
                  </div>
                  <div>
                    <span>주름</span>
                    <strong>{item.wrinkle}</strong>
                  </div>
                </div>
              </div>

              <div className="record-recommendation">
                <Sparkles size={18} />
                <span>{item.recommendation}</span>
              </div>

              <div className="record-actions">
                <Button to="/analysis/result" variant="secondary" size="sm">
                  상세 결과 보기
                </Button>
                <Button to="/recommendations" size="sm">
                  추천 다시 보기 <ArrowRight size={15} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="history-bottom-grid">
        <Card className="history-guide-card">
          <div className="history-card-title-row">
            <div>
              <span className="history-card-label">Guide</span>
              <h2>이력 관리 안내</h2>
            </div>
            <CheckCircle2 size={28} />
          </div>

          <div className="history-guide-list">
            <div>
              <Clock size={20} />
              <span>가능하면 비슷한 시간대와 조명 환경에서 분석해보세요.</span>
            </div>
            <div>
              <LineChart size={20} />
              <span>점수 하나보다 장기적인 변화 흐름을 함께 확인하는 것이 좋습니다.</span>
            </div>
            <div>
              <Sparkles size={20} />
              <span>분석 이력은 추천 성분과 식습관 가이드를 다시 확인하는 기준이 됩니다.</span>
            </div>
          </div>
        </Card>

        <Card className="history-next-card">
          <div className="history-next-icon">
            <LineChart size={28} />
          </div>

          <h2>다음 분석을 이어서 진행해보세요</h2>
          <p>
            SkinFlow는 분석 이력을 기반으로 피부 변화 흐름을 확인할 수 있도록
            돕습니다. 새로운 분석을 추가해 이전 결과와 비교해보세요.
          </p>

          <div className="history-next-actions">
            <Button to="/analysis/capture" full>
              새 피부 분석 시작하기
            </Button>
            <Button to="/dashboard" variant="secondary" full>
              대시보드로 이동
            </Button>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}

export default HistoryPage;