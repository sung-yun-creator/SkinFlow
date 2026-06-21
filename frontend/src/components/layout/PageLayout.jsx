import Header from "./Header";
import BottomNav from "./BottomNav";
import ChatWidget from "../common/ChatWidget";

function PageLayout({ children, showHeader = true, showBottomNav = true }) {
  return (
    <div className="app-shell">
      {showHeader && <Header />}

      <main className="page">
        <div className="page-inner">{children}</div>
      </main>

      {showBottomNav && <BottomNav />}
      <ChatWidget />
    </div>
  );
}

export default PageLayout;
