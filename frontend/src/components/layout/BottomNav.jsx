import { NavLink } from "react-router-dom";
import { Home, Camera, LineChart, Sparkles, User } from "lucide-react";

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
    to: "/analysis/result",
    label: "결과",
    icon: LineChart,
  },
  {
    to: "/recommendations",
    label: "추천",
    icon: Sparkles,
  },
  {
    to: "/mypage",
    label: "내 정보",
    icon: User,
  },
];

function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink key={item.to} to={item.to} className="bottom-nav-item">
            <Icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default BottomNav;