import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import { getDietGuideRecommendations } from "../api/recommendationApi";

const sourceLabelMap = {
  latest_analysis: "최근 분석 기반",
  analysis_unsaved: "분석 저장 전 참고",
  default: "기본 참고",
  fallback: "기본 참고",
};

function normalizeSourceValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getSourceLabel(source) {
  return sourceLabelMap[source] ?? "식습관 참고 가이드";
}

function getGuideSourceState(source, summary) {
  const primarySource = normalizeSourceValue(source);
  const guideSource = normalizeSourceValue(summary?.guideSource ?? summary?.guide_source);
  const isSavedFalse = summary?.saved === false;
  const referenceSources = ["default", "fallback", "reference", "static", "seed", "unknown", ""];
  const isLatestAnalysis = primarySource === "latest_analysis" && !isSavedFalse;
  const isUnsavedAnalysis = primarySource === "latest_analysis" && isSavedFalse;
  const isReference =
    isUnsavedAnalysis ||
    (!isLatestAnalysis && (referenceSources.includes(primarySource) || referenceSources.includes(guideSource)));
  const labelSource = isLatestAnalysis
    ? "latest_analysis"
    : isUnsavedAnalysis
      ? "analysis_unsaved"
      : isReference
        ? "default"
        : guideSource || primarySource;

  return {
    label: getSourceLabel(labelSource),
    isReference,
    notice: isLatestAnalysis
      ? "최근 분석 결과와 연결된 식습관 참고 가이드입니다."
      : isUnsavedAnalysis
        ? "분석 결과 저장 전이므로 참고 정보로 표시합니다."
      : isReference
        ? "현재 가이드는 기본 참고 정보입니다. 최신 분석 후 관리 방향과 함께 확인해 주세요."
        : "식습관 가이드는 의료적 판단이 아닌 관리 방향 확인용 참고 정보입니다.",
  };
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function DietGuidePage() {
  const [dietGuide, setDietGuide] = useState({
    source: "unknown",
    summary: {},
    guides: [],
    routines: [],
    checks: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDietGuides() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getDietGuideRecommendations();

        if (isMounted) {
          setDietGuide(data);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("식습관 가이드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
          setDietGuide({
            source: "unknown",
            summary: {},
            guides: [],
            routines: [],
            checks: [],
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDietGuides();

    return () => {
      isMounted = false;
    };
  }, []);

  const { source, summary, guides, routines, checks } = dietGuide;
  const guideSourceState = getGuideSourceState(source, summary);
  const sourceLabel = guideSourceState.label;
  const isEmpty = !isLoading && !errorMessage && guides.length === 0 && routines.length === 0 && checks.length === 0;
  const guideCount = summary?.guideCount ?? guides.length;

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
          letter-spacing: 0;
        }

        .sf-gradient-text {
          display: inline-block;
          background: linear-gradient(90deg, #167d7f 0%, #14b8a6 52%, #22c5c8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
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
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
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
          letter-spacing: 0;
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
          letter-spacing: 0;
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

        .sf-state-message {
          padding: 28px 18px;
          border-radius: 22px;
          color: #64748b;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
          font-size: 14px;
          line-height: 1.6;
          text-align: center;
          word-break: keep-all;
        }

        .sf-state-message.is-error {
          color: #be123c;
          background: rgba(244, 63, 94, 0.06);
          border-color: rgba(244, 63, 94, 0.16);
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
          letter-spacing: 0;
        }

        .sf-guide-card p,
        .sf-guide-reason {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.56;
          word-break: keep-all;
        }

        .sf-guide-reason {
          margin-top: 10px;
          color: #475569;
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
          letter-spacing: 0;
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

        .sf-diet-bottom {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          align-items: stretch;
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

          .sf-diet-actions {
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
                피부 분석 흐름과 연결된
                <br />
                <span className="sf-gradient-text">식습관 가이드</span>
              </h1>

              <p>
                피부 상태 참고 정보와 함께 확인할 수 있는 식습관 관리 방향입니다.
                서버에서 전달된 가이드만 표시합니다.
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
                <span className="sf-diet-label">가이드 출처</span>
                <h2>{sourceLabel}</h2>
              </div>
            </div>

            <div className="sf-diet-score-box">
              <div className="sf-diet-score-head">
                <div>
                  <span className="sf-diet-label">표시 가능한 가이드</span>
                  <strong>{guideCount}개</strong>
                </div>
                <span className="sf-diet-chip">{sourceLabel}</span>
              </div>
            </div>

            <div className="sf-diet-notice">
              <ShieldCheck size={17} />
              <span>{guideSourceState.notice}</span>
            </div>
          </div>
        </section>

        {isLoading && <div className="sf-state-message">식습관 가이드를 불러오는 중입니다.</div>}

        {!isLoading && errorMessage && <div className="sf-state-message is-error">{errorMessage}</div>}

        {isEmpty && <div className="sf-state-message">아직 표시할 식습관 가이드가 없습니다.</div>}

        {!isLoading && !errorMessage && !isEmpty && (
          <>
            <section className="sf-diet-main-grid">
              {guides.length > 0 && (
                <div className="sf-diet-card sf-diet-section-card">
                  <div className="sf-diet-section-title">
                    <div>
                      <span className="sf-diet-label">Care Guide</span>
                      <h2>식습관 참고 가이드</h2>
                    </div>
                    <span className="sf-diet-chip">{sourceLabel}</span>
                  </div>

                  <div className="sf-guide-grid">
                    {guides.map((item, index) => (
                      <article className="sf-guide-card" key={item.id ?? `guide-${index}`}>
                        <div className="sf-guide-card-top">
                          <span className="sf-icon-tile" aria-hidden="true">
                            <Leaf size={21} />
                          </span>
                          {hasText(item.tag) && <span className="sf-guide-tag">{item.tag}</span>}
                        </div>

                        {hasText(item.title) && <h3>{item.title}</h3>}
                        {hasText(item.description) && <p>{item.description}</p>}
                        {hasText(item.reason) && <p className="sf-guide-reason">{item.reason}</p>}

                        {hasText(item.priority) && (
                          <footer>
                            <span className="sf-guide-tag">{item.priority}</span>
                          </footer>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {routines.length > 0 && (
                <div className="sf-diet-card sf-diet-side-card">
                  <div className="sf-diet-side-title">
                    <div>
                      <span className="sf-diet-label">Daily Routine</span>
                      <h2>식습관 루틴</h2>
                    </div>
                    <Sparkles size={24} color="#167d7f" />
                  </div>

                  <div className="sf-side-stack">
                    {routines.map((item, index) => (
                      <div className="sf-routine-item" key={`${item.time}-${index}`}>
                        <span className="sf-icon-tile" aria-hidden="true">
                          <Utensils size={18} />
                        </span>
                        <div>
                          {hasText(item.time) && <strong>{item.time}</strong>}
                          {hasText(item.text) && <span>{item.text}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {checks.length > 0 && (
              <section className="sf-diet-bottom">
                <div className="sf-diet-card sf-diet-section-card">
                  <div className="sf-diet-section-title">
                    <div>
                      <span className="sf-diet-label">Reference List</span>
                      <h2>식습관 체크 항목</h2>
                    </div>
                    <span className="sf-diet-chip">참고 정보</span>
                  </div>

                  <div className="sf-side-stack">
                    {checks.map((item, index) => (
                      <div className="sf-check-item" key={`${item.title}-${index}`}>
                        <span className="sf-icon-tile" aria-hidden="true">
                          <CheckCircle2 size={18} />
                        </span>
                        <div>
                          {hasText(item.title) && <strong>{item.title}</strong>}
                        </div>
                        {hasText(item.category) && <span className="sf-check-state">{item.category}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default DietGuidePage;
