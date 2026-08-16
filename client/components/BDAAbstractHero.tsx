interface BDAAbstractHeroProps {
  className?: string;
}

/**
 * Decorative overlay for BDA Learning System hero sections.
 * It uses only BDA blue/white geometry and never captures interaction.
 */
export function BDAAbstractHero({ className = "" }: BDAAbstractHeroProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.2),transparent_19%),radial-gradient(circle_at_74%_100%,rgba(15,145,224,0.55),transparent_34%)]" />
      <div className="absolute -right-20 -top-28 h-[23rem] w-[23rem] rounded-full border border-white/20" />
      <div className="absolute -right-2 -top-10 h-[17rem] w-[17rem] rounded-full border border-white/15" />
      <div className="absolute -bottom-56 right-[18%] h-[27rem] w-[27rem] rounded-full border border-white/10" />
      <div className="absolute right-[10%] top-[10%] h-[58%] w-[46%] rotate-[18deg] opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="absolute right-[21%] top-[31%] h-2.5 w-2.5 rounded-full bg-white/70 shadow-[68px_42px_0_rgba(255,255,255,0.45),145px_-20px_0_rgba(255,255,255,0.42),210px_60px_0_rgba(255,255,255,0.4)]" />
      <div className="absolute right-[15%] top-[42%] h-px w-[19rem] -rotate-[17deg] bg-white/25" />
      <div className="absolute right-[25%] top-[58%] h-px w-[13rem] rotate-[28deg] bg-white/20" />
    </div>
  );
}
