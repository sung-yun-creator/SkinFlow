import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  History,
  Leaf,
  Sparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getDashboard } from "../api/dashboardApi";
import { shouldShowAnalysisScore, toAnalysisScoreNumber } from "../utils/analysisStatus";

const quickActions = [
  {
    icon: Camera,
    title: "피부 분석",
    description: "처음이라면 사진 업로드로 피부 분석부터 시작하세요.",
    to: "/analysis/capture",
    variant: "primary",
    step: "01",
    stepLabel: "먼저 시작",
    cta: "분석 시작",
  },
  {
    icon: Sparkles,
    title: "맞춤 추천",
    description: "최근 분석에 맞춘 성분과 제품 추천을 확인합니다.",
    to: "/recommendations",
    variant: "secondary",
    step: "02",
    cta: "추천 확인",
  },
  {
    icon: Leaf,
    title: "식습관 가이드",
    description: "오늘 참고할 수 있는 관리 가이드를 확인합니다.",
    to: "/diet-guide",
    variant: "secondary",
    step: "03",
    cta: "가이드 보기",
  },
  {
    icon: History,
    title: "분석 이력",
    description: "지난 결과와 변화 흐름을 다시 확인합니다.",
    to: "/history",
    variant: "secondary",
    step: "04",
    cta: "이력 보기",
  },
];

function formatDate(dateValue) {
  if (!dateValue) return "분석 전";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "분석 전";
  }

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function getStatusLabel(status) {
  if (!status) return "분석 전";

  const normalizedStatus = String(status).toLowerCase();
  const statusMap = {
    good: "양호",
    low: "양호",
    normal: "보통",
    caution: "주의",
    medium: "주의",
    risk: "위험",
    high: "위험",
    danger: "위험",
    severe: "집중 관리",
    pending: "분석 대기",
    processing: "분석 중",
    analysis_pending: "분석 대기",
    ai_model_pending: "AI 모델 연결 대기",
    completed: "분석 완료",
    error: "분석 실패",
    failed: "분석 실패",
  };

  return statusMap[normalizedStatus] || status;
}

function getDashboardErrorMessage(error) {
  const rawMessage = String(error?.message || "").toLowerCase();

  if (
    !rawMessage ||
    rawMessage.includes("internal server error") ||
    rawMessage.includes("failed to fetch") ||
    rawMessage.includes("networkerror") ||
    rawMessage.includes("api 요청에 실패했습니다")
  ) {
    return "대시보드 정보를 불러오지 못했습니다. 로그인 상태와 서비스 연결 상태를 확인한 뒤 다시 시도해주세요.";
  }

  return "대시보드 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
}

function getMetricName(metric) {
  return (
    metric?.metricName ||
    metric?.metric_name ||
    metric?.name ||
    metric?.label ||
    metric?.type ||
    "피부 지표"
  );
}

function getMetricScore(metric) {
  const rawScore =
    metric?.score ??
    metric?.metricScore ??
    metric?.metric_score ??
    metric?.value ??
    metric?.metricValue ??
    metric?.metric_value;

  const score = Number(rawScore);

  if (Number.isNaN(score)) return null;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasMetricScore(metric) {
  const rawScore =
    metric?.score ??
    metric?.metricScore ??
    metric?.metric_score ??
    metric?.value ??
    metric?.metricValue ??
    metric?.metric_value;

  if (rawScore === null || rawScore === undefined || rawScore === "") return false;

  return !Number.isNaN(Number(rawScore));
}

function getMetricGrade(metric) {
  return metric?.gradeName || metric?.grade_name || metric?.status || metric?.level;
}

function normalizeMetrics(latestAnalysis, canShowScores) {
  const metrics = Array.isArray(latestAnalysis?.metrics) ? latestAnalysis.metrics : [];

  const mvpMetrics = metrics.filter((metric) => {
    const name = getMetricName(metric);
    return name.includes("색소") || name.includes("주름");
  });

  if (!canShowScores || mvpMetrics.length === 0) {
    return [
      {
        label: "색소침착",
        score: null,
        status: canShowScores ? "첫 분석 후 표시" : "분석 완료 후 표시",
        hasScore: false,
      },
      {
        label: "주름",
        score: null,
        status: canShowScores ? "첫 분석 후 표시" : "분석 완료 후 표시",
        hasScore: false,
      },
    ];
  }

  return mvpMetrics.slice(0, 2).map((metric) => ({
    label: getMetricName(metric),
    score: getMetricScore(metric),
    status: getStatusLabel(getMetricGrade(metric)),
    hasScore: hasMetricScore(metric),
  }));
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setDashboardError("");

        const data = await getDashboard();

        if (isMounted) {
          setDashboard(data);
        }
      } catch (error) {
        if (isMounted) {
          setDashboardError(getDashboardErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const profile = dashboard?.profile || {};
  const summary = dashboard?.summary || {};
  const latestAnalysis = dashboard?.latestAnalysis || null;
  const mainConcern = dashboard?.mainConcern || null;
  const latestStatus =
    latestAnalysis?.analysis_status ||
    latestAnalysis?.analysisStatus ||
    latestAnalysis?.status ||
    summary.latestStatus ||
    summary.latest_status;
  const latestScore = toAnalysisScoreNumber(
    latestAnalysis?.totalScore ??
      latestAnalysis?.totalSkinScore ??
      latestAnalysis?.total_score ??
      latestAnalysis?.total_skin_score ??
      summary.latestTotalScore ??
      summary.latest_total_score
  );

  const analysisCount = Number(
    summary.analysisCount || summary.analysis_count || profile.analysisCount || 0
  );

  const hasLatestAnalysisScore = shouldShowAnalysisScore({
    score: latestScore,
    status: latestStatus,
    saved: latestAnalysis?.saved ?? summary.saved,
  });
  const hasLatestAnalysis = hasLatestAnalysisScore;
  const metrics = useMemo(
    () => normalizeMetrics(latestAnalysis, hasLatestAnalysisScore),
    [hasLatestAnalysisScore, latestAnalysis],
  );

  const mainConcernName = mainConcern ? getMetricName(mainConcern) : "분석 전";
  const latestDate = formatDate(
    latestAnalysis?.analyzedAt || latestAnalysis?.analyzed_at || summary.latestAnalyzedAt
  );

  const userName = profile.name || profile.userName || profile.nickname || "사용자";

  return (
    <PageLayout>
      <style>
        {`
          .dashboard-app-home {
            display: grid;
            gap: 18px;
          }

          .dashboard-app-hero {
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
            gap: 20px;
            align-items: stretch;
          }

          .dashboard-welcome-card,
          .dashboard-status-card,
          .dashboard-action-card,
          .dashboard-mini-card {
            border: 1px solid rgba(226, 232, 240, 0.92);
            box-shadow: 0 20px 54px rgba(15, 23, 42, 0.07);
          }

          .dashboard-welcome-card {
            min-height: 285px;
            padding: 26px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background:
              radial-gradient(circle at 82% 12%, rgba(22, 125, 127, 0.13), transparent 30%),
              radial-gradient(circle at 8% 100%, rgba(20, 184, 166, 0.08), transparent 34%),
              #ffffff;
          }

          .dashboard-start-pill {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            gap: 7px;
            margin-bottom: 2px;
            padding: 8px 12px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.09);
            border: 1px solid rgba(22, 125, 127, 0.16);
            font-size: 12px;
            font-weight: 950;
            line-height: 1;
          }

          .dashboard-welcome-copy h1 {
            max-width: 620px;
            margin: 16px 0 12px;
            color: #0f172a;
            font-size: clamp(32px, 3.4vw, 44px);
            line-height: 1.12;
            letter-spacing: -0.06em;
          }

          .dashboard-gradient-text {
            background: linear-gradient(90deg, #167d7f 0%, #22c5c8 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .dashboard-welcome-copy p {
            max-width: 650px;
            margin: 0;
            color: #64748b;
            font-size: 15px;
            line-height: 1.7;
            word-break: keep-all;
          }

          .dashboard-welcome-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 24px;
          }

          .dashboard-primary-cta .sf-button {
            min-height: 54px;
            padding-inline: 22px;
            border: 1px solid rgba(22, 125, 127, 0.22);
            box-shadow: 0 18px 38px rgba(22, 125, 127, 0.22);
          }

          .dashboard-secondary-cta .sf-button {
            color: #475569;
            background: rgba(255, 255, 255, 0.72);
            box-shadow: none;
          }

          .dashboard-kpi-row {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 22px;
          }

          .dashboard-kpi {
            padding: 14px;
            border-radius: 18px;
            background: rgba(248, 250, 252, 0.86);
            border: 1px solid rgba(226, 232, 240, 0.85);
          }

          .dashboard-kpi span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
          }

          .dashboard-kpi strong {
            display: block;
            margin-top: 8px;
            color: #0f172a;
            font-size: 24px;
            letter-spacing: -0.05em;
          }

          .dashboard-status-card {
            min-height: 100%;
            padding: 24px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
          }

          .dashboard-status-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 16px;
          }

          .dashboard-status-top span:first-child,
          .dashboard-card-label {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
          }

          .dashboard-status-top h2 {
            margin: 8px 0 0;
            color: #0f172a;
            font-size: 23px;
            letter-spacing: -0.045em;
          }

          .dashboard-status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 12px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
            font-size: 12px;
            font-weight: 900;
            white-space: nowrap;
          }

          .dashboard-score-box {
            display: grid;
            grid-template-columns: 96px 1fr;
            gap: 16px;
            align-items: center;
            padding: 16px;
            border-radius: 22px;
            background: linear-gradient(135deg, rgba(22, 125, 127, 0.08), rgba(248, 250, 252, 0.9));
            border: 1px solid rgba(226, 232, 240, 0.85);
          }

          .dashboard-score-ring-compact {
            width: 92px;
            height: 92px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #0f172a;
            background:
              radial-gradient(circle, #ffffff 58%, transparent 60%),
              conic-gradient(#167d7f 0 var(--score-value), #e2e8f0 var(--score-value) 100%);
          }

          .dashboard-score-ring-compact strong {
            font-size: 26px;
            letter-spacing: -0.055em;
          }

          .dashboard-score-ring-compact small {
            color: #64748b;
            font-weight: 800;
          }

          .dashboard-score-summary strong {
            display: block;
            color: #0f172a;
            font-size: 17px;
            letter-spacing: -0.035em;
          }

          .dashboard-score-summary p {
            margin: 6px 0 0;
            color: #64748b;
            line-height: 1.65;
            word-break: keep-all;
          }

          .dashboard-metrics-compact {
            display: grid;
            gap: 10px;
            margin-top: 14px;
          }

          .dashboard-metric-compact {
            display: grid;
            grid-template-columns: 74px minmax(0, 1fr) minmax(82px, auto);
            gap: 10px;
            align-items: center;
          }

          .dashboard-metric-compact strong {
            color: #0f172a;
            font-size: 14px;
          }

          .dashboard-metric-compact small {
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
            text-align: right;
            white-space: nowrap;
          }

          .dashboard-bar {
            height: 8px;
            overflow: hidden;
            border-radius: 999px;
            background: #e2e8f0;
          }

          .dashboard-bar span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #167d7f, #22c5c8);
          }

          .dashboard-quick-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .dashboard-action-card {
            position: relative;
            min-height: 198px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 20px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.96);
            border-radius: 26px;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .dashboard-action-card::after {
            content: "";
            position: absolute;
            inset: auto -40px -54px auto;
            width: 118px;
            height: 118px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(22, 125, 127, 0.08), transparent 68%);
            pointer-events: none;
          }

          .dashboard-action-card:hover {
            transform: translateY(-3px);
            border-color: rgba(22, 125, 127, 0.22);
            box-shadow: 0 24px 58px rgba(15, 23, 42, 0.1);
          }

          .dashboard-action-card.is-primary-action {
            border-color: rgba(22, 125, 127, 0.34);
            background:
              radial-gradient(circle at 84% 16%, rgba(22, 125, 127, 0.16), transparent 30%),
              linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%);
            box-shadow: 0 24px 62px rgba(22, 125, 127, 0.14);
          }

          .dashboard-action-card.is-primary-action::after {
            background: radial-gradient(circle, rgba(22, 125, 127, 0.16), transparent 68%);
          }

          .dashboard-action-card.is-primary-action .dashboard-icon-tile {
            color: #ffffff;
            background: linear-gradient(135deg, #167d7f, #22c5c8);
            border-color: rgba(22, 125, 127, 0.26);
            box-shadow: 0 18px 36px rgba(22, 125, 127, 0.22);
          }

          .dashboard-action-card.is-primary-action .dashboard-action-index {
            color: #ffffff;
            background: #167d7f;
          }

          .dashboard-action-card.is-primary-action .sf-button {
            box-shadow: 0 14px 30px rgba(22, 125, 127, 0.18);
          }

          .dashboard-action-card:not(.is-primary-action) .sf-button {
            color: #475569;
            background: rgba(255, 255, 255, 0.98);
            box-shadow: none;
          }

          .dashboard-action-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .dashboard-action-index {
            color: #94a3b8;
            padding: 6px 9px;
            border-radius: 999px;
            background: #f1f5f9;
            font-size: 12px;
            font-weight: 950;
            line-height: 1;
            letter-spacing: -0.02em;
          }

          .dashboard-icon-tile {
            width: 60px;
            height: 60px;
            min-width: 60px;
            min-height: 60px;
            border-radius: 18px;
            display: grid;
            place-items: center;
            line-height: 0;
            color: #167d7f;
            background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 48%, #ecfeff 100%);
            border: 1px solid rgba(226, 232, 240, 0.9);
            box-shadow: 0 14px 30px rgba(15, 23, 42, 0.07);
          }

          .dashboard-icon-tile svg {
            display: block;
            width: 26px !important;
            height: 26px !important;
            min-width: 26px;
            min-height: 26px;
            margin: 0;
            flex: 0 0 auto;
            transform: none;
            stroke-width: 2.1;
          }

          .dashboard-action-body {
            position: relative;
            z-index: 1;
          }

          .dashboard-action-card h3 {
            margin: 14px 0 6px;
            color: #0f172a;
            font-size: 17px;
            letter-spacing: -0.04em;
          }

          .dashboard-action-card p {
            margin: 0 0 14px;
            color: #64748b;
            font-size: 13px;
            line-height: 1.55;
            word-break: keep-all;
          }

          .dashboard-error-note {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            margin-top: 16px;
            padding: 12px;
            border-radius: 16px;
            color: #b91c1c;
            background: #fef2f2;
            border: 1px solid #fecaca;
            font-size: 13px;
            line-height: 1.5;
          }

          @media (max-width: 980px) {
            .dashboard-app-hero {
              grid-template-columns: 1fr;
            }

            .dashboard-quick-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 640px) {
            .dashboard-welcome-card,
            .dashboard-status-card,
            .dashboard-mini-card {
              padding: 18px;
            }

            .dashboard-welcome-card,
            .dashboard-status-card {
              min-height: auto;
            }

            .dashboard-welcome-copy h1 {
              font-size: 31px;
            }

            .dashboard-welcome-actions .sf-button {
              width: 100%;
            }

            .dashboard-kpi-row,
            .dashboard-score-box,
            .dashboard-quick-grid {
              grid-template-columns: 1fr;
            }

            .dashboard-score-ring-compact {
              margin: 0 auto;
            }

            .dashboard-metric-compact {
              grid-template-columns: 74px 1fr;
            }

            .dashboard-metric-compact small {
              grid-column: 1 / -1;
              text-align: left;
            }

          }
        `}
      </style>

      <section className="dashboard-app-home">
        <div className="dashboard-app-hero">
          <Card className="dashboard-welcome-card">
            <div className="dashboard-welcome-copy">
              <Badge>홈</Badge>
              <span className="dashboard-start-pill">
                <Camera size={14} />
                처음 사용자 추천 흐름
              </span>
              <h1>
                처음이라면 피부 분석부터
                <br />
                <span className="dashboard-gradient-text">시작하세요</span>
              </h1>
              <p>
                {userName}님의 첫 화면에서는 분석 시작, 결과 확인, 추천 확인, 이력 관리 순서로 이어지는 핵심 흐름을 바로 확인합니다.
              </p>

              <div className="dashboard-welcome-actions">
                <span className="dashboard-primary-cta">
                  <Button to="/analysis/capture" size="lg">
                    피부 분석 시작 <ArrowRight size={18} />
                  </Button>
                </span>
                <span className="dashboard-secondary-cta">
                  <Button to="/recommendations" variant="secondary" size="lg">
                    추천은 분석 후 확인
                  </Button>
                </span>
              </div>

              {dashboardError && (
                <div className="dashboard-error-note">
                  <AlertCircle size={18} />
                  <span>{dashboardError}</span>
                </div>
              )}
            </div>

            <div className="dashboard-kpi-row">
              <div className="dashboard-kpi">
                <span>분석 횟수</span>
                <strong>{analysisCount}회</strong>
              </div>
              <div className="dashboard-kpi">
                <span>최근 분석</span>
                <strong>{latestDate}</strong>
              </div>
              <div className="dashboard-kpi">
                <span>관심 지표</span>
                <strong>{mainConcernName}</strong>
              </div>
            </div>
          </Card>

          <Card className="dashboard-status-card">
            <div className="dashboard-status-top">
              <div>
                <span>최근 피부 상태</span>
                <h2>{hasLatestAnalysis ? "분석 결과 요약" : "아직 분석 전입니다"}</h2>
              </div>
              <span className="dashboard-status-pill">
                <CheckCircle2 size={14} />
                {getStatusLabel(latestStatus)}
              </span>
            </div>

            <div className="dashboard-score-box">
              <div
                className="dashboard-score-ring-compact"
                style={{ "--score-value": `${hasLatestAnalysisScore ? latestScore : 0}%` }}
              >
                <strong>{hasLatestAnalysisScore ? latestScore : "분석 전"}</strong>
                <small>{hasLatestAnalysisScore ? "/100" : "첫 분석 후 표시"}</small>
              </div>

              <div className="dashboard-score-summary">
                <strong>
                  {hasLatestAnalysis
                    ? "최근 분석 결과가 준비되었습니다"
                    : "첫 분석을 진행하면 결과가 표시됩니다"}
                </strong>
                <p>
                  {isLoading
                    ? "대시보드 정보를 불러오는 중입니다."
                    : hasLatestAnalysis
                      ? latestAnalysis.summary ||
                        latestAnalysis.description ||
                        summary.latestSummary ||
                        "색소침착과 주름 중심의 분석 결과를 확인할 수 있습니다."
                      : "사진 업로드 후 분석 결과와 추천 정보를 이어서 확인할 수 있습니다."}
                </p>
              </div>
            </div>

            <div className="dashboard-metrics-compact">
              {metrics.map((metric) => (
                <div className="dashboard-metric-compact" key={metric.label}>
                  <strong>{metric.label}</strong>
                  <div className="dashboard-bar">
                    <span style={{ width: `${metric.hasScore ? metric.score : 0}%` }} />
                  </div>
                  <small>{metric.hasScore ? `${metric.score}점 · ${metric.status}` : metric.status}</small>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="dashboard-quick-grid">
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                className={`dashboard-action-card ${item.variant === "primary" ? "is-primary-action" : ""}`}
                key={item.title}
              >
                <div className="dashboard-action-body">
                  <div className="dashboard-action-head">
                    <span className="dashboard-icon-tile" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="dashboard-action-index">{item.stepLabel || item.step}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <Button to={item.to} variant={item.variant} size="sm">
                  {item.cta} <ArrowRight size={15} />
                </Button>
              </Card>
            );
          })}
        </div>

      </section>
    </PageLayout>
  );
}

export default DashboardPage;
