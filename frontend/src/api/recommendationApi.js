import http from "./http";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pickValue(...values) {
  return values.find((value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) return value.length > 0;

    return true;
  });
}

function pickText(...values) {
  return normalizeText(pickValue(...values));
}

function normalizeMatch(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeIngredient(item) {
  const name = pickText(item?.name, item?.ingredientName, item?.ingredient_name);
  const recommendationReason = pickText(
    item?.recommendationReason,
    item?.recommendation_reason,
    item?.recommendReason,
    item?.recommend_reason,
    item?.reason,
  );

  if (!name) {
    return null;
  }

  return {
    id: item?.id ?? item?.ingredientId ?? item?.ingredient_id ?? name,
    name,
    description: pickText(item?.description, item?.content, item?.summary),
    match: normalizeMatch(pickValue(item?.match, item?.matchScore, item?.match_score, item?.score)),
    recommendationReason,
    reason: recommendationReason,
    referenceBasis: item?.referenceBasis ?? item?.reference_basis ?? null,
    priority: item?.priority ?? null,
    metricName: pickText(item?.metricName, item?.metric_name),
    metricCode: pickText(item?.metricCode, item?.metric_code, item?.type, item?.code),
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
    recommendationMode: response?.recommendationMode ?? summary?.recommendationMode ?? summary?.recommendation_mode ?? null,
    selectedMetricName: response?.selectedMetricName ?? summary?.selectedMetricName ?? summary?.selected_metric_name ?? null,
    selectedMetricCode: response?.selectedMetricCode ?? summary?.selectedMetricCode ?? summary?.selected_metric_code ?? null,
    recommendationReason: response?.recommendationReason ?? summary?.recommendationReason ?? summary?.recommendation_reason ?? null,
    referenceBasis: response?.referenceBasis ?? summary?.referenceBasis ?? summary?.reference_basis ?? null,
    ingredientSource: response?.ingredientSource ?? summary?.ingredientSource ?? null,
    productSource: response?.productSource ?? summary?.productSource ?? null,
    isFallback: response?.isFallback ?? summary?.isFallback ?? false,
    fallback: response?.fallback ?? summary?.fallback ?? false,
    fromDefault: response?.fromDefault ?? summary?.fromDefault ?? false,
  };
}

function normalizeTags(value) {
  return toArray(value).map(normalizeText).filter(Boolean);
}

function normalizeMatchedIngredient(item) {
  const name = pickText(item?.name, item?.ingredientName, item?.ingredient_name);

  if (!name) {
    return null;
  }

  return {
    id: item?.id ?? item?.ingredientId ?? item?.ingredient_id ?? name,
    name,
    match: normalizeMatch(
      pickValue(item?.match, item?.matchScore, item?.match_score, item?.score),
    ),
    reason: pickText(item?.reason, item?.recommendReason, item?.recommend_reason),
    tags: normalizeTags(item?.tags),
  };
}

function normalizeProduct(item) {
  const card = item?.card ?? {};
  const brand = pickText(
    card?.brandName,
    card?.brand_name,
    item?.brandName,
    item?.brand_name,
    item?.brand,
  );
  const name = pickText(
    card?.productName,
    card?.product_name,
    card?.name,
    item?.productName,
    item?.product_name,
    item?.name,
  );

  if (!brand || !name) {
    return null;
  }

  return {
    id: item?.id ?? name,
    brand,
    name,
    description: pickText(card?.description, item?.description),
    match: normalizeMatch(
      pickValue(
        card?.match,
        card?.matchScore,
        card?.match_score,
        card?.score,
        item?.match,
        item?.matchScore,
        item?.match_score,
        item?.score,
      ),
    ),
    recommendationReason: pickText(
      card?.recommendationReason,
      card?.recommendation_reason,
      card?.recommendReason,
      card?.recommend_reason,
      card?.reason,
      item?.recommendationReason,
      item?.recommendation_reason,
      item?.recommendReason,
      item?.recommend_reason,
      item?.reason,
    ),
    reason: pickText(
      card?.recommendationReason,
      card?.recommendation_reason,
      card?.recommendReason,
      card?.recommend_reason,
      card?.reason,
      item?.recommendationReason,
      item?.recommendation_reason,
      item?.recommendReason,
      item?.recommend_reason,
      item?.reason,
    ),
    referenceBasis: card?.referenceBasis ?? card?.reference_basis ?? item?.referenceBasis ?? item?.reference_basis ?? null,
    tags: normalizeTags(pickValue(card?.tags, item?.tags)),
    productUrl: pickText(card?.productUrl, card?.product_url, item?.productUrl, item?.product_url),
    productSearchUrl: pickText(card?.productSearchUrl, card?.product_search_url, item?.productSearchUrl, item?.product_search_url),
    imageUrl: pickText(
      card?.imageUrl,
      card?.image_url,
      card?.productImg,
      card?.product_img,
      item?.imageUrl,
      item?.image_url,
      item?.productImg,
      item?.product_img,
    ),
    matchedIngredients: toArray(
      pickValue(card?.matchedIngredients, card?.matched_ingredients, item?.matchedIngredients, item?.matched_ingredients),
    )
      .map(normalizeMatchedIngredient)
      .filter(Boolean),
  };
}

function normalizeDietSummary(response) {
  const summary = response?.summary ?? {};
  const hasGuideCount = summary?.guideCount !== null && summary?.guideCount !== undefined && summary?.guideCount !== "";
  const guideCount = Number(summary?.guideCount);

  return {
    ...summary,
    analysisId: summary?.analysisId ?? summary?.analysis_id ?? null,
    analyzedAt: summary?.analyzedAt ?? summary?.analyzed_at ?? null,
    totalScore: summary?.totalScore ?? summary?.total_score ?? null,
    guideSource: summary?.guideSource ?? summary?.guide_source ?? null,
    saved: response?.saved ?? summary?.saved ?? null,
    recommendationMode: response?.recommendationMode ?? summary?.recommendationMode ?? summary?.recommendation_mode ?? null,
    selectedMetricName: response?.selectedMetricName ?? summary?.selectedMetricName ?? summary?.selected_metric_name ?? null,
    selectedMetricCode: response?.selectedMetricCode ?? summary?.selectedMetricCode ?? summary?.selected_metric_code ?? null,
    recommendationReason: response?.recommendationReason ?? summary?.recommendationReason ?? summary?.recommendation_reason ?? null,
    referenceBasis: response?.referenceBasis ?? summary?.referenceBasis ?? summary?.reference_basis ?? null,
    guideCount: hasGuideCount && Number.isFinite(guideCount) ? guideCount : null,
    message: normalizeText(summary?.message),
  };
}

function normalizeDietGuide(item) {
  const card = item?.card ?? {};
  const recommendationReason = pickText(
    card?.recommendationReason,
    card?.recommendation_reason,
    card?.reason,
    item?.recommendationReason,
    item?.recommendation_reason,
    item?.reason,
  );

  return {
    id: item?.id ?? item?.recommendationId ?? item?.recommendation_id ?? null,
    recommendationId: item?.recommendationId ?? item?.recommendation_id ?? null,
    ingredientId: item?.ingredientId ?? item?.ingredient_id ?? null,
    ingredientName: pickText(item?.ingredientName, item?.ingredient_name),
    category: normalizeText(item?.category),
    title: pickText(card?.title, item?.title),
    description: pickText(card?.description, item?.description, item?.content),
    content: normalizeText(item?.content),
    recommendationReason,
    reason: recommendationReason,
    referenceBasis: card?.referenceBasis ?? card?.reference_basis ?? item?.referenceBasis ?? item?.reference_basis ?? null,
    priority: pickText(card?.priority, item?.priority),
    tag: pickText(card?.tag, item?.tag, item?.category),
    createdAt: item?.createdAt ?? item?.created_at ?? null,
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
    id: item?.id ?? null,
    title: normalizeText(item?.title),
    category: normalizeText(item?.category),
    description: pickText(item?.description, item?.content, item?.recommendationReason, item?.recommendation_reason, item?.reason),
    recommendationReason: pickText(item?.recommendationReason, item?.recommendation_reason, item?.reason),
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
