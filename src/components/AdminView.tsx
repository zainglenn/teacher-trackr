"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { Trash2, FileText, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useLongTermPlans } from "@/hooks/useLongTermPlans";
import { supabase } from "@/lib/supabase";
import { ltpAggregateStatus, COMPUTED_LTP_STATUS_CONFIG, UNIT_STATUS_CONFIG } from "@/lib/ltpStatus";

type AdminTab = "ltps" | "units";

async function adminDelete(endpoint: string, body: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(endpoint, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Delete failed");
  }
}

interface AdminViewProps {
  userId: string;
  tab?: "platform" | "audit";
  schoolId?: string | null;
}

export function AdminView({ userId, tab: activeSection = "audit", schoolId }: AdminViewProps) {
  const { plans, loading } = useLongTermPlans(userId, true, { schoolId });
  const [tab, setTab] = useState<AdminTab>("ltps");
  const [confirmLtp, setConfirmLtp] = useState<{ id: string; title: string } | null>(null);
  const [confirmUnit, setConfirmUnit] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [expandedLtp, setExpandedLtp] = useState<Set<string>>(new Set());

  const allUnits = plans.flatMap((p) =>
    (p.units ?? []).map((u) => ({ ...u, ltpTitle: p.title, teacherName: p.teacher?.full_name ?? p.teacher?.email ?? "—" }))
  );

  async function handleDeleteLtp() {
    if (!confirmLtp) return;
    setDeleting(true);
    setError("");
    try {
      await adminDelete("/api/admin/delete-ltp", { ltpId: confirmLtp.id });
      setConfirmLtp(null);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteUnit() {
    if (!confirmUnit) return;
    setDeleting(true);
    setError("");
    try {
      await adminDelete("/api/admin/delete-unit", { unitId: confirmUnit.id });
      setConfirmUnit(null);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setDeleting(false);
    }
  }

  function toggleExpand(ltpId: string) {
    setExpandedLtp((prev) => {
      const next = new Set(prev);
      next.has(ltpId) ? next.delete(ltpId) : next.add(ltpId);
      return next;
    });
  }

  const tabs: { key: AdminTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "ltps", label: "Long Term Plans", icon: FileText, count: plans.length },
    { key: "units", label: "Unit Plans", icon: BookOpen, count: allUnits.length },
  ];

  if (activeSection === "platform") {
    return (
      <PageContainer title="Platform Settings" description="Configure school-wide settings for the curriculum tracker.">
        <div className="max-w-lg space-y-6">
          <div className="border rounded-lg p-5 space-y-4 bg-background">
            <h3 className="text-sm font-semibold text-foreground">School Information</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">School Name</label>
                <input
                  type="text"
                  defaultValue="Dubai Schools Al Khawaneej"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Current School Year</label>
                <input
                  type="text"
                  defaultValue="2025-26"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Default Role for New Sign-ups</label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/40 text-sm text-muted-foreground">
                  Teacher
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Platform configuration is managed by your system administrator. Contact support to change these values.</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Curriculum Audit" description="Read-only view of all plans and units across all teachers for support purposes.">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "text-primary border-b-2 border-primary -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : tab === "ltps" ? (
          /* LTPs table */
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-8" />
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36 hidden sm:table-cell">Teacher</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28 hidden md:table-cell">School Year</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-16 hidden sm:table-cell">Units</th>
                  <th className="w-16 px-4" />
                </tr>
              </thead>
              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No long term plans found.</td>
                  </tr>
                ) : plans.map((plan) => {
                  const isExpanded = expandedLtp.has(plan.id);
                  const units = plan.units ?? [];
                  const { computed } = ltpAggregateStatus(units);
                  const { label: statusLabel, className: statusClass } = COMPUTED_LTP_STATUS_CONFIG[computed];
                  return [
                    <tr key={plan.id} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3">
                        {units.length > 0 && (
                          <button onClick={() => toggleExpand(plan.id)} className="text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{plan.title}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        {plan.teacher?.full_name ?? plan.teacher?.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{plan.school_year}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{units.length}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmLtp({ id: plan.id, title: plan.title })}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          title="Delete LTP"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>,
                    ...(isExpanded ? units.map((unit) => (
                      <tr key={`sub-${unit.id}`} className="border-t bg-muted/10">
                        <td className="px-3 py-2" />
                        <td className="px-4 py-2 pl-8 text-muted-foreground text-xs" colSpan={4}>
                          Term {unit.term} · Unit {unit.unit_number} · <span className="font-medium text-foreground">{unit.title}</span>
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmUnit({ id: unit.id, title: unit.title })}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                            title="Delete unit"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )) : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Units table */
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Unit Title</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40 hidden sm:table-cell">Long Term Plan</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36 hidden md:table-cell">Teacher</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">Term</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">Status</th>
                  <th className="w-16 px-4" />
                </tr>
              </thead>
              <tbody>
                {allUnits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No unit plans found.</td>
                  </tr>
                ) : allUnits.map((unit) => (
                  <tr key={unit.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{unit.title}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{unit.ltpTitle}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{unit.teacherName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      Term {unit.term} · Unit {unit.unit_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${UNIT_STATUS_CONFIG[unit.status]?.className ?? ""}`}>
                        {UNIT_STATUS_CONFIG[unit.status]?.label ?? unit.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmUnit({ id: unit.id, title: unit.title })}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        title="Delete unit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmLtp}
        onClose={() => { setConfirmLtp(null); setError(""); }}
        title="Delete Long Term Plan"
        description={`This will permanently delete "${confirmLtp?.title}" and all its units and standards mappings. This cannot be undone.`}
        confirmLabel="Delete LTP"
        variant="destructive"
        onConfirm={handleDeleteLtp}
        loading={deleting}
      />

      <ConfirmModal
        open={!!confirmUnit}
        onClose={() => { setConfirmUnit(null); setError(""); }}
        title="Delete Unit Plan"
        description={`This will permanently delete the unit "${confirmUnit?.title}" and all its standards mappings. This cannot be undone.`}
        confirmLabel="Delete Unit"
        variant="destructive"
        onConfirm={handleDeleteUnit}
        loading={deleting}
      />
    </PageContainer>
  );
}
