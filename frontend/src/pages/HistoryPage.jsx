import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  History,
  LineChart,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getHistory, getHistoryDetail, getHistoryLlmReport } from "../api/historyApi";
import { shouldShowAnalysisScore } from "../utils/analysisStatus";

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

function normalizeHistoryData(data) {
  return {
    summary: {
      ...defaultHistoryData.summary,
      ...(data?.summary || {}),
    },
    records: Array.isArray(data?.records) ? data.records : [],
  };
}

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

function formatScore(score, emptyText = "분석 전") {
  const numericScore = getScoreNumber(score);

  if (numericScore === null) return emptyText;

  return `${numericScore}점`;
}

function getScoreNumber(score) {
  if (score === null || score === undefined || score === "") return null;

  const numericScore = Number(score);

  if (Number.isNaN(numericScore)) return null;

  return Math.max(0, Math.min(100, Math.round(numericScore)));
}

function hasScoreValue(score) {
  return getScoreNumber(score) !== null;
}

function formatDiff(scoreDiff) {
  if (scoreDiff === null || scoreDiff === undefined || scoreDiff === "") {
    return "비교 전";
  }

  const numericDiff = Number(scoreDiff);

  if (Number.isNaN(numericDiff)) return "비교 전";
  if (numericDiff > 0) return `+${numericDiff}점`;
  if (numericDiff < 0) return `${numericDiff}점`;

  return "변화 없음";
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
    risk: "관리 필요",
    high: "관리 필요",
    danger: "관리 필요",
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

function getMetricScore(metrics, keyword) {
  if (!Array.isArray(metrics) || metrics.length === 0) return "분석 전";

  const matchedMetric = metrics.find((metric) => {
    const name = getMetricName(metric);
    return String(name).includes(keyword);
  });

  const score =
    matchedMetric?.metricScore ??
    matchedMetric?.metric_score ??
    matchedMetric?.score ??
    matchedMetric?.value ??
    matchedMetric?.metricValue ??
    matchedMetric?.metric_value;

  return formatScore(score);
}

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

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

const SAFE_LLM_DISCLAIMER =
  "이 내용은 피부 관리 참고 정보이며, 개인별 관리 방향을 돕기 위한 안내입니다.";

function getSafeLlmDisclaimer(disclaimer) {
  if (!hasText(disclaimer)) return "";

  const diagnosisTerm = ["진", "단"].join("");
  const unsafePattern = new RegExp(
    `${diagnosisTerm}|의학적|의료적?\\s*판단|치료`
  );

  return unsafePattern.test(disclaimer) ? SAFE_LLM_DISCLAIMER : disclaimer;
}

function getLlmReportSourceLabel(source) {
  const normalizedSource = String(source || "").trim().toLowerCase();
  const sourceMap = {
    generated: "새로 생성된 리포트",
    database: "저장된 리포트",
    copied: "저장된 리포트",
  };

  return sourceMap[normalizedSource] || "리포트 출처 확인 중";
}

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

function getRecordId(record) {
  return record?.analysisId || record?.analysis_id || record?.id || record?.resultId;
}

function getRecordDate(record) {
  return record?.analyzedAt || record?.analyzed_at || record?.createdAt || record?.created_at;
}

function getRecordStatus(record) {
  return record?.analysisStatus || record?.analysis_status || record?.status;
}

function getRecordScore(record) {
  return record?.totalScore ?? record?.total_score ?? record?.totalSkinScore ?? record?.total_skin_score;
}

function HistoryPage() {
  const [historyData, setHistoryData] = useState(defaultHistoryData);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [llmReport, setLlmReport] = useState(null);
  const [isLlmReportLoading, setIsLlmReportLoading] = useState(false);
  const [llmReportError, setLlmReportError] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        setIsLoading(true);
        setHistoryError("");

        const data = await getHistory();

        if (isMounted) {
          setHistoryData(normalizeHistoryData(data));
        }
      } catch (error) {
        console.error("분석 이력 API 호출 실패:", error);

        if (isMounted) {
          setHistoryError(
            "분석 이력을 불러오지 못했습니다. 로그인 상태를 확인한 후 다시 시도해주세요."
          );
          setHistoryData(defaultHistoryData);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = historyData.summary || defaultHistoryData.summary;
  const records = useMemo(
    () => (Array.isArray(historyData.records) ? historyData.records : []),
    [historyData.records]
  );
  const latestStatus = summary.latestStatus ?? summary.latest_status;
  const latestRawScore = summary.latestTotalScore ?? summary.latest_total_score;
  const latestScore = getScoreNumber(latestRawScore);
  const hasLatestScore = shouldShowAnalysisScore({
    score: latestRawScore,
    status: latestStatus,
    saved: summary.saved,
  });
  const hasRecords = records.length > 0;
  const canShowScoreDiff = hasLatestScore && summary.scoreDiff !== null && summary.scoreDiff !== undefined && summary.scoreDiff !== "";

  const filteredRecords = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return records;

    return records.filter((record) => {
      const date = formatDate(getRecordDate(record), "").toLowerCase();
      const summaryText = String(record.summary || "").toLowerCase();
      const statusText = String(record.status || "").toLowerCase();

      return (
        date.includes(keyword) ||
        summaryText.includes(keyword) ||
        statusText.includes(keyword)
      );
    });
  }, [records, searchText]);
  const hasSearchKeyword = searchText.trim() !== "";
  const displayedRecords = filteredRecords;

  const trendItems = useMemo(() => {
    const source = records.slice(-4);

    return source.map((record, index) => {
      const recordScore = getRecordScore(record);
      const canShowScore = shouldShowAnalysisScore({
        score: recordScore,
        status: getRecordStatus(record),
        saved: record.saved,
      });

      return {
        label: formatDate(getRecordDate(record), `${index + 1}회차`),
        score: canShowScore ? getScoreNumber(recordScore) : null,
        hasScore: canShowScore && hasScoreValue(recordScore),
      };
    });
  }, [records]);

  const maxTrendScore = Math.max(
    ...trendItems.filter((item) => item.hasScore).map((item) => item.score),
    100
  );
  const selectedDetailStatus = getRecordStatus(selectedDetail);
  const selectedDetailScore = getRecordScore(selectedDetail);
  const canShowSelectedDetailScore =
    Boolean(selectedDetail) &&
    shouldShowAnalysisScore({
      score: selectedDetailScore,
      status: selectedDetailStatus,
      saved: selectedDetail?.saved,
    });
  const llmReportBody = llmReport?.report || {};
  const safeLlmDisclaimer = getSafeLlmDisclaimer(llmReportBody.disclaimer);
  const llmReportKeyPoints = Array.isArray(llmReportBody.keyPoints)
    ? llmReportBody.keyPoints.filter(hasText)
    : [];
  const hasLlmReportContent =
    hasText(llmReportBody.title) ||
    hasText(llmReportBody.summary) ||
    hasText(llmReportBody.skinStatus) ||
    llmReportKeyPoints.length > 0 ||
    hasText(llmReportBody.recommendationSummary) ||
    hasText(llmReportBody.careGuide) ||
    hasText(safeLlmDisclaimer);

  async function handleDetailClick(analysisId) {
    if (!analysisId) {
      setDetailError("분석 ID가 없어 상세 정보를 불러올 수 없습니다.");
      setLlmReport(null);
      setLlmReportError("");
      return;
    }

    try {
      setDetailError("");
      setLlmReport(null);
      setLlmReportError("");
      setIsLlmReportLoading(true);

      const [detailResult, reportResult] = await Promise.allSettled([
        getHistoryDetail(analysisId),
        getHistoryLlmReport(analysisId),
      ]);

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
      setIsLlmReportLoading(false);
    }
  }

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

  function getHistoryDetailRecommendationItems(recommendations) {
    const text = getRecommendationText(recommendations);
    const items = text
      .split("·")
      .map((item) => item.trim())
      .filter(Boolean);

    return [...new Set(items)].slice(0, 4);
  }

  function handleCloseDetail() {
    setSelectedDetail(null);
    setDetailError("");
    setLlmReport(null);
    setLlmReportError("");
    setIsLlmReportLoading(false);
  }


  return (
    <PageLayout>
      <style>{`
        .sf-history-page {
          display: grid;
          gap: 18px;
        }

        .sf-history-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(360px, 0.75fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-history-main-card,
        .sf-history-summary-card,
        .sf-history-card {
          border-radius: 28px;
          background: #ffffff;
          border: 1px solid rgba(203, 213, 225, 0.78);
          box-shadow: 0 22px 54px rgba(15, 23, 42, 0.07);
        }

        .sf-history-main-card {
          padding: 28px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 210px;
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
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .sf-score-preview {
          min-height: 184px;
          padding: 20px;
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.12), transparent 38%),
            #f8fafc;
          display: grid;
          align-content: center;
          justify-items: center;
          text-align: center;
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
            conic-gradient(#167d7f 0 var(--score), #e2e8f0 var(--score) 100%);
          box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.7);
        }

        .sf-score-ring strong {
          font-size: 28px;
          letter-spacing: -0.06em;
        }

        .sf-score-preview span {
          display: block;
          margin-top: 12px;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .sf-history-summary-card {
          padding: 24px;
          display: grid;
          gap: 16px;
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
          grid-template-rows: repeat(4, minmax(58px, 1fr));
          gap: 14px;
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
          min-height: 94px;
          padding: 14px 16px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
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
          gap: 10px;
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
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
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
          min-height: 30px;
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


        /* history-detail-final-polish:start */
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


        /* history-detail-content-polish:start */
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
        /* history-detail-content-polish:end */


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
        /* history-detail-final-polish:end */


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
          .sf-history-summary-card,
          .sf-history-card {
            padding: 18px;
            border-radius: 24px;
          }
          .sf-history-main-card h1 {
            font-size: 36px;
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
      `}</style>

      <div className="sf-history-page">
        <section className="sf-history-hero">
          <div className="sf-history-main-card">
            <div>
              <span className="sf-history-eyebrow">
                <History size={15} /> 분석 이력
              </span>

              <h1>
                피부 변화 흐름,
                <br />
                <span className="sf-gradient-text">SkinFlow에서 기록하세요</span>
              </h1>

              <p>
                날짜별 분석 기록에서 종합 점수, 색소침착, 주름 지표와
                연결된 추천 흐름을 상세하게 다시 확인할 수 있습니다.
              </p>

              <div className="sf-history-actions">
                <Button to="/analysis/capture" size="lg">
                  새 분석 시작 <ArrowRight size={18} />
                </Button>
                <Button to="/recommendations" variant="secondary" size="lg">
                  추천 보기
                </Button>
              </div>
            </div>

            <div className="sf-score-preview">
              <div
                className="sf-score-ring"
                style={{ "--score": `${hasLatestScore ? latestScore : 0}%` }}
              >
                <strong>{hasLatestScore ? latestScore : "분석 전"}</strong>
              </div>
              <span>
                {hasLatestScore && hasRecords
                  ? `최근 분석일 ${formatDate(summary.latestAnalyzedAt)}`
                  : "첫 분석 후 표시"}
              </span>
            </div>
          </div>

          <Card className="sf-history-summary-card">
            <div className="sf-card-title-row">
              <div>
                <small>상세 이력 요약</small>
                <h2>지난 분석 상세 이력</h2>
              </div>
              <span className="sf-icon-tile" aria-hidden="true">
                <Trophy size={21} />
              </span>
            </div>

            {isLoading && <p className="sf-notice-line">분석 이력을 불러오는 중입니다.</p>}
            {historyError && <p className="sf-error-line">{historyError}</p>}

            <div className="sf-summary-grid">
              <div className="sf-summary-item">
                <span>총 분석 횟수</span>
                <strong>{summary.analysisCount ?? 0}회</strong>
              </div>
              <div className="sf-summary-item">
                <span>최근 종합 점수</span>
                <strong>{hasLatestScore ? `${latestScore}점` : "분석 전"}</strong>
              </div>
              <div className="sf-summary-item">
                <span>최근 상태</span>
                <strong>{getStatusLabel(latestStatus)}</strong>
              </div>
              <div className="sf-summary-item">
                <span>점수 변화</span>
                <strong>{canShowScoreDiff ? formatDiff(summary.scoreDiff) : "비교 전"}</strong>
              </div>
            </div>

            <p className="sf-notice-line">
              <LineChart size={16} />
              <span>
                {!canShowScoreDiff
                  ? "아직 비교할 분석 이력이 없습니다."
                  : `최근 분석 기준 점수 변화는 ${formatDiff(summary.scoreDiff)}입니다.`}
              </span>
            </p>
          </Card>
        </section>

        <section className="sf-history-grid">
          <Card className="sf-history-card sf-history-trend-card">
            <div className="sf-card-title-row">
              <div>
                <small>점수 흐름</small>
                <h2>종합 점수 변화</h2>
              </div>
              <Badge>{hasRecords ? "기록 있음" : "분석 전"}</Badge>
            </div>

            <div className="sf-trend-chart">
              {hasRecords ? (
                trendItems.map((item, index) => (
                  <div className="sf-trend-row" key={`${item.label}-${index}`}>
                    <span>{item.label}</span>
                    <div className="sf-trend-bar">
                      {item.hasScore && (
                        <span
                          style={{
                            width: `${Math.max(6, (item.score / maxTrendScore) * 100)}%`,
                          }}
                        />
                      )}
                    </div>
                    <div className="sf-trend-score">
                      {item.hasScore ? `${item.score}점` : "점수 없음"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="sf-empty-card">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <LineChart size={21} />
                  </span>
                  <strong>아직 비교할 분석 이력이 없습니다</strong>
                  <p>첫 분석 후 변화 흐름이 표시됩니다.</p>
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
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="날짜 또는 키워드 검색"
                />
              </label>
            </div>

            <div className={`sf-record-list${filteredRecords.length > 4 ? " is-expanded" : ""}`}>
              {filteredRecords.length > 0 ? (
                displayedRecords.map((record, index) => {
                  const recordId = getRecordId(record);
                  const recordScore = getRecordScore(record);
                  const recordStatus = getRecordStatus(record);
                  const canShowRecordScore = shouldShowAnalysisScore({
                    score: recordScore,
                    status: recordStatus,
                    saved: record.saved,
                  });

                  return (
                    <div className="sf-record-card" key={recordId || index}>
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

                      <div className="sf-record-side">
                        <span className="sf-score-badge">
                          {canShowRecordScore ? formatScore(recordScore, "점수 없음") : "점수 없음"}
                        </span>
                        <div className="sf-record-actions">
                          <button
                            type="button"
                            className="sf-text-button"
                            onClick={() => handleDetailClick(recordId)}
                          >
                            상세 보기
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
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


            {detailError && <p className="sf-error-line" style={{ marginTop: 12 }}>{detailError}</p>}

          </Card>
        </section>

        {selectedDetail && (
          <section className="sf-history-detail-section">
                <div className="sf-detail-card">
                  <div className="sf-card-title-row">
                    <div>
                      <small>{formatDate(getRecordDate(selectedDetail))}</small>
                      <h2>상세 분석 정보</h2>
                    </div>
                    <div className="sf-detail-header-actions">
                      <span className="sf-status-badge">{getStatusLabel(selectedDetailStatus)}</span>
                      <button
                        type="button"
                        className="sf-detail-close-button"
                        onClick={handleCloseDetail}
                        aria-label="상세 분석 정보 닫기"
                      >
                        닫기
                      </button>
                    </div>
                  </div>

                  <div className="sf-detail-metrics">
                    <div>
                      <span>종합 점수</span>
                      <strong>
                        {canShowSelectedDetailScore
                          ? formatScore(getRecordScore(selectedDetail), "점수 없음")
                          : "점수 없음"}
                      </strong>
                    </div>
                    <div>
                      <span>색소침착</span>
                      <strong>
                        {canShowSelectedDetailScore
                          ? getMetricScore(selectedDetail.metrics, "색소")
                          : "점수 없음"}
                      </strong>
                    </div>
                    <div>
                      <span>주름</span>
                      <strong>
                        {canShowSelectedDetailScore
                          ? getMetricScore(selectedDetail.metrics, "주름")
                          : "점수 없음"}
                      </strong>
                    </div>
                  </div>

                  <div className="sf-detail-insight-panel">
                    <div className="sf-detail-panel-heading">
                      <span>관리 포인트</span>
                      <strong>분석 결과 기반으로 확인할 항목</strong>
                    </div>
                    <div className="sf-detail-insight-list">
                      {getHistoryDetailInsightItems(selectedDetail).map((item) => (
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
                    <p>{selectedDetail.statusDescription || selectedDetail.summary || "상세 분석 설명이 없습니다."}</p>
                    <div className="sf-detail-recommend-chips">
                      {getHistoryDetailRecommendationItems(selectedDetail.recommendations).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </div>

                  <div className="sf-detail-actions">
                    <Button to="/recommendations" variant="secondary" size="sm">
                      맞춤 추천 보기
                    </Button>
                    <Button to="/diet-guide" variant="secondary" size="sm">
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
                      {hasText(llmReportBody.title) && (
                        <div className="sf-llm-report-section">
                          <span>리포트 제목</span>
                          <strong>{llmReportBody.title}</strong>
                        </div>
                      )}

                      {hasText(llmReportBody.summary) && (
                        <div className="sf-llm-report-section">
                          <span>전체 요약</span>
                          <p>{llmReportBody.summary}</p>
                        </div>
                      )}

                      {hasText(llmReportBody.skinStatus) && (
                        <div className="sf-llm-report-section">
                          <span>피부 상태 요약</span>
                          <p>{llmReportBody.skinStatus}</p>
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

                      {hasText(llmReportBody.recommendationSummary) && (
                        <div className="sf-llm-report-section">
                          <span>추천 요약</span>
                          <p>{llmReportBody.recommendationSummary}</p>
                        </div>
                      )}

                      {hasText(llmReportBody.careGuide) && (
                        <div className="sf-llm-report-section">
                          <span>관리 가이드</span>
                          <p>{llmReportBody.careGuide}</p>
                        </div>
                      )}

                      {hasText(safeLlmDisclaimer) && (
                        <div className="sf-llm-report-section">
                          <span>참고 안내</span>
                          <p>{safeLlmDisclaimer}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
          </section>
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
