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
        className={`rounded-lg border border-border px-6 py-3 font-medium text-body transition-colors hover:border-accent hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-lg bg-accent px-6 py-3 font-semibold text-white shadow-[0_0_20px_var(--color-accent-glow)] transition-all hover:bg-accent-hover hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
}
