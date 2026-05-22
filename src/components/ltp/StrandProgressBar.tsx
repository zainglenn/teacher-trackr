"use client";

interface StrandProgressBarProps {
  strand: string;
  mapped: number;
  total: number;
}

export function StrandProgressBar({ strand, mapped, total }: StrandProgressBarProps) {
  const pct = total > 0 ? Math.round((mapped / total) * 100) : 0;
  const barColor = pct === 100 ? "bg-emerald-500" : pct === 0 ? "bg-rose-400" : "bg-amber-400";
  return (
    <div className="flex items-center gap-1.5 min-w-[100px]">
      <span className="text-xs font-mono font-semibold text-muted-foreground w-6 shrink-0">{strand}</span>
      <div className="flex h-1.5 w-16 rounded-full bg-muted overflow-hidden shrink-0">
        <div className={`${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{mapped}/{total}</span>
    </div>
  );
}
