import http from "./http";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMatch(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeIngredient(item) {
  return {
    id: item?.id ?? item?.name,
    name: item?.name ?? "성분 정보 없음",
    description: item?.description ?? "추천 성분 설명을 불러오지 못했습니다.",
    match: normalizeMatch(item?.match),
    reason: item?.reason ?? "최근 분석 결과를 기준으로 추천된 성분입니다.",
    priority: item?.priority ?? null,
    metricName: item?.metricName ?? "피부 지표",
    tags: toArray(item?.tags),
  };
}

function normalizeSummary(response, defaultSource) {
  const summary = response?.summary ?? {};
  const source =
    response?.source ??
    summary?.source ??
    response?.ingredientSource ??
    response?.productSource ??
    defaultSource;

  return {
    ...summary,
    source,
    message: response?.message ?? summary?.message ?? "",
    ingredientSource: response?.ingredientSource ?? summary?.ingredientSource ?? null,
    productSource: response?.productSource ?? summary?.productSource ?? null,
    isFallback: response?.isFallback ?? summary?.isFallback ?? false,
    fallback: response?.fallback ?? summary?.fallback ?? false,
    fromDefault: response?.fromDefault ?? summary?.fromDefault ?? false,
  };
}

function normalizeProduct(item) {
  const card = item?.card ?? {};

  return {
    id: item?.id ?? card?.name ?? item?.productName,
    brand: card?.brandName ?? item?.brandName ?? "브랜드 정보 없음",
    name: card?.name ?? item?.productName ?? "제품 정보 없음",
    description: card?.description ?? item?.description ?? "제품 추천 설명을 불러오지 못했습니다.",
    match: normalizeMatch(card?.match ?? item?.match),
    tags: toArray(card?.tags ?? item?.tags),
    productUrl: card?.productUrl ?? item?.productUrl ?? "",
    imageUrl: card?.imageUrl ?? item?.imageUrl ?? "",
    matchedIngredients: toArray(item?.matchedIngredients),
  };
}

function normalizeDietSummary(response) {
  const summary = response?.summary ?? {};
  const hasGuideCount = summary?.guideCount !== null && summary?.guideCount !== undefined && summary?.guideCount !== "";
  const guideCount = Number(summary?.guideCount);

  return {
    analysisId: summary?.analysisId ?? null,
    analyzedAt: summary?.analyzedAt ?? null,
    totalScore: summary?.totalScore ?? null,
    guideSource: summary?.guideSource ?? null,
    guideCount: hasGuideCount && Number.isFinite(guideCount) ? guideCount : null,
    message: normalizeText(summary?.message),
  };
}

function normalizeDietGuide(item) {
  const card = item?.card ?? {};

  return {
    id: item?.id ?? item?.recommendationId ?? null,
    recommendationId: item?.recommendationId ?? null,
    ingredientId: item?.ingredientId ?? null,
    ingredientName: normalizeText(item?.ingredientName),
    category: normalizeText(item?.category),
    title: normalizeText(card?.title) || normalizeText(item?.title),
    description: normalizeText(card?.description) || normalizeText(item?.content),
    content: normalizeText(item?.content),
    reason: normalizeText(item?.reason),
    priority: normalizeText(card?.priority) || normalizeText(item?.priority),
    tag: normalizeText(card?.tag) || normalizeText(item?.category),
    createdAt: item?.createdAt ?? null,
  };
}

function normalizeDietRoutine(item) {
  return {
    time: normalizeText(item?.time),
    text: normalizeText(item?.text),
  };
}

function normalizeDietCheck(item) {
  return {
    title: normalizeText(item?.title),
    category: normalizeText(item?.category),
  };
}

async function getIngredientRecommendations() {
  const response = await http.get("/api/recommendations/ingredients");

  return {
    source: response?.source ?? response?.summary?.source ?? "unknown",
    summary: normalizeSummary(response, "unknown"),
    ingredients: toArray(response?.ingredients).map(normalizeIngredient),
  };
}

async function getProductRecommendations() {
  const response = await http.get("/api/recommendations/products");

  return {
    source: response?.source ?? response?.summary?.source ?? "unknown",
    summary: normalizeSummary(response, "unknown"),
    products: toArray(response?.products).map(normalizeProduct),
  };
}

async function getDietGuideRecommendations() {
  const response = await http.get("/api/recommendations/diet-guides");

  return {
    source: normalizeText(response?.source) || "unknown",
    summary: normalizeDietSummary(response),
    guides: toArray(response?.guides).map(normalizeDietGuide),
    routines: toArray(response?.routines).map(normalizeDietRoutine),
    checks: toArray(response?.checks).map(normalizeDietCheck),
  };
}

export {
  getIngredientRecommendations,
  getProductRecommendations,
  getDietGuideRecommendations,
};
