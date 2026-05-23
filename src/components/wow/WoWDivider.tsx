export default function WoWDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-wow-border-gold/40 to-transparent" />
      <div className="w-1.5 h-1.5 rotate-45 border border-wow-border-gold/60" />
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-wow-border-gold/40 to-transparent" />
    </div>
  );
}
