// 마이페이지입니다.
// 사용자 프로필과 분석 통계, 계정 정보, 다음 행동, 비밀번호 변경, 화면 설정을 관리하는 화면입니다.
// 이 파일은 화면 표시와 사용자 동작 처리를 담당하며, 백엔드/DB/AI 로직은 여기서 직접 수정하지 않습니다.
// 주석은 코드 흐름 이해를 돕기 위한 설명이며 실제 동작에는 영향을 주지 않습니다.
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  ChevronRight,
  CheckCircle2,
  Droplets,
  History,
  KeyRound,
  Mail,
  Pencil,
  Save,
  Send,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import {
  getMyPage,
  sendMyPagePasswordCode,
  updateMyPagePassword,
  updateMyPageProfile,
} from "../api/mypageApi";
import { AUTH_STORAGE_KEYS, removeSensitiveFields } from "../api/authSession";
import { getScoreGradeLabel, shouldShowAnalysisScore } from "../utils/analysisStatus";
 // 프로필 수정 폼의 초기값입니다.

const profileInitialForm = {
  name: "",
  gender: "",
  birthDate: "",
  skinType: "",
};
 // 비밀번호 변경 폼의 초기값입니다.

const passwordInitialForm = {
  verificationCode: "",
  newPassword: "",
  confirmPassword: "",
};
 // 성별 select 박스에서 보여줄 선택지입니다.

const genderOptions = [
  { value: "M", label: "남성" },
  { value: "F", label: "여성" },
];
 // 피부 타입 select 박스에서 보여줄 선택지입니다.

const skinTypeOptions = [
  { value: "dry", label: "건성" },
  { value: "oily", label: "지성" },
  { value: "combination", label: "복합성" },
  { value: "sensitive", label: "민감성" },
  { value: "normal", label: "보통" },
];
 // 가입일/최근 분석일을 한국어 날짜로 보여줍니다.

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
// scoreGrade가 있을 때만 점수 옆에 A~E 보조 등급을 붙이고, 없으면 기존 점수 문구를 유지합니다.

function formatScore(score, scoreGrade) {
  if (score === null || score === undefined || score === "") {
    return "분석 전";
  }

  const numberScore = Number(score);

  if (Number.isNaN(numberScore)) {
    return "분석 전";
  }

  const scoreGradeLabel = getScoreGradeLabel(scoreGrade);
  return `${Math.round(numberScore)}점${scoreGradeLabel ? ` · ${scoreGradeLabel}` : ""}`;
}
 // 빈 값이 화면에 그대로 나오지 않도록 대체 문구를 제공합니다.

function getDisplayValue(value, emptyText = "정보 없음") {
  if (value === null || value === undefined || value === "") {
    return emptyText;
  }

  return value;
}
 // 프로필 응답 구조가 달라도 같은 이름으로 값을 가져오게 합니다.

function getProfileField(profile, camelKey, snakeKey = camelKey) {
  const value = profile?.[camelKey] ?? profile?.[snakeKey];

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}
 // 피부 타입 코드를 건성/지성 같은 한글 라벨로 바꿉니다.

function getSkinTypeLabel(value) {
  if (!value) return "미입력";

  const normalizedValue = String(value).trim().toLowerCase();

  const skinTypeMap = {
    dry: "건성",
    oily: "지성",
    combination: "복합성",
    sensitive: "민감성",
    normal: "보통",
  };

  return skinTypeMap[normalizedValue] ?? String(value).trim();
}
 // 성별 코드를 화면에 보이는 한글 라벨로 바꿉니다.

function getGenderLabel(value) {
  if (!value) return "미입력";

  const normalizedValue = String(value).trim().toUpperCase();

  if (normalizedValue === "M") return "남성";
  if (normalizedValue === "F") return "여성";

  return String(value).trim();
}
 // 생년월일을 input[type=date]에서 쓸 수 있는 YYYY-MM-DD 형태로 바꿉니다.

function getBirthDateInputValue(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

// 백엔드 응답은 날짜/피부 타입 필드가 camelCase 또는 snake_case로 올 수 있습니다.
// 수정 폼에는 select/input이 이해할 수 있는 값으로 변환해서 넣습니다.
// API 프로필 정보를 수정 폼 초기값으로 변환합니다.
function createProfileForm(profile) {
  const genderValue = getProfileField(profile, "gender").toUpperCase();
  const skinTypeValue = getProfileField(profile, "skinType", "skin_type").toLowerCase();

  return {
    name: getProfileField(profile, "name"),
    gender: genderOptions.some((option) => option.value === genderValue) ? genderValue : "",
    birthDate: getBirthDateInputValue(profile?.birthDate ?? profile?.birth_date),
    skinType: skinTypeOptions.some((option) => option.value === skinTypeValue) ? skinTypeValue : "",
  };
}

// 프로필 수정 응답 형태가 profile 래핑형 또는 직접 객체형이어도 같은 화면 상태로 반영합니다.
// 응답에 수정값이 없을 때는 방금 보낸 payload를 fallback으로 사용합니다.
// 프로필 수정 API 응답에서 최신 프로필 정보를 꺼냅니다.
function getUpdatedProfileFromResponse(data, fallbackProfile) {
  const responseProfile = data?.profile ?? data?.data?.profile;

  if (responseProfile && typeof responseProfile === "object") {
    return responseProfile;
  }

  if (
    data &&
    typeof data === "object" &&
    (Object.hasOwn(data, "name") ||
      Object.hasOwn(data, "gender") ||
      Object.hasOwn(data, "birthDate") ||
      Object.hasOwn(data, "birth_date") ||
      Object.hasOwn(data, "skinType") ||
      Object.hasOwn(data, "skin_type"))
  ) {
    return data;
  }

  return fallbackProfile;
}
 // 마이페이지 관련 API 오류를 사용자 안내 문구로 바꿉니다.

function getApiErrorMessage(error, fallbackMessage) {
  return error?.message || fallbackMessage;
}

// 헤더 등 다른 UI가 localStorage 사용자 정보를 읽을 수 있으므로 저장된 프로필도 함께 갱신합니다.
// 이때 비밀번호 같은 민감 정보가 섞이지 않도록 removeSensitiveFields를 다시 적용합니다.
// 프로필 수정 후 localStorage에 저장된 사용자 표시 정보도 같이 갱신합니다.
function mergeStoredUserProfile(profile) {
  if (typeof window === "undefined") {
    return;
  }

  const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEYS.user);

  if (!storedUser) {
    return;
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    const mergedUser = removeSensitiveFields({
      ...parsedUser,
      name: getProfileField(profile, "name"),
      gender: getProfileField(profile, "gender"),
      birthDate: getProfileField(profile, "birthDate", "birth_date"),
      skinType: getProfileField(profile, "skinType", "skin_type"),
    });

    window.localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(mergedUser));
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  }
}
 // 주요 관리 지표를 화면에서 읽기 쉬운 문구로 정리합니다.

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
 // 마이페이지 전체를 담당하는 React 컴포넌트입니다.

function MyPage() {
  // 마이페이지 API 응답, 프로필 수정 폼, 비밀번호 변경 폼, 각 로딩/메시지 상태를 분리해 관리합니다.
  const [mypage, setMypage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mypageError, setMypageError] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(profileInitialForm);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFormError, setProfileFormError] = useState("");
  const [profileFormMessage, setProfileFormMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState(passwordInitialForm);
  const [isSendingPasswordCode, setIsSendingPasswordCode] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFormError, setPasswordFormError] = useState("");
  const [passwordFormMessage, setPasswordFormMessage] = useState("");

  // 페이지 진입 시 마이페이지 데이터를 불러와 프로필과 통계 영역을 채웁니다.
  useEffect(() => {
    // 페이지 이동 중 API 응답이 늦게 도착하면 언마운트된 컴포넌트에 setState가 호출될 수 있습니다.
    // isMounted 플래그로 로딩/에러 상태가 잘못 갱신되는 것을 막습니다.
    let isMounted = true;
     // 마이페이지 API를 호출해 프로필, 통계, 최근 활동을 불러옵니다.

    async function loadMyPage() {
      try {
        setIsLoading(true);
        setMypageError("");

        const data = await getMyPage();

        if (isMounted) {
          setMypage(data);
          setProfileForm(createProfileForm(data.profile));
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
    gender: null,
    birthDate: null,
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
  // A~E 등급은 최근 점수의 보조 정보이며 기존 피부 상태 라벨을 대신하지 않습니다.
  const latestScoreGrade =
    stats.latestScoreGrade ??
    stats.latest_score_grade ??
    stats.scoreGrade ??
    stats.score_grade;
  const analysisCount = Number(stats.analysisCount ?? stats.analysis_count ?? 0);
  const hasAnalysisHistory = Number.isFinite(analysisCount) && analysisCount > 0;
  const mainConcernLabel = getMainConcernLabel(stats.mainConcern);
  const hasLatestScore = shouldShowAnalysisScore({
    score: latestScore,
    status: latestStatus,
    saved: stats.saved,
    code: stats.code ?? stats.latestCode ?? stats.latest_code,
  });

  const profileName = getDisplayValue(profile.name, "사용자");
  const profileEmail = getDisplayValue(profile.email, "로그인 정보 확인 필요");
  const profileGender = getGenderLabel(profile.gender);
  const profileBirthDate = formatDate(profile.birthDate ?? profile.birth_date, "미입력");
  const skinType = getSkinTypeLabel(profile.skinType ?? profile.skin_type);
  const joinedAt = formatDate(profile.createdAt ?? profile.created_at, "확인 필요");
  const latestScoreText = hasLatestScore
    ? formatScore(latestScore, latestScoreGrade)
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
      helper: "관리 가이드에 참고되는 피부 타입입니다.",
    },
    {
      icon: UserRound,
      label: "성별",
      value: isLoading ? "확인 중" : profileGender,
      helper: "선택한 경우 프로필 정보로만 표시됩니다.",
    },
    {
      icon: CalendarDays,
      label: "생년월일",
      value: isLoading ? "확인 중" : profileBirthDate,
      helper: "입력하지 않았다면 미입력으로 표시됩니다.",
    },
    {
      icon: CalendarDays,
      label: "가입일",
      value: isLoading ? "확인 중" : joinedAt,
      helper: "SkinFlow 이용을 시작한 날짜입니다.",
    },
  ];
   // 프로필 수정 폼 입력값을 상태에 반영합니다.

  function handleProfileFormChange(event) {
    const { name, value } = event.target;

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }
   // 수정 버튼을 눌렀을 때 현재 프로필 값으로 수정 폼을 엽니다.

  function handleProfileEditOpen() {
    setProfileForm(createProfileForm(profile));
    setProfileFormError("");
    setProfileFormMessage("");
    setIsEditingProfile(true);
  }
   // 프로필 수정을 취소하고 입력값과 메시지를 초기화합니다.

  function handleProfileEditCancel() {
    setProfileForm(createProfileForm(profile));
    setProfileFormError("");
    setIsEditingProfile(false);
  }

  // 프로필 수정은 이름/성별/생년월일/피부 타입만 백엔드에 전달합니다.
  // 이메일은 로그인 식별값이라 이번 화면 수정 범위에서 제외합니다.
  // 프로필 수정 API를 호출하고 성공 시 화면과 저장된 사용자 정보를 갱신합니다.
  async function handleProfileSubmit(event) {
    event.preventDefault();

    const profilePayload = {
      name: profileForm.name.trim(),
      gender: profileForm.gender,
      birthDate: profileForm.birthDate,
      skinType: profileForm.skinType,
    };

    if (!profilePayload.name) {
      setProfileFormError("이름을 입력해 주세요.");
      setProfileFormMessage("");
      return;
    }

    if (!profilePayload.gender) {
      setProfileFormError("성별을 선택해 주세요.");
      setProfileFormMessage("");
      return;
    }

    if (!profilePayload.birthDate) {
      setProfileFormError("생년월일을 선택해 주세요.");
      setProfileFormMessage("");
      return;
    }

    if (!profilePayload.skinType) {
      setProfileFormError("피부 타입을 선택해 주세요.");
      setProfileFormMessage("");
      return;
    }

    try {
      setIsSavingProfile(true);
      setProfileFormError("");
      setProfileFormMessage("");

      const data = await updateMyPageProfile(profilePayload);
      const updatedProfile = getUpdatedProfileFromResponse(data, profilePayload);
      const nextProfile = {
        ...profile,
        ...updatedProfile,
      };

      setMypage((currentMypage) => ({
        ...(currentMypage || {}),
        profile: nextProfile,
        stats: currentMypage?.stats || stats,
        recentActivity: currentMypage?.recentActivity || [],
      }));
      setProfileForm(createProfileForm(nextProfile));
      mergeStoredUserProfile(nextProfile);
      setProfileFormMessage("프로필 정보가 저장되었습니다.");
      setIsEditingProfile(false);
    } catch (error) {
      setProfileFormError(getApiErrorMessage(error, "프로필 정보를 저장하지 못했습니다."));
    } finally {
      setIsSavingProfile(false);
    }
  }
   // 비밀번호 변경 폼의 인증번호와 새 비밀번호 입력값을 관리합니다.

  function handlePasswordFormChange(event) {
    const { name, value } = event.target;

    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  // 마이페이지 비밀번호 변경은 현재 로그인 계정 이메일 기준입니다.
  // 사용자가 이메일을 다시 입력하지 않도록 인증 코드 발송만 버튼으로 분리합니다.
  // 현재 로그인 계정 이메일로 비밀번호 변경 인증번호를 발송합니다.
  async function handleSendPasswordCode() {
    try {
      setIsSendingPasswordCode(true);
      setPasswordFormError("");
      setPasswordFormMessage("");

      await sendMyPagePasswordCode();
      setPasswordFormMessage("현재 로그인 계정 이메일로 인증 코드를 보냈습니다.");
    } catch (error) {
      setPasswordFormError(getApiErrorMessage(error, "인증 코드를 보내지 못했습니다."));
    } finally {
      setIsSendingPasswordCode(false);
    }
  }

  // 인증 코드와 새 비밀번호를 검증한 뒤 백엔드에 전달합니다.
  // 성공 후에는 코드/비밀번호 입력값을 초기화해 민감한 값이 남지 않게 합니다.
  // 인증번호와 새 비밀번호를 확인한 뒤 비밀번호 변경 API를 호출합니다.
  async function handlePasswordSubmit(event) {
    event.preventDefault();

    const verificationCode = passwordForm.verificationCode.trim();

    if (!verificationCode) {
      setPasswordFormError("인증 코드를 입력해 주세요.");
      setPasswordFormMessage("");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordFormError("새 비밀번호는 8자 이상으로 입력해 주세요.");
      setPasswordFormMessage("");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFormError("새 비밀번호 확인값이 일치하지 않습니다.");
      setPasswordFormMessage("");
      return;
    }

    try {
      setIsUpdatingPassword(true);
      setPasswordFormError("");
      setPasswordFormMessage("");

      await updateMyPagePassword({
        verificationCode,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(passwordInitialForm);
      setPasswordFormMessage("비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.");
    } catch (error) {
      setPasswordFormError(getApiErrorMessage(error, "비밀번호를 변경하지 못했습니다."));
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  // 아래 JSX는 프로필·통계 요약, 계정 정보, 다음 행동, 비밀번호 변경, 화면 설정 영역을 그립니다.
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
        .sf-password-card,
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

        .sf-personal-info-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }

        .sf-personal-info-heading h2 {
          margin-bottom: 0;
        }

        .sf-profile-edit-toggle {
          min-height: 38px;
          border: 1px solid rgba(22, 125, 127, 0.18);
          border-radius: 14px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
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

        .sf-profile-edit-form,
        .sf-password-form {
          display: grid;
          gap: 14px;
        }

        .sf-profile-form-grid,
        .sf-password-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .sf-profile-edit-form .form-field,
        .sf-password-form .form-field {
          display: grid;
          gap: 7px;
        }

        .sf-profile-edit-form .form-field > span,
        .sf-password-form .form-field > span {
          color: #0f172a;
          font-size: 12px;
          font-weight: 950;
        }

        .sf-profile-edit-form .input-box,
        .sf-password-form .input-box {
          min-height: 46px;
          padding: 0 12px;
          border-radius: 14px;
          box-sizing: border-box;
        }

        .sf-profile-edit-form .input-box input,
        .sf-profile-edit-form .input-box select,
        .sf-password-form .input-box input {
          min-width: 0;
          font-size: 14px;
        }

        .sf-form-action-row,
        .sf-password-code-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .sf-form-action-row button,
        .sf-password-code-row button {
          min-height: 40px;
          border: 1px solid rgba(22, 125, 127, 0.18);
          border-radius: 14px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .sf-form-action-row button[type="submit"],
        .sf-password-form button[type="submit"] {
          color: #ffffff;
          background: #167d7f;
          border-color: #167d7f;
        }

        .sf-form-action-row button:disabled,
        .sf-password-code-row button:disabled,
        .sf-password-form button[type="submit"]:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .sf-password-card {
          display: grid;
          gap: 16px;
          padding: 20px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 100% 0%, rgba(244, 63, 94, 0.055), transparent 34%),
            #ffffff;
        }

        .sf-password-card-head {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
        }

        .sf-password-card h2 {
          margin: 0 0 5px;
          color: #0f172a;
          font-size: 20px;
          line-height: 1.2;
          letter-spacing: -0.045em;
        }

        .sf-password-card p {
          margin: 0;
          color: #64748b;
          font-size: 12px;
          font-weight: 650;
          line-height: 1.55;
          word-break: keep-all;
        }

        .sf-password-code-row button,
        .sf-password-form button[type="submit"] {
          width: fit-content;
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
          .sf-password-card,
          .sf-settings-link-card {
            padding: 18px;
          }

          .sf-mypage-main-card {
            min-height: auto;
          }

          .sf-mypage-profile-stats,
          .sf-personal-info-row,
          .sf-profile-form-grid,
          .sf-password-form-grid,
          .sf-personal-info-heading {
            grid-template-columns: 1fr;
          }

          .sf-personal-info-heading {
            display: grid;
          }

          .sf-personal-info-row em {
            text-align: left;
          }

          .sf-next-action-buttons .sf-button,
          .sf-settings-link-card .sf-button,
          .sf-profile-edit-toggle,
          .sf-form-action-row button,
          .sf-password-code-row button,
          .sf-password-form button[type="submit"] {
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
            <div className="sf-personal-info-heading">
              <div>
                <span className="sf-section-kicker">개인정보</span>
                <h2>계정 정보</h2>
              </div>

              {!isEditingProfile && (
                <button
                  type="button"
                  className="sf-profile-edit-toggle"
                  onClick={handleProfileEditOpen}
                  disabled={isLoading}
                >
                  <Pencil size={14} />
                  정보 수정
                </button>
              )}
            </div>

            {profileFormError && <p className="form-error-text">{profileFormError}</p>}
            {profileFormMessage && <p className="form-success-text">{profileFormMessage}</p>}

            {isEditingProfile ? (
              <form className="sf-profile-edit-form" onSubmit={handleProfileSubmit}>
                <div className="sf-profile-form-grid">
                  <label className="form-field">
                    <span>이름</span>
                    <div className="input-box">
                      <UserRound size={17} />
                      <input
                        type="text"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileFormChange}
                        placeholder="이름을 입력하세요"
                        autoComplete="name"
                        required
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>성별</span>
                    <div className="input-box">
                      <UserRound size={17} />
                      <select name="gender" value={profileForm.gender} onChange={handleProfileFormChange} required>
                        <option value="" disabled>성별 선택</option>
                        {genderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label className="form-field">
                    <span>생년월일</span>
                    <div className="input-box">
                      <CalendarDays size={17} />
                      <input
                        type="date"
                        name="birthDate"
                        value={profileForm.birthDate}
                        onChange={handleProfileFormChange}
                        required
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>피부 타입</span>
                    <div className="input-box">
                      <Droplets size={17} />
                      <select name="skinType" value={profileForm.skinType} onChange={handleProfileFormChange} required>
                        <option value="" disabled>피부 타입 선택</option>
                        {skinTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>

                <div className="sf-form-action-row">
                  <button type="submit" disabled={isSavingProfile}>
                    <Save size={14} />
                    {isSavingProfile ? "저장 중" : "저장"}
                  </button>
                  <button type="button" onClick={handleProfileEditCancel} disabled={isSavingProfile}>
                    <X size={14} />
                    취소
                  </button>
                </div>
              </form>
            ) : (
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
            )}
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

            <Card className="sf-password-card" style={{ marginTop: "18px" }}>
              <div className="sf-password-card-head">
                <span className="sf-icon-tile" aria-hidden="true">
                  <KeyRound />
                </span>
                <div>
                  <h2>비밀번호 변경</h2>
                  <p>현재 로그인 계정 이메일로 인증 코드가 발송됩니다.</p>
                </div>
              </div>

              <div className="sf-password-code-row">
                <button
                  type="button"
                  onClick={handleSendPasswordCode}
                  disabled={isSendingPasswordCode || isUpdatingPassword}
                >
                  <Send size={14} />
                  {isSendingPasswordCode ? "발송 중" : "인증 코드 받기"}
                </button>
              </div>

              <form className="sf-password-form" onSubmit={handlePasswordSubmit}>
                <div className="sf-password-form-grid">
                  <label className="form-field">
                    <span>인증 코드</span>
                    <div className="input-box">
                      <KeyRound size={17} />
                      <input
                        type="text"
                        name="verificationCode"
                        value={passwordForm.verificationCode}
                        onChange={handlePasswordFormChange}
                        placeholder="인증 코드를 입력하세요"
                        autoComplete="one-time-code"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>새 비밀번호</span>
                    <div className="input-box">
                      <KeyRound size={17} />
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordFormChange}
                        placeholder="8자 이상 입력하세요"
                        autoComplete="new-password"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>새 비밀번호 확인</span>
                    <div className="input-box">
                      <KeyRound size={17} />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordFormChange}
                        placeholder="새 비밀번호를 다시 입력하세요"
                        autoComplete="new-password"
                      />
                    </div>
                  </label>
                </div>

                {passwordFormError && <p className="form-error-text">{passwordFormError}</p>}
                {passwordFormMessage && <p className="form-success-text">{passwordFormMessage}</p>}

                <button type="submit" disabled={isSendingPasswordCode || isUpdatingPassword}>
                  <CheckCircle2 size={14} />
                  {isUpdatingPassword ? "변경 중" : "비밀번호 변경"}
                </button>
              </form>
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
