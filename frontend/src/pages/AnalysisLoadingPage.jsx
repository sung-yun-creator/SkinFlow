// AnalysisLoadingPage.jsx
// 사용자가 이미지를 보낸 뒤 분석 진행 상태를 확인하는 "분석 진행 화면"입니다.
// 이 화면은 실제 분석을 새로 수행하기보다, 촬영 화면에서 전달받은 ROI/분석 응답을 사용자에게 이해하기 쉽게 보여줍니다.
// 비전공자 기준으로는 "분석 요청 후 현재 어디까지 처리됐는지 보여주는 중간 안내 페이지"라고 보면 됩니다.
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Image,
  LoaderCircle,
  RefreshCw,
  ScanFace,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";

// 촬영 화면에서 저장해 둔 최신 분석 응답을 꺼내기 위한 localStorage key입니다.
// 사용자가 새로고침하거나 location.state가 사라져도 진행 상태를 어느 정도 복원하기 위해 사용합니다.
const ANALYSIS_RESULT_KEY = "skinflow_latest_analysis_result";

// 진행 화면은 location.state가 사라진 새로고침 상황도 고려합니다.
// 촬영 화면에서 저장한 최신 분석 응답을 읽어 현재 상태 카드를 복원합니다.
function readLatestAnalysisResult() {
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_RESULT_KEY) || "null");
  } catch {
    return null;
  }
}

// ROI 결과에서 관심 영역 개수를 계산합니다.
// 응답 구조가 roi.regions, result.regions처럼 조금씩 다를 수 있어서 가능한 위치를 순서대로 확인합니다.
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

// ROI 상태는 분석 가능 여부를 설명하는 첫 번째 단계입니다.
// 얼굴 미검출이나 모델 파일 누락은 에러처럼 던지기보다 사용자가 이해할 수 있는 상태 문구로 바꿉니다.
function getRoiStatus(roiResult) {
  if (!roiResult) {
    return {
      isReady: false,
      label: "얼굴 영역 대기",
      description: "아직 얼굴 관심 영역 정보가 전달되지 않았습니다.",
    };
  }

  const status =
    roiResult.status || roiResult.roi?.status || roiResult.result?.status;

  if (!status || status === "ok") {
    return {
      isReady: true,
      label: "얼굴 영역 확인 완료",
      description: "분석에 필요한 얼굴 관심 영역을 확인했습니다.",
    };
  }

  if (status === "model_missing") {
    return {
      isReady: false,
      label: "얼굴 영역 모델 확인 필요",
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
    label: "얼굴 영역 확인 필요",
    description: "얼굴 관심 영역 확인 결과를 다시 검토해야 합니다.",
  };
}

// 분석 결과 상태는 완료와 대기를 엄격하게 나눕니다.
// saved=false, pending, AI_MODEL_PENDING은 정상 대기 상태라서 점수/이력 이동을 노출하지 않습니다.
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

  const status =
    analysisResult.analysisStatus ??
    analysisResult.analysis_status ??
    analysisResult.latestStatus ??
    analysisResult.latest_status ??
    analysisResult.status;
  const normalizedStatus = String(status || "").toLowerCase();
  const normalizedCode = String(analysisResult.code || "").toLowerCase();
  const pendingStates = ["ai_model_pending", "pending", "processing"];

  if (analysisResult.saved === true && normalizedStatus === "completed") {
    return {
      isCompleted: true,
      isPending: false,
      label: "분석 결과 저장 완료",
      description:
        "피부 분석 결과가 저장되었습니다.",
      progress: 100,
      stepStatus: "done",
    };
  }

  if (
    analysisResult.saved === false ||
    pendingStates.includes(normalizedStatus) ||
    pendingStates.includes(normalizedCode)
  ) {
    return {
      isCompleted: false,
      isPending: true,
      label: "AI 모델 연결 대기",
      description:
        analysisResult.message || "AI 모델 분석 결과가 아직 준비되지 않았습니다.",
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

// 분석 진행 페이지 컴포넌트입니다.
// 촬영 화면에서 넘어온 state와 localStorage 백업 데이터를 조합해 현재 진행 상황을 구성합니다.
function AnalysisLoadingPage() {
  // location.state는 이전 화면에서 navigate로 넘겨준 값입니다.
  // 새로고침하면 사라질 수 있으므로 아래 storedAnalysis 백업값도 함께 사용합니다.
  const location = useLocation();
  const analysisInput = location.state?.analysisInput || {};
  const storedAnalysis = useMemo(() => readLatestAnalysisResult(), []);

  // 화면에 표시할 핵심 데이터입니다.
  // method는 업로드/웹캠 입력 방식, fileName은 파일명, roiResult는 얼굴 영역 정보, analysisResult는 AI 분석 응답입니다.
  const method = analysisInput.method || "unknown";
  const fileName = analysisInput.fileName || storedAnalysis?.fileName || "";
  const roiResult = analysisInput.roiResult || storedAnalysis?.roiResult || null;
  const analysisResult = analysisInput.analysisResult || storedAnalysis?.result || null;

  // ROI 상태와 분석 상태는 화면 문구와 진행률에 반복 사용됩니다.
  // useMemo를 사용해 관련 응답이 바뀔 때만 다시 계산합니다.
  const roiStatus = useMemo(() => getRoiStatus(roiResult), [roiResult]);
  const regionCount = useMemo(() => getRegionCount(roiResult), [roiResult]);
  const analysisStatus = useMemo(
    () => getAnalysisStatus(analysisResult),
    [analysisResult],
  );

  // 내부 코드값(upload/webcam)을 사용자가 읽기 쉬운 한글 라벨로 바꿉니다.
  const methodLabel =
    method === "upload"
      ? "이미지 업로드"
      : method === "webcam"
        ? "웹캠 촬영"
        : "직접 접근";

  // 진행률은 ROI 확인 단계와 AI 분석 단계 중 더 앞선 상태를 기준으로 표시합니다.
  // 사용자가 같은 화면에서 전체 흐름이 멈췄는지, 대기 중인지 구분하게 하기 위한 값입니다.
  const progressValue = Math.max(
    roiStatus.isReady ? 45 : 20,
    analysisStatus.progress,
  );
  // 진행률 원형 카드와 상단 안내 문구에 사용할 표시값입니다.
  // 완료/대기/확인 필요 상태에 따라 버튼과 문구가 달라집니다.
  const progressText = analysisStatus.description;
  const progressCenterLabel = analysisStatus.isCompleted
    ? "완료"
    : analysisStatus.isPending
      ? "대기"
      : "확인 중";
  const overallStatusLabel = analysisStatus.isCompleted
    ? "분석 완료"
    : analysisStatus.isPending
      ? "진행 중"
      : "확인 필요";
  const resultNotice = analysisStatus.isCompleted
    ? "분석이 완료되었습니다.\n'분석 결과 보기' 버튼을 클릭해 주세요."
    : analysisStatus.isPending
      ? "AI 모델 분석 결과를 기다리고 있습니다.\n잠시 후 다시 확인해 주세요."
      : "분석 요청 상태를 확인하고 있습니다.\n필요하면 다른 이미지로 다시 분석할 수 있습니다.";

  // 오른쪽 요약 카드에 표시할 항목 목록입니다.
  // 분석 항목, 입력 방식, 파일명, ROI 상태처럼 사용자가 현재 요청을 확인할 수 있는 정보를 모읍니다.
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
      label: "얼굴 영역 확인",
      value: roiStatus.isReady ? "분석 완료" : roiStatus.label,
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

  // 진행 단계 카드에 표시할 3단계 목록입니다.
  // 각 단계의 status 값(done/active/waiting)에 따라 아이콘과 문구가 달라집니다.
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
      title: "얼굴 영역 확인",
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
      {/* 이 페이지 전용 스타일입니다.
          분석 진행 화면만의 카드, 진행률 원형, 단계 목록 스타일을 컴포넌트 안에서 관리합니다. */}
      <style>
        {`
          .sf-loading-page {
            display: grid;
            grid-template-columns: minmax(0, 0.95fr) minmax(420px, 1.05fr);
            gap: 56px;
            align-items: start;
            max-width: 1080px;
            margin: 0 auto;
            padding: 48px 0 56px;
          }

          .sf-loading-card,
          .sf-info-card {
            border: 1px solid rgba(226, 232, 240, 0.94);
            box-shadow: none !important;
          }

          .sf-loading-card {
            padding: 28px 24px 26px;
            border-radius: 26px;
            background:
              radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.07), transparent 32%),
              #ffffff;
          }

          .sf-loading-hero h1 {
            max-width: 520px;
            margin: 8px 0 24px;
            color: #0f172a;
            font-size: clamp(36px, 3.65vw, 48px);
            line-height: 1.12;
            letter-spacing: -0.07em;
          }

          .sf-loading-gradient-text {
            background: linear-gradient(90deg, #167d7f 0%, #22c5c8 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
          }

          .sf-progress-card {
            display: grid;
            grid-template-columns: 112px 1fr;
            gap: 24px;
            align-items: center;
            padding: 20px;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.94);
            background: #f8fafc;
          }

          .sf-progress-ring-wrap {
            position: relative;
            width: 104px;
            height: 104px;
            display: grid;
            place-items: center;
          }

          .sf-progress-ring {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            box-shadow: none;
          }

          .sf-progress-center {
            position: relative;
            z-index: 1;
            display: grid;
            place-items: center;
            gap: 6px;
            color: #167d7f;
            line-height: 1;
          }

          .sf-progress-center svg {
            display: block;
            width: 28px;
            height: 28px;
            margin: 0;
            stroke-width: 2.3;
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

          .sf-result-notice {
            display: grid;
            grid-template-columns: 46px 1fr;
            gap: 14px;
            align-items: center;
            margin-top: 18px;
            padding: 22px;
            min-height: 118px;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            background: linear-gradient(135deg, rgba(22, 125, 127, 0.09), rgba(34, 197, 200, 0.06));
          }

          .sf-result-notice strong {
            display: block;
            color: #0f172a;
            font-size: 17px;
            line-height: 1.55;
            letter-spacing: -0.045em;
            white-space: pre-line;
            word-break: keep-all;
          }

          .sf-loading-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 28px;
          }

          .sf-loading-side {
            display: grid;
            gap: 18px;
          }

          .sf-info-card {
            padding: 20px;
            border-radius: 26px;
            background: #ffffff;
          }

          .sf-summary-card {
            padding: 20px;
          }

          .sf-info-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 16px;
          }

          .sf-info-title-copy h2 {
            margin: 0;
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
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: none !important;
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
            min-width: 76px;
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
            gap: 12px;
          }

          .sf-summary-item {
            min-height: 74px;
            padding: 14px 16px;
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
            display: -webkit-box;
            margin-top: 6px;
            color: #0f172a;
            font-size: 14px;
            line-height: 1.35;
            word-break: break-word;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            overflow: hidden;
          }

          .sf-step-list {
            display: grid;
            gap: 12px;
          }

          .sf-step-item {
            display: grid;
            grid-template-columns: 46px 1fr auto;
            gap: 14px;
            align-items: center;
            min-height: 78px;
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

          .sf-step-done .sf-step-state,
          .sf-step-done .sf-icon-tile {
            color: #167d7f;
            background: rgba(22, 125, 127, 0.08);
          }

          .sf-step-active .sf-step-state,
          .sf-step-active .sf-icon-tile {
            color: #14b8a6;
            background: rgba(20, 184, 166, 0.08);
          }

          @media (max-width: 980px) {
            .sf-loading-page {
              grid-template-columns: 1fr;
              gap: 20px;
              padding-top: 28px;
            }
          }

          @media (max-width: 640px) {
            .sf-loading-card,
            .sf-info-card {
              padding: 20px;
              border-radius: 24px;
            }

            .sf-loading-hero h1 {
              font-size: 34px;
            }

            .sf-progress-card {
              grid-template-columns: 1fr;
              justify-items: center;
              text-align: center;
            }

            .sf-result-notice {
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

      {/* 분석 진행 화면 전체 레이아웃입니다.
          왼쪽은 진행률과 주요 안내, 오른쪽은 요청 요약과 단계별 상태를 보여줍니다. */}
      <section className="sf-loading-page">
        <Card className="sf-loading-card sf-loading-hero">
          <h1>
            피부 분석 진행 상황을
            <br />
            <span className="sf-loading-gradient-text">확인하고 있어요</span>
          </h1>

          {/* 원형 진행률 카드입니다.
              사용자가 분석이 멈춘 것이 아니라 처리 중/대기 중임을 바로 알 수 있게 합니다. */}
          <div className="sf-progress-card">
            <div className="sf-progress-ring-wrap" aria-label={`현재 진행률 ${progressValue}%`}>
              <div
                className="sf-progress-ring"
                style={{
                  background: `
                    radial-gradient(circle, #ffffff 57%, transparent 58%),
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

          <div className="sf-result-notice">
            <span className="sf-icon-tile" aria-hidden="true">
              {analysisStatus.isCompleted ? (
                <CheckCircle2 size={20} />
              ) : (
                <LoaderCircle className="sf-loading-spin" size={20} />
              )}
            </span>
            <strong>{resultNotice}</strong>
          </div>

          {/* 분석 상태에 따라 결과 보기, 새 이미지로 다시 분석하기 같은 다음 행동 버튼을 보여줍니다. */}
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
            {analysisStatus.isCompleted ? (
              <Button to="/history" variant="secondary" size="lg">
                분석 이력 확인
              </Button>
            ) : (
              <Button to="/dashboard" variant="secondary" size="lg">
                대시보드로 이동
              </Button>
            )}
          </div>
        </Card>

        <aside className="sf-loading-side">
          <Card className="sf-info-card sf-summary-card">
            <div className="sf-summary-grid">
              {/* summaryItems 배열을 반복해서 오른쪽 요약 카드의 행으로 표시합니다. */}
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
                <h2>분석 진행 단계</h2>
              </div>

              <span className="sf-status-pill">{overallStatusLabel}</span>
            </div>

            <div className="sf-step-list">
              {/* analysisSteps 배열을 반복해서 분석 단계 목록을 만듭니다. */}
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
        </aside>
      </section>
    </PageLayout>
  );
}

export default AnalysisLoadingPage;
