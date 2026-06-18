import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Clock3,
  LogIn,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  AUTH_SESSION_CLEARED_EVENT,
  AUTH_STORAGE_KEYS,
  clearLoginSession,
} from "../../api/authSession";

const navItems = [
  { label: "대시보드", to: "/dashboard" },
  { label: "맞춤 추천", to: "/recommendations" },
  { label: "식습관 가이드", to: "/diet-guide" },
];

function getStoredUserName() {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.user);

  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      const userCandidates = [
        parsedUser?.name,
        parsedUser?.userName,
        parsedUser?.username,
        parsedUser?.nickname,
        parsedUser?.email,
      ];
      const userName = userCandidates.find((value) => typeof value === "string" && value.trim());

      if (userName) {
        return userName.trim();
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    }
  }

  const email = localStorage.getItem(AUTH_STORAGE_KEYS.userEmail);

  if (typeof email === "string" && email.trim()) {
    return email.trim();
  }

  const candidates = ["skinflow_user_name", "skinflow_username", "userName", "name"];

  for (const key of candidates) {
    const value = localStorage.getItem(key);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "내 계정";
}

function getAuthSnapshot() {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);

  return {
    isLoggedIn: Boolean(token),
    userName: token ? getStoredUserName() : "로그인이 필요합니다",
  };
}

function getInitials(name) {
  if (!name || name === "내 계정") return "ME";

  const trimmed = name.trim();

  if (/^[가-힣]/.test(trimmed)) {
    return trimmed.slice(0, 1);
  }

  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Header() {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authSnapshot, setAuthSnapshot] = useState(getAuthSnapshot);

  const { isLoggedIn, userName } = authSnapshot;
  const initials = getInitials(userName);

  useEffect(() => {
    function refreshAuthSnapshot() {
      setAuthSnapshot(getAuthSnapshot());
      setIsProfileOpen(false);
    }

    function handleClickOutside(event) {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("storage", refreshAuthSnapshot);
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, refreshAuthSnapshot);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("storage", refreshAuthSnapshot);
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, refreshAuthSnapshot);
    };
  }, []);

  function closeProfileMenu() {
    setIsProfileOpen(false);
  }

  function handleLogout() {
    clearLoginSession();
    setAuthSnapshot(getAuthSnapshot());
    setIsProfileOpen(false);
    navigate("/login");
  }

  return (
    <header className="sf-app-header">
      <style>{`
        .sf-app-header {
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          border-bottom: 1px solid rgba(226, 232, 240, 0.78);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .sf-header-inner {
          width: min(1180px, calc(100% - 40px));
          height: 72px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
        }

        .sf-header-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #0f172a;
          text-decoration: none;
          flex: 0 0 auto;
        }

        .sf-header-logo-mark {
          width: 36px;
          height: 36px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f 0%, #14b8a6 100%);
          box-shadow: 0 10px 24px rgba(22, 125, 127, 0.18);
        }

        .sf-header-logo-mark svg {
          width: 19px;
          height: 19px;
          stroke-width: 2.2;
        }

        .sf-header-brand-text {
          color: #0f172a;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .sf-header-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 0;
          flex: 1 1 auto;
        }

        .sf-header-nav-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          color: #475569;
          font-size: 14px;
          font-weight: 850;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          transition:
            color 0.18s ease,
            background-color 0.18s ease,
            transform 0.18s ease;
        }

        .sf-header-nav-link:hover {
          color: #0f172a;
          background: rgba(22, 125, 127, 0.07);
        }

        .sf-header-nav-link.is-active {
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
        }

        .sf-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex: 0 0 auto;
        }

        .sf-header-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          padding: 0 19px;
          border-radius: 999px;
          color: #ffffff;
          background: linear-gradient(135deg, #167d7f 0%, #0f766e 100%);
          font-size: 13px;
          font-weight: 950;
          line-height: 1;
          text-decoration: none;
          box-shadow: 0 12px 24px rgba(22, 125, 127, 0.18);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            filter 0.18s ease;
        }

        .sf-header-cta:hover {
          transform: translateY(-1px);
          filter: brightness(1.02);
          box-shadow: 0 16px 30px rgba(22, 125, 127, 0.24);
        }

        .sf-header-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 40px;
          padding: 0 16px;
          border: 1px solid rgba(22, 125, 127, 0.18);
          border-radius: 999px;
          color: #167d7f;
          background: rgba(255, 255, 255, 0.96);
          font-size: 13px;
          font-weight: 950;
          line-height: 1;
          text-decoration: none;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.055);
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background-color 0.18s ease;
        }

        .sf-header-login:hover {
          border-color: rgba(22, 125, 127, 0.3);
          background: rgba(22, 125, 127, 0.07);
          transform: translateY(-1px);
        }

        .sf-profile-menu-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sf-profile-trigger {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 42px;
          padding: 4px 8px 4px 4px;
          border: 1px solid rgba(203, 213, 225, 0.84);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          color: #0f172a;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
          transition:
            border-color 0.18s ease,
            background-color 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
        }

        .sf-profile-trigger:hover,
        .sf-profile-trigger.is-open {
          border-color: rgba(22, 125, 127, 0.28);
          background: #ffffff;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
        }

        .sf-profile-avatar {
          width: 34px;
          height: 34px;
          min-width: 34px;
          min-height: 34px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          overflow: hidden;
          box-sizing: border-box;
          color: #ffffff;
          background:
            radial-gradient(circle at 28% 20%, rgba(255, 255, 255, 0.24), transparent 28%),
            linear-gradient(135deg, #167d7f 0%, #14b8a6 100%);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: -0.02em;
          line-height: 1;
          text-align: center;
          box-shadow: 0 8px 18px rgba(22, 125, 127, 0.2);
        }

        .sf-profile-trigger svg {
          width: 15px;
          height: 15px;
          display: block;
          flex: 0 0 15px;
          color: #64748b;
          transition: transform 0.18s ease;
        }

        .sf-profile-trigger.is-open svg {
          transform: rotate(180deg);
        }

        .sf-profile-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 294px;
          max-width: calc(100vw - 28px);
          box-sizing: border-box;
          padding: 12px;
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background:
            radial-gradient(circle at 100% 0%, rgba(22, 125, 127, 0.07), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(248, 250, 252, 0.97));
          box-shadow:
            0 28px 60px rgba(15, 23, 42, 0.14),
            0 8px 20px rgba(15, 23, 42, 0.06);
          transform-origin: top right;
          animation: sfProfileDropdownIn 0.18s ease both;
        }

        @keyframes sfProfileDropdownIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .sf-profile-head {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 12px;
          align-items: center;
          padding: 8px 8px 12px;
        }

        .sf-profile-head-avatar {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          flex: 0 0 44px;
          overflow: hidden;
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.1);
          font-size: 13px;
          font-weight: 950;
          line-height: 1;
          text-align: center;
        }

        .sf-profile-head-copy {
          min-width: 0;
        }

        .sf-profile-head-copy strong {
          display: block;
          color: #0f172a;
          font-size: 16px;
          font-weight: 950;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }

        .sf-profile-head-copy span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.3;
        }

        .sf-profile-divider {
          height: 1px;
          margin: 0 4px 6px;
          background: rgba(226, 232, 240, 0.9);
        }

        .sf-profile-list {
          display: grid;
          gap: 4px;
        }

        .sf-profile-item {
          width: 100%;
          min-height: 48px;
          display: grid;
          grid-template-columns: 36px 1fr;
          align-items: center;
          gap: 11px;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 0;
          border-radius: 17px;
          color: #334155;
          background: transparent;
          font: inherit;
          font-size: 14px;
          font-weight: 850;
          line-height: 1.25;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
          transition:
            background-color 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .sf-profile-item:hover {
          color: #0f172a;
          background: rgba(22, 125, 127, 0.075);
          transform: translateX(1px);
        }

        .sf-profile-item-icon {
          position: relative;
          width: 36px;
          height: 36px;
          min-width: 36px;
          min-height: 36px;
          border-radius: 14px;
          display: block;
          flex: 0 0 36px;
          overflow: hidden;
          color: #167d7f;
          background: rgba(22, 125, 127, 0.08);
          line-height: 0;
        }

        .sf-profile-item-icon svg {
          position: absolute;
          top: 50%;
          left: 50%;
          display: block;
          width: 18px;
          height: 18px;
          margin: 0;
          transform: translate(-50%, -50%);
          transform-origin: center;
          pointer-events: none;
          stroke-width: 2.1;
        }

        .sf-profile-logout {
          color: #475569;
        }

        .sf-profile-logout:hover {
          color: #0f172a;
        }

        .sf-profile-logout .sf-profile-item-icon {
          color: #64748b;
          background: rgba(100, 116, 139, 0.09);
        }

        @media (max-width: 960px) {
          .sf-header-inner {
            width: min(100% - 28px, 1180px);
            height: 66px;
            gap: 14px;
          }

          .sf-header-brand-text {
            font-size: 18px;
          }

          .sf-header-nav {
            display: none;
          }

          .sf-header-cta {
            height: 38px;
            padding: 0 14px;
          }
        }

        @media (max-width: 560px) {
          .sf-header-inner {
            width: min(100% - 22px, 1180px);
          }

          .sf-header-brand-text {
            display: none;
          }

          .sf-header-cta {
            height: 36px;
            padding: 0 12px;
            font-size: 12px;
          }

          .sf-profile-dropdown {
            position: fixed;
            top: 74px;
            left: 14px;
            right: 14px;
            width: auto;
            max-width: none;
          }
        }
      `}</style>

      <div className="sf-header-inner">
        <Link className="sf-header-brand" to={isLoggedIn ? "/dashboard" : "/"} aria-label="SkinFlow 홈으로 이동">
          <span className="sf-header-logo-mark" aria-hidden="true">
            <Sparkles />
          </span>
          <span className="sf-header-brand-text">SkinFlow</span>
        </Link>

        {isLoggedIn && (
          <nav className="sf-header-nav" aria-label="주요 메뉴">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sf-header-nav-link${isActive ? " is-active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="sf-header-actions">
          {isLoggedIn ? (
            <Link className="sf-header-cta" to="/analysis/capture">
              분석 시작
            </Link>
          ) : (
            <Link className="sf-header-login" to="/login">
              <LogIn size={16} aria-hidden="true" />
              로그인
            </Link>
          )}

          {isLoggedIn && (
          <div className="sf-profile-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className={`sf-profile-trigger${isProfileOpen ? " is-open" : ""}`}
              aria-label="계정 메뉴 열기"
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((current) => !current)}
            >
              <span className="sf-profile-avatar" aria-hidden="true">
                {initials}
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>

            {isProfileOpen && (
              <div className="sf-profile-dropdown" role="menu" aria-label="계정 메뉴">
                <div className="sf-profile-head">
                  <span className="sf-profile-head-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <div className="sf-profile-head-copy">
                    <strong>{userName}</strong>
                    <span>피부 관리 계정</span>
                  </div>
                </div>

                <div className="sf-profile-divider" />

                <div className="sf-profile-list">
                  <Link className="sf-profile-item" to="/mypage" role="menuitem" onClick={closeProfileMenu}>
                    <span className="sf-profile-item-icon" aria-hidden="true">
                      <UserRound />
                    </span>
                    <span>마이페이지</span>
                  </Link>

                  <Link className="sf-profile-item" to="/history" role="menuitem" onClick={closeProfileMenu}>
                    <span className="sf-profile-item-icon" aria-hidden="true">
                      <Clock3 />
                    </span>
                    <span>분석 이력</span>
                  </Link>

                  <Link
                    className="sf-profile-item"
                    to="/settings"
                    role="menuitem"
                    onClick={closeProfileMenu}
                  >
                    <span className="sf-profile-item-icon" aria-hidden="true">
                      <Settings />
                    </span>
                    <span>설정</span>
                  </Link>

                  <div className="sf-profile-divider" />

                  <button
                    type="button"
                    className="sf-profile-item sf-profile-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <span className="sf-profile-item-icon" aria-hidden="true">
                      <LogOut />
                    </span>
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
