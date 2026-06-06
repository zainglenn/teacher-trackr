"use client";

import { CheckCircle2, Clock, Circle, AlertTriangle } from "lucide-react";
import { PipelineStatus } from "@/hooks/useStandardPipeline";

const CONFIG: Record<PipelineStatus, {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
}> = {
  taught: {
    label: "Taught",
    icon: CheckCircle2,
    bg: "var(--status-taught-bg)",
    text: "var(--status-taught-text)",
    border: "var(--status-taught-border)",
  },
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    bg: "var(--status-behind-bg)",
    text: "var(--status-behind-text)",
    border: "var(--status-behind-border)",
  },
  planned: {
    label: "In a unit",
    icon: Circle,
    bg: "var(--status-pending-bg)",
    text: "var(--status-pending-text)",
    border: "var(--status-pending-border)",
  },
  unmapped: {
    label: "Not mapped",
    icon: AlertTriangle,
    bg: "var(--status-overdue-bg)",
    text: "var(--status-overdue-text)",
    border: "var(--status-overdue-border)",
  },
};

interface Props {
  status: PipelineStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: Props) {
  const c = CONFIG[status];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium border ${size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"}`}
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      <Icon className={size === "sm" ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} />
      {c.label}
    </span>
  );
}
