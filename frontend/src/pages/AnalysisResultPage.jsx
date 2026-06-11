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
    status: "예시",
    description:
      "색소침착 분석 API 연동 후 실제 점수와 관리 상태가 표시될 영역입니다.",
  },
  {
    label: "주름",
    score: 86,
    status: "예시",
    description: "주름 분석 API 연동 후 실제 점수와 관리 상태가 표시될 영역입니다.",
  },
];

const mvpMetricPreview = [
  {
    label: "색소침착",
    value: 72,
    description: "피부 톤 불균일, 잡티성 색소 영역 등을 중심으로 확인할 예정입니다.",
  },
  {
    label: "주름",
    value: 86,
    description: "이마, 눈가 등 주름 관련 지표를 중심으로 확인할 예정입니다.",
  },
];

const guideItems = [
  "ROI 추출 결과를 기반으로 색소침착·주름 분석 API를 연결할 예정입니다.",
  "분석 결과가 생성되면 기능성 성분 추천과 제품 추천 화면으로 확장할 수 있습니다.",
  "분석 이력 저장 API와 연결되면 동일 사용자의 변화 흐름을 비교할 수 있습니다.",
];

function AnalysisResultPage() {
  return (
    <PageLayout>
      <section className="result-hero">
        <div className="result-copy">
          <Badge>Result Preview</Badge>

          <h1>
            분석 결과 화면을
            <br />
            미리 확인하세요
          </h1>

          <p>
            현재 화면은 ROI 추출 이후 연결될 분석 결과 UI 미리보기입니다.
            실제 색소침착·주름 점수와 설명은 분석 결과 API 연동 후 표시됩니다.
          </p>

          <div className="result-action-row">
            <Button to="/recommendations" size="lg">
              맞춤 추천 화면 확인 <ArrowRight size={18} />
            </Button>
            <Button to="/diet-guide" variant="secondary" size="lg">
              식습관 가이드 화면 확인
            </Button>
          </div>
        </div>

        <Card className="result-score-card">
          <div className="result-score-header">
            <div>
              <span className="result-card-label">Preview Score</span>
              <h2>예시 종합 점수</h2>
            </div>
            <Badge variant="accent">예시</Badge>
          </div>

          <div className="result-score-visual">
            <div className="result-score-ring">
              <span>82</span>
              <small>/100</small>
            </div>
            <div className="result-score-text">
              <strong>분석 결과 UI 예시</strong>
              <span>
                실제 종합 점수와 관리 상태는 색소침착·주름 분석 API 연동 후
                표시됩니다.
              </span>
            </div>
          </div>

          <div className="result-score-footer">
            <TrendingUp size={18} />
            <span>현재 점수와 변화량은 화면 구성을 위한 예시 데이터입니다.</span>
          </div>
        </Card>
      </section>

      <section className="result-section">
        <SectionTitle
          eyebrow="Skin Metrics"
          title="주요 피부 지표 표시 영역"
          description="MVP 범위에서는 색소침착과 주름 지표를 중심으로 결과를 표시할 예정입니다. 현재 점수는 실제 분석값이 아닌 UI 예시입니다."
        />

        <div className="result-metric-grid">
          {metricCards.map((metric) => (
            <Card className="result-metric-card" key={metric.label}>
              <div className="result-metric-top">
                <div className="result-metric-icon">
                  <BarChart3 size={24} />
                </div>
                <Badge variant="secondary">{metric.status}</Badge>
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
              <span className="result-card-label">MVP Metrics Preview</span>
              <h2>MVP 핵심 지표 미리보기</h2>
            </div>
            <Badge>MVP 2개 지표</Badge>
          </div>

          <p className="result-preview-description">
            현재 SkinFlow MVP는 색소침착과 주름 분석을 중심으로 구성됩니다. 아래 점수는
            실제 분석값이 아닌 결과 화면 구성을 확인하기 위한 예시입니다.
          </p>

          <div className="radar-metric-list">
            {mvpMetricPreview.map((metric) => (
              <div className="radar-metric-item" key={metric.label}>
                <div>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
                <div className="radar-metric-bar">
                  <span style={{ width: `${metric.value}%` }} />
                </div>
                <p>{metric.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="result-ai-card">
          <div className="result-ai-icon">
            <Sparkles size={28} />
          </div>

          <span className="result-card-label">AI Summary Preview</span>
          <h2>피부 상태 설명 예시</h2>

          <p>
            이 영역은 분석 결과 API와 LLM 설명 API가 연결된 뒤 실제 피부 상태
            설명이 표시될 영역입니다. 현재 문구는 화면 구성과 사용자 흐름을 확인하기
            위한 예시이며, 의료적 판단이나 확정 표현으로 사용하지 않습니다.
          </p>

          <div className="ai-summary-notice">
            <Info size={18} />
            <span>
              SkinFlow의 분석 결과는 피부 관리 참고 정보이며, 의료적 판단이나
              치료 목적의 정보가 아닙니다.
            </span>
          </div>
        </Card>
      </section>

      <section className="result-bottom-grid">
        <Card className="result-guide-card">
          <div className="result-card-title-row">
            <div>
              <span className="result-card-label">Next Integration</span>
              <h2>다음 연동 방향</h2>
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
              성분·제품 추천 화면 확인 <Sparkles size={18} />
            </Button>
            <Button to="/history" variant="secondary" full>
              분석 이력 화면 확인 <History size={18} />
            </Button>
          </div>
        </Card>

        <Card className="result-save-card">
          <div className="save-card-icon">
            <LineChart size={28} />
          </div>

          <h2>분석 이력 저장 연동 전입니다</h2>
          <p>
            현재 화면은 결과 UI 미리보기 단계입니다. 실제 분석 결과 저장은 분석 결과
            생성 API와 분석 이력 API가 연결된 뒤 처리해야 합니다.
          </p>

          <div className="save-info-list">
            <div>
              <Droplets size={18} />
              <span>색소침착·주름 결과 API 연동 예정</span>
            </div>
            <div>
              <Leaf size={18} />
              <span>추천·식습관 가이드 연동 예정</span>
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