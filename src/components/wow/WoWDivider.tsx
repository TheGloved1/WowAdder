export default function WoWDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className='via-wow-border-gold/40 h-px flex-1 bg-gradient-to-r from-transparent to-transparent' />
      <div className='border-wow-border-gold/60 h-1.5 w-1.5 rotate-45 border' />
      <div className='via-wow-border-gold/40 h-px flex-1 bg-gradient-to-r from-transparent to-transparent' />
    </div>
  );
}
