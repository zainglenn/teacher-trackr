import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ label, value, sub, trend, icon: Icon, iconColor = "text-muted-foreground" }: StatCardProps) {
  return (
    <div className="border border-border bg-card rounded-[var(--radius)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          {trend && <p className="text-xs text-muted-foreground mt-0.5">{trend}</p>}
        </div>
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
      </div>
    </div>
  );
}
