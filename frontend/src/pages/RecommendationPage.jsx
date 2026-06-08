import {
  ArrowRight,
  BadgeCheck,
  Beaker,
  CheckCircle2,
  ExternalLink,
  HeartPulse,
  Leaf,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";

const ingredientRecommendations = [
  {
    name: "나이아신아마이드",
    type: "미백 기능성 성분",
    match: 92,
    reason: "색소침착 지표 관리에 참고할 수 있는 대표적인 기능성 성분입니다.",
    tag: "색소침착",
  },
  {
    name: "비타민 C 유도체",
    type: "브라이트닝 성분",
    match: 88,
    reason: "칙칙한 피부 톤과 색소침착 관리 루틴에 함께 고려할 수 있습니다.",
    tag: "톤 관리",
  },
  {
    name: "판테놀",
    type: "피부 장벽 보조 성분",
    match: 84,
    reason: "피부 자극을 줄이고 수분 장벽 관리에 참고할 수 있는 성분입니다.",
    tag: "진정",
  },
];

const productRecommendations = [
  {
    brand: "SkinFlow Pick",
    name: "브라이트닝 밸런스 세럼",
    type: "세럼",
    price: "29,000원",
    match: 94,
    reason: "색소침착 관리에 참고할 수 있는 기능성 성분 중심의 세럼 타입 제품입니다.",
  },
  {
    brand: "Derma Care",
    name: "수분 장벽 리페어 크림",
    type: "크림",
    price: "24,000원",
    match: 89,
    reason: "수분 관리와 피부 장벽 관리 루틴에 함께 사용하기 좋은 보습 제품입니다.",
  },
  {
    brand: "Daily UV",
    name: "데일리 톤케어 선크림",
    type: "선크림",
    price: "18,000원",
    match: 87,
    reason: "색소침착 관리에서 중요한 자외선 차단 루틴에 활용할 수 있습니다.",
  },
];

const careTips = [
  "색소침착 지표가 주의 단계이므로 자외선 차단 루틴을 우선 관리하세요.",
  "기능성 성분은 피부 상태에 따라 자극이 있을 수 있으므로 낮은 빈도부터 시작하세요.",
  "제품 추천은 분석 결과 기반 참고 정보이며, 개인 피부 반응에 따라 달라질 수 있습니다.",
];

function RecommendationPage() {
  return (
    <PageLayout>
      <section className="recommend-hero">
        <div className="recommend-copy">
          <Badge>Personal Recommendation</Badge>

          <h1>
            분석 결과에 맞는
            <br />
            성분과 제품을 추천합니다
          </h1>

          <p>
            색소침착과 주름 분석 결과를 바탕으로 관리에 참고할 수 있는 기능성 성분,
            화장품 제품, 관리 방향을 정리했습니다.
          </p>

          <div className="recommend-action-row">
            <Button to="/diet-guide" size="lg">
              식습관 가이드 보기 <Leaf size={18} />
            </Button>
            <Button to="/analysis/result" variant="secondary" size="lg">
              분석 결과 다시 보기
            </Button>
          </div>
        </div>

        <Card className="recommend-summary-card">
          <div className="recommend-summary-header">
            <div className="summary-icon">
              <Sparkles size={28} />
            </div>
            <div>
              <span className="recommend-card-label">Recommendation Summary</span>
              <h2>오늘의 추천 요약</h2>
            </div>
          </div>

          <div className="recommend-summary-list">
            <div>
              <span>중점 관리 지표</span>
              <strong>색소침착</strong>
            </div>
            <div>
              <span>추천 성분</span>
              <strong>3개</strong>
            </div>
            <div>
              <span>추천 제품</span>
              <strong>3개</strong>
            </div>
          </div>

          <div className="recommend-summary-notice">
            <ShieldCheck size={18} />
            <span>추천 결과는 피부 분석 기반 참고 정보입니다.</span>
          </div>
        </Card>
      </section>

      <section className="recommend-section">
        <SectionTitle
          eyebrow="Functional Ingredients"
          title="기능성 성분 추천"
          description="분석 결과를 기준으로 색소침착과 피부 관리에 참고할 수 있는 성분을 추천합니다."
        />

        <div className="ingredient-grid">
          {ingredientRecommendations.map((item) => (
            <Card className="ingredient-card" key={item.name}>
              <div className="ingredient-card-top">
                <div className="ingredient-icon">
                  <Beaker size={24} />
                </div>
                <Badge variant={item.tag === "색소침착" ? "accent" : "primary"}>
                  {item.tag}
                </Badge>
              </div>

              <h3>{item.name}</h3>
              <span className="ingredient-type">{item.type}</span>

              <div className="match-row">
                <div>
                  <span>매칭 점수</span>
                  <strong>{item.match}%</strong>
                </div>
                <div className="match-bar">
                  <span style={{ width: `${item.match}%` }} />
                </div>
              </div>

              <p>{item.reason}</p>

              <div className="ingredient-footer">
                <CheckCircle2 size={18} />
                <span>분석 결과 기반 추천</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="recommend-section">
        <SectionTitle
          eyebrow="Cosmetic Products"
          title="화장품 제품 추천"
          description="추천 성분과 피부 분석 결과를 바탕으로 참고할 수 있는 제품 정보를 제공합니다."
        />

        <div className="product-grid">
          {productRecommendations.map((item) => (
            <Card className="product-card" key={item.name}>
              <div className="product-image-box">
                <ShoppingBag size={44} />
                <Badge variant="dark">{item.type}</Badge>
              </div>

              <div className="product-content">
                <span className="product-brand">{item.brand}</span>
                <h3>{item.name}</h3>

                <p>{item.reason}</p>

                <div className="product-meta">
                  <div>
                    <span>가격</span>
                    <strong>{item.price}</strong>
                  </div>
                  <div>
                    <span>매칭</span>
                    <strong>{item.match}%</strong>
                  </div>
                </div>

                <div className="product-actions">
                  <Button variant="secondary" size="sm">
                    상세 보기 <ExternalLink size={15} />
                  </Button>
                  <Button size="sm">
                    추천 이유 <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="recommend-bottom-grid">
        <Card className="recommend-reason-card">
          <div className="recommend-card-title-row">
            <div>
              <span className="recommend-card-label">Why Recommended</span>
              <h2>추천 근거</h2>
            </div>
            <BadgeCheck size={28} />
          </div>

          <div className="reason-list">
            <div className="reason-item">
              <div className="reason-icon">
                <HeartPulse size={20} />
              </div>
              <div>
                <strong>피부 분석 결과 반영</strong>
                <span>색소침착 지표가 주의 단계로 분석되어 관련 관리 성분을 우선 추천했습니다.</span>
              </div>
            </div>

            <div className="reason-item">
              <div className="reason-icon">
                <PackageCheck size={20} />
              </div>
              <div>
                <strong>성분과 제품 연결</strong>
                <span>추천 성분과 제품 유형을 연결하여 사용자가 다음 행동을 쉽게 선택할 수 있도록 구성했습니다.</span>
              </div>
            </div>

            <div className="reason-item">
              <div className="reason-icon">
                <Star size={20} />
              </div>
              <div>
                <strong>관리 루틴 우선순위 제공</strong>
                <span>자외선 차단, 브라이트닝, 수분 장벽 관리를 우선 관리 방향으로 제안합니다.</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="recommend-care-card">
          <div className="recommend-card-title-row">
            <div>
              <span className="recommend-card-label">Care Tips</span>
              <h2>추천 활용 가이드</h2>
            </div>
            <Leaf size={28} />
          </div>

          <div className="care-tip-list">
            {careTips.map((tip) => (
              <div className="care-tip-item" key={tip}>
                <CheckCircle2 size={20} />
                <span>{tip}</span>
              </div>
            ))}
          </div>

          <div className="recommend-next-actions">
            <Button to="/diet-guide" full>
              식습관 가이드 보기 <Leaf size={18} />
            </Button>
            <Button to="/history" variant="secondary" full>
              분석 이력 확인
            </Button>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}

export default RecommendationPage;