"use client";

import { Badge } from "@/components/ui/badge";

export const STRAND_COLORS: Record<string, string> = {
  RL: "bg-blue-100 text-blue-700 border-blue-200",
  RI: "bg-violet-100 text-violet-700 border-violet-200",
  W:  "bg-amber-100 text-amber-700 border-amber-200",
  SL: "bg-emerald-100 text-emerald-700 border-emerald-200",
  L:  "bg-rose-100 text-rose-700 border-rose-200",
};

export function strandFromCode(code: string) {
  return code.split(".")[0];
}

interface StrandBadgeProps {
  code: string;
  className?: string;
}

export function StrandBadge({ code, className }: StrandBadgeProps) {
  const strand = strandFromCode(code);
  const color = STRAND_COLORS[strand] ?? "bg-muted text-muted-foreground border-muted";
  return (
    <Badge variant="outline" className={`font-mono text-xs px-1.5 py-0 ${color} ${className ?? ""}`}>
      {code}
    </Badge>
  );
}
