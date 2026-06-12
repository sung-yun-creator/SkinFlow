import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  History,
  LineChart,
  LoaderCircle,
  ScanFace,
  X,
  Sparkles,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/common/Button";


const ANALYSIS_PROGRESS_KEY = "skinflow_analysis_progress";
const ANALYSIS_PROGRESS_EVENT = "skinflow-analysis-progress";

const defaultProgress = {
  status: "idle",
  label: "분석 대기",
  description: "피부 분석을 시작하면 진행 상태가 표시됩니다.",
  progress: 0,
  path: "/analysis/loading",
};

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
  } catch (error) {
    localStorage.removeItem(ANALYSIS_PROGRESS_KEY);
    return null;
  }
}

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

function getProgressTone(status) {
  if (status === "failed" || status === "model_missing") {
    return "warning";
  }

  if (status === "roi_complete") {
    return "ready";
  }

  return "active";
}
function clearStoredAnalysisProgress() {
  localStorage.removeItem(ANALYSIS_PROGRESS_KEY);
  window.dispatchEvent(new Event(ANALYSIS_PROGRESS_EVENT));
}


const valueCards = [
  {
    icon: ScanFace,
    title: "AI 피부 분석",
    description: "얼굴 이미지에서 색소침착과 주름 중심의 피부 상태를 분석합니다.",
  },
  {
    icon: FlaskConical,
    title: "맞춤 추천 연결",
    description: "분석 결과를 기능성 성분, 화장품 제품, 식습관 가이드와 연결합니다.",
  },
  {
    icon: History,
    title: "분석 이력 관리",
    description: "이전 분석 결과를 다시 확인하고 피부 변화 흐름을 기록합니다.",
  },
];

const processSteps = [
  { icon: Upload, title: "사진 업로드" },
  { icon: ScanFace, title: "ROI 확인" },
  { icon: Sparkles, title: "AI 분석" },
  { icon: ClipboardList, title: "리포트" },
  { icon: LineChart, title: "추천·이력" },
];

function LandingPage() {
  const isLoggedIn = Boolean(localStorage.getItem("skinflow_token"));
  const [analysisProgress, setAnalysisProgress] = useState(() =>
    getStoredAnalysisProgress()
  );

  useEffect(() => {
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

  const shouldRenderAnalysisStatus = useMemo(
    () => isLoggedIn && shouldShowProgress(analysisProgress),
    [analysisProgress, isLoggedIn]
  );

  const progressTone = getProgressTone(analysisProgress?.status);
  const progressPath = analysisProgress?.path || "/analysis/loading";

  const handleDismissProgress = () => {
    clearStoredAnalysisProgress();
  };

  const primaryCtaTo = isLoggedIn ? "/analysis/capture" : "/signup";
  const secondaryCtaTo = isLoggedIn ? "/dashboard" : "/login";
  const primaryCtaText = isLoggedIn ? "피부 분석 시작하기" : "무료 피부 분석 시작";
  const secondaryCtaText = isLoggedIn ? "내 대시보드 보기" : "로그인하기";

  return (
    <div className="sf-landing-compact">
      <style>
        {`
          .sf-landing-compact {
            min-height: 100vh;
            color: #0f172a;
            background:
              radial-gradient(circle at 5% 18%, rgba(22, 125, 127, 0.11), transparent 28%),
              radial-gradient(circle at 94% 86%, rgba(244, 63, 94, 0.10), transparent 25%),
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
            background: linear-gradient(90deg, #167d7f 0%, #22c5c8 48%, #f43f5e 100%);
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
              linear-gradient(135deg, #fff2e8 0%, #fdf5ef 52%, #f9e8df 100%);
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
          }

          .sf-report-metric strong {
            display: block;
            margin-top: 6px;
            color: #0f172a;
            font-size: 23px;
            letter-spacing: -0.05em;
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
            grid-template-columns: repeat(3, minmax(0, 1fr));
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
            background: linear-gradient(135deg, #167d7f, #22c5c8 62%, #f43f5e);
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
            background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 52%, #fff1f4 100%);
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
            color: #f43f5e;
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
            color: #f43f5e;
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
            background: linear-gradient(90deg, #167d7f, #22c5c8, #f43f5e);
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
              linear-gradient(135deg, #167d7f 0%, #0f766e 52%, #f43f5e 135%);
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
            color: #f43f5e;
            background: #ffffff;
            border-color: rgba(244, 63, 94, 0.24);
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
              grid-template-columns: 1fr;
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

            .sf-section {
              padding: 42px 0;
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
            <a href="#process">AI 분석</a>
            <a href="#start">시작하기</a>
          </nav>

          <Button to={primaryCtaTo} size="sm">
            피부 분석 시작하기
          </Button>
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
              AI 기반 피부 분석 솔루션
            </span>

            <h1>
              AI가 분석하는
              <br />
              <span className="sf-gradient-text">나만의 피부 리포트</span>
            </h1>

            <p>
              얼굴 사진 한 장으로 색소침착과 주름 중심의 피부 상태를 분석하고,
              기능성 성분·화장품 제품·식습관 가이드까지 한 흐름으로 확인합니다.
            </p>

            <div className="sf-landing-actions">
              <Button to={primaryCtaTo} size="lg">
                {primaryCtaText} <ArrowRight size={18} />
              </Button>
              <Button to={secondaryCtaTo} variant="secondary" size="lg">
                {secondaryCtaText}
              </Button>
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

          <aside className="sf-report-card" aria-label="AI 피부 분석 리포트 예시">
            <div className="sf-report-top">
              <div>
                <small>SkinFlow · 분석 리포트</small>
                <h2>AI 피부 분석 리포트</h2>
              </div>
              <span className="sf-report-status">
                <CheckCircle2 size={14} />
                분석 예시
              </span>
            </div>

            <div className="sf-skin-canvas">
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

            <div className="sf-report-metrics">
              <div className="sf-report-metric">
                <span>종합 점수</span>
                <strong>78점</strong>
              </div>
              <div className="sf-report-metric">
                <span>색소침착</span>
                <strong>85점</strong>
              </div>
              <div className="sf-report-metric">
                <span>주름</span>
                <strong>42점</strong>
              </div>
            </div>

            <div className="sf-report-comment">
              <span className="sf-report-comment-icon">
                <Sparkles size={17} />
              </span>
              <span>
                결과 화면은 피부 관리 참고 정보로 제공되며, 실제 분석 결과와 추천은
                분석 완료 후 사용자의 이력과 함께 연결됩니다.
              </span>
            </div>
          </aside>
        </section>

        <section className="sf-section">
          <div className="sf-section-head">
            <small>Why SkinFlow</small>
            <h2>필요한 기능만 짧고 명확하게 제공합니다</h2>
            <p>
              긴 설명보다 사용자가 바로 이해할 수 있는 분석, 추천, 이력 흐름을
              중심으로 구성했습니다.
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
            <small>Process</small>
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

        <section className="sf-section" id="start">
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
