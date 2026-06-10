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
  TrendingUp,
  Trophy,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";
import { getHistory, getHistoryDetail } from "../api/historyApi";

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

  return date.toLocaleDateString("ko-KR");
}

function formatScore(score) {
  if (score === null || score === undefined) return "분석 전";

  return `${score}점`;
}

function formatDiff(scoreDiff) {
  if (scoreDiff === null || scoreDiff === undefined) return "비교 전";

  const numericDiff = Number(scoreDiff);

  if (Number.isNaN(numericDiff)) return "비교 전";
  if (numericDiff > 0) return `+${numericDiff}점`;
  if (numericDiff < 0) return `${numericDiff}점`;

  return "변화 없음";
}

function getMetricScore(metrics, keyword) {
  if (!Array.isArray(metrics) || metrics.length === 0) return "-";

  const matchedMetric = metrics.find((metric) => {
    const name =
      metric.metricName ||
      metric.name ||
      metric.label ||
      metric.metricType ||
      "";

    return String(name).includes(keyword);
  });

  const score =
    matchedMetric?.metricScore ??
    matchedMetric?.score ??
    matchedMetric?.value ??
    matchedMetric?.metricValue;

  if (score === null || score === undefined) return "-";

  return `${score}점`;
}

function getRecommendationText(recommendations) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return "추천 요약 정보가 없습니다.";
  }

  const textList = recommendations
    .map(
      (item) =>
        item.title ||
        item.name ||
        item.recommendationTitle ||
        item.recommendationName ||
        item.summary ||
        item.content ||
        item.recommendationContent
    )
    .filter(Boolean);

  return textList.length > 0 ? textList.join(" · ") : "추천 요약 정보가 없습니다.";
}

function HistoryPage() {
  const [historyData, setHistoryData] = useState(defaultHistoryData);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [detailError, setDetailError] = useState("");

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
  const records = Array.isArray(historyData.records) ? historyData.records : [];

  const summaryItems = useMemo(
    () => [
      {
        label: "총 분석 횟수",
        value: `${summary?.analysisCount ?? 0}회`,
      },
      {
        label: "최근 종합 점수",
        value: formatScore(summary?.latestTotalScore),
      },
      {
        label: "최근 분석일",
        value: formatDate(summary?.latestAnalyzedAt, "아직 없음"),
      },
      {
        label: "최근 상태",
        value: summary?.latestStatus || "분석 전",
      },
      {
        label: "점수 변화",
        value: formatDiff(summary?.scoreDiff),
      },
    ],
    [summary]
  );

  const trendItems = useMemo(
    () =>
      records.slice(-3).map((record) => ({
        label: formatDate(record.analyzedAt, "아직 없음"),
        score: record.totalScore ?? 0,
      })),
    [records]
  );

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
      setDetailError(
        "상세 분석 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
      );
    }
  }

  return (
    <PageLayout>
      <section className="history-hero">
        <div className="history-copy">
          <Badge>Analysis History</Badge>

          <h1>
            피부 분석 이력을
            <br />
            한눈에 확인하세요
          </h1>

          <p>
            날짜별 피부 분석 결과와 추천 정보를 다시 확인하고, 종합 점수와
            주요 지표의 변화 흐름을 비교할 수 있습니다.
          </p>

          <div className="history-action-row">
            <Button to="/analysis/capture" size="lg">
              새 피부 분석 시작하기 <ArrowRight size={18} />
            </Button>
            <Button to="/analysis/result" variant="secondary" size="lg">
              최근 결과 보기
            </Button>
          </div>
        </div>

        <Card className="history-summary-card">
          <div className="history-summary-header">
            <div className="history-summary-icon">
              <History size={28} />
            </div>
            <div>
              <span className="history-card-label">History Summary</span>
              <h2>분석 이력 요약</h2>
            </div>
          </div>

          {isLoading && (
            <p className="form-success-text">분석 이력을 불러오는 중입니다.</p>
          )}
          {historyError && <p className="form-error-text">{historyError}</p>}

          <div className="history-summary-list">
            {summaryItems.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="history-summary-notice">
            <TrendingUp size={18} />
            <span>
              {summary?.scoreDiff === null || summary?.scoreDiff === undefined
                ? "아직 비교할 분석 이력이 없습니다."
                : `최근 분석 기준 점수 변화는 ${formatDiff(
                    summary.scoreDiff
                  )}입니다.`}
            </span>
          </div>
        </Card>
      </section>

      <section className="history-section">
        <SectionTitle
          eyebrow="Trend"
          title="종합 점수 변화 흐름"
          description="최근 피부 분석 이력을 기준으로 종합 점수의 변화 흐름을 시각적으로 확인할 수 있습니다."
        />

        <Card className="history-trend-card">
          {trendItems.length > 0 ? (
            <div className="trend-chart-area">
              <div className="trend-line" />
              {trendItems.map((item, index) => (
                <div
                  className={`trend-point trend-point-${index + 1}`}
                  key={`${item.label}-${index}`}
                >
                  <strong>{item.score}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="trend-insight">
              <div className="trend-insight-icon">
                <Trophy size={24} />
              </div>
              <div>
                <strong>아직 분석 이력이 없습니다</strong>
                <span>
                  첫 피부 분석을 진행하면 종합 점수 변화 흐름을 확인할 수
                  있습니다.
                </span>
              </div>
            </div>
          )}

          {trendItems.length > 0 && (
            <div className="trend-insight">
              <div className="trend-insight-icon">
                <Trophy size={24} />
              </div>
              <div>
                <strong>분석 이력을 기준으로 변화 흐름을 확인할 수 있습니다</strong>
                <span>
                  동일한 조건에서 주기적으로 분석하면 피부 변화 흐름을 더
                  안정적으로 비교할 수 있습니다.
                </span>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="history-section">
        <div className="history-list-header">
          <SectionTitle
            eyebrow="Records"
            title="날짜별 분석 기록"
            description="각 분석 기록을 선택하면 당시의 점수, 지표, 추천 정보를 확인할 수 있습니다."
          />

          <div className="history-search-box">
            <Search size={18} />
            <input type="text" placeholder="분석 날짜 또는 키워드 검색" />
          </div>
        </div>

        <div className="history-record-list">
          {records.length > 0 ? (
            records.map((item) => (
              <Card className="history-record-card" key={item.analysisId}>
                <div className="history-record-top">
                  <div className="record-date-icon">
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <span>{formatDate(item.analyzedAt, "아직 없음")}</span>
                    <h3>{item.summary || "피부 분석 기록"}</h3>
                  </div>
                  <Badge variant="accent">{item.status || "분석 전"}</Badge>
                </div>

                <div className="record-score-layout">
                  <div className="record-score-box">
                    <span>종합 점수</span>
                    <strong>{item.totalScore ?? "분석 전"}</strong>
                    {item.totalScore !== null && item.totalScore !== undefined && (
                      <small>/100</small>
                    )}
                  </div>

                  <div className="record-metric-list">
                    <div>
                      <span>색소침착</span>
                      <strong>{getMetricScore(item.metrics, "색소")}</strong>
                    </div>
                    <div>
                      <span>주름</span>
                      <strong>{getMetricScore(item.metrics, "주름")}</strong>
                    </div>
                  </div>
                </div>

                <div className="record-recommendation">
                  <Sparkles size={18} />
                  <span>{item.summary || "분석 요약 정보가 없습니다."}</span>
                </div>

                <div className="record-actions">
                  <button
                    type="button"
                    className="logout-button"
                    onClick={() => handleDetailClick(item.analysisId)}
                  >
                    상세 결과 보기
                  </button>
                  <Button to="/recommendations" size="sm">
                    추천 다시 보기 <ArrowRight size={15} />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="history-record-card">
              <div className="history-record-top">
                <div className="record-date-icon">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <span>아직 없음</span>
                  <h3>아직 분석 이력이 없습니다.</h3>
                </div>
              </div>

              <div className="record-recommendation">
                <Sparkles size={18} />
                <span>
                  피부 분석을 시작하면 결과와 추천 내용을 이곳에서 확인할 수
                  있어요.
                </span>
              </div>

              <div className="record-actions">
                <Button to="/analysis/capture" size="sm">
                  새 피부 분석 시작하기 <ArrowRight size={15} />
                </Button>
              </div>
            </Card>
          )}
        </div>

        {detailError && <p className="form-error-text">{detailError}</p>}

        {selectedDetail && (
          <Card className="history-record-card">
            <div className="history-record-top">
              <div className="record-date-icon">
                <CalendarDays size={22} />
              </div>
              <div>
                <span>{formatDate(selectedDetail.analyzedAt, "아직 없음")}</span>
                <h3>상세 분석 정보</h3>
              </div>
              <Badge variant="accent">{selectedDetail.status || "분석 전"}</Badge>
            </div>

            <div className="record-score-layout">
              <div className="record-score-box">
                <span>종합 점수</span>
                <strong>{selectedDetail.totalScore ?? "분석 전"}</strong>
                {selectedDetail.totalScore !== null &&
                  selectedDetail.totalScore !== undefined && <small>/100</small>}
              </div>

              <div className="record-metric-list">
                <div>
                  <span>색소침착</span>
                  <strong>{getMetricScore(selectedDetail.metrics, "색소")}</strong>
                </div>
                <div>
                  <span>주름</span>
                  <strong>{getMetricScore(selectedDetail.metrics, "주름")}</strong>
                </div>
              </div>
            </div>

            <div className="record-recommendation">
              <Sparkles size={18} />
              <span>
                {selectedDetail.statusDescription ||
                  selectedDetail.summary ||
                  "상세 분석 설명이 없습니다."}
              </span>
            </div>

            <div className="record-recommendation">
              <Sparkles size={18} />
              <span>{getRecommendationText(selectedDetail.recommendations)}</span>
            </div>
          </Card>
        )}
      </section>

      <section className="history-bottom-grid">
        <Card className="history-guide-card">
          <div className="history-card-title-row">
            <div>
              <span className="history-card-label">Guide</span>
              <h2>이력 관리 안내</h2>
            </div>
            <CheckCircle2 size={28} />
          </div>

          <div className="history-guide-list">
            <div>
              <Clock size={20} />
              <span>가능하면 비슷한 시간대와 조명 환경에서 분석해보세요.</span>
            </div>
            <div>
              <LineChart size={20} />
              <span>
                점수 하나보다 장기적인 변화 흐름을 함께 확인하는 것이 좋습니다.
              </span>
            </div>
            <div>
              <Sparkles size={20} />
              <span>
                분석 이력은 추천 성분과 식습관 가이드를 다시 확인하는 기준이
                됩니다.
              </span>
            </div>
          </div>
        </Card>

        <Card className="history-next-card">
          <div className="history-next-icon">
            <LineChart size={28} />
          </div>

          <h2>다음 분석을 이어서 진행해보세요</h2>
          <p>
            SkinFlow는 분석 이력을 기반으로 피부 변화 흐름을 확인할 수 있도록
            돕습니다. 새로운 분석을 추가해 이전 결과와 비교해보세요.
          </p>

          <div className="history-next-actions">
            <Button to="/analysis/capture" full>
              새 피부 분석 시작하기
            </Button>
            <Button to="/dashboard" variant="secondary" full>
              대시보드로 이동
            </Button>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}

export default HistoryPage;
