import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
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
import { getHistory, getHistoryDetail } from "../api/historyApi";
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

  return textList.length > 0
    ? textList.join(" · ")
    : "이 분석 이력에 연결된 추천 요약이 없습니다.";
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

  async function handleDetailClick(analysisId) {
    if (!analysisId) {
      setDetailError("분석 ID가 없어 상세 정보를 불러올 수 없습니다.");
      return;
    }

    try {
      setDetailError("");
      const detail = await getHistoryDetail(analysisId);
      setSelectedDetail(detail);
    } catch (error) {
      console.error("분석 이력 상세 API 호출 실패:", error);
      setDetailError("상세 분석 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
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
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-history-card {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          padding: 24px;
        }

        .sf-trend-chart {
          margin-top: 18px;
          display: grid;
          gap: 12px;
        }

        .sf-trend-row {
          display: grid;
          grid-template-columns: 84px 1fr 48px;
          align-items: center;
          gap: 12px;
        }

        .sf-trend-row > span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .sf-trend-bar {
          height: 8px;
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
          flex: 1;
        }

        .sf-record-card {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 16px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
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
        }

        .sf-record-content p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          word-break: keep-all;
        }

        .sf-record-side {
          display: grid;
          justify-items: end;
          gap: 8px;
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
          gap: 8px;
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

        .sf-history-bottom {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }

        .sf-guide-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }

        .sf-guide-card {
          min-height: 132px;
          padding: 16px;
          border-radius: 20px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-guide-card strong {
          display: block;
          margin-top: 12px;
          color: #0f172a;
          font-size: 14px;
          letter-spacing: -0.035em;
        }

        .sf-guide-card p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.48;
          word-break: keep-all;
        }


        @media (max-width: 980px) {
          .sf-history-hero,
          .sf-history-grid,
          .sf-history-bottom,
          .sf-history-main-card {
            grid-template-columns: 1fr;
          }

          .sf-score-preview {
            min-height: auto;
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
          }

          .sf-record-side {
            grid-column: 2;
            justify-items: start;
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
                <History size={15} /> Analysis History
              </span>

              <h1>
                피부 변화 흐름,
                <br />
                <span className="sf-gradient-text">SkinFlow에서 기록하세요</span>
              </h1>

              <p>
                분석 이력을 통해 종합 점수, 색소침착, 주름 지표를 다시 확인하고
                같은 흐름으로 추천과 관리 가이드를 이어볼 수 있습니다.
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
                <small>History Summary</small>
                <h2>분석 이력 요약</h2>
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
          <Card className="sf-history-card">
            <div className="sf-card-title-row">
              <div>
                <small>Trend</small>
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

          <Card className="sf-history-card">
            <div className="sf-record-toolbar">
              <div className="sf-card-title-row" style={{ marginBottom: 0 }}>
                <div>
                  <small>Records</small>
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

            <div className="sf-record-list">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => {
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
                        <span className="sf-status-badge">{getStatusLabel(recordStatus)}</span>
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

            {selectedDetail && (
              <div className="sf-detail-card">
                <div className="sf-card-title-row">
                  <div>
                    <small>{formatDate(getRecordDate(selectedDetail))}</small>
                    <h2>상세 분석 정보</h2>
                  </div>
                  <span className="sf-status-badge">{getStatusLabel(selectedDetailStatus)}</span>
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

                <p>{selectedDetail.statusDescription || selectedDetail.summary || "상세 분석 설명이 없습니다."}</p>
                <p>{getRecommendationText(selectedDetail.recommendations)}</p>
              </div>
            )}
          </Card>
        </section>

        <section className="sf-history-bottom">
          <Card className="sf-history-card">
            <div className="sf-card-title-row">
              <div>
                <small>Guide</small>
                <h2>이력 관리 안내</h2>
              </div>
              <span className="sf-icon-tile" aria-hidden="true">
                <CheckCircle2 size={21} />
              </span>
            </div>

            <div className="sf-guide-list">
              <div className="sf-guide-card">
                <span className="sf-icon-tile" aria-hidden="true">
                  <Clock size={21} />
                </span>
                <strong>동일한 조건</strong>
                <p>비슷한 시간대와 조명에서 분석하면 비교가 더 안정적입니다.</p>
              </div>

              <div className="sf-guide-card">
                <span className="sf-icon-tile" aria-hidden="true">
                  <LineChart size={21} />
                </span>
                <strong>변화 흐름</strong>
                <p>점수 하나보다 장기적인 흐름을 함께 확인하는 것이 좋습니다.</p>
              </div>

              <div className="sf-guide-card">
                <span className="sf-icon-tile" aria-hidden="true">
                  <Sparkles size={21} />
                </span>
                <strong>추천 연결</strong>
                <p>이력은 성분, 제품, 식습관 가이드를 다시 확인하는 기준입니다.</p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}

export default HistoryPage;
