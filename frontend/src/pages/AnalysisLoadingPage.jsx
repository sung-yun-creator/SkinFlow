import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Image,
  LoaderCircle,
  RefreshCw,
  ScanFace,
  WandSparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";

const ANALYSIS_RESULT_KEY = "skinflow_latest_analysis_result";

function readLatestAnalysisResult() {
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_RESULT_KEY) || "null");
  } catch {
    return null;
  }
}

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

  const status =
    roiResult.status || roiResult.roi?.status || roiResult.result?.status;

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

function getAnalysisStatus(analysisResult) {
  if (!analysisResult) {
    return {
      isCompleted: false,
      isPending: false,
      label: "피부 지표 분석 대기",
      description: "색소침착·주름 분석 결과 응답이 아직 전달되지 않았습니다.",
      progress: 45,
      stepStatus: "waiting",
    };
  }

  if (analysisResult.saved) {
    return {
      isCompleted: true,
      isPending: false,
      label: "분석 결과 저장 완료",
      description: "색소침착·주름 분석 결과가 저장되었습니다. 실제 결과 화면 또는 분석 이력에서 확인할 수 있습니다.",
      progress: 100,
      stepStatus: "done",
    };
  }

  if (analysisResult.code === "AI_MODEL_PENDING" || analysisResult.status === "pending") {
    return {
      isCompleted: false,
      isPending: true,
      label: "AI 모델 연결 대기",
      description: analysisResult.message || "AI 모델 분석 결과가 아직 준비되지 않았습니다.",
      progress: 75,
      stepStatus: "active",
    };
  }

  return {
    isCompleted: false,
    isPending: false,
    label: "분석 결과 확인 필요",
    description: analysisResult.message || "분석 결과 응답 구조를 확인해야 합니다.",
    progress: 70,
    stepStatus: "active",
  };
}

function AnalysisLoadingPage() {
  const location = useLocation();
  const analysisInput = location.state?.analysisInput || {};
  const storedAnalysis = useMemo(() => readLatestAnalysisResult(), []);

  const method = analysisInput.method || "unknown";
  const fileName = analysisInput.fileName || storedAnalysis?.fileName || "";
  const roiResult = analysisInput.roiResult || storedAnalysis?.roiResult || null;
  const analysisResult = analysisInput.analysisResult || storedAnalysis?.result || null;

  const roiStatus = useMemo(() => getRoiStatus(roiResult), [roiResult]);
  const regionCount = useMemo(() => getRegionCount(roiResult), [roiResult]);
  const analysisStatus = useMemo(
    () => getAnalysisStatus(analysisResult),
    [analysisResult],
  );

  const methodLabel =
    method === "upload"
      ? "이미지 업로드"
      : method === "webcam"
        ? "웹캠 촬영"
        : "직접 접근";

  const progressValue = Math.max(
    roiStatus.isReady ? 45 : 20,
    analysisStatus.progress,
  );
  const progressText = analysisStatus.description;
  const progressCenterLabel = analysisStatus.isCompleted
    ? "완료"
    : analysisStatus.isPending
      ? "대기"
      : "확인 중";

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
    {
      label: "AI 결과 상태",
      value: analysisStatus.label,
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
      status: analysisStatus.stepStatus,
      icon: BrainCircuit,
      title: analysisStatus.label,
      description: analysisStatus.description,
    },
  ];
  return (
    <PageLayout>
      <style>
        {`
          .sf-loading-page {
            display: grid;
            grid-template-columns: minmax(0, 0.96fr) minmax(420px, 1.04fr);
            gap: 18px;
            align-items: start;
            padding: 10px 0 24px;
          }

          .sf-loading-card {
            padding: 24px;
            border-radius: 28px;
            background:
              radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.08), transparent 34%),
              #ffffff;
          }

          .sf-loading-hero h1 {
            max-width: 540px;
            margin: 16px 0 12px;
            color: #0f172a;
            font-size: clamp(34px, 3.55vw, 46px);
            line-height: 1.12;
            letter-spacing: -0.065em;
          }

          .sf-loading-gradient-text {
            background: linear-gradient(90deg, #167d7f 0%, #22c5c8 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }

          .sf-loading-hero p {
            max-width: 520px;
            margin: 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.68;
            word-break: keep-all;
          }

          .sf-progress-card {
            display: grid;
            grid-template-columns: 118px 1fr;
            gap: 22px;
            align-items: center;
            margin-top: 22px;
            padding: 22px;
            border-radius: 24px;
            border: 1px solid rgba(226, 232, 240, 0.94);
            background: #f8fafc;
          }

          .sf-progress-ring-wrap {
            position: relative;
            width: 112px;
            height: 112px;
            display: grid;
            place-items: center;
          }

          .sf-progress-ring {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.8);
          }

          .sf-progress-center {
            position: relative;
            z-index: 1;
            display: grid;
            place-items: center;
            gap: 5px;
            color: #167d7f;
            line-height: 1;
          }

          .sf-progress-center svg {
            display: block;
            width: 28px;
            height: 28px;
            margin: 0;
            stroke-width: 2.2;
          }

          .sf-progress-center span {
            color: #0f172a;
            font-size: 12px;
            font-weight: 950;
          }

          .sf-loading-spin {
            animation: sf-loading-spin 1s linear infinite;
          }

          @keyframes sf-loading-spin {
            to {
              transform: rotate(360deg);
            }
          }

          .sf-progress-content-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 10px;
          }

          .sf-progress-content-top span {
            color: #64748b;
            font-size: 13px;
            font-weight: 900;
          }

          .sf-progress-content-top strong {
            color: #167d7f;
            font-size: 26px;
            line-height: 1;
            letter-spacing: -0.055em;
          }

          .sf-progress-bar {
            height: 8px;
            overflow: hidden;
            border-radius: 999px;
            background: #e2e8f0;
          }

          .sf-progress-bar span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #167d7f, #22c5c8, #0f766e);
          }

          .sf-progress-content p {
            margin: 12px 0 0;
            color: #64748b;
            font-size: 13px;
            line-height: 1.65;
            word-break: keep-all;
          }

          .sf-loading-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
          }

          .sf-loading-side {
            display: grid;
            gap: 16px;
          }

          .sf-info-card {
            padding: 22px;
            border-radius: 26px;
            background: #ffffff;
          }

          .sf-info-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }

          .sf-info-title-copy small {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 950;
          }

          .sf-info-title-copy h2 {
            margin: 4px 0 0;
            color: #0f172a;
            font-size: 22px;
            line-height: 1.2;
            letter-spacing: -0.045em;
          }

          .sf-icon-tile {
            width: 46px;
            height: 46px;
            min-width: 46px;
            min-height: 46px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            line-height: 0;
            color: #167d7f;
            background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 50%, #ecfeff 100%);
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
          }

          .sf-icon-tile svg {
            display: block;
            width: 20px !important;
            height: 20px !important;
            min-width: 20px;
            min-height: 20px;
            margin: 0;
            flex: 0 0 auto;
            transform: none;
            stroke-width: 2.1;
          }

          .sf-status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 78px;
            padding: 8px 12px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
          }

          .sf-summary-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .sf-summary-item {
            padding: 14px;
            border-radius: 18px;
            background: #f8fafc;
            border: 1px solid rgba(226, 232, 240, 0.9);
          }

          .sf-summary-item span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
          }

          .sf-summary-item strong {
            display: block;
            margin-top: 6px;
            color: #0f172a;
            font-size: 14px;
            line-height: 1.35;
            word-break: break-word;
          }

          .sf-step-list {
            display: grid;
            gap: 10px;
          }

          .sf-step-item {
            display: grid;
            grid-template-columns: 46px 1fr auto;
            gap: 13px;
            align-items: center;
            min-height: 76px;
            padding: 12px;
            border-radius: 20px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            background: #f8fafc;
          }

          .sf-step-copy strong {
            display: block;
            color: #0f172a;
            font-size: 14px;
            letter-spacing: -0.035em;
          }

          .sf-step-copy span {
            display: block;
            margin-top: 5px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.45;
            word-break: keep-all;
          }

          .sf-step-state {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 44px;
            padding: 7px 9px;
            border-radius: 999px;
            color: #64748b;
            background: rgba(100, 116, 139, 0.1);
            font-size: 11px;
            font-weight: 950;
            white-space: nowrap;
          }

          .sf-step-done .sf-step-state {
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
          }

          .sf-step-active .sf-step-state {
            color: #14b8a6;
            background: rgba(20, 184, 166, 0.1);
          }

          .sf-notice-card {
            display: grid;
            grid-template-columns: 46px 1fr;
            gap: 13px;
            align-items: start;
            padding: 18px;
            border-radius: 22px;
            background: linear-gradient(135deg, rgba(22, 125, 127, 0.09), rgba(20, 184, 166, 0.06));
            border: 1px solid rgba(226, 232, 240, 0.9);
          }

          .sf-notice-card p {
            margin: 0;
            color: #475569;
            font-size: 13px;
            line-height: 1.65;
            word-break: keep-all;
          }

          @media (max-width: 980px) {
            .sf-loading-page {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .sf-loading-card,
            .sf-info-card {
              padding: 20px;
              border-radius: 24px;
            }

            .sf-progress-card {
              grid-template-columns: 1fr;
              justify-items: center;
              text-align: center;
            }

            .sf-summary-grid {
              grid-template-columns: 1fr;
            }

            .sf-step-item {
              grid-template-columns: 46px 1fr;
            }

            .sf-step-state {
              grid-column: 2;
              width: fit-content;
            }

            .sf-loading-actions .sf-button {
              width: 100%;
            }
          }
        `}
      </style>

      <section className="sf-loading-page">
        <Card className="sf-loading-card sf-loading-hero">
          <Badge>{analysisStatus.label}</Badge>

          <h1>
            피부 분석 요청을
            <br />
            <span className="sf-loading-gradient-text">확인하고 있어요</span>
          </h1>

          <p>
            입력된 얼굴 이미지의 ROI와 색소침착·주름 분석 결과 저장 API 응답을
            단계별로 확인합니다.
          </p>

          <div className="sf-progress-card">
            <div className="sf-progress-ring-wrap" aria-label={`현재 진행률 ${progressValue}%`}>
              <div
                className="sf-progress-ring"
                style={{
                  background: `
                    radial-gradient(circle, #ffffff 56%, transparent 57%),
                    conic-gradient(#167d7f 0 ${progressValue}%, #e2e8f0 ${progressValue}% 100%)
                  `,
                }}
              />
              <div className="sf-progress-center">
                {analysisStatus.isCompleted ? (
                  <CheckCircle2 size={28} />
                ) : (
                  <LoaderCircle className="sf-loading-spin" size={28} />
                )}
                <span>{progressCenterLabel}</span>
              </div>
            </div>

            <div className="sf-progress-content">
              <div className="sf-progress-content-top">
                <span>현재 진행 상태</span>
                <strong>{progressValue}%</strong>
              </div>

              <div className="sf-progress-bar">
                <span style={{ width: `${progressValue}%` }} />
              </div>

              <p>{progressText}</p>
            </div>
          </div>

          <div className="sf-loading-actions">
            {analysisStatus.isCompleted ? (
              <Button to="/analysis/result" size="lg">
                분석 결과 보기 <ArrowRight size={18} />
              </Button>
            ) : (
              <Button to="/analysis/capture" size="lg">
                다른 이미지로 다시 분석 <RefreshCw size={18} />
              </Button>
            )}
            <Button to="/history" variant="secondary" size="lg">
              분석 이력 확인
            </Button>
          </div>
        </Card>

        <aside className="sf-loading-side">
          <Card className="sf-info-card">
            <div className="sf-info-title-row">
              <div className="sf-info-title-copy">
                <small>Analysis Summary</small>
                <h2>분석 요청 정보</h2>
              </div>

              <span className="sf-icon-tile" aria-hidden="true">
                <WandSparkles size={20} />
              </span>
            </div>

            <div className="sf-summary-grid">
              {summaryItems.map((item) => (
                <div className="sf-summary-item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card className="sf-info-card">
            <div className="sf-info-title-row">
              <div className="sf-info-title-copy">
                <small>Process</small>
                <h2>분석 진행 단계</h2>
              </div>

              <span className="sf-status-pill">{roiStatus.label}</span>
            </div>

            <div className="sf-step-list">
              {analysisSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <div className={`sf-step-item sf-step-${step.status}`} key={step.title}>
                    <span className="sf-icon-tile" aria-hidden="true">
                      {step.status === "done" ? (
                        <CheckCircle2 size={20} />
                      ) : step.status === "active" ? (
                        <LoaderCircle className="sf-loading-spin" size={20} />
                      ) : (
                        <Icon size={20} />
                      )}
                    </span>

                    <div className="sf-step-copy">
                      <strong>{step.title}</strong>
                      <span>{step.description}</span>
                    </div>

                    <span className="sf-step-state">
                      {step.status === "done"
                        ? "완료"
                        : step.status === "active"
                          ? "진행"
                          : "대기"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="sf-notice-card">
            <span className="sf-icon-tile" aria-hidden="true">
              <Clock3 size={20} />
            </span>

            <p>
              현재 화면은 분석 요청의 실제 응답 상태를 보여줍니다. AI 모델이 아직
              점수를 반환하지 않으면 가짜 이력을 만들지 않고 연결 대기 상태로 안내합니다.
            </p>
          </div>
        </aside>
      </section>
    </PageLayout>
  );
}

export default AnalysisLoadingPage;
