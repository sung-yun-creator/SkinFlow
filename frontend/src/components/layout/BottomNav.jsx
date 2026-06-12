import { NavLink } from "react-router-dom";
import { Camera, Home, Sparkles, User, Utensils } from "lucide-react";

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
    to: "/diet-guide",
    label: "식습관",
    icon: Utensils,
  },
  {
    to: "/mypage",
    label: "내 정보",
    icon: User,
  },
];

function BottomNav() {
  return (
    <>
      <style>
        {`
          @media (max-width: 820px) {
            .bottom-nav {
              left: 12px;
              right: 12px;
              bottom: 12px;
              padding: 7px;
              border-radius: 24px;
              background: rgba(255, 255, 255, 0.94);
              border: 1px solid rgba(226, 232, 240, 0.92);
              box-shadow: 0 18px 48px rgba(15, 23, 42, 0.14);
              backdrop-filter: blur(18px);
            }

            .bottom-nav-item {
              position: relative;
              min-height: 58px;
              padding: 6px 4px;
              border-radius: 18px;
              display: grid;
              grid-template-rows: 28px auto;
              place-items: center;
              gap: 3px;
              color: #64748b;
              font-size: 10.5px;
              font-weight: 900;
              line-height: 1;
              letter-spacing: -0.02em;
              transition: color 0.18s ease, background 0.18s ease, transform 0.18s ease;
            }

            .bottom-nav-item:hover {
              color: #167d7f;
              background: rgba(22, 125, 127, 0.06);
            }

            .bottom-nav-item.active {
              color: #167d7f;
              background: transparent;
            }

            .bottom-nav-icon-tile {
              width: 30px;
              height: 30px;
              min-width: 30px;
              min-height: 30px;
              border-radius: 12px;
              display: grid;
              place-items: center;
              line-height: 0;
              color: currentColor;
              background: transparent;
              border: 1px solid transparent;
              transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
            }

            .bottom-nav-icon-tile svg {
              display: block;
              width: 18px !important;
              height: 18px !important;
              min-width: 18px;
              min-height: 18px;
              margin: 0;
              transform: none;
              stroke-width: 2.2;
            }

            .bottom-nav-label {
              display: block;
              color: currentColor;
              line-height: 1;
              white-space: nowrap;
            }

            .bottom-nav-item.active .bottom-nav-icon-tile {
              background: linear-gradient(135deg, #f2fbfb 0%, #ffffff 52%, #fff1f4 100%);
              border-color: rgba(226, 232, 240, 0.95);
              box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
            }

            .bottom-nav-item.active::after {
              content: "";
              position: absolute;
              left: 50%;
              bottom: 3px;
              width: 4px;
              height: 4px;
              border-radius: 999px;
              transform: translateX(-50%);
              background: #167d7f;
            }
          }
        `}
      </style>

      <nav className="bottom-nav" aria-label="모바일 주요 메뉴">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink key={item.to} to={item.to} className="bottom-nav-item">
              <span className="bottom-nav-icon-tile" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}

export default BottomNav;
