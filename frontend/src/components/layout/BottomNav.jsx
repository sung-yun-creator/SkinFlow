import { NavLink } from "react-router-dom";
import { Camera, History, Home, Sparkles, User } from "lucide-react";

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

function BottomNav() {
  return (
    <nav
      className="bottom-nav sf-mobile-bottom-nav"
      aria-label="모바일 주요 메뉴"
    >
      {navItems.map((item) => {
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
