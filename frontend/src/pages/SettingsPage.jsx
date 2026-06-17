import { useEffect, useState } from "react";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Database,
  Droplets,
  Image,
  Info,
  Mail,
  ScanFace,
  UserRound,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Card from "../components/common/Card";
import { getMyPage } from "../api/mypageApi";

const analysisGuideItems = [
  {
    icon: Image,
    title: "이미지 업로드 안내",
    description: "JPG/PNG 이미지를 업로드하면 피부 분석 흐름에서 필요한 얼굴 영역을 확인합니다.",
    tag: "사용",
  },
  {
    icon: Camera,
    title: "촬영 환경 안내",
    description: "정면 얼굴, 밝은 조명, 가림 요소가 적은 환경에서 촬영한 이미지를 권장합니다.",
    tag: "권장",
  },
  {
    icon: ScanFace,
    title: "분석 영역 안내",
    description: "얼굴 이미지에서 분석 가능한 영역을 기준으로 색소침착과 주름 흐름을 확인합니다.",
    tag: "안내",
  },
];

const dataGuideItems = [
  {
    title: "이미지 사용 범위",
    description: "업로드 이미지는 피부 분석 흐름에 필요한 정보로만 사용됩니다.",
  },
  {
    title: "계정 내 확인",
    description: "분석 결과는 본인 계정에서 다시 확인할 수 있습니다.",
  },
  {
    title: "참고 정보 제공",
    description: "추천 성분, 제품, 식습관 가이드는 분석 결과 기반 참고 정보입니다.",
  },
];

const serviceGuideItems = [
  {
    title: "피부 관리 참고 정보",
    description: "SkinFlow는 의료 판단이 아닌 피부 관리 참고 정보를 제공합니다.",
  },
  {
    title: "개인별 관리 방향",
    description: "피부 상태와 생활습관에 따라 관리 방향은 달라질 수 있습니다.",
  },
];

function formatDate(dateValue, emptyText = "정보 없음") {
  if (!dateValue) return emptyText;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return emptyText;
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDisplayValue(value, emptyText = "정보 없음") {
  if (value === null || value === undefined || value === "") {
    return emptyText;
  }

  return value;
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

  return skinTypeMap[normalizedValue] || getDisplayValue(value, "피부 타입 정보 없음");
}

function SettingsPage() {
  const [mypage, setMypage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSettingsInfo() {
      try {
        setIsLoading(true);
        setSettingsError("");

        const data = await getMyPage();

        if (isMounted) {
          setMypage(data);
        }
      } catch (error) {
        console.error("설정 페이지 계정 정보 호출 실패:", error);

        if (isMounted) {
          setSettingsError("계정 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettingsInfo();

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

  const accountItems = [
    {
      icon: UserRound,
      label: "이름",
      value: isLoading ? "확인 중" : getDisplayValue(profile.name, "정보 없음"),
    },
    {
      icon: Mail,
      label: "이메일",
      value: isLoading ? "확인 중" : getDisplayValue(profile.email, "정보 없음"),
    },
    {
      icon: Droplets,
      label: "피부 타입",
      value: isLoading ? "확인 중" : getSkinTypeLabel(profile.skinType),
    },
    {
      icon: CalendarDays,
      label: "가입일",
      value: isLoading ? "확인 중" : formatDate(profile.createdAt),
    },
  ];

  return (
    <PageLayout>
      <style>{`
        .sf-settings-page {
          width: min(100%, 960px);
          margin: 0 auto;
          padding-bottom: 48px;
          display: grid;
          gap: 18px;
        }

        .sf-settings-card,
        .sf-settings-panel {
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 20px 52px rgba(15, 23, 42, 0.055);
        }

        .sf-settings-topGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.95fr);
          gap: 18px;
          align-items: stretch;
        }

        .sf-settings-hero {
          min-height: 270px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(236, 254, 255, 0.82) 0%, rgba(255, 255, 255, 0.98) 62%);
        }

        .sf-settings-chip {
          width: fit-content;
          min-height: 28px;
          padding: 0 12px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0f766e;
          background: rgba(22, 125, 127, 0.1);
          border: 1px solid rgba(22, 125, 127, 0.12);
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: -0.025em;
        }

        .sf-settings-hero h1 {
          margin: 18px 0 10px;
          color: #0f172a;
          font-size: clamp(44px, 4.6vw, 64px);
          line-height: 0.96;
          font-weight: 950;
          letter-spacing: -0.085em;
        }

        .sf-settings-hero h1 span {
          display: block;
          color: #14b8a6;
        }

        .sf-settings-hero p {
          max-width: 560px;
          margin: 0;
          color: #64748b;
          font-size: 15px;
          font-weight: 650;
          line-height: 1.7;
          letter-spacing: -0.025em;
          word-break: keep-all;
        }

        .sf-settings-heroChips {
          margin-top: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sf-settings-profileCard {
          min-height: 270px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #ffffff;
        }

        .sf-settings-profileHead {
          display: grid;
          grid-template-columns: 58px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
        }

        .sf-settings-profileCopy {
          min-width: 0;
        }

        .sf-settings-profileCopy small {
          display: block;
          color: #0f766e;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.2;
          letter-spacing: -0.025em;
        }

        .sf-settings-profileCopy strong {
          display: block;
          margin-top: 5px;
          color: #0f172a;
          font-size: 22px;
          font-weight: 950;
          line-height: 1.1;
          letter-spacing: -0.055em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sf-settings-profileCopy span {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sf-settings-profileStats {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .sf-settings-profileStat {
          min-height: 70px;
          padding: 13px;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: #f8fafc;
        }

        .sf-settings-profileStat span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          line-height: 1.2;
        }

        .sf-settings-profileStat strong {
          display: block;
          margin-top: 8px;
          color: #0f172a;
          font-size: 16px;
          font-weight: 950;
          line-height: 1.15;
          letter-spacing: -0.035em;
          word-break: break-all;
        }

        .sf-settings-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
        }

        .sf-settings-panel {
          min-height: 100%;
          padding: 22px;
          display: flex;
          flex-direction: column;
          background: #ffffff;
        }

        .sf-settings-panelHeader {
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .sf-settings-panelKicker {
          display: block;
          color: #0f766e;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.2;
          letter-spacing: -0.03em;
        }

        .sf-settings-panelHeader h2 {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 23px;
          line-height: 1.18;
          font-weight: 950;
          letter-spacing: -0.055em;
        }

        .sf-settings-iconTile {
          position: relative;
          display: block;
          flex: 0 0 auto;
          color: #167d7f;
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
          border: 1px solid rgba(22, 125, 127, 0.14);
          box-sizing: border-box;
          line-height: 0;
          overflow: hidden;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
        }

        .sf-settings-iconTile svg {
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

        .sf-settings-iconTile--panel {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border-radius: 16px;
          color: #167d7f;
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
          border: 1px solid rgba(22, 125, 127, 0.14);
        }

        .sf-settings-iconTile--item {
          width: 42px;
          height: 42px;
          min-width: 42px;
          min-height: 42px;
          border-radius: 15px;
          color: #167d7f;
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
          border: 1px solid rgba(22, 125, 127, 0.14);
        }

        .sf-settings-iconTile--profile {
          width: 58px;
          height: 58px;
          min-width: 58px;
          min-height: 58px;
          border-radius: 20px;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f 0%, #0ea5a8 100%);
          border: 0;
          box-shadow: 0 16px 30px rgba(22, 125, 127, 0.2);
        }

        .sf-settings-iconTile--profile svg {
          width: 25px;
          height: 25px;
          color: #ffffff;
        }

        .sf-settings-list {
          flex: 1;
          display: grid;
          gap: 10px;
        }

        .sf-settings-row {
          min-height: 68px;
          padding: 13px;
          border-radius: 18px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: #f8fafc;
        }

        .sf-settings-rowText {
          min-width: 0;
        }

        .sf-settings-rowText strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.28;
          letter-spacing: -0.03em;
        }

        .sf-settings-rowText p {
          display: block;
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 650;
          line-height: 1.48;
          letter-spacing: -0.015em;
          word-break: keep-all;
        }

        .sf-settings-accountRow {
          grid-template-columns: 42px 110px minmax(0, 1fr);
        }

        .sf-settings-accountLabel {
          display: block;
          color: #64748b;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.2;
          letter-spacing: -0.025em;
        }

        .sf-settings-accountValue {
          display: block;
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.35;
          text-align: right;
          letter-spacing: -0.025em;
          word-break: break-all;
        }

        .sf-settings-tag {
          min-width: 42px;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          justify-self: end;
          color: #0f766e;
          background: rgba(22, 125, 127, 0.1);
          border: 1px solid rgba(22, 125, 127, 0.1);
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
        }

        .sf-settings-guideRow {
          grid-template-columns: 42px minmax(0, 1fr) auto;
        }

        .sf-settings-error {
          margin-top: 18px;
          padding: 13px;
          border-radius: 18px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          color: #0f766e;
          background: #ecfeff;
          border: 1px solid rgba(20, 184, 166, 0.24);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
        }

        @media (max-width: 980px) {
          .sf-settings-page {
            width: min(100%, 720px);
          }

          .sf-settings-topGrid,
          .sf-settings-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .sf-settings-page {
            gap: 14px;
          }

          .sf-settings-hero,
          .sf-settings-profileCard,
          .sf-settings-panel {
            padding: 18px;
          }

          .sf-settings-hero {
            min-height: auto;
          }

          .sf-settings-hero h1 {
            font-size: 42px;
          }

          .sf-settings-profileStats {
            grid-template-columns: 1fr;
          }

          .sf-settings-accountRow {
            grid-template-columns: 42px minmax(0, 1fr);
          }

          .sf-settings-accountValue {
            grid-column: 2;
            text-align: left;
          }

          .sf-settings-guideRow {
            grid-template-columns: 42px minmax(0, 1fr);
          }

          .sf-settings-tag {
            grid-column: 2;
            justify-self: start;
            margin-top: 2px;
          }
        }
      `}</style>

      <div className="sf-settings-page">
        <section className="sf-settings-topGrid">
          <Card className="sf-settings-card sf-settings-hero">
            <div>
              <span className="sf-settings-chip">읽기 전용 안내</span>
              <h1>
                설정,
                <span>한눈에 확인하세요</span>
              </h1>
              <p>
                계정 정보와 분석 이용 안내를 한 화면에서 확인하고
                SkinFlow의 피부 관리 흐름을 차분하게 살펴볼 수 있습니다.
              </p>

              <div className="sf-settings-heroChips">
                <span className="sf-settings-chip">계정 정보</span>
                <span className="sf-settings-chip">분석 이용 안내</span>
                <span className="sf-settings-chip">참고 정보</span>
              </div>

              {settingsError && (
                <div className="sf-settings-error">
                  <span className="sf-settings-iconTile sf-settings-iconTile--item" aria-hidden="true">
                    <Info />
                  </span>
                  <span>{settingsError}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="sf-settings-card sf-settings-profileCard">
            <div className="sf-settings-profileHead">
              <span className="sf-settings-iconTile sf-settings-iconTile--profile" aria-hidden="true">
                <UserRound />
              </span>

              <div className="sf-settings-profileCopy">
                <small>프로필</small>
                <strong>{isLoading ? "확인 중" : getDisplayValue(profile.name, "이름 정보 없음")}</strong>
                <span>{isLoading ? "계정 정보 확인 중" : getDisplayValue(profile.email, "이메일 정보 없음")}</span>
              </div>
            </div>

            <div className="sf-settings-profileStats">
              <div className="sf-settings-profileStat">
                <span>피부 타입</span>
                <strong>{isLoading ? "확인 중" : getSkinTypeLabel(profile.skinType)}</strong>
              </div>

              <div className="sf-settings-profileStat">
                <span>가입일</span>
                <strong>{isLoading ? "확인 중" : formatDate(profile.createdAt)}</strong>
              </div>
            </div>
          </Card>
        </section>

        <section className="sf-settings-grid">
          <Card className="sf-settings-panel">
            <div className="sf-settings-panelHeader">
              <div>
                <span className="sf-settings-panelKicker">계정 정보</span>
                <h2>계정 정보</h2>
              </div>

              <span className="sf-settings-iconTile sf-settings-iconTile--panel" aria-hidden="true">
                <UserRound />
              </span>
            </div>

            <div className="sf-settings-list">
              {accountItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div className="sf-settings-row sf-settings-accountRow" key={item.label}>
                    <span className="sf-settings-iconTile sf-settings-iconTile--item" aria-hidden="true">
                      <Icon />
                    </span>

                    <span className="sf-settings-accountLabel">{item.label}</span>
                    <strong className="sf-settings-accountValue">{item.value}</strong>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="sf-settings-panel">
            <div className="sf-settings-panelHeader">
              <div>
                <span className="sf-settings-panelKicker">분석 이용 안내</span>
                <h2>분석 이용 안내</h2>
              </div>

              <span className="sf-settings-iconTile sf-settings-iconTile--panel" aria-hidden="true">
                <Camera />
              </span>
            </div>

            <div className="sf-settings-list">
              {analysisGuideItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div className="sf-settings-row sf-settings-guideRow" key={item.title}>
                    <span className="sf-settings-iconTile sf-settings-iconTile--item" aria-hidden="true">
                      <Icon />
                    </span>

                    <div className="sf-settings-rowText">
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>

                    <span className="sf-settings-tag">{item.tag}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="sf-settings-panel">
            <div className="sf-settings-panelHeader">
              <div>
                <span className="sf-settings-panelKicker">데이터 관리 안내</span>
                <h2>데이터 관리 안내</h2>
              </div>

              <span className="sf-settings-iconTile sf-settings-iconTile--panel" aria-hidden="true">
                <Database />
              </span>
            </div>

            <div className="sf-settings-list">
              {dataGuideItems.map((item) => (
                <div className="sf-settings-row" key={item.title}>
                  <span className="sf-settings-iconTile sf-settings-iconTile--item" aria-hidden="true">
                    <CheckCircle2 />
                  </span>

                  <div className="sf-settings-rowText">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="sf-settings-panel">
            <div className="sf-settings-panelHeader">
              <div>
                <span className="sf-settings-panelKicker">서비스 참고 안내</span>
                <h2>서비스 참고 안내</h2>
              </div>

              <span className="sf-settings-iconTile sf-settings-iconTile--panel" aria-hidden="true">
                <Info />
              </span>
            </div>

            <div className="sf-settings-list">
              {serviceGuideItems.map((item) => (
                <div className="sf-settings-row" key={item.title}>
                  <span className="sf-settings-iconTile sf-settings-iconTile--item" aria-hidden="true">
                    <Info />
                  </span>

                  <div className="sf-settings-rowText">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}

export default SettingsPage;
