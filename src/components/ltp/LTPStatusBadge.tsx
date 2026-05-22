"use client";

import { Badge } from "@/components/ui/badge";
import { LTPStatus } from "@/types";

export const LTP_STATUS_CONFIG: Record<LTPStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",          className: "bg-muted text-muted-foreground" },
  submitted: { label: "Submitted",      className: "bg-amber-100 text-amber-700" },
  approved:  { label: "Approved",       className: "bg-emerald-100 text-emerald-700" },
  revision:  { label: "Needs Revision", className: "bg-rose-100 text-rose-700" },
};

export function LTPStatusBadge({ status }: { status: LTPStatus }) {
  const cfg = LTP_STATUS_CONFIG[status] ?? LTP_STATUS_CONFIG.draft;
  return <Badge className={`text-xs ${cfg.className}`}>{cfg.label}</Badge>;
}
