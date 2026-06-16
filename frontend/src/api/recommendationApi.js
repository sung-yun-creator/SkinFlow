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
  const name = normalizeText(item?.name);

  if (!name) {
    return null;
  }

  return {
    id: item?.id ?? name,
    name,
    description: normalizeText(item?.description),
    match: normalizeMatch(item?.match),
    reason: normalizeText(item?.reason),
    priority: item?.priority ?? null,
    metricName: normalizeText(item?.metricName),
    tags: toArray(item?.tags).map(normalizeText).filter(Boolean),
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
  const brand = normalizeText(card?.brandName) || normalizeText(item?.brandName);
  const name = normalizeText(card?.name) || normalizeText(item?.productName);

  if (!brand || !name) {
    return null;
  }

  return {
    id: item?.id ?? name,
    brand,
    name,
    description: normalizeText(card?.description) || normalizeText(item?.description),
    match: normalizeMatch(card?.match ?? item?.match),
    tags: toArray(card?.tags ?? item?.tags).map(normalizeText).filter(Boolean),
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
    ingredients: toArray(response?.ingredients).map(normalizeIngredient).filter(Boolean),
  };
}

async function getProductRecommendations() {
  const response = await http.get("/api/recommendations/products");

  return {
    source: response?.source ?? response?.summary?.source ?? "unknown",
    summary: normalizeSummary(response, "unknown"),
    products: toArray(response?.products).map(normalizeProduct).filter(Boolean),
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
