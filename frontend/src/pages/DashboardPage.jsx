// 대시보드 페이지입니다.
// 로그인 후 사용자가 가장 먼저 보는 홈 화면으로, 최근 분석 요약과 다음 행동을 안내합니다.
// 이 파일은 화면 표시와 사용자 동작 처리를 담당하며, 백엔드/DB/AI 로직은 여기서 직접 수정하지 않습니다.
// 주석은 코드 흐름 이해를 돕기 위한 설명이며 실제 동작에는 영향을 주지 않습니다.
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import { getDashboard } from "../api/dashboardApi";
import { getScoreGradeLabel, shouldShowAnalysisScore } from "../utils/analysisStatus";
 // 대시보드 상단에서 SkinFlow 핵심 기능을 짧게 보여주는 라벨 목록입니다.

const featureChips = ["색소침착 분석", "주름 분석", "맞춤 추천", "분석 이력"];
 // 서버 오류나 네트워크 오류를 사용자 친화적인 문장으로 바꿉니다.

function getDashboardErrorMessage(error) {
  const rawMessage = String(error?.message || "").toLowerCase();

  if (
    !rawMessage ||
    rawMessage.includes("internal server error") ||
    rawMessage.includes("failed to fetch") ||
    rawMessage.includes("networkerror") ||
    rawMessage.includes("api 요청에 실패했습니다")
  ) {
    return "대시보드 정보를 불러오지 못했습니다. 로그인 상태와 서비스 연결 상태를 확인한 뒤 다시 시도해주세요.";
  }

  return "대시보드 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
}
 // 분석 날짜를 한국어 날짜 형식으로 보여주고, 값이 없으면 기본 문구를 표시합니다.

function formatDate(dateValue, fallback = "분석 후 표시") {
  if (!dateValue) return fallback;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
 // 대시보드 점수를 0~100 사이 숫자로 안전하게 변환합니다.

function toScoreNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) return Math.round(parsedValue);
  }

  return null;
}
 // 최근 분석 결과 안에서 색소침착/주름 같은 지표 목록을 꺼냅니다.

function getMetricList(latestAnalysis) {
  if (!latestAnalysis || typeof latestAnalysis !== "object") return [];

  const candidates = [
    latestAnalysis.metrics,
    latestAnalysis.skinMetrics,
    latestAnalysis.skin_metrics,
    latestAnalysis.metricResults,
    latestAnalysis.metric_results,
  ];

  const matchedList = candidates.find(Array.isArray);

  return Array.isArray(matchedList) ? matchedList : [];
}
// 지표 코드에 맞는 응답 객체를 찾아 점수와 scoreGrade가 같은 지표를 기준으로 표시되게 합니다.
function getMetricByCodes(latestAnalysis, metricCodes) {
  const metricList = getMetricList(latestAnalysis);

  return metricList.find((metric) => {
    const rawCode = String(
      metric?.code ||
        metric?.metricCode ||
        metric?.metric_code ||
        metric?.type ||
        metric?.name ||
        metric?.metricName ||
        metric?.metric_name ||
        "",
    ).toLowerCase();

    return metricCodes.some((code) => rawCode.includes(code));
  }) || null;
}
 // 지표 코드에 맞는 점수를 찾아 화면 표시용 숫자로 바꿉니다.

function getMetricScore(latestAnalysis, metricCodes) {
  const matchedMetric = getMetricByCodes(latestAnalysis, metricCodes);

  const score = toScoreNumber(
    matchedMetric?.score ??
      matchedMetric?.metricScore ??
      matchedMetric?.metric_score ??
      matchedMetric?.value ??
      matchedMetric?.metricValue ??
      matchedMetric?.metric_value,
  );

  return score;
}
// scoreGrade가 있을 때만 "73점 · B등급"으로 붙이고, 없으면 기존 점수 문구를 유지합니다.

function getScoreLabel(score, scoreGrade) {
  if (typeof score !== "number") return "분석 후 표시";

  const scoreGradeLabel = getScoreGradeLabel(scoreGrade);
  return `${score}점${scoreGradeLabel ? ` · ${scoreGradeLabel}` : ""}`;
}
 // 피부 관리 단계 문구를 화면에 표시하기 좋게 정리합니다.

function getGradeLabel(score) {
  if (typeof score !== "number") return "분석 후 표시";
  if (score >= 80) return "양호";
  if (score >= 60) return "주의";
  return "관리 필요";
}
 // 등급에 따라 배지 스타일 클래스를 선택합니다.

function getGradeClass(score) {
  if (typeof score !== "number") return "is-empty";
  if (score >= 80) return "is-good";
  if (score >= 60) return "is-caution";
  return "is-care";
}
 // 빈 값이 화면에 그대로 보이지 않도록 기본 문구로 보완합니다.

function getDisplayText(value, fallback = "첫 분석 후 표시") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  if (value && typeof value === "object") {
    const candidates = [
      value.metricName,
      value.metric_name,
      value.name,
      value.label,
      value.title,
      value.type,
      value.code,
    ];
    const matchedValue = candidates.find((item) => typeof item === "string" && item.trim());

    if (matchedValue) {
      const normalizedValue = matchedValue.trim().toLowerCase();

      if (normalizedValue === "pigmentation") return "색소침착";
      if (normalizedValue === "wrinkle" || normalizedValue === "wrinkles") return "주름";

      return matchedValue.trim();
    }
  }

  return fallback;
}
 // 대시보드 화면 전체를 담당하는 React 컴포넌트입니다.

function DashboardPage() {
  // 대시보드 API 응답, 로딩 상태, 에러 메시지를 분리해 첫 분석 전/분석 후 화면을 다르게 보여줍니다.
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  // 페이지 진입 시 대시보드 데이터를 한 번 불러와 홈 화면을 구성합니다.
  useEffect(() => {
    let isMounted = true;
     // 대시보드 API를 호출해 최근 분석 요약과 추천 미리보기 데이터를 불러옵니다.

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setDashboardError("");

        const data = await getDashboard();

        if (isMounted) {
          setDashboard(data);
        }
      } catch (error) {
        if (isMounted) {
          setDashboardError(getDashboardErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const profile = dashboard?.profile || {};
  const summary = dashboard?.summary || {};
  const latestAnalysis = dashboard?.latestAnalysis || null;
  const mainConcern =
    dashboard?.mainConcern || dashboard?.main_concern || summary.mainConcern || summary.main_concern;

  const analysisCount = Number(
    summary.analysisCount || summary.analysis_count || profile.analysisCount || 0,
  );
  const hasAnalysisHistory = Boolean(latestAnalysis) || analysisCount >= 1;
  const analysisCountLabel = isLoading ? "확인 중" : `${analysisCount}회`;
  const mainConcernLabel = isLoading ? "확인 중" : getDisplayText(mainConcern);
  const latestAnalysisStatus =
    latestAnalysis?.status ??
    latestAnalysis?.analysisStatus ??
    latestAnalysis?.analysis_status ??
    summary.latestStatus ??
    summary.latest_status ??
    summary.status;
  const latestAnalysisSaved = latestAnalysis?.saved ?? summary.latestSaved ?? summary.latest_saved;
   // 최근 분석에서 색소침착 점수만 꺼내 대시보드 카드에 표시합니다.

  const pigmentationScore = useMemo(
    () => getMetricScore(latestAnalysis, ["pigmentation", "색소침착"]),
    [latestAnalysis],
  );
  // 최근 분석에서 주름 점수만 꺼내 대시보드 카드에 표시합니다.
  const wrinkleScore = useMemo(
    () => getMetricScore(latestAnalysis, ["wrinkle", "wrinkles", "주름"]),
    [latestAnalysis],
  );

  const totalScore = toScoreNumber(
    latestAnalysis?.totalScore ??
      latestAnalysis?.total_score ??
      latestAnalysis?.totalSkinScore ??
      latestAnalysis?.total_skin_score ??
      summary.latestTotalScore ??
      summary.latest_total_score,
  );
  // A~E 등급은 점수 옆 보조 정보로만 사용하며 상태 배지는 기존 양호/주의/관리필요를 유지합니다.
  const totalScoreGrade =
    latestAnalysis?.scoreGrade ??
    latestAnalysis?.score_grade ??
    summary.latestScoreGrade ??
    summary.latest_score_grade;
  const pigmentationMetric = getMetricByCodes(latestAnalysis, ["pigmentation", "색소침착"]);
  const wrinkleMetric = getMetricByCodes(latestAnalysis, ["wrinkle", "wrinkles", "주름"]);
  const pigmentationScoreGrade = pigmentationMetric?.scoreGrade ?? pigmentationMetric?.score_grade;
  const wrinkleScoreGrade = wrinkleMetric?.scoreGrade ?? wrinkleMetric?.score_grade;

  const canShowLatestAnalysis = shouldShowAnalysisScore({
    score: totalScore,
    status: latestAnalysisStatus,
    saved: latestAnalysisSaved,
    code: latestAnalysis?.code ?? summary.latestCode ?? summary.latest_code,
  });
  const displayTotalScore = canShowLatestAnalysis ? totalScore : null;
  const displayPigmentationScore = canShowLatestAnalysis ? pigmentationScore : null;
  const displayWrinkleScore = canShowLatestAnalysis ? wrinkleScore : null;
  const latestStatusLabel = isLoading
    ? "확인 중"
    : canShowLatestAnalysis
      ? "분석 완료"
      : hasAnalysisHistory
        ? "분석 후 표시"
        : "분석 대기";

  const latestDate = isLoading
    ? "확인 중"
    : canShowLatestAnalysis
      ? formatDate(
          latestAnalysis?.analyzedAt || latestAnalysis?.analyzed_at || summary.latestAnalyzedAt,
        )
      : "분석 후 표시";

  const primaryAction = canShowLatestAnalysis
    ? { to: "/recommendations", label: "맞춤 추천 확인" }
    : { to: "/analysis/capture", label: "첫 분석 시작" };
  const secondaryAction = dashboardError
    ? { to: "/login", label: "로그인 확인" }
    : canShowLatestAnalysis
      ? { to: "/analysis/capture", label: "새 분석 시작" }
      : { to: "/history", label: "분석 이력 보기" };
  const heroEyebrow = canShowLatestAnalysis
    ? "최근 분석 기반 대시보드"
    : "피부 분석 시작 대시보드";
  const heroDescription = canShowLatestAnalysis
    ? "색소침착·주름 지표를 확인하고, 추천 성분·제품·식습관 가이드로 바로 이어갈 수 있습니다."
    : "첫 분석을 완료하면 점수, 관리 기준, 맞춤 추천 흐름을 이 화면에서 이어서 확인할 수 있습니다.";

  // 아래 JSX는 상단 요약, 최근 분석 카드, 추천/식습관/이력 이동 카드를 화면에 그립니다.
  return (
    <PageLayout>
      <style>
        {`
          .dashboard-home-like {
            position: relative;
            min-height: auto;
            display: grid;
            align-items: start;
            width: min(100%, 1220px);
            margin: 0 auto;
            padding: clamp(28px, 4vw, 54px) clamp(18px, 3vw, 36px) clamp(32px, 5vw, 58px);
            overflow: visible;
          }

          .dashboard-home-like::before {
            content: "";
            position: absolute;
            left: max(-220px, -16vw);
            top: 4%;
            width: min(520px, 46vw);
            height: min(520px, 46vw);
            border-radius: 999px;
            background: radial-gradient(circle, rgba(22, 125, 127, 0.14), transparent 64%);
            filter: blur(8px);
            pointer-events: none;
          }

          .dashboard-home-like::after {
            content: "";
            position: absolute;
            right: max(-240px, -18vw);
            bottom: -14%;
            width: min(620px, 50vw);
            height: min(620px, 50vw);
            border-radius: 999px;
            background: radial-gradient(circle, rgba(34, 197, 200, 0.12), transparent 64%);
            filter: blur(12px);
            pointer-events: none;
          }

          .dashboard-landing-hero {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: minmax(390px, 0.92fr) minmax(380px, 0.78fr);
            gap: clamp(30px, 4.4vw, 56px);
            align-items: center;
            width: 100%;
            max-width: 1160px;
            margin: 0 auto;
          }

          .dashboard-home-copy {
            min-width: 0;
          }

          .dashboard-home-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            width: fit-content;
            min-height: 34px;
            padding: 0 14px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
            border: 1px solid rgba(22, 125, 127, 0.14);
            border-radius: 999px;
            font-size: 13px;
            font-weight: 950;
            letter-spacing: -0.02em;
          }

          .dashboard-home-copy h1 {
            max-width: 620px;
            margin: 18px 0 18px;
            color: #0f172a;
            font-size: clamp(38px, 4.4vw, 58px);
            line-height: 1.08;
            letter-spacing: -0.078em;
            word-break: keep-all;
            text-wrap: balance;
          }

          .dashboard-home-gradient {
            display: inline-block;
            color: #159b9d;
            letter-spacing: -0.085em;
          }

          .dashboard-home-description {
            max-width: 620px;
            margin: 0;
            color: #64748b;
            font-size: 16px;
            line-height: 1.72;
            letter-spacing: -0.02em;
            word-break: keep-all;
          }

          .dashboard-home-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 28px;
          }

          .dashboard-home-actions .sf-button {
            min-height: 52px;
            padding-inline: 24px;
            border-radius: 999px;
          }

          .dashboard-home-actions .sf-button:first-child {
            border: 1px solid rgba(22, 125, 127, 0.24);
            box-shadow: 0 20px 46px rgba(22, 125, 127, 0.23);
          }

          .dashboard-home-actions .sf-button:nth-child(2) {
            color: #0f172a;
            background: #e2e8f0;
            border: 1px solid rgba(226, 232, 240, 0.98);
            box-shadow: none;
          }

          .dashboard-home-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 18px;
            max-width: 520px;
          }

          .dashboard-home-chips span {
            display: inline-flex;
            align-items: center;
            min-height: 32px;
            padding: 0 13px;
            border-radius: 999px;
            color: #0f172a;
            background: rgba(255, 255, 255, 0.86);
            border: 1px solid rgba(226, 232, 240, 0.95);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
            font-size: 12px;
            font-weight: 900;
            white-space: nowrap;
          }

          .dashboard-error-note {
            display: flex;
            align-items: flex-start;
            gap: 9px;
            max-width: 620px;
            margin-top: 20px;
            padding: 13px 14px;
            border-radius: 18px;
            color: #b91c1c;
            background: #fef2f2;
            border: 1px solid #fecaca;
            font-size: 13px;
            line-height: 1.5;
          }

          .dashboard-home-report {
            display: flex;
            justify-content: center;
            min-width: 0;
          }

          .dashboard-report-card {
            width: min(100%, 456px);
            padding: 24px;
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid rgba(226, 232, 240, 0.94);
            box-shadow: 0 28px 72px rgba(15, 23, 42, 0.1);
          }

          .dashboard-report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            margin-bottom: 22px;
          }

          .dashboard-report-header h2 {
            margin: 0;
            color: #0f172a;
            font-size: 22px;
            line-height: 1.2;
            letter-spacing: -0.055em;
          }

          .dashboard-report-status {
            color: #0f172a;
            font-size: 13px;
            font-weight: 950;
            line-height: 1.35;
            text-align: right;
            white-space: nowrap;
          }

          .dashboard-preview-panel {
            position: relative;
            min-height: 208px;
            border-radius: 18px;
            overflow: hidden;
            background:
              radial-gradient(circle at 3% 82%, rgba(255, 237, 213, 0.86), transparent 42%),
              radial-gradient(circle at 95% 8%, rgba(45, 212, 191, 0.62), transparent 38%),
              linear-gradient(135deg, #f8fafc 0%, #ecfeff 100%);
          }

          .dashboard-preview-blob {
            position: absolute;
            right: -8px;
            top: -62px;
            width: 248px;
            height: 248px;
            border-radius: 50%;
            background: linear-gradient(135deg, #5eead4 0%, #2dd4bf 100%);
            box-shadow: inset 0 -24px 50px rgba(15, 23, 42, 0.06);
            opacity: 0.92;
          }

          .dashboard-roi-box {
            position: absolute;
            display: grid;
            place-items: center;
            min-width: 64px;
            height: 48px;
            border: 2px solid #167d7f;
            border-radius: 13px;
            background: rgba(255, 255, 255, 0.46);
          }

          .dashboard-roi-box::before {
            content: attr(data-label);
            position: absolute;
            left: 50%;
            top: -24px;
            transform: translateX(-50%);
            padding: 4px 10px;
            border-radius: 999px;
            color: #167d7f;
            background: #ffffff;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.07);
            font-size: 11px;
            font-weight: 950;
            white-space: nowrap;
          }

          .dashboard-roi-box.is-zone {
            left: 126px;
            top: 66px;
          }

          .dashboard-roi-box.is-pigment {
            left: 104px;
            bottom: 40px;
          }

          .dashboard-roi-box.is-wrinkle {
            right: 52px;
            bottom: 72px;
            border-color: #f59e0b;
          }

          .dashboard-roi-box.is-wrinkle::before {
            color: #f59e0b;
          }

          .dashboard-report-caption {
            margin: 12px 0 16px;
            color: #475569;
            font-size: 12px;
            font-weight: 850;
            line-height: 1.55;
            word-break: keep-all;
          }

          .dashboard-report-facts {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin: 0 0 16px;
          }

          .dashboard-report-facts div {
            min-width: 0;
            padding: 12px 13px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(226, 232, 240, 0.9);
          }

          .dashboard-report-facts span {
            display: block;
            color: #64748b;
            font-size: 11px;
            font-weight: 950;
            white-space: nowrap;
          }

          .dashboard-report-facts strong {
            display: block;
            margin-top: 5px;
            color: #0f172a;
            font-size: 14px;
            font-weight: 950;
            letter-spacing: -0.035em;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .dashboard-report-metrics {
            display: grid;
            grid-template-columns: minmax(120px, 0.8fr) minmax(0, 1fr);
            gap: 12px;
          }

          .dashboard-total-score-card,
          .dashboard-metric-stack > div {
            border: 1px solid rgba(226, 232, 240, 0.96);
            background: #ffffff;
            box-shadow: 0 12px 24px rgba(15, 23, 42, 0.045);
          }

          .dashboard-total-score-card {
            min-height: 136px;
            display: grid;
            place-items: center;
            border-radius: 22px;
            text-align: center;
          }

          .dashboard-total-score-card strong {
            display: block;
            color: #0f172a;
            font-size: clamp(32px, 3.6vw, 46px);
            line-height: 1;
            letter-spacing: -0.065em;
          }

          .dashboard-total-score-card span {
            display: block;
            margin-top: 9px;
            color: #64748b;
            font-size: 12px;
            font-weight: 950;
          }

          .dashboard-grade-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 26px;
            margin-top: 9px;
            padding: 0 11px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
            font-size: 12px;
            font-weight: 950;
          }

          .dashboard-grade-pill.is-caution {
            color: #92400e;
            background: rgba(245, 158, 11, 0.16);
          }

          .dashboard-grade-pill.is-care {
            color: #be123c;
            background: rgba(244, 63, 94, 0.12);
          }

          .dashboard-grade-pill.is-empty {
            color: #64748b;
            background: #f1f5f9;
          }

          .dashboard-metric-stack {
            display: grid;
            gap: 10px;
          }

          .dashboard-metric-stack > div {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            min-height: 62px;
            padding: 13px 16px;
            border-radius: 18px;
          }

          .dashboard-metric-stack span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 950;
          }

          .dashboard-metric-stack strong {
            display: block;
            margin-top: 4px;
            color: #0f172a;
            font-size: 18px;
            letter-spacing: -0.04em;
          }

          .dashboard-small-pill {
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            padding: 0 10px;
            border-radius: 999px;
            color: #167d7f;
            background: rgba(22, 125, 127, 0.1);
            font-size: 12px;
            font-weight: 950;
            white-space: nowrap;
          }

          .dashboard-small-pill.is-caution {
            color: #92400e;
            background: rgba(245, 158, 11, 0.16);
          }

          .dashboard-small-pill.is-care {
            color: #be123c;
            background: rgba(244, 63, 94, 0.12);
          }

          .dashboard-small-pill.is-empty {
            color: #64748b;
            background: #f1f5f9;
          }

          .dashboard-report-note {
            display: grid;
            grid-template-columns: 42px 1fr;
            gap: 13px;
            align-items: center;
            margin-top: 16px;
            padding: 14px 16px;
            border-radius: 18px;
            color: #0f172a;
            background: rgba(22, 125, 127, 0.1);
            font-size: 14px;
            font-weight: 850;
            line-height: 1.55;
            word-break: keep-all;
          }

          .dashboard-note-icon {
            display: grid;
            place-items: center;
            width: 38px;
            height: 38px;
            border-radius: 14px;
            color: #ffffff;
            background: #167d7f;
            box-shadow: 0 14px 26px rgba(22, 125, 127, 0.22);
          }

          @media (max-width: 1080px) {
            .dashboard-home-like {
              align-items: start;
              padding-top: 32px;
            }

            .dashboard-landing-hero {
              grid-template-columns: 1fr;
              gap: 36px;
            }

            .dashboard-home-copy h1 {
              max-width: 720px;
            }

            .dashboard-home-report {
              justify-content: flex-start;
            }
          }

          @media (max-width: 680px) {
            .dashboard-home-like {
              min-height: auto;
              padding: 24px 0 32px;
            }

            .dashboard-home-copy h1 {
              font-size: 40px;
              letter-spacing: -0.065em;
            }

            .dashboard-home-description {
              font-size: 15px;
            }

            .dashboard-home-actions .sf-button {
              width: 100%;
            }

            .dashboard-report-card {
              padding: 18px;
              border-radius: 24px;
            }

            .dashboard-report-header {
              flex-direction: column;
            }

            .dashboard-report-status {
              text-align: left;
            }

            .dashboard-report-facts {
              grid-template-columns: 1fr;
            }

            .dashboard-preview-panel {
              min-height: 220px;
            }

            .dashboard-preview-blob {
              right: -38px;
              top: -58px;
              width: 230px;
              height: 230px;
            }

            .dashboard-roi-box.is-zone {
              left: 74px;
            }

            .dashboard-roi-box.is-pigment {
              left: 88px;
            }

            .dashboard-roi-box.is-wrinkle {
              right: 28px;
            }

            .dashboard-report-metrics {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <section className="dashboard-home-like">
        <div className="dashboard-landing-hero">
          <div className="dashboard-home-copy">
            <span className="dashboard-home-eyebrow">
              <Sparkles size={15} />
              {heroEyebrow}
            </span>

            <h1>
              {canShowLatestAnalysis ? "최근 분석 결과로" : "첫 분석을 시작하고"}
              <br />
              {canShowLatestAnalysis ? "오늘의 피부 관리" : "나에게 맞는 관리"}
              <br />
              <span className="dashboard-home-gradient">
                {canShowLatestAnalysis ? "흐름을 이어가세요" : "흐름을 만들어보세요"}
              </span>
            </h1>

            <p className="dashboard-home-description">
              {heroDescription}
            </p>

            <div className="dashboard-home-actions">
              <Button to={primaryAction.to} size="lg">
                {primaryAction.label} <ArrowRight size={18} />
              </Button>
              <Button to={secondaryAction.to} variant="secondary" size="lg">
                {secondaryAction.label}
              </Button>
            </div>

            <div className="dashboard-home-chips" aria-label="SkinFlow 주요 기능">
              {featureChips.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            {dashboardError && (
              <div className="dashboard-error-note">
                <AlertCircle size={18} />
                <span>{dashboardError}</span>
              </div>
            )}
          </div>

          <div className="dashboard-home-report">
            <div className="dashboard-report-card">
              <div className="dashboard-report-header">
                <h2>최근 피부 분석 요약</h2>
                <div className="dashboard-report-status">
                  {latestStatusLabel}
                  <br />
                  {latestDate}
                </div>
              </div>

              <div className="dashboard-preview-panel" aria-label="피부 분석 리포트 미리보기">
                <div className="dashboard-preview-blob" aria-hidden="true" />
                <span className="dashboard-roi-box is-zone" data-label="T-zone" />
                <span className="dashboard-roi-box is-pigment" data-label="색소" />
                <span className="dashboard-roi-box is-wrinkle" data-label="주름" />
              </div>

              <p className="dashboard-report-caption">
                ROI 영역은 분석 흐름을 이해하기 위한 참고 이미지입니다.
              </p>

              <div className="dashboard-report-facts" aria-label="대시보드 분석 요약">
                <div>
                  <span>분석 횟수</span>
                  <strong>{analysisCountLabel}</strong>
                </div>
                <div>
                  <span>최근 분석</span>
                  <strong>{latestDate}</strong>
                </div>
                <div>
                  <span>추천 기준</span>
                  <strong>{mainConcernLabel}</strong>
                </div>
              </div>

              <div className="dashboard-report-metrics">
                <div className="dashboard-total-score-card">
                  <div>
                    <strong>{isLoading ? "확인 중" : getScoreLabel(displayTotalScore, totalScoreGrade)}</strong>
                    <span>종합 피부 점수</span>
                    <em className={`dashboard-grade-pill ${getGradeClass(displayTotalScore)}`}>
                      {isLoading ? "확인 중" : getGradeLabel(displayTotalScore)}
                    </em>
                  </div>
                </div>

                <div className="dashboard-metric-stack">
                  <div>
                    <div>
                      <span>색소침착</span>
                      <strong>{isLoading ? "확인 중" : getScoreLabel(displayPigmentationScore, pigmentationScoreGrade)}</strong>
                    </div>
                    <em className={`dashboard-small-pill ${getGradeClass(displayPigmentationScore)}`}>
                      {isLoading ? "확인 중" : getGradeLabel(displayPigmentationScore)}
                    </em>
                  </div>
                  <div>
                    <div>
                      <span>주름</span>
                      <strong>{isLoading ? "확인 중" : getScoreLabel(displayWrinkleScore, wrinkleScoreGrade)}</strong>
                    </div>
                    <em className={`dashboard-small-pill ${getGradeClass(displayWrinkleScore)}`}>
                      {isLoading ? "확인 중" : getGradeLabel(displayWrinkleScore)}
                    </em>
                  </div>
                </div>
              </div>

              <div className="dashboard-report-note">
                <span className="dashboard-note-icon" aria-hidden="true">
                  <CheckCircle2 size={20} />
                </span>
                <span>
                  {canShowLatestAnalysis
                    ? "분석 결과를 바탕으로 AI 피부 설명과 기능성 추천 성분·화장품 추천 제품·식습관 가이드를 제공합니다."
                    : "분석이 완료되면 점수, 등급, 추천 정보를 이 화면에서 이어서 확인할 수 있습니다."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

export default DashboardPage;
