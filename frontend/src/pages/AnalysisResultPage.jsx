// 분석 결과 페이지입니다.
// 분석이 완료된 결과를 localStorage에서 읽어 종합 점수, 지표별 점수, 추천 이동 흐름을 보여주는 화면입니다.
// 이 파일은 화면 표시와 사용자 동작 처리를 담당하며, 백엔드/DB/AI 로직은 여기서 직접 수정하지 않습니다.
// 주석은 코드 흐름 이해를 돕기 위한 설명이며 실제 동작에는 영향을 주지 않습니다.
import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  History,
  Info,
  Leaf,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import { AUTH_STORAGE_KEYS } from "../api/authSession";
import { getHistoryDetail } from "../api/historyApi";
import {
  getScoreGradeLabel,
  isCompletedAnalysisResult,
} from "../utils/analysisStatus";
  // 분석 진행 화면에서 저장한 최신 분석 결과를 꺼내기 위한 localStorage 키입니다.


const ANALYSIS_RESULT_KEY = "skinflow_latest_analysis_result";
 // 분석 진행 화면에서 저장해 둔 최신 분석 결과를 localStorage에서 읽어옵니다.

function readLatestAnalysisResult() {
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_RESULT_KEY) || "null");
  } catch {
    return null;
  }
}

function mapHistoryDetailToAnalysisResult(detail) {
  if (!detail) return null;

  return {
    saved: true,
    analysisId: detail.analysisId ?? detail.analysis_id ?? null,
    analyzedAt: detail.analyzedAt ?? detail.analyzed_at ?? null,
    totalScore: detail.totalScore ?? detail.total_score ?? detail.totalSkinScore ?? null,
    status: detail.status || "completed",
    analysisStatus: detail.status || "completed",
    grade: {
      name: detail.gradeName || detail.grade_name || "분석 완료",
    },
    gradeName: detail.gradeName || detail.grade_name || null,
    scoreGrade: detail.scoreGrade ?? detail.score_grade ?? null,
    summary: detail.summary || null,
    metrics: Array.isArray(detail.metrics)
      ? detail.metrics.map((metric) => ({
          ...metric,
          metricScore: metric.score ?? metric.metricScore ?? metric.metric_score,
          gradeName: metric.gradeName ?? metric.grade_name ?? metric.grade ?? null,
        }))
      : [],
  };
}

function hasLoginToken() {
  return typeof window !== "undefined" && Boolean(localStorage.getItem(AUTH_STORAGE_KEYS.token));
}
 // 색소침착/주름 지표를 화면에서 구분하기 위한 색상을 정합니다.

function getMetricColor(code, index) {
  if (code === "pigmentation") return "#167D7F";
  if (code === "wrinkle") return "#22C5C8";
  return index % 2 === 0 ? "#167D7F" : "#14B8A6";
}
 // 백엔드나 화면 문구에서 내려온 등급 문장을 짧은 등급명으로 정리합니다.

function normalizeGradeLabel(status) {
  const normalizedStatus = String(status || "").replace(/\s/g, "");

  if (!normalizedStatus || normalizedStatus === "분석완료") {
    return null;
  }

  if (normalizedStatus.includes("양호")) return "양호";
  if (normalizedStatus.includes("주의")) return "주의";
  if (
    normalizedStatus.includes("관리") ||
    normalizedStatus.includes("위험") ||
    normalizedStatus.includes("심각") ||
    normalizedStatus.includes("집중")
  ) {
    return "관리필요";
  }

  return null;
}
 // 점수와 등급에 따라 배지 색상, 안내 문구, 관리 방향 문구를 정합니다.

function getScoreGradeMeta(score, status) {
  const label =
    normalizeGradeLabel(status) ||
    (score >= 80 ? "양호" : score >= 60 ? "주의" : "관리필요");

  const gradeMap = {
    양호: {
      label: "양호",
      description: "좋은 상태로 관리 흐름을 유지해도 됩니다.",
      color: "#167D7F",
      bg: "rgba(22, 125, 127, 0.11)",
      barBg: "rgba(22, 125, 127, 0.16)",
    },
    주의: {
      label: "주의",
      description: "생활 습관과 관리 루틴을 한 번 더 체크해 보세요.",
      color: "#F59E0B",
      bg: "rgba(245, 158, 11, 0.14)",
      barBg: "rgba(245, 158, 11, 0.18)",
    },
    관리필요: {
      label: "관리필요",
      description: "우선 관리 항목으로 보고 꾸준한 관리가 권장됩니다.",
      color: "#F43F5E",
      bg: "rgba(244, 63, 94, 0.12)",
      barBg: "rgba(244, 63, 94, 0.16)",
    },
  };

  return gradeMap[label] || gradeMap.관리필요;
}
 // 점수 값을 0~100 사이의 숫자로 안전하게 변환합니다.

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

// 점수 카드 생성은 saved=true이고 위 완료 여부 확인을 통과한 결과에만 진행합니다.
// 임시값이나 null 점수를 기본 점수로 채우지 않아 실제 응답 기준 UI를 유지합니다.
// API 지표 배열을 결과 카드에서 바로 쓸 수 있는 형태로 바꿉니다.
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
  // API 지표 배열 전체를 카드 표시용 데이터로 변환합니다.
  const metricCards = [];

  if (totalScore !== null) {
    metricCards.push({
      label: "종합 점수",
      value: totalScore,
      status: analysisResult.grade?.name || "분석 완료",
      // scoreGrade는 A~E 점수 보조 정보이며 아래 gradeMeta의 상태 라벨과 별도로 유지합니다.
      scoreGrade: getScoreGradeLabel(analysisResult.scoreGrade ?? analysisResult.score_grade),
      gradeMeta: getScoreGradeMeta(totalScore, analysisResult.grade?.name),
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

          const metricStatus =
            metric.grade?.name || metric.gradeName || metric.grade_name || "분석 완료";
          const metricCode = metric.code || metric.metricCode || metric.metric_code;

          return {
            label: metric.name || metric.metricName || metric.metric_name || metricCode || `지표 ${index + 1}`,
            value: metricScore,
            status: metricStatus,
            scoreGrade: getScoreGradeLabel(metric.scoreGrade ?? metric.score_grade),
            gradeMeta: getScoreGradeMeta(metricScore, metricStatus),
            color: getMetricColor(metricCode, index),
          };
        })
        .filter(Boolean),
    );
  }

  return metricCards;
}

// 저장된 결과를 이용해 화면용 요약 문장을 구성하며 추가 AI 요청은 하지 않습니다.
// 저장된 점수와 지표명만 사용하고 새로운 분석값을 임의로 만들지는 않습니다.
function buildAiSummary({ analysisResult, metricCards, hasDisplayableMetrics, isPending, hasSavedResult }) {
  if (!hasDisplayableMetrics) {
    return {
      title: isPending ? "AI 모델 연결 대기" : "분석 상태 안내",
      lead: isPending
        ? analysisResult?.message || "AI 모델 분석 결과가 아직 준비되지 않았습니다."
        : hasSavedResult
          ? "저장된 응답에 표시 가능한 점수 데이터가 없어 실제 결과처럼 보이는 점수는 표시하지 않습니다."
          : "아직 표시할 실제 분석 결과가 없습니다. 분석을 진행하면 저장된 결과를 기준으로 표시합니다.",
      points: [],
    };
  }

  const totalCard = metricCards.find((card) => card.label === "종합 점수");
  const detailCards = metricCards.filter((card) => card.label !== "종합 점수");
  const lowestMetric = detailCards.reduce(
    (lowest, card) => (!lowest || card.value < lowest.value ? card : lowest),
    null,
  );
  const highestMetric = detailCards.reduce(
    (highest, card) => (!highest || card.value > highest.value ? card : highest),
    null,
  );
  const totalLabel = totalCard?.gradeMeta?.label || analysisResult?.grade?.name || "분석 완료";
  const totalScoreText = totalCard ? `${totalCard.value}점` : "저장된 분석 결과";

  const leadMap = {
    양호: "전반적으로 양호한 피부 관리 흐름을 유지하고 있습니다.",
    주의: "일부 지표에서 관리 우선순위를 확인할 필요가 있습니다.",
    관리필요: "낮게 표시된 지표를 우선 관리 항목으로 보고 꾸준히 관리 방향을 확인해보세요.",
  };

  const points = [
    `종합 점수 ${totalScoreText} 기준으로 현재 상태는 ${totalLabel} 범위로 표시됩니다.`,
  ];

  if (lowestMetric && highestMetric && lowestMetric.label !== highestMetric.label) {
    points.push(
      `${lowestMetric.label} ${lowestMetric.value}점, ${highestMetric.label} ${highestMetric.value}점으로 확인되며 ${lowestMetric.label} 항목을 먼저 살펴보면 좋습니다.`,
    );
    points.push(
      `추천 성분과 식습관 가이드에서 ${lowestMetric.label} 관리 방향을 이어서 확인해보세요.`,
    );
  } else if (lowestMetric) {
    points.push(
      `${lowestMetric.label} ${lowestMetric.value}점 기준으로 추천 성분과 관리 가이드를 함께 확인해보세요.`,
    );
  } else {
    points.push("분석 결과 기반 추천 화면에서 성분, 제품, 식습관 가이드를 이어서 확인할 수 있습니다.");
  }

  return {
    title: "AI 분석 요약",
    lead: analysisResult?.summary && analysisResult.summary.length > 35
      ? analysisResult.summary
      : leadMap[totalLabel] || "분석 결과를 기준으로 관리 방향을 정리했습니다.",
    points,
  };
}
 // 분석 결과가 없거나 대기 상태일 때 사용자에게 보여줄 안내 문구 모음입니다.

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
 // 결과 확인 후 사용자가 이동할 수 있는 다음 행동 카드 목록입니다.

const nextCards = [
  {
    icon: Sparkles,
    title: "기능성 성분 추천",
    description: "색소침착·주름 분석 결과를 기준으로 관리에 참고할 성분을 연결합니다.",
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
 // 결과 없음 화면에서 보여줄 주의/안내 항목입니다.

const emptyResultNoticeItems = [
  "저장된 분석 결과가 없을 때는 임의 점수를 표시하지 않습니다.",
  "AI 모델 연결 전에는 pending 상태를 안내하고 가짜 이력을 생성하지 않습니다.",
  "업로드 이미지와 웹캠 촬영 이미지는 같은 분석 요청 흐름으로 처리됩니다.",
];
 // 분석 결과 화면 전체를 담당하는 React 컴포넌트입니다.

function AnalysisResultPage() {
  const isLoggedIn = hasLoginToken();
  const [searchParams] = useSearchParams();
  const requestedAnalysisId = String(searchParams.get("analysisId") || "").trim();
  const [historyAnalysisResult, setHistoryAnalysisResult] = useState(null);
  const [isHistoryResultLoading, setIsHistoryResultLoading] = useState(false);
  const [historyResultError, setHistoryResultError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHistoryAnalysisResult() {
      if (!isLoggedIn || !requestedAnalysisId) {
        setHistoryAnalysisResult(null);
        setHistoryResultError("");
        setIsHistoryResultLoading(false);
        return;
      }

      setIsHistoryResultLoading(true);
      setHistoryResultError("");

      try {
        const detail = await getHistoryDetail(requestedAnalysisId);

        if (!isMounted) return;

        setHistoryAnalysisResult(mapHistoryDetailToAnalysisResult(detail));
      } catch (error) {
        if (!isMounted) return;

        console.error("분석 이력 결과 조회 실패:", error);
        setHistoryAnalysisResult(null);
        setHistoryResultError("선택한 분석 이력의 결과를 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsHistoryResultLoading(false);
        }
      }
    }

    loadHistoryAnalysisResult();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, requestedAnalysisId]);

  // 이 화면은 API를 다시 호출하지 않고 localStorage에 저장된 최신 분석 결과를 읽어 표시합니다.
  const latestAnalysis = useMemo(
    () => (isLoggedIn ? readLatestAnalysisResult() : null),
    [isLoggedIn],
  );
  const analysisResult = requestedAnalysisId ? historyAnalysisResult : latestAnalysis?.result || null;
  const hasSavedResult = Boolean(analysisResult?.saved);
  const normalizedResultStatus = String(
    analysisResult?.analysisStatus ||
      analysisResult?.analysis_status ||
      analysisResult?.latestStatus ||
      analysisResult?.latest_status ||
      analysisResult?.status ||
      ""
  ).trim().toLowerCase();
  const normalizedResultCode = String(analysisResult?.code || "").trim().toLowerCase();
  const hasCompletedResult = isCompletedAnalysisResult(analysisResult);
  // AI_MODEL_PENDING과 pending/processing은 오류가 아니라 결과 생성 전 상태로 안내합니다.
  const isPending =
    normalizedResultCode === "ai_model_pending" ||
    normalizedResultStatus === "ai_model_pending" ||
    normalizedResultStatus === "pending" ||
    normalizedResultStatus === "processing";
  const metricCards = useMemo(
    () => buildMetricCards(analysisResult),
    [analysisResult],
  );

  // 화면 표시 가능 여부를 따로 계산해 빈 상태, 대기 상태, 점수 표시 상태를 명확히 나눕니다.
  const hasDisplayableMetrics = hasCompletedResult && metricCards.length > 0;
  const emptyResultMessage = isPending
    ? emptyResultMessages.pending
    : hasSavedResult
      ? emptyResultMessages.noScore
      : emptyResultMessages.empty;

  const heroBadge = hasDisplayableMetrics
    ? "분석 결과"
    : isPending
      ? "AI 모델 연결 대기"
      : "분석 결과 없음";

  const summaryBadge = hasDisplayableMetrics
    ? "분석 결과 저장 완료"
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

  const aiSummary = useMemo(
    () =>
      buildAiSummary({
        analysisResult,
        metricCards,
        hasDisplayableMetrics,
        isPending,
        hasSavedResult,
      }),
    [analysisResult, metricCards, hasDisplayableMetrics, isPending, hasSavedResult],
  );

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

  const nextActionCards = useMemo(() => {
    if (!requestedAnalysisId) return nextCards;

    return nextCards.map((item) => {
      if (item.to !== "/recommendations" && item.to !== "/diet-guide") {
        return item;
      }

      const search = new URLSearchParams();
      search.set("analysisId", requestedAnalysisId);

      return {
        ...item,
        to: `${item.to}?${search.toString()}`,
      };
    });
  }, [requestedAnalysisId]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (isHistoryResultLoading) {
    return (
      <PageLayout>
        <div className="sf-result-page" style={{ paddingTop: 16 }}>
          <div className="sf-result-summary-card" style={{ padding: 24 }}>
            <Badge>분석 결과</Badge>
            <h2 style={{ margin: "12px 0 8px" }}>선택한 분석 결과를 불러오는 중입니다</h2>
            <p style={{ margin: 0, color: "#64748b" }}>분석 이력에 저장된 점수와 지표를 준비하고 있습니다.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (requestedAnalysisId && historyResultError) {
    return (
      <PageLayout>
        <div className="sf-result-page" style={{ paddingTop: 16 }}>
          <div className="sf-result-summary-card" style={{ padding: 24 }}>
            <Badge>분석 결과</Badge>
            <h2 style={{ margin: "12px 0 8px" }}>분석 결과를 불러오지 못했습니다</h2>
            <p style={{ margin: "0 0 16px", color: "#64748b" }}>{historyResultError}</p>
            <Button to="/history" variant="secondary">
              분석 이력으로 돌아가기
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 아래 JSX는 결과 없음 상태, 분석 대기 상태, 완료 결과 상태를 나누어 화면에 표시합니다.
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
          .sf-result-summary-card {
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 28px;
            background: #ffffff;
            box-shadow: none;
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
            color: #14b8a6;
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
            background: #f8fafc;
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
            left: calc(50% + 18px);
            top: 36%;
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

          .sf-result-face-next-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 16px;
          }

          .sf-result-face-next-item {
            min-height: 148px;
            padding: 14px;
            border-radius: 20px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            background: #f8fafc;
            transition: border-color 0.18s ease;
          }

          .sf-result-face-next-item:hover {
            border-color: rgba(22, 125, 127, 0.24);
          }

          .sf-result-face-next-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 12px;
          }

          .sf-result-face-next-item h3 {
            margin: 0 0 7px;
            color: #0f172a;
            font-size: 14px;
            letter-spacing: -0.035em;
          }

          .sf-result-face-next-item p {
            font-size: 12px;
            font-weight: 750;
            line-height: 1.58;
          }

          .sf-result-face-next-item .sf-button {
            margin-top: 12px;
          }

          .sf-result-flow-index {
            color: #94a3b8;
            font-size: 11px;
            font-weight: 950;
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
            word-break: keep-all;
            overflow-wrap: normal;
          }

          .sf-result-score-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .sf-result-score-card {
            position: relative;
            display: grid;
            gap: 13px;
            min-height: 168px;
            padding: 16px;
            overflow: hidden;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.88);
            background: #f8fafc;
          }

          .sf-result-score-main {
            display: grid;
            grid-template-columns: 76px 1fr;
            gap: 12px;
            align-items: center;
          }

          .sf-result-score-ring {
            width: 76px;
            height: 76px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle, #ffffff 56%, transparent 58%),
              conic-gradient(var(--grade-color) 0 var(--metric-value), #e2e8f0 var(--metric-value) 100%);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
          }

          .sf-result-score-ring strong {
            color: #0f172a;
            font-size: 20px;
            line-height: 1;
            letter-spacing: -0.05em;
          }

          .sf-result-score-status {
            display: grid;
            gap: 4px;
            min-width: 0;
          }

          .sf-result-score-status span {
            color: #64748b;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: -0.02em;
          }

          .sf-result-score-status strong {
            width: fit-content;
            max-width: 100%;
            padding: 6px 10px;
            border-radius: 999px;
            color: var(--grade-color);
            background: var(--grade-bg);
            font-size: 14px;
            font-weight: 950;
            letter-spacing: -0.035em;
            white-space: nowrap;
          }

          .sf-result-status-bar {
            height: 7px;
            overflow: hidden;
            border-radius: 999px;
            background: var(--grade-bar-bg);
          }

          .sf-result-status-bar span {
            display: block;
            width: 100%;
            height: 100%;
            border-radius: inherit;
            background: var(--grade-color);
          }

          .sf-result-score-card h3 {
            margin: 0;
            color: #0f172a;
            font-size: 15px;
            letter-spacing: -0.035em;
          }

          .sf-result-score-card p {
            color: #64748b;
            font-size: 12px;
            font-weight: 800;
            line-height: 1.55;
          }

          .sf-result-score-help {
            display: grid;
            gap: 10px;
            margin-top: -2px;
            padding: 12px;
            border-radius: 16px;
            color: #475569;
            background: rgba(248, 250, 252, 0.92);
            border: 1px solid rgba(226, 232, 240, 0.88);
            font-size: 12px;
            font-weight: 850;
            line-height: 1.5;
            word-break: keep-all;
          }

          .sf-result-score-help-main {
            display: flex;
            align-items: center;
            gap: 7px;
          }

          .sf-result-score-help-list {
            display: grid;
            gap: 7px;
          }

          .sf-result-score-help-list span {
            display: grid;
            grid-template-columns: 7px 1fr;
            gap: 8px;
            align-items: start;
          }

          .sf-result-score-help-list span::before {
            content: "";
            width: 7px;
            height: 7px;
            margin-top: 6px;
            border-radius: 999px;
            background: #167d7f;
          }

          .sf-result-score-help svg {
            flex: 0 0 auto;
            color: #167d7f;
          }

          .sf-result-grade-legend {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .sf-result-grade-legend span {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            min-height: 24px;
            padding: 0 9px;
            border-radius: 999px;
            color: var(--legend-color);
            background: var(--legend-bg);
            font-size: 11px;
            font-weight: 950;
            white-space: nowrap;
          }

          .sf-result-grade-legend i {
            width: 7px;
            height: 7px;
            border-radius: 999px;
            background: var(--legend-color);
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
            background: #f8fafc;
          }         

          .sf-result-empty-state .sf-result-icon-tile {
            background: #ffffff;
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
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
          }

          .sf-result-comment strong {
            display: block;
            margin-bottom: 6px;
            color: #5eead4;
            font-size: 13px;
            font-weight: 950;
          }

          .sf-result-comment p {
            color: rgba(255, 255, 255, 0.92);
            font-weight: 800;
          }

          .sf-result-comment-lead {
            margin-bottom: 10px !important;
            color: #ffffff !important;
            font-size: 15px !important;
            line-height: 1.7 !important;
          }

          .sf-result-comment-list {
            display: grid;
            gap: 7px;
            margin: 0;
            padding: 0;
            list-style: none;
          }

          .sf-result-comment-list li {
            position: relative;
            padding-left: 14px;
            color: rgba(255, 255, 255, 0.82);
            font-size: 13px;
            font-weight: 750;
            line-height: 1.62;
            word-break: keep-all;
          }

          .sf-result-comment-list li::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0.72em;
            width: 5px;
            height: 5px;
            border-radius: 999px;
            background: #5eead4;
          }

          .sf-result-comment-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 14px;
          }

          .sf-result-comment-actions .sf-button {
            background: rgba(255, 255, 255, 0.94);
            box-shadow: none;
          }

          .sf-result-action-panel {
            display: grid;
            gap: 10px;
            margin-top: 2px;
          }

          .sf-result-action-list {
            display: grid;
            gap: 9px;
          }

          .sf-result-action-panel .sf-result-notice-actions {
            margin-top: 2px;
          }

          .sf-result-icon-tile {
            width: 44px;
            height: 44px;
            min-width: 44px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            color: #167d7f;
            background: #ffffff;
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

          .sf-result-next-card.is-wide,
          .sf-result-notice-card.is-wide {
            grid-column: 1 / -1;
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
            word-break: keep-all;
            overflow-wrap: normal;
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
            background: #f8fafc;
            transition: border-color 0.18s ease;
          }

          .sf-result-next-item:hover {
            border-color: rgba(22, 125, 127, 0.22);
            box-shadow: none;
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

          .sf-result-next-support {
            margin-top: 14px;
            padding: 14px;
            border-radius: 18px;
            color: #475569;
            background: rgba(22, 125, 127, 0.07);
            border: 1px solid rgba(22, 125, 127, 0.12);
            font-size: 13px;
            font-weight: 800;
            line-height: 1.55;
            word-break: keep-all;
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



          /* 최종 제출용 캡처에서는 좌우가 너무 좁아 보이지 않도록 결과 화면 전용 최대 너비를 넓힙니다. */
          .page-inner:has(.sf-result-page) {
            max-width: 1280px;
          }

          /* PC에서는 얼굴 안내와 점수 요약을 좌우로 나눠 한 화면에서 비교하기 쉽게 배치합니다. */
          .sf-result-page {
            gap: 14px;
          }

          .sf-result-hero {
            grid-template-columns: minmax(460px, 0.88fr) minmax(540px, 1.12fr);
            gap: 14px;
          }

          .sf-result-face-card,
          .sf-result-summary-card {
            padding: 22px;
            border-radius: 24px;
          }

          .sf-result-face-card h1 {
            margin-bottom: 12px;
            font-size: clamp(32px, 3.3vw, 44px);
          }

          .sf-result-face-map {
            min-height: 220px;
            margin-top: 16px;
            background: #f8fafc;
          }

          .sf-result-face-oval {
            width: 160px;
            height: 212px;
          }

          .sf-result-score-help--face {
            margin-top: 16px;
          }

          .sf-result-summary-card {
            gap: 14px;
          }

          .sf-result-score-grid {
            gap: 12px;
          }

          .sf-result-score-card {
            min-height: 166px;
            padding: 16px;
            background: #f8fafc;
          }

          .sf-result-comment {
            min-height: 172px;
          }

          /* 다음 화면 CTA는 전체 너비를 사용하고, 재분석·대시보드 버튼은 별도 보조 패널로 구분합니다. */
          .sf-result-lower-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            align-items: stretch;
          }

          .sf-result-follow-panel,
          .sf-result-final-disclaimer {
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 24px;
            background: #ffffff;
            box-shadow: none;
          }

          /* 주요 이동 CTA는 긴 스트립 대신 독립 카드로 구분해 각 행동을 빠르게 찾게 합니다. */
          .sf-result-next-strip {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .sf-result-next-strip .sf-result-next-item {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            min-height: 188px;
            padding: 20px;
            border: 1px solid rgba(226, 232, 240, 0.95);
            border-radius: 22px;
            background: #ffffff;
          }

          .sf-result-next-strip .sf-result-next-item > div {
            display: flex;
            flex-direction: column;
            min-height: 116px;
          }

          .sf-result-next-strip .sf-result-next-item h3 {
            font-size: 16px;
          }

          .sf-result-next-strip .sf-result-next-item p {
            font-size: 13px;
            line-height: 1.65;
          }

          .sf-result-next-strip .sf-result-next-item .sf-button {
            width: 100%;
            margin-top: auto;
          }

          .sf-result-follow-panel {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
            gap: 10px;
            align-items: center;
            padding: 12px;
          }

          .sf-result-follow-panel .sf-result-action-list {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .sf-result-follow-panel .sf-result-notice-actions {
            margin-top: 0;
          }

          .sf-result-final-disclaimer {
            display: grid;
            grid-template-columns: 34px 1fr;
            gap: 10px;
            align-items: center;
            padding: 14px 18px;
            color: #334155;
            font-size: 13px;
            font-weight: 800;
            line-height: 1.55;
          }

          .sf-result-final-disclaimer svg {
            color: #167d7f;
          }

          @media (max-width: 1180px) {
            .sf-result-hero {
              grid-template-columns: 1fr;
            }
          }

          /* 모바일에서는 모든 결과 카드와 CTA를 1열로 내려 읽기 순서를 유지합니다. */
          @media (max-width: 760px) {
            .sf-result-page {
              gap: 12px;
              padding-top: 8px;
              padding-bottom: 18px;
            }

            .sf-result-face-card,
            .sf-result-summary-card,
            .sf-result-next-card,
            .sf-result-notice-card,
            .sf-result-follow-panel,
            .sf-result-final-disclaimer {
              border-radius: 22px;
              padding: 16px;
            }

            .sf-result-next-strip {
              grid-template-columns: 1fr;
              gap: 10px;
            }

            /* 좁은 화면에서는 아이콘과 내용을 가로로 묶어 CTA 카드 길이를 줄입니다. */
            .sf-result-next-strip .sf-result-next-item {
              grid-template-columns: 42px minmax(0, 1fr);
              min-height: auto;
              padding: 16px;
              border-radius: 20px;
            }

            .sf-result-next-strip .sf-result-next-item > div {
              min-height: 0;
            }

            .sf-result-next-strip .sf-result-next-item .sf-button {
              margin-top: 12px;
            }

            .sf-result-follow-panel,
            .sf-result-follow-panel .sf-result-action-list {
              grid-template-columns: 1fr;
            }

            .sf-result-face-card h1 {
              margin-bottom: 12px;
              font-size: 32px;
              letter-spacing: -0.06em;
            }

            .sf-result-summary-top,
            .sf-result-card-head {
              flex-direction: column;
              align-items: flex-start;
              gap: 10px;
            }

            .sf-result-summary-top .sf-badge,
            .sf-result-card-head .sf-badge {
              max-width: 100%;
              white-space: normal;
              word-break: keep-all;
            }

            .sf-result-summary-top h2,
            .sf-result-card-head h2 {
              font-size: 22px;
            }

            .sf-result-score-grid,
            .sf-result-next-grid,
            .sf-result-face-next-grid,
            .sf-result-notice-actions {
              grid-template-columns: 1fr;
            }

            .sf-result-face-map {
              min-height: 230px;
            }

            .sf-result-comment {
              grid-template-columns: 1fr;
            }

            .sf-result-comment-actions {
              flex-direction: column;
            }

            .sf-result-comment-actions .sf-button {
              width: 100%;
            }
          }
        `}
      </style>

      <div className="sf-result-page">
        <section className="sf-result-hero">
          <div className="sf-result-face-card">
            <Badge>{heroBadge}</Badge>
            <h1>
              {hasDisplayableMetrics ? "분석 결과를 바탕으로" : isPending ? "분석 결과를" : "피부 분석을"}
              <br />
              <span className="sf-result-gradient-text">
                {hasDisplayableMetrics ? "맞춤 관리를 이어가세요" : isPending ? "준비하고 있습니다" : "다시 시작해 주세요"}
              </span>
            </h1>
            <p>
              {hasDisplayableMetrics
                ? "저장된 색소침착·주름 지표를 종합 점수와 함께 보기 쉽게 정리했습니다."
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

            {hasDisplayableMetrics && (
              <div className="sf-result-score-help sf-result-score-help--face">
                <div className="sf-result-score-help-main">
                  <Info size={15} />
                  <span>점수 의미 안내</span>
                </div>
                <div className="sf-result-score-help-list">
                  <span>점수가 높을수록 현재 피부 상태가 양호하다는 의미입니다.</span>
                  <span>점수가 낮은 항목은 관리 우선순위가 높게 표시됩니다.</span>
                  <span>피부 관리 참고 정보이며 개인별 관리 방향을 돕기 위한 안내입니다.</span>
                </div>
                <div className="sf-result-grade-legend" aria-label="피부 상태 단계 안내">
                  <span style={{ "--legend-color": "#167D7F", "--legend-bg": "rgba(22, 125, 127, 0.11)" }}>
                    <i aria-hidden="true" /> 양호
                  </span>
                  <span style={{ "--legend-color": "#F59E0B", "--legend-bg": "rgba(245, 158, 11, 0.14)" }}>
                    <i aria-hidden="true" /> 주의
                  </span>
                  <span style={{ "--legend-color": "#F43F5E", "--legend-bg": "rgba(244, 63, 94, 0.12)" }}>
                    <i aria-hidden="true" /> 관리필요
                  </span>
                </div>
              </div>
            )}
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
              <>
                <div className="sf-result-score-grid">
                {metricCards.map((metric) => (
                  <div
                    className="sf-result-score-card"
                    key={metric.label}
                    style={{
                      "--grade-color": metric.gradeMeta.color,
                      "--grade-bg": metric.gradeMeta.bg,
                      "--grade-bar-bg": metric.gradeMeta.barBg,
                    }}
                  >
                    <div className="sf-result-score-main">
                      <div
                        className="sf-result-score-ring"
                        style={{ "--metric-value": `${metric.value}%` }}
                      >
                        <strong>{metric.value}</strong>
                      </div>
                      <div className="sf-result-score-status">
                        <span>
                          {metric.value}점{metric.scoreGrade ? ` · ${metric.scoreGrade}` : ""}
                        </span>
                        <strong>{metric.gradeMeta.label}</strong>
                      </div>
                    </div>
                    <h3>{metric.label}</h3>
                    <p>{metric.gradeMeta.description}</p>
                    <div className="sf-result-status-bar" aria-hidden="true">
                      <span />
                    </div>
                  </div>
                ))}
                </div>

              </>
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
                <strong>{aiSummary.title}</strong>
                <p className="sf-result-comment-lead">{aiSummary.lead}</p>
                {aiSummary.points.length > 0 && (
                  <ul className="sf-result-comment-list">
                    {aiSummary.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>


          </div>
        </section>

        {/* AI 요약은 결과 설명에 집중하고, 화면 이동 CTA는 이 하단 영역에 한 번만 제공합니다. */}
        {hasDisplayableMetrics && (
          <section className="sf-result-lower-grid" aria-label="분석 결과 이후 다음 행동">
            <div className="sf-result-next-strip">
              {nextActionCards.map((item) => {
                const Icon = item.icon;

                return (
                  <article className="sf-result-next-item" key={item.title}>
                    <span className="sf-result-icon-tile" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                      <Button to={item.to} variant="secondary" size="sm">
                        {item.badge} 보기
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="sf-result-follow-panel">
              <div className="sf-result-action-list">
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
            </div>
          </section>
        )}

        <div className="sf-result-final-disclaimer">
          <Info size={18} />
          <span>
            SkinFlow의 분석 결과는 피부 관리 참고 정보이며, 개인별 관리 방향을 돕기 위한 안내입니다.
          </span>
        </div>
      </div>
    </PageLayout>
  );
}

export default AnalysisResultPage;
