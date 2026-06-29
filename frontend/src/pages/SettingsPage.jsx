import { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight, Eye, ListCollapse, SlidersHorizontal, ToggleLeft, UserRound } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Card from "../components/common/Card";
import Button from "../components/common/Button";

const SCORE_DISPLAY_MODE_KEY = "skinflow_score_display_mode";
const SHOW_CARE_NOTICE_KEY = "skinflow_show_care_notice";
const EXPAND_RECOMMENDATION_REASON_KEY = "skinflow_expand_recommendation_reason";

const defaultSettings = {
  showCareNotice: true,
  expandRecommendationReason: true,
};

function readStoredSetting(key, fallbackValue) {
  if (typeof window === "undefined") return fallbackValue;

  const storedValue = window.localStorage.getItem(key);

  if (storedValue === null) return fallbackValue;
  if (storedValue === "true") return true;
  if (storedValue === "false") return false;

  return storedValue;
}

function SettingsPage() {
  const [showCareNotice, setShowCareNotice] = useState(() =>
    readStoredSetting(SHOW_CARE_NOTICE_KEY, defaultSettings.showCareNotice)
  );
  const [expandRecommendationReason, setExpandRecommendationReason] = useState(() =>
    readStoredSetting(EXPAND_RECOMMENDATION_REASON_KEY, defaultSettings.expandRecommendationReason)
  );

  useEffect(() => {
    window.localStorage.setItem(SCORE_DISPLAY_MODE_KEY, "percent");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SHOW_CARE_NOTICE_KEY, String(showCareNotice));
  }, [showCareNotice]);

  useEffect(() => {
    window.localStorage.setItem(EXPAND_RECOMMENDATION_REASON_KEY, String(expandRecommendationReason));
  }, [expandRecommendationReason]);

  const toggleSettings = [
    {
      icon: Eye,
      title: "피부 관리 참고 안내",
      description: "추천과 식습관 가이드 화면의 참고 안내 문구를 표시합니다.",
      checked: showCareNotice,
      onChange: () => setShowCareNotice((currentValue) => !currentValue),
    },
    {
      icon: ListCollapse,
      title: "추천 이유와 기준 설명",
      description: "추천 화면의 상단 기준 설명과 카드별 추천 이유를 함께 표시합니다.",
      checked: expandRecommendationReason,
      onChange: () => setExpandRecommendationReason((currentValue) => !currentValue),
    },
  ];

  return (
    <PageLayout>
      <style>{`
        .sf-settings-page {
          width: min(100%, 820px);
          margin: 0 auto;
          padding-bottom: 56px;
          display: grid;
          gap: 16px;
        }

        .sf-settings-card {
          border: 1px solid rgba(226, 232, 240, 0.92);
          border-radius: 24px;
          background: #ffffff;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06);
        }

        .sf-settings-hero {
          padding: 24px 26px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 18px;
          background:
            radial-gradient(circle at 92% 8%, rgba(22, 125, 127, 0.1), transparent 32%),
            #ffffff;
        }

        .sf-settings-chip {
          width: fit-content;
          min-height: 28px;
          padding: 0 12px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.09);
          border: 1px solid rgba(22, 125, 127, 0.16);
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
        }

        .sf-settings-hero h1 {
          margin: 14px 0 8px;
          color: #0f172a;
          font-size: clamp(28px, 3.4vw, 38px);
          line-height: 1.14;
          font-weight: 950;
          letter-spacing: -0.055em;
          word-break: keep-all;
        }

        .sf-settings-hero p {
          max-width: 560px;
          margin: 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 650;
          line-height: 1.65;
          word-break: keep-all;
        }

        .sf-settings-heroIcon,
        .sf-settings-iconTile {
          position: relative;
          display: block;
          color: #167d7f;
          background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #ecfeff 100%);
          border: 1px solid rgba(22, 125, 127, 0.14);
          box-sizing: border-box;
          line-height: 0;
          overflow: hidden;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045);
        }

        .sf-settings-heroIcon {
          width: 52px;
          height: 52px;
          border-radius: 18px;
        }

        .sf-settings-iconTile {
          width: 42px;
          height: 42px;
          min-width: 42px;
          min-height: 42px;
          border-radius: 15px;
        }

        .sf-settings-heroIcon svg,
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

        .sf-settings-panel {
          padding: 22px;
        }

        .sf-settings-panelHeader {
          margin-bottom: 14px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .sf-settings-panelHeader span {
          display: block;
          color: #0f766e;
          font-size: 12px;
          font-weight: 950;
          line-height: 1.2;
        }

        .sf-settings-panelHeader h2 {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 22px;
          line-height: 1.18;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .sf-settings-list {
          display: grid;
          gap: 10px;
        }

        .sf-settings-row {
          min-height: 64px;
          padding: 12px;
          border-radius: 18px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
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
          line-height: 1.35;
        }

        .sf-settings-rowText p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 650;
          line-height: 1.48;
          word-break: keep-all;
        }

        .sf-settings-toggle {
          border: 0;
          font: inherit;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 86px;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          color: #64748b;
          background: #f1f5f9;
          border: 1px solid rgba(226, 232, 240, 0.95);
          font-size: 12px;
          font-weight: 950;
        }

        .sf-settings-toggle.is-on {
          color: #ffffff;
          background: #167d7f;
          border-color: rgba(22, 125, 127, 0.36);
          box-shadow: 0 10px 22px rgba(22, 125, 127, 0.16);
        }

        .sf-settings-toggle svg {
          width: 16px;
          height: 16px;
        }

        .sf-settings-note {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          padding: 15px;
          border-radius: 20px;
          background: rgba(22, 125, 127, 0.07);
          border: 1px solid rgba(22, 125, 127, 0.14);
        }

        .sf-settings-account {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 22px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.055);
        }

        .sf-settings-note strong,
        .sf-settings-account strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
        }

        .sf-settings-note p,
        .sf-settings-account p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 650;
          line-height: 1.5;
          word-break: keep-all;
        }

        .sf-settings-account .sf-button {
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .sf-settings-page {
            gap: 14px;
          }

          .sf-settings-hero,
          .sf-settings-row,
          .sf-settings-account {
            grid-template-columns: 1fr;
          }

          .sf-settings-hero,
          .sf-settings-panel {
            padding: 18px;
          }

          .sf-settings-heroIcon {
            display: none;
          }

          .sf-settings-toggle {
            justify-self: start;
          }

          .sf-settings-account .sf-button {
            width: 100%;
          }
        }
      `}</style>

      <div className="sf-settings-page">
        <Card className="sf-settings-card sf-settings-hero">
          <div>
            <span className="sf-settings-chip">표시 설정</span>
            <h1>추천 화면의 안내 표시를 조정하세요</h1>
            <p>매칭도는 퍼센트형으로 표시하고, 추천 기준 설명과 피부 관리 참고 안내만 선택할 수 있습니다.</p>
          </div>
          <span className="sf-settings-heroIcon" aria-hidden="true">
            <SlidersHorizontal />
          </span>
        </Card>

        <Card className="sf-settings-card sf-settings-panel">
          <div className="sf-settings-panelHeader">
            <div>
              <span>추천 화면</span>
              <h2>표시 방식</h2>
            </div>
          </div>

          <div className="sf-settings-list">
            {toggleSettings.map((item) => {
              const Icon = item.icon;

              return (
                <div className="sf-settings-row" key={item.title}>
                  <span className="sf-settings-iconTile" aria-hidden="true">
                    <Icon />
                  </span>

                  <div className="sf-settings-rowText">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>

                  <button
                    type="button"
                    className={`sf-settings-toggle ${item.checked ? "is-on" : ""}`}
                    aria-pressed={item.checked}
                    onClick={item.onChange}
                  >
                    <ToggleLeft />
                    {item.checked ? "ON" : "OFF"}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="sf-settings-note">
          <span className="sf-settings-iconTile" aria-hidden="true">
            <CheckCircle2 />
          </span>
          <div>
            <strong>설정은 추천 화면과 식습관 가이드 화면에 적용됩니다.</strong>
            <p>계정 정보와 분석 이력은 마이페이지와 분석 이력 화면에서 확인할 수 있습니다.</p>
          </div>
        </div>

        <div className="sf-settings-account">
          <span className="sf-settings-iconTile" aria-hidden="true">
            <UserRound />
          </span>
          <div>
            <strong>내 정보 관리는 마이페이지에서 변경할 수 있습니다.</strong>
            <p>프로필 수정과 비밀번호 변경은 마이페이지의 내 정보 관리 영역에서 처리합니다.</p>
          </div>
          <Button to="/mypage" variant="secondary" size="sm">
            마이페이지로 이동
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

export default SettingsPage;
