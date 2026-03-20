"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit";
}

export default function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
}: ButtonProps) {
  if (variant === "secondary") {
    return (
      <button
        type={type}
        onClick={onClick}
        className={`rounded-lg border border-border-secondary bg-transparent px-[22px] py-2.5 text-sm font-medium text-body transition-[border-color,color] duration-200 hover:border-tertiary hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-lg bg-gradient-to-br from-accent to-accent-end px-[22px] py-2.5 text-sm font-medium text-white shadow-[0_0_20px_var(--color-accent-glow)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_0_30px_rgba(99,102,241,0.35)] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}
