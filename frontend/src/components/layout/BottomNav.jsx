// BottomNav.jsx
// 모바일 화면 하단에 고정되는 핵심 메뉴 컴포넌트입니다.
// 사용자가 자주 쓰는 홈, 분석, 추천, 이력, 내 정보 이동만 모아 한 손 조작 흐름을 쉽게 만듭니다.
// 실제 위치/크기/모바일 노출 조건은 index.css의 .sf-mobile-bottom-nav 스타일에서 담당합니다.
import { NavLink } from "react-router-dom";
import { Camera, History, Home, Sparkles, User } from "lucide-react";

// 모바일 하단 네비는 사용자가 자주 이동하는 핵심 흐름만 남깁니다.
// 홈 → 분석 → 추천 → 이력 → 내 정보 순서로 분석 이후 행동까지 이어지도록 구성합니다.
// 하단 탭에 표시할 메뉴 목록입니다.
// to는 이동할 URL, label은 화면에 보이는 글자, icon은 lucide-react 아이콘입니다.
const navItems = [
  {
    to: "/dashboard",
    label: "홈",
    icon: Home,
  },
  {
    to: "/analysis/capture",
    label: "분석",
    icon: Camera,
  },
  {
    to: "/recommendations",
    label: "추천",
    icon: Sparkles,
  },
  {
    to: "/history",
    label: "이력",
    icon: History,
  },
  {
    to: "/mypage",
    label: "내 정보",
    icon: User,
  },
];

// 실제 노출 여부와 고정 위치는 index.css의 모바일 미디어쿼리에서 제어합니다.
// 컴포넌트는 라우팅과 활성 탭 표시만 담당하도록 단순하게 유지합니다.
// BottomNav 컴포넌트는 메뉴 데이터를 반복해서 NavLink로 그려주는 역할만 합니다.
// NavLink는 현재 주소와 to가 일치하면 isActive를 true로 넘겨주기 때문에 활성 탭 표시가 가능합니다.
function BottomNav() {
  return (
    <nav
      className="bottom-nav sf-mobile-bottom-nav"
      aria-label="모바일 주요 메뉴"
    >
      {navItems.map((item) => {
        // 배열에 저장된 아이콘 컴포넌트를 꺼내 JSX에서 <Icon /> 형태로 사용합니다.
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `bottom-nav-item${isActive ? " active" : ""}`
            }
          >
            <span className="bottom-nav-icon-tile" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default BottomNav;
