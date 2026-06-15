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
    return "-";
  }

  return `${Math.round(numericValue)}점`;
}

function getFocusMetricName(...summaries) {
  const focusMetric = summaries.find((summary) => summary?.focusMetric?.name)?.focusMetric;

  return focusMetric?.name || "분석 대기";
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
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const analysisResult = {
    skinType: "건성",
    pigmentation: 90,
    pore: 20,
    wrinkle: 10,
  };
  const allowedKeywords = [
  "피부",
  "스킨케어",
  "화장품",
  "성분",
  "색소침착",
  "모공",
  "주름",
  "건성",
  "지성",
  "여드름",
  "보습",
  "운동",
  "선크림",
  "자외선",
];

const isSkinRelatedQuestion = (text) => {
  const normalizedText = text.replace(/\s/g, "").toLowerCase();

  return allowedKeywords.some((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  );
};

  const handleSendChat = async (question = message) => {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) return;

  if (!isSkinRelatedQuestion(trimmedQuestion)) {
    setMessage("");
    return;
  }

  setIsChatOpen(true);

  setChatMessages((prev) => [
    ...prev,
    {
      role: "user",
      text: trimmedQuestion,
    },
  ]);
     

    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedQuestion,
          analysisResult,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "챗봇 요청 실패");
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.answer,
        },
      ]);
    } catch (error) {
      console.error(error);

      setChatMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "챗봇 답변을 불러오지 못했습니다.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
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
    loadRecommendations();
  }, [loadRecommendations]);

  const summary = productSummary || ingredientSummary;

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
      return "추천 API 연결 상태를 확인해 주세요. 로그인 토큰 또는 백엔드 서버 상태가 필요합니다.";
    }

    if (!ingredients.length && !products.length) {
      return summary?.message || "최근 분석 결과 기반 추천 데이터가 아직 없습니다.";
    }

    return `최근 분석 결과 기준 ${formatScore(summary?.totalScore)} 상태에서 참고할 수 있는 성분과 제품 추천입니다.`;
  }, [ingredientError, ingredients.length, isLoading, productError, products.length, summary]);

  const statusLabel = isLoading ? "불러오는 중" : ingredientError && productError ? "연결 확인" : "API 연동";

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
          min-width: 54px;
          padding: 8px 0;
          color: #167d7f;
          text-align: right;
          font-size: 19px;
          font-weight: 950;
          line-height: 1.05;
          letter-spacing: -0.04em;
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

        .sf-floating-chat-button {
          position: fixed;
          right: 28px;
          bottom: 28px;
          z-index: 1000;
          width: 64px;
          height: 64px;
          border: none;
          border-radius: 50%;
          background: #167d7f;
          color: white;
          font-size: 28px;
          cursor: pointer;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.22);
        }

        .sf-chat-modal {
          position: fixed;
          right: 28px;
          bottom: 104px;
          z-index: 1001;
          width: 390px;
          max-width: calc(100vw - 32px);
          height: 620px;
          max-height: calc(100vh - 140px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 28px;
          background: #ffffff;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
        }

        .sf-chat-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 22px;
          color: white;
          background: linear-gradient(135deg, #167d7f, #22c5c8);
        }

        .sf-chat-header strong {
          font-size: 18px;
        }

        .sf-chat-header p {
          margin: 6px 0 0;
          font-size: 13px;
          opacity: 0.9;
        }

        .sf-chat-header button {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.22);
          color: white;
          font-size: 24px;
          cursor: pointer;
        }

     .sf-chat-quick {
     display: flex;
     flex-wrap: wrap;
     gap: 8px;
     padding: 14px;
     border-bottom: 1px solid #e2e8f0;
     background: #ffffff;
}

        .sf-chat-quick button {
          flex: 0 0 auto;
          padding: 8px 11px;
          border: 1px solid #dbeafe;
          border-radius: 999px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .sf-chat-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          padding: 18px;
          background: #f8fafc;
        }

        .sf-chat-message {
          max-width: 78%;
          padding: 12px 14px;
          border-radius: 18px;
          font-size: 14px;
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

        .sf-chat-message.user {
          align-self: flex-end;
          color: #ffffff;
          background: #167d7f;
          border-bottom-right-radius: 6px;
        }

        .sf-chat-message.bot {
          align-self: flex-start;
          color: #0f172a;
          background: #ffffff;
          border-bottom-left-radius: 6px;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
        }

        .sf-chat-input-row {
          display: flex;
          gap: 8px;
          padding: 14px;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .sf-chat-input-row input {
          flex: 1;
          padding: 12px 13px;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          outline: none;
        }

        .sf-chat-input-row button {
          padding: 0 16px;
          border: none;
          border-radius: 14px;
          background: #167d7f;
          color: white;
          font-weight: 800;
          cursor: pointer;
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

          .sf-floating-chat-button {
            right: 18px;
            bottom: 18px;
            width: 58px;
            height: 58px;
          }

          .sf-chat-modal {
            right: 16px;
            bottom: 88px;
            width: calc(100vw - 32px);
            height: 560px;
          }
        }
      `}</style>

      <div className="sf-recommend-page">
        <section className="sf-recommend-hero">
          <Card className="sf-recommend-hero-card">
            <Badge>AI Recommendation</Badge>
            <h1>
              분석 결과에 맞춘
              <br />
              <span className="sf-recommend-gradient">성분·제품 추천</span>
            </h1>
            <p>
              색소침착과 주름 중심의 분석 결과를 바탕으로 기능성 성분,
              화장품 제품, 식습관 가이드까지 다음 관리 행동을 짧게 정리합니다.
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
            </div>

            {isLoading ? (
              <RecommendationSectionState type="loading" message="기능성 성분 추천을 불러오는 중입니다." />
            ) : ingredientError ? (
              <RecommendationSectionState type="error" message={ingredientError} />
            ) : ingredients.length === 0 ? (
              <RecommendationSectionState type="empty" message="표시할 성분 추천 데이터가 없습니다." />
            ) : (
              <div className="sf-recommend-list">
                {ingredients.map((item) => (
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

                    <div className="sf-match-score">
                      <span>매칭</span>
                      {item.match}점
                    </div>
                  </article>
                ))}
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
            </div>

            {isLoading ? (
              <RecommendationSectionState type="loading" message="화장품 제품 추천을 불러오는 중입니다." />
            ) : productError ? (
              <RecommendationSectionState type="error" message={productError} />
            ) : products.length === 0 ? (
              <RecommendationSectionState type="empty" message="표시할 제품 추천 데이터가 없습니다." />
            ) : (
              <div className="sf-recommend-list">
                {products.map((item) => (
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

                    <div className="sf-match-score">
                      <span>매칭</span>
                      {item.match}점
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </section>

        <button
          type="button"
          className="sf-floating-chat-button"
          onClick={() => setIsChatOpen(true)}
        >
          💬
        </button>

        {isChatOpen && (
          <div className="sf-chat-modal">
            <div className="sf-chat-header">
              <div>
                <strong>SkinFlow 피부 상담 챗봇</strong>
                <p>피부 고민을 선택하거나 입력해 주세요.</p>
              </div>

              <button type="button" onClick={() => setIsChatOpen(false)}>
                ×
              </button>
            </div>

            <div className="sf-chat-quick">
              {[
                 "운동 후 스킨케어 루틴 알려줘",
                 "건성 피부 관리법 알려줘",
                 "지성 피부 관리법 알려줘",
                 "민감성 피부 관리법 알려줘",
                 "색소침착 관리 방법 알려줘",
                 "모공 관리법 알려줘",
                 "주름 관리법 알려줘",
                 "선크림 사용법 알려줘",
                 "여드름 관리법 알려줘",
              ].map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handleSendChat(question)}
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="sf-chat-body">
              {chatMessages.length === 0 && (
                <div className="sf-chat-message bot">
                  안녕하세요. SkinFlow 피부 상담 챗봇입니다. 궁금한 피부 고민을 입력해 주세요.
                </div>
              )}

              {chatMessages.map((item, index) => (
                <div key={index} className={`sf-chat-message ${item.role}`}>
                  {item.text}
                </div>
              ))}

              {isLoading && (
                <div className="sf-chat-message bot">답변 생성 중...</div>
              )}
            </div>

            <div className="sf-chat-input-row">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="피부 고민을 입력하세요"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSendChat();
                  }
                }}
              />

              <button type="button" onClick={() => handleSendChat()}>
                전송
              </button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default RecommendationPage;