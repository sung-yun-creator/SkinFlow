import http from "./http";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIngredient(item) {
  return {
    id: item?.id ?? item?.name,
    name: item?.name ?? "성분 정보 없음",
    description: item?.description ?? "추천 성분 설명을 불러오지 못했습니다.",
    match: Number.isFinite(Number(item?.match)) ? Number(item.match) : 0,
    reason: item?.reason ?? "최근 분석 결과를 기준으로 추천된 성분입니다.",
    priority: item?.priority ?? null,
    metricName: item?.metricName ?? "피부 지표",
    tags: toArray(item?.tags),
  };
}

function normalizeProduct(item) {
  const card = item?.card ?? {};

  return {
    id: item?.id ?? card?.name ?? item?.productName,
    brand: card?.brandName ?? item?.brandName ?? "브랜드 정보 없음",
    name: card?.name ?? item?.productName ?? "제품 정보 없음",
    description: card?.description ?? item?.description ?? "제품 추천 설명을 불러오지 못했습니다.",
    match: Number.isFinite(Number(card?.match ?? item?.match))
      ? Number(card?.match ?? item?.match)
      : 0,
    tags: toArray(card?.tags ?? item?.tags),
    productUrl: card?.productUrl ?? item?.productUrl ?? "",
    imageUrl: card?.imageUrl ?? item?.imageUrl ?? "",
    matchedIngredients: toArray(item?.matchedIngredients),
  };
}

async function getIngredientRecommendations() {
  const response = await http.get("/api/recommendations/ingredients");

  return {
    source: response?.source ?? "unknown",
    summary: response?.summary ?? null,
    ingredients: toArray(response?.ingredients).map(normalizeIngredient),
  };
}

async function getProductRecommendations() {
  const response = await http.get("/api/recommendations/products");

  return {
    source: response?.source ?? "unknown",
    summary: response?.summary ?? null,
    products: toArray(response?.products).map(normalizeProduct),
  };
}

export { getIngredientRecommendations, getProductRecommendations };
