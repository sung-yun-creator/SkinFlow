import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  History,
  Info,
  Leaf,
  LineChart,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";

const previewMetrics = [
  {
    label: "종합 점수",
    value: 78,
    status: "예시",
    color: "#167D7F",
  },
  {
    label: "색소침착",
    value: 85,
    status: "양호 예시",
    color: "#22C55E",
  },
  {
    label: "주름",
    value: 42,
    status: "주의 예시",
    color: "#F59E0B",
  },
];

const nextCards = [
  {
    icon: Sparkles,
    title: "기능성 성분 추천",
    description: "색소침착·주름 결과를 기준으로 관리에 참고할 성분을 연결합니다.",
    to: "/recommendations",
    badge: "추천",
  },
  {
    icon: Leaf,
    title: "식습관 가이드",
    description: "피부 관리에 참고할 수 있는 오늘의 생활 관리 항목을 확인합니다.",
    to: "/diet-guide",
    badge: "가이드",
  },
  {
    icon: History,
    title: "분석 이력 관리",
    description: "분석 결과 저장 API 연동 후 날짜별 변화 흐름을 확인합니다.",
    to: "/history",
    badge: "이력",
  },
];

const integrationItems = [
  "ROI 확인 이후 색소침착·주름 분석 결과 API 연결 예정",
  "추천·식습관 가이드는 실제 분석 결과 생성 후 연결 예정",
  "현재 점수와 문구는 화면 구성을 확인하기 위한 미리보기 데이터",
];

function AnalysisResultPage() {
  return (
    <PageLayout>
      <style>
        {`
          .sf-result-page {
            display: grid;
            gap: 18px;
          }

          .sf-result-hero {
            display: grid;
            grid-template-columns: minmax(330px, 0.9fr) minmax(0, 1.1fr);
            gap: 18px;
            align-items: stretch;
          }

          .sf-result-face-card,
          .sf-result-summary-card,
          .sf-result-next-card,
          .sf-result-notice-card {
            border: 1px solid rgba(226, 232, 240, 0.92);
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.94);
            box-shadow: 0 20px 52px rgba(15, 23, 42, 0.07);
          }

          .sf-result-face-card {
            padding: 24px;
          }

          .sf-result-section-label {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: -0.02em;
          }

          .sf-result-face-card h1 {
            margin: 8px 0 16px;
            color: #0f172a;
            font-size: clamp(28px, 4vw, 42px);
            line-height: 1.08;
            letter-spacing: -0.07em;
          }

          .sf-result-face-card p,
          .sf-result-summary-card p,
          .sf-result-next-item p,
          .sf-result-notice-card p {
            margin: 0;
            color: #64748b;
            font-size: 14px;
            line-height: 1.75;
            word-break: keep-all;
          }

          .sf-result-face-map {
            position: relative;
            min-height: 310px;
            margin-top: 18px;
            overflow: hidden;
            border-radius: 24px;
            border: 1px solid rgba(226, 232, 240, 0.86);
            background:
              radial-gradient(circle at 82% 84%, rgba(244, 63, 94, 0.13), transparent 28%),
              radial-gradient(circle at 18% 12%, rgba(22, 125, 127, 0.11), transparent 30%),
              linear-gradient(135deg, #f0fdfa 0%, #ffffff 48%, #fff7ed 100%);
          }

          .sf-result-face-oval {
            position: absolute;
            left: 50%;
            top: 52%;
            width: 170px;
            height: 238px;
            transform: translate(-50%, -50%);
            border-radius: 999px;
            background: rgba(22, 125, 127, 0.16);
          }

          .sf-result-roi-box {
            position: absolute;
            display: grid;
            place-items: center;
            border-radius: 16px;
            border: 2px solid #167d7f;
            background: rgba(255, 255, 255, 0.2);
          }

          .sf-result-roi-label {
            position: absolute;
            top: -27px;
            left: 50%;
            transform: translateX(-50%);
            padding: 5px 9px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(255, 255, 255, 0.92);
            box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
            font-size: 11px;
            font-weight: 950;
            white-space: nowrap;
          }

          .sf-result-roi-forehead {
            width: 68px;
            height: 48px;
            left: 27%;
            top: 21%;
          }

          .sf-result-roi-cheek {
            width: 68px;
            height: 44px;
            left: 35%;
            bottom: 17%;
          }

          .sf-result-roi-wrinkle {
            width: 66px;
            height: 44px;
            right: 18%;
            top: 45%;
            border-color: #f59e0b;
          }

          .sf-result-roi-wrinkle .sf-result-roi-label {
            color: #f59e0b;
          }

          .sf-result-summary-card {
            padding: 24px;
            display: grid;
            gap: 16px;
          }

          .sf-result-summary-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
          }

          .sf-result-summary-top h2 {
            margin: 6px 0 0;
            color: #0f172a;
            font-size: 27px;
            line-height: 1.16;
            letter-spacing: -0.055em;
          }

          .sf-result-score-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .sf-result-score-card {
            min-height: 132px;
            padding: 16px;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.88);
            background:
              radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.06), transparent 32%),
              #f8fafc;
          }

          .sf-result-score-ring {
            width: 72px;
            height: 72px;
            margin-bottom: 12px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle, #ffffff 56%, transparent 58%),
              conic-gradient(var(--metric-color) 0 var(--metric-value), #e2e8f0 var(--metric-value) 100%);
          }

          .sf-result-score-ring strong {
            color: #0f172a;
            font-size: 20px;
            line-height: 1;
            letter-spacing: -0.05em;
          }

          .sf-result-score-card span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 900;
          }

          .sf-result-score-card h3 {
            margin: 4px 0 0;
            color: #0f172a;
            font-size: 15px;
            letter-spacing: -0.035em;
          }

          .sf-result-comment {
            display: grid;
            grid-template-columns: 44px 1fr;
            gap: 14px;
            align-items: start;
            padding: 18px;
            border-radius: 22px;
            color: #ffffff;
            background: #0f172a;
          }

          .sf-result-comment strong {
            display: block;
            margin-bottom: 5px;
            color: #5eead4;
            font-size: 13px;
            font-weight: 950;
          }

          .sf-result-comment p {
            color: rgba(255, 255, 255, 0.88);
            font-weight: 700;
          }

          .sf-result-icon-tile {
            width: 44px;
            height: 44px;
            min-width: 44px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            color: #167d7f;
            background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 50%, #fff1f4 100%);
            border: 1px solid rgba(226, 232, 240, 0.88);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
          }

          .sf-result-icon-tile svg {
            display: block;
            width: 20px;
            height: 20px;
            stroke-width: 2.1;
          }

          .sf-result-lower-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
            gap: 18px;
            align-items: start;
          }

          .sf-result-next-card,
          .sf-result-notice-card {
            padding: 22px;
          }

          .sf-result-card-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 16px;
          }

          .sf-result-card-head h2 {
            margin: 6px 0 0;
            color: #0f172a;
            font-size: 22px;
            letter-spacing: -0.05em;
          }

          .sf-result-next-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .sf-result-next-item {
            min-height: 172px;
            padding: 16px;
            border-radius: 22px;
            border: 1px solid rgba(226, 232, 240, 0.88);
            background:
              radial-gradient(circle at 100% 0%, rgba(244, 63, 94, 0.055), transparent 34%),
              #f8fafc;
            transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          }

          .sf-result-next-item:hover {
            transform: translateY(-2px);
            border-color: rgba(22, 125, 127, 0.22);
            box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
          }

          .sf-result-next-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 18px;
          }

          .sf-result-next-badge {
            color: #cbd5e1;
            font-size: 12px;
            font-weight: 950;
          }

          .sf-result-next-item h3 {
            margin: 0 0 8px;
            color: #0f172a;
            font-size: 16px;
            letter-spacing: -0.04em;
          }

          .sf-result-next-item .sf-button {
            margin-top: 14px;
          }

          .sf-result-notice-list {
            display: grid;
            gap: 10px;
            margin-top: 16px;
          }

          .sf-result-notice-item {
            display: grid;
            grid-template-columns: 34px 1fr;
            gap: 10px;
            align-items: center;
            padding: 12px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(226, 232, 240, 0.86);
            color: #334155;
            font-size: 13px;
            font-weight: 750;
            line-height: 1.55;
          }

          .sf-result-notice-item svg {
            color: #167d7f;
          }

          .sf-result-notice-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 16px;
          }

          @media (max-width: 1040px) {
            .sf-result-hero,
            .sf-result-lower-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 760px) {
            .sf-result-page {
              gap: 14px;
            }

            .sf-result-face-card,
            .sf-result-summary-card,
            .sf-result-next-card,
            .sf-result-notice-card {
              border-radius: 24px;
              padding: 18px;
            }

            .sf-result-score-grid,
            .sf-result-next-grid,
            .sf-result-notice-actions {
              grid-template-columns: 1fr;
            }

            .sf-result-face-map {
              min-height: 260px;
            }

            .sf-result-comment {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="sf-result-page">
        <section className="sf-result-hero">
          <div className="sf-result-face-card">
            <Badge>Result Preview</Badge>
            <h1>
              피부 상태를
              <br />한눈에 확인하세요
            </h1>
            <p>
              현재 화면은 ROI 확인 이후 연결될 분석 결과 UI 미리보기입니다.
              실제 색소침착·주름 점수와 설명은 분석 결과 API 연동 후 표시됩니다.
            </p>

            <div className="sf-result-face-map" aria-label="피부 ROI 미리보기">
              <span className="sf-result-face-oval" />
              <span className="sf-result-roi-box sf-result-roi-forehead">
                <span className="sf-result-roi-label">이마 / T존</span>
              </span>
              <span className="sf-result-roi-box sf-result-roi-cheek">
                <span className="sf-result-roi-label">볼 색소</span>
              </span>
              <span className="sf-result-roi-box sf-result-roi-wrinkle">
                <span className="sf-result-roi-label">눈가 주름</span>
              </span>
            </div>
          </div>

          <div className="sf-result-summary-card">
            <div className="sf-result-summary-top">
              <div>
                <span className="sf-result-section-label">분석 결과 UI 미리보기</span>
                <h2>색소침착·주름 중심 결과 화면</h2>
              </div>
              <Badge variant="secondary">API 연동 전</Badge>
            </div>

            <div className="sf-result-score-grid">
              {previewMetrics.map((metric) => (
                <div className="sf-result-score-card" key={metric.label}>
                  <div
                    className="sf-result-score-ring"
                    style={{
                      "--metric-color": metric.color,
                      "--metric-value": `${metric.value}%`,
                    }}
                  >
                    <strong>{metric.value}</strong>
                  </div>
                  <span>{metric.status}</span>
                  <h3>{metric.label}</h3>
                </div>
              ))}
            </div>

            <div className="sf-result-comment">
              <span className="sf-result-icon-tile" aria-hidden="true">
                <Sparkles size={20} />
              </span>
              <div>
                <strong>AI 분석 코멘트 예시</strong>
                <p>
                  전반적인 피부 톤은 양호한 편이며, 눈가 주름 관리에 집중하면
                  다음 분석에서 변화를 확인하기 쉽습니다. 이 문구는 실제 분석값이
                  아닌 화면 확인용 예시입니다.
                </p>
              </div>
            </div>

            <div className="sf-result-notice-item">
              <Info size={18} />
              <span>
                SkinFlow의 분석 결과는 피부 관리 참고 정보이며, 의료적 판단이나
                치료 목적의 정보가 아닙니다.
              </span>
            </div>
          </div>
        </section>

        <section className="sf-result-lower-grid">
          <div className="sf-result-next-card">
            <div className="sf-result-card-head">
              <div>
                <span className="sf-result-section-label">다음 확인 화면</span>
                <h2>분석 이후 이어지는 관리 흐름</h2>
              </div>
              <Badge>짧은 흐름</Badge>
            </div>

            <div className="sf-result-next-grid">
              {nextCards.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article className="sf-result-next-item" key={item.title}>
                    <div className="sf-result-next-head">
                      <span className="sf-result-icon-tile" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                      <span className="sf-result-next-badge">0{index + 1}</span>
                    </div>

                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <Button to={item.to} variant="secondary" size="sm">
                      {item.badge} 보기
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="sf-result-notice-card">
            <div className="sf-result-card-head">
              <div>
                <span className="sf-result-section-label">연동 상태</span>
                <h2>현재는 미리보기 단계입니다</h2>
              </div>
              <ClipboardCheck size={26} />
            </div>

            <p>
              ROI 확인 화면 다음 단계에서 보여줄 결과 화면 구조입니다. 실제 AI 결과와
              DB 저장은 분석 결과 API가 연결된 뒤 반영해야 합니다.
            </p>

            <div className="sf-result-notice-list">
              {integrationItems.map((item) => (
                <div className="sf-result-notice-item" key={item}>
                  <CheckCircle2 size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="sf-result-notice-actions">
              <Button to="/analysis/capture" variant="secondary" full>
                다시 분석 <RotateCcw size={17} />
              </Button>
              <Button to="/dashboard" full>
                대시보드 <ArrowRight size={17} />
              </Button>
            </div>
          </aside>
        </section>
      </div>
    </PageLayout>
  );
}

export default AnalysisResultPage;
