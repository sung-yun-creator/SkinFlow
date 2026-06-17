import { useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  History,
  Info,
  Leaf,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";


const ANALYSIS_RESULT_KEY = "skinflow_latest_analysis_result";

function readLatestAnalysisResult() {
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_RESULT_KEY) || "null");
  } catch {
    return null;
  }
}

function getMetricColor(code, index) {
  if (code === "pigmentation") return "#167D7F";
  if (code === "wrinkle") return "#22C5C8";
  return index % 2 === 0 ? "#167D7F" : "#14B8A6";
}

function toScore(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const score = Number(value);

  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function isCompletedAnalysisResult(analysisResult) {
  const status =
    analysisResult?.analysisStatus ??
    analysisResult?.analysis_status ??
    analysisResult?.latestStatus ??
    analysisResult?.latest_status ??
    analysisResult?.status;
  const code = analysisResult?.code;
  const normalizedStatus = String(status || "").toLowerCase();
  const normalizedCode = String(code || "").toLowerCase();

  if (["ai_model_pending", "pending", "processing"].includes(normalizedStatus)) {
    return false;
  }

  if (["ai_model_pending", "pending", "processing"].includes(normalizedCode)) {
    return false;
  }

  if (status !== null && status !== undefined && String(status).trim() !== "") {
    return normalizedStatus === "completed";
  }

  return true;
}

function buildMetricCards(analysisResult) {
  if (!analysisResult?.saved || !isCompletedAnalysisResult(analysisResult)) {
    return [];
  }

  const totalScore = toScore(
    analysisResult.totalScore ??
      analysisResult.totalSkinScore ??
      analysisResult.total_skin_score ??
      analysisResult.score
  );
  const metricCards = [];

  if (totalScore !== null) {
    metricCards.push({
      label: "종합 점수",
      value: totalScore,
      status: analysisResult.grade?.name || "분석 완료",
      color: "#167D7F",
    });
  }

  if (Array.isArray(analysisResult.metrics)) {
    metricCards.push(
      ...analysisResult.metrics
        .map((metric, index) => {
          const metricScore = toScore(
            metric.score ??
              metric.metricScore ??
              metric.metric_score ??
              metric.value ??
              metric.metricValue ??
              metric.metric_value
          );

          if (metricScore === null) {
            return null;
          }

          return {
            label: metric.name || metric.code || `지표 ${index + 1}`,
            value: metricScore,
            status: metric.grade?.name || metric.gradeName || metric.grade_name || "분석 완료",
            color: getMetricColor(metric.code, index),
          };
        })
        .filter(Boolean),
    );
  }

  return metricCards;
}

const emptyResultMessages = {
  pending: {
    title: "AI 모델 연결 대기",
    description:
      "AI 모델의 점수가 아직 준비되지 않아 점수 카드를 표시하지 않습니다. 결과가 준비되면 색소침착·주름 점수가 이 영역에 표시됩니다.",
  },
  empty: {
    title: "표시할 분석 결과가 없습니다",
    description:
      "아직 저장된 분석 결과가 없습니다. 업로드 또는 웹캠 촬영으로 분석을 진행하면 결과를 표시합니다.",
  },
  noScore: {
    title: "분석 결과 없음",
    description:
      "표시 가능한 점수 데이터가 없어 점수 카드와 원형 그래프를 표시하지 않습니다. 분석 완료 후 점수가 연결되면 이 영역에 표시됩니다.",
  },
};

const nextCards = [
  {
    icon: Sparkles,
    title: "기능성 성분 추천",
    description: "색소침착·주름 결과를 기준으로 관리에 참고할 성분을 연결합니다.",
    to: "/recommendations",
    badge: "추천",
  },
  {
    icon: Leaf,
    title: "식습관 가이드",
    description: "피부 관리에 참고할 수 있는 오늘의 생활 관리 항목을 확인합니다.",
    to: "/diet-guide",
    badge: "가이드",
  },
  {
    icon: History,
    title: "분석 이력 관리",
    description: "날짜별 분석 결과와 변화 흐름을 다시 확인합니다.",
    to: "/history",
    badge: "이력",
  },
];

const emptyResultNoticeItems = [
  "저장된 분석 결과가 없을 때는 임의 점수를 표시하지 않습니다.",
  "AI 모델 연결 전에는 pending 상태를 안내하고 가짜 이력을 생성하지 않습니다.",
  "업로드 이미지와 웹캠 촬영 이미지는 같은 분석 요청 흐름으로 처리됩니다.",
];

function AnalysisResultPage() {
  const latestAnalysis = useMemo(() => readLatestAnalysisResult(), []);
  const analysisResult = latestAnalysis?.result || null;
  const hasSavedResult = Boolean(analysisResult?.saved);
  const normalizedResultStatus = String(
    analysisResult?.code ||
      analysisResult?.analysisStatus ||
      analysisResult?.analysis_status ||
      analysisResult?.latestStatus ||
      analysisResult?.latest_status ||
      analysisResult?.status ||
      ""
  ).toLowerCase();
  const isPending =
    normalizedResultStatus === "ai_model_pending" ||
    normalizedResultStatus === "pending" ||
    normalizedResultStatus === "processing";
  const metricCards = useMemo(
    () => buildMetricCards(analysisResult),
    [analysisResult],
  );

  const hasDisplayableMetrics = hasSavedResult && metricCards.length > 0;
  const emptyResultMessage = isPending
    ? emptyResultMessages.pending
    : hasSavedResult
      ? emptyResultMessages.noScore
      : emptyResultMessages.empty;

  const heroBadge = hasDisplayableMetrics
    ? "Analysis Result"
    : isPending
      ? "AI 모델 연결 대기"
      : "분석 결과 없음";

  const summaryBadge = hasDisplayableMetrics
    ? "결과 반영 완료"
    : isPending
      ? "저장 보류"
      : "점수 미표시";

  const summaryTitle = hasDisplayableMetrics
    ? "색소침착·주름 분석 결과"
    : isPending
      ? "AI 모델 응답 대기 상태"
      : hasSavedResult
        ? "분석 결과 없음"
        : "실제 분석 결과 대기";

  const summaryText = hasDisplayableMetrics
    ? analysisResult.summary || "색소침착과 주름 지표를 기준으로 산출한 분석 결과입니다."
    : isPending
      ? analysisResult.message || "AI 모델 분석 결과가 아직 준비되지 않았습니다."
      : hasSavedResult
        ? "저장된 응답에 표시 가능한 점수 데이터가 없어 실제 결과처럼 보이는 점수는 표시하지 않습니다."
        : "아직 표시할 실제 분석 결과가 없습니다. 분석을 진행하면 저장된 결과를 기준으로 표시합니다.";

  const noticeItems = hasDisplayableMetrics
    ? [
      "저장된 분석 결과의 점수와 등급을 표시합니다.",
      "색소침착·주름 지표를 중심으로 결과를 정리합니다.",
      "추천·식습관 가이드는 별도 화면에서 이어서 확인합니다.",
    ]
    : isPending
      ? [
        "AI 모델이 아직 실제 점수를 반환하지 않아 분석 이력 저장은 보류되었습니다.",
        "현재 상태에서는 가짜 점수나 가짜 이력을 생성하지 않습니다.",
        "AI 모델 연결 완료 후 같은 흐름으로 결과를 표시할 수 있습니다.",
      ]
      : hasSavedResult
        ? [
          "점수 데이터가 없으면 기본 점수로 대체하지 않습니다.",
          "유효한 숫자 점수가 있을 때만 점수 카드를 표시합니다.",
          "점수 표시 가능 여부를 분리해 결과처럼 보이지 않게 안내합니다.",
        ]
        : emptyResultNoticeItems;

  return (
    <PageLayout>
      <style>
        {`
          .sf-result-page {
            display: grid;
            gap: 18px;
            padding-top: 16px;
          }

          .sf-result-hero {
            display: grid;
            grid-template-columns: minmax(330px, 0.9fr) minmax(0, 1.1fr);
            gap: 18px;
            align-items: stretch;
          }

          .sf-result-face-card,
          .sf-result-summary-card,
          .sf-result-next-card,
          .sf-result-notice-card {
            border: 1px solid rgba(226, 232, 240, 0.92);
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.94);
            box-shadow: 0 20px 52px rgba(15, 23, 42, 0.07);
          }

          .sf-result-face-card {
            padding: 24px;
          }

          .sf-result-section-label {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: -0.02em;
          }

          .sf-result-face-card h1 {
            margin: 8px 0 16px;
            color: #0f172a;
            font-size: clamp(28px, 4vw, 42px);
            line-height: 1.08;
            letter-spacing: -0.07em;
          }

          .sf-result-gradient-text {
            display: inline-block;
            background: linear-gradient(90deg, #167d7f 0%, #14b8a6 52%, #22c5c8 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .sf-result-face-card p,
          .sf-result-summary-card p,
          .sf-result-next-item p,
          .sf-result-notice-card p {
            margin: 0;
            color: #64748b;
            font-size: 14px;
            line-height: 1.75;
            word-break: keep-all;
          }

          .sf-result-face-map {
            position: relative;
            min-height: 310px;
            margin-top: 18px;
            overflow: hidden;
            border-radius: 24px;
            border: 1px solid rgba(226, 232, 240, 0.86);
            background:
              radial-gradient(circle at 82% 84%, rgba(20, 184, 166, 0.13), transparent 28%),
              radial-gradient(circle at 18% 12%, rgba(22, 125, 127, 0.11), transparent 30%),
              linear-gradient(135deg, #f0fdfa 0%, #ffffff 48%, #f8fafc 100%);
          }

          .sf-result-face-oval {
            position: absolute;
            left: 50%;
            top: 52%;
            width: 170px;
            height: 238px;
            transform: translate(-50%, -50%);
            border-radius: 999px;
            background: rgba(22, 125, 127, 0.16);
          }

          .sf-result-roi-box {
            position: absolute;
            display: grid;
            place-items: center;
            border-radius: 16px;
            border: 2px dashed #167d7f;
            background: rgba(255, 255, 255, 0.2);
          }

          .sf-result-roi-label {
            position: absolute;
            top: -27px;
            left: 50%;
            transform: translateX(-50%);
            padding: 5px 9px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
            font-size: 11px;
            font-weight: 950;
            white-space: nowrap;
          }

          .sf-result-roi-forehead {
            width: 68px;
            height: 48px;
            left: 27%;
            top: 21%;
          }

          .sf-result-roi-cheek {
            width: 68px;
            height: 44px;
            left: 35%;
            bottom: 17%;
          }

          .sf-result-roi-wrinkle {
            width: 66px;
            height: 44px;
            right: 18%;
            top: 45%;
            border-color: #f59e0b;
          }

          .sf-result-roi-wrinkle .sf-result-roi-label {
            color: #f59e0b;
          }

          .sf-result-roi-note {
            margin: 10px 0 0;
            color: #64748b;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.5;
            word-break: keep-all;
          }

          .sf-result-summary-card {
            padding: 24px;
            display: grid;
            gap: 16px;
          }

          .sf-result-summary-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
          }

          .sf-result-summary-top h2 {
            margin: 6px 0 0;
            color: #0f172a;
            font-size: 27px;
            line-height: 1.16;
            letter-spacing: -0.055em;
          }

          .sf-result-score-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .sf-result-score-card {
            min-height: 132px;
            padding: 16px;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.88);
            background:
              radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.06), transparent 32%),
              #f8fafc;
          }

          .sf-result-score-ring {
            width: 72px;
            height: 72px;
            margin-bottom: 12px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle, #ffffff 56%, transparent 58%),
              conic-gradient(var(--metric-color) 0 var(--metric-value), #e2e8f0 var(--metric-value) 100%);
          }

          .sf-result-score-ring strong {
            color: #0f172a;
            font-size: 20px;
            line-height: 1;
            letter-spacing: -0.05em;
          }

          .sf-result-score-card span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
          }

          .sf-result-score-card h3 {
            margin: 4px 0 0;
            color: #0f172a;
            font-size: 15px;
            letter-spacing: -0.035em;
          }

          .sf-result-empty-state {
            display: grid;
            grid-template-columns: 48px 1fr;
            gap: 14px;
            align-items: start;
            min-height: 132px;
            padding: 18px;
            border-radius: 22px;
            border: 1px dashed rgba(20, 184, 166, 0.42);
            background:
              radial-gradient(circle at 100% 0%, rgba(20, 184, 166, 0.08), transparent 34%),
              #f8fafc;
          }         

          .sf-result-empty-state .sf-result-icon-tile {
            background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 52%, #ecfeff 100%);
          }

          .sf-result-empty-state strong {
            display: block;
            margin-bottom: 6px;
            color: #0f172a;
            font-size: 16px;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .sf-result-empty-state p {
            color: #64748b;
            font-size: 13px;
            font-weight: 750;
            line-height: 1.65;
          }

          .sf-result-comment {
            display: grid;
            grid-template-columns: 44px 1fr;
            gap: 14px;
            align-items: start;
            padding: 18px;
            border-radius: 22px;
            color: #ffffff;
            background: #0f172a;
          }

          .sf-result-comment strong {
            display: block;
            margin-bottom: 5px;
            color: #5eead4;
            font-size: 13px;
            font-weight: 950;
          }

          .sf-result-comment p {
            color: rgba(255, 255, 255, 0.88);
            font-weight: 700;
          }

          .sf-result-icon-tile {
            width: 44px;
            height: 44px;
            min-width: 44px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            color: #167d7f;
            background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 50%, #ecfeff 100%);
            border: 1px solid rgba(226, 232, 240, 0.88);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
          }

          .sf-result-icon-tile svg {
            display: block;
            width: 20px;
            height: 20px;
            stroke-width: 2.1;
          }

          .sf-result-lower-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
            gap: 18px;
            align-items: start;
          }

          .sf-result-next-card,
          .sf-result-notice-card {
            padding: 22px;
          }

          .sf-result-card-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 16px;
          }

          .sf-result-card-head h2 {
            margin: 6px 0 0;
            color: #0f172a;
            font-size: 22px;
            letter-spacing: -0.05em;
          }

          .sf-result-next-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .sf-result-next-item {
            min-height: 172px;
            padding: 16px;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.88);
            background:
              radial-gradient(circle at 100% 0%, rgba(20, 184, 166, 0.055), transparent 34%),
              #f8fafc;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .sf-result-next-item:hover {
            transform: translateY(-2px);
            border-color: rgba(22, 125, 127, 0.22);
            box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
          }

          .sf-result-next-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 18px;
          }

          .sf-result-next-badge {
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 950;
          }

          .sf-result-next-item h3 {
            margin: 0 0 8px;
            color: #0f172a;
            font-size: 16px;
            letter-spacing: -0.04em;
          }

          .sf-result-next-item .sf-button {
            margin-top: 14px;
          }

          .sf-result-notice-list {
            display: grid;
            gap: 10px;
            margin-top: 16px;
          }

          .sf-result-notice-item {
            display: grid;
            grid-template-columns: 34px 1fr;
            gap: 10px;
            align-items: center;
            padding: 12px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(226, 232, 240, 0.86);
            color: #334155;
            font-size: 13px;
            font-weight: 750;
            line-height: 1.55;
          }

          .sf-result-notice-item svg {
            color: #167d7f;
          }

          .sf-result-notice-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 16px;
          }

          @media (max-width: 1040px) {
            .sf-result-hero,
            .sf-result-lower-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 760px) {
            .sf-result-page {
              gap: 14px;
            }

            .sf-result-face-card,
            .sf-result-summary-card,
            .sf-result-next-card,
            .sf-result-notice-card {
              border-radius: 24px;
              padding: 18px;
            }

            .sf-result-score-grid,
            .sf-result-next-grid,
            .sf-result-notice-actions {
              grid-template-columns: 1fr;
            }

            .sf-result-face-map {
              min-height: 260px;
            }

            .sf-result-comment {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="sf-result-page">
        <section className="sf-result-hero">
          <div className="sf-result-face-card">
            <Badge>{heroBadge}</Badge>
            <h1>
              피부 상태를
              <br />
              <span className="sf-result-gradient-text">한눈에 확인하세요</span>
            </h1>
            <p>
              {hasDisplayableMetrics
                ? "저장된 색소침착·주름 지표를 보기 쉽게 정리했습니다."
                : isPending
                  ? "AI 모델이 아직 실제 점수를 반환하지 않아 저장 보류 상태를 안내합니다."
                  : "분석 결과가 없을 때는 임의 점수를 표시하지 않고, 다음 행동을 안내합니다."}
            </p>

            <div className="sf-result-face-map" aria-label="피부 관심 영역 시각 안내">
              <span className="sf-result-face-oval" />
              <span className="sf-result-roi-box sf-result-roi-forehead">
                <span className="sf-result-roi-label">이마 / T존</span>
              </span>
              <span className="sf-result-roi-box sf-result-roi-cheek">
                <span className="sf-result-roi-label">볼 색소</span>
              </span>
              <span className="sf-result-roi-box sf-result-roi-wrinkle">
                <span className="sf-result-roi-label">눈가 주름</span>
              </span>
            </div>
            <p className="sf-result-roi-note">
              점선 영역은 관심 부위를 설명하는 시각 안내이며 실제 검출 위치나 크기를 의미하지 않습니다.
            </p>
          </div>

          <div className="sf-result-summary-card">
            <div className="sf-result-summary-top">
              <div>
                <span className="sf-result-section-label">분석 결과</span>
                <h2>{summaryTitle}</h2>
              </div>
              <Badge variant="secondary">{summaryBadge}</Badge>
            </div>

            {hasDisplayableMetrics ? (
              <div className="sf-result-score-grid">
                {metricCards.map((metric) => (
                  <div className="sf-result-score-card" key={metric.label}>
                    <div
                      className="sf-result-score-ring"
                      style={{
                        "--metric-color": metric.color,
                        "--metric-value": `${metric.value}%`,
                      }}
                    >
                      <strong>{metric.value}</strong>
                    </div>
                    <span>{metric.status}</span>
                    <h3>{metric.label}</h3>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sf-result-empty-state">
                <span className="sf-result-icon-tile" aria-hidden="true">
                  <Info size={20} />
                </span>
                <div>
                  <strong>{emptyResultMessage.title}</strong>
                  <p>{emptyResultMessage.description}</p>
                </div>
              </div>
            )}

            <div className="sf-result-comment">
              <span className="sf-result-icon-tile" aria-hidden="true">
                <Sparkles size={20} />
              </span>
              <div>
                <strong>{hasDisplayableMetrics ? "AI 분석 요약" : isPending ? "AI 모델 연결 대기" : "분석 상태 안내"}</strong>
                <p>{summaryText}</p>
              </div>
            </div>

            <div className="sf-result-notice-item">
              <Info size={18} />
              <span>
                SkinFlow의 분석 결과는 피부 관리 참고 정보이며, 의료적 판단이나
                치료 목적의 정보가 아닙니다.
              </span>
            </div>
          </div>
        </section>

        <section className="sf-result-lower-grid">
          <div className="sf-result-next-card">
            <div className="sf-result-card-head">
              <div>
                <span className="sf-result-section-label">다음 확인 화면</span>
                <h2>분석 이후 이어지는 관리 흐름</h2>
              </div>
              <Badge>짧은 흐름</Badge>
            </div>

            <div className="sf-result-next-grid">
              {nextCards.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article className="sf-result-next-item" key={item.title}>
                    <div className="sf-result-next-head">
                      <span className="sf-result-icon-tile" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <span className="sf-result-next-badge">0{index + 1}</span>
                    </div>

                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <Button to={item.to} variant="secondary" size="sm">
                      {item.badge} 보기
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="sf-result-notice-card">
            <div className="sf-result-card-head">
              <div>
                <span className="sf-result-section-label">연동 상태</span>
                <h2>{hasDisplayableMetrics ? "실제 결과 반영 완료" : isPending ? "AI 모델 연결 대기" : "실제 결과가 없습니다"}</h2>
              </div>
              <ClipboardCheck size={26} />
            </div>

            <p>
              {hasDisplayableMetrics
                ? "저장된 분석 결과를 기준으로 결과 화면을 구성했습니다."
                : isPending
                  ? "현재는 AI 모델이 실제 점수를 반환하지 않아 저장되지 않은 상태입니다."
                  : "현재 저장된 분석 결과가 없어 점수 카드를 표시하지 않습니다. 분석 결과가 저장되면 이 화면에 반영됩니다."}
            </p>

            <div className="sf-result-notice-list">
              {noticeItems.map((item) => (
                <div className="sf-result-notice-item" key={item}>
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="sf-result-notice-actions">
              <Button to="/analysis/capture" variant="secondary" full>
                다시 분석 <RotateCcw size={17} />
              </Button>
              <Button to="/dashboard" full>
                대시보드 <ArrowRight size={17} />
              </Button>
            </div>
          </aside>
        </section>
      </div>
    </PageLayout>
  );
}

export default AnalysisResultPage;
