export type UnitStatus = "draft" | "submitted" | "approved" | "revision";
export type ComputedLTPStatus = "fully_approved" | "awaiting_review" | "has_revisions" | "partially_approved" | "in_progress";

export function ltpAggregateStatus(units: { status: UnitStatus }[]): {
  computed: ComputedLTPStatus;
  stored: "draft" | "submitted" | "approved" | "revision";
} {
  if (units.length === 0) return { computed: "in_progress", stored: "draft" };

  const statuses = units.map((u) => u.status);
  const allApproved = statuses.every((s) => s === "approved");
  const anyApproved = statuses.some((s) => s === "approved");
  const anyRevision = statuses.some((s) => s === "revision");
  const anySubmitted = statuses.some((s) => s === "submitted");
  const anyDraft = statuses.some((s) => s === "draft");

  if (allApproved) return { computed: "fully_approved", stored: "approved" };
  if (!anyDraft && !anyRevision && anySubmitted) return { computed: "awaiting_review", stored: "submitted" };
  if (anyRevision && !anySubmitted) return { computed: "has_revisions", stored: "revision" };
  if (anyApproved) return { computed: "partially_approved", stored: "submitted" };
  return { computed: "in_progress", stored: "draft" };
}

export const COMPUTED_LTP_STATUS_CONFIG: Record<ComputedLTPStatus, { label: string; className: string }> = {
  fully_approved:     { label: "Fully Approved",     className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  awaiting_review:    { label: "Awaiting Review",    className: "bg-amber-100 text-amber-700 border-amber-200" },
  has_revisions:      { label: "Has Revisions",      className: "bg-rose-100 text-rose-700 border-rose-200" },
  partially_approved: { label: "Partially Approved", className: "bg-blue-100 text-blue-700 border-blue-200" },
  in_progress:        { label: "In Progress",        className: "bg-muted text-muted-foreground border-muted" },
};

export const UNIT_STATUS_CONFIG: Record<UnitStatus, { label: string; className: string }> = {
  draft:     { label: "Draft",          className: "bg-muted text-muted-foreground border-muted" },
  submitted: { label: "Submitted",      className: "bg-amber-100 text-amber-700 border-amber-200" },
  approved:  { label: "Approved",       className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  revision:  { label: "Needs Revision", className: "bg-rose-100 text-rose-700 border-rose-200" },
};
