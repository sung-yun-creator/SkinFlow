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

const SHOW_CARE_NOTICE_KEY = "skinflow_show_care_notice";
const EXPAND_RECOMMENDATION_REASON_KEY = "skinflow_expand_recommendation_reason";

function readStoredSetting(key, fallbackValue) {
  if (typeof window === "undefined") return fallbackValue;

  const storedValue = window.localStorage.getItem(key);

  if (storedValue === null) return fallbackValue;
  if (storedValue === "true") return true;
  if (storedValue === "false") return false;

  return storedValue;
}

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

function hasMatchScore(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;

  return Number.isFinite(Number(value));
}

function formatMatchScore(value) {
  if (!hasMatchScore(value)) {
    return "매칭 정보 없음";
  }

  // 추천 매칭 값은 0~100 범위의 적합도이므로 퍼센트 방식으로 고정 표시합니다.
  return `${Math.round(Number(value))}%`;
}

function getRecommendationMatchScore(item) {
  // API의 matchScore, match, score 값을 그대로 읽고 계산식은 변경하지 않습니다.
  return item?.match_score ?? item?.matchScore ?? item?.match ?? item?.score;
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function getIngredientDisplayName(item) {
  const displayName = item?.name ?? item?.ingredientName ?? item?.title ?? "";

  return typeof displayName === "string" ? displayName : String(displayName);
}

function getUniqueDisplayIngredients(items) {
  if (!Array.isArray(items)) return [];

  const seenNames = new Set();

  return items.filter((item) => {
    const displayName = getIngredientDisplayName(item).trim();
    const normalizedName = displayName.toLowerCase();

    if (!normalizedName) return true;
    if (seenNames.has(normalizedName)) return false;

    seenNames.add(normalizedName);
    return true;
  });
}

function getVisibleMatchedIngredients(item) {
  return Array.isArray(item?.matchedIngredients)
    ? item.matchedIngredients.filter((ingredient) => hasText(ingredient?.name)).slice(0, 3)
    : [];
}

function getProductConnectionIngredients(item) {
  const names = [];
  const addName = (value) => {
    if (!hasText(value)) return;
    const trimmedValue = value.trim();
    const normalizedValue = trimmedValue.toLowerCase();

    if (names.some((name) => name.toLowerCase() === normalizedValue)) return;
    names.push(trimmedValue);
  };

  getVisibleMatchedIngredients(item).forEach((ingredient) => addName(ingredient.name));
  addName(item?.ingredientName);
  addName(item?.ingredient_name);
  addName(item?.mainIngredient);
  addName(item?.main_ingredient);

  if (Array.isArray(item?.ingredients)) {
    item.ingredients.forEach((ingredient) => {
      if (typeof ingredient === "string") {
        addName(ingredient);
        return;
      }

      addName(ingredient?.name);
      addName(ingredient?.ingredientName);
      addName(ingredient?.mainIngredient);
    });
  }

  return names.slice(0, 3);
}

function getFocusMetricName(hasRecommendationData, ...summaries) {
  const selectedMetricName = summaries.find((summary) => hasText(summary?.selectedMetricName))?.selectedMetricName;
  const focusMetric = summaries.find((summary) => summary?.focusMetric?.name)?.focusMetric;

  return selectedMetricName || focusMetric?.name || (hasRecommendationData ? "색소침착 · 주름 기준" : "추천 기준 확인");
}

function getRecommendationModeLabel(mode) {
  const normalizedMode = normalizeSourceText(mode);

  if (normalizedMode === "manual") return "사용자 선택 기준";
  if (normalizedMode === "auto") return "자동 추천 기준";

  return "";
}

function getRecommendationBasisRangeLabel(summary) {
  const count = Number(
    summary?.recentAnalysisCount ??
      summary?.recent_analysis_count ??
      summary?.basisCount ??
      summary?.basis_count ??
      summary?.analysisCount ??
      summary?.analysis_count,
  );
  const basisType = normalizeSourceText(summary?.basisType ?? summary?.basis_type ?? summary?.referenceRange);
  const isAverageBased = summary?.averageBased === true || summary?.average_based === true || basisType.includes("average");

  // 최근 5회 평균 문구는 API가 실제 기준 개수와 평균 기반 여부를 내려줄 때만 표시합니다.
  if (count === 5 && isAverageBased) {
    return "최근 5회 평균 기준";
  }

  if (Number.isFinite(count) && count > 1 && isAverageBased) {
    return `최근 ${count}회 평균 기준`;
  }

  return "최근 분석 결과 기반";
}

function getRecommendationReason(item) {
  // 백엔드가 제공한 추천 이유 필드만 표시해 프론트에서 근거 문구를 임의 생성하지 않습니다.
  return getFirstDisplayText(item?.recommendationReason, item?.recommendation_reason, item?.reason);
}

function formatReferenceBasis(referenceBasis) {
  if (!referenceBasis) return "";
  if (typeof referenceBasis === "string") return referenceBasis.trim();
  if (typeof referenceBasis !== "object") return "";

  const parts = [];
  const metricName = getFirstDisplayText(referenceBasis.metricName, referenceBasis.metric_name);
  const selectedMetricName = getFirstDisplayText(
    referenceBasis.selectedMetricName,
    referenceBasis.selected_metric_name,
  );
  const analysisId = referenceBasis.analysisId ?? referenceBasis.analysis_id;
  const score = referenceBasis.totalScore ?? referenceBasis.total_score ?? referenceBasis.score;
  const grade = getFirstDisplayText(referenceBasis.gradeName, referenceBasis.grade_name, referenceBasis.grade);
  const urlType = getFirstDisplayText(referenceBasis.urlType, referenceBasis.url_type);

  if (metricName) parts.push(`${metricName} 기준`);
  if (selectedMetricName && selectedMetricName !== metricName) parts.push(`${selectedMetricName} 기준`);
  if (analysisId) parts.push(`분석 ID ${analysisId}`);
  if (score !== null && score !== undefined && score !== "") parts.push(`점수 ${score}`);
  if (grade) parts.push(grade);
  if (urlType) parts.push(`연결 유형 ${urlType}`);

  return parts.join(" · ");
}

function getReferenceBasisHint(item) {
  // referenceBasis 객체는 그대로 렌더링하지 않고 표시 가능한 값만 조합합니다.
  return formatReferenceBasis(item?.referenceBasis ?? item?.reference_basis);
}

function getProductPriceAmount(item) {
  const priceAmount = Number(item?.priceAmount ?? item?.price_amount ?? item?.price);

  return Number.isFinite(priceAmount) && priceAmount > 0 ? priceAmount : null;
}

function isSearchResultUrl(url) {
  return /search|getSearchMain|query=/i.test(String(url || ""));
}

function formatProductPrice(priceAmount) {
  return `${Math.round(priceAmount).toLocaleString("ko-KR")}원`;
}

function getFirstDisplayText(...values) {
  const matchedValue = values.find((value) => hasText(value));

  return matchedValue ? matchedValue.trim() : "";
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
  // 추천 기준 상태는 summary/source 값을 그대로 해석해 표시하고, 추천 알고리즘 자체는 변경하지 않습니다.
  if (!summary && itemCount === 0) {
    return {
      tone: "empty",
      label: "추천 정보",
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
      label: "추천 정보",
      message: summary?.message || "분석 후 추천 정보가 표시됩니다.",
    };
  }

  if (!isCompleted || isSavedFalse) {
    return {
      tone: "reference",
      label: "추천 정보",
      message: summary?.message || "분석 완료 전에는 참고 정보로만 확인해 주세요.",
    };
  }

  if (isFallback || ["default", "fallback", "reference", "static", "seed"].includes(sourceText)) {
    return {
      tone: "reference",
      label: "기본 추천 가이드",
      message: summary?.message || "색소침착 · 주름 기준의 기본 참고 정보입니다. 최신 분석 후 관리 방향과 함께 확인해 주세요.",
    };
  }

  if (isCompleted && ["latest", "latest_analysis", "analysis", "personalized", "result", "completed"].includes(sourceText)) {
    return {
      tone: "personalized",
      label: "최근 분석 결과 기반",
      message: summary?.message || "최근 분석 결과를 바탕으로 참고할 수 있는 추천입니다.",
    };
  }

  return {
    tone: "reference",
    label: "추천 정보",
    message: summary?.message || "추천 기준을 확인 중입니다. 참고 정보로 활용해 주세요.",
  };
}

function RecommendationSectionState({ type, title, message }) {
  const isLoading = type === "loading";
  const isError = type === "error";

  return (
    <div className={`sf-section-state ${isLoading ? "is-loading" : ""} ${isError ? "is-error" : ""}`}>
      <span className="sf-section-state-icon" aria-hidden="true">
        {isLoading ? <LoaderCircle size={20} /> : <AlertCircle size={20} />}
      </span>
      {title && <strong>{title}</strong>}
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
  const [showCareNotice] = useState(() => readStoredSetting(SHOW_CARE_NOTICE_KEY, true));
  const [expandRecommendationReason] = useState(() =>
    readStoredSetting(EXPAND_RECOMMENDATION_REASON_KEY, true)
  );

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true);
    setIngredientError("");
    setProductError("");

    const [ingredientResult, productResult] = await Promise.allSettled([
      getIngredientRecommendations(),
      getProductRecommendations(),
    ]);

    // 성분/제품 추천 API 응답은 각각 items와 summary로 분리해 UI에 매핑합니다.
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

  const visibleIngredients = useMemo(() => getUniqueDisplayIngredients(ingredients), [ingredients]);
  const hasRecommendationData = visibleIngredients.length > 0 || products.length > 0;
  const ingredientSourceState = useMemo(
    () => getRecommendationSourceState(ingredientSummary, visibleIngredients.length),
    [ingredientSummary, visibleIngredients.length],
  );
  const productSourceState = useMemo(
    () => getRecommendationSourceState(productSummary, products.length),
    [productSummary, products.length],
  );
  const sourceState = useMemo(() => {
    if (ingredientSourceState.tone === "personalized" || productSourceState.tone === "personalized") {
      return ingredientSourceState.tone === "personalized" ? ingredientSourceState : productSourceState;
    }

    if (visibleIngredients.length || products.length) {
      return ingredientSourceState.tone !== "empty" ? ingredientSourceState : productSourceState;
    }

    return ingredientSourceState;
  }, [ingredientSourceState, productSourceState, products.length, visibleIngredients.length]);
  const recommendationBasisSummary = useMemo(() => {
    // selectedMetricName, recommendationMode는 백엔드 기준 설명으로만 사용합니다.
    const basisSummary =
      [productSummary, ingredientSummary].find((item) => hasText(item?.selectedMetricName)) ||
      productSummary ||
      ingredientSummary ||
      {};
    const selectedMetricName = getFirstDisplayText(basisSummary.selectedMetricName);
    const modeLabel = getRecommendationModeLabel(basisSummary.recommendationMode);
    const rangeLabel = getRecommendationBasisRangeLabel(basisSummary);
    const summaryReason = getFirstDisplayText(
      basisSummary.recommendationReason,
      basisSummary.recommendation_reason,
    ) || formatReferenceBasis(basisSummary.referenceBasis ?? basisSummary.reference_basis);

    return {
      metricLabel: selectedMetricName || sourceState.label,
      selectedMetricName,
      modeLabel: modeLabel || sourceState.label,
      rangeLabel,
      text: selectedMetricName
        ? `현재 추천 기준: ${selectedMetricName}. ${modeLabel || sourceState.label}으로 제공되는 추천 가이드입니다.`
        : summaryReason || sourceState.message,
    };
  }, [ingredientSummary, productSummary, sourceState]);

  const summaryItems = useMemo(
    () => [
      {
        label: "중점 지표",
        value: getFocusMetricName(hasRecommendationData, productSummary, ingredientSummary),
      },
      {
        label: "기능성 추천 성분",
        value: formatCount(visibleIngredients.length),
      },
      {
        label: "화장품 추천 제품",
        value: formatCount(productSummary?.recommendationCount ?? products.length),
      },
      {
        label: "기준 범위",
        value: recommendationBasisSummary.rangeLabel,
      },
    ],
    [
      hasRecommendationData,
      ingredientSummary,
      productSummary,
      products.length,
      recommendationBasisSummary.rangeLabel,
      visibleIngredients.length,
    ],
  );

  const summaryNote = useMemo(() => {
    if (isLoading) {
      return "최근 분석 결과를 기준으로 추천 정보를 불러오는 중입니다.";
    }

    if (ingredientError && productError) {
      return "추천 정보를 불러오지 못했습니다. 로그인 상태와 서버 실행 여부를 확인해 주세요.";
    }

    if (!visibleIngredients.length && !products.length) {
      return sourceState.message;
    }

    if (sourceState.tone === "personalized") {
      return "최근 분석 결과 기반으로 관리 우선 지표를 확인하고, 기능성 추천 성분과 연결되는 화장품 추천 제품을 보여드립니다.";
    }

    return sourceState.message;
  }, [ingredientError, isLoading, productError, products.length, sourceState, visibleIngredients.length]);

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

        .sf-recommend-basis {
          display: grid;
          gap: 8px;
          margin-top: 12px;
          padding: 13px;
          border-radius: 17px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-recommend-basis-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .sf-recommend-basis strong {
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.35;
        }

        .sf-recommend-basis span {
          width: fit-content;
          padding: 6px 9px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.09);
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-recommend-basis p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.55;
          word-break: keep-all;
        }

        .sf-recommend-flow-card {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 16px;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.92);
          border-radius: 24px;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.055), transparent 32%),
            #ffffff;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.055);
        }

        .sf-recommend-flow-step {
          position: relative;
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          min-height: 82px;
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .sf-recommend-flow-step:not(:last-child)::after {
          content: "";
          position: absolute;
          right: -10px;
          top: 50%;
          width: 10px;
          height: 2px;
          background: rgba(22, 125, 127, 0.34);
        }

        .sf-recommend-flow-step strong {
          display: block;
          color: #0f172a;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: -0.03em;
        }

        .sf-recommend-flow-step span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 11.5px;
          font-weight: 800;
          line-height: 1.45;
          word-break: keep-all;
        }

        .sf-recommend-flow-step .sf-icon-tile {
          align-self: center;
          justify-self: center;
          display: grid !important;
          place-items: center !important;
          width: 48px;
          height: 48px;
          min-width: 48px;
          min-height: 48px;
          margin: 0;
          border-radius: 16px;
          color: #167d7f;
          background: #ecfdfd;
          border: 1px solid #cfedec;
          box-shadow: none;
          line-height: 0;
        }

        .sf-recommend-flow-step .sf-icon-tile svg {
          display: block;
          width: 21px !important;
          height: 21px !important;
          min-width: 21px;
          min-height: 21px;
          margin: 0;
          color: #167d7f;
          stroke-width: 2.1;
          transform: none;
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

        .sf-panel-note {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          word-break: keep-all;
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

        .sf-product-card {
          grid-template-columns: 64px minmax(0, 1fr) auto;
          align-items: start;
        }

        .sf-product-visual {
          width: 64px;
          height: 64px;
          min-width: 64px;
          min-height: 64px;
          overflow: hidden;
          border-radius: 20px;
          display: grid;
          place-items: center;
          color: #167d7f;
          background:
            radial-gradient(circle at 30% 18%, rgba(22, 125, 127, 0.14), transparent 34%),
            linear-gradient(135deg, #f8fafc 0%, #ffffff 48%, #ecfeff 100%);
          border: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
        }

        .sf-product-visual img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sf-product-visual svg {
          display: block;
          width: 24px;
          height: 24px;
          stroke-width: 2.05;
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

        .sf-product-price {
          display: inline-flex;
          width: fit-content;
          margin: 2px 0 7px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 950;
        }

        .sf-product-detail {
          display: grid;
          gap: 7px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(226, 232, 240, 0.82);
        }

        .sf-product-detail-label {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 950;
        }

        .sf-product-ingredient-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .sf-product-ingredient-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          max-width: 100%;
          padding: 4px 8px;
          border-radius: 999px;
          color: #0f766e;
          background: rgba(20, 184, 166, 0.1);
          font-size: 11px;
          font-weight: 900;
          line-height: 1.25;
        }

        .sf-product-ingredient-score {
          color: #64748b;
          font-weight: 850;
        }

        .sf-product-reason {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          color: #475569;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.45;
          word-break: keep-all;
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
          justify-content: center;
          gap: 6px;
          width: fit-content;
          min-height: 38px;
          margin-top: 12px;
          padding: 0 14px;
          border: 1px solid rgba(22, 125, 127, 0.24);
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
          font-size: 12px;
          font-weight: 950;
          text-decoration: none;
          box-shadow: 0 8px 18px rgba(22, 125, 127, 0.08);
          transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }

        .sf-product-link:hover {
          border-color: rgba(22, 125, 127, 0.38);
          background: rgba(22, 125, 127, 0.12);
          text-decoration: none;
          transform: translateY(-1px);
        }

        .sf-product-link-note {
          margin-top: 5px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.45;
          word-break: keep-all;
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

        .sf-section-state strong {
          display: block;
          margin: 0;
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
          letter-spacing: -0.035em;
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

          .sf-recommend-flow-card {
            grid-template-columns: 1fr;
          }

          .sf-recommend-flow-step:not(:last-child)::after {
            left: 31px;
            right: auto;
            top: auto;
            bottom: -10px;
            width: 2px;
            height: 10px;
          }

          .sf-ingredient-card,
          .sf-product-card {
            grid-template-columns: 48px minmax(0, 1fr);
            min-height: auto;
          }

          .sf-product-card {
            grid-template-columns: 56px minmax(0, 1fr);
          }

          .sf-product-visual {
            width: 56px;
            height: 56px;
            min-width: 56px;
            min-height: 56px;
            border-radius: 18px;
          }

          .sf-match-score {
            grid-column: 2;
            align-items: flex-start;
            text-align: left;
            padding-top: 2px;
          }

          .sf-icon-tile {
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
            <Badge>추천</Badge>
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
              <Button to="/history" variant="secondary" size="lg">
                분석 이력에서 확인
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

            <div className="sf-recommend-basis">
              <div className="sf-recommend-basis-top">
                <strong>
                  {recommendationBasisSummary.selectedMetricName
                    ? `현재 추천 기준: ${recommendationBasisSummary.selectedMetricName}`
                    : "추천 기준"}
                </strong>
                <span>{recommendationBasisSummary.modeLabel}</span>
              </div>
              {/* 설정값이 켜져 있을 때만 백엔드가 내려준 추천 기준 설명을 펼쳐 보여줍니다. */}
              {expandRecommendationReason && (
                <p>{recommendationBasisSummary.text || "최근 분석 결과 기반 추천 정보를 확인합니다."}</p>
              )}
            </div>

            {/* 피부 관리 참고 안내는 사용자 설정에 따라 숨길 수 있습니다. */}
            {showCareNotice && (
              <div className="sf-summary-note">
                <Sparkles size={18} />
                <span>{summaryNote}</span>
              </div>
            )}
          </Card>
        </section>

        <section className="sf-recommend-flow-card" aria-label="추천 연결 흐름">
          <div className="sf-recommend-flow-step">
            <span className="sf-icon-tile" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <div>
              <strong>최근 분석 결과</strong>
              <span>{sourceState.tone === "personalized" ? "관리 우선 지표 확인" : "분석 저장 후 연결"}</span>
            </div>
          </div>
          <div className="sf-recommend-flow-step">
            <span className="sf-icon-tile" aria-hidden="true">
              <FlaskConical size={18} />
            </span>
            <div>
              <strong>기능성 추천 성분</strong>
              <span>{formatCount(visibleIngredients.length)} 추천</span>
            </div>
          </div>
          <div className="sf-recommend-flow-step">
            <span className="sf-icon-tile" aria-hidden="true">
              <PackageCheck size={18} />
            </span>
            <div>
              <strong>화장품 추천 제품</strong>
              <span>{formatCount(products.length)} 연결</span>
            </div>
          </div>
        </section>

        <section className="sf-recommend-content-grid">
          <Card className="sf-recommend-panel">
            <div className="sf-recommend-panel-head">
              <div className="sf-panel-heading">
                <span className="sf-panel-accent" />
                <div>
                  <span className="sf-recommend-label">기능성 추천 성분</span>
                  <h2>기능성 추천 성분</h2>
                </div>
              </div>
              <span className={`sf-source-pill is-${ingredientSourceState.tone}`}>
                {ingredientSourceState.label}
              </span>
            </div>

            {isLoading ? (
              <RecommendationSectionState type="loading" message="기능성 추천 성분을 불러오는 중입니다." />
            ) : ingredientError ? (
              <RecommendationSectionState type="error" message={ingredientError} />
            ) : visibleIngredients.length === 0 ? (
              <RecommendationSectionState
                type="empty"
                title="표시할 성분 추천이 아직 없습니다"
                message="최근 분석 결과가 저장되면 색소침착·주름 지표를 기준으로 추천 성분을 확인할 수 있습니다."
              />
            ) : (
              <div className="sf-recommend-list">
                {visibleIngredients.map((item) => {
                  const matchScore = getRecommendationMatchScore(item);
                  const ingredientName = getIngredientDisplayName(item);
                  const recommendationReason = getRecommendationReason(item);
                  const referenceBasisHint = getReferenceBasisHint(item);

                  return (
                    <article className="sf-ingredient-card" key={item.id || ingredientName}>
                      <span className="sf-icon-tile" aria-hidden="true">
                        <FlaskConical size={22} />
                      </span>

                      <div className="sf-ingredient-main">
                        <h3>{ingredientName}</h3>
                        <p>{item.description}</p>
                        {expandRecommendationReason && hasText(recommendationReason) && (
                          <div className="sf-product-detail">
                            <span className="sf-product-detail-label">추천 이유</span>
                            <p className="sf-product-reason">{recommendationReason}</p>
                          </div>
                        )}
                        {expandRecommendationReason && hasText(referenceBasisHint) && (
                          <div className="sf-tag-row">
                            <span className="sf-tag">{referenceBasisHint}</span>
                          </div>
                        )}
                        <div className="sf-tag-row">
                          {(item.tags || []).map((tag) => (
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
                  <span className="sf-recommend-label">화장품 추천 제품</span>
                  <h2>화장품 추천 제품</h2>
                  <p className="sf-panel-note">기능성 추천 성분과 연결해 참고할 수 있는 제품 검색 결과입니다.</p>
                </div>
              </div>
              <span className={`sf-source-pill is-${productSourceState.tone}`}>
                {productSourceState.label}
              </span>
            </div>

            {isLoading ? (
              <RecommendationSectionState type="loading" message="화장품 추천 제품을 불러오는 중입니다." />
            ) : productError ? (
              <RecommendationSectionState type="error" message={productError} />
            ) : products.length === 0 ? (
              <RecommendationSectionState
                type="empty"
                title="표시할 화장품 추천 제품이 아직 없습니다"
                message="추천 성분과 연결된 제품 정보가 준비되면 이 화면에서 확인할 수 있습니다."
              />
            ) : (
              <div className="sf-recommend-list">
                {products.map((item) => {
                  const matchScore = getRecommendationMatchScore(item);
                  const matchedIngredients = getVisibleMatchedIngredients(item);
                  const connectionIngredients = getProductConnectionIngredients(item);
                  const recommendationReason = getRecommendationReason(item);
                  const referenceBasisHint = getReferenceBasisHint(item);
                  const priceAmount = getProductPriceAmount(item);
                  const oliveKeyword = `${item.brand ?? ""} ${String(item.name ?? "")
                    .replace(/\[[^\]]*\]/g, "")
                    .replace(/세럼|앰플|크림|토너|로션|에센스/g, "")
                    .trim()
                    .split(/\s+/)
                    .slice(0, 3)
                    .join(" ")}`.trim();

                  const productSearchUrl = `https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=${encodeURIComponent(oliveKeyword)}`;
                  const productLinkUrl = item.productUrl || item.productSearchUrl || productSearchUrl;
                  const hasDirectProductUrl = hasText(item.productUrl) && !isSearchResultUrl(item.productUrl);
                  const productLinkLabel = hasDirectProductUrl ? "제품 링크 열기" : "검색 결과 보기";
                  const productLinkNote = hasDirectProductUrl
                    ? "제품 상세 화면으로 이동합니다."
                    : "추천 성분과 제품명을 기준으로 참고할 수 있는 검색 결과로 이동합니다.";

                  return (
                    <article className="sf-product-card" key={item.id || item.name}>
                      <span className="sf-product-visual" aria-hidden="true">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <PackageCheck size={24} />
                        )}
                      </span>

                      <div className="sf-product-main">
                        <span className="sf-product-brand">{item.brand}</span>

                        <h3>
                          <a
                            href={productLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sf-product-title-link"
                          >
                            {item.name}
                          </a>
                        </h3>
                        {priceAmount && <span className="sf-product-price">{formatProductPrice(priceAmount)}</span>}
                        <p>{item.description}</p>
                        {connectionIngredients.length > 0 && (
                          <div className="sf-product-detail">
                            <span className="sf-product-detail-label">추천 성분 연결</span>
                            <div className="sf-product-ingredient-row">
                              {connectionIngredients.map((ingredientName) => {
                                const matchedIngredient = matchedIngredients.find(
                                  (ingredient) => ingredient.name === ingredientName
                                );

                                return (
                                  <span className="sf-product-ingredient-pill" key={ingredientName}>
                                    {ingredientName}
                                    {hasMatchScore(matchedIngredient?.match) && (
                                      <span className="sf-product-ingredient-score">
                                        {formatMatchScore(matchedIngredient.match)}
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {expandRecommendationReason && hasText(recommendationReason) && (
                          <div className="sf-product-detail">
                            <span className="sf-product-detail-label">추천 이유</span>
                            <p className="sf-product-reason">{recommendationReason}</p>
                          </div>
                        )}
                        {expandRecommendationReason && hasText(referenceBasisHint) && (
                          <div className="sf-tag-row">
                            <span className="sf-tag">{referenceBasisHint}</span>
                          </div>
                        )}
                        <div className="sf-tag-row">
                          {(item.tags || []).map((tag) => (
                            <span className="sf-tag" key={tag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <>
                          <a
                            className="sf-product-link"
                            href={productLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {productLinkLabel} <ExternalLink size={13} />
                          </a>

                          <p className="sf-product-link-note">
                            {productLinkNote}
                          </p>
                        </>
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
