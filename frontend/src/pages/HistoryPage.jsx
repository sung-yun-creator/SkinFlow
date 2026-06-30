// 분석 이력 페이지입니다.
// 과거 분석 기록, 점수 추이 그래프, 상세 분석 정보, AI 요약 리포트를 보여주는 화면입니다.
// 이 파일은 화면 표시와 사용자 동작 처리를 담당하며, 백엔드/DB/AI 로직은 여기서 직접 수정하지 않습니다.
// 주석은 코드 흐름 이해를 돕기 위한 설명이며 실제 동작에는 영향을 주지 않습니다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  History,
  Info,
  LineChart as LineChartIcon,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import {
  getHistory,
  getHistoryDetail,
  getHistoryLlmReport,
  getHistoryScoreTrends,
} from "../api/historyApi";
import { getScoreGradeLabel, shouldShowAnalysisScore } from "../utils/analysisStatus";
import { safeCareText } from "../utils/safeCareText";
 // 이력 API 응답이 없을 때 화면이 깨지지 않도록 사용하는 기본 데이터 구조입니다.

const defaultHistoryData = {
  summary: {
    analysisCount: 0,
    latestTotalScore: null,
    latestAnalyzedAt: null,
    latestStatus: null,
    scoreDiff: null,
  },
  records: [],
};
 // score-trends 그래프 API 응답이 없을 때 사용하는 기본 데이터 구조입니다.

const defaultScoreTrendData = {
  summary: {
    pointCount: 0,
    limit: 7,
    metricCodes: ["total", "pigmentation", "wrinkle"],
  },
  labels: [],
  points: [],
  series: [],
};
 // 그래프에 표시할 지표 코드와 이름, 색상 기준을 모아둔 목록입니다.

const trendSeriesDefinitions = [
  { code: "total", name: "종합 점수", unit: "점", color: "#167D7F" },
  { code: "pigmentation", name: "색소침착", unit: "점", color: "#F43F5E" },
  { code: "wrinkle", name: "주름", unit: "점", color: "#0F172A" },
];
 // 점수 구간별 의미를 화면에서 설명하기 위한 범례 목록입니다.

const scoreGradeLegend = [
  { label: "양호", color: "#167D7F", bg: "rgba(22, 125, 127, 0.11)" },
  { label: "주의", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.14)" },
  { label: "관리필요", color: "#F43F5E", bg: "rgba(244, 63, 94, 0.12)" },
];
 // 이력 API 응답이 없거나 일부 필드가 빠져도 화면이 깨지지 않게 기본 구조를 채웁니다.

function normalizeHistoryData(data) {
  return {
    summary: {
      ...defaultHistoryData.summary,
      ...(data?.summary || {}),
    },
    records: Array.isArray(data?.records) ? data.records : [],
  };
}

// score-trends 응답은 그래프 전용 데이터입니다.
// labels, series, points의 배열 형태를 보장해 Recharts에서 빈 데이터 오류가 나지 않게 합니다.
// score-trends 그래프 API 응답을 안전한 기본 구조와 합칩니다.
function normalizeScoreTrendData(data) {
  return {
    summary: {
      ...defaultScoreTrendData.summary,
      ...(data?.summary || {}),
    },
    labels: Array.isArray(data?.labels) ? data.labels : [],
    points: Array.isArray(data?.points) ? data.points : [],
    series: Array.isArray(data?.series)
      ? data.series.map((item) => ({
          ...item,
          code: String(item?.code || ""),
          name: item?.name || "점수",
          unit: item?.unit || "점",
          data: Array.isArray(item?.data) ? item.data : [],
          points: Array.isArray(item?.points) ? item.points : [],
        }))
      : [],
  };
}
 // 그래프 series 배열에서 종합/색소침착/주름 데이터를 코드로 찾아옵니다.

function getTrendSeriesByCode(series, code) {
  if (!Array.isArray(series)) return null;

  return series.find((item) => item?.code === code) || null;
}
 // 그래프의 특정 날짜와 특정 지표 점수를 안전하게 꺼냅니다.

function getTrendPointValue(series, fallbackPoints, index, key) {
  const seriesPoint = Array.isArray(series?.points) ? series.points[index] : null;
  const fallbackPoint = Array.isArray(fallbackPoints) ? fallbackPoints[index] : null;
  const point = seriesPoint || fallbackPoint || {};

  return point?.[key] ?? point?.[key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)] ?? null;
}
 // 그래프 툴팁에서 보여줄 분석 ID, 날짜, 등급 같은 보조 정보를 꺼냅니다.

function getTrendPointMeta(series, fallbackPoints, index) {
  const seriesPoint = Array.isArray(series?.points) ? series.points[index] : null;
  const fallbackPoint = Array.isArray(fallbackPoints) ? fallbackPoints[index] : null;

  return seriesPoint || fallbackPoint || {};
}
 // 상태가 명시된 응답은 completed/complete인지 확인하고, 상태가 없는 기존 응답은 호환 처리합니다.

function isCompletedTrendStatus(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (!normalizedStatus) return true;

  return normalizedStatus === "completed" || normalizedStatus === "complete";
}

// 상태가 명시된 응답은 완료 상태이고 점수가 표시 가능한 경우에만 그래프에 올립니다.
// 상태가 없는 기존 응답은 호환 처리하고, pending/processing 값은 null로 남깁니다.
function getDisplayableTrendScore(series, fallbackPoints, index) {
  const point = getTrendPointMeta(series, fallbackPoints, index);
  const score = getScoreNumber(series?.data?.[index] ?? point?.score);

  if (score === null) return null;

  if (!isCompletedTrendStatus(point?.status ?? point?.analysisStatus ?? point?.analysis_status)) {
    return null;
  }

  return shouldShowAnalysisScore({
    score,
    status: point?.status ?? point?.analysisStatus ?? point?.analysis_status,
    saved: point?.saved,
    code: point?.code,
  })
    ? score
    : null;
}

// 툴팁은 그래프 점에 연결된 분석일, 등급, 점수를 한 번에 보여주는 보조 UI입니다.
// 값이 없는 선은 제외해 빈 항목이 툴팁에 노출되지 않게 합니다.
// 그래프에 마우스를 올렸을 때 보이는 상세 툴팁 컴포넌트입니다.
function ScoreTrendTooltip({ active, payload, label }) {
  if (!active || !Array.isArray(payload)) return null;

  const visiblePayload = payload.filter((item) => item?.value !== null && item?.value !== undefined);

  if (visiblePayload.length === 0) return null;

  const row = visiblePayload[0]?.payload || {};
  const analyzedAt = row.totalAnalyzedAt || row.pigmentationAnalyzedAt || row.wrinkleAnalyzedAt;
  const gradeName = row.totalGradeName || row.pigmentationGradeName || row.wrinkleGradeName;

  return (
    <div className="sf-trend-tooltip">
      <strong>{label}</strong>
      {analyzedAt && <span>{formatDate(analyzedAt, "분석일 확인")}</span>}
      {gradeName && <em>{gradeName}</em>}
      <div>
        {visiblePayload.map((item) => (
          <p key={item.dataKey} style={{ "--tooltip-color": item.color }}>
            <i aria-hidden="true" />
            <span>{item.name}</span>
            <b>
              {formatScoreWithGrade(item.value, row[`${item.dataKey}ScoreGrade`], "점수 없음")}
            </b>
          </p>
        ))}
      </div>
    </div>
  );
}
 // 이력 날짜를 한국어 날짜 형식으로 바꿉니다.

function formatDate(dateValue, emptyText = "아직 없음") {
  if (!dateValue) return emptyText;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return emptyText;
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
 // 점수가 없을 때 빈칸 대신 안내 문구를 보여줍니다.

function formatScore(score, emptyText = "분석 전") {
  const numericScore = getScoreNumber(score);

  if (numericScore === null) return emptyText;

  return `${numericScore}점`;
}

// scoreGrade가 실제 응답에 있을 때만 점수 옆에 A~E 보조 등급을 표시합니다.
// 기존 양호/주의/관리필요 상태 배지는 별도 UI로 유지합니다.
function formatScoreWithGrade(score, scoreGrade, emptyText = "분석 전") {
  const scoreText = formatScore(score, emptyText);
  const scoreGradeLabel = getScoreGradeLabel(scoreGrade);

  if (getScoreNumber(score) === null || !scoreGradeLabel) {
    return scoreText;
  }

  return `${scoreText} · ${scoreGradeLabel}`;
}
 // 점수 값을 숫자로 변환하고 화면 기준에 맞게 보정합니다.

function getScoreNumber(score) {
  if (score === null || score === undefined || score === "") return null;

  const numericScore = Number(score);

  if (Number.isNaN(numericScore)) return null;

  return Math.max(0, Math.min(100, Math.round(numericScore)));
}
 // 분석 상태 코드를 사용자가 이해할 수 있는 한글 상태로 바꿉니다.

function getStatusLabel(status) {
  if (!status) return "분석 전";

  const normalizedStatus = String(status).toLowerCase();
  const statusMap = {
    good: "양호",
    low: "양호",
    normal: "주의",
    caution: "주의",
    medium: "주의",
    risk: "관리필요",
    high: "관리필요",
    danger: "관리필요",
    severe: "관리필요",
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
  // 등급 문구를 양호/주의/관리 필요처럼 짧은 라벨로 정리합니다.


function normalizeGradeLabel(status) {
  const normalizedStatus = String(status || "").replace(/\s/g, "");

  if (!normalizedStatus || normalizedStatus === "분석완료") {
    return null;
  }

  if (normalizedStatus.includes("양호")) return "양호";
  if (normalizedStatus.includes("주의") || normalizedStatus.includes("보통")) return "주의";
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
 // 점수와 등급에 맞는 설명, 배지, 상태 문구를 만듭니다.

function getScoreGradeMeta(score, status) {
  const numericScore = getScoreNumber(score);
  const label =
    normalizeGradeLabel(status) ||
    (numericScore === null ? "분석전" : numericScore >= 80 ? "양호" : numericScore >= 60 ? "주의" : "관리필요");

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
    분석전: {
      label: "분석 전",
      description: "첫 분석 후 상태 단계가 표시됩니다.",
      color: "#64748B",
      bg: "rgba(100, 116, 139, 0.10)",
      barBg: "rgba(100, 116, 139, 0.16)",
    },
  };

  return gradeMap[label] || gradeMap.분석전;
}
 // 등급에 따라 화면 색상 스타일을 정합니다.

function getGradeStyle(meta) {
  return {
    "--grade-color": meta.color,
    "--grade-bg": meta.bg,
    "--grade-bar-bg": meta.barBg,
  };
}
 // 점수 구간에 따른 사용자 안내 문구를 만듭니다.

function getScoreInterpretation(score, label) {
  const numericScore = getScoreNumber(score);

  if (numericScore === null) {
    return "저장된 점수가 있을 때 지표별 해석을 표시합니다.";
  }

  if (numericScore >= 80) {
    return `${label} 지표는 현재 양호한 편으로 참고할 수 있습니다.`;
  }

  if (numericScore >= 60) {
    return `${label} 지표는 생활 습관과 관리 루틴을 함께 점검해보면 좋습니다.`;
  }

  return `${label} 지표는 우선 관리 항목으로 보고 추천 정보와 함께 확인해보세요.`;
}
 // 지표 코드를 색소침착/주름 같은 한글 이름으로 바꿉니다.

function getMetricName(metric) {
  return (
    metric?.metricName ||
    metric?.metric_name ||
    metric?.name ||
    metric?.label ||
    metric?.metricType ||
    metric?.metric_type ||
    "피부 지표"
  );
}
 // 지표별 등급 값을 여러 응답 구조에서 안전하게 가져옵니다.

function getGradeStatusValue(source) {
  const grade = source?.grade;

  return (
    (typeof grade === "string" ? grade : grade?.name || grade?.label || grade?.status) ||
    source?.gradeName ||
    source?.grade_name ||
    source?.statusName ||
    source?.status_name ||
    source?.level ||
    source?.name ||
    source?.analysisStatus ||
    source?.analysis_status ||
    source?.status
  );
}
 // 이력 카드에 보여줄 등급 상태를 정리합니다.

function getRecordGradeStatus(record) {
  return getGradeStatusValue(record);
}
 // 지표 객체에서 점수 값을 안전하게 꺼냅니다.

function getMetricScoreValue(metrics, keyword) {
  if (!Array.isArray(metrics) || metrics.length === 0) return null;

  const matchedMetric = metrics.find((metric) => {
    const name = getMetricName(metric);
    return String(name).includes(keyword);
  });

  return (
    matchedMetric?.metricScore ??
    matchedMetric?.metric_score ??
    matchedMetric?.score ??
    matchedMetric?.value ??
    matchedMetric?.metricValue ??
    matchedMetric?.metric_value ??
    null
  );
}

// 각 지표의 scoreGrade는 점수 해석용 보조 정보로만 사용합니다.
function getMetricScoreGradeValue(metrics, keyword) {
  if (!Array.isArray(metrics) || metrics.length === 0) return null;

  const matchedMetric = metrics.find((metric) => {
    const name = getMetricName(metric);
    return String(name).includes(keyword);
  });

  return matchedMetric?.scoreGrade ?? matchedMetric?.score_grade ?? null;
}
 // 지표 객체에서 등급 값을 안전하게 꺼냅니다.

function getMetricGradeValue(metrics, keyword) {
  if (!Array.isArray(metrics) || metrics.length === 0) return null;

  const matchedMetric = metrics.find((metric) => {
    const name = getMetricName(metric);
    return String(name).includes(keyword);
  });

  return getGradeStatusValue(matchedMetric);
}
 // 이력 카드에서 특정 지표의 점수를 찾습니다.

function getMetricScore(metrics, keyword) {
  return formatScoreWithGrade(
    getMetricScoreValue(metrics, keyword),
    getMetricScoreGradeValue(metrics, keyword),
  );
}
 // 이력 상세에 보여줄 추천 요약 문구를 고릅니다.

function getRecommendationText(recommendations) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return "이 분석 이력에 연결된 추천 요약이 없습니다.";
  }

  const textList = recommendations
    .map(
      (item) =>
        item.title ||
        item.name ||
        item.recommendationTitle ||
        item.recommendation_title ||
        item.recommendationName ||
        item.recommendation_name ||
        item.summary ||
        item.content ||
        item.recommendationContent ||
        item.recommendation_content
    )
    .filter(Boolean);

  const uniqueTextList = [...new Set(textList)];

  return uniqueTextList.length > 0
    ? uniqueTextList.join(" · ")
    : "이 분석 이력에 연결된 추천 요약이 없습니다.";
}
 // 화면에 표시할 수 있는 실제 문구인지 확인합니다.

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}
 // LLM 리포트가 새로 생성/저장/재사용 중 어떤 출처인지 라벨로 바꿉니다.

function getLlmReportSourceLabel(source) {
  const normalizedSource = String(source || "").trim().toLowerCase();
  const sourceMap = {
    generated: "새로 생성된 리포트",
    database: "저장된 리포트",
    copied: "저장된 리포트",
  };

  return sourceMap[normalizedSource] || "리포트 출처 확인 중";
}
 // LLM 리포트 API 오류를 사용자 안내 문장으로 바꿉니다.

function getLlmReportErrorMessage(error) {
  if (error?.status === 404) {
    return "연결된 분석 이력이 없어 리포트를 불러오지 못했습니다.";
  }

  if (error?.status === 503) {
    return "리포트 생성 설정이 아직 준비되지 않았습니다.";
  }

  if (error?.status === 502) {
    return "리포트 생성 응답을 확인하지 못했습니다.";
  }

  return "리포트를 불러오지 못했습니다. 기존 분석 상세 정보는 계속 확인할 수 있습니다.";
}
 // 이력 상세 조회에 사용할 분석 ID를 여러 응답 구조에서 찾습니다.

function getRecordId(record) {
  return record?.analysisId || record?.analysis_id || record?.id || record?.resultId;
}

// 히스토리에서 고른 analysisId를 다음 화면 URL에 붙여 특정 분석 이력 기준을 계속 유지합니다.
// ID가 없으면 기존 기본 경로를 그대로 사용해 최신 분석 기준 흐름으로 안전하게 이동합니다.
function getAnalysisContextPath(path, analysisId) {
  if (analysisId === null || analysisId === undefined || String(analysisId).trim() === "") {
    return path;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("analysisId", String(analysisId).trim());

  return `${path}?${searchParams.toString()}`;
}
 // 이력 카드의 분석 날짜를 가져옵니다.

function getRecordDate(record) {
  return record?.analyzedAt || record?.analyzed_at || record?.createdAt || record?.created_at;
}
 // 이력 카드의 분석 시간을 가져옵니다.

function getRecordTime(record) {
  const dateValue = getRecordDate(record);

  if (!dateValue) return null;

  const time = new Date(dateValue).getTime();

  return Number.isNaN(time) ? null : time;
}
 // 이력 카드의 분석 상태를 가져옵니다.

function getRecordStatus(record) {
  return record?.analysisStatus || record?.analysis_status || record?.status;
}
 // 이력 카드의 종합 점수를 가져옵니다.

function getRecordScore(record) {
  return record?.totalScore ?? record?.total_score ?? record?.totalSkinScore ?? record?.total_skin_score;
}

// 종합 점수의 A~E 보조 등급을 camelCase/snake_case 응답 모두에서 가져옵니다.
function getRecordScoreGrade(record) {
  return record?.scoreGrade ?? record?.score_grade;
}
 // 검색어에 맞는 이력 카드만 남깁니다.

function filterHistoryRecords(records, keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) return records;

  return records.filter((record) => {
    const date = formatDate(getRecordDate(record), "").toLowerCase();
    const summaryText = String(record.summary || "").toLowerCase();
    const statusText = String(getRecordStatus(record) || "").toLowerCase();
    const statusLabel = String(getStatusLabel(getRecordStatus(record)) || "").toLowerCase();

    return (
      date.includes(normalizedKeyword) ||
      summaryText.includes(normalizedKeyword) ||
      statusText.includes(normalizedKeyword) ||
      statusLabel.includes(normalizedKeyword)
    );
  });
}
 // 분석 이력 화면 전체를 담당하는 React 컴포넌트입니다.

function HistoryPage() {
  // 이력 목록, 그래프 데이터, 상세 선택 상태, LLM 리포트 상태, 검색어, 로딩/에러 상태를 나눠서 관리합니다.
  const [historyData, setHistoryData] = useState(defaultHistoryData);
  const [scoreTrendData, setScoreTrendData] = useState(defaultScoreTrendData);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrendLoading, setIsTrendLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [scoreTrendError, setScoreTrendError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [llmReport, setLlmReport] = useState(null);
  const [isLlmReportLoading, setIsLlmReportLoading] = useState(false);
  const [llmReportError, setLlmReportError] = useState("");
  const [searchText, setSearchText] = useState("");
  const detailDialogRef = useRef(null);
  const detailTriggerRef = useRef(null);
  const detailRequestIdRef = useRef(0);

  // 페이지 진입 시 이력 목록과 score-trends 그래프 데이터를 함께 불러옵니다.
  useEffect(() => {
    let isMounted = true;
     // 이력 목록 API와 그래프 API를 함께 호출해 화면 데이터를 준비합니다.

    async function loadHistory() {
      setIsLoading(true);
      setIsTrendLoading(true);
      setHistoryError("");
      setScoreTrendError("");

      // 목록 API와 그래프 API는 서로 독립적입니다.
      // 하나가 실패해도 다른 영역을 계속 보여주기 위해 Promise.allSettled를 사용합니다.
      const [historyResult, trendResult] = await Promise.allSettled([
        getHistory(),
        getHistoryScoreTrends(7),
      ]);

      if (!isMounted) return;

      if (historyResult.status === "fulfilled") {
        setHistoryData(normalizeHistoryData(historyResult.value));
      } else {
        console.error("분석 이력 API 호출 실패:", historyResult.reason);
        setHistoryError(
          "분석 이력을 불러오지 못했습니다. 로그인 상태를 확인한 후 다시 시도해주세요."
        );
        setHistoryData(defaultHistoryData);
      }

      if (trendResult.status === "fulfilled") {
        setScoreTrendData(normalizeScoreTrendData(trendResult.value));
      } else {
        console.error("분석 이력 점수 추이 API 호출 실패:", trendResult.reason);
        setScoreTrendError(
          "점수 추이를 불러오지 못했습니다. 날짜별 분석 기록은 계속 확인할 수 있습니다."
        );
        setScoreTrendData(defaultScoreTrendData);
      }

      setIsLoading(false);
      setIsTrendLoading(false);
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);
   // API 이력 목록이 없을 때도 빈 배열로 처리해 map 오류를 막습니다.

  const records = useMemo(
    () => (Array.isArray(historyData.records) ? historyData.records : []),
    [historyData.records]
  );
  // 최근 분석 점수를 평균으로 요약해 상단 카드에 보여줄 문구를 만듭니다.
  const recentAverageSummary = useMemo(() => {
    const orderedRecords = records
      .map((record, index) => ({
        record,
        index,
        time: getRecordTime(record),
      }))
      .sort((a, b) => {
        if (a.time !== null && b.time !== null) return b.time - a.time;
        if (a.time !== null) return -1;
        if (b.time !== null) return 1;
        return b.index - a.index;
      });
    const validScores = [];

    for (const item of orderedRecords) {
      const score = getRecordScore(item.record);
      const canShowScore = shouldShowAnalysisScore({
        score,
        status: getRecordStatus(item.record),
        saved: item.record.saved,
      });
      const numericScore = getScoreNumber(score);

      if (canShowScore && numericScore !== null) {
        validScores.push(numericScore);
      }

      if (validScores.length >= 5) break;
    }

    if (validScores.length === 0) {
      return {
        hasScore: false,
        score: null,
        count: 0,
        basisLabel: "첫 분석 후 표시",
      };
    }

    const averageScore = Math.round(
      validScores.reduce((total, score) => total + score, 0) / validScores.length
    );

    return {
      hasScore: true,
      score: averageScore,
      count: validScores.length,
      basisLabel: `최근 ${validScores.length}회 기준`,
    };
  }, [records]);
  const recentAverageGradeMeta = getScoreGradeMeta(
    recentAverageSummary.hasScore ? recentAverageSummary.score : null,
    null
  );
  const trimmedSearchText = searchText.trim();
   // 검색어와 일치하는 분석 이력만 화면에 보여주도록 필터링합니다.

  const filteredRecords = useMemo(
    () => filterHistoryRecords(records, trimmedSearchText),
    [records, trimmedSearchText]
  );
  const displayedRecords = filteredRecords;
  const hasSearchKeyword = trimmedSearchText !== "";
  const hasSearchResults = filteredRecords.length > 0;
  const selectedDetailId = getRecordId(selectedDetail);
  const activeSelectedDetailId = selectedAnalysisId || selectedDetailId;
  const selectedRecommendationPath = getAnalysisContextPath(
    "/recommendations",
    activeSelectedDetailId,
  );
  const selectedDietGuidePath = getAnalysisContextPath("/diet-guide", activeSelectedDetailId);
  const isSelectedDetailVisible =
    Boolean(selectedDetail) &&
    filteredRecords.some((record) => getRecordId(record) === selectedDetailId);
  const visibleSelectedDetail = isSelectedDetailVisible ? selectedDetail : null;
  const shouldShowDetailSection = Boolean(
    activeSelectedDetailId || visibleSelectedDetail || isDetailLoading || detailError
  );
  const selectedModalRecord =
    visibleSelectedDetail ||
    records.find((record) => getRecordId(record) === activeSelectedDetailId) ||
    null;

  // labels를 기준으로 Recharts가 읽을 행 단위 데이터로 변환합니다.
  // 각 지표의 점수와 툴팁 메타 정보를 같은 row에 넣어 차트와 툴팁이 같은 기준을 사용합니다.
  // score-trends API 응답을 Recharts가 읽을 수 있는 행 배열로 변환합니다.
  const scoreTrendChartData = useMemo(() => {
    const labels = Array.isArray(scoreTrendData.labels) ? scoreTrendData.labels : [];
    const fallbackPoints = Array.isArray(scoreTrendData.points) ? scoreTrendData.points : [];

    return labels.map((label, index) => {
      const row = { label };

      trendSeriesDefinitions.forEach((definition) => {
        const series = getTrendSeriesByCode(scoreTrendData.series, definition.code);
        const score = getDisplayableTrendScore(series, fallbackPoints, index);

        row[definition.code] = score;
        row[`${definition.code}AnalysisId`] = getTrendPointValue(series, fallbackPoints, index, "analysisId");
        row[`${definition.code}AnalyzedAt`] = getTrendPointValue(series, fallbackPoints, index, "analyzedAt");
        row[`${definition.code}GradeName`] = getTrendPointValue(series, fallbackPoints, index, "gradeName");
        // 툴팁에서 점수와 같은 시점의 A~E 보조 등급을 표시하도록 row에 함께 보관합니다.
        row[`${definition.code}ScoreGrade`] = getTrendPointValue(series, fallbackPoints, index, "scoreGrade");
      });

      return row;
    });
  }, [scoreTrendData]);
   // 그래프에 실제로 그릴 수 있는 지표 series만 추립니다.

  const activeTrendSeries = useMemo(
    () =>
      trendSeriesDefinitions.map((definition) => {
        const apiSeries = getTrendSeriesByCode(scoreTrendData.series, definition.code);

        return {
          ...definition,
          name: apiSeries?.name || definition.name,
          unit: apiSeries?.unit || definition.unit,
        };
      }),
    [scoreTrendData.series]
  );

  const hasScoreTrendPoints = scoreTrendChartData.some((item) =>
    activeTrendSeries.some((series) => Number.isFinite(item[series.code]))
  );
  const selectedDetailStatus = getRecordStatus(visibleSelectedDetail);
  const selectedDetailGradeStatus = getRecordGradeStatus(visibleSelectedDetail);
  const selectedDetailScore = getRecordScore(visibleSelectedDetail);
  // completed가 아닌 결과는 저장 여부와 상태 게이트를 다시 확인해 모달에서도 점수나 완료 결과처럼 보이지 않게 합니다.
  const canShowSelectedDetailScore =
    Boolean(visibleSelectedDetail) &&
    shouldShowAnalysisScore({
      score: selectedDetailScore,
      status: selectedDetailStatus,
      saved: visibleSelectedDetail?.saved,
      code: visibleSelectedDetail?.code,
    });
  const selectedDetailTotalGradeMeta = getScoreGradeMeta(
    canShowSelectedDetailScore ? selectedDetailScore : null,
    selectedDetailGradeStatus
  );
  const selectedDetailPigmentationScore = getMetricScoreValue(visibleSelectedDetail?.metrics, "색소");
  const selectedDetailWrinkleScore = getMetricScoreValue(visibleSelectedDetail?.metrics, "주름");
  const selectedDetailPigmentationGradeMeta = getScoreGradeMeta(
    canShowSelectedDetailScore ? selectedDetailPigmentationScore : null,
    getMetricGradeValue(visibleSelectedDetail?.metrics, "색소")
  );
  const selectedDetailWrinkleGradeMeta = getScoreGradeMeta(
    canShowSelectedDetailScore ? selectedDetailWrinkleScore : null,
    getMetricGradeValue(visibleSelectedDetail?.metrics, "주름")
  );
  const llmReportBody = llmReport?.report || {};
  const safeLlmReportBody = {
    title: safeCareText(llmReportBody.title),
    summary: safeCareText(llmReportBody.summary),
    skinStatus: safeCareText(llmReportBody.skinStatus),
    recommendationSummary: safeCareText(llmReportBody.recommendationSummary),
    careGuide: safeCareText(llmReportBody.careGuide),
    disclaimer: safeCareText(llmReportBody.disclaimer),
  };
  const llmReportKeyPoints = Array.isArray(llmReportBody.keyPoints)
    ? llmReportBody.keyPoints.map(safeCareText).filter(hasText)
    : [];
  const hasLlmReportContent =
    hasText(safeLlmReportBody.title) ||
    hasText(safeLlmReportBody.summary) ||
    hasText(safeLlmReportBody.skinStatus) ||
    llmReportKeyPoints.length > 0 ||
    hasText(safeLlmReportBody.recommendationSummary) ||
    hasText(safeLlmReportBody.careGuide) ||
    hasText(safeLlmReportBody.disclaimer);

  // 목록 아래로 시선을 이동시키는 대신 모달을 즉시 열고, 선택한 analysisId의 상세 정보와 AI 리포트를 함께 준비합니다.

  async function handleDetailClick(analysisId, triggerElement) {
    detailTriggerRef.current = triggerElement || null;

    if (!analysisId) {
      setDetailError("분석 ID가 없어 상세 정보를 불러올 수 없습니다.");
      setSelectedAnalysisId(null);
      setLlmReport(null);
      setLlmReportError("");
      return;
    }

    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;

    try {
      setSelectedAnalysisId(analysisId);
      setSelectedDetail(null);
      setDetailError("");
      setLlmReport(null);
      setLlmReportError("");
      setIsDetailLoading(true);
      setIsLlmReportLoading(true);

      const [detailResult, reportResult] = await Promise.allSettled([
        getHistoryDetail(analysisId),
        getHistoryLlmReport(analysisId),
      ]);

      // 다른 이력을 다시 선택하거나 모달을 닫은 뒤 도착한 이전 응답은 현재 화면 상태를 덮어쓰지 않습니다.
      if (detailRequestIdRef.current !== requestId) return;

      if (detailResult.status === "fulfilled") {
        setSelectedDetail(detailResult.value);
      } else {
        console.error("분석 이력 상세 API 호출 실패:", detailResult.reason);
        setSelectedDetail(null);
        setDetailError("상세 분석 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      }

      if (reportResult.status === "fulfilled") {
        setLlmReport(reportResult.value);
      } else {
        console.error("AI 요약 리포트 API 호출 실패:", reportResult.reason);
        setLlmReport(null);
        setLlmReportError(getLlmReportErrorMessage(reportResult.reason));
      }
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setIsDetailLoading(false);
        setIsLlmReportLoading(false);
      }
    }
  }
   // 상세 영역의 지표 이름을 화면용 라벨로 바꿉니다.

  function getHistoryDetailMetricLabel(metric) {
    return (
      metric?.name ||
      metric?.metricName ||
      metric?.metric_name ||
      metric?.label ||
      metric?.code ||
      metric?.metricCode ||
      "피부 지표"
    );
  }
   // 상세 영역의 지표 점수를 안전하게 표시합니다.

  function getHistoryDetailMetricScore(metric) {
    const value =
      metric?.score ??
      metric?.metricScore ??
      metric?.metric_score ??
      metric?.value ??
      metric?.metricValue ??
      metric?.metric_value;

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? Math.round(numberValue) : null;
  }
   // 가장 관리가 필요한 지표를 상세 정보에서 찾습니다.

  function getHistoryDetailLowestMetric(detail) {
    const metrics = Array.isArray(detail?.metrics) ? detail.metrics : [];

    return metrics
      .map((metric) => ({
        label: getHistoryDetailMetricLabel(metric),
        score: getHistoryDetailMetricScore(metric),
      }))
      .filter((metric) => Number.isFinite(metric.score))
      .sort((a, b) => a.score - b.score)[0];
  }
   // 상세 분석 정보 카드에 보여줄 핵심 항목을 만듭니다.

  function getHistoryDetailInsightItems(detail) {
    const lowestMetric = getHistoryDetailLowestMetric(detail);
    const totalScore = Number(detail?.totalScore ?? detail?.total_skin_score ?? detail?.score);
    const totalScoreText = Number.isFinite(totalScore) ? `${Math.round(totalScore)}점` : "최근 분석 결과";

    return [
      {
        title: "현재 상태",
        text: `${totalScoreText} 기준으로 색소침착과 주름 지표를 함께 확인한 결과입니다.`,
      },
      {
        title: "우선 관리 항목",
        text: lowestMetric
          ? `${lowestMetric.label} 지표를 먼저 확인하고, 관리 가이드와 추천 정보를 함께 참고해보세요.`
          : "점수가 낮은 지표부터 관리 우선순위를 잡아보세요.",
      },
      {
        title: "다음 행동",
        text: "맞춤 추천과 식습관 가이드를 함께 확인하면 분석 이후 관리 흐름을 이어갈 수 있습니다.",
      },
    ];
  }
   // 상세 영역의 추천 요약 항목을 만듭니다.

  function getHistoryDetailRecommendationItems(recommendations) {
    const text = getRecommendationText(recommendations);
    const items = text
      .split("·")
      .map((item) => item.trim())
      .filter(Boolean);

    return [...new Set(items)].slice(0, 4);
  }
  // 모달을 닫을 때 선택 ID와 두 API의 표시 상태를 함께 정리해 이전 이력 내용이 다시 노출되지 않게 합니다.
  const clearSelectedDetailState = useCallback(() => {
    detailRequestIdRef.current += 1;
    setSelectedDetail(null);
    setSelectedAnalysisId(null);
    setIsDetailLoading(false);
    setDetailError("");
    setLlmReport(null);
    setLlmReportError("");
    setIsLlmReportLoading(false);
  }, []);
   // 검색 입력값이 바뀔 때 이력 검색어 상태를 갱신합니다.

  function handleSearchTextChange(nextSearchText) {
    setSearchText(nextSearchText);

    if (!selectedDetail) return;

    const nextFilteredRecords = filterHistoryRecords(records, nextSearchText);
    const nextSelectedDetailId = getRecordId(selectedDetail);
    const isSelectedVisible = nextFilteredRecords.some(
      (record) => getRecordId(record) === nextSelectedDetailId
    );

    if (!isSelectedVisible) {
      clearSelectedDetailState();
    }
  }
  const handleCloseDetail = useCallback(() => {
    clearSelectedDetailState();

    window.requestAnimationFrame(() => {
      detailTriggerRef.current?.focus();
    });
  }, [clearSelectedDetailState]);

  useEffect(() => {
    if (!shouldShowDetailSection) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrameId = window.requestAnimationFrame(() => {
      detailDialogRef.current?.focus();
    });

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        handleCloseDetail();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrameId);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleCloseDetail, shouldShowDetailSection]);


  // 아래 JSX는 이력 요약, score-trends 그래프, 검색, 이력 카드, 상세 영역을 화면에 그립니다.
  return (
    <PageLayout>
      <style>{`
        .sf-history-page {
          display: grid;
          gap: 24px;
        }

        .sf-history-hero {
          display: grid;
          grid-template-columns: 1fr;
          align-items: start;
        }

        .sf-history-main-card,
        .sf-history-card {
          border-radius: 28px;
          background: #ffffff;
          border: 1px solid rgba(203, 213, 225, 0.78);
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.07);
        }

        .sf-history-main-card {
          padding: 28px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 0.38fr);
          gap: 24px;
          align-items: center;
          background:
            radial-gradient(circle at 0% 0%, rgba(22, 125, 127, 0.08), transparent 32%),
            radial-gradient(circle at 100% 100%, rgba(20, 184, 166, 0.06), transparent 32%),
            #ffffff;
        }

        .sf-history-eyebrow {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 7px;
          padding: 8px 12px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 12px;
          font-weight: 950;
        }

        .sf-history-main-card h1 {
          margin: 16px 0 12px;
          color: #0f172a;
          font-size: clamp(34px, 4.3vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.065em;
        }

        .sf-gradient-text {
          display: inline-block;
          background: linear-gradient(90deg, #167d7f 0%, #14b8a6 52%, #22c5c8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }

        .sf-history-main-card p {
          max-width: 560px;
          margin: 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.68;
          word-break: keep-all;
        }

        .sf-history-actions {
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          gap: 10px;
          margin-top: 22px;
        }

        .sf-history-actions .sf-button {
          width: auto;
          white-space: nowrap;
        }

        .sf-history-flow-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .sf-history-flow-strip span {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 11px;
          border-radius: 999px;
          color: #0f172a;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(226, 232, 240, 0.88);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .sf-score-preview {
          min-height: 232px;
          padding: 18px;
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background:
            radial-gradient(circle at 100% 0%, var(--grade-bg), transparent 38%),
            #f8fafc;
          display: grid;
          gap: 12px;
          align-content: center;
        }

        .sf-score-preview-main {
          display: grid;
          grid-template-columns: 104px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
        }

        .sf-score-ring {
          width: 104px;
          height: 104px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #0f172a;
          background:
            radial-gradient(circle, #ffffff 58%, transparent 60%),
            conic-gradient(var(--grade-color, #167d7f) 0 var(--score), #e2e8f0 var(--score) 100%);
          box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.7);
        }

        .sf-score-ring strong {
          font-size: 28px;
          letter-spacing: -0.06em;
        }

        .sf-score-state-copy {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .sf-score-state-label,
        .sf-score-date {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .sf-score-state-copy .sf-grade-pill {
          font-size: 14px;
        }

        .sf-score-state-copy p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
          word-break: keep-all;
        }

        .sf-score-preview .sf-status-bar {
          width: 100%;
        }

        .sf-score-help {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 11px;
          border-radius: 15px;
          color: #475569;
          background: rgba(255, 255, 255, 0.76);
          border: 1px solid rgba(226, 232, 240, 0.82);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.45;
          word-break: keep-all;
        }

        .sf-score-help svg {
          flex: 0 0 auto;
          color: #167d7f;
        }

        .sf-grade-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .sf-grade-legend span {
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

        .sf-grade-legend i {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--legend-color);
        }

        .sf-grade-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          min-height: 28px;
          padding: 0 11px;
          border-radius: 999px;
          color: var(--grade-color);
          background: var(--grade-bg);
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-grade-pill::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--grade-color);
        }

        .sf-status-bar {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--grade-bar-bg);
        }

        .sf-status-bar > span {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          background: var(--grade-color);
        }

        .sf-card-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .sf-card-title-row small {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
        }

        .sf-card-title-row h2 {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 22px;
          letter-spacing: -0.045em;
        }

        .sf-icon-tile {
          width: 48px;
          height: 48px;
          min-width: 48px;
          min-height: 48px;
          border-radius: 17px;
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
          width: 21px !important;
          height: 21px !important;
          min-width: 21px;
          min-height: 21px;
          margin: 0;
          flex: 0 0 auto;
          transform: none;
          stroke-width: 2.1;
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
          border: 1px solid rgba(226, 232, 240, 0.85);
        }

        .sf-summary-item span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-summary-item strong {
          display: block;
          margin-top: 6px;
          color: #0f172a;
          font-size: 18px;
          letter-spacing: -0.04em;
        }

        .sf-summary-count-item {
          display: grid;
          align-content: space-between;
          gap: 12px;
          min-height: 100%;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.11), transparent 34%),
            #f8fafc;
        }

        .sf-summary-count-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .sf-summary-count-top span:first-child {
          margin: 0;
        }

        .sf-summary-count-icon {
          display: grid !important;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 13px;
          color: #167d7f !important;
          background: rgba(22, 125, 127, 0.09);
          border: 1px solid rgba(22, 125, 127, 0.12);
        }

        .sf-summary-count-item strong {
          margin-top: 0;
          color: #0f172a;
          font-size: 30px;
          line-height: 1;
          letter-spacing: -0.06em;
        }

        .sf-summary-count-item p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
          word-break: keep-all;
        }

        .sf-summary-count-strip {
          display: grid;
          grid-template-columns: 1.3fr 0.8fr 0.55fr;
          gap: 6px;
          height: 7px;
        }

        .sf-summary-count-strip span {
          display: block;
          margin: 0;
          border-radius: 999px;
          background: rgba(22, 125, 127, 0.18);
        }

        .sf-summary-count-strip span:first-child {
          background: #167d7f;
        }

        .sf-summary-score-item {
          display: grid;
          gap: 12px;
          background:
            radial-gradient(circle at 100% 0%, var(--grade-bg), transparent 36%),
            #f8fafc;
        }

        .sf-summary-score-main {
          display: grid;
          grid-template-columns: 76px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .sf-summary-score-ring {
          width: 76px;
          height: 76px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle, #ffffff 56%, transparent 58%),
            conic-gradient(var(--grade-color) 0 var(--score), #e2e8f0 var(--score) 100%);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .sf-summary-score-ring strong {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .sf-summary-state-copy {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .sf-summary-state-copy small {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-summary-score-item p,
        .sf-summary-guide-item p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
          word-break: keep-all;
        }

        .sf-summary-guide-item {
          display: grid;
          gap: 10px;
          align-content: start;
        }

        .sf-summary-guide-item .sf-score-help {
          padding: 10px 11px;
          background: rgba(255, 255, 255, 0.76);
        }

        .sf-summary-guide-item .sf-grade-legend {
          flex-wrap: nowrap;
          gap: 6px;
        }

        .sf-summary-guide-item .sf-grade-legend span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-height: 24px;
          padding: 0 8px;
          border-radius: 999px;
          color: var(--legend-color);
          background: var(--legend-bg);
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-summary-guide-item .sf-grade-legend i {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--legend-color);
        }

        .sf-summary-item .sf-grade-pill {
          margin-top: 10px;
          font-style: normal;
        }

        .sf-summary-state-copy .sf-grade-pill {
          margin-top: 0;
        }

        .sf-summary-item .sf-status-bar {
          margin-top: 12px;
        }

        .sf-summary-score-item .sf-status-bar {
          margin-top: 0;
        }

        .sf-notice-line,
        .sf-error-line {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0;
          padding: 12px 14px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
          word-break: keep-all;
        }

        .sf-notice-line {
          color: #167d7f;
          background: rgba(22, 125, 127, 0.09);
        }

        .sf-error-line {
          color: #14b8a6;
          background: rgba(20, 184, 166, 0.09);
        }

        .sf-history-grid {
          display: grid;
          grid-template-columns: minmax(300px, 0.74fr) minmax(0, 1.26fr);
          gap: 18px;
          align-items: stretch;
        }


        .sf-history-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 100%;
          padding: 24px;
        }

        .sf-history-trend-card {
          padding-bottom: 22px;
        }

        .sf-history-record-card {
          padding-bottom: 22px;
        }

        .sf-trend-chart {
          flex: 1;
          min-height: 300px;
          margin: 18px 0 14px;
          display: grid;
        }

        .sf-trend-chart-frame {
          width: 100%;
          min-height: 310px;
          padding: 16px 12px 8px;
          border-radius: 22px;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.07), transparent 32%),
            #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-trend-tooltip {
          min-width: 180px;
          padding: 12px 13px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.12);
        }

        .sf-trend-guide {
          margin: 8px 4px 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          line-height: 1.35;
        }

        .sf-trend-guide span,
        .sf-trend-guide em {
          min-height: 26px;
          padding: 6px 9px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.92);
          font-style: normal;
          white-space: nowrap;
        }

        .sf-trend-guide span {
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
          border-color: rgba(22, 125, 127, 0.16);
          font-weight: 950;
        }

        .sf-trend-tooltip strong,
        .sf-trend-tooltip span,
        .sf-trend-tooltip em {
          display: block;
        }

        .sf-trend-tooltip strong {
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
        }

        .sf-trend-tooltip > span,
        .sf-trend-tooltip > em {
          margin-top: 4px;
          color: #64748b;
          font-size: 11px;
          font-style: normal;
          font-weight: 850;
        }

        .sf-trend-tooltip div {
          display: grid;
          gap: 7px;
          margin-top: 10px;
        }

        .sf-trend-tooltip p {
          display: grid;
          grid-template-columns: 9px minmax(0, 1fr) auto;
          align-items: center;
          gap: 7px;
          margin: 0;
          color: #475569;
          font-size: 12px;
          font-weight: 850;
        }

        .sf-trend-tooltip i {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--tooltip-color);
        }

        .sf-trend-tooltip b {
          color: #0f172a;
          font-weight: 950;
        }

        .sf-history-grid.is-expanded .sf-trend-chart {
          flex: initial;
          grid-template-rows: repeat(4, minmax(58px, auto));
        }

        .sf-trend-row {
          display: grid;
          grid-template-columns: 84px 1fr 48px;
          align-items: center;
          gap: 14px;
          min-height: 58px;
          padding: 0 2px;
        }

        .sf-trend-row > span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .sf-trend-bar {
          height: 11px;
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .sf-trend-bar > span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #167d7f, #22c5c8);
        }

        .sf-trend-score {
          color: #0f172a;
          font-size: 12px;
          font-weight: 950;
          text-align: right;
        }

        .sf-record-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .sf-search-box {
          min-width: 240px;
          height: 42px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 14px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.95);
          color: #64748b;
        }

        .sf-search-box input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: #0f172a;
          font-size: 13px;
          font-weight: 700;
        }

        .sf-record-list {
          display: grid;
          gap: 12px;
        }

        .sf-record-toggle-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0 16px;
          border: 1px solid rgba(22, 125, 127, 0.18);
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.07);
          cursor: pointer;
          font-size: 13px;
          font-weight: 950;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .sf-record-toggle-button:hover {
          transform: translateY(-1px);
          border-color: rgba(22, 125, 127, 0.3);
          background: rgba(22, 125, 127, 0.1);
        }

        .sf-record-card {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 104px;
          align-items: stretch;
          gap: 14px;
          min-height: 116px;
          padding: 14px 16px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-record-card.is-active {
          background:
            linear-gradient(135deg, rgba(22, 125, 127, 0.1), rgba(255, 255, 255, 0.96)),
            #ffffff;
          border-color: rgba(22, 125, 127, 0.34);
          box-shadow: 0 18px 42px rgba(22, 125, 127, 0.12);
        }

        .sf-record-card > .sf-icon-tile {
          align-self: center;
        }

        .sf-record-content {
          align-self: center;
          min-width: 0;
        }

        .sf-record-content small {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-record-content strong {
          display: block;
          margin-top: 4px;
          color: #0f172a;
          font-size: 15px;
          letter-spacing: -0.035em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sf-record-content p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          word-break: keep-all;
        }

        .sf-record-side {
          width: 104px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          gap: 7px;
        }


        .sf-record-side .sf-grade-pill {
          min-height: 24px;
          padding: 0 9px;
          font-size: 11px;
        }

        .sf-score-badge,
        .sf-status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          white-space: nowrap;
          font-weight: 950;
        }

        .sf-score-badge {
          min-width: 58px;
          padding: 7px 10px;
          color: var(--grade-color, #167d7f);
          background: var(--grade-bg, rgba(22, 125, 127, 0.1));
          font-size: 13px;
        }

        .sf-status-badge {
          padding: 5px 9px;
          color: #64748b;
          background: rgba(100, 116, 139, 0.1);
          font-size: 11px;
        }

        .sf-record-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          width: 100%;
        }

        .sf-text-button {
          border: 0;
          cursor: pointer;
          padding: 0;
          color: #167d7f;
          background: transparent;
          font-size: 12px;
          font-weight: 950;
        }


        .sf-record-actions .sf-text-button {
          min-width: 74px;
          min-height: 28px;
          padding: 0 11px;
          border: 1px solid rgba(22, 125, 127, 0.18);
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.075);
          box-shadow: 0 8px 18px rgba(22, 125, 127, 0.08);
        }

        .sf-record-actions .sf-text-button:hover {
          background: rgba(22, 125, 127, 0.12);
          transform: translateY(-1px);
        }

        .sf-record-actions .sf-text-button.is-active {
          color: #ffffff;
          background: #167d7f;
          border-color: #167d7f;
          box-shadow: 0 12px 24px rgba(22, 125, 127, 0.18);
        }

        .sf-record-actions .sf-text-button:disabled {
          cursor: wait;
          opacity: 0.82;
          transform: none;
        }

        .sf-empty-card,
        .sf-detail-card {
          display: grid;
          gap: 12px;
          padding: 18px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px dashed rgba(148, 163, 184, 0.65);
          text-align: center;
          justify-items: center;
        }

        .sf-empty-card strong,
        .sf-detail-card strong {
          color: #0f172a;
          font-size: 16px;
        }

        .sf-empty-card {
          min-height: 238px;
          align-content: center;
        }

        .sf-history-trend-card .sf-empty-card {
          min-height: 176px;
        }

        .sf-empty-card p,
        .sf-detail-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          word-break: keep-all;
        }

        .sf-detail-card {
          margin-top: 14px;
          text-align: left;
          justify-items: stretch;
        }

        .sf-detail-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .sf-detail-metrics > div {
          padding: 13px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-detail-metrics span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-metrics strong {
          display: block;
          margin-top: 5px;
          font-size: 16px;
        }

        .sf-llm-report-card {
          display: grid;
          gap: 14px;
          margin-top: 14px;
          padding: 18px;
          border-radius: 20px;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.07), transparent 34%),
            #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.94);
          text-align: left;
        }

        .sf-llm-report-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .sf-llm-report-head small,
        .sf-llm-report-section span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-llm-report-head h3,
        .sf-llm-report-section strong {
          margin: 5px 0 0;
          color: #0f172a;
          font-size: 16px;
          line-height: 1.35;
          letter-spacing: -0.02em;
        }

        .sf-llm-report-section {
          display: grid;
          gap: 6px;
          padding: 13px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .sf-llm-report-section p,
        .sf-llm-report-section li {
          margin: 0;
          color: #475569;
          font-size: 13px;
          line-height: 1.62;
          word-break: keep-all;
        }

        .sf-llm-report-section ul {
          display: grid;
          gap: 7px;
          margin: 0;
          padding-left: 18px;
        }

        .sf-history-bottom {
          display: block;
        }

        .sf-history-tip {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 6px 0 0;
          padding: 13px 15px;
          border-radius: 18px;
          color: #475569;
          background: rgba(248, 250, 252, 0.92);
          border: 1px solid rgba(226, 232, 240, 0.9);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
          word-break: keep-all;
        }

        .sf-history-tip svg {
          flex: 0 0 auto;
          color: #167d7f;
        }


        .sf-record-list.is-expanded {
          max-height: 420px;
          overflow-y: auto;
          padding-right: 6px;
        }

        .sf-record-list.is-expanded::-webkit-scrollbar {
          width: 6px;
        }

        .sf-record-list.is-expanded::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(22, 125, 127, 0.28);
        }

        .sf-history-detail-section {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: 16px;
          align-items: start;
          scroll-margin-top: 104px;
        }

        .sf-history-detail-section .sf-detail-card,
        .sf-history-detail-section .sf-llm-report-card {
          margin-top: 0;
          height: auto;
          min-height: 0;
          background: #ffffff;
          border-style: solid;
          border-color: rgba(226, 232, 240, 0.94);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.055);
        }


        .sf-detail-card {
          align-content: start;
          padding: 24px;
          border-radius: 24px;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdfe 100%);
        }

        .sf-detail-card .sf-card-title-row {
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.86);
        }

        .sf-detail-kicker {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 28px;
          margin-bottom: 8px;
          padding: 0 11px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          border: 1px solid rgba(22, 125, 127, 0.16);
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-subcopy {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.5;
          word-break: keep-all;
        }

        .sf-detail-loading-card,
        .sf-detail-error-card {
          display: grid;
          grid-column: 1 / -1;
          gap: 10px;
          min-height: 220px;
          padding: 24px;
          border-radius: 24px;
          align-content: center;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.94);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.055);
        }

        .sf-detail-loading-card strong,
        .sf-detail-error-card strong {
          color: #0f172a;
          font-size: 18px;
          letter-spacing: -0.035em;
        }

        .sf-detail-loading-card p,
        .sf-detail-error-card p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          word-break: keep-all;
        }

        .sf-detail-error-card {
          border-color: rgba(244, 63, 94, 0.22);
          background: #fff7f8;
        }

        .sf-detail-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 16px 0 12px;
        }

        .sf-detail-metrics > div {
          min-height: auto;
          padding: 16px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow: none;
        }

        .sf-detail-metrics span {
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .sf-detail-metrics strong {
          display: block;
          margin-top: 6px;
          color: #0f172a;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .sf-detail-card > p {
          margin: 10px 0 0;
          padding: 12px 14px;
          border-radius: 16px;
          color: #475569;
          background: rgba(22, 125, 127, 0.055);
          border: 1px solid rgba(22, 125, 127, 0.08);
          font-size: 13px;
          line-height: 1.65;
          word-break: keep-all;
        }

        .sf-detail-card > p:last-child {
          background: #ffffff;
          border-style: dashed;
          border-color: rgba(148, 163, 184, 0.35);
        }


        .sf-history-detail-section {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: 16px;
          align-items: start;
        }

        .sf-history-detail-section .sf-detail-card,
        .sf-history-detail-section .sf-llm-report-card {
          margin-top: 0;
          height: auto;
          min-height: 0;
          align-self: start;
          background: #ffffff;
          border-style: solid;
          border-color: rgba(226, 232, 240, 0.94);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.055);
        }

        .sf-detail-card {
          padding: 24px;
          border-radius: 26px;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.06), transparent 36%),
            #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.94);
          text-align: left;
          justify-items: stretch;
          gap: 16px;
        }

        .sf-detail-card .sf-card-title-row {
          align-items: center;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.86);
        }

        .sf-detail-header-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .sf-detail-close-button {
          min-height: 30px;
          padding: 0 12px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 999px;
          color: #475569;
          background: #ffffff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 950;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .sf-detail-close-button:hover {
          transform: translateY(-1px);
          border-color: rgba(22, 125, 127, 0.24);
          color: #167d7f;
          background: rgba(22, 125, 127, 0.06);
        }

        .sf-detail-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 2px 0 0;
        }

        .sf-detail-metrics > div {
          min-height: 96px;
          padding: 16px;
          border-radius: 20px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(226, 232, 240, 0.94);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .sf-detail-metrics span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-metrics strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .sf-detail-summary-text,
        .sf-detail-recommend-text {
          margin: 0;
          padding: 14px 16px;
          border-radius: 18px;
          color: #475569;
          font-size: 13px;
          line-height: 1.65;
          word-break: keep-all;
        }

        .sf-detail-summary-text {
          background: rgba(22, 125, 127, 0.055);
          border: 1px solid rgba(22, 125, 127, 0.09);
        }

        .sf-detail-recommend-text {
          background: #f8fafc;
          border: 1px dashed rgba(148, 163, 184, 0.38);
        }

        .sf-detail-recommend-text::before {
          content: "연결된 추천";
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 2px;
        }


        .sf-history-detail-section {
          display: grid;
          grid-template-columns: minmax(360px, 0.92fr) minmax(0, 1.08fr);
          gap: 18px;
          align-items: start;
          margin-top: 18px;
        }

        .sf-history-detail-section .sf-detail-card,
        .sf-history-detail-section .sf-llm-report-card {
          margin-top: 0;
          height: auto !important;
          min-height: 0;
          align-self: start;
          border: 1px solid rgba(226, 232, 240, 0.92);
          border-radius: 28px;
          background: #ffffff;
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.07);
        }

        .sf-detail-card {
          position: relative;
          overflow: hidden;
          padding: 28px;
          background:
            radial-gradient(circle at 92% 0%, rgba(22, 125, 127, 0.10), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #fbfefe 100%);
        }

        .sf-detail-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 24px;
          right: 24px;
          height: 3px;
          border-radius: 999px;
          background: linear-gradient(90deg, #167d7f, rgba(22, 125, 127, 0.12));
        }

        .sf-detail-card .sf-card-title-row {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-detail-card .sf-card-title-row h2 {
          margin-top: 6px;
          color: #0f172a;
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .sf-detail-card .sf-card-title-row span:first-child {
          color: #475569;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.01em;
        }

        .sf-detail-header-actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .sf-detail-header-actions .sf-status-badge {
          min-height: 32px;
          padding: 0 12px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
          border: 1px solid rgba(22, 125, 127, 0.08);
        }

        .sf-detail-close-button {
          min-height: 32px;
          padding: 0 13px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 999px;
          color: #475569;
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          font-size: 12px;
          font-weight: 950;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
        }

        .sf-detail-close-button:hover {
          transform: translateY(-1px);
          border-color: rgba(22, 125, 127, 0.28);
          color: #167d7f;
          background: rgba(22, 125, 127, 0.07);
        }

        .sf-detail-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 0;
        }

        .sf-detail-metrics > div {
          position: relative;
          min-height: 112px;
          padding: 18px;
          border-radius: 22px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
        }

        .sf-detail-metrics > div::after {
          content: "";
          position: absolute;
          right: 16px;
          bottom: 16px;
          width: 28px;
          height: 28px;
          border-radius: 12px;
          background: rgba(22, 125, 127, 0.08);
        }

        .sf-detail-metrics span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-metrics strong {
          display: block;
          margin-top: 10px;
          color: #0f172a;
          font-size: 25px;
          font-weight: 950;
          letter-spacing: -0.06em;
        }


        .sf-detail-metric-state {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          margin-top: 10px;
          padding: 5px 9px;
          border-radius: 999px;
          color: var(--grade-color);
          background: var(--grade-bg);
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-state-label {
          display: block;
          margin-top: 12px;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-score-meaning {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.55;
          word-break: keep-all;
        }

        .sf-detail-metric-state::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: var(--grade-color);
        }

        .sf-detail-metrics .sf-status-bar {
          margin-top: 14px;
        }

        .sf-detail-summary-text,
        .sf-detail-recommend-text {
          position: relative;
          margin: 0;
          padding: 16px 18px;
          border-radius: 20px;
          color: #475569;
          font-size: 13px;
          line-height: 1.72;
          word-break: keep-all;
        }

        .sf-detail-summary-text {
          margin-top: 16px;
          background: rgba(22, 125, 127, 0.055);
          border: 1px solid rgba(22, 125, 127, 0.1);
        }

        .sf-detail-summary-text::before {
          content: "상태 요약";
          display: block;
          margin-bottom: 6px;
          color: #167d7f;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-recommend-text {
          margin-top: 12px;
          background: #f8fafc;
          border: 1px dashed rgba(148, 163, 184, 0.4);
        }

        .sf-detail-recommend-text::before {
          content: "연결된 추천";
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-detail-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .sf-detail-actions a,
        .sf-detail-actions button {
          min-height: 38px;
          border-radius: 999px;
          font-weight: 950;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .sf-llm-report-card {
          padding: 26px;
          background:
            radial-gradient(circle at 100% 0%, rgba(15, 23, 42, 0.035), transparent 32%),
            #ffffff;
        }

        .sf-llm-report-card .sf-card-title-row {
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-llm-report-card h2 {
          color: #0f172a;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .sf-llm-report-card .sf-status-badge {
          color: #475569;
          background: #f1f5f9;
          border: 1px solid rgba(226, 232, 240, 0.92);
        }

        .sf-llm-report-card p,
        .sf-llm-report-card li {
          color: #475569;
          line-height: 1.75;
          word-break: keep-all;
        }

        .sf-llm-report-card section,
        .sf-llm-report-card article,
        .sf-llm-report-card .sf-report-block {
          border-radius: 20px;
        }


        .sf-detail-insight-panel,
        .sf-detail-recommend-panel {
          margin-top: 14px;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.92);
          background: rgba(248, 250, 252, 0.72);
        }

        .sf-detail-insight-panel {
          background:
            linear-gradient(180deg, rgba(22, 125, 127, 0.07) 0%, rgba(248, 250, 252, 0.76) 100%);
          border-color: rgba(22, 125, 127, 0.12);
        }

        .sf-detail-panel-heading {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 14px;
        }

        .sf-detail-panel-heading span {
          color: #167d7f;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.01em;
        }

        .sf-detail-panel-heading strong {
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
          letter-spacing: -0.035em;
        }

        .sf-detail-insight-list {
          display: grid;
          gap: 10px;
        }

        .sf-detail-insight-item {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(226, 232, 240, 0.82);
        }

        .sf-detail-insight-item span {
          color: #0f766e;
          font-size: 12px;
          font-weight: 950;
        }

        .sf-detail-insight-item p {
          margin: 0;
          color: #475569;
          font-size: 13px;
          line-height: 1.65;
          word-break: keep-all;
        }

        .sf-detail-recommend-panel > p {
          margin: 0 0 12px;
          color: #475569;
          font-size: 13px;
          line-height: 1.68;
          word-break: keep-all;
        }

        .sf-detail-recommend-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sf-detail-recommend-chips span {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          color: #0f766e;
          background: rgba(22, 125, 127, 0.08);
          border: 1px solid rgba(22, 125, 127, 0.12);
          font-size: 12px;
          font-weight: 900;
        }

        .sf-detail-summary-text,
        .sf-detail-recommend-text {
          display: none;
        }

        .sf-llm-report-card {
          padding: 28px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.055), transparent 34%),
            #ffffff;
        }

        .sf-llm-report-card .sf-card-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 18px;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-llm-report-card .sf-card-title-row h2 {
          margin-top: 4px;
          font-size: 23px;
          font-weight: 950;
          letter-spacing: -0.05em;
          color: #0f172a;
        }

        .sf-llm-report-card .sf-card-title-row span:first-child {
          color: #167d7f;
          font-size: 12px;
          font-weight: 950;
        }

        .sf-llm-report-card .sf-status-badge {
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          color: #475569;
          background: #f1f5f9;
          border: 1px solid rgba(226, 232, 240, 0.9);
          white-space: nowrap;
        }

        .sf-llm-report-card section,
        .sf-llm-report-card article,
        .sf-llm-report-card .sf-report-block {
          padding: 18px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.92);
        }

        .sf-llm-report-card section + section,
        .sf-llm-report-card article + article,
        .sf-llm-report-card .sf-report-block + .sf-report-block {
          margin-top: 12px;
        }

        .sf-llm-report-card h3,
        .sf-llm-report-card h4 {
          margin: 0 0 9px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: -0.025em;
        }

        .sf-llm-report-card p {
          margin: 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.82;
          word-break: keep-all;
        }

        .sf-llm-report-card ul {
          margin: 0;
          padding-left: 18px;
        }

        .sf-llm-report-card li {
          color: #475569;
          font-size: 14px;
          line-height: 1.85;
          word-break: keep-all;
        }

        .sf-llm-report-card li + li {
          margin-top: 5px;
        }

        @media (max-width: 720px) {
          .sf-detail-insight-item {
            grid-template-columns: 1fr;
          }

          .sf-llm-report-card {
            padding: 22px;
          }
        }


        @media (max-width: 980px) {
          .sf-history-detail-section {
            grid-template-columns: 1fr;
          }

          .sf-detail-card,
          .sf-llm-report-card {
            border-radius: 24px;
          }
        }

        @media (max-width: 720px) {
          .sf-detail-card {
            padding: 22px;
          }

          .sf-detail-card .sf-card-title-row {
            flex-direction: column;
          }

          .sf-detail-header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .sf-detail-metrics {
            grid-template-columns: 1fr;
          }
        }


        @media (max-width: 980px) {
          .sf-history-hero,
          .sf-history-grid,
          .sf-history-main-card,
          .sf-history-detail-section {
            grid-template-columns: 1fr;
          }

          .sf-history-card {
            height: 100%;
          }

          .sf-trend-chart {
            flex: initial;
            grid-template-rows: none;
          }

          .sf-score-preview {
            min-height: 100%;
          }

          .sf-guide-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .sf-history-main-card,
          .sf-history-card {
            padding: 18px;
            border-radius: 24px;
          }
          .sf-history-main-card h1 {
            font-size: 36px;
          }

          .sf-history-actions {
            flex-wrap: wrap;
          }

          .sf-summary-grid,
          .sf-detail-metrics {
            grid-template-columns: 1fr;
          }

          .sf-record-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .sf-search-box {
            width: 100%;
            min-width: 0;
          }

          .sf-record-card {
            grid-template-columns: 48px 1fr;
            min-height: 100%;
          }

          .sf-history-flow-strip span {
            flex: 1 1 calc(50% - 8px);
            justify-content: center;
          }

          .sf-record-side {
            grid-column: 2;
            width: 100%;
            align-items: flex-start;
            justify-items: start;
          }

          .sf-record-actions {
            justify-content: flex-start;
          }

          .sf-trend-row {
            grid-template-columns: 70px 1fr 42px;
          }
        }

        .sf-history-detail-section {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 24px;
          overflow: hidden;
          background: rgba(15, 23, 42, 0.56);
          backdrop-filter: blur(10px);
        }

        .sf-history-detail-dialog {
          width: min(1180px, 100%);
          max-height: calc(100dvh - 48px);
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.76);
          border-radius: 28px;
          outline: none;
          background: #f8fafc;
          box-shadow: 0 32px 100px rgba(15, 23, 42, 0.34);
        }

        .sf-history-detail-dialog:focus-visible {
          box-shadow:
            0 0 0 3px rgba(22, 125, 127, 0.28),
            0 32px 100px rgba(15, 23, 42, 0.34);
        }

        .sf-history-detail-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 22px;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid rgba(226, 232, 240, 0.92);
        }

        .sf-history-detail-modal-title {
          min-width: 0;
        }

        .sf-history-detail-modal-title .sf-detail-kicker {
          margin-bottom: 6px;
        }

        .sf-history-detail-modal-title h2 {
          margin: 0;
          color: #0f172a;
          font-size: 23px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .sf-history-detail-modal-title p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.5;
          word-break: keep-all;
        }

        .sf-history-detail-modal-header .sf-detail-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sf-history-detail-modal-header .sf-detail-close-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-height: 36px;
        }

        .sf-history-detail-content {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: 16px;
          align-items: start;
          min-height: 0;
          padding: 18px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }

        .sf-history-detail-content .sf-detail-card,
        .sf-history-detail-content .sf-llm-report-card {
          width: 100%;
          min-height: 0;
          height: auto !important;
          margin: 0;
          border-radius: 24px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
        }

        .sf-history-detail-dialog > .sf-detail-loading-card,
        .sf-history-detail-dialog > .sf-detail-error-card {
          width: auto;
          max-width: none;
          min-height: 260px;
          margin: 18px;
          overflow-y: auto;
          box-shadow: none;
        }

        @media (max-width: 980px) {
          .sf-history-detail-content {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .sf-history-detail-section {
            padding: 0;
            background: rgba(15, 23, 42, 0.64);
          }

          .sf-history-detail-dialog {
            width: 100%;
            height: 100dvh;
            max-height: 100dvh;
            border: 0;
            border-radius: 0;
          }

          .sf-history-detail-modal-header {
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
          }

          .sf-history-detail-modal-title h2 {
            font-size: 20px;
          }

          .sf-history-detail-modal-header .sf-status-badge {
            display: none;
          }

          .sf-history-detail-content {
            padding: 14px;
          }

          .sf-history-detail-content .sf-detail-card,
          .sf-history-detail-content .sf-llm-report-card {
            padding: 20px;
            border-radius: 22px;
          }

          .sf-history-detail-dialog > .sf-detail-loading-card,
          .sf-history-detail-dialog > .sf-detail-error-card {
            min-height: 220px;
            margin: 14px;
          }
        }
      `}</style>

      <div className="sf-history-page">
        <section className="sf-history-hero">
          <div className="sf-history-main-card">
            <div>
              <span className="sf-history-eyebrow">
                <History size={15} /> 분석 이력
              </span>

              <h1>
                분석 이력으로
                <br />
                <span className="sf-gradient-text">관리 흐름을 이어가세요</span>
              </h1>

              <p>
                날짜별 분석 기록에서 종합 점수, 색소침착, 주름 지표와
                연결된 추천 흐름을 상세하게 다시 확인할 수 있습니다.
              </p>

              <div className="sf-history-flow-strip" aria-label="분석 이력 관리 흐름">
                <span>분석일 확인</span>
                <span>종합 점수</span>
                <span>색소침착·주름</span>
                <span>추천 연결</span>
              </div>

              <div className="sf-history-actions">
                <Button to="/analysis/capture" size="lg">
                  새 분석 시작 <ArrowRight size={18} />
                </Button>
                <Button to="/recommendations" variant="secondary" size="lg">
                  추천 보기
                </Button>
              </div>
            </div>

            <div className="sf-score-preview" style={getGradeStyle(recentAverageGradeMeta)}>
              <div className="sf-score-preview-main">
                <div
                  className="sf-score-ring"
                  style={{ "--score": `${recentAverageSummary.hasScore ? recentAverageSummary.score : 0}%` }}
                >
                  <strong>{recentAverageSummary.hasScore ? recentAverageSummary.score : "분석 전"}</strong>
                </div>
                <div className="sf-score-state-copy">
                  <span className="sf-score-state-label">최근 분석 평균</span>
                  <span className="sf-grade-pill">{recentAverageGradeMeta.label}</span>
                  <p>최근 분석 기록을 기준으로 관리 흐름을 요약한 점수입니다.</p>
                </div>
              </div>
              <span className="sf-score-date">
                {recentAverageSummary.hasScore ? recentAverageSummary.basisLabel : "첫 분석 후 표시"}
              </span>
              <div className="sf-status-bar" aria-hidden="true">
                <span />
              </div>
              <div className="sf-score-help">
                <Info size={15} />
                <span>점수가 높을수록 현재 피부 상태가 양호하다는 의미입니다.</span>
              </div>
              <div className="sf-grade-legend" aria-label="피부 상태 단계 안내">
                {scoreGradeLegend.map((item) => (
                  <span
                    key={item.label}
                    style={{ "--legend-color": item.color, "--legend-bg": item.bg }}
                  >
                    <i aria-hidden="true" /> {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </section>

        <section className="sf-history-grid">
          <Card className="sf-history-card sf-history-trend-card">
            <div className="sf-card-title-row">
              <div>
                <small>점수 흐름</small>
                <h2>피부 점수 추이</h2>
              </div>
              <Badge>{isTrendLoading ? "불러오는 중" : hasScoreTrendPoints ? "최근 7회" : "분석 전"}</Badge>
            </div>

            <div className="sf-trend-chart">
              {isTrendLoading ? (
                <div className="sf-empty-card">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <LineChartIcon size={21} />
                  </span>
                  <strong>점수 추이를 불러오는 중입니다</strong>
                  <p>분석 이력의 종합 점수, 색소침착, 주름 흐름을 준비하고 있습니다.</p>
                </div>
              ) : scoreTrendError ? (
                <div className="sf-empty-card">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <LineChartIcon size={21} />
                  </span>
                  <strong>점수 추이를 불러오지 못했습니다</strong>
                  <p>{scoreTrendError}</p>
                </div>
              ) : hasScoreTrendPoints ? (
                <div className="sf-trend-chart-frame">
                  <ResponsiveContainer width="100%" height={310}>
                    <RechartsLineChart
                      data={scoreTrendChartData}
                      margin={{ top: 12, right: 18, bottom: 8, left: -12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.28)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#64748B", fontSize: 11, fontWeight: 800 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 20, 40, 60, 80, 100]}
                        tick={{ fill: "#64748B", fontSize: 11, fontWeight: 800 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <ReferenceLine
                        y={80}
                        stroke="rgba(22, 125, 127, 0.34)"
                        strokeDasharray="5 5"
                        label={{ value: "양호", position: "insideTopLeft", fill: "#167D7F", fontSize: 11, fontWeight: 900 }}
                      />
                      <ReferenceLine
                        y={60}
                        stroke="rgba(245, 158, 11, 0.36)"
                        strokeDasharray="5 5"
                        label={{ value: "주의", position: "insideTopLeft", fill: "#D97706", fontSize: 11, fontWeight: 900 }}
                      />
                      <Tooltip content={<ScoreTrendTooltip />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, fontWeight: 900, paddingBottom: 8 }}
                      />
                      {activeTrendSeries.map((series) => (
                        <Line
                          key={series.code}
                          type="monotone"
                          dataKey={series.code}
                          name={series.name}
                          stroke={series.color}
                          strokeWidth={series.code === "total" ? 3 : 2.2}
                          dot={{ r: 3.5, strokeWidth: 2, fill: "#ffffff" }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                    </RechartsLineChart>
                  </ResponsiveContainer>
                  <div className="sf-trend-guide" aria-label="점수 추이 기준 안내">
                    <span>완료된 분석 기준</span>
                    <em>80점 이상 양호</em>
                    <em>60~79점 주의</em>
                    <em>60점 미만 관리필요</em>
                  </div>
                </div>
              ) : (
                <div className="sf-empty-card">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <LineChartIcon size={21} />
                  </span>
                  <strong>아직 비교할 분석 이력이 없습니다</strong>
                  <p>첫 분석 후 종합 점수, 색소침착, 주름 변화 흐름이 표시됩니다.</p>
                </div>
              )}
            </div>

            <p className="sf-notice-line" style={{ marginTop: 16 }}>
              <Clock size={16} />
              <span>
                같은 시간대와 조명 환경에서 주기적으로 분석하면 변화 흐름을 더 안정적으로 비교할 수 있습니다.
              </span>
            </p>
          </Card>

          <Card className="sf-history-card sf-history-record-card">
            <div className="sf-record-toolbar">
              <div className="sf-card-title-row" style={{ marginBottom: 0 }}>
                <div>
                  <small>분석 기록</small>
                  <h2>날짜별 분석 기록</h2>
                </div>
              </div>

              <label className="sf-search-box">
                <Search size={16} />
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => handleSearchTextChange(event.target.value)}
                  placeholder="날짜 또는 키워드 검색"
                />
              </label>
            </div>

            {isLoading && <p className="sf-notice-line" style={{ marginTop: 12 }}>분석 이력을 불러오는 중입니다.</p>}
            {historyError && <p className="sf-error-line" style={{ marginTop: 12 }}>{historyError}</p>}

            <div className={`sf-record-list${displayedRecords.length > 4 ? " is-expanded" : ""}`}>
              {hasSearchResults ? (
                displayedRecords.map((record, index) => {
                  const recordId = getRecordId(record);
                  const recordScore = getRecordScore(record);
                  const recordStatus = getRecordStatus(record);
                  const canShowRecordScore = shouldShowAnalysisScore({
                    score: recordScore,
                    status: recordStatus,
                    saved: record.saved,
                    code: record.code,
                  });
                  const recordGradeMeta = getScoreGradeMeta(
                    canShowRecordScore ? recordScore : null,
                    getRecordGradeStatus(record)
                  );

                  return (
                    <div
                      className={`sf-record-card${recordId === activeSelectedDetailId ? " is-active" : ""}`}
                      key={recordId || index}
                    >
                      <span className="sf-icon-tile" aria-hidden="true">
                        <CalendarDays size={21} />
                      </span>

                      <div className="sf-record-content">
                        <small>{formatDate(getRecordDate(record))}</small>
                        <strong>{record.summary || "피부 분석 기록"}</strong>
                        <p>
                          {canShowRecordScore
                            ? `색소침착 ${getMetricScore(record.metrics, "색소")} · 주름 ${getMetricScore(record.metrics, "주름")}`
                            : "분석 완료 후 세부 점수가 표시됩니다."}
                        </p>
                      </div>

                      <div className="sf-record-side" style={getGradeStyle(recordGradeMeta)}>
                        <span className="sf-score-badge">
                          {canShowRecordScore
                            ? formatScoreWithGrade(recordScore, getRecordScoreGrade(record), "점수 없음")
                            : "점수 없음"}
                        </span>
                        <span className="sf-grade-pill">{recordGradeMeta.label}</span>
                        <div className="sf-record-actions">
                          <button
                            type="button"
                            className={`sf-text-button${recordId === activeSelectedDetailId ? " is-active" : ""}`}
                            onClick={(event) => handleDetailClick(recordId, event.currentTarget)}
                            aria-pressed={recordId === activeSelectedDetailId}
                            disabled={isDetailLoading && recordId === activeSelectedDetailId}
                          >
                            {recordId === activeSelectedDetailId
                              ? isDetailLoading
                                ? "불러오는 중"
                                : "상세 확인 중"
                              : "상세 보기"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : hasSearchKeyword ? (
                <div className="sf-empty-card">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <Search size={21} />
                  </span>
                  <strong>검색 조건에 맞는 분석 이력이 없습니다</strong>
                  <p>검색어를 줄이거나 날짜/상태 정보를 다시 확인해 주세요.</p>
                </div>
              ) : (
                <div className="sf-empty-card">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <Sparkles size={21} />
                  </span>
                  <strong>아직 분석 이력이 없습니다</strong>
                  <p>첫 피부 분석을 진행하면 결과와 추천 내용을 이곳에서 확인할 수 있습니다.</p>
                  <Button to="/analysis/capture" size="sm">
                    분석 시작하기 <ArrowRight size={15} />
                  </Button>
                </div>
              )}
            </div>

          </Card>
        </section>

        {shouldShowDetailSection && createPortal(
          <section
            className="sf-history-detail-section"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                handleCloseDetail();
              }
            }}
          >
            <div
              className="sf-history-detail-dialog"
              ref={detailDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sf-history-detail-title"
              tabIndex={-1}
            >
              <header className="sf-history-detail-modal-header">
                <div className="sf-history-detail-modal-title">
                  <span className="sf-detail-kicker">선택한 분석 상세</span>
                  <h2 id="sf-history-detail-title">분석 상세 리포트</h2>
                  <p>
                    {selectedModalRecord
                      ? `${formatDate(getRecordDate(selectedModalRecord))} · 피부 관리 참고 정보`
                      : "선택한 이력의 상세 정보를 확인합니다."}
                  </p>
                </div>
                <div className="sf-detail-header-actions">
                  {selectedModalRecord && (
                    <span className="sf-status-badge">
                      {getStatusLabel(getRecordStatus(selectedModalRecord))}
                    </span>
                  )}
                  <button
                    type="button"
                    className="sf-detail-close-button"
                    onClick={handleCloseDetail}
                    aria-label="분석 상세 리포트 닫기"
                  >
                    <X size={16} aria-hidden="true" />
                    <span>닫기</span>
                  </button>
                </div>
              </header>

            {isDetailLoading ? (
              <div className="sf-detail-loading-card">
                <span className="sf-detail-kicker">상세 분석 정보</span>
                <strong>선택한 이력의 상세 결과를 불러오는 중입니다.</strong>
                <p>분석 결과와 AI 요약 리포트를 함께 준비하고 있습니다.</p>
              </div>
            ) : detailError ? (
              <div className="sf-detail-error-card">
                <span className="sf-detail-kicker">상세 분석 정보</span>
                <strong>상세 정보를 불러오지 못했습니다.</strong>
                <p>{detailError}</p>
                <button
                  type="button"
                  className="sf-detail-close-button"
                  onClick={handleCloseDetail}
                  aria-label="상세 분석 정보 닫기"
                >
                  목록으로 돌아가기
                </button>
              </div>
            ) : visibleSelectedDetail ? (
              <div className="sf-history-detail-content">
                <div className="sf-detail-card">
                  <div className="sf-card-title-row">
                    <div>
                      <small>분석 결과 기반 관리 포인트</small>
                      <h2>상세 분석 정보</h2>
                      <p className="sf-detail-subcopy">점수와 상태 배지는 서로 다른 기준의 참고 정보로 함께 표시됩니다.</p>
                    </div>
                  </div>

                  <div className="sf-detail-metrics">
                    <div style={getGradeStyle(selectedDetailTotalGradeMeta)}>
                      <span>종합 점수</span>
                      <strong>
                        {canShowSelectedDetailScore
                          ? formatScoreWithGrade(
                              getRecordScore(visibleSelectedDetail),
                              getRecordScoreGrade(visibleSelectedDetail),
                              "점수 없음",
                            )
                          : "점수 없음"}
                      </strong>
                      <small className="sf-detail-state-label">현재 상태</small>
                      <em className="sf-detail-metric-state">{selectedDetailTotalGradeMeta.label}</em>
                      <p className="sf-detail-score-meaning">
                        {getScoreInterpretation(
                          canShowSelectedDetailScore ? getRecordScore(visibleSelectedDetail) : null,
                          "종합 점수"
                        )}
                      </p>
                      <div className="sf-status-bar" aria-hidden="true">
                        <span />
                      </div>
                    </div>
                    <div style={getGradeStyle(selectedDetailPigmentationGradeMeta)}>
                      <span>색소침착</span>
                      <strong>
                        {canShowSelectedDetailScore
                          ? getMetricScore(visibleSelectedDetail.metrics, "색소")
                          : "점수 없음"}
                      </strong>
                      <small className="sf-detail-state-label">현재 상태</small>
                      <em className="sf-detail-metric-state">{selectedDetailPigmentationGradeMeta.label}</em>
                      <p className="sf-detail-score-meaning">
                        {getScoreInterpretation(
                          canShowSelectedDetailScore ? selectedDetailPigmentationScore : null,
                          "색소침착"
                        )}
                      </p>
                      <div className="sf-status-bar" aria-hidden="true">
                        <span />
                      </div>
                    </div>
                    <div style={getGradeStyle(selectedDetailWrinkleGradeMeta)}>
                      <span>주름</span>
                      <strong>
                        {canShowSelectedDetailScore
                          ? getMetricScore(visibleSelectedDetail.metrics, "주름")
                          : "점수 없음"}
                      </strong>
                      <small className="sf-detail-state-label">현재 상태</small>
                      <em className="sf-detail-metric-state">{selectedDetailWrinkleGradeMeta.label}</em>
                      <p className="sf-detail-score-meaning">
                        {getScoreInterpretation(
                          canShowSelectedDetailScore ? selectedDetailWrinkleScore : null,
                          "주름"
                        )}
                      </p>
                      <div className="sf-status-bar" aria-hidden="true">
                        <span />
                      </div>
                    </div>
                  </div>

                  <div className="sf-detail-insight-panel">
                    <div className="sf-detail-panel-heading">
                      <span>관리 포인트</span>
                      <strong>분석 결과 기반으로 확인할 항목</strong>
                    </div>
                    <div className="sf-detail-insight-list">
                      {getHistoryDetailInsightItems(visibleSelectedDetail).map((item) => (
                        <div className="sf-detail-insight-item" key={item.title}>
                          <span>{item.title}</span>
                          <p>{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sf-detail-recommend-panel">
                    <div className="sf-detail-panel-heading">
                      <span>연결된 추천</span>
                      <strong>추천 화면에서 이어서 확인할 수 있어요</strong>
                    </div>
                    <p>{visibleSelectedDetail.statusDescription || visibleSelectedDetail.summary || "상세 분석 설명이 없습니다."}</p>
                    <div className="sf-detail-recommend-chips">
                      {getHistoryDetailRecommendationItems(visibleSelectedDetail.recommendations).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </div>

                  <div className="sf-detail-actions">
                    <Button to={selectedRecommendationPath} variant="secondary" size="sm">
                      맞춤 추천 보기
                    </Button>
                    <Button to={selectedDietGuidePath} variant="secondary" size="sm">
                      식습관 가이드 보기
                    </Button>
                  </div>
                </div>

                <div className="sf-llm-report-card">
                  <div className="sf-llm-report-head">
                    <div>
                      <small>AI 요약 리포트</small>
                      <h3>AI 요약 리포트</h3>
                    </div>
                    <span className="sf-status-badge">
                      {llmReport ? getLlmReportSourceLabel(llmReport.source) : "리포트 출처"}
                    </span>
                  </div>

                  {isLlmReportLoading && (
                    <p className="sf-notice-line">AI 요약 리포트를 불러오는 중입니다.</p>
                  )}

                  {!isLlmReportLoading && llmReportError && (
                    <p className="sf-error-line">{llmReportError}</p>
                  )}

                  {!isLlmReportLoading && !llmReportError && llmReport && !hasLlmReportContent && (
                    <p className="sf-notice-line">아직 표시할 AI 요약 리포트가 없습니다.</p>
                  )}

                  {!isLlmReportLoading && !llmReportError && hasLlmReportContent && (
                    <>
                      {hasText(safeLlmReportBody.title) && (
                        <div className="sf-llm-report-section">
                          <span>리포트 제목</span>
                          <strong>{safeLlmReportBody.title}</strong>
                        </div>
                      )}

                      {hasText(safeLlmReportBody.summary) && (
                        <div className="sf-llm-report-section">
                          <span>전체 요약</span>
                          <p>{safeLlmReportBody.summary}</p>
                        </div>
                      )}

                      {hasText(safeLlmReportBody.skinStatus) && (
                        <div className="sf-llm-report-section">
                          <span>피부 상태 요약</span>
                          <p>{safeLlmReportBody.skinStatus}</p>
                        </div>
                      )}

                      {llmReportKeyPoints.length > 0 && (
                        <div className="sf-llm-report-section">
                          <span>핵심 포인트</span>
                          <ul>
                            {llmReportKeyPoints.map((point, index) => (
                              <li key={`${point}-${index}`}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {hasText(safeLlmReportBody.recommendationSummary) && (
                        <div className="sf-llm-report-section">
                          <span>추천 요약</span>
                          <p>{safeLlmReportBody.recommendationSummary}</p>
                        </div>
                      )}

                      {hasText(safeLlmReportBody.careGuide) && (
                        <div className="sf-llm-report-section">
                          <span>관리 가이드</span>
                          <p>{safeLlmReportBody.careGuide}</p>
                        </div>
                      )}

                      {hasText(safeLlmReportBody.disclaimer) && (
                        <div className="sf-llm-report-section">
                          <span>참고 안내</span>
                          <p>{safeLlmReportBody.disclaimer}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}
            </div>
          </section>,
          document.body
        )}

        <section className="sf-history-bottom">
          <p className="sf-history-tip">
            <Clock size={16} />
            <span>
              같은 촬영 조건에서 분석하면 점수 흐름을 더 안정적으로 비교할 수 있으며,
              상세 보기를 통해 과거 분석 결과와 추천 내용을 다시 확인할 수 있습니다.
            </span>
          </p>
        </section>
      </div>
    </PageLayout>
  );
}

export default HistoryPage;
