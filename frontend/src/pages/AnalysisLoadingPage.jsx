import { useMemo } from "react";
import { useLocation } from "react-router-dom";
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

function getRegionCount(roiResult) {
  if (!roiResult) return 0;

  if (Array.isArray(roiResult.regions)) {
    return roiResult.regions.length;
  }

  if (roiResult.roi && Array.isArray(roiResult.roi.regions)) {
    return roiResult.roi.regions.length;
  }

  if (roiResult.result && Array.isArray(roiResult.result.regions)) {
    return roiResult.result.regions.length;
  }

  return 0;
}

function getRoiStatus(roiResult) {
  if (!roiResult) {
    return {
      isReady: false,
      label: "ROI 대기",
      description: "아직 얼굴 관심 영역 정보가 전달되지 않았습니다.",
    };
  }

  const status = roiResult.status || roiResult.roi?.status || roiResult.result?.status;

  if (!status || status === "ok") {
    return {
      isReady: true,
      label: "ROI 확인 완료",
      description: "얼굴과 주요 피부 관심 영역 좌표를 확인했습니다.",
    };
  }

  if (status === "model_missing") {
    return {
      isReady: false,
      label: "ROI 모델 확인 필요",
      description: "AI 서버의 Face Landmarker 모델 파일 확인이 필요합니다.",
    };
  }

  if (status === "no_face") {
    return {
      isReady: false,
      label: "얼굴 미검출",
      description: "이미지에서 얼굴을 찾지 못했습니다. 다른 이미지를 사용해주세요.",
    };
  }

  return {
    isReady: false,
    label: "ROI 확인 필요",
    description: "얼굴 관심 영역 확인 결과를 다시 검토해야 합니다.",
  };
}

function AnalysisLoadingPage() {
  const location = useLocation();
  const analysisInput = location.state?.analysisInput || {};

  const method = analysisInput.method || "unknown";
  const fileName = analysisInput.fileName || "";
  const roiResult = analysisInput.roiResult || null;

  const roiStatus = useMemo(() => getRoiStatus(roiResult), [roiResult]);
  const regionCount = useMemo(() => getRegionCount(roiResult), [roiResult]);

  const methodLabel =
    method === "upload" ? "이미지 업로드" : method === "webcam" ? "웹캠 촬영" : "직접 접근";

  const progressValue = roiStatus.isReady ? "45%" : "20%";
  const progressText = roiStatus.isReady
    ? "얼굴 관심 영역 확인이 완료되었습니다. 다음 단계에서 피부 지표 분석 결과와 연결됩니다."
    : "분석에 필요한 입력 정보를 확인하는 중입니다.";

  const summaryItems = [
    {
      label: "분석 항목",
      value: "색소침착 · 주름",
    },
    {
      label: "입력 방식",
      value: methodLabel,
    },
    {
      label: "업로드 파일",
      value: fileName || "파일 정보 없음",
    },
    {
      label: "ROI 상태",
      value: roiStatus.label,
    },
    {
      label: "관심 영역 수",
      value: regionCount > 0 ? `${regionCount}개 영역` : "확인 대기",
    },
  ];

  const analysisSteps = [
    {
      status: "done",
      icon: Image,
      title: "이미지 입력 확인",
      description:
        method === "upload"
          ? "업로드한 얼굴 이미지 파일을 분석 흐름에 전달했습니다."
          : "분석에 사용할 얼굴 이미지 입력 방식을 확인했습니다.",
    },
    {
      status: roiStatus.isReady ? "done" : "active",
      icon: ScanFace,
      title: "얼굴 및 ROI 확인",
      description: roiStatus.description,
    },
    {
      status: roiStatus.isReady ? "active" : "waiting",
      icon: BrainCircuit,
      title: "피부 지표 분석 준비",
      description:
        "색소침착과 주름 지표 분석 결과를 연결하기 위한 다음 단계입니다.",
    },
    {
      status: "waiting",
      icon: Sparkles,
      title: "맞춤 추천 생성",
      description: "분석 결과 연동 후 성분, 제품, 식습관 가이드와 연결됩니다.",
    },
  ];

  return (
    <PageLayout>
      <section className="loading-page">
        <div className="loading-main">
          <Badge>{roiStatus.isReady ? "ROI Ready" : "Analyzing"}</Badge>

          <h1>
            피부 분석 흐름을
            <br />
            준비하고 있어요
          </h1>

          <p>
            입력된 얼굴 이미지에서 피부 관심 영역을 확인하고, 이후 색소침착과
            주름 중심의 피부 분석 결과로 연결할 준비를 진행합니다.
          </p>

          <Card className="loading-progress-card">
            <div className="loading-orbit">
              <div className="loading-orbit-ring" />
              <div className="loading-center">
                {roiStatus.isReady ? (
                  <CheckCircle2 size={46} />
                ) : (
                  <LoaderCircle className="loading-spin" size={46} />
                )}
                <span>{roiStatus.isReady ? "ROI 완료" : "확인 중"}</span>
              </div>
            </div>

            <div className="loading-progress-content">
              <div className="loading-progress-top">
                <span>현재 진행 상태</span>
                <strong>{progressValue}</strong>
              </div>

              <div className="loading-progress-bar">
                <span />
              </div>

              <p>{progressText}</p>
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
              현재 화면은 ROI 추출 결과를 확인하는 단계입니다. 실제 피부 분석
              결과와 맞춤 추천은 이후 분석 결과 API와 연결해 확장할 수 있습니다.
            </p>
          </Card>
        </aside>
      </section>
    </PageLayout>
  );
}

export default AnalysisLoadingPage;