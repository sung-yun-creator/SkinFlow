import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  History,
  Info,
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

const metricCards = [
  {
    label: "색소침착",
    score: 72,
    status: "주의",
    description: "볼 주변 색소침착 지표가 관리가 필요한 수준으로 분석되었습니다.",
  },
  {
    label: "주름",
    score: 86,
    status: "양호",
    description: "눈가와 이마 주름 지표는 비교적 안정적인 수준으로 분석되었습니다.",
  },
];

const radarMetrics = [
  {
    label: "수분",
    value: 78,
  },
  {
    label: "탄력",
    value: 74,
  },
  {
    label: "색소침착",
    value: 72,
  },
  {
    label: "주름",
    value: 86,
  },
  {
    label: "유분",
    value: 80,
  },
];

const guideItems = [
  "색소침착 관리에 참고할 수 있는 기능성 성분을 확인해보세요.",
  "자외선 차단과 수분 관리를 꾸준히 유지하는 것이 좋습니다.",
  "동일한 조명과 각도에서 주기적으로 분석하면 변화 흐름을 더 안정적으로 확인할 수 있습니다.",
];

function AnalysisResultPage() {
  return (
    <PageLayout>
      <section className="result-hero">
        <div className="result-copy">
          <Badge>Analysis Result</Badge>

          <h1>
            피부 분석 결과를
            <br />
            확인하세요
          </h1>

          <p>
            입력된 얼굴 이미지를 기반으로 색소침착과 주름 지표를 분석하고,
            피부 상태 설명과 맞춤 관리 방향을 정리했습니다.
          </p>

          <div className="result-action-row">
            <Button to="/recommendations" size="lg">
              맞춤 추천 보기 <ArrowRight size={18} />
            </Button>
            <Button to="/diet-guide" variant="secondary" size="lg">
              식습관 가이드 보기
            </Button>
          </div>
        </div>

        <Card className="result-score-card">
          <div className="result-score-header">
            <div>
              <span className="result-card-label">Total Score</span>
              <h2>종합 피부 점수</h2>
            </div>
            <Badge variant="accent">주의</Badge>
          </div>

          <div className="result-score-visual">
            <div className="result-score-ring">
              <span>82</span>
              <small>/100</small>
            </div>
            <div className="result-score-text">
              <strong>관리 주의 단계</strong>
              <span>색소침착 지표를 중심으로 꾸준한 관리가 필요합니다.</span>
            </div>
          </div>

          <div className="result-score-footer">
            <TrendingUp size={18} />
            <span>이전 분석 대비 4점 상승했습니다.</span>
          </div>
        </Card>
      </section>

      <section className="result-section">
        <SectionTitle
          eyebrow="Skin Metrics"
          title="주요 피부 지표 분석"
          description="MVP 범위에서는 색소침착과 주름 지표를 중심으로 피부 상태를 분석합니다."
        />

        <div className="result-metric-grid">
          {metricCards.map((metric) => (
            <Card className="result-metric-card" key={metric.label}>
              <div className="result-metric-top">
                <div className="result-metric-icon">
                  <BarChart3 size={24} />
                </div>
                <Badge variant={metric.status === "주의" ? "accent" : "primary"}>
                  {metric.status}
                </Badge>
              </div>

              <h3>{metric.label}</h3>

              <div className="result-metric-score-row">
                <strong>{metric.score}</strong>
                <span>/100</span>
              </div>

              <div className="result-metric-progress">
                <span style={{ width: `${metric.score}%` }} />
              </div>

              <p>{metric.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="result-visual-grid">
        <Card className="result-radar-card">
          <div className="result-card-title-row">
            <div>
              <span className="result-card-label">Visualization</span>
              <h2>피부 지표 시각화</h2>
            </div>
            <Badge>5개 지표</Badge>
          </div>

          <div className="radar-layout">
            <div className="radar-visual">
              <div className="radar-ring radar-ring-1" />
              <div className="radar-ring radar-ring-2" />
              <div className="radar-ring radar-ring-3" />
              <div className="radar-polygon" />
              <span className="radar-label label-top">수분</span>
              <span className="radar-label label-right-top">탄력</span>
              <span className="radar-label label-right-bottom">색소침착</span>
              <span className="radar-label label-left-bottom">주름</span>
              <span className="radar-label label-left-top">유분</span>
            </div>

            <div className="radar-metric-list">
              {radarMetrics.map((metric) => (
                <div className="radar-metric-item" key={metric.label}>
                  <div>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                  <div className="radar-metric-bar">
                    <span style={{ width: `${metric.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="result-ai-card">
          <div className="result-ai-icon">
            <Sparkles size={28} />
          </div>

          <span className="result-card-label">AI Summary</span>
          <h2>피부 상태 설명</h2>

          <p>
            현재 피부 분석 결과는 전체적으로 안정적인 편이지만, 색소침착 지표가
            주의 단계로 분석되었습니다. 주름 지표는 양호한 수준으로 확인되며,
            자외선 차단과 수분 관리, 색소침착 관리 성분을 중심으로 꾸준히 관리하는
            것이 좋습니다.
          </p>

          <div className="ai-summary-notice">
            <Info size={18} />
            <span>
              본 설명은 분석 결과 기반의 참고 정보이며 의료적 판단을 대체하지 않습니다.
            </span>
          </div>
        </Card>
      </section>

      <section className="result-bottom-grid">
        <Card className="result-guide-card">
          <div className="result-card-title-row">
            <div>
              <span className="result-card-label">Next Care</span>
              <h2>다음 관리 방향</h2>
            </div>
            <ClipboardCheck size={28} />
          </div>

          <div className="result-guide-list">
            {guideItems.map((item) => (
              <div className="result-guide-item" key={item}>
                <CheckCircle2 size={20} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="result-guide-actions">
            <Button to="/recommendations" full>
              성분·제품 추천 보기 <Sparkles size={18} />
            </Button>
            <Button to="/history" variant="secondary" full>
              분석 이력 확인 <History size={18} />
            </Button>
          </div>
        </Card>

        <Card className="result-save-card">
          <div className="save-card-icon">
            <LineChart size={28} />
          </div>

          <h2>분석 결과가 이력에 저장됩니다</h2>
          <p>
            이번 피부 분석 결과는 분석 이력에서 다시 확인할 수 있습니다.
            주기적으로 분석하면 피부 변화 흐름을 더 쉽게 확인할 수 있습니다.
          </p>

          <div className="save-info-list">
            <div>
              <Droplets size={18} />
              <span>색소침착·주름 지표 저장</span>
            </div>
            <div>
              <Leaf size={18} />
              <span>추천 성분·식습관 가이드 연결</span>
            </div>
          </div>

          <Button to="/dashboard" variant="secondary" full>
            대시보드로 이동
          </Button>
        </Card>
      </section>
    </PageLayout>
  );
}

export default AnalysisResultPage;