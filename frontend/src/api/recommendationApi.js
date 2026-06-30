// recommendationApi.js
// 맞춤 추천 페이지와 식습관 가이드 페이지에서 사용하는 추천 API 모음입니다.
// 백엔드 응답 구조가 조금 달라도 화면에서는 같은 필드명으로 사용할 수 있도록 정규화합니다.
import http from "./http";

// 값이 배열이면 그대로 쓰고, 배열이 아니면 빈 배열로 바꿉니다.
// map 실행 중 오류가 나지 않게 만드는 안전장치입니다.
function toArray(value) {
  return Array.isArray(value) ? value : [];
}

// 문자열 값은 앞뒤 공백을 제거하고, 문자열이 아니면 빈 문자열로 통일합니다.
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// 백엔드 응답은 card 객체, camelCase, snake_case가 섞여 내려올 수 있습니다.
// 화면 컴포넌트가 필드명을 계속 신경 쓰지 않도록 여기서 첫 번째 유효값을 고릅니다.
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

// 추천 매칭 점수처럼 숫자로 보여야 하는 값을 안전하게 숫자로 변환합니다.
function normalizeMatch(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

// 가격처럼 0보다 큰 숫자만 의미 있는 값으로 볼 때 사용하는 변환 함수입니다.
function normalizePositiveNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

// 성분 추천 카드는 한글 표시명과 추천 이유가 핵심입니다.
// 이름이 없으면 사용자에게 의미 있는 카드가 아니므로 렌더링 대상에서 제외합니다.
// 성분 추천 API의 개별 성분 객체를 화면 카드에서 쓰기 좋은 형태로 바꿉니다.
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

// summary는 상단 추천 기준 안내에 사용됩니다.
// 추천 기준은 프론트에서 임의 계산하지 않고 백엔드가 내려준 source/mode/selectedMetricName을 그대로 정리합니다.
// 추천 상단 요약 영역에 필요한 추천 기준, 선택 지표, fallback 여부를 정리합니다.
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

// 제품 카드 안에 함께 표시할 연결 성분 정보를 정리합니다.
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

// 제품 추천은 card 객체를 우선 사용하고, 없을 때 상위 필드로 보완합니다.
// 가격과 이미지는 실제 값이 있을 때만 화면에서 신뢰성 있게 표시하기 위해 정규화합니다.
// 제품 추천 API의 개별 제품 객체를 화면 카드에서 쓰기 좋은 형태로 바꿉니다.
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
    priceAmount: normalizePositiveNumber(
      pickValue(card?.priceAmount, card?.price_amount, card?.price, item?.priceAmount, item?.price_amount, item?.price),
    ),
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

// 식습관 가이드는 최신 분석 기반인지, 기본 가이드인지에 따라 안내 문구가 달라집니다.
// summary의 기준 필드는 화면 상단 근거 설명에 사용합니다.
// 식습관 가이드 상단에 보여줄 분석 기준과 가이드 출처 정보를 정리합니다.
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

// 식습관 가이드 카드 한 개에 필요한 제목, 설명, 추천 이유를 정리합니다.
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

// 아침/점심/저녁 같은 시간대별 루틴 문구를 정리합니다.
function normalizeDietRoutine(item) {
  return {
    time: normalizeText(item?.time),
    text: normalizeText(item?.text),
  };
}

// 체크리스트 항목에서 제목, 분류, 설명 문구를 안전하게 꺼냅니다.
function normalizeDietCheck(item) {
  return {
    id: item?.id ?? null,
    title: normalizeText(item?.title),
    category: normalizeText(item?.category),
    description: pickText(item?.description, item?.content, item?.recommendationReason, item?.recommendation_reason, item?.reason),
    recommendationReason: pickText(item?.recommendationReason, item?.recommendation_reason, item?.reason),
  };
}

// 수동 추천은 허용된 분석 지표만 focus query로 전달하고, 자동 추천은 기존 URL을 그대로 사용합니다.
function getRecommendationPath(path, focus) {
  const safeFocus = focus === "pigmentation" || focus === "wrinkle" ? focus : "";

  return safeFocus ? `${path}?focus=${encodeURIComponent(safeFocus)}` : path;
}

// 기능성 성분 추천 목록을 가져와 화면에서 바로 렌더링 가능한 배열로 변환합니다.
async function getIngredientRecommendations(focus) {
  const response = await http.get(getRecommendationPath("/api/recommendations/ingredients", focus));

  return {
    source: response?.source ?? response?.summary?.source ?? "unknown",
    summary: normalizeSummary(response, "unknown"),
    ingredients: toArray(response?.ingredients).map(normalizeIngredient).filter(Boolean),
  };
}

// 제품 추천 목록을 가져와 card 우선 구조와 상위 필드 구조를 함께 처리합니다.
async function getProductRecommendations(focus) {
  const response = await http.get(getRecommendationPath("/api/recommendations/products", focus));

  return {
    source: response?.source ?? response?.summary?.source ?? "unknown",
    summary: normalizeSummary(response, "unknown"),
    products: toArray(response?.products).map(normalizeProduct).filter(Boolean),
  };
}

// 식습관 가이드, 루틴, 체크리스트를 한 번에 가져와 각 영역별 배열로 정리합니다.
async function getDietGuideRecommendations(focus) {
  const response = await http.get(getRecommendationPath("/api/recommendations/diet-guides", focus));

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
