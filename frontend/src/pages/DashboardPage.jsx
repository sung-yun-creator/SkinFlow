import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  History,
  Leaf,
  LineChart,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";
import { getDashboard } from "../api/dashboardApi";

const flowSteps = [
  {
    step: "01",
    title: "피부 분석 시작",
    description: "웹캠 촬영 또는 이미지 업로드로 색소침착과 주름 중심 분석을 시작합니다.",
    to: "/analysis/capture",
    icon: Camera,
  },
  {
    step: "02",
    title: "분석 결과 확인",
    description: "종합 점수와 지표별 상태를 시각적으로 확인하고 관리 방향을 파악합니다.",
    to: "/analysis/result",
    icon: LineChart,
  },
  {
    step: "03",
    title: "맞춤 추천 확인",
    description: "분석 결과를 바탕으로 기능성 성분, 제품, 식습관 가이드를 확인합니다.",
    to: "/recommendations",
    icon: Sparkles,
  },
  {
    step: "04",
    title: "분석 이력 관리",
    description: "이전 분석 결과를 모아보고 피부 상태 변화 흐름을 확인합니다.",
    to: "/history",
    icon: History,
  },
];

const quickActionCards = [
  {
    icon: Camera,
    title: "피부 분석 시작",
    description: "처음 이용한다면 여기서 시작하세요. 얼굴 이미지를 기반으로 피부 상태를 분석합니다.",
    to: "/analysis/capture",
    buttonText: "분석 시작",
    variant: "primary",
  },
  {
    icon: Sparkles,
    title: "맞춤 추천",
    description: "분석 결과를 기반으로 성분 추천, 제품 추천, 식습관 가이드를 확인합니다.",
    to: "/recommendations",
    buttonText: "추천 보기",
    variant: "secondary",
  },
  {
    icon: History,
    title: "분석 이력",
    description: "과거 분석 결과와 추천 내용을 다시 확인하고 변화 흐름을 관리합니다.",
    to: "/history",
    buttonText: "이력 보기",
    variant: "secondary",
  },
  {
    icon: User,
    title: "마이페이지",
    description: "피부 타입, 최근 활동, 분석 횟수 등 내 정보를 한곳에서 확인합니다.",
    to: "/mypage",
    buttonText: "내 정보 보기",
    variant: "secondary",
  },
];

const guideItems = [
  "분석 결과는 의료적 판단이 아닌 피부 관리 참고 정보로 제공됩니다.",
  "색소침착과 주름 지표를 중심으로 현재 피부 상태를 이해할 수 있게 돕습니다.",
  "추천 성분과 제품은 피부 관리 방향을 정리하기 위한 참고 정보입니다.",
];

function formatDate(dateValue) {
  if (!dateValue) return "첫 분석 후 표시";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "첫 분석 후 표시";
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatScore(score) {
  if (score === null || score === undefined || score === "") {
    return null;
  }

  const numberScore = Number(score);

  if (Number.isNaN(numberScore)) {
    return null;
  }

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

  if (Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getMetricValue(metric) {
  const score = getMetricScore(metric);
  const grade = metric?.gradeName || metric?.grade_name || metric?.status || metric?.level;

  if (score > 0 && grade) {
    return `${score}점 · ${getStatusLabel(grade)}`;
  }

  if (score > 0) {
    return `${score}점`;
  }

  if (grade) {
    return getStatusLabel(grade);
  }

  return "첫 분석 후 표시";
}

function normalizeMetricList(latestAnalysis) {
  const metrics = Array.isArray(latestAnalysis?.metrics)
    ? latestAnalysis.metrics
    : [];

  const mvpMetrics = metrics.filter((metric) => {
    const name = getMetricName(metric);
    return name.includes("색소") || name.includes("주름");
  });

  const visibleMetrics = mvpMetrics.length > 0 ? mvpMetrics : metrics;

  if (visibleMetrics.length === 0) {
    return [
      {
        label: "색소침착",
        value: "첫 분석 후 표시",
        score: 0,
      },
      {
        label: "주름",
        value: "첫 분석 후 표시",
        score: 0,
      },
    ];
  }

  return visibleMetrics.slice(0, 2).map((metric) => ({
    label: getMetricName(metric),
    value: getMetricValue(metric),
    score: getMetricScore(metric),
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

  const summary = dashboard?.summary || {};
  const latestAnalysis = dashboard?.latestAnalysis || null;
  const mainConcern = dashboard?.mainConcern || null;
  const nextAction = dashboard?.nextAction || {
    label: "피부 분석 시작하기",
    path: "/analysis/capture",
    description: "첫 분석을 진행하고 맞춤 관리 흐름을 확인해보세요.",
  };

  const latestScore = formatScore(
    latestAnalysis?.totalScore ||
    latestAnalysis?.total_score ||
    summary.latestTotalScore ||
    summary.latest_total_score
  );

  const hasLatestAnalysis = Boolean(latestAnalysis);

  const recentMetrics = useMemo(() => {
    const metrics = normalizeMetricList(latestAnalysis);

    return [
      ...metrics,
      {
        label: "종합 점수",
        value: latestScore === null ? "분석 전" : `${latestScore}점`,
        score: latestScore || 0,
      },
    ];
  }, [latestAnalysis, latestScore]);

  const recentAnalyses = Array.isArray(dashboard?.recentAnalyses)
    ? dashboard.recentAnalyses.slice(0, 3)
    : [];

  const recommendations = Array.isArray(dashboard?.recommendations)
    ? dashboard.recommendations.slice(0, 2)
    : [];

  const dietGuides = Array.isArray(dashboard?.dietGuides)
    ? dashboard.dietGuides.slice(0, 2)
    : [];

  return (
    <PageLayout>
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <Badge>SkinFlow 홈</Badge>

          <h1>
            피부 분석부터 추천까지
            <br />
            한번에 관리하세요
          </h1>

          <p>
            SkinFlow는 얼굴 이미지를 기반으로 피부 상태를 분석하고,
            분석 결과에 따라 성분 추천, 제품 추천, 식습관 가이드,
            분석 이력 관리를 연결해주는 라이프케어 서비스입니다.
          </p>

          <div className="dashboard-actions">
            <Button to={nextAction.path || "/analysis/capture"} size="lg">
              {nextAction.label || "피부 분석 시작하기"} <Camera size={18} />
            </Button>
            <Button to="/recommendations" variant="secondary" size="lg">
              맞춤 추천 보기
            </Button>
          </div>

          {dashboardError && (
            <p className="form-message error">{dashboardError}</p>
          )}
        </div>

        <Card className="dashboard-summary-card">
          <div className="dashboard-summary-top">
            <div>
              <span className="dashboard-card-label">
                {hasLatestAnalysis ? "최근 분석 요약" : "처음 시작하기"}
              </span>
              <h2>
                {hasLatestAnalysis
                  ? "최근 분석 결과를 확인하세요"
                  : "첫 분석을 진행해보세요"}
              </h2>
              <p>
                {isLoading
                  ? "대시보드 정보를 불러오는 중입니다."
                  : hasLatestAnalysis
                    ? latestAnalysis.summary ||
                    latestAnalysis.description ||
                    summary.latestSummary ||
                    "최근 분석 결과와 추천 정보가 준비되었습니다."
                    : nextAction.description ||
                    "분석 완료 후 종합 점수와 추천 정보가 이곳에 표시됩니다."}
              </p>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "72px",
                padding: "0.5rem 0.85rem",
                borderRadius: "999px",
                background: "#E0F2F1",
                color: "#167D7F",
                fontSize: "0.8rem",
                fontWeight: 800,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {getStatusLabel(
                latestAnalysis?.status ||
                latestAnalysis?.analysisStatus ||
                summary.latestStatus
              )}
            </span>
          </div>

          <div className="dashboard-score-visual">
            <div className="dashboard-score-ring">
              <span>{latestScore === null ? 0 : latestScore}</span>
              <small>/100</small>
            </div>
            <div className="dashboard-score-note">
              <ShieldCheck size={18} />
              <span>
                {hasLatestAnalysis
                  ? `최근 분석일: ${formatDate(
                    latestAnalysis.analyzedAt ||
                    latestAnalysis.analyzed_at ||
                    summary.latestAnalyzedAt
                  )}`
                  : "사진 분석 후 결과와 추천이 연결됩니다"}
              </span>
            </div>
          </div>

          <div className="dashboard-metric-list">
            {recentMetrics.map((metric) => (
              <div className="dashboard-metric-row" key={metric.label}>
                <div>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
                <div className="metric-progress">
                  <span style={{ width: `${metric.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="dashboard-section">
        <SectionTitle
          eyebrow="서비스 흐름"
          title="처음 사용하는 사람도 흐름을 바로 이해할 수 있게"
          description="상단 메뉴에 모든 세부 페이지를 나열하지 않고, 핵심 사용 흐름에 따라 분석·추천·이력·내 정보로 자연스럽게 이동할 수 있도록 구성했습니다."
        />

        <div className="dashboard-recommend-grid">
          {flowSteps.map((item) => {
            const Icon = item.icon;

            return (
              <Card className="dashboard-recommend-card" key={item.title}>
                <div className="recommend-icon">
                  <Icon size={24} />
                </div>
                <span className="dashboard-card-label">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Button to={item.to} variant="secondary" size="sm">
                  이동하기 <ChevronRight size={16} />
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <SectionTitle
          eyebrow="빠른 이동"
          title="필요한 기능으로 바로 이동하세요"
          description="분석 시작, 맞춤 추천, 분석 이력, 마이페이지를 카드 형태로 묶어 사용자가 다음 행동을 쉽게 선택할 수 있도록 했습니다."
        />

        <div className="dashboard-recommend-grid">
          {quickActionCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card className="dashboard-recommend-card" key={item.title}>
                <div className="recommend-icon">
                  <Icon size={24} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <Button
                  to={item.to}
                  variant={item.variant === "primary" ? "primary" : "secondary"}
                  size="sm"
                >
                  {item.buttonText} <ChevronRight size={16} />
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <Card className="dashboard-history-card">
          <div className="card-title-row">
            <div>
              <span className="dashboard-card-label">
                {hasLatestAnalysis ? "최근 분석 이력" : "다음 단계"}
              </span>
              <h2>
                {hasLatestAnalysis
                  ? "최근 분석 흐름을 확인하세요"
                  : "추천 확인 전, 분석이 먼저 필요해요"}
              </h2>
            </div>
            <Button
              to={hasLatestAnalysis ? "/history" : "/analysis/capture"}
              variant="ghost"
              size="sm"
            >
              {hasLatestAnalysis ? "이력 보기" : "분석 시작"}{" "}
              <ArrowRight size={16} />
            </Button>
          </div>

          <div className="history-list">
            {recentAnalyses.length > 0 ? (
              recentAnalyses.map((analysis, index) => (
                <div
                  className="history-item"
                  key={analysis.analysisId || analysis.id || index}
                >
                  <div className="history-date-icon">
                    <CalendarDays size={18} />
                  </div>
                  <div className="history-content">
                    <strong>
                      {formatDate(analysis.analyzedAt || analysis.analyzed_at)}
                    </strong>
                    <span>
                      {analysis.summary ||
                        `${getStatusLabel(analysis.status)} 상태로 기록되었습니다.`}
                    </span>
                  </div>
                  <div className="history-score">
                    <strong>
                      {formatScore(
                        analysis.totalScore || analysis.total_score
                      ) ?? "-"}
                    </strong>
                    <span>점수</span>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="history-item">
                  <div className="history-date-icon">
                    <CalendarDays size={18} />
                  </div>
                  <div className="history-content">
                    <strong>1단계. 피부 분석</strong>
                    <span>색소침착과 주름 중심으로 피부 상태를 분석합니다.</span>
                  </div>
                  <div className="history-score">
                    <strong>01</strong>
                    <span>시작</span>
                  </div>
                </div>

                <div className="history-item">
                  <div className="history-date-icon">
                    <Sparkles size={18} />
                  </div>
                  <div className="history-content">
                    <strong>2단계. 맞춤 추천</strong>
                    <span>분석 결과에 맞는 성분, 제품, 식습관 가이드를 확인합니다.</span>
                  </div>
                  <div className="history-score">
                    <strong>02</strong>
                    <span>추천</span>
                  </div>
                </div>

                <div className="history-item">
                  <div className="history-date-icon">
                    <History size={18} />
                  </div>
                  <div className="history-content">
                    <strong>3단계. 이력 관리</strong>
                    <span>분석 이력에서 이전 결과와 추천 내용을 다시 확인합니다.</span>
                  </div>
                  <div className="history-score">
                    <strong>03</strong>
                    <span>관리</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="dashboard-guide-card">
          <div className="guide-card-icon">
            <ClipboardList size={28} />
          </div>

          <h2>
            {mainConcern
              ? `${getMetricName(mainConcern)} 관리 가이드`
              : "오늘의 관리 가이드"}
          </h2>
          <p>
            {mainConcern
              ? getItemDescription(
                mainConcern,
                "최근 분석 결과에서 우선 관리가 필요한 항목입니다. 아래 추천과 식습관 가이드를 함께 확인해보세요."
              )
              : "피부 관리는 한 번의 결과보다 꾸준한 기록과 생활 습관 관리가 중요합니다. 아래 내용은 피부 관리에 참고할 수 있는 일반 가이드입니다."}
          </p>

          <div className="guide-check-list">
            {recommendations.length > 0 || dietGuides.length > 0 ? (
              <>
                {recommendations.map((item, index) => (
                  <label key={`recommendation-${index}`}>
                    <CheckCircle2 size={18} />
                    <span>
                      {getItemTitle(item, "추천 정보")} -{" "}
                      {getItemDescription(item, "분석 결과 기반 추천입니다.")}
                    </span>
                  </label>
                ))}
                {dietGuides.map((item, index) => (
                  <label key={`diet-${index}`}>
                    <CheckCircle2 size={18} />
                    <span>
                      {getItemTitle(item, "식습관 가이드")} -{" "}
                      {getItemDescription(
                        item,
                        "피부 관리에 참고할 수 있는 식습관 가이드입니다."
                      )}
                    </span>
                  </label>
                ))}
              </>
            ) : (
              guideItems.map((item) => (
                <label key={item}>
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </label>
              ))
            )}
          </div>

          <Button to="/diet-guide" full>
            식습관 가이드 보기 <Leaf size={18} />
          </Button>
        </Card>
      </section>
    </PageLayout>
  );
}

export default DashboardPage;