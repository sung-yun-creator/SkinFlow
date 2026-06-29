// Button.jsx
// SkinFlow에서 반복해서 사용하는 공통 버튼 컴포넌트입니다.
// to 값이 있으면 페이지 이동용 Link로, to 값이 없으면 일반 button으로 렌더링됩니다.
import { Link } from "react-router-dom";

// 버튼의 모양과 동작을 props로 제어합니다.
// variant는 색상 종류, size는 크기, full은 가로 전체 사용 여부를 의미합니다.
function Button({
  children,
  to,
  type = "button",
  variant = "primary",
  size = "md",
  full = false,
  onClick,
  disabled = false,
}) {
  // 여러 CSS 클래스를 배열로 모은 뒤 빈 값은 제거하고 하나의 문자열로 합칩니다.
  // 이렇게 하면 조건부 클래스(full 여부)를 깔끔하게 처리할 수 있습니다.
  const className = [
    "sf-button",
    `sf-button-${variant}`,
    `sf-button-${size}`,
    full ? "sf-button-full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // to가 있으면 클릭 시 다른 페이지로 이동하는 링크 버튼으로 사용합니다.
  if (to) {
    return (
      <Link className={className} to={to}>
        {children}
      </Link>
    );
  }

  // to가 없으면 폼 제출, 모달 열기처럼 현재 화면 안에서 동작하는 일반 버튼으로 사용합니다.
  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default Button;