"use client";

import { InterventionStatus } from "@/types";

const CONFIG: Record<InterventionStatus, { label: string; bg: string; text: string; border: string }> = {
  active: {
    label: "Active",
    bg: "var(--status-taught-bg)",
    text: "var(--status-taught-text)",
    border: "var(--status-taught-border)",
  },
  monitoring: {
    label: "Monitoring",
    bg: "var(--status-behind-bg)",
    text: "var(--status-behind-text)",
    border: "var(--status-behind-border)",
  },
  concluded: {
    label: "Concluded",
    bg: "var(--status-pending-bg)",
    text: "var(--status-pending-text)",
    border: "var(--status-pending-border)",
  },
};

export function InterventionStatusBadge({ status }: { status: InterventionStatus }) {
  const c = CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {c.label}
    </span>
  );
}
