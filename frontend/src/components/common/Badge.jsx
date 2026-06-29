// Badge.jsx
// 작은 라벨 형태의 공통 UI 컴포넌트입니다.
// 예: "최근 분석", "자동 추천 기준", "양호"처럼 짧은 상태 문구를 강조할 때 사용합니다.
// variant 값에 따라 sf-badge-primary, sf-badge-accent 같은 CSS 클래스가 붙습니다.
// children에는 실제 화면에 표시할 라벨 문구가 들어갑니다.
function Badge({ children, variant = "primary" }) {
  return <span className={`sf-badge sf-badge-${variant}`}>{children}</span>;
}

export default Badge;