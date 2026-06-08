import { Link } from "react-router-dom";

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
  const className = [
    "sf-button",
    `sf-button-${variant}`,
    `sf-button-${size}`,
    full ? "sf-button-full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (to) {
    return (
      <Link className={className} to={to}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default Button;