import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  History,
  Leaf,
  LineChart,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getDashboard } from "../api/dashboardApi";

const quickActions = [
  {
    icon: Camera,
    title: "피부 분석",
    description: "스마트폰 촬영 이미지로 색소침착·주름 분석을 시작합니다.",
    to: "/analysis/capture",
    variant: "primary",
    step: "01",
  },
  {
    icon: Sparkles,
    title: "맞춤 추천",
    description: "분석 결과에 맞는 성분과 제품 추천을 확인합니다.",
    to: "/recommendations",
    variant: "secondary",
    step: "02",
  },
  {
    icon: Leaf,
    title: "식습관",
    description: "오늘 실천할 수 있는 피부 관리 루틴을 확인합니다.",
    to: "/diet-guide",
    variant: "secondary",
    step: "03",
  },
  {
    icon: History,
    title: "분석 이력",
    description: "지난 결과와 피부 변화 흐름을 다시 확인합니다.",
    to: "/history",
    variant: "secondary",
    step: "04",
  },
];

const firstUserSteps = [
  "스마트폰으로 얼굴 사진을 촬영합니다.",
  "이미지를 업로드하고 ROI 확인을 진행합니다.",
  "분석 결과와 추천 가이드를 이어서 확인합니다.",
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

function formatScore(score) {
  if (score === null || score === undefined || score === "") return null;

  const numberScore = Number(score);

  if (Number.isNaN(numberScore)) return null;

  return Math.round(numberScore);
}

function getStatusLabel(status) {
  if (!status) return "분석 전";

  const statusMap = {
    good: "양호",
    normal: "보통",
    caution: "주의",
    severe: "집중 관리",
    pending: "분석 대기",
    completed: "분석 완료",
    failed: "분석 실패",
  };

  return statusMap[status] || status;
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

  if (Number.isNaN(score)) return 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getMetricGrade(metric) {
  return metric?.gradeName || metric?.grade_name || metric?.status || metric?.level;
}

function normalizeMetrics(latestAnalysis) {
  const metrics = Array.isArray(latestAnalysis?.metrics) ? latestAnalysis.metrics : [];

  const mvpMetrics = metrics.filter((metric) => {
    const name = getMetricName(metric);
    return name.includes("색소") || name.includes("주름");
  });

  if (mvpMetrics.length === 0) {
    return [
      {
        label: "색소침착",
        score: 0,
        status: "분석 전",
      },
      {
        label: "주름",
        score: 0,
        status: "분석 전",
      },
    ];
  }

  return mvpMetrics.slice(0, 2).map((metric) => ({
    label: getMetricName(metric),
    score: getMetricScore(metric),
    status: getStatusLabel(getMetricGrade(metric)),
  }));
}

function getItemTitle(item, fallback) {
  return (
    item?.title ||
    item?.name ||
    item?.recommendationName ||
    item?.recommendation_name ||
    item?.guideTitle ||
    item?.guide_title ||
    fallback
  );
}

function getItemDescription(item, fallback) {
  return (
    item?.description ||
    item?.summary ||
    item?.reason ||
    item?.recommendationReason ||
    item?.recommendation_reason ||
    item?.content ||
    item?.guideContent ||
    item?.guide_content ||
    fallback
  );
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
          setDashboardError(
            error?.message ||
              "대시보드 정보를 불러오지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해주세요."
          );
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
  const nextAction = dashboard?.nextAction || {};
  const recentAnalyses = Array.isArray(dashboard?.recentAnalyses)
    ? dashboard.recentAnalyses.slice(0, 2)
    : [];
  const recommendations = Array.isArray(dashboard?.recommendations)
    ? dashboard.recommendations.slice(0, 2)
    : [];
  const dietGuides = Array.isArray(dashboard?.dietGuides)
    ? dashboard.dietGuides.slice(0, 1)
    : [];

  const latestScore = formatScore(
    latestAnalysis?.totalScore ||
      latestAnalysis?.total_score ||
      summary.latestTotalScore ||
      summary.latest_total_score
  );

  const analysisCount = Number(
    summary.analysisCount || summary.analysis_count || profile.analysisCount || 0
  );

  const hasLatestAnalysis = Boolean(latestAnalysis);
  const metrics = useMemo(() => normalizeMetrics(latestAnalysis), [latestAnalysis]);

  const mainConcernName = mainConcern ? getMetricName(mainConcern) : "분석 전";
  const latestDate = formatDate(
    latestAnalysis?.analyzedAt || latestAnalysis?.analyzed_at || summary.latestAnalyzedAt
  );

  const nextActionPath = nextAction.path || nextAction.to || "/analysis/capture";
  const nextActionLabel = nextAction.label || "피부 분석 시작하기";
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
            align-items: start;
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
            padding: 24px;
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
            grid-template-columns: 74px 1fr 58px;
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
            background:
              radial-gradient(circle at 84% 16%, rgba(22, 125, 127, 0.1), transparent 28%),
              rgba(255, 255, 255, 0.98);
          }

          .dashboard-action-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .dashboard-action-index {
            color: #cbd5e1;
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

          .dashboard-bottom-compact {
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
            gap: 18px;
            align-items: start;
          }

          .dashboard-mini-card {
            padding: 20px;
            background: #ffffff;
          }

          .dashboard-mini-title-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 14px;
          }

          .dashboard-mini-title-row h2 {
            margin: 5px 0 0;
            color: #0f172a;
            font-size: 20px;
            letter-spacing: -0.045em;
          }

          .dashboard-flow-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .dashboard-flow-card,
          .dashboard-guide-action-card {
            position: relative;
            min-height: 126px;
            padding: 15px;
            border-radius: 20px;
            background:
              radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.06), transparent 34%),
              #f8fafc;
            border: 1px solid rgba(226, 232, 240, 0.9);
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .dashboard-flow-card:hover,
          .dashboard-guide-action-card:hover {
            transform: translateY(-2px);
            border-color: rgba(22, 125, 127, 0.2);
            box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
          }

          .dashboard-flow-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 12px;
          }

          .dashboard-flow-index {
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 950;
            line-height: 1;
          }

          .dashboard-mini-tile {
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            line-height: 0;
            color: #167d7f;
            background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 50%, #ecfeff 100%);
            border: 1px solid rgba(226, 232, 240, 0.88);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
          }

          .dashboard-mini-tile svg {
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

          .dashboard-flow-card strong,
          .dashboard-guide-action-card strong {
            display: block;
            color: #0f172a;
            font-size: 15px;
            letter-spacing: -0.035em;
          }

          .dashboard-flow-card p,
          .dashboard-guide-action-card p {
            margin: 6px 0 0;
            color: #64748b;
            font-size: 12px;
            line-height: 1.55;
            word-break: keep-all;
          }

          .dashboard-guide-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .dashboard-guide-action-card {
            min-height: 92px;
            display: grid;
            grid-template-columns: 44px 1fr auto;
            align-items: center;
            gap: 12px;
          }

          .dashboard-guide-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 46px;
            padding: 7px 10px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
          }

          .dashboard-guide-badge.is-muted {
            color: #64748b;
            background: rgba(100, 116, 139, 0.1);
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
            .dashboard-app-hero,
            .dashboard-bottom-compact {
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

            .dashboard-flow-grid {
              grid-template-columns: 1fr;
            }

            .dashboard-guide-action-card {
              grid-template-columns: 48px 1fr;
            }

            .dashboard-guide-badge {
              grid-column: 2;
              width: fit-content;
            }
          }
        `}
      </style>

      <section className="dashboard-app-home">
        <div className="dashboard-app-hero">
          <Card className="dashboard-welcome-card">
            <div className="dashboard-welcome-copy">
              <Badge>SkinFlow App Home</Badge>
              <h1>
                {userName}님의 피부 관리,
                <br />
                <span className="dashboard-gradient-text">오늘은 여기서 시작하세요</span>
              </h1>
              <p>
                분석 시작, 추천 확인, 식습관 가이드, 이력 관리를 한 화면에서 빠르게 이동할 수 있는 로그인 후 앱 홈입니다.
              </p>

              <div className="dashboard-welcome-actions">
                <Button to={nextActionPath} size="lg">
                  {nextActionLabel} <ArrowRight size={18} />
                </Button>
                <Button to="/recommendations" variant="secondary" size="lg">
                  추천 보기
                </Button>
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
                {getStatusLabel(
                  latestAnalysis?.status || latestAnalysis?.analysisStatus || summary.latestStatus
                )}
              </span>
            </div>

            <div className="dashboard-score-box">
              <div
                className="dashboard-score-ring-compact"
                style={{ "--score-value": `${latestScore || 0}%` }}
              >
                <strong>{latestScore || 0}</strong>
                <small>/100</small>
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
                      : "사진 업로드 후 ROI 확인과 분석 결과, 추천 정보를 이어서 확인할 수 있습니다."}
                </p>
              </div>
            </div>

            <div className="dashboard-metrics-compact">
              {metrics.map((metric) => (
                <div className="dashboard-metric-compact" key={metric.label}>
                  <strong>{metric.label}</strong>
                  <div className="dashboard-bar">
                    <span style={{ width: `${metric.score}%` }} />
                  </div>
                  <small>{metric.score > 0 ? `${metric.score}점 · ${metric.status}` : metric.status}</small>
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
                    <span className="dashboard-action-index">{item.step}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <Button to={item.to} variant={item.variant} size="sm">
                  이동하기 <ArrowRight size={15} />
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="dashboard-bottom-compact">
          <Card className="dashboard-mini-card">
            <div className="dashboard-mini-title-row">
              <div>
                <span className="dashboard-card-label">
                  {hasLatestAnalysis ? "최근 분석 이력" : "처음 이용 흐름"}
                </span>
                <h2>{hasLatestAnalysis ? "최근 기록" : "3단계로 시작하세요"}</h2>
              </div>

              <Button
                to={hasLatestAnalysis ? "/history" : "/analysis/capture"}
                variant="ghost"
                size="sm"
              >
                {hasLatestAnalysis ? "전체 보기" : "분석 시작"}
              </Button>
            </div>

            {recentAnalyses.length > 0 ? (
              <div className="dashboard-guide-grid">
                {recentAnalyses.map((analysis, index) => (
                  <div
                    className="dashboard-guide-action-card"
                    key={analysis.analysisId || analysis.id || index}
                  >
                    <span className="dashboard-mini-tile" aria-hidden="true">
                      <CalendarDays size={20} />
                    </span>

                    <div>
                      <strong>{formatDate(analysis.analyzedAt || analysis.analyzed_at)}</strong>
                      <p>{analysis.summary || "분석 결과가 기록되었습니다."}</p>
                    </div>

                    <span className="dashboard-guide-badge">
                      {formatScore(analysis.totalScore || analysis.total_score) ?? "-"}점
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-flow-grid">
                {firstUserSteps.map((step, index) => {
                  const StepIcon = index === 0 ? Camera : index === 1 ? LineChart : Sparkles;
                  const titles = ["사진 준비", "ROI 확인", "결과 확인"];

                  return (
                    <div className="dashboard-flow-card" key={step}>
                      <div className="dashboard-flow-head">
                        <span className="dashboard-mini-tile" aria-hidden="true">
                          <StepIcon size={20} />
                        </span>
                        <span className="dashboard-flow-index">0{index + 1}</span>
                      </div>

                      <strong>{titles[index]}</strong>
                      <p>{step}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="dashboard-mini-card">
            <div className="dashboard-mini-title-row">
              <div>
                <span className="dashboard-card-label">추천·가이드</span>
                <h2>다음 관리 행동</h2>
              </div>

              <Button to="/diet-guide" variant="ghost" size="sm">
                식습관 보기
              </Button>
            </div>

            <div className="dashboard-guide-grid">
              {recommendations.length > 0 || dietGuides.length > 0 ? (
                <>
                  {recommendations.map((item, index) => (
                    <div className="dashboard-guide-action-card" key={`recommendation-${index}`}>
                      <span className="dashboard-mini-tile" aria-hidden="true">
                        <Sparkles size={20} />
                      </span>

                      <div>
                        <strong>{getItemTitle(item, "맞춤 추천")}</strong>
                        <p>{getItemDescription(item, "분석 결과 기반 추천입니다.")}</p>
                      </div>

                      <span className="dashboard-guide-badge">추천</span>
                    </div>
                  ))}

                  {dietGuides.map((item, index) => (
                    <div className="dashboard-guide-action-card" key={`diet-${index}`}>
                      <span className="dashboard-mini-tile" aria-hidden="true">
                        <Leaf size={20} />
                      </span>

                      <div>
                        <strong>{getItemTitle(item, "식습관 가이드")}</strong>
                        <p>
                          {getItemDescription(
                            item,
                            "피부 관리에 참고할 수 있는 식습관 가이드입니다."
                          )}
                        </p>
                      </div>

                      <span className="dashboard-guide-badge">가이드</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="dashboard-guide-action-card">
                    <span className="dashboard-mini-tile" aria-hidden="true">
                      <RefreshCw size={20} />
                    </span>

                    <div>
                      <strong>분석 결과 연결 대기</strong>
                      <p>첫 분석 후 성분, 제품, 식습관 가이드가 연결됩니다.</p>
                    </div>

                    <span className="dashboard-guide-badge">준비</span>
                  </div>

                  <div className="dashboard-guide-action-card">
                    <span className="dashboard-mini-tile" aria-hidden="true">
                      <ClipboardList size={20} />
                    </span>

                    <div>
                      <strong>피부 관리 참고 정보</strong>
                      <p>분석 결과는 의료적 판단이 아닌 관리 참고 정보입니다.</p>
                    </div>

                    <span className="dashboard-guide-badge is-muted">안내</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </section>
    </PageLayout>
  );
}

export default DashboardPage;
