import { useEffect, useMemo, useState } from "react";
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
  Edit3,
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
import SectionTitle from "../components/common/SectionTitle";
import { getMyPage } from "../api/mypageApi";

const analysisSettings = [
  {
    icon: Camera,
    title: "웹캠 촬영 안내",
    description: "분석 전 얼굴 가이드와 촬영 환경 안내를 표시합니다.",
    enabled: true,
  },
  {
    icon: Image,
    title: "이미지 업로드 안내",
    description: "업로드 가능한 이미지 형식과 품질 기준을 안내합니다.",
    enabled: true,
  },
  {
    icon: Bell,
    title: "분석 이력 알림",
    description: "최근 분석 결과와 변화 흐름 확인을 안내합니다.",
    enabled: false,
  },
];

function formatDate(dateValue) {
  if (!dateValue) return "기록 없음";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "기록 없음";
  }

  return date.toLocaleDateString("ko-KR");
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

  const recentActivity = mypage?.recentActivity ?? [];

  const profileStats = useMemo(
    () => [
      {
        label: "총 분석 횟수",
        value: `${stats.analysisCount ?? 0}회`,
      },
      {
        label: "최근 종합 점수",
        value:
          stats.latestTotalScore === null || stats.latestTotalScore === undefined
            ? "기록 없음"
            : `${stats.latestTotalScore}점`,
      },
      {
        label: "관심 지표",
        value: stats.mainConcern || "기록 없음",
      },
    ],
    [stats]
  );

  const skinSettings = useMemo(
    () => [
      {
        label: "피부 타입",
        value: profile.skinType || "미설정",
      },
      {
        label: "관심 지표",
        value: stats.mainConcern || "색소침착 · 주름",
      },
      {
        label: "주요 관리 방향",
        value: "수분 · 자외선 차단 · 성분 추천",
      },
    ],
    [profile.skinType, stats.mainConcern]
  );

  const accountMenus = useMemo(
    () => [
      {
        icon: Mail,
        title: "이메일",
        description: profile.email || "이메일 정보 없음",
      },
      {
        icon: LockKeyhole,
        title: "비밀번호",
        description: "보안을 위해 주기적으로 변경하는 것을 권장합니다.",
      },
      {
        icon: ShieldCheck,
        title: "개인정보 및 이미지 사용 안내",
        description: "피부 분석과 이력 관리를 위한 정보 사용 기준을 확인합니다.",
      },
    ],
    [profile.email]
  );

  return (
    <PageLayout>
      <section className="mypage-hero">
        <div className="mypage-copy">
          <Badge>My Page</Badge>

          <h1>
            내 정보와 피부 분석
            <br />
            설정을 관리하세요
          </h1>

          <p>
            사용자 정보, 피부 타입, 관심 지표, 분석 설정을 확인하고
            SkinFlow 사용 환경을 관리할 수 있습니다.
          </p>

          <div className="mypage-action-row">
            <Button to="/analysis/capture" size="lg">
              새 피부 분석 시작하기 <ArrowRight size={18} />
            </Button>
            <Button to="/history" variant="secondary" size="lg">
              분석 이력 보기
            </Button>
          </div>
        </div>

        <Card className="profile-summary-card">
          <div className="profile-main">
            <div className="profile-avatar">
              <UserRound size={34} />
            </div>

            <div>
              <span className="mypage-card-label">Profile</span>
              <h2>{profile.name}님</h2>
              <p>{profile.email}</p>
            </div>

            <button className="profile-edit-button" type="button">
              <Edit3 size={18} />
            </button>
          </div>

          {isLoading && <p>마이페이지 정보를 불러오는 중입니다.</p>}
          {mypageError && <p>{mypageError}</p>}

          <div className="profile-stat-list">
            {profileStats.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="profile-status-box">
            <Sparkles size={18} />
            <span>
              {stats.mainConcern
                ? `최근 분석 결과를 기준으로 ${stats.mainConcern} 관리가 추천되었습니다.`
                : "아직 분석 이력이 없습니다. 첫 피부 분석을 시작해보세요."}
            </span>
          </div>
        </Card>
      </section>

      <section className="mypage-section">
        <SectionTitle
          eyebrow="Skin Profile"
          title="피부 정보 설정"
          description="피부 타입과 관심 지표를 관리하면 분석 결과와 추천 정보를 더 이해하기 쉽게 확인할 수 있습니다."
        />

        <div className="skin-setting-grid">
          {skinSettings.map((item) => (
            <Card className="skin-setting-card" key={item.label}>
              <div className="skin-setting-icon">
                <Droplets size={24} />
              </div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <button type="button">
                수정하기 <ChevronRight size={16} />
              </button>
            </Card>
          ))}
        </div>
      </section>

      <section className="mypage-dashboard-grid">
        <Card className="mypage-info-card">
          <div className="mypage-card-title-row">
            <div>
              <span className="mypage-card-label">Basic Info</span>
              <h2>기본 정보</h2>
            </div>
            <UserRound size={28} />
          </div>

          <div className="basic-info-list">
            <div>
              <span>이름</span>
              <strong>{profile.name}</strong>
            </div>
            <div>
              <span>이메일</span>
              <strong>{profile.email}</strong>
            </div>
            <div>
              <span>가입일</span>
              <strong>{formatDate(profile.createdAt)}</strong>
            </div>
            <div>
              <span>최근 분석일</span>
              <strong>{formatDate(stats.latestAnalyzedAt)}</strong>
            </div>
          </div>

          <Button variant="secondary" full>
            기본 정보 수정하기
          </Button>
        </Card>

        <Card className="mypage-analysis-card">
          <div className="mypage-card-title-row">
            <div>
              <span className="mypage-card-label">Analysis Settings</span>
              <h2>분석 설정</h2>
            </div>
            <Camera size={28} />
          </div>

          <div className="analysis-setting-list">
            {analysisSettings.map((item) => {
              const Icon = item.icon;

              return (
                <div className="analysis-setting-item" key={item.title}>
                  <div className="analysis-setting-icon">
                    <Icon size={20} />
                  </div>

                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>

                  <span
                    className={`setting-toggle ${
                      item.enabled ? "setting-toggle-on" : ""
                    }`}
                  >
                    <i />
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="mypage-dashboard-grid">
        <Card className="mypage-privacy-card">
          <div className="mypage-card-title-row">
            <div>
              <span className="mypage-card-label">Privacy</span>
              <h2>개인정보 및 이미지 사용 안내</h2>
            </div>
            <ShieldCheck size={28} />
          </div>

          <div className="privacy-notice-list">
            <div>
              <CheckCircle2 size={20} />
              <span>업로드된 이미지는 피부 분석 결과 생성에 사용됩니다.</span>
            </div>
            <div>
              <CheckCircle2 size={20} />
              <span>분석 결과는 분석 이력 화면에서 다시 확인할 수 있습니다.</span>
            </div>
            <div>
              <AlertCircle size={20} />
              <span>
                SkinFlow는 피부 관리 참고 정보를 제공하며 의료적 판단을 대체하지 않습니다.
              </span>
            </div>
          </div>
        </Card>

        <Card className="mypage-history-card">
          <div className="mypage-card-title-row">
            <div>
              <span className="mypage-card-label">Recent Activity</span>
              <h2>최근 활동</h2>
            </div>
            <History size={28} />
          </div>

          <div className="activity-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={`${activity.title}-${index}`}>
                  <div className="activity-icon">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <strong>{activity.title}</strong>
                    <span>
                      {activity.description} · {formatDate(activity.occurredAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div>
                <div className="activity-icon">
                  <Clock3 size={18} />
                </div>
                <div>
                  <strong>아직 최근 활동이 없습니다</strong>
                  <span>피부 분석을 진행하면 이곳에 활동 내역이 표시됩니다.</span>
                </div>
              </div>
            )}
          </div>

          <Button to="/history" full>
            분석 이력 전체 보기 <ArrowRight size={18} />
          </Button>
        </Card>
      </section>

      <section className="mypage-bottom-grid">
        <Card className="account-menu-card">
          <div className="mypage-card-title-row">
            <div>
              <span className="mypage-card-label">Account</span>
              <h2>계정 관리</h2>
            </div>
            <LockKeyhole size={28} />
          </div>

          <div className="account-menu-list">
            {accountMenus.map((item) => {
              const Icon = item.icon;

              return (
                <button className="account-menu-item" type="button" key={item.title}>
                  <div className="account-menu-icon">
                    <Icon size={20} />
                  </div>

                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>

                  <ChevronRight size={18} />
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="logout-card">
          <div className="logout-icon">
            <LogOut size={28} />
          </div>

          <h2>로그아웃</h2>
          <p>
            공용 기기에서 사용 중이라면 SkinFlow 이용 후 로그아웃하는 것을 권장합니다.
          </p>

          <div className="logout-actions">
            <Button to="/" variant="secondary" full>
              처음 화면으로 이동
            </Button>
            <button className="logout-button" type="button">
              로그아웃
            </button>
          </div>
        </Card>
      </section>
    </PageLayout>
  );
}

export default MyPage;