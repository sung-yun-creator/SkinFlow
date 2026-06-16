import http from "./http";

function toArray(value) {
  return Array.isArray(value) ? value : [];
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

export { getIngredientRecommendations, getProductRecommendations };
