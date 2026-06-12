import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import Button from "../common/Button";

const ANALYSIS_PROGRESS_KEY = "skinflow_analysis_progress";
const ANALYSIS_PROGRESS_EVENT = "skinflow-analysis-progress";

const navItems = [
  {
    to: "/dashboard",
    label: "대시보드",
  },
  {
    to: "/analysis/capture",
    label: "피부 분석",
  },
  {
    to: "/recommendations",
    label: "맞춤 추천",
  },
  {
    to: "/history",
    label: "분석 이력",
  },
  {
    to: "/mypage",
    label: "마이페이지",
  },
];

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
      return defaultProgress;
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
    return defaultProgress;
  }
}

function shouldShowProgress(progress, pathname) {
  if (pathname === "/analysis/loading") return true;
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

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("skinflow_token");
  const isLoggedIn = Boolean(token);
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
  }, [location.pathname]);

  const shouldRenderAnalysisStatus = useMemo(
    () => isLoggedIn && shouldShowProgress(analysisProgress, location.pathname),
    [analysisProgress, isLoggedIn, location.pathname]
  );

  const progressTone = getProgressTone(analysisProgress.status);
  const progressPath = analysisProgress.path || "/analysis/loading";

  const handleLogout = () => {
    localStorage.removeItem("skinflow_token");
    localStorage.removeItem("skinflow_user_email");
    localStorage.removeItem("skinflow_user");
    localStorage.removeItem(ANALYSIS_PROGRESS_KEY);

    window.dispatchEvent(new Event(ANALYSIS_PROGRESS_EVENT));
    navigate("/login");
  };

  return (
    <header className="site-header">
      <style>
        {`
          .global-analysis-status {
            border-top: 1px solid rgba(226, 232, 240, 0.72);
            background:
              radial-gradient(circle at 12% 0%, rgba(22, 125, 127, 0.08), transparent 28%),
              rgba(248, 250, 252, 0.96);
            backdrop-filter: blur(16px);
          }

          .global-analysis-status-inner {
            max-width: 1120px;
            margin: 0 auto;
            padding: 10px 24px 12px;
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr) auto;
            align-items: center;
            gap: 12px;
          }

          .global-analysis-icon {
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

          .global-analysis-icon svg {
            display: block;
            width: 20px;
            height: 20px;
            margin: 0;
            stroke-width: 2.2;
          }

          .global-analysis-status[data-tone="active"] .global-analysis-icon svg {
            animation: analysisPulse 1.4s ease-in-out infinite;
          }

          .global-analysis-status[data-tone="warning"] .global-analysis-icon {
            color: #f43f5e;
          }

          .global-analysis-content {
            min-width: 0;
          }

          .global-analysis-topline {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 6px;
          }

          .global-analysis-title {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            color: #0f172a;
            font-size: 13px;
            font-weight: 950;
            letter-spacing: -0.025em;
          }

          .global-analysis-title span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .global-analysis-description {
            overflow: hidden;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .global-analysis-percent {
            flex: 0 0 auto;
            color: #167d7f;
            font-size: 13px;
            font-weight: 950;
          }

          .global-analysis-status[data-tone="warning"] .global-analysis-percent {
            color: #f43f5e;
          }

          .global-analysis-track {
            height: 6px;
            overflow: hidden;
            border-radius: 999px;
            background: #e2e8f0;
          }

          .global-analysis-track span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #167d7f, #22c5c8, #f43f5e);
            transition: width 0.25s ease;
          }

          .global-analysis-action {
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

          .global-analysis-action:hover {
            color: #167d7f;
            border-color: rgba(22, 125, 127, 0.2);
          }

          @keyframes analysisPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.72;
            }
            50% {
              transform: scale(1.08);
              opacity: 1;
            }
          }

          @media (max-width: 760px) {
            .global-analysis-status-inner {
              grid-template-columns: 38px minmax(0, 1fr);
              padding: 9px 16px 11px;
            }

            .global-analysis-icon {
              width: 38px;
              height: 38px;
              border-radius: 14px;
            }

            .global-analysis-action {
              grid-column: 2;
              width: fit-content;
              min-height: 32px;
              padding: 0 12px;
            }
          }
        `}
      </style>

      <div className="site-header-inner">
        <Link className="brand" to="/">
          <span className="brand-icon">
            <Sparkles size={18} />
          </span>
          <span className="brand-text">SkinFlow</span>
        </Link>

        <nav className="desktop-nav" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {isLoggedIn ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                로그아웃
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

      {shouldRenderAnalysisStatus && (
        <div className="global-analysis-status" data-tone={progressTone}>
          <div className="global-analysis-status-inner">
            <span className="global-analysis-icon" aria-hidden="true">
              {progressTone === "ready" ? (
                <CheckCircle2 size={20} />
              ) : progressTone === "warning" ? (
                <Activity size={20} />
              ) : (
                <LoaderCircle size={20} />
              )}
            </span>

            <div className="global-analysis-content">
              <div className="global-analysis-topline">
                <div className="global-analysis-title">
                  <span>{analysisProgress.label}</span>
                </div>
                <strong className="global-analysis-percent">
                  {analysisProgress.progress}%
                </strong>
              </div>

              <div className="global-analysis-track" aria-hidden="true">
                <span style={{ width: `${analysisProgress.progress}%` }} />
              </div>

              <div className="global-analysis-description">
                {analysisProgress.description}
              </div>
            </div>

            <Link className="global-analysis-action" to={progressPath}>
              진행상황 보기 <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
