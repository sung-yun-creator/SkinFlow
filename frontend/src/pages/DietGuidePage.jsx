import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Flame,
  Leaf,
  LineChart,
  Moon,
  Salad,
  ShieldCheck,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import SectionTitle from "../components/common/SectionTitle";

const dietGuideCards = [
  {
    icon: Droplets,
    title: "수분 섭취",
    category: "Daily Hydration",
    description:
      "피부 컨디션 유지를 위해 하루 동안 충분한 수분 섭취를 의식적으로 관리해보세요.",
    tips: ["물을 한 번에 많이 마시기보다 나누어 마시기", "카페인 섭취 후 물 보충하기"],
  },
  {
    icon: Salad,
    title: "항산화 식품",
    category: "Antioxidant Food",
    description:
      "과일, 채소 등 항산화 성분이 포함된 식품을 식단에 균형 있게 포함해보세요.",
    tips: ["비타민 C가 포함된 과일 참고", "채소 섭취량을 식사마다 조금씩 늘리기"],
  },
  {
    icon: Flame,
    title: "당 섭취 조절",
    category: "Sugar Control",
    description:
      "당류가 많은 간식과 음료는 피부 컨디션에 영향을 줄 수 있으므로 섭취 빈도를 점검해보세요.",
    tips: ["단 음료 대신 물 또는 무가당 차 선택", "야식과 고당 간식 빈도 줄이기"],
  },
];

const routineItems = [
  {
    icon: Sun,
    title: "아침",
    description: "수분 섭취와 자외선 차단 루틴을 먼저 챙겨보세요.",
  },
  {
    icon: Utensils,
    title: "점심",
    description: "채소와 단백질이 포함된 식사를 선택해 균형을 맞춰보세요.",
  },
  {
    icon: Moon,
    title: "저녁",
    description: "늦은 야식과 과한 당 섭취를 줄이고 충분한 휴식을 준비하세요.",
  },
];

const cautionItems = [
  "식습관 가이드는 피부 관리 참고 정보이며 의료적 조언이 아닙니다.",
  "개인의 건강 상태, 알레르기, 복용 약물에 따라 적합한 식단은 달라질 수 있습니다.",
  "특정 식품 제한이나 치료 목적의 식단은 전문가와 상담하는 것이 좋습니다.",
];

function DietGuidePage() {
  return (
    <PageLayout>
      <section className="diet-hero">
        <div className="diet-copy">
          <Badge>Diet Guide</Badge>

          <h1>
            피부 관리를 위한
            <br />
            식습관 가이드
          </h1>

          <p>
            피부 분석 결과를 바탕으로 수분 섭취, 항산화 식품, 당 섭취 조절 등
            일상에서 참고할 수 있는 식습관 관리 방향을 정리했습니다.
          </p>

          <div className="diet-action-row">
            <Button to="/history" size="lg">
              분석 이력 확인하기 <LineChart size={18} />
            </Button>
            <Button to="/recommendations" variant="secondary" size="lg">
              추천 결과 다시 보기
            </Button>
          </div>
        </div>

        <Card className="diet-summary-card">
          <div className="diet-summary-header">
            <div className="diet-summary-icon">
              <Leaf size={28} />
            </div>
            <div>
              <span className="diet-card-label">Lifestyle Summary</span>
              <h2>오늘의 관리 요약</h2>
            </div>
          </div>

          <div className="diet-summary-list">
            <div>
              <span>중점 관리</span>
              <strong>수분 · 항산화 · 당 조절</strong>
            </div>
            <div>
              <span>연결 지표</span>
              <strong>색소침착 · 주름</strong>
            </div>
            <div>
              <span>가이드 유형</span>
              <strong>생활 관리 참고</strong>
            </div>
          </div>

          <div className="diet-summary-notice">
            <ShieldCheck size={18} />
            <span>식습관 가이드는 피부 관리 참고 정보로 제공됩니다.</span>
          </div>
        </Card>
      </section>

      <section className="diet-section">
        <SectionTitle
          eyebrow="Care Guide"
          title="추천 식습관 관리 방향"
          description="피부 분석 결과 이후 사용자가 일상에서 바로 참고할 수 있는 식습관 관리 항목입니다."
        />

        <div className="diet-guide-grid">
          {dietGuideCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card className="diet-guide-card" key={item.title}>
                <div className="diet-guide-top">
                  <div className="diet-guide-icon">
                    <Icon size={26} />
                  </div>
                  <Badge variant="primary">{item.category}</Badge>
                </div>

                <h3>{item.title}</h3>
                <p>{item.description}</p>

                <div className="diet-tip-list">
                  {item.tips.map((tip) => (
                    <div className="diet-tip-item" key={tip}>
                      <CheckCircle2 size={18} />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="diet-routine-section">
        <Card className="diet-routine-card">
          <div className="diet-card-title-row">
            <div>
              <span className="diet-card-label">Daily Routine</span>
              <h2>하루 관리 루틴 예시</h2>
            </div>
            <Sparkles size={28} />
          </div>

          <div className="routine-timeline">
            {routineItems.map((item) => {
              const Icon = item.icon;

              return (
                <div className="routine-item" key={item.title}>
                  <div className="routine-icon">
                    <Icon size={22} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="diet-score-card">
          <div className="diet-card-title-row">
            <div>
              <span className="diet-card-label">SkinFlow Check</span>
              <h2>오늘의 실천 체크</h2>
            </div>
            <CheckCircle2 size={28} />
          </div>

          <div className="diet-check-list">
            <label>
              <input type="checkbox" />
              <span>물 충분히 마시기</span>
            </label>
            <label>
              <input type="checkbox" />
              <span>채소 또는 과일 챙기기</span>
            </label>
            <label>
              <input type="checkbox" />
              <span>단 음료 줄이기</span>
            </label>
            <label>
              <input type="checkbox" />
              <span>늦은 야식 피하기</span>
            </label>
          </div>

          <Button to="/history" full>
            분석 이력으로 이동 <ArrowRight size={18} />
          </Button>
        </Card>
      </section>

      <section className="diet-bottom-grid">
        <Card className="diet-caution-card">
          <div className="diet-card-title-row">
            <div>
              <span className="diet-card-label">Important Notice</span>
              <h2>식습관 가이드 안내</h2>
            </div>
            <AlertCircle size={28} />
          </div>

          <div className="diet-caution-list">
            {cautionItems.map((item) => (
              <div className="diet-caution-item" key={item}>
                <AlertCircle size={20} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="diet-next-card">
          <div className="diet-next-icon">
            <LineChart size={28} />
          </div>

          <h2> 주기적으로 분석하고 피부 변화 흐름을 확인해보세요</h2>
          <p>
            같은 조명과 각도에서 주기적으로 피부 분석을 진행하면 식습관과 관리 루틴의
            변화를 함께 비교할 수 있습니다.
          </p>

          <div className="diet-next-actions">
            <Button to="/analysis/capture" full>
              새 피부 분석 시작하기
            </Button>
            <Button to="/dashboard" variant="secondary" full>
              대시보드로 이동
            </Button>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}

export default DietGuidePage;