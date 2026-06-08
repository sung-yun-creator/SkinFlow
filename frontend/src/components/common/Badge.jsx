function Badge({ children, variant = "primary" }) {
  return <span className={`sf-badge sf-badge-${variant}`}>{children}</span>;
}

export default Badge;