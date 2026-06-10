import { Link, NavLink, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import Button from "../common/Button";

const navItems = [
  {
    to: "/dashboard",
    label: "홈",
  },
  {
    to: "/analysis/capture",
    label: "피부 분석",
  },
  {
    to: "/recommendations",
    label: "맞춤 추천",
  },
  {
    to: "/history",
    label: "분석 이력",
  },
  {
    to: "/mypage",
    label: "마이페이지",
  },
];

function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem("skinflow_token");
  const isLoggedIn = Boolean(token);

  const handleLogout = () => {
    localStorage.removeItem("skinflow_token");
    localStorage.removeItem("skinflow_user_email");
    localStorage.removeItem("skinflow_user");

    navigate("/login");
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" to={isLoggedIn ? "/dashboard" : "/"}>
          <span className="brand-icon">
            <Sparkles size={18} />
          </span>
          <span className="brand-text">SkinFlow</span>
        </Link>

        <nav className="desktop-nav" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          {isLoggedIn ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                로그아웃
              </Button>
              <Button to="/analysis/capture" size="sm">
                분석 시작
              </Button>
            </>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">
                로그인
              </Button>
              <Button to="/signup" size="sm">
                회원가입
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;