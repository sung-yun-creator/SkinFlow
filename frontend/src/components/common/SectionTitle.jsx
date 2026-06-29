// SectionTitle.jsx
// 페이지 섹션의 제목 영역을 통일하기 위한 공통 컴포넌트입니다.
// 작은 강조 문구(eyebrow), 큰 제목(title), 설명(description)을 같은 구조로 보여줍니다.
// align 값으로 왼쪽 정렬/가운데 정렬을 바꿀 수 있습니다.
// 각 페이지에서 제목 스타일을 매번 새로 만들지 않게 도와줍니다.
function SectionTitle({ eyebrow, title, description, align = "left" }) {
  return (
    <div className={`section-title section-title-${align}`}>
      {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

export default SectionTitle;