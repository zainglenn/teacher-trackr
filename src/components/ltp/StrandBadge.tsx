"use client";

import { Badge } from "@/components/ui/badge";

const STRAND_VARS: Record<string, { bg: string; text: string; border: string }> = {
  RL: { bg: "var(--strand-rl-bg)", text: "var(--strand-rl-text)", border: "var(--strand-rl-border)" },
  RI: { bg: "var(--strand-ri-bg)", text: "var(--strand-ri-text)", border: "var(--strand-ri-border)" },
  W:  { bg: "var(--strand-w-bg)",  text: "var(--strand-w-text)",  border: "var(--strand-w-border)"  },
  SL: { bg: "var(--strand-sl-bg)", text: "var(--strand-sl-text)", border: "var(--strand-sl-border)" },
  L:  { bg: "var(--strand-l-bg)",  text: "var(--strand-l-text)",  border: "var(--strand-l-border)"  },
};

// Legacy Tailwind classes kept for any consumers that still use STRAND_COLORS directly
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
  variant?: "default" | "muted";
  className?: string;
}

export function StrandBadge({ code, variant = "default", className }: StrandBadgeProps) {
  const strand = strandFromCode(code);
  const vars = STRAND_VARS[strand];

  if (!vars) {
    return (
      <Badge variant="outline" className={`font-mono text-xs px-1.5 py-0 ${className ?? ""}`}>
        {code}
      </Badge>
    );
  }

  if (variant === "muted") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-mono ${className ?? ""}`}
        style={{ color: vars.text }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: vars.text }}
        />
        {strand}
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs px-1.5 py-0 ${className ?? ""}`}
      style={{
        backgroundColor: vars.bg,
        color: vars.text,
        borderColor: vars.border,
      }}
    >
      {code}
    </Badge>
  );
}
