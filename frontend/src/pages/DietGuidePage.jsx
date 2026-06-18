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
  latest_analysis: "최근 분석 결과 기반 가이드",
  analysis_unsaved: "이력 반영 전 참고 가이드",
  default: "기본 식습관 가이드",
  fallback: "식습관 관리 가이드",
  unknown: "식습관 관리 가이드",
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
  const defaultSources = ["default"];
  const safeGuideSources = ["fallback", "reference", "static", "seed", "unknown", ""];
  const isLatestAnalysis = primarySource === "latest_analysis" && !isSavedFalse;
  const isUnsavedAnalysis = primarySource === "latest_analysis" && isSavedFalse;
  const isDefaultGuide =
    !isLatestAnalysis &&
    (defaultSources.includes(primarySource) || defaultSources.includes(guideSource));
  const isSafeGuide =
    isUnsavedAnalysis ||
    (!isLatestAnalysis && (safeGuideSources.includes(primarySource) || safeGuideSources.includes(guideSource)));

  const labelSource = isLatestAnalysis
    ? "latest_analysis"
    : isUnsavedAnalysis
      ? "analysis_unsaved"
      : isDefaultGuide
        ? "default"
        : isSafeGuide
          ? "unknown"
          : guideSource || primarySource;

  return {
    label: getSourceLabel(labelSource),
    isLatestAnalysis,
    isDefaultGuide,
    isReference: isDefaultGuide || isSafeGuide,
    notice: isLatestAnalysis
      ? "최근 피부 분석 결과와 연결된 식습관 관리 방향입니다."
      : isUnsavedAnalysis
        ? "분석 결과가 아직 이력에 반영되기 전이므로 참고 정보로 표시합니다."
        : isDefaultGuide
          ? "현재 가이드는 기본 식습관 관리 참고 정보입니다. 피부 분석 후 더 구체적인 관리 방향을 확인할 수 있습니다."
          : "피부 관리 방향을 확인하기 위한 식습관 참고 정보입니다.",
  };
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function getFirstText(...values) {
  return values.find((value) => hasText(value))?.trim() ?? "";
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function createActionItems(checks) {
  return checks.map((item, index) => ({
    id: item.id ?? `check-${index}`,
    title: getFirstText(item.title, item.name),
    description: getFirstText(item.description, item.content, item.reason),
    category: getFirstText(item.category, item.tag, item.priority),
    sourceType: "check",
  }));
}

function getActionItemId(item, index) {
  return String(item.id ?? `${item.sourceType || "action"}-${index}`);
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
  const [checkedActionIds, setCheckedActionIds] = useState([]);

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

  const { source, summary } = dietGuide;
  const guides = toSafeArray(dietGuide.guides);
  const routines = toSafeArray(dietGuide.routines);
  const checks = toSafeArray(dietGuide.checks);

  const guideSourceState = getGuideSourceState(source, summary);
  const sourceLabel = guideSourceState.label;
  const isLatestGuide = guideSourceState.isLatestAnalysis;
  const heroTitle = isLatestGuide ? "분석 결과 기반" : "기본 관리 참고";
  const heroDescription = isLatestGuide
    ? "최근 피부 분석 흐름을 바탕으로 식습관 항목을 추천합니다. 색소침착과 주름 관리 방향을 함께 고려해 오늘 실천할 수 있는 항목을 확인해 보세요."
    : "첫 분석 전에도 참고할 수 있는 기본 피부 관리 가이드입니다. 색소침착과 주름 관리 방향을 함께 고려해 오늘 실천할 수 있는 항목을 확인해 보세요.";
  const checklistTitle = isLatestGuide ? "분석 결과 기반 추천 체크리스트" : "기본 피부 관리 체크리스트";
  const checklistDescription = isLatestGuide
    ? "피부 분석 결과와 연결된 식습관 관리 포인트입니다. 오늘 확인하고 실천할 항목을 한눈에 볼 수 있도록 정리했습니다."
    : "첫 분석 전 참고할 수 있는 식습관 관리 포인트입니다. 오늘 확인하고 실천할 항목을 한눈에 볼 수 있도록 정리했습니다.";
  const actionItems = createActionItems(checks).filter((item) => hasText(item.title));
  const visibleActionItems = actionItems.slice(0, 5);
  const visibleActionIds = visibleActionItems.map((item, index) => getActionItemId(item, index));
  const checkedVisibleCount = visibleActionIds.filter((id) => checkedActionIds.includes(id)).length;
  const guideCount = summary?.guideCount ?? guides.length;
  const totalScore = summary?.totalScore ?? summary?.total_skin_score;
  const hasTotalScore = totalScore !== null && totalScore !== undefined && totalScore !== "";
  const primaryAction = isLatestGuide
    ? { to: "/recommendations", label: "추천 화면으로 이동" }
    : { to: "/analysis/capture", label: "피부 분석 시작하기" };
  const secondaryAction = isLatestGuide
    ? { to: "/history", label: "분석 이력 보기" }
    : { to: "/recommendations", label: "추천 확인" };

  const handleCheckToggle = (itemId) => {
    setCheckedActionIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((currentId) => currentId !== itemId)
        : [...currentIds, itemId]
    );
  };

  return (
    <PageLayout>
      <style>{`
        .sf-diet-page {
          display: grid;
          gap: 18px;
        }

        .sf-diet-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(340px, 0.78fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-diet-card {
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(203, 213, 225, 0.74);
          background:
            radial-gradient(circle at 0% 0%, rgba(22, 125, 127, 0.06), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
          box-shadow: 0 22px 52px rgba(15, 23, 42, 0.07);
        }

        .sf-diet-copy {
          min-height: 260px;
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
          max-width: 680px;
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
          min-height: 260px;
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

        .sf-diet-source-box {
          padding: 18px;
          border-radius: 22px;
          background: rgba(248, 250, 252, 0.94);
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .sf-diet-source-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .sf-diet-source-item {
          padding: 13px 14px;
          border-radius: 17px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .sf-diet-source-item strong {
          display: block;
          margin-top: 6px;
          color: #0f172a;
          font-size: 22px;
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
          color: #0f766e;
          background: rgba(22, 125, 127, 0.07);
          border-color: rgba(22, 125, 127, 0.18);
        }

        .sf-diet-empty-card {
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 10px;
          min-height: 180px;
          padding: 22px;
          border-radius: 20px;
          border: 1px dashed rgba(22, 125, 127, 0.22);
          background: #f8fafc;
          text-align: center;
        }

        .sf-diet-empty-card strong {
          color: #0f172a;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.35;
        }

        .sf-diet-empty-card p {
          max-width: 360px;
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          word-break: keep-all;
        }

        .sf-check-focus-card {
          position: relative;
          padding: 30px;
          background:
            radial-gradient(circle at 0% 0%, rgba(20, 184, 166, 0.11), transparent 32%),
            radial-gradient(circle at 100% 18%, rgba(22, 125, 127, 0.055), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 250, 252, 0.95));
        }

        .sf-check-focus-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
        }

        .sf-check-title-wrap {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .sf-check-title-wrap .sf-icon-tile {
          width: 50px;
          height: 50px;
          min-width: 50px;
          min-height: 50px;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f 0%, #14b8a6 100%);
          border-color: rgba(22, 125, 127, 0.14);
        }

        .sf-check-focus-head h2 {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: clamp(24px, 2.7vw, 34px);
          line-height: 1.18;
          letter-spacing: 0;
        }

        .sf-check-subtitle {
          max-width: 760px;
          margin: 11px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.7;
          word-break: keep-all;
        }

        .sf-check-count {
          display: grid;
          justify-items: end;
          gap: 8px;
          flex: 0 0 auto;
        }

        .sf-check-count strong {
          color: #167d7f;
          font-size: 34px;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        .sf-check-save-note {
          max-width: 230px;
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.55;
          text-align: right;
          word-break: keep-all;
        }

        .sf-diet-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 54px;
          padding: 7px 10px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.075);
          border: 1px solid rgba(22, 125, 127, 0.1);
          font-size: 11px;
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
        }

        .sf-check-list {
          display: grid;
          gap: 14px;
        }

        .sf-check-item {
          width: 100%;
          border: 0;
          font: inherit;
          text-align: left;
          cursor: pointer;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          min-height: 88px;
          padding: 18px 20px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(203, 213, 225, 0.78);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.045);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .sf-check-item:hover,
        .sf-check-item:focus-visible {
          transform: translateY(-2px);
          border-color: rgba(22, 125, 127, 0.22);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.075);
        }

        .sf-check-item:focus-visible {
          outline: 3px solid rgba(22, 125, 127, 0.22);
          outline-offset: 2px;
        }

        .sf-check-item .sf-icon-tile {
          width: 42px;
          height: 42px;
          min-width: 42px;
          min-height: 42px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          box-shadow: none;
        }

        .sf-check-item.is-checked {
          background:
            linear-gradient(135deg, rgba(22, 125, 127, 0.11), rgba(255, 255, 255, 0.94) 62%),
            #f0fdfa;
          border-color: rgba(22, 125, 127, 0.34);
          box-shadow: 0 18px 38px rgba(22, 125, 127, 0.095);
        }

        .sf-check-item.is-checked .sf-icon-tile {
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f 0%, #14b8a6 100%);
        }

        .sf-check-copy {
          min-width: 0;
        }

        .sf-check-item strong {
          display: block;
          color: #0f172a;
          font-size: 15.5px;
          line-height: 1.38;
          letter-spacing: 0;
        }

        .sf-check-item.is-checked strong {
          color: #0f766e;
        }

        .sf-check-copy span {
          display: block;
          margin-top: 7px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
          word-break: keep-all;
        }

        .sf-check-item.is-checked .sf-check-copy span {
          color: #475569;
        }

        .sf-check-state {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 66px;
          padding: 8px 11px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-check-item.is-checked .sf-check-state {
          color: #ffffff;
          background: #167d7f;
        }

        .sf-diet-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.12fr) minmax(340px, 0.88fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-diet-section-card,
        .sf-diet-side-card {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 22px;
        }

        .sf-diet-section-title,
        .sf-diet-side-title {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .sf-guide-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .sf-guide-card {
          min-height: 144px;
          padding: 17px;
          border-radius: 18px;
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
          margin-bottom: 13px;
        }

        .sf-guide-card h3 {
          margin: 0 0 9px;
          color: #0f172a;
          font-size: 15px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .sf-guide-card p,
        .sf-guide-reason {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.65;
          word-break: keep-all;
        }

        .sf-guide-reason {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(226, 232, 240, 0.82);
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
          display: inline-flex;
          align-items: center;
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
          flex: 1;
          gap: 14px;
          align-content: stretch;
        }

        .sf-diet-side-card {
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.035), transparent 30%),
            rgba(255, 255, 255, 0.96);
        }

        .sf-side-title-icon {
          width: 38px;
          height: 38px;
          min-width: 38px;
          min-height: 38px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          overflow: hidden;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
          border: 1px solid rgba(22, 125, 127, 0.1);
        }

        .sf-side-title-icon svg {
          display: block;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
        }

        .sf-routine-item {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          min-height: 78px;
          padding: 15px 16px;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.86);
          border: 1px solid rgba(226, 232, 240, 0.88);
        }

        .sf-routine-item .sf-icon-tile {
          width: 46px;
          height: 46px;
          min-width: 46px;
          min-height: 46px;
          margin: 0;
          border-radius: 16px;
          display: grid;
          place-items: center;
          line-height: 0;
          align-self: center;
        }

        .sf-routine-item .sf-icon-tile svg {
          display: block;
          width: 18px !important;
          height: 18px !important;
          min-width: 18px;
          min-height: 18px;
          margin: 0;
          transform: none;
        }

        .sf-routine-item strong {
          display: block;
          color: #0f172a;
          font-size: 14.5px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .sf-routine-item > div > span {
          display: block;
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
          word-break: keep-all;
        }

        @media (max-width: 1080px) {
          .sf-diet-hero,
          .sf-diet-main-grid {
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
          .sf-diet-side-card,
          .sf-check-focus-card {
            padding: 20px;
          }

          .sf-diet-copy h1 {
            font-size: 35px;
          }

          .sf-diet-actions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .sf-diet-source-grid {
            grid-template-columns: 1fr;
          }

          .sf-check-focus-head {
            display: grid;
            gap: 16px;
          }

          .sf-check-count {
            justify-items: start;
          }

          .sf-check-save-note {
            max-width: none;
            text-align: left;
          }

          .sf-check-item {
            grid-template-columns: 42px minmax(0, 1fr);
            align-items: flex-start;
            gap: 13px;
            padding: 16px;
          }

          .sf-check-state {
            grid-column: 2;
            width: fit-content;
          }

          .sf-diet-section-title,
          .sf-diet-side-title {
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="sf-diet-page">
        <section className="sf-diet-hero">
          <div className="sf-diet-card sf-diet-copy">
            <div>
              <span className="sf-diet-kicker">
                <Leaf size={15} /> 식습관 가이드
              </span>

              <h1>
                {heroTitle}
                <br />
                <span className="sf-gradient-text">오늘의 식습관 체크</span>
              </h1>

              <p>
                {heroDescription}
              </p>
            </div>

            <div className="sf-diet-actions">
              <Button to={primaryAction.to} size="lg">
                {primaryAction.label} <ArrowRight size={18} />
              </Button>
              <Button to={secondaryAction.to} variant="secondary" size="lg">
                {secondaryAction.label}
              </Button>
            </div>
          </div>

          <div className="sf-diet-card sf-diet-summary">
            <div className="sf-diet-summary-top">
              <span className="sf-icon-tile" aria-hidden="true">
                <ShieldCheck size={21} />
              </span>
              <div>
                <span className="sf-diet-label">분석 연결 상태</span>
                <h2>{sourceLabel}</h2>
              </div>
            </div>

            <div className="sf-diet-source-box">
              <div className="sf-diet-source-grid">
                <div className="sf-diet-source-item">
                  <span className="sf-diet-label">추천 체크</span>
                  <strong>{visibleActionItems.length}개</strong>
                </div>
                <div className="sf-diet-source-item">
                  <span className="sf-diet-label">가이드</span>
                  <strong>{guideCount}개</strong>
                </div>
                {hasTotalScore && (
                  <div className="sf-diet-source-item">
                    <span className="sf-diet-label">최근 점수</span>
                    <strong>{totalScore}점</strong>
                  </div>
                )}
                <div className="sf-diet-source-item">
                  <span className="sf-diet-label">기준 지표</span>
                  <strong>색소침착 · 주름</strong>
                </div>
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

        {!isLoading && !errorMessage && (
          <>
            <section className="sf-diet-card sf-check-focus-card">
              <div className="sf-check-focus-head">
                <div className="sf-check-title-wrap">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <CheckCircle2 size={21} />
                  </span>
                  <div>
                    <span className="sf-diet-label">오늘 실천 체크</span>
                    <h2>{checklistTitle}</h2>
                    <p className="sf-check-subtitle">
                      {checklistDescription}
                    </p>
                  </div>
                </div>

                {visibleActionItems.length > 0 && (
                  <div className="sf-check-count">
                    <span className="sf-diet-label">확인한 항목</span>
                    <strong>
                      {checkedVisibleCount} / {visibleActionItems.length}
                    </strong>
                    <p className="sf-check-save-note">
                      체크한 항목은 현재 화면에서만 표시됩니다. 오늘 확인한 항목을 가볍게 체크해 보세요.
                    </p>
                    <span className="sf-diet-chip">{sourceLabel}</span>
                  </div>
                )}
              </div>

              {visibleActionItems.length > 0 ? (
                <div className="sf-check-list">
                  {visibleActionItems.map((item, index) => {
                    const itemId = getActionItemId(item, index);
                    const isChecked = checkedActionIds.includes(itemId);

                    return (
                      <button
                        type="button"
                        className={`sf-check-item ${isChecked ? "is-checked" : ""}`}
                        key={itemId}
                        aria-pressed={isChecked}
                        onClick={() => handleCheckToggle(itemId)}
                      >
                        <span className="sf-icon-tile" aria-hidden="true">
                          <CheckCircle2 size={18} />
                        </span>

                        <span className="sf-check-copy">
                          <strong>{item.title}</strong>
                          {hasText(item.description) && <span>{item.description}</span>}
                        </span>

                        <span className="sf-check-state">
                          {isChecked ? "확인됨" : hasText(item.category) ? item.category : "확인"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="sf-diet-empty-card">
                  <strong>확인할 체크 항목이 아직 없습니다</strong>
                  <p>피부 분석 후 색소침착·주름 지표와 연결된 체크 항목을 더 구체적으로 확인할 수 있습니다.</p>
                </div>
              )}
            </section>

            <section className="sf-diet-main-grid">
              <div className="sf-diet-card sf-diet-section-card">
                <div className="sf-diet-section-title">
                  <div>
                    <span className="sf-diet-label">추천 이유</span>
                    <h2>식습관 참고 가이드</h2>
                  </div>
                  <span className="sf-diet-chip">{sourceLabel}</span>
                </div>

                {guides.length > 0 ? (
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
                ) : (
                  <div className="sf-diet-empty-card">
                    <strong>표시할 식습관 가이드가 아직 없습니다</strong>
                    <p>분석 결과가 저장되면 색소침착·주름 지표를 기준으로 더 구체적인 관리 가이드를 확인할 수 있습니다.</p>
                  </div>
                )}
              </div>

              <div className="sf-diet-card sf-diet-side-card">
                <div className="sf-diet-side-title">
                  <div>
                    <span className="sf-diet-label">루틴 제안</span>
                    <h2>하루 식습관 루틴</h2>
                  </div>
                  <span className="sf-side-title-icon" aria-hidden="true">
                    <Sparkles size={18} />
                  </span>
                </div>

                {routines.length > 0 ? (
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
                ) : (
                  <div className="sf-diet-empty-card">
                    <strong>오늘 루틴 정보가 아직 준비되지 않았습니다</strong>
                    <p>분석 후 개인별 관리 방향에 맞춘 식습관 루틴을 이 영역에서 확인할 수 있습니다.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default DietGuidePage;
