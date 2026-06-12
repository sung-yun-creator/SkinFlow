import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Leaf,
  LineChart,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";

const guideItems = [
  {
    icon: Droplets,
    title: "수분 섭취",
    description: "피부 컨디션 유지를 위해 하루 동안 물을 나누어 마시는 습관을 확인합니다.",
    tag: "기본 관리",
    percent: 80,
  },
  {
    icon: Leaf,
    title: "항산화 식품",
    description: "채소, 과일 등 항산화 식품을 식단에 균형 있게 포함하는 방향을 참고합니다.",
    tag: "피부톤 관리",
    percent: 90,
  },
  {
    icon: Utensils,
    title: "당 섭취 조절",
    description: "단 음료와 고당 간식 빈도를 줄이고 피부 관리 루틴과 함께 점검합니다.",
    tag: "생활 루틴",
    percent: 45,
  },
];

const routineItems = [
  {
    icon: Sun,
    time: "아침",
    text: "수분 섭취와 자외선 차단을 먼저 챙겨보세요.",
  },
  {
    icon: Utensils,
    time: "점심",
    text: "채소와 단백질이 포함된 식사를 선택해보세요.",
  },
  {
    icon: Moon,
    time: "저녁",
    text: "야식과 과한 당 섭취를 줄이고 휴식을 준비하세요.",
  },
];

const checkItems = [
  {
    title: "물 충분히 마시기",
    percent: 80,
    done: true,
  },
  {
    title: "채소 또는 과일 챙기기",
    percent: 90,
    done: true,
  },
  {
    title: "단 음료 줄이기",
    percent: 45,
    done: false,
  },
  {
    title: "늦은 야식 피하기",
    percent: 30,
    done: false,
  },
];

function DietGuidePage() {
  return (
    <PageLayout>
      <style>{`
        .sf-diet-page {
          display: grid;
          gap: 18px;
        }

        .sf-diet-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.78fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-diet-card {
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(203, 213, 225, 0.74);
          background:
            radial-gradient(circle at 0% 0%, rgba(22, 125, 127, 0.055), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 250, 252, 0.92));
          box-shadow: 0 22px 52px rgba(15, 23, 42, 0.07);
        }

        .sf-diet-copy {
          min-height: 276px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .sf-diet-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          padding: 8px 12px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
        }

        .sf-diet-copy h1 {
          margin: 18px 0 14px;
          color: #0f172a;
          font-size: clamp(34px, 4.2vw, 52px);
          line-height: 1.04;
          letter-spacing: -0.072em;
        }

        .sf-diet-copy p {
          max-width: 650px;
          margin: 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.72;
          word-break: keep-all;
        }

        .sf-diet-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .sf-diet-summary {
          min-height: 276px;
          padding: 26px;
          display: grid;
          align-content: space-between;
          gap: 18px;
        }

        .sf-diet-summary-top {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .sf-icon-tile {
          width: 48px;
          height: 48px;
          min-width: 48px;
          min-height: 48px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          line-height: 0;
          color: #167d7f;
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #fff1f4 100%);
          border: 1px solid rgba(226, 232, 240, 0.88);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
        }

        .sf-icon-tile svg {
          display: block;
          width: 21px !important;
          height: 21px !important;
          margin: 0;
          flex: 0 0 auto;
          transform: none;
          stroke-width: 2.1;
        }

        .sf-diet-label {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
        }

        .sf-diet-summary h2,
        .sf-diet-section-title h2,
        .sf-diet-side-title h2 {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 23px;
          line-height: 1.15;
          letter-spacing: -0.05em;
        }

        .sf-diet-score-box {
          padding: 18px;
          border-radius: 22px;
          background: rgba(248, 250, 252, 0.94);
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .sf-diet-score-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .sf-diet-score-head strong {
          display: block;
          color: #0f172a;
          font-size: 27px;
          letter-spacing: -0.06em;
        }

        .sf-diet-score-head span {
          color: #167d7f;
          font-size: 27px;
          font-weight: 950;
          letter-spacing: -0.045em;
        }

        .sf-main-progress,
        .sf-mini-progress {
          overflow: hidden;
          border-radius: 999px;
          background: #e2e8f0;
        }

        .sf-main-progress {
          height: 7px;
        }

        .sf-main-progress span,
        .sf-mini-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #167d7f, #22c5c8, #f43f5e);
        }

        .sf-diet-notice {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
          word-break: keep-all;
        }

        .sf-diet-notice svg {
          flex: 0 0 auto;
          color: #167d7f;
          margin-top: 1px;
        }

        .sf-diet-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(340px, 0.85fr);
          gap: 18px;
          align-items: start;
        }

        .sf-diet-section-card,
        .sf-diet-side-card {
          padding: 24px;
        }

        .sf-diet-section-title,
        .sf-diet-side-title {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .sf-diet-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 54px;
          padding: 8px 11px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
        }

        .sf-guide-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .sf-guide-card {
          min-height: 184px;
          padding: 17px;
          border-radius: 22px;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.06), transparent 34%),
            #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .sf-guide-card:hover {
          transform: translateY(-2px);
          border-color: rgba(22, 125, 127, 0.2);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
        }

        .sf-guide-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .sf-guide-card h3 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 17px;
          letter-spacing: -0.045em;
        }

        .sf-guide-card p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.56;
          word-break: keep-all;
        }

        .sf-guide-card footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 14px;
        }

        .sf-guide-tag {
          padding: 6px 9px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-mini-progress {
          width: 72px;
          height: 5px;
        }

        .sf-side-stack {
          display: grid;
          gap: 12px;
        }

        .sf-routine-item,
        .sf-check-item {
          display: grid;
          grid-template-columns: 44px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 13px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .sf-routine-item .sf-icon-tile,
        .sf-check-item .sf-icon-tile {
          width: 42px;
          height: 42px;
          min-width: 42px;
          min-height: 42px;
          margin: 0;
          border-radius: 15px;
          display: grid;
          place-items: center;
          line-height: 0;
          align-self: center;
        }

        .sf-routine-item .sf-icon-tile svg,
        .sf-check-item .sf-icon-tile svg {
          display: block;
          width: 18px !important;
          height: 18px !important;
          min-width: 18px;
          min-height: 18px;
          margin: 0;
          transform: none;
        }

        .sf-routine-item strong,
        .sf-check-item strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
          letter-spacing: -0.035em;
        }

        .sf-routine-item > div > span,
        .sf-check-item > div > span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          word-break: keep-all;
        }

        .sf-check-state {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          align-self: center;
          min-width: 42px;
          padding: 6px 9px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-check-state.is-muted {
          color: #64748b;
          background: rgba(100, 116, 139, 0.1);
        }

        .sf-diet-bottom {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.78fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-notice-list {
          display: grid;
          gap: 10px;
        }

        .sf-notice-item {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 12px;
          align-items: center;
          padding: 13px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .sf-notice-item span:not(.sf-icon-tile) {
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          word-break: keep-all;
        }

        .sf-next-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
        }

        .sf-next-card p {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.62;
          word-break: keep-all;
        }

        .sf-next-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 1080px) {
          .sf-diet-hero,
          .sf-diet-main-grid,
          .sf-diet-bottom {
            grid-template-columns: 1fr;
          }

          .sf-guide-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .sf-diet-page {
            gap: 14px;
          }

          .sf-diet-copy,
          .sf-diet-summary,
          .sf-diet-section-card,
          .sf-diet-side-card {
            padding: 20px;
          }

          .sf-diet-copy h1 {
            font-size: 36px;
          }

          .sf-diet-actions,
          .sf-next-actions {
            grid-template-columns: 1fr;
            display: grid;
          }

          .sf-diet-summary-top,
          .sf-diet-section-title,
          .sf-diet-side-title {
            align-items: flex-start;
          }

          .sf-routine-item,
          .sf-check-item {
            grid-template-columns: 42px 1fr;
          }

          .sf-check-state {
            grid-column: 2;
            width: fit-content;
          }
        }
      `}</style>

      <div className="sf-diet-page">
        <section className="sf-diet-hero">
          <div className="sf-diet-card sf-diet-copy">
            <div>
              <span className="sf-diet-kicker">
                <Leaf size={15} /> Diet Guide
              </span>

              <h1>
                오늘 실천할
                <br />
                식습관 가이드
              </h1>

              <p>
                피부 분석 결과 이후 바로 참고할 수 있도록 수분 섭취, 항산화 식품,
                당 섭취 조절 중심의 관리 방향을 짧게 정리했습니다.
              </p>
            </div>

            <div className="sf-diet-actions">
              <Button to="/recommendations" size="lg">
                추천 결과 보기 <ArrowRight size={18} />
              </Button>
              <Button to="/history" variant="secondary" size="lg">
                분석 이력 확인
              </Button>
            </div>
          </div>

          <div className="sf-diet-card sf-diet-summary">
            <div className="sf-diet-summary-top">
              <span className="sf-icon-tile" aria-hidden="true">
                <CheckCircle2 size={21} />
              </span>
              <div>
                <span className="sf-diet-label">오늘의 실천 현황</span>
                <h2>2 / 4 완료</h2>
              </div>
            </div>

            <div className="sf-diet-score-box">
              <div className="sf-diet-score-head">
                <div>
                  <span className="sf-diet-label">관리 달성률</span>
                  <strong>50%</strong>
                </div>
                <span>50%</span>
              </div>
              <div className="sf-main-progress" aria-label="관리 달성률 50%">
                <span style={{ width: "50%" }} />
              </div>
            </div>

            <div className="sf-diet-notice">
              <ShieldCheck size={17} />
              <span>
                식습관 가이드는 의료적 판단이 아닌 피부 관리 참고 정보입니다.
              </span>
            </div>
          </div>
        </section>

        <section className="sf-diet-main-grid">
          <div className="sf-diet-card sf-diet-section-card">
            <div className="sf-diet-section-title">
              <div>
                <span className="sf-diet-label">Care Guide</span>
                <h2>추천 식습관 관리 방향</h2>
              </div>
              <span className="sf-diet-chip">핵심 3개</span>
            </div>

            <div className="sf-guide-grid">
              {guideItems.map((item) => {
                const Icon = item.icon;

                return (
                  <article className="sf-guide-card" key={item.title}>
                    <div className="sf-guide-card-top">
                      <span className="sf-icon-tile" aria-hidden="true">
                        <Icon size={21} />
                      </span>
                      <span className="sf-guide-tag">{item.tag}</span>
                    </div>

                    <h3>{item.title}</h3>
                    <p>{item.description}</p>

                    <footer>
                      <div className="sf-mini-progress" aria-label={`${item.title} 참고도 ${item.percent}%`}>
                        <span style={{ width: `${item.percent}%` }} />
                      </div>
                      <span className="sf-guide-tag">{item.percent}%</span>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="sf-diet-card sf-diet-side-card">
            <div className="sf-diet-side-title">
              <div>
                <span className="sf-diet-label">Daily Routine</span>
                <h2>하루 관리 루틴</h2>
              </div>
              <Sparkles size={24} color="#167d7f" />
            </div>

            <div className="sf-side-stack">
              {routineItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div className="sf-routine-item" key={item.time}>
                    <span className="sf-icon-tile" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{item.time}</strong>
                      <span>{item.text}</span>
                    </div>
                    <span className="sf-check-state">권장</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="sf-diet-bottom">
          <div className="sf-diet-card sf-diet-section-card">
            <div className="sf-diet-section-title">
              <div>
                <span className="sf-diet-label">SkinFlow Check</span>
                <h2>오늘의 체크리스트</h2>
              </div>
              <span className="sf-diet-chip">짧은 실천</span>
            </div>

            <div className="sf-side-stack">
              {checkItems.map((item) => (
                <div className="sf-check-item" key={item.title}>
                  <span className="sf-icon-tile" aria-hidden="true">
                    <CheckCircle2 size={18} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>오늘 실천 여부를 기준으로 관리 흐름을 점검합니다.</span>
                  </div>
                  <span className={`sf-check-state ${item.done ? "" : "is-muted"}`}>
                    {item.done ? "완료" : "예정"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="sf-diet-card sf-diet-side-card sf-next-card">
            <div>
              <div className="sf-diet-side-title">
                <div>
                  <span className="sf-diet-label">Next Action</span>
                  <h2>다음 단계로 이어가기</h2>
                </div>
                <LineChart size={24} color="#167d7f" />
              </div>

              <p>
                같은 조명과 각도에서 주기적으로 분석하면 식습관과 관리 루틴의
                변화를 함께 비교할 수 있습니다.
              </p>
            </div>

            <div className="sf-notice-list">
              <div className="sf-notice-item">
                <span className="sf-icon-tile" aria-hidden="true">
                  <ClipboardList size={18} />
                </span>
                <span>분석 결과와 식습관 가이드는 피부 관리 참고 정보입니다.</span>
              </div>
            </div>

            <div className="sf-next-actions">
              <Button to="/analysis/capture" full>
                새 분석 시작
              </Button>
              <Button to="/dashboard" variant="secondary" full>
                대시보드로 이동
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

export default DietGuidePage;
