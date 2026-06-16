import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  FlaskConical,
  Leaf,
  LoaderCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import {
  getIngredientRecommendations,
  getProductRecommendations,
} from "../api/recommendationApi";

function getApiErrorMessage(error) {
  if (error?.status === 401) {
    return "로그인 후 추천 정보를 확인할 수 있습니다.";
  }

  return error?.message || "추천 정보를 불러오지 못했습니다.";
}

function formatCount(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0개";
  }

  return `${numericValue}개`;
}

function formatScore(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "점수 없음";
  }

  return `${Math.round(numericValue)}점`;
}

function hasMatchScore(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;

  return Number.isFinite(Number(value));
}

function formatMatchScore(value) {
  if (!hasMatchScore(value)) {
    return "매칭 점수 없음";
  }

  return `${Math.round(Number(value))}점`;
}

function getRecommendationMatchScore(item) {
  return item?.match_score ?? item?.matchScore ?? item?.match ?? item?.score;
}

function getFocusMetricName(...summaries) {
  const focusMetric = summaries.find((summary) => summary?.focusMetric?.name)?.focusMetric;

  return focusMetric?.name || "분석 대기";
}

function getSummaryStatus(summary) {
  return summary?.analysisStatus ?? summary?.analysis_status ?? summary?.latestStatus ?? summary?.latest_status ?? summary?.status;
}

function isCompletedStatus(status) {
  return String(status || "").toLowerCase() === "completed";
}

function normalizeSourceText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getRecommendationSourceState(summary, itemCount = 0) {
  if (!summary && itemCount === 0) {
    return {
      tone: "empty",
      label: "추천 데이터 없음",
      message: "분석 후 추천 정보가 표시됩니다.",
    };
  }

  const sourceText = normalizeSourceText(
    summary?.source ??
      summary?.ingredientSource ??
      summary?.productSource ??
      "",
  );
  const status = getSummaryStatus(summary);
  const hasStatus = status !== null && status !== undefined && String(status).trim() !== "";
  const isCompleted = !hasStatus || isCompletedStatus(status);
  const isFallback = Boolean(summary?.isFallback || summary?.fallback || summary?.fromDefault);
  const isSavedFalse = summary?.saved === false;
  const hasItems = itemCount > 0;

  if (!hasItems || ["empty", "none", "null"].includes(sourceText)) {
    return {
      tone: "empty",
      label: "추천 데이터 없음",
      message: summary?.message || "분석 후 추천 정보가 표시됩니다.",
    };
  }

  if (!isCompleted || isSavedFalse) {
    return {
      tone: "reference",
      label: "분석 전 참고",
      message: summary?.message || "분석 완료 전에는 참고 정보로만 확인해 주세요.",
    };
  }

  if (
    isFallback ||
    !sourceText ||
    ["default", "fallback", "reference", "static", "seed", "unknown"].includes(sourceText)
  ) {
    return {
      tone: "reference",
      label: "기본 참고",
      message: summary?.message || "기본 참고 정보입니다. 최신 분석 후 관리 방향과 함께 확인해 주세요.",
    };
  }

  if (isCompleted && ["latest", "latest_analysis", "analysis", "personalized", "result", "completed"].includes(sourceText)) {
    return {
      tone: "personalized",
      label: "최근 분석 기반",
      message: summary?.message || "최근 분석 결과를 바탕으로 참고할 수 있는 추천입니다.",
    };
  }

  return {
    tone: "reference",
    label: "기준 확인 중",
    message: summary?.message || "추천 기준을 확인 중입니다. 참고 정보로 활용해 주세요.",
  };
}

function RecommendationSectionState({ type, message }) {
  const isLoading = type === "loading";
  const isError = type === "error";

  return (
    <div className={`sf-section-state ${isLoading ? "is-loading" : ""} ${isError ? "is-error" : ""}`}>
      <span className="sf-section-state-icon" aria-hidden="true">
        {isLoading ? <LoaderCircle size={20} /> : <AlertCircle size={20} />}
      </span>
      <p>{message}</p>
    </div>
  );
}

function RecommendationPage() {
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);
  const [ingredientSummary, setIngredientSummary] = useState(null);
  const [productSummary, setProductSummary] = useState(null);
  const [ingredientError, setIngredientError] = useState("");
  const [productError, setProductError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setIngredientError("");
    setProductError("");

    const [ingredientResult, productResult] = await Promise.allSettled([
      getIngredientRecommendations(),
      getProductRecommendations(),
    ]);

    if (ingredientResult.status === "fulfilled") {
      setIngredients(ingredientResult.value.ingredients);
      setIngredientSummary(ingredientResult.value.summary);
    } else {
      setIngredients([]);
      setIngredientSummary(null);
      setIngredientError(getApiErrorMessage(ingredientResult.reason));
    }

    if (productResult.status === "fulfilled") {
      setProducts(productResult.value.products);
      setProductSummary(productResult.value.summary);
    } else {
      setProducts([]);
      setProductSummary(null);
      setProductError(getApiErrorMessage(productResult.reason));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadRecommendations, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRecommendations]);

  const summary = productSummary || ingredientSummary;
  const ingredientSourceState = useMemo(
    () => getRecommendationSourceState(ingredientSummary, ingredients.length),
    [ingredientSummary, ingredients.length],
  );
  const productSourceState = useMemo(
    () => getRecommendationSourceState(productSummary, products.length),
    [productSummary, products.length],
  );
  const sourceState = useMemo(() => {
    if (ingredientSourceState.tone === "personalized" || productSourceState.tone === "personalized") {
      return ingredientSourceState.tone === "personalized" ? ingredientSourceState : productSourceState;
    }

    if (ingredients.length || products.length) {
      return ingredientSourceState.tone !== "empty" ? ingredientSourceState : productSourceState;
    }

    return ingredientSourceState;
  }, [ingredientSourceState, ingredients.length, productSourceState, products.length]);

  const summaryItems = useMemo(
    () => [
      {
        label: "중점 지표",
        value: getFocusMetricName(productSummary, ingredientSummary),
      },
      {
        label: "추천 성분",
        value: formatCount(ingredientSummary?.recommendationCount ?? ingredients.length),
      },
      {
        label: "추천 제품",
        value: formatCount(productSummary?.recommendationCount ?? products.length),
      },
    ],
    [ingredientSummary, ingredients.length, productSummary, products.length],
  );

  const summaryNote = useMemo(() => {
    if (isLoading) {
      return "최근 분석 결과를 기준으로 추천 정보를 불러오는 중입니다.";
    }

    if (ingredientError && productError) {
      return "추천 정보를 불러오지 못했습니다. 로그인 상태와 서버 실행 여부를 확인해 주세요.";
    }

    if (!ingredients.length && !products.length) {
      return sourceState.message;
    }

    if (sourceState.tone === "personalized") {
      const scoreText = formatScore(
        summary?.totalScore ?? summary?.totalSkinScore ?? summary?.total_skin_score ?? summary?.score
      );

      return scoreText === "점수 없음"
        ? "최근 분석 결과를 기준으로 참고할 수 있는 성분과 제품 추천입니다."
        : `최근 분석 결과 ${scoreText} 기준으로 참고할 수 있는 성분과 제품 추천입니다.`;
    }

    return sourceState.message;
  }, [ingredientError, ingredients.length, isLoading, productError, products.length, sourceState, summary]);

  const statusLabel = isLoading ? "불러오는 중" : ingredientError && productError ? "연결 확인" : sourceState.label;

  return (
    <PageLayout>
      <style>{`
        .sf-recommend-page {
          display: grid;
          gap: 16px;
        }

        .sf-recommend-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(380px, 1.05fr);
          gap: 16px;
          align-items: stretch;
        }

        .sf-recommend-hero-card,
        .sf-recommend-summary-card,
        .sf-recommend-panel {
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.92);
          border-radius: 26px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.065);
        }

        .sf-recommend-hero-card {
          padding: 26px;
          background:
            radial-gradient(circle at 0% 0%, rgba(22, 125, 127, 0.10), transparent 34%),
            radial-gradient(circle at 100% 100%, rgba(34, 197, 200, 0.08), transparent 32%),
            #ffffff;
        }

        .sf-recommend-hero-card h1 {
          margin: 15px 0 12px;
          color: #0f172a;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.07em;
        }

        .sf-recommend-gradient {
          background: linear-gradient(90deg, #167d7f 0%, #22c5c8 55%, #0ea5a8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .sf-recommend-hero-card p {
          max-width: 560px;
          margin: 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.72;
          word-break: keep-all;
        }

        .sf-recommend-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .sf-recommend-summary-card {
          padding: 22px;
        }

        .sf-recommend-summary-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
        }

        .sf-recommend-label {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }

        .sf-recommend-summary-top h2,
        .sf-recommend-panel-head h2 {
          margin: 5px 0 0;
          color: #0f172a;
          font-size: 21px;
          line-height: 1.18;
          letter-spacing: -0.05em;
        }

        .sf-status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-source-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 10px;
          max-width: 100%;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.09);
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sf-source-pill.is-reference {
          color: #0f766e;
          background: rgba(20, 184, 166, 0.1);
        }

        .sf-source-pill.is-empty {
          color: #64748b;
          background: rgba(100, 116, 139, 0.1);
        }

        .sf-recommend-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .sf-summary-metric {
          padding: 14px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 17px;
          background: #f8fafc;
        }

        .sf-summary-metric span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
        }

        .sf-summary-metric strong {
          display: block;
          margin-top: 6px;
          color: #0f172a;
          font-size: 22px;
          letter-spacing: -0.055em;
        }

        .sf-summary-note {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 12px;
          padding: 13px;
          border-radius: 17px;
          color: #0f172a;
          background: rgba(22, 125, 127, 0.08);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.52;
        }

        .sf-summary-note svg {
          flex: 0 0 auto;
          margin-top: 1px;
          color: #167d7f;
        }

        .sf-recommend-content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 16px;
          align-items: stretch;
        }

        .sf-recommend-panel {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          padding: 22px;
          align-self: stretch;
        }

        .sf-recommend-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .sf-panel-heading {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .sf-panel-accent {
          width: 4px;
          height: 22px;
          margin-top: 4px;
          border-radius: 999px;
          background: #167d7f;
        }

        .sf-panel-accent.is-product {
          background: linear-gradient(180deg, #167d7f 0%, #22c5c8 100%);
        }

        .sf-recommend-list {
          display: grid;
          gap: 10px;
          flex: 1;
        }

        .sf-ingredient-card,
        .sf-product-card {
          display: grid;
          grid-template-columns: 50px minmax(0, 1fr) auto;
          align-items: center;
          gap: 13px;
          min-height: 106px;
          padding: 15px 16px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 20px;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.045), transparent 34%),
            #ffffff;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .sf-ingredient-card:hover,
        .sf-product-card:hover {
          transform: translateY(-2px);
          border-color: rgba(22, 125, 127, 0.22);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.075);
        }

        .sf-icon-tile {
          width: 50px;
          height: 50px;
          min-width: 50px;
          min-height: 50px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          line-height: 0;
          color: #167d7f;
          background: linear-gradient(135deg, #eefafa 0%, #ffffff 52%, #e6fffb 100%);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.045);
        }

        .sf-icon-tile svg {
          display: block;
          width: 22px !important;
          height: 22px !important;
          min-width: 22px;
          min-height: 22px;
          margin: 0;
          flex: 0 0 auto;
          transform: none;
          stroke-width: 2.05;
        }

        .sf-product-thumb {
          width: 50px;
          height: 50px;
          min-width: 50px;
          min-height: 50px;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 17px;
          background: #f8fafc;
        }

        .sf-product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sf-ingredient-main,
        .sf-product-main {
          min-width: 0;
        }

        .sf-ingredient-main h3,
        .sf-product-main h3 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 16px;
          line-height: 1.3;
          letter-spacing: -0.04em;
        }

        .sf-ingredient-main p,
        .sf-product-main p {
          margin: 0;
          color: #64748b;
          font-size: 12.5px;
          line-height: 1.48;
          word-break: keep-all;
        }

        .sf-product-brand {
          display: block;
          margin-bottom: 4px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 900;
        }

        .sf-match-score {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          min-width: 72px;
          padding: 8px 0;
          color: #167d7f;
          text-align: right;
          font-size: 19px;
          font-weight: 950;
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        .sf-match-score.is-pending {
          color: #64748b;
          font-size: 12px;
          line-height: 1.25;
          letter-spacing: 0;
        }

        .sf-match-score span {
          display: block;
          margin-bottom: 4px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .sf-tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 9px;
        }

        .sf-tag {
          padding: 4px 8px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 11px;
          font-weight: 900;
        }

        .sf-product-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          width: fit-content;
          margin-top: 10px;
          color: #167d7f;
          font-size: 12px;
          font-weight: 950;
          text-decoration: none;
        }

        .sf-product-link:hover {
          text-decoration: underline;
        }

        .sf-section-state {
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 10px;
          min-height: 228px;
          padding: 22px;
          border: 1px dashed rgba(22, 125, 127, 0.24);
          border-radius: 20px;
          background: #f8fafc;
          color: #64748b;
          text-align: center;
        }

        .sf-section-state.is-error {
          border-color: rgba(244, 63, 94, 0.24);
          background: rgba(244, 63, 94, 0.045);
        }

        .sf-section-state-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 15px;
          color: #167d7f;
          background: #ffffff;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
        }

        .sf-section-state.is-error .sf-section-state-icon {
          color: #f43f5e;
        }

        .sf-section-state-icon svg {
          display: block;
        }

        .sf-section-state.is-loading .sf-section-state-icon svg {
          animation: sf-spin 1s linear infinite;
        }

        .sf-section-state p {
          max-width: 340px;
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.55;
          word-break: keep-all;
        }

        @keyframes sf-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1020px) {
          .sf-recommend-hero,
          .sf-recommend-content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .sf-recommend-page {
            gap: 14px;
          }

          .sf-recommend-hero-card,
          .sf-recommend-summary-card,
          .sf-recommend-panel {
            padding: 20px;
            border-radius: 24px;
          }

          .sf-recommend-hero-card h1 {
            font-size: 36px;
          }

          .sf-recommend-summary-grid {
            grid-template-columns: 1fr;
          }

          .sf-ingredient-card,
          .sf-product-card {
            grid-template-columns: 48px minmax(0, 1fr);
            min-height: auto;
          }

          .sf-match-score {
            grid-column: 2;
            align-items: flex-start;
            text-align: left;
            padding-top: 2px;
          }

          .sf-icon-tile,
          .sf-product-thumb {
            width: 48px;
            height: 48px;
            min-width: 48px;
            min-height: 48px;
          }
        }
      `}</style>

      <div className="sf-recommend-page">
        <section className="sf-recommend-hero">
          <Card className="sf-recommend-hero-card">
            <Badge>Recommendation</Badge>
            <h1>
              분석 결과에 맞춘
              <br />
              <span className="sf-recommend-gradient">성분·제품 추천</span>
            </h1>
            <p>
              색소침착과 주름 중심의 분석 결과를 바탕으로 기능성 성분,
              화장품 제품, 식습관 가이드까지 다음 관리 방향을 짧게 정리합니다.
            </p>

            <div className="sf-recommend-actions">
              <Button to="/diet-guide" size="lg">
                식습관 가이드 보기 <Leaf size={18} />
              </Button>
              <Button to="/analysis/result" variant="secondary" size="lg">
                분석 결과 다시 보기
              </Button>
              <Button variant="secondary" size="lg" onClick={loadRecommendations} disabled={isLoading}>
                추천 다시 불러오기
              </Button>
            </div>
          </Card>

          <Card className="sf-recommend-summary-card">
            <div className="sf-recommend-summary-top">
              <div>
                <span className="sf-recommend-label">추천 요약</span>
                <h2>오늘의 관리 방향</h2>
              </div>
              <span className="sf-status-pill">
                <ShieldCheck size={14} /> {statusLabel}
              </span>
            </div>

            <div className="sf-recommend-summary-grid">
              {summaryItems.map((item) => (
                <div className="sf-summary-metric" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="sf-summary-note">
              <Sparkles size={18} />
              <span>{summaryNote}</span>
            </div>
          </Card>
        </section>

        <section className="sf-recommend-content-grid">
          <Card className="sf-recommend-panel">
            <div className="sf-recommend-panel-head">
              <div className="sf-panel-heading">
                <span className="sf-panel-accent" />
                <div>
                  <span className="sf-recommend-label">Functional Ingredients</span>
                  <h2>기능성 성분 추천</h2>
                </div>
              </div>
              <span className={`sf-source-pill is-${ingredientSourceState.tone}`}>
                {ingredientSourceState.label}
              </span>
            </div>

            {isLoading ? (
              <RecommendationSectionState type="loading" message="기능성 성분 추천을 불러오는 중입니다." />
            ) : ingredientError ? (
              <RecommendationSectionState type="error" message={ingredientError} />
            ) : ingredients.length === 0 ? (
              <RecommendationSectionState type="empty" message="표시할 성분 추천 데이터가 없습니다." />
            ) : (
              <div className="sf-recommend-list">
                {ingredients.map((item) => {
                  const matchScore = getRecommendationMatchScore(item);

                  return (
                    <article className="sf-ingredient-card" key={item.id || item.name}>
                      <span className="sf-icon-tile" aria-hidden="true">
                        <FlaskConical size={22} />
                      </span>

                      <div className="sf-ingredient-main">
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <div className="sf-tag-row">
                          {item.tags.map((tag) => (
                            <span className="sf-tag" key={tag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={`sf-match-score ${hasMatchScore(matchScore) ? "" : "is-pending"}`}>
                        <span>매칭</span>
                        {formatMatchScore(matchScore)}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="sf-recommend-panel">
            <div className="sf-recommend-panel-head">
              <div className="sf-panel-heading">
                <span className="sf-panel-accent is-product" />
                <div>
                  <span className="sf-recommend-label">Cosmetic Products</span>
                  <h2>화장품 제품 추천</h2>
                </div>
              </div>
              <span className={`sf-source-pill is-${productSourceState.tone}`}>
                {productSourceState.label}
              </span>
            </div>

            {isLoading ? (
              <RecommendationSectionState type="loading" message="화장품 제품 추천을 불러오는 중입니다." />
            ) : productError ? (
              <RecommendationSectionState type="error" message={productError} />
            ) : products.length === 0 ? (
              <RecommendationSectionState type="empty" message="표시할 제품 추천 데이터가 없습니다." />
            ) : (
              <div className="sf-recommend-list">
                {products.map((item) => {
                  const matchScore = getRecommendationMatchScore(item);

                  return (
                    <article className="sf-product-card" key={item.id || item.name}>
                      {item.imageUrl ? (
                        <span className="sf-product-thumb" aria-hidden="true">
                          <img src={item.imageUrl} alt="" />
                        </span>
                      ) : (
                        <span className="sf-icon-tile" aria-hidden="true">
                          <PackageCheck size={22} />
                        </span>
                      )}

                      <div className="sf-product-main">
                        <span className="sf-product-brand">{item.brand}</span>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                        <div className="sf-tag-row">
                          {item.tags.map((tag) => (
                            <span className="sf-tag" key={tag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                        {item.productUrl && (
                          <a
                            className="sf-product-link"
                            href={item.productUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            올리브영에서 보기 <ExternalLink size={13} />
                          </a>
                        )}
                      </div>

                      <div className={`sf-match-score ${hasMatchScore(matchScore) ? "" : "is-pending"}`}>
                        <span>매칭</span>
                        {formatMatchScore(matchScore)}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}

export default RecommendationPage;
