function Card({ children, className = "" }) {
  return <div className={`sf-card ${className}`}>{children}</div>;
}

export default Card;