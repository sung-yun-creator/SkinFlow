import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Image,
  LoaderCircle,
  ScanFace,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";

const analysisSteps = [
  {
    status: "done",
    icon: Image,
    title: "이미지 품질 확인",
    description: "얼굴 이미지의 밝기, 선명도, 형식을 확인했습니다.",
  },
  {
    status: "done",
    icon: ScanFace,
    title: "얼굴 영역 검출",
    description: "분석에 필요한 얼굴 영역과 피부 관심 영역을 확인했습니다.",
  },
  {
    status: "active",
    icon: BrainCircuit,
    title: "피부 지표 분석",
    description: "색소침착과 주름 지표를 기반으로 피부 상태를 분석하고 있습니다.",
  },
  {
    status: "waiting",
    icon: Sparkles,
    title: "맞춤 추천 생성",
    description: "분석 결과를 바탕으로 성분, 제품, 식습관 가이드를 준비합니다.",
  },
];

const summaryItems = [
  {
    label: "분석 항목",
    value: "색소침착 · 주름",
  },
  {
    label: "입력 방식",
    value: "웹캠 이미지",
  },
  {
    label: "예상 소요 시간",
    value: "약 10~20초",
  },
];

function AnalysisLoadingPage() {
  return (
    <PageLayout>
      <section className="loading-page">
        <div className="loading-main">
          <Badge>Analyzing</Badge>

          <h1>
            피부 상태를
            <br />
            분석하고 있어요
          </h1>

          <p>
            얼굴 영역과 피부 관심 영역을 확인한 뒤 색소침착과 주름 지표를
            분석하고, 맞춤 추천 결과를 생성합니다.
          </p>

          <Card className="loading-progress-card">
            <div className="loading-orbit">
              <div className="loading-orbit-ring" />
              <div className="loading-center">
                <LoaderCircle className="loading-spin" size={46} />
                <span>분석 중</span>
              </div>
            </div>

            <div className="loading-progress-content">
              <div className="loading-progress-top">
                <span>현재 진행률</span>
                <strong>68%</strong>
              </div>

              <div className="loading-progress-bar">
                <span />
              </div>

              <p>AI 모델이 피부 지표를 분석하는 중입니다.</p>
            </div>
          </Card>

          <div className="loading-action-row">
            <Button to="/analysis/result" size="lg">
              분석 결과 화면으로 이동 <ArrowRight size={18} />
            </Button>
            <Button to="/analysis/capture" variant="secondary" size="lg">
              이미지 다시 선택
            </Button>
          </div>
        </div>

        <aside className="loading-side">
          <Card className="loading-summary-card">
            <div className="loading-summary-header">
              <div className="loading-summary-icon">
                <WandSparkles size={24} />
              </div>
              <div>
                <span className="loading-card-label">Analysis Summary</span>
                <h2>분석 요청 정보</h2>
              </div>
            </div>

            <div className="loading-summary-list">
              {summaryItems.map((item) => (
                <div className="loading-summary-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card className="loading-step-card">
            <div className="loading-step-header">
              <span className="loading-card-label">Process</span>
              <h2>분석 진행 단계</h2>
            </div>

            <div className="analysis-step-list">
              {analysisSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <div
                    className={`analysis-step-item analysis-step-${step.status}`}
                    key={step.title}
                  >
                    <div className="analysis-step-icon">
                      {step.status === "done" ? (
                        <CheckCircle2 size={20} />
                      ) : step.status === "active" ? (
                        <LoaderCircle className="loading-spin" size={20} />
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>

                    <div className="analysis-step-content">
                      <strong>{step.title}</strong>
                      <span>{step.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="loading-notice-card">
            <div className="loading-notice-icon">
              <Clock3 size={22} />
            </div>
            <p>
              분석 시간은 이미지 품질과 서버 상태에 따라 달라질 수 있습니다.
              화면을 닫지 말고 잠시만 기다려주세요.
            </p>
          </Card>
        </aside>
      </section>
    </PageLayout>
  );
}

export default AnalysisLoadingPage;