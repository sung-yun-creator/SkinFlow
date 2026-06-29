// Card.jsx
// 흰색 카드 박스를 만들 때 사용하는 공통 UI 컴포넌트입니다.
// 대시보드, 추천, 이력, 마이페이지처럼 대부분의 화면에서 콘텐츠를 묶는 기본 단위입니다.
// className을 추가로 받을 수 있어 페이지별 카드 여백이나 배치를 따로 조정할 수 있습니다.
function Card({ children, className = "" }) {
  return <div className={`sf-card ${className}`}>{children}</div>;
}

export default Card;