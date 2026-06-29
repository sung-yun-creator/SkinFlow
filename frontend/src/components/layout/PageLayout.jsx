// PageLayout.jsx
// 여러 페이지에서 공통으로 사용하는 전체 화면 틀입니다.
// Header, 본문 영역, 모바일 BottomNav, ChatWidget을 한 번에 감싸서 페이지마다 같은 구조를 유지합니다.
import Header from "./Header";
import BottomNav from "./BottomNav";
import ChatWidget from "../common/ChatWidget";

// children은 이 레이아웃 안에 들어올 실제 페이지 내용입니다.
// showHeader/showBottomNav 값으로 특정 화면에서 헤더나 하단 네비를 숨길 수 있습니다.
function PageLayout({ children, showHeader = true, showBottomNav = true }) {
  return (
    <div className="app-shell">
      {/* showHeader가 true일 때만 상단 헤더를 보여줍니다. */}
      {showHeader && <Header />}

      <main className="page">
        {/* page-inner는 페이지 내용을 가운데 정렬하고 최대 너비를 맞추는 공통 컨테이너입니다. */}
        <div className="page-inner">{children}</div>
      </main>

      {/* 모바일 하단 네비와 채팅 위젯은 모든 주요 화면에서 반복해서 사용됩니다. */}
      {showBottomNav && <BottomNav />}
      <ChatWidget />
    </div>
  );
}

export default PageLayout;
