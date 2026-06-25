import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  ChevronRight,
  Droplets,
  History,
  Mail,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getMyPage } from "../api/mypageApi";
import { shouldShowAnalysisScore } from "../utils/analysisStatus";

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

function getDisplayValue(value, emptyText = "정보 없음") {
  if (value === null || value === undefined || value === "") {
    return emptyText;
  }

  return value;
}

function getSkinTypeLabel(value) {
  if (!value) return "미입력";

  const normalizedValue = String(value).trim().toLowerCase();

  const skinTypeMap = {
    dry: "건성",
    oily: "지성",
    combination: "복합성",
    sensitive: "민감성",
    normal: "중성",
  };

  return skinTypeMap[normalizedValue] ?? String(value).trim();
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

  return "분석 후 표시";
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
        console.error("마이페이지 정보 호출 실패:", error);

        if (isMounted) {
          setMypageError("마이페이지 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
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

  const profileName = getDisplayValue(profile.name, "사용자");
  const profileEmail = getDisplayValue(profile.email, "로그인 정보 확인 필요");
  const skinType = getSkinTypeLabel(profile.skinType ?? profile.skin_type);
  const joinedAt = formatDate(profile.createdAt ?? profile.created_at, "확인 필요");
  const latestScoreText = hasLatestScore
    ? formatScore(latestScore)
    : hasAnalysisHistory
      ? "분석 후 표시"
      : "기록 없음";
  const latestDateText = formatDate(stats.latestAnalyzedAt ?? stats.latest_analyzed_at, "기록 없음");
  const heroDescription = hasAnalysisHistory
    ? "개인정보와 최근 분석 상태를 확인하고, 다음 관리 행동으로 바로 이어갈 수 있습니다."
    : "계정 정보를 확인하고 첫 분석을 시작하면 최근 점수와 맞춤 추천 흐름이 이곳에 표시됩니다.";
  const nextActionDescription = hasAnalysisHistory
    ? "분석 이력과 맞춤 추천 화면에서 이어서 관리 방향을 확인해 보세요."
    : "피부 분석을 시작하면 결과 확인부터 추천 확인까지 자연스럽게 이어집니다.";
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

  const summaryItems = [
    {
      label: "총 분석",
      value: isLoading ? "확인 중" : `${Number.isFinite(analysisCount) ? analysisCount : 0}회`,
    },
    {
      label: "최근 점수",
      value: isLoading ? "확인 중" : latestScoreText,
    },
    {
      label: "관심 지표",
      value: isLoading ? "확인 중" : mainConcernLabel,
    },
    {
      label: "최근 분석일",
      value: isLoading ? "확인 중" : latestDateText,
    },
  ];

  const personalInfoItems = [
    {
      icon: UserRound,
      label: "이름",
      value: isLoading ? "확인 중" : profileName,
      helper: "계정에 표시되는 이름입니다.",
    },
    {
      icon: Mail,
      label: "이메일",
      value: isLoading ? "확인 중" : profileEmail,
      helper: "로그인에 사용하는 이메일입니다.",
    },
    {
      icon: Droplets,
      label: "피부 타입",
      value: isLoading ? "확인 중" : skinType,
      helper: "회원가입 시 선택한 피부 타입입니다.",
    },
    {
      icon: CalendarDays,
      label: "가입일",
      value: isLoading ? "확인 중" : joinedAt,
      helper: "SkinFlow 이용을 시작한 날짜입니다.",
    },
  ];

  return (
    <PageLayout>
      <style>{`
        .sf-mypage-wrap {
          width: min(100%, 1080px);
          margin: 0 auto;
          padding-bottom: 56px;
          display: grid;
          gap: 18px;
        }

        .sf-mypage-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.98fr) minmax(340px, 0.72fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-mypage-main-card,
        .sf-mypage-profile-card,
        .sf-personal-info-card,
        .sf-next-action-card,
        .sf-settings-link-card {
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.065);
        }

        .sf-mypage-main-card {
          min-height: 260px;
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
          font-size: clamp(34px, 4.4vw, 52px);
          line-height: 1.06;
          letter-spacing: -0.075em;
          word-break: keep-all;
        }

        .sf-mypage-main-card p,
        .sf-mypage-profile-note p,
        .sf-next-action-copy p,
        .sf-settings-link-copy p,
        .sf-personal-info-row p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.65;
          word-break: keep-all;
        }

        .sf-mypage-main-card p {
          max-width: 560px;
          font-size: 15px;
          line-height: 1.75;
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

        .sf-mypage-profile-card,
        .sf-personal-info-card {
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
          border-radius: 20px;
          display: block;
          overflow: hidden;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f, #22c5c8);
          box-shadow: 0 16px 30px rgba(22, 125, 127, 0.18);
        }

        .sf-mypage-profile-avatar svg,
        .sf-icon-tile svg {
          position: absolute;
          top: 50%;
          left: 50%;
          display: block;
          width: 20px;
          height: 20px;
          margin: 0;
          transform: translate(-50%, -50%);
          stroke-width: 2.1;
        }

        .sf-mypage-profile-avatar svg {
          width: 24px;
          height: 24px;
        }

        .sf-card-label,
        .sf-section-kicker {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: -0.01em;
        }

        .sf-section-kicker {
          color: #0f766e;
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
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .sf-mypage-profile-stat {
          min-height: 72px;
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

        .sf-icon-tile {
          position: relative;
          width: 42px;
          height: 42px;
          min-width: 42px;
          min-height: 42px;
          border-radius: 15px;
          display: block;
          overflow: hidden;
          line-height: 0;
          color: #167d7f;
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.055);
        }

        .sf-mypage-content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.68fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-personal-info-card h2 {
          margin: 6px 0 16px;
          color: #0f172a;
          font-size: 24px;
          line-height: 1.18;
          letter-spacing: -0.055em;
        }

        .sf-personal-info-list {
          display: grid;
          gap: 10px;
        }

        .sf-personal-info-row {
          min-height: 64px;
          padding: 12px;
          border-radius: 18px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.92);
        }

        .sf-personal-info-row strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.35;
        }

        .sf-personal-info-row em {
          color: #0f172a;
          font-size: 14px;
          font-style: normal;
          font-weight: 950;
          text-align: right;
          word-break: break-all;
        }

        .sf-next-action-card,
        .sf-settings-link-card {
          display: grid;
          grid-template-columns: 1fr;
          align-items: center;
          gap: 18px;
          padding: 20px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.06), transparent 32%),
            #ffffff;
        }

        .sf-next-action-copy,
        .sf-settings-link-copy {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .sf-next-action-copy h2,
        .sf-settings-link-copy h2 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 21px;
          letter-spacing: -0.05em;
        }

        .sf-next-action-buttons,
        .sf-settings-link-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sf-gradient-text {
          display: inline-block;
          background: linear-gradient(90deg, #167d7f 0%, #14b8a6 52%, #22c5c8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
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

        @media (max-width: 980px) {
          .sf-mypage-hero,
          .sf-mypage-content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .sf-mypage-wrap {
            gap: 14px;
          }

          .sf-mypage-main-card,
          .sf-mypage-profile-card,
          .sf-personal-info-card,
          .sf-next-action-card,
          .sf-settings-link-card {
            padding: 18px;
          }

          .sf-mypage-main-card {
            min-height: auto;
          }

          .sf-mypage-profile-stats,
          .sf-personal-info-row {
            grid-template-columns: 1fr;
          }

          .sf-personal-info-row em {
            text-align: left;
          }

          .sf-next-action-buttons .sf-button,
          .sf-settings-link-card .sf-button {
            width: 100%;
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
                <span className="sf-gradient-text">개인정보와 함께 확인하세요</span>
              </h1>
              <p>{heroDescription}</p>

              {mypageError && (
                <div className="sf-mypage-error">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <AlertCircle />
                  </span>
                  <span>{mypageError}</span>
                </div>
              )}
            </div>

            <div className="sf-mypage-role-strip" aria-label="마이페이지 주요 역할">
              <span>개인정보 확인</span>
              <span>최근 분석 상태</span>
              <span>다음 행동</span>
            </div>
          </Card>

          <Card className="sf-mypage-profile-card">
            <div className="sf-mypage-profile-head">
              <span className="sf-mypage-profile-avatar" aria-hidden="true">
                <UserRound />
              </span>

              <div>
                <span className="sf-card-label">프로필</span>
                <h2>{isLoading ? "계정 확인 중" : `${profileName}님`}</h2>
                <p>{isLoading ? "로그인 정보 확인 중" : profileEmail}</p>
              </div>
            </div>

            <div className="sf-mypage-profile-stats">
              {summaryItems.map((item) => (
                <div className="sf-mypage-profile-stat" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="sf-mypage-profile-note">
              <span className="sf-icon-tile" aria-hidden="true">
                <Sparkles />
              </span>
              <p>
                {hasAnalysisHistory
                  ? "최근 분석 결과를 기준으로 추천과 관리 가이드를 이어서 확인할 수 있습니다."
                  : "첫 분석을 완료하면 개인화된 추천 흐름이 표시됩니다."}
              </p>
            </div>
          </Card>
        </section>

        <section className="sf-mypage-content-grid">
          <Card className="sf-personal-info-card">
            <span className="sf-section-kicker">개인정보</span>
            <h2>계정 정보</h2>

            <div className="sf-personal-info-list">
              {personalInfoItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div className="sf-personal-info-row" key={item.label}>
                    <span className="sf-icon-tile" aria-hidden="true">
                      <Icon />
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.helper}</p>
                    </div>
                    <em>{item.value}</em>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="sf-mypage-side-stack">
            <Card className="sf-next-action-card">
              <div className="sf-next-action-copy">
                <span className="sf-icon-tile" aria-hidden="true">
                  <Sparkles />
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

            <Card className="sf-settings-link-card" style={{ marginTop: "18px" }}>
              <div className="sf-settings-link-copy">
                <span className="sf-icon-tile" aria-hidden="true">
                  <SlidersHorizontal />
                </span>
                <div>
                  <h2>화면 표시 설정</h2>
                  <p>추천 화면의 안내 문구 표시 방식을 조정할 수 있습니다.</p>
                </div>
              </div>

              <div className="sf-settings-link-actions">
                <Button to="/settings" variant="secondary" size="sm">
                  설정 보기
                  <ChevronRight size={15} />
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

export default MyPage;
