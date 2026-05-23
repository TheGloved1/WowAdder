import type { ReactNode } from "react";

interface WoWPanelProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}

export default function WoWPanel({ children, className = "", as: Tag = "div" }: WoWPanelProps) {
  return (
    <Tag
      className={`relative bg-wow-panel border border-wow-border-light rounded-sm
        before:pointer-events-none before:absolute before:inset-[1px]
        before:border before:border-wow-border-gold/30 before:rounded-sm
        ${className}`}
    >
      {children}
    </Tag>
  );
}
