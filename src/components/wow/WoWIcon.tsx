import type { ReactNode } from "react";

interface WoWIconFrameProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function WoWIconFrame({ children, size = "md", className = "" }: WoWIconFrameProps) {
  const sizes: Record<string, string> = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <div
      className={`${sizes[size]} shrink-0 rounded-sm overflow-hidden bg-wow-panel
        border border-wow-border-light relative
        before:pointer-events-none before:absolute before:inset-[1px]
        before:border before:border-wow-border-gold/20 before:rounded-sm
        ${className}`}
    >
      {children}
    </div>
  );
}
