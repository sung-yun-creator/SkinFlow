import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  History,
  Image,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import { getMyPage } from "../api/mypageApi";

const quickActions = [
  {
    icon: Camera,
    title: "새 분석 시작",
    description: "스마트폰 사진으로 피부 분석을 진행합니다.",
    to: "/analysis/capture",
    label: "분석",
  },
  {
    icon: Sparkles,
    title: "맞춤 추천 보기",
    description: "성분, 제품, 식습관 가이드를 확인합니다.",
    to: "/recommendations",
    label: "추천",
  },
  {
    icon: History,
    title: "분석 이력 확인",
    description: "이전 기록과 피부 변화 흐름을 확인합니다.",
    to: "/history",
    label: "이력",
  },
];

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
    icon: Bell,
    title: "분석 이력 안내",
    description: "분석 후 변화 흐름과 추천 정보를 다시 확인합니다.",
    status: "준비",
  },
];

const privacyItems = [
  "업로드 이미지는 피부 분석 흐름을 위한 참고 정보로 사용됩니다.",
  "분석 결과와 추천 정보는 분석 이력 화면에서 다시 확인할 수 있습니다.",
  "SkinFlow는 의료적 판단이 아닌 피부 관리 참고 정보를 제공합니다.",
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

function MyPage() {
  const navigate = useNavigate();
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
          setMypageError(
            "마이페이지 정보를 불러오지 못했습니다. 로그인 상태를 확인한 후 다시 시도해주세요."
          );
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
    name: "사용자",
    email: "skinflow@example.com",
    skinType: "미설정",
    createdAt: null,
  };

  const stats = mypage?.stats ?? {
    analysisCount: 0,
    latestTotalScore: null,
    mainConcern: null,
    latestAnalyzedAt: null,
  };

  const recentActivity = Array.isArray(mypage?.recentActivity)
    ? mypage.recentActivity.slice(0, 3)
    : [];

  const profileStats = useMemo(
    () => [
      {
        label: "총 분석",
        value: `${stats.analysisCount ?? 0}회`,
      },
      {
        label: "최근 점수",
        value: formatScore(stats.latestTotalScore),
      },
      {
        label: "관심 지표",
        value: getDisplayValue(stats.mainConcern, "분석 전"),
      },
    ],
    [stats.analysisCount, stats.latestTotalScore, stats.mainConcern]
  );

  const skinProfileItems = useMemo(
    () => [
      {
        icon: Droplets,
        label: "피부 타입",
        value: getDisplayValue(profile.skinType),
        description: "회원가입 시 선택한 피부 타입 정보입니다.",
      },
      {
        icon: Sparkles,
        label: "관심 지표",
        value: getDisplayValue(stats.mainConcern, "분석 전"),
        description: "최근 분석 후 우선 관리 항목이 표시됩니다.",
      },
      {
        icon: CalendarDays,
        label: "최근 분석일",
        value: formatDate(stats.latestAnalyzedAt),
        description: "마지막 분석 기록 기준으로 표시됩니다.",
      },
    ],
    [profile.skinType, stats.mainConcern, stats.latestAnalyzedAt]
  );

  const handleLogout = () => {
    localStorage.removeItem("skinflow_token");
    localStorage.removeItem("skinflow_user_email");
    localStorage.removeItem("skinflow_user");

    navigate("/login");
  };

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

        .sf-mypage-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .sf-mypage-profile-card {
          padding: 24px;
        }

        .sf-profile-head {
          display: grid;
          grid-template-columns: 58px 1fr;
          gap: 14px;
          align-items: center;
        }

        .sf-profile-avatar {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f, #22c5c8);
          box-shadow: 0 16px 30px rgba(22, 125, 127, 0.18);
          line-height: 0;
        }

        .sf-profile-avatar svg {
          display: block;
          width: 28px;
          height: 28px;
          margin: 0;
          flex: 0 0 auto;
        }

        .sf-card-label {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: -0.01em;
        }

        .sf-profile-head h2 {
          margin: 4px 0 2px;
          color: #0f172a;
          font-size: 22px;
          letter-spacing: -0.05em;
        }

        .sf-profile-head p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          word-break: break-all;
        }

        .sf-profile-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 20px;
        }

        .sf-profile-stat {
          min-height: 74px;
          padding: 14px;
          border-radius: 18px;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-profile-stat span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .sf-profile-stat strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 17px;
          letter-spacing: -0.04em;
        }

        .sf-profile-note {
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

        .sf-profile-note p {
          margin: 0;
          color: #334155;
          font-size: 12px;
          line-height: 1.55;
          word-break: keep-all;
        }

        .sf-icon-tile {
          width: 42px;
          height: 42px;
          min-width: 42px;
          min-height: 42px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          line-height: 0;
          color: #167d7f;
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.055);
        }

        .sf-icon-tile svg,
        .sf-panel-icon svg,
        .sf-small-icon svg {
          display: block;
          width: 20px;
          height: 20px;
          min-width: 20px;
          min-height: 20px;
          margin: 0;
          flex: 0 0 auto;
          stroke-width: 2.1;
        }

        .sf-mypage-quick-grid,
        .sf-skin-profile-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .sf-quick-card,
        .sf-skin-profile-card,
        .sf-setting-item,
        .sf-activity-item,
        .sf-privacy-item {
          border: 1px solid rgba(226, 232, 240, 0.9);
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.055), transparent 32%),
            #ffffff;
        }

        .sf-quick-card,
        .sf-skin-profile-card {
          min-height: 164px;
          padding: 18px;
          border-radius: 24px;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .sf-quick-card:hover,
        .sf-skin-profile-card:hover {
          transform: translateY(-2px);
          border-color: rgba(22, 125, 127, 0.2);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.075);
        }

        .sf-quick-head,
        .sf-skin-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }

        .sf-quick-badge {
          padding: 6px 9px;
          border-radius: 999px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.09);
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .sf-quick-card h3,
        .sf-skin-profile-card h3 {
          margin: 0 0 7px;
          color: #0f172a;
          font-size: 16px;
          letter-spacing: -0.04em;
        }

        .sf-quick-card p,
        .sf-skin-profile-card p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
          word-break: keep-all;
        }

        .sf-skin-profile-card strong {
          display: block;
          margin: 7px 0 6px;
          color: #0f172a;
          font-size: 20px;
          letter-spacing: -0.045em;
        }

        .sf-mypage-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.86fr);
          gap: 18px;
          align-items: start;
        }

        .sf-mypage-panel {
          padding: 22px;
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
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          line-height: 0;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
        }

        .sf-info-list {
          display: grid;
          gap: 10px;
        }

        .sf-info-row,
        .sf-setting-item,
        .sf-activity-item,
        .sf-privacy-item {
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 12px;
          min-height: 70px;
          padding: 13px;
          border-radius: 18px;
        }

        .sf-info-row {
          grid-template-columns: 1fr auto;
          background: #f8fafc;
          border: 1px solid rgba(226, 232, 240, 0.9);
        }

        .sf-info-row span,
        .sf-setting-item > div > span,
        .sf-activity-item > div > span,
        .sf-privacy-item > div > span {
          display: block;
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.42;
          word-break: keep-all;
        }

        .sf-info-row strong,
        .sf-setting-item strong,
        .sf-activity-item strong,
        .sf-privacy-item strong {
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

        .sf-logout-panel {
          display: grid;
          grid-template-columns: 54px 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 20px;
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: #ffffff;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
        }

        .sf-logout-panel h2 {
          margin: 0 0 4px;
          color: #0f172a;
          font-size: 20px;
          letter-spacing: -0.045em;
        }

        .sf-logout-panel p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .sf-logout-button {
          height: 42px;
          padding: 0 18px;
          border: 0;
          border-radius: 999px;
          color: #ffffff;
          background: #0f172a;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .sf-mypage-error {
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          padding: 13px;
          border-radius: 18px;
          color: #be123c;
          background: #ecfeff;
          border: 1px solid #fecdd3;
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

        @media (max-width: 980px) {
          .sf-mypage-hero,
          .sf-mypage-grid {
            grid-template-columns: 1fr;
          }

          .sf-mypage-quick-grid,
          .sf-skin-profile-grid {
            grid-template-columns: 1fr;
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

          .sf-mypage-actions .sf-button {
            width: 100%;
          }

          .sf-profile-stats {
            grid-template-columns: 1fr;
          }

          .sf-info-row,
          .sf-setting-item,
          .sf-activity-item,
          .sf-privacy-item,
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
              <Badge>My Page</Badge>
              <h1>
                내 피부 관리,
                <br />
                <span className="sf-gradient-text">한눈에 확인하세요</span>
              </h1>
              <p>
                회원 정보, 피부 타입, 최근 분석 상태와 추천 흐름을 한 화면에서 확인하고
                필요한 화면으로 바로 이동할 수 있습니다.
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

            <div className="sf-mypage-actions">
              <Button to="/analysis/capture" size="lg">
                새 분석 시작 <ArrowRight size={18} />
              </Button>
              <Button to="/history" variant="secondary" size="lg">
                분석 이력 보기
              </Button>
            </div>
          </Card>

          <Card className="sf-mypage-profile-card">
            <div className="sf-profile-head">
              <span className="sf-profile-avatar" aria-hidden="true">
                <UserRound size={28} />
              </span>

              <div>
                <span className="sf-card-label">Profile</span>
                <h2>{profile.name || "사용자"}님</h2>
                <p>{profile.email || "이메일 정보 없음"}</p>
              </div>
            </div>

            <div className="sf-profile-stats">
              {profileStats.map((item) => (
                <div className="sf-profile-stat" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{isLoading ? "확인 중" : item.value}</strong>
                </div>
              ))}
            </div>

            <div className="sf-profile-note">
              <span className="sf-icon-tile" aria-hidden="true">
                <Sparkles size={20} />
              </span>
              <p>
                {stats.mainConcern
                  ? `최근 분석 기준으로 ${stats.mainConcern} 관리 흐름을 확인할 수 있습니다.`
                  : "첫 분석을 진행하면 관심 지표와 맞춤 추천 흐름이 표시됩니다."}
              </p>
            </div>
          </Card>
        </section>

        <section className="sf-mypage-quick-grid">
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <Card className="sf-quick-card" key={item.title}>
                <div className="sf-quick-head">
                  <span className="sf-icon-tile" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="sf-quick-badge">{item.label}</span>
                </div>

                <h3>{item.title}</h3>
                <p>{item.description}</p>

                <Button to={item.to} variant="ghost" size="sm">
                  바로가기 <ChevronRight size={16} />
                </Button>
              </Card>
            );
          })}
        </section>

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
                <span className="sf-card-label">Account</span>
                <h2>기본 정보</h2>
              </div>
              <span className="sf-panel-icon" aria-hidden="true">
                <Mail size={20} />
              </span>
            </div>

            <div className="sf-info-list">
              <div className="sf-info-row">
                <span>이름</span>
                <strong>{getDisplayValue(profile.name, "사용자")}</strong>
              </div>
              <div className="sf-info-row">
                <span>이메일</span>
                <strong>{getDisplayValue(profile.email, "이메일 정보 없음")}</strong>
              </div>
              <div className="sf-info-row">
                <span>가입일</span>
                <strong>{formatDate(profile.createdAt)}</strong>
              </div>
              <div className="sf-info-row">
                <span>최근 분석일</span>
                <strong>{formatDate(stats.latestAnalyzedAt)}</strong>
              </div>
            </div>
          </Card>

          <Card className="sf-mypage-panel">
            <div className="sf-panel-title-row">
              <div>
                <span className="sf-card-label">Analysis Setting</span>
                <h2>분석 설정</h2>
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
                    <span
                      className={`sf-status-badge ${
                        item.status === "준비" ? "is-muted" : ""
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        <section className="sf-mypage-grid">
          <Card className="sf-mypage-panel">
            <div className="sf-panel-title-row">
              <div>
                <span className="sf-card-label">Recent Activity</span>
                <h2>최근 활동</h2>
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
                      <strong>{activity.title || "활동 기록"}</strong>
                      <span>
                        {activity.description || "분석 관련 활동이 기록되었습니다."} ·{" "}
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
                    <strong>아직 활동 내역이 없습니다</strong>
                    <span>
                      피부 분석을 시작하면 분석 결과와 추천 내용을 이곳에서 확인할 수 있습니다.
                    </span>
                  </div>
                  <span className="sf-status-badge is-muted">대기</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="sf-mypage-panel">
            <div className="sf-panel-title-row">
              <div>
                <span className="sf-card-label">Privacy</span>
                <h2>개인정보 안내</h2>
              </div>
              <span className="sf-panel-icon" aria-hidden="true">
                <ShieldCheck size={20} />
              </span>
            </div>

            <div className="sf-info-list">
              {privacyItems.map((item, index) => (
                <div className="sf-privacy-item" key={item}>
                  <span className="sf-icon-tile" aria-hidden="true">
                    {index === 2 ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                  </span>
                  <div>
                    <strong>{index === 2 ? "참고 정보 안내" : `안내 ${index + 1}`}</strong>
                    <span>{item}</span>
                  </div>
                  <span className={`sf-status-badge ${index === 2 ? "is-muted" : ""}`}>
                    {index === 2 ? "확인" : "안내"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="sf-logout-panel">
          <span className="sf-icon-tile" aria-hidden="true">
            <LogOut size={20} />
          </span>
          <div>
            <h2>로그아웃</h2>
            <p>공용 기기라면 이용 후 로그아웃하는 것을 권장합니다.</p>
          </div>
          <button className="sf-logout-button" type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </section>
      </div>
    </PageLayout>
  );
}

export default MyPage;
