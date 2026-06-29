// React 앱을 화면에 그리기 위해 필요한 기본 라이브러리입니다.
// React는 화면 컴포넌트를 만들고, ReactDOM은 그 컴포넌트를 실제 HTML에 붙여줍니다.
import React from "react";
import ReactDOM from "react-dom/client";

// BrowserRouter는 주소창 URL에 따라 다른 페이지가 보이도록 도와주는 라우터 설정입니다.
// App.jsx 안의 <Routes>와 <Route>가 이 BrowserRouter 안에서 동작합니다.
import { BrowserRouter } from "react-router-dom";

// SkinFlow의 전체 페이지 이동 구조는 App.jsx에서 관리합니다.
import App from "./App.jsx";

// 전역 CSS입니다.
// 버튼, 카드, 페이지 여백, 모바일 하단 네비게이션 같은 공통 화면 스타일이 들어 있습니다.
import "./index.css";

// public/index.html의 <div id="root"></div>를 찾아서 React 앱을 시작합니다.
// 쉽게 말해, HTML의 root 영역 안에 SkinFlow 화면 전체를 넣는 시작점입니다.
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode는 개발 중에 잠재적인 문제를 더 빨리 발견하도록 도와주는 React 검사 모드입니다.
  // 실제 사용자 화면에 별도 UI를 추가하지는 않습니다.
  <React.StrictMode>
    {/* BrowserRouter로 App을 감싸야 /login, /dashboard 같은 URL 이동이 정상 동작합니다. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
