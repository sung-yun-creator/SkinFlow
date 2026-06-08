import { Link, NavLink } from "react-router-dom";
import { Sparkles } from "lucide-react";
import Button from "../common/Button";

function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" to="/">
          <span className="brand-icon">
            <Sparkles size={18} />
          </span>
          <span className="brand-text">SkinFlow</span>
        </Link>

        <nav className="desktop-nav">
          <NavLink to="/dashboard">대시보드</NavLink>
          <NavLink to="/analysis/capture">피부 분석</NavLink>
          <NavLink to="/recommendations">맞춤 추천</NavLink>
          <NavLink to="/history">분석 이력</NavLink>
        </nav>

        <div className="header-actions">
          <Button to="/login" variant="ghost" size="sm">
            로그인
          </Button>
          <Button to="/analysis/capture" size="sm">
            분석 시작
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Header;