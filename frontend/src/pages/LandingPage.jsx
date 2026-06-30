// 랜딩 페이지입니다.
// 로그인 전 사용자가 SkinFlow의 핵심 기능과 분석 진행 상태를 확인하는 첫 화면입니다.
// 이 파일은 화면 표시와 사용자 동작 처리를 담당하며, 백엔드/DB/AI 로직은 여기서 직접 수정하지 않습니다.
// 주석은 코드 흐름 이해를 돕기 위한 설명이며 실제 동작에는 영향을 주지 않습니다.
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  History,
  Leaf,
  LineChart,
  LoaderCircle,
  PackageCheck,
  ScanFace,
  X,
  Sparkles,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button";
  // 분석 진행 상태를 localStorage에 저장할 때 사용하는 키입니다.


const ANALYSIS_PROGRESS_KEY = "skinflow_analysis_progress";
// 다른 화면에서 분석 진행 상태가 바뀌었음을 랜딩 페이지에 알려주는 이벤트 이름입니다.
const ANALYSIS_PROGRESS_EVENT = "skinflow-analysis-progress";
 // 저장된 진행 상태가 없을 때 사용하는 기본 분석 진행 상태입니다.

const defaultProgress = {
  status: "idle",
  label: "분석 대기",
  description: "피부 분석을 시작하면 진행 상태가 표시됩니다.",
  progress: 0,
  path: "/analysis/loading",
};
 // 분석 진행 중 새로고침하거나 랜딩으로 돌아와도 진행 상태를 복원합니다.

function getStoredAnalysisProgress() {
  try {
    const storedValue = localStorage.getItem(ANALYSIS_PROGRESS_KEY);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);
    const progressNumber = Number(parsedValue?.progress);

    return {
      ...defaultProgress,
      ...parsedValue,
      progress: Number.isNaN(progressNumber)
        ? defaultProgress.progress
        : Math.max(0, Math.min(100, Math.round(progressNumber))),
    };
  } catch {
    localStorage.removeItem(ANALYSIS_PROGRESS_KEY);
    return null;
  }
}
 // 사용자에게 보여줄 만한 분석 진행 상태인지 판단합니다.

function shouldShowProgress(progress) {
  if (!progress || progress.status === "idle") return false;

  return [
    "roi_pending",
    "roi_processing",
    "roi_complete",
    "model_missing",
    "analysis_waiting",
    "failed",
  ].includes(progress.status);
}
 // 분석 진행 상태에 따라 배지 색상과 분위기를 정합니다.

function getProgressTone(status) {
  if (status === "failed" || status === "model_missing") {
    return "warning";
  }

  if (status === "roi_complete") {
    return "ready";
  }

  return "active";
}
// 닫기 버튼을 눌렀을 때 저장된 분석 진행 상태를 삭제합니다.
function clearStoredAnalysisProgress() {
  localStorage.removeItem(ANALYSIS_PROGRESS_KEY);
  window.dispatchEvent(new Event(ANALYSIS_PROGRESS_EVENT));
}
  // 랜딩 페이지에서 SkinFlow의 핵심 가치를 카드로 보여주기 위한 데이터입니다.


const valueCards = [
  {
    icon: ScanFace,
    title: "색소침착·주름 분석",
    description: "얼굴 이미지 기반으로 핵심 피부 지표를 한 화면에서 확인합니다.",
  },
  {
    icon: FlaskConical,
    title: "성분 추천",
    description: "분석 결과와 연결된 기능성 성분을 관리 참고 정보로 정리합니다.",
  },
  {
    icon: PackageCheck,
    title: "제품 추천",
    description: "추천 성분과 연결되는 화장품 제품 정보를 카드 형태로 확인합니다.",
  },
  {
    icon: Leaf,
    title: "식습관 가이드",
    description: "피부 관리 방향에 맞춘 생활 가이드를 실천 항목으로 제공합니다.",
  },
  {
    icon: History,
    title: "분석 이력 관리",
    description: "이전 결과와 관리 흐름을 한 화면에서 다시 확인합니다.",
  },
];
 // 사용자가 분석 시작부터 추천 확인까지 어떤 순서로 이용하는지 설명하는 단계 목록입니다.

const processSteps = [
  { icon: Upload, title: "사진 업로드" },
  { icon: ScanFace, title: "얼굴 영역 확인" },
  { icon: Sparkles, title: "AI 분석" },
  { icon: ClipboardList, title: "리포트" },
  { icon: LineChart, title: "추천·이력" },
];
 // 랜딩 화면 전체를 담당하는 React 컴포넌트입니다.

function LandingPage() {
  const isLoggedIn = Boolean(localStorage.getItem("skinflow_token"));
  // 진행 중인 분석 상태를 localStorage에서 읽어와 랜딩 화면에서도 이어서 안내합니다.
  const [analysisProgress, setAnalysisProgress] = useState(() =>
    getStoredAnalysisProgress()
  );

  // 다른 화면에서 분석 진행 이벤트가 발생하면 랜딩 화면의 진행 상태도 같이 갱신합니다.
  useEffect(() => {
    // localStorage의 분석 진행 상태를 다시 읽어 현재 화면 상태와 맞춥니다.
    const syncProgress = () => {
      setAnalysisProgress(getStoredAnalysisProgress());
    };

    syncProgress();

    window.addEventListener("storage", syncProgress);
    window.addEventListener(ANALYSIS_PROGRESS_EVENT, syncProgress);

    return () => {
      window.removeEventListener("storage", syncProgress);
      window.removeEventListener(ANALYSIS_PROGRESS_EVENT, syncProgress);
    };
  }, []);
   // 랜딩 화면에 분석 진행 카드가 필요한지 판단합니다.

  const shouldRenderAnalysisStatus = useMemo(
    () => isLoggedIn && shouldShowProgress(analysisProgress),
    [analysisProgress, isLoggedIn]
  );

  const progressTone = getProgressTone(analysisProgress?.status);
  const progressPath = analysisProgress?.path || "/analysis/loading";
   // 사용자가 진행 상태 카드를 닫으면 저장된 진행 정보를 지웁니다.

  const handleDismissProgress = () => {
    clearStoredAnalysisProgress();
  };

  const primaryCtaTo = isLoggedIn ? "/analysis/capture" : "/signup";
  const secondaryCtaTo = isLoggedIn ? "/dashboard" : "/login";
  const primaryCtaText = isLoggedIn ? "피부 분석 시작하기" : "무료 피부 분석 시작";
  const secondaryCtaText = isLoggedIn ? "내 대시보드 보기" : "로그인하기";

  // 아래 JSX는 서비스 소개, 분석 진행 상태 카드, 기능 소개, 사용 흐름 안내를 화면에 그립니다.
  return (
    <div className="sf-landing-compact">
      <style>
        {`
          .sf-landing-compact {
            min-height: 100vh;
            color: #0f172a;
            background:
              radial-gradient(circle at 5% 18%, rgba(22, 125, 127, 0.11), transparent 28%),
              radial-gradient(circle at 94% 86%, rgba(20, 184, 166, 0.10), transparent 25%),
              linear-gradient(180deg, #f8fafc 0%, #ffffff 48%, #f8fafc 100%);
          }

          .sf-landing-nav {
            position: sticky;
            top: 0;
            z-index: 30;
            border-bottom: 1px solid rgba(226, 232, 240, 0.85);
            background: rgba(248, 250, 252, 0.88);
            backdrop-filter: blur(18px);
          }

          .sf-landing-nav-inner {
            max-width: 1120px;
            height: 68px;
            margin: 0 auto;
            padding: 0 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
          }

          .sf-landing-brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: #0f172a;
            font-weight: 950;
            letter-spacing: -0.045em;
          }

          .sf-landing-logo {
            width: 34px;
            height: 34px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(135deg, #167d7f, #22c5c8);
            box-shadow: 0 12px 26px rgba(22, 125, 127, 0.24);
          }

          .sf-landing-links {
            display: flex;
            align-items: center;
            gap: 26px;
            color: #64748b;
            font-size: 14px;
            font-weight: 850;
          }

          .sf-landing-links a:hover {
            color: #167d7f;
          }

          .sf-landing-auth-actions {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
          }

          .sf-landing-auth-actions .sf-button {
            white-space: nowrap;
          }

          .sf-landing-page {
            max-width: 1120px;
            margin: 0 auto;
            padding: 0 24px 44px;
          }

          .sf-landing-hero {
            min-height: calc(100vh - 68px);
            display: grid;
            grid-template-columns: minmax(420px, 0.95fr) minmax(380px, 520px);
            gap: 54px;
            align-items: center;
            padding: 54px 0 44px;
          }

          .sf-landing-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            width: fit-content;
            padding: 8px 13px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.10);
            font-size: 13px;
            font-weight: 950;
          }

          .sf-landing-copy h1 {
            max-width: 560px;
            margin: 22px 0 20px;
            color: #0f172a;
            font-size: clamp(44px, 4.7vw, 68px);
            line-height: 1.05;
            letter-spacing: -0.075em;
            word-break: keep-all;
          }

          .sf-gradient-text {
            display: inline-block;
            background: linear-gradient(90deg, #167d7f 0%, #22c5c8 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .sf-landing-copy p {
            max-width: 540px;
            margin: 0;
            color: #64748b;
            font-size: 17px;
            line-height: 1.85;
            word-break: keep-all;
          }

          .sf-landing-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 32px;
          }

          .sf-landing-feature-strip {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            max-width: 560px;
            margin-top: 22px;
          }

          .sf-landing-feature-strip span {
            display: inline-flex;
            align-items: center;
            min-height: 34px;
            padding: 0 12px;
            border-radius: 999px;
            color: #0f172a;
            background: rgba(255, 255, 255, 0.76);
            border: 1px solid rgba(226, 232, 240, 0.92);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045);
            font-size: 12px;
            font-weight: 900;
            white-space: nowrap;
          }

          .sf-landing-stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 22px;
            max-width: 540px;
            margin-top: 36px;
            padding-top: 26px;
            border-top: 1px solid rgba(226, 232, 240, 0.95);
          }

          .sf-landing-stats strong {
            display: block;
            color: #0f172a;
            font-size: 28px;
            letter-spacing: -0.055em;
          }

          .sf-landing-stats span {
            display: block;
            margin-top: 5px;
            color: #64748b;
            font-size: 13px;
            font-weight: 850;
          }

          .sf-report-card {
            width: 100%;
            position: relative;
            overflow: hidden;
            padding: 24px;
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 30px;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12);
          }

          .sf-report-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 18px;
          }

          .sf-report-top small {
            display: block;
            color: #64748b;
            font-weight: 850;
            word-break: keep-all;
          }

          .sf-report-top h2 {
            margin: 6px 0 0;
            color: #0f172a;
            font-size: 20px;
            letter-spacing: -0.045em;
          }

          .sf-report-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.10);
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
          }

          .sf-skin-canvas {
            position: relative;
            height: 286px;
            overflow: hidden;
            border-radius: 24px;
            background:
              radial-gradient(circle at 72% 18%, rgba(66, 211, 188, 0.76) 0 32%, transparent 33%),
              radial-gradient(circle at 24% 48%, rgba(255, 224, 206, 0.94), transparent 46%),
              linear-gradient(135deg, #ecfeff 0%, #f8fafc 52%, #ecfeff 100%);
          }

          .sf-skin-canvas::before,
          .sf-skin-canvas::after {
            content: "";
            position: absolute;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.58);
            box-shadow: inset -4px -6px 12px rgba(15, 23, 42, 0.06);
          }

          .sf-skin-canvas::before {
            width: 36px;
            height: 24px;
            left: 34%;
            top: 35%;
            transform: rotate(-18deg);
          }

          .sf-skin-canvas::after {
            width: 28px;
            height: 20px;
            right: 30%;
            bottom: 24%;
            transform: rotate(20deg);
          }

          .sf-roi-box {
            position: absolute;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            border: 2px solid #167d7f;
            background: rgba(255, 255, 255, 0.18);
          }

          .sf-roi-label {
            position: absolute;
            top: -26px;
            left: 50%;
            transform: translateX(-50%);
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.9);
            color: #167d7f;
            font-size: 11px;
            font-weight: 950;
            white-space: nowrap;
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
          }

          .sf-roi-forehead {
            width: 68px;
            height: 54px;
            left: 26%;
            top: 23%;
          }

          .sf-roi-cheek {
            width: 58px;
            height: 42px;
            left: 43%;
            bottom: 17%;
          }

          .sf-roi-wrinkle {
            width: 58px;
            height: 42px;
            right: 12%;
            top: 43%;
            border-color: #f59e0b;
          }

          .sf-roi-wrinkle .sf-roi-label {
            color: #f59e0b;
          }

          .sf-report-metrics {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-top: 14px;
          }

          .sf-roi-note {
            margin-top: 10px;
            color: #64748b;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.5;
            word-break: keep-all;
          }

          .sf-report-metric {
            padding: 15px;
            border-radius: 18px;
            border: 1px solid rgba(226, 232, 240, 0.92);
            background: #f8fafc;
          }

          .sf-report-metric span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
            word-break: keep-all;
          }

          .sf-report-metric strong {
            display: block;
            margin-top: 6px;
            color: #0f172a;
            font-size: 23px;
            letter-spacing: -0.05em;
            word-break: keep-all;
            overflow-wrap: normal;
          }

          .sf-report-comment {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-top: 14px;
            padding: 15px;
            border-radius: 18px;
            background: rgba(22, 125, 127, 0.10);
            color: #0f172a;
            font-size: 14px;
            font-weight: 750;
            line-height: 1.62;
            word-break: keep-all;
          }

          .sf-report-comment-icon {
            width: 32px;
            height: 32px;
            flex: 0 0 auto;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: #167d7f;
          }

          .sf-section {
            padding: 54px 0;
          }

          .sf-section-head {
            max-width: 760px;
            margin: 0 auto 30px;
            text-align: center;
          }

          .sf-section-head small {
            color: #167d7f;
            font-size: 13px;
            font-weight: 950;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .sf-section-head h2 {
            margin: 10px 0 12px;
            color: #0f172a;
            font-size: clamp(30px, 3.6vw, 44px);
            line-height: 1.13;
            letter-spacing: -0.062em;
            word-break: keep-all;
          }

          .sf-section-head p {
            margin: 0;
            color: #64748b;
            font-size: 16px;
            line-height: 1.72;
            word-break: keep-all;
          }

          .sf-value-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 18px;
          }

          .sf-value-card {
            min-height: 168px;
            padding: 24px;
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.94);
            box-shadow: 0 18px 45px rgba(15, 23, 42, 0.07);
          }

          .sf-value-icon {
            width: 50px;
            height: 50px;
            border-radius: 17px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(135deg, #167d7f, #22c5c8);
          }

          .sf-value-card h3 {
            margin: 20px 0 9px;
            color: #0f172a;
            font-size: 21px;
            letter-spacing: -0.045em;
          }

          .sf-value-card p {
            margin: 0;
            color: #64748b;
            line-height: 1.68;
            word-break: keep-all;
          }

          .sf-process-line {
            position: relative;
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 18px;
          }

          .sf-process-line::before {
            content: "";
            position: absolute;
            top: 32px;
            left: 8%;
            right: 8%;
            height: 1px;
            background: rgba(22, 125, 127, 0.25);
          }

          .sf-process-step {
            position: relative;
            z-index: 1;
            text-align: center;
          }

          .sf-process-icon {
            position: relative;
            width: 64px;
            height: 64px;
            margin: 0 auto 14px;
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #167d7f;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
          }

          .sf-process-index {
            position: absolute;
            right: -7px;
            top: -8px;
            width: 24px;
            height: 24px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: #0f172a;
            font-size: 12px;
            font-weight: 950;
          }

          .sf-process-step h3 {
            margin: 0;
            color: #0f172a;
            font-size: 16px;
            letter-spacing: -0.04em;
          }


          .landing-analysis-status {
            border-top: 1px solid rgba(226, 232, 240, 0.72);
            background:
              radial-gradient(circle at 12% 0%, rgba(22, 125, 127, 0.08), transparent 28%),
              rgba(248, 250, 252, 0.96);
            backdrop-filter: blur(16px);
          }

          .landing-analysis-status-inner {
            max-width: 1120px;
            margin: 0 auto;
            padding: 10px 24px 12px;
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr) auto 34px;
            align-items: center;
            gap: 12px;
          }

          .landing-analysis-icon {
            width: 42px;
            height: 42px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            line-height: 0;
            color: #167d7f;
            background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 52%, #ecfeff 100%);
            border: 1px solid rgba(226, 232, 240, 0.92);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
          }

          .landing-analysis-icon svg {
            display: block;
            width: 20px;
            height: 20px;
            margin: 0;
            stroke-width: 2.2;
          }

          .landing-analysis-status[data-tone="active"] .landing-analysis-icon svg {
            animation: landingAnalysisPulse 1.4s ease-in-out infinite;
          }

          .landing-analysis-status[data-tone="warning"] .landing-analysis-icon {
            color: #14b8a6;
          }

          .landing-analysis-content {
            min-width: 0;
          }

          .landing-analysis-topline {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 6px;
          }

          .landing-analysis-title {
            min-width: 0;
            color: #0f172a;
            font-size: 13px;
            font-weight: 950;
            letter-spacing: -0.025em;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .landing-analysis-percent {
            flex: 0 0 auto;
            color: #167d7f;
            font-size: 13px;
            font-weight: 950;
          }

          .landing-analysis-status[data-tone="warning"] .landing-analysis-percent {
            color: #14b8a6;
          }

          .landing-analysis-track {
            height: 6px;
            overflow: hidden;
            border-radius: 999px;
            background: #e2e8f0;
          }

          .landing-analysis-track span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #167d7f, #22c5c8, #0f766e);
            transition: width 0.25s ease;
          }

          .landing-analysis-description {
            margin-top: 5px;
            overflow: hidden;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .landing-analysis-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-height: 36px;
            padding: 0 14px;
            border-radius: 999px;
            color: #0f172a;
            background: #ffffff;
            border: 1px solid rgba(226, 232, 240, 0.95);
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
          }

          .landing-analysis-action:hover {
            color: #167d7f;
            border-color: rgba(22, 125, 127, 0.2);
          }

          @keyframes landingAnalysisPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.72;
            }
            50% {
              transform: scale(1.08);
              opacity: 1;
            }
          }

          .sf-final-cta {
            margin-top: 24px;
            padding: 42px 28px;
            border-radius: 32px;
            text-align: center;
            color: #ffffff;
            background:
              radial-gradient(circle at 18% 34%, rgba(255, 255, 255, 0.16), transparent 30%),
              linear-gradient(135deg, #167d7f 0%, #0f766e 60%, #22c5c8 135%);
            box-shadow: 0 28px 72px rgba(15, 23, 42, 0.16);
          }

          .sf-final-cta h2 {
            margin: 0 0 14px;
            font-size: clamp(28px, 3.7vw, 46px);
            line-height: 1.12;
            letter-spacing: -0.062em;
            word-break: keep-all;
          }

          .sf-final-cta p {
            margin: 0 auto 24px;
            max-width: 620px;
            color: rgba(255, 255, 255, 0.83);
            line-height: 1.72;
            font-weight: 700;
            word-break: keep-all;
          }

          .sf-final-cta .sf-button {
            color: #0f172a;
            background: #ffffff;
            box-shadow: 0 18px 38px rgba(15, 23, 42, 0.16);
          }



          .landing-analysis-dismiss {
            width: 34px;
            height: 34px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            line-height: 0;
            color: #64748b;
            background: rgba(255, 255, 255, 0.76);
            border: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
            cursor: pointer;
            transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;
          }

          .landing-analysis-dismiss:hover {
            color: #14b8a6;
            background: #ffffff;
            border-color: rgba(20, 184, 166, 0.24);
          }

          .landing-analysis-dismiss svg {
            display: block;
            width: 15px;
            height: 15px;
            margin: 0;
            stroke-width: 2.4;
          }

          @media (max-width: 980px) {
            .sf-landing-links {
              display: none;
            }

            .sf-landing-hero {
              min-height: auto;
              grid-template-columns: 1fr;
              gap: 36px;
              padding: 44px 0 34px;
            }

            .sf-report-card {
              max-width: 560px;
              margin: 0 auto;
            }

            .sf-value-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .sf-process-line {
              grid-template-columns: repeat(5, minmax(120px, 1fr));
              overflow-x: auto;
              padding: 4px 0 14px;
            }
          }

          @media (max-width: 760px) {
            .landing-analysis-status-inner {
              grid-template-columns: 38px minmax(0, 1fr) 34px;
              padding: 9px 16px 11px;
            }

            .landing-analysis-icon {
              width: 38px;
              height: 38px;
              border-radius: 14px;
            }

            .landing-analysis-action {
              grid-column: 2;
              width: fit-content;
              min-height: 32px;
              padding: 0 12px;
            }

            .landing-analysis-dismiss {
              grid-column: 3;
              grid-row: 1 / 3;
              align-self: center;
            }
          }

          @media (max-width: 640px) {
            .sf-landing-nav-inner {
              height: 62px;
              padding: 0 16px;
            }

            .sf-landing-page {
              padding: 0 16px 34px;
            }

            .sf-landing-copy h1 {
              font-size: 40px;
            }

            .sf-landing-copy p {
              font-size: 16px;
            }

            .sf-landing-actions .sf-button {
              width: 100%;
            }

            .sf-landing-feature-strip span {
              flex: 1 1 calc(50% - 8px);
              justify-content: center;
            }

            .sf-landing-auth-actions {
              gap: 6px;
            }

            .sf-landing-auth-actions .sf-button {
              padding-inline: 12px;
            }

            .sf-landing-stats {
              grid-template-columns: 1fr;
              gap: 14px;
            }

            .sf-report-card {
              padding: 18px;
              border-radius: 24px;
            }

            .sf-skin-canvas {
              height: 242px;
            }

            .sf-report-metrics {
              grid-template-columns: 1fr;
            }

            .sf-value-grid {
              grid-template-columns: 1fr;
            }

            .sf-section {
              padding: 42px 0;
            }
          }


          /* 2026-06-25: Landing hero aligned with logged-in home dashboard style */
          .sf-landing-page {
            max-width: none;
            padding: 0 24px 44px;
          }

          .sf-landing-hero {
            position: relative;
            min-height: calc(100vh - 68px);
            display: grid;
            grid-template-columns: minmax(430px, 0.98fr) minmax(400px, 0.82fr);
            gap: clamp(38px, 5.4vw, 74px);
            align-items: center;
            width: min(100%, 1160px);
            margin: 0 auto;
            padding: clamp(34px, 5vw, 72px) 0 clamp(32px, 5vw, 64px);
            overflow: visible;
          }

          .sf-landing-hero::before {
            content: "";
            position: absolute;
            left: max(-220px, -16vw);
            top: 8%;
            width: min(520px, 46vw);
            height: min(520px, 46vw);
            border-radius: 999px;
            background: radial-gradient(circle, rgba(22, 125, 127, 0.14), transparent 64%);
            filter: blur(8px);
            pointer-events: none;
          }

          .sf-landing-hero::after {
            content: "";
            position: absolute;
            right: max(-240px, -18vw);
            bottom: -12%;
            width: min(620px, 50vw);
            height: min(620px, 50vw);
            border-radius: 999px;
            background: radial-gradient(circle, rgba(34, 197, 200, 0.12), transparent 64%);
            filter: blur(12px);
            pointer-events: none;
          }

          .sf-landing-copy,
          .sf-report-card {
            position: relative;
            z-index: 1;
          }

          .sf-landing-kicker {
            min-height: 34px;
            padding: 0 14px;
            border: 1px solid rgba(22, 125, 127, 0.14);
            font-size: 13px;
            letter-spacing: -0.02em;
          }

          .sf-landing-copy h1 {
            max-width: 620px;
            margin: 22px 0 22px;
            color: #0f172a;
            font-size: clamp(44px, 5.4vw, 72px);
            line-height: 1.04;
            letter-spacing: -0.078em;
            word-break: keep-all;
            text-wrap: balance;
          }

          .sf-gradient-text {
            display: inline-block;
            color: #159b9d;
            background: none;
            -webkit-background-clip: initial;
            background-clip: initial;
            letter-spacing: -0.085em;
          }

          .sf-landing-copy p {
            max-width: 620px;
            color: #64748b;
            font-size: 17px;
            line-height: 1.82;
            letter-spacing: -0.02em;
          }

          .sf-landing-actions {
            gap: 12px;
            margin-top: 34px;
          }

          .sf-landing-actions .sf-button {
            min-height: 56px;
            padding-inline: 24px;
            border-radius: 999px;
          }

          .sf-landing-actions .sf-button:first-child {
            border: 1px solid rgba(22, 125, 127, 0.24);
            box-shadow: 0 20px 46px rgba(22, 125, 127, 0.23);
          }

          .sf-landing-actions .sf-button:nth-child(2) {
            color: #0f172a;
            background: #e2e8f0;
            border: 1px solid rgba(226, 232, 240, 0.98);
            box-shadow: none;
          }

          .sf-landing-feature-strip {
            gap: 10px;
            max-width: 610px;
            margin-top: 24px;
          }

          .sf-landing-feature-strip span {
            min-height: 32px;
            padding: 0 13px;
          }

          .sf-landing-stats {
            display: none;
          }

          .sf-report-card {
            width: min(100%, 492px);
            padding: 26px;
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid rgba(226, 232, 240, 0.94);
            box-shadow: 0 34px 86px rgba(15, 23, 42, 0.12);
          }

          .sf-report-top {
            align-items: flex-start;
            margin-bottom: 26px;
          }

          .sf-report-top small {
            display: none;
          }

          .sf-report-top h2 {
            margin: 0;
            font-size: 24px;
            line-height: 1.2;
            letter-spacing: -0.055em;
          }

          .sf-report-status {
            display: block;
            padding: 0;
            color: #0f172a;
            background: transparent;
            font-size: 13px;
            font-weight: 950;
            line-height: 1.35;
            text-align: right;
            white-space: nowrap;
          }

          .sf-skin-canvas {
            min-height: 230px;
            height: 230px;
            border-radius: 18px;
            overflow: hidden;
            background:
              radial-gradient(circle at 3% 82%, rgba(255, 237, 213, 0.86), transparent 42%),
              radial-gradient(circle at 95% 8%, rgba(45, 212, 191, 0.62), transparent 38%),
              linear-gradient(135deg, #f8fafc 0%, #ecfeff 100%);
          }

          .sf-skin-canvas::before,
          .sf-skin-canvas::after {
            display: none;
          }

          .sf-preview-blob {
            position: absolute;
            right: -8px;
            top: -62px;
            width: 248px;
            height: 248px;
            border-radius: 50%;
            background: linear-gradient(135deg, #5eead4 0%, #2dd4bf 100%);
            box-shadow: inset 0 -24px 50px rgba(15, 23, 42, 0.06);
            opacity: 0.92;
          }

          .sf-roi-box {
            position: absolute;
            display: grid;
            place-items: center;
            min-width: 64px;
            width: 64px;
            height: 48px;
            border: 2px solid #167d7f;
            border-radius: 13px;
            background: rgba(255, 255, 255, 0.46);
          }

          .sf-roi-label {
            top: -24px;
            padding: 4px 10px;
            color: #167d7f;
            font-size: 11px;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.07);
          }

          .sf-roi-forehead {
            left: 126px;
            top: 66px;
          }

          .sf-roi-cheek {
            left: 104px;
            bottom: 40px;
          }

          .sf-roi-wrinkle {
            right: 52px;
            top: auto;
            bottom: 72px;
            border-color: #f59e0b;
          }

          .sf-roi-note {
            margin: 12px 0 16px;
            color: #475569;
            font-size: 12px;
            font-weight: 850;
            line-height: 1.55;
          }

          .sf-report-metrics {
            display: grid;
            grid-template-columns: minmax(120px, 0.8fr) minmax(0, 1fr);
            gap: 12px;
            margin-top: 0;
          }

          .sf-report-total-metric,
          .sf-report-side-metrics > div {
            border: 1px solid rgba(226, 232, 240, 0.96);
            background: #ffffff;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.045);
          }

          .sf-report-total-metric {
            min-height: 136px;
            display: grid;
            place-items: center;
            padding: 15px;
            border-radius: 22px;
            text-align: center;
          }

          .sf-report-total-metric strong {
            display: block;
            color: #0f172a;
            font-size: clamp(24px, 2.6vw, 36px);
            line-height: 1.08;
            letter-spacing: -0.065em;
            word-break: keep-all;
          }

          .sf-report-total-metric span,
          .sf-report-side-metrics span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 950;
          }

          .sf-report-total-metric span {
            margin-top: 9px;
          }

          .sf-report-total-metric em,
          .sf-report-side-metrics em {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 26px;
            margin-top: 9px;
            padding: 0 11px;
            border-radius: 999px;
            color: #64748b;
            background: #f1f5f9;
            font-size: 12px;
            font-style: normal;
            font-weight: 950;
            white-space: nowrap;
          }

          .sf-report-side-metrics {
            display: grid;
            gap: 10px;
          }

          .sf-report-side-metrics > div {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 12px;
            min-height: 62px;
            padding: 13px 16px;
            border-radius: 18px;
          }

          .sf-report-side-metrics strong {
            display: block;
            margin-top: 4px;
            color: #0f172a;
            font-size: 18px;
            letter-spacing: -0.04em;
            word-break: keep-all;
          }

          .sf-report-side-metrics em {
            margin-top: 0;
          }

          .sf-report-comment {
            display: grid;
            grid-template-columns: 42px 1fr;
            gap: 13px;
            align-items: center;
            margin-top: 16px;
            padding: 14px 16px;
            border-radius: 18px;
            font-size: 14px;
            font-weight: 850;
            line-height: 1.55;
          }

          .sf-report-comment-icon {
            width: 38px;
            height: 38px;
            border-radius: 14px;
            box-shadow: 0 14px 26px rgba(22, 125, 127, 0.22);
          }

          @media (max-width: 1080px) {
            .sf-landing-hero {
              grid-template-columns: 1fr;
              gap: 36px;
              min-height: auto;
              padding-top: 42px;
            }

            .sf-report-card {
              margin: 0;
            }
          }

          @media (max-width: 640px) {
            .sf-landing-page {
              padding: 0 16px 34px;
            }

            .sf-landing-hero {
              padding: 24px 0 32px;
            }

            .sf-landing-copy h1 {
              font-size: 40px;
              letter-spacing: -0.065em;
            }

            .sf-report-top {
              flex-direction: column;
            }

            .sf-report-status {
              text-align: left;
            }

            .sf-skin-canvas {
              min-height: 220px;
              height: 220px;
            }

            .sf-preview-blob {
              right: -38px;
              top: -58px;
              width: 230px;
              height: 230px;
            }

            .sf-roi-forehead {
              left: 74px;
            }

            .sf-roi-cheek {
              left: 88px;
            }

            .sf-roi-wrinkle {
              right: 28px;
            }

            .sf-report-metrics {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <header className="sf-landing-nav">
        <div className="sf-landing-nav-inner">
          <Link className="sf-landing-brand" to={isLoggedIn ? "/dashboard" : "/"}>
            <span className="sf-landing-logo">
              <Sparkles size={18} />
            </span>
            <span>SkinFlow</span>
          </Link>

          <nav className="sf-landing-links" aria-label="랜딩 주요 메뉴">
            <a href="#service">서비스 소개</a>
            <a href="#process">분석 흐름</a>
            <a href="#recommend">추천 흐름</a>
            <a href="#guide">이용 안내</a>
          </nav>

          <div className="sf-landing-auth-actions">
            {isLoggedIn ? (
              <>
                <Button to="/dashboard" variant="ghost" size="sm">
                  내 대시보드
                </Button>
                <Button to="/analysis/capture" size="sm">
                  분석 시작
                </Button>
              </>
            ) : (
              <>
                <Button to="/login" variant="ghost" size="sm">
                  로그인
                </Button>
                <Button to="/signup" size="sm">
                  회원가입
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {shouldRenderAnalysisStatus && (
        <div className="landing-analysis-status" data-tone={progressTone}>
          <div className="landing-analysis-status-inner">
            <span className="landing-analysis-icon" aria-hidden="true">
              {progressTone === "ready" ? (
                <CheckCircle2 size={20} />
              ) : progressTone === "warning" ? (
                <Activity size={20} />
              ) : (
                <LoaderCircle size={20} />
              )}
            </span>

            <div className="landing-analysis-content">
              <div className="landing-analysis-topline">
                <strong className="landing-analysis-title">
                  {analysisProgress?.label || defaultProgress.label}
                </strong>
                <strong className="landing-analysis-percent">
                  {analysisProgress?.progress ?? 0}%
                </strong>
              </div>

              <div className="landing-analysis-track" aria-hidden="true">
                <span style={{ width: `${analysisProgress?.progress ?? 0}%` }} />
              </div>

              <div className="landing-analysis-description">
                {analysisProgress?.description || defaultProgress.description}
              </div>
            </div>

            <Link className="landing-analysis-action" to={progressPath}>
              진행상황 보기 <ArrowRight size={14} />
            </Link>

            <button
              className="landing-analysis-dismiss"
              type="button"
              aria-label="분석 진행 상태 숨기기"
              onClick={handleDismissProgress}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <main className="sf-landing-page">
        <section className="sf-landing-hero" id="service">
          <div className="sf-landing-copy">
            <span className="sf-landing-kicker">
              <Sparkles size={15} />
              AI 피부 분석 & 맞춤 관리 플랫폼
            </span>

            <h1>
              사진 한 장으로
              <br />
              시작하는 나만의
              <br />
              AI 피부 관리,
              <br />
              <span className="sf-gradient-text">SkinFlow</span>
            </h1>

            <p>
              얼굴 사진 한 장으로 색소침착과 주름을 분석하고, 기능성 추천 성분·화장품 추천 제품·식습관 가이드까지 제공합니다.
            </p>

            <div className="sf-landing-actions">
              <Button to={primaryCtaTo} size="lg">
                {primaryCtaText} <ArrowRight size={18} />
              </Button>
              <Button to={secondaryCtaTo} variant="secondary" size="lg">
                {secondaryCtaText}
              </Button>
            </div>

            <div className="sf-landing-feature-strip" aria-label="SkinFlow 핵심 기능">
              <span>색소침착 분석</span>
              <span>주름 분석</span>
              <span>기능성 추천 성분</span>
              <span>화장품 추천 제품</span>
              <span>식습관 가이드</span>
              <span>분석 이력 관리</span>
            </div>

            <div className="sf-landing-stats">
              <div>
                <strong>2개</strong>
                <span>MVP 핵심 분석 지표</span>
              </div>
              <div>
                <strong>3단계</strong>
                <span>분석 → 추천 → 관리</span>
              </div>
              <div>
                <strong>1곳</strong>
                <span>통합 피부 관리 흐름</span>
              </div>
            </div>
          </div>

          <aside className="sf-report-card" aria-label="AI 피부 분석 리포트 미리보기">
            <div className="sf-report-top">
              <div>
                <small>SkinFlow · 분석 리포트</small>
                <h2>AI 피부 분석 리포트</h2>
              </div>
              <span className="sf-report-status">
                미리보기
                <br />
                분석 완료 후 표시
              </span>
            </div>

            <div className="sf-skin-canvas">
              <span className="sf-preview-blob" aria-hidden="true" />
              <span className="sf-roi-box sf-roi-forehead">
                <span className="sf-roi-label">T-zone</span>
              </span>
              <span className="sf-roi-box sf-roi-cheek">
                <span className="sf-roi-label">색소</span>
              </span>
              <span className="sf-roi-box sf-roi-wrinkle">
                <span className="sf-roi-label">주름</span>
              </span>
            </div>
            <p className="sf-roi-note">
              미리보기의 ROI 표시는 화면 이해를 돕기 위한 안내용 요소이며 실제 검출 위치가 아닙니다.
            </p>

            <div className="sf-report-metrics">
              <div className="sf-report-total-metric">
                <strong>분석 후 표시</strong>
                <span>종합 피부 점수</span>
                <em>저장 결과 기반</em>
              </div>

              <div className="sf-report-side-metrics">
                <div>
                  <span>색소침착</span>
                  <strong>분석 후 표시</strong>
                  <em>저장 결과 기반</em>
                </div>
                <div>
                  <span>주름</span>
                  <strong>분석 후 표시</strong>
                  <em>저장 결과 기반</em>
                </div>
              </div>
            </div>

            <div className="sf-report-comment">
              <span className="sf-report-comment-icon">
                <Sparkles size={17} />
              </span>
              <span>
                안내용 미리보기이며 실제 점수와 추천은 분석 완료 후 사용자의 이력과 함께 연결됩니다.
              </span>
            </div>
          </aside>
        </section>

        <section className="sf-section" id="recommend">
          <div className="sf-section-head">
            <small>추천 미리보기</small>
            <h2>분석 후 추천까지 한 흐름으로 확인합니다</h2>
            <p>
              색소침착과 주름 분석 결과를 바탕으로 성분, 제품, 이력 관리 흐름을
              짧고 명확하게 연결합니다.
            </p>
          </div>

          <div className="sf-value-grid">
            {valueCards.map((item) => {
              const Icon = item.icon;

              return (
                <article className="sf-value-card" key={item.title}>
                  <span className="sf-value-icon">
                    <Icon size={24} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="sf-section" id="process">
          <div className="sf-section-head">
            <small>분석 흐름</small>
            <h2>피부 분석은 5단계로 진행됩니다</h2>
          </div>

          <div className="sf-process-line">
            {processSteps.map((item, index) => {
              const Icon = item.icon;

              return (
                <article className="sf-process-step" key={item.title}>
                  <div className="sf-process-icon">
                    <Icon size={23} />
                    <span className="sf-process-index">{index + 1}</span>
                  </div>
                  <h3>{item.title}</h3>
                </article>
              );
            })}
          </div>
        </section>

        <section className="sf-section" id="guide">
          <div className="sf-final-cta">
            <h2>지금 바로 피부 상태를 확인해보세요</h2>
            <p>
              첫 분석을 진행하면 색소침착과 주름 중심의 결과, 맞춤 추천,
              식습관 가이드, 분석 이력 흐름을 이어서 확인할 수 있습니다.
            </p>
            <Button to={primaryCtaTo} size="lg">
              {primaryCtaText} <ArrowRight size={18} />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
