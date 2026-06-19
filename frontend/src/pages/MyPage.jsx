import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock3,
  Droplets,
  History,
  Image,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getMyPage } from "../api/mypageApi";
import { shouldShowAnalysisScore } from "../utils/analysisStatus";

const settingItems = [
  {
    icon: Image,
    title: "이미지 업로드 안내",
    description: "JPG/PNG 이미지와 얼굴 품질 기준을 안내합니다.",
    status: "사용",
  },
  {
    icon: Camera,
    title: "촬영 환경 안내",
    description: "정면 얼굴, 밝은 조명, 가림 요소 제거를 권장합니다.",
    status: "권장",
  },
  {
    icon: Sparkles,
    title: "분석 결과 안내",
    description: "색소침착과 주름 지표 중심의 참고 정보를 확인합니다.",
    status: "안내",
  },
];

function formatDate(dateValue, emptyText = "아직 없음") {
  if (!dateValue) return emptyText;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return emptyText;
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatScore(score) {
  if (score === null || score === undefined || score === "") {
    return "분석 전";
  }

  const numberScore = Number(score);

  if (Number.isNaN(numberScore)) {
    return "분석 전";
  }

  return `${Math.round(numberScore)}점`;
}

function getDisplayValue(value, emptyText = "미설정") {
  if (value === null || value === undefined || value === "") {
    return emptyText;
  }

  return value;
}

function getMainConcernLabel(value) {
  if (typeof value === "string" && value.trim()) {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "pigmentation") return "색소침착";
    if (normalizedValue === "wrinkle" || normalizedValue === "wrinkles") return "주름";

    return value.trim();
  }

  if (value && typeof value === "object") {
    const candidates = [
      value.name,
      value.metricName,
      value.metric_name,
      value.label,
      value.title,
      value.code,
      value.metricCode,
      value.metric_code,
    ];
    const matchedValue = candidates.find((item) => typeof item === "string" && item.trim());

    if (matchedValue) {
      const normalizedValue = matchedValue.trim().toLowerCase();

      if (normalizedValue === "pigmentation") return "색소침착";
      if (normalizedValue === "wrinkle" || normalizedValue === "wrinkles") return "주름";

      return matchedValue.trim();
    }
  }

  return "분석 후 표시됩니다";
}

function getSkinTypeLabel(value) {
  const skinTypeMap = {
    sensitive: "민감성",
    oily: "지성",
    dry: "건성",
    combination: "복합성",
    normal: "중성",
  };
  const normalizedValue = String(value || "").trim().toLowerCase();

  return skinTypeMap[normalizedValue] || getDisplayValue(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function MyPage() {
  const [mypage, setMypage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mypageError, setMypageError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMyPage() {
      try {
        setIsLoading(true);
        setMypageError("");

        const data = await getMyPage();

        if (isMounted) {
          setMypage(data);
        }
      } catch (error) {
        console.error("마이페이지 API 호출 실패:", error);

        if (isMounted) {
          setMypageError("마이페이지 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMyPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const profile = mypage?.profile ?? {
    name: null,
    email: null,
    skinType: null,
    createdAt: null,
  };

  const stats = mypage?.stats ?? {
    analysisCount: 0,
    latestTotalScore: null,
    mainConcern: null,
    latestAnalyzedAt: null,
    latestStatus: null,
  };

  const hasMypageData = Boolean(mypage) && !mypageError;
  const latestStatus = stats.latestStatus ?? stats.latest_status ?? stats.analysisStatus ?? stats.analysis_status;
  const latestScore = stats.latestTotalScore ?? stats.latest_total_score;
  const analysisCount = Number(stats.analysisCount ?? stats.analysis_count ?? 0);
  const hasAnalysisHistory = Number.isFinite(analysisCount) && analysisCount > 0;
  const mainConcernLabel = getMainConcernLabel(stats.mainConcern);
  const hasLatestScore = shouldShowAnalysisScore({
    score: latestScore,
    status: latestStatus,
    saved: stats.saved,
  });
  const recentActivity = Array.isArray(mypage?.recentActivity)
    ? mypage.recentActivity
        .filter((activity) => hasText(activity?.title) || hasText(activity?.description) || activity?.occurredAt)
        .slice(0, 3)
    : [];
  const profileName = getDisplayValue(profile.name, "계정 정보 없음");
  const profileEmail = getDisplayValue(profile.email, "로그인 정보 확인 필요");
  const nextActionDescription = hasAnalysisHistory
    ? "분석 이력과 추천 화면에서 최근 관리 흐름을 이어서 확인할 수 있습니다."
    : "피부 분석을 시작하면 분석 이력과 추천 흐름을 이어서 확인할 수 있습니다.";
  const nextActions = hasAnalysisHistory
    ? [
      {
        icon: History,
        title: "분석 이력 보기",
        to: "/history",
        label: "분석 이력 보기",
      },
      {
        icon: Sparkles,
        title: "추천 확인하기",
        to: "/recommendations",
        label: "추천 확인하기",
      },
    ]
    : [
      {
        icon: Camera,
        title: "피부 분석 시작하기",
        to: "/analysis/capture",
        label: "피부 분석 시작하기",
      },
    ];

  const profileStats = useMemo(
    () => [
      {
        label: "총 분석",
        value: hasMypageData ? `${Number.isFinite(analysisCount) ? analysisCount : 0}회` : "정보 없음",
      },
      {
        label: "최근 점수",
        value: hasLatestScore ? formatScore(latestScore) : hasAnalysisHistory ? "분석 후 표시됩니다" : "최근 분석 기록 없음",
      },
      {
        label: "관심 지표",
        value: mainConcernLabel,
      },
    ],
    [analysisCount, hasAnalysisHistory, hasLatestScore, hasMypageData, latestScore, mainConcernLabel]
  );

  const skinProfileItems = useMemo(
    () => [
      {
        icon: Droplets,
        label: "피부 타입",
        value: getSkinTypeLabel(profile.skinType),
        description: "회원가입 시 선택한 피부 타입 정보입니다.",
      },
      {
        icon: Sparkles,
        label: "관심 지표",
        value: mainConcernLabel,
        description: "최근 분석 후 우선 관리 항목이 표시됩니다.",
      },
      {
        icon: CalendarDays,
        label: "최근 분석일",
        value: formatDate(stats.latestAnalyzedAt, "기록 없음"),
        description: "마지막 분석 기록 기준으로 표시됩니다.",
      },
    ],
    [mainConcernLabel, profile.skinType, stats.latestAnalyzedAt]
  );


  return (
    <PageLayout>
      <style>{`
        .sf-mypage-wrap {
          display: grid;
          gap: 18px;
        }

        .sf-mypage-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(360px, 0.72fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-mypage-main-card,
        .sf-mypage-profile-card,
        .sf-mypage-panel {
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.065);
        }

        .sf-mypage-main-card {
          min-height: 300px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background:
            radial-gradient(circle at 90% 15%, rgba(22, 125, 127, 0.08), transparent 34%),
            radial-gradient(circle at 12% 92%, rgba(20, 184, 166, 0.06), transparent 30%),
            #ffffff;
        }

        .sf-mypage-main-card h1 {
          margin: 16px 0 12px;
          color: #0f172a;
          font-size: clamp(34px, 4.6vw, 56px);
          line-height: 1.05;
          letter-spacing: -0.075em;
          word-break: keep-all;
        }

        .sf-mypage-main-card p {
          max-width: 620px;
          margin: 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.75;
          word-break: keep-all;
        }

        .sf-mypage-role-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 24px;
        }

        .sf-mypage-role-strip span {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
          border: 1px solid rgba(22, 125, 127, 0.12);
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-mypage-profile-card {
          padding: 24px;
        }

        .sf-mypage-profile-head {
          display: grid;
          grid-template-columns: 58px 1fr;
          gap: 14px;
          align-items: center;
        }

        .sf-mypage-profile-avatar {
          position: relative;
          width: 58px;
          height: 58px;
          min-width: 58px;
          min-height: 58px;
          border-radius: 20px;
          display: block;
          flex: 0 0 58px;
          overflow: hidden;
          box-sizing: border-box;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f, #22c5c8);
          box-shadow: 0 16px 30px rgba(22, 125, 127, 0.18);
          line-height: 0;
        }

        .sf-mypage-profile-avatar svg {
          position: absolute;
          top: 50%;
          left: 50%;
          display: block;
          width: 24px;
          height: 24px;
          margin: 0;
          transform: translate(-50%, -50%);
          transform-origin: center;
          pointer-events: none;
          stroke-width: 2.1;
        }

        .sf-card-label {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: -0.01em;
        }

        .sf-mypage-profile-head h2 {
          margin: 4px 0 2px;
          color: #0f172a;
          font-size: 22px;
          letter-spacing: -0.05em;
        }

        .sf-mypage-profile-head p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          word-break: break-all;
        }

        .sf-mypage-profile-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 20px;
        }

        .sf-mypage-profile-stat {
          min-height: 74px;
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-mypage-profile-stat span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .sf-mypage-profile-stat strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 17px;
          letter-spacing: -0.04em;
        }

        .sf-mypage-profile-note {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          padding: 14px;
          border-radius: 18px;
          color: #0f172a;
          background: rgba(22, 125, 127, 0.08);
        }

        .sf-mypage-profile-note p {
          margin: 0;
          color: #334155;
          font-size: 12px;
          line-height: 1.55;
          word-break: keep-all;
        }

        .sf-icon-tile {
          position: relative;
          width: 42px;
          height: 42px;
          min-width: 42px;
          min-height: 42px;
          border-radius: 15px;
          display: block;
          flex: 0 0 42px;
          overflow: hidden;
          line-height: 0;
          color: #167d7f;
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.055);
        }

        .sf-icon-tile svg,
        .sf-panel-icon svg,
        .sf-small-icon svg {
          position: absolute;
          top: 50%;
          left: 50%;
          display: block;
          width: 20px;
          height: 20px;
          margin: 0;
          transform: translate(-50%, -50%);
          transform-origin: center;
          pointer-events: none;
          stroke-width: 2.1;
        }

        .sf-next-action-card,
        .sf-skin-profile-grid {
          display: grid;
          gap: 14px;
        }

        .sf-skin-profile-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .sf-next-action-card {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          padding: 20px;
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.06), transparent 32%),
            #ffffff;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.055);
        }

        .sf-next-action-copy {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .sf-next-action-copy h2 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 21px;
          letter-spacing: -0.05em;
        }

        .sf-next-action-copy p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
          word-break: keep-all;
        }

        .sf-next-action-buttons {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .sf-skin-profile-card,
        .sf-setting-item,
        .sf-activity-item {
          border: 1px solid rgba(226, 232, 240, 0.9);
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.055), transparent 32%),
            #ffffff;
        }

        .sf-skin-profile-card {
          min-height: 118px;
          padding: 16px;
          border-radius: 24px;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .sf-skin-profile-card:hover {
          transform: translateY(-2px);
          border-color: rgba(22, 125, 127, 0.2);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.075);
        }

        .sf-skin-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .sf-skin-profile-card h3 {
          margin: 0 0 7px;
          color: #0f172a;
          font-size: 16px;
          letter-spacing: -0.04em;
        }

        .sf-skin-profile-card p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.45;
          word-break: keep-all;
        }

        .sf-skin-profile-card strong {
          display: block;
          margin: 6px 0 5px;
          color: #0f172a;
          font-size: 18px;
          letter-spacing: -0.045em;
        }

        .sf-mypage-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.86fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-mypage-panel {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          padding: 22px;
          align-self: stretch;
        }

        .sf-panel-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }

        .sf-panel-title-row h2 {
          margin: 5px 0 0;
          color: #0f172a;
          font-size: 22px;
          letter-spacing: -0.05em;
        }

        .sf-panel-icon {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: block;
          overflow: hidden;
          min-width: 44px;
          min-height: 44px;
          flex: 0 0 44px;
          line-height: 0;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
        }

        .sf-info-list {
          display: grid;
          gap: 10px;
          flex: 1;
        }

        .sf-info-row,
        .sf-setting-item,
        .sf-activity-item {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 12px;
          min-height: 70px;
          padding: 13px;
          border-radius: 18px;
        }

        .sf-mypage-panel .sf-info-list > * {
          height: 100%;
        }

        .sf-info-row {
          grid-template-columns: 1fr auto;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-info-row span,
        .sf-setting-item > div > span,
        .sf-activity-item > div > span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.42;
          word-break: keep-all;
        }

        .sf-info-row strong,
        .sf-setting-item strong,
        .sf-activity-item strong {
          color: #0f172a;
          font-size: 14px;
          letter-spacing: -0.025em;
        }

        .sf-status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 46px;
          padding: 7px 10px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-status-badge.is-muted {
          color: #64748b;
          background: rgba(100, 116, 139, 0.1);
        }

        .sf-activity-empty {
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .sf-mypage-error {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          padding: 13px;
          border-radius: 18px;
          color: #0f766e;
          background: #ecfeff;
          border: 1px solid rgba(20, 184, 166, 0.24);
          font-size: 13px;
          font-weight: 800;
        }


        .sf-gradient-text {
          display: inline-block;
          background: linear-gradient(90deg, #167d7f 0%, #14b8a6 52%, #22c5c8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }

        .sf-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          margin: 2px 0 -4px;
        }

        .sf-section-heading h2 {
          margin: 4px 0 0;
          color: #0f172a;
          font-size: 22px;
          letter-spacing: -0.05em;
        }

        @media (max-width: 980px) {
          .sf-mypage-hero,
          .sf-mypage-grid {
            grid-template-columns: 1fr;
          }

          .sf-skin-profile-grid {
            grid-template-columns: 1fr;
          }

          .sf-next-action-card {
            grid-template-columns: 1fr;
          }

          .sf-next-action-buttons {
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .sf-mypage-main-card,
          .sf-mypage-profile-card,
          .sf-mypage-panel {
            padding: 18px;
          }

          .sf-mypage-main-card {
            min-height: auto;
          }

          .sf-next-action-buttons .sf-button {
            width: 100%;
          }

          .sf-mypage-profile-stats {
            grid-template-columns: 1fr;
          }

          .sf-info-row,
          .sf-setting-item,
          .sf-activity-item,
          .sf-logout-panel {
            grid-template-columns: 42px 1fr;
          }

          .sf-info-row {
            grid-template-columns: 1fr;
          }

          .sf-status-badge,
          .sf-logout-button {
            grid-column: 2;
            width: fit-content;
          }
        }
      `}</style>

      <div className="sf-mypage-wrap">
        <section className="sf-mypage-hero">
          <Card className="sf-mypage-main-card">
            <div>
              <Badge>내 정보</Badge>
              <h1>
                내 피부 관리,
                <br />
                <span className="sf-gradient-text">한눈에 확인하세요</span>
              </h1>
              <p>
                내 피부 관리 요약, 프로필, 다음 관리 행동을 한 화면에서 확인하고
                이어서 필요한 추천과 가이드를 확인할 수 있습니다.
              </p>

              {mypageError && (
                <div className="sf-mypage-error">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <AlertCircle size={20} />
                  </span>
                  <span>{mypageError}</span>
                </div>
              )}
            </div>

            <div className="sf-mypage-role-strip" aria-label="마이페이지 주요 역할">
              <span>내 피부 관리 요약</span>
              <span>프로필 요약</span>
              <span>최근 활동 요약</span>
            </div>
          </Card>

          <Card className="sf-mypage-profile-card">
            <div className="sf-mypage-profile-head">
              <span className="sf-mypage-profile-avatar" aria-hidden="true">
                <UserRound size={24} />
              </span>

              <div>
                <span className="sf-card-label">프로필</span>
                <h2>{isLoading ? "계정 정보 확인 중" : `${profileName}님`}</h2>
                <p>{isLoading ? "로그인 정보 확인 중" : profileEmail}</p>
              </div>
            </div>

            <div className="sf-mypage-profile-stats">
              {profileStats.map((item) => (
                <div className="sf-mypage-profile-stat" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{isLoading ? "확인 중" : item.value}</strong>
                </div>
              ))}
            </div>

            <div className="sf-mypage-profile-note">
              <span className="sf-icon-tile" aria-hidden="true">
                <Sparkles size={20} />
              </span>
              <p>
                {mainConcernLabel !== "분석 후 표시됩니다"
                  ? `최근 분석 기준으로 ${mainConcernLabel} 관리 방향을 확인할 수 있습니다.`
                  : "첫 분석을 진행하면 관심 지표와 맞춤 추천 흐름이 표시됩니다."}
              </p>
            </div>
          </Card>
        </section>

        <Card className="sf-next-action-card">
          <div className="sf-next-action-copy">
            <span className="sf-icon-tile" aria-hidden="true">
              <Sparkles size={20} />
            </span>
            <div>
              <h2>다음 관리 행동</h2>
              <p>{nextActionDescription}</p>
            </div>
          </div>

          <div className="sf-next-action-buttons">
            {nextActions.map((item) => {
              const Icon = item.icon;

              return (
                <Button key={item.title} to={item.to} variant="secondary" size="sm">
                  <Icon size={15} />
                  {item.label}
                  <ChevronRight size={15} />
                </Button>
              );
            })}
          </div>
        </Card>

        <div className="sf-section-heading">
          <div>
            <span className="sf-card-label">관리 기준 요약</span>
            <h2>관리 기준 요약</h2>
          </div>
        </div>

        <section className="sf-skin-profile-grid">
          {skinProfileItems.map((item) => {
            const Icon = item.icon;

            return (
              <Card className="sf-skin-profile-card" key={item.label}>
                <div className="sf-skin-head">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="sf-card-label">{item.label}</span>
                </div>
                <strong>{isLoading ? "확인 중" : item.value}</strong>
                <p>{item.description}</p>
              </Card>
            );
          })}
        </section>

        <section className="sf-mypage-grid">
          <Card className="sf-mypage-panel">
            <div className="sf-panel-title-row">
              <div>
                <span className="sf-card-label">기본 정보</span>
                <h2>기본 정보</h2>
              </div>
              <span className="sf-panel-icon" aria-hidden="true">
                <Mail size={20} />
              </span>
            </div>

            <div className="sf-info-list">
              <div className="sf-info-row">
                <span>이름</span>
                <strong>{isLoading ? "계정 정보 확인 중" : profileName}</strong>
              </div>
              <div className="sf-info-row">
                <span>이메일</span>
                <strong>{isLoading ? "로그인 정보 확인 중" : profileEmail}</strong>
              </div>
              <div className="sf-info-row">
                <span>가입일</span>
                <strong>{formatDate(profile.createdAt)}</strong>
              </div>
              <div className="sf-info-row">
                <span>최근 분석일</span>
                <strong>{formatDate(stats.latestAnalyzedAt, "기록 없음")}</strong>
              </div>
            </div>
          </Card>

          <Card className="sf-mypage-panel">
            <div className="sf-panel-title-row">
              <div>
                <span className="sf-card-label">분석 이용 안내</span>
                <h2>분석 이용 안내</h2>
              </div>
              <span className="sf-panel-icon" aria-hidden="true">
                <Camera size={20} />
              </span>
            </div>

            <div className="sf-info-list">
              {settingItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div className="sf-setting-item" key={item.title}>
                    <span className="sf-icon-tile" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                    <span className="sf-status-badge">
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <Card className="sf-mypage-panel">
          <div className="sf-panel-title-row">
            <div>
              <span className="sf-card-label">최근 활동 요약</span>
              <h2>최근 활동 요약</h2>
            </div>
            <span className="sf-panel-icon" aria-hidden="true">
              <Clock3 size={20} />
            </span>
          </div>

          <div className="sf-info-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div className="sf-activity-item" key={`${activity.title}-${index}`}>
                  <span className="sf-icon-tile" aria-hidden="true">
                    <CalendarDays size={20} />
                  </span>
                  <div>
                    <strong>{activity.title || "활동 정보 확인 중"}</strong>
                    <span>
                      {activity.description || "상세 내용 확인 필요"} ·{" "}
                      {formatDate(activity.occurredAt, "날짜 없음")}
                    </span>
                  </div>
                  <span className="sf-status-badge">기록</span>
                </div>
              ))
            ) : (
              <div className="sf-activity-item">
                <span className="sf-icon-tile" aria-hidden="true">
                  <History size={20} />
                </span>
                <div>
                  <strong>최근 활동이 아직 없습니다</strong>
                  <span>
                    피부 분석을 완료하면 분석 이력과 추천 활동이 이곳에 표시됩니다.
                  </span>
                </div>
                <span className="sf-status-badge is-muted">대기</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}

export default MyPage;
