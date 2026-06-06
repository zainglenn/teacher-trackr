"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Building2, Plus, Search, MoreHorizontal, Eye, Ban, CheckCircle } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmModal } from "@/components/ui/modal";
import { CreateSchoolModal } from "@/components/CreateSchoolModal";
import { SchoolDetailSheet } from "@/components/SchoolDetailSheet";
import { supabase } from "@/lib/supabase";

export interface SchoolRow {
  id: string;
  name: string;
  city: string;
  country: string;
  curriculum: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
}

const CURRICULUM_COLORS: Record<string, string> = {
  American: "bg-blue-50 text-blue-700 border-blue-200",
  British:  "bg-violet-50 text-violet-700 border-violet-200",
  IB:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  Other:    "bg-muted text-muted-foreground border-border",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function PlatformAdminView() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailSchoolId, setDetailSchoolId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<SchoolRow | null>(null);
  const [suspendConfirmValue, setSuspendConfirmValue] = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/platform/list-schools", {
      headers: { authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
    setSchools(json.schools ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const filtered = useMemo(() =>
    schools.filter((s) => {
      const q = search.toLowerCase();
      return !q || s.name.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q);
    }),
    [schools, search]
  );

  async function handleSuspend() {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/platform/suspend-school", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ schoolId: suspendTarget.id }),
    });
    setSchools((prev) => prev.map((s) => s.id === suspendTarget.id ? { ...s, is_active: false } : s));
    setSuspendTarget(null);
    setSuspendConfirmValue("");
    setSuspendLoading(false);
  }

  async function handleUnsuspend(schoolId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/platform/unsuspend-school", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ schoolId }),
    });
    setSchools((prev) => prev.map((s) => s.id === schoolId ? { ...s, is_active: true } : s));
  }

  return (
    <>
      <div className="hidden md:block">
        <PageContainer
          title="Schools"
          description={`${schools.length} school${schools.length !== 1 ? "s" : ""} on the platform`}
          action={
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New School
            </Button>
          }
        >
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or city…"
              className="pl-8 h-8 text-sm"
            />
          </div>

          <div className="border border-border rounded-lg overflow-hidden bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">School</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">City</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Curriculum</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-16">Users</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell w-28">Created</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-24">Status</th>
                  <th className="px-4 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {search ? "No schools match your search." : "No schools yet — create one to get started."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((school) => (
                    <tr
                      key={school.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setDetailSchoolId(school.id)}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setDetailSchoolId(school.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-foreground">{school.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {school.city}{school.country ? `, ${school.country}` : ""}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {school.curriculum && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CURRICULUM_COLORS[school.curriculum] ?? CURRICULUM_COLORS.Other}`}>
                            {school.curriculum}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{school.user_count}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{formatDate(school.created_at)}</td>
                      <td className="px-4 py-3">
                        {school.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                            <Ban className="h-3 w-3" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailSchoolId(school.id)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            {school.is_active ? (
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() => { setSuspendTarget(school); setSuspendConfirmValue(""); }}
                              >
                                <Ban className="h-3.5 w-3.5 mr-2" /> Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUnsuspend(school.id)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-2" /> Unsuspend
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && !search && schools.length === 1 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              Use <strong>New School</strong> above to provision additional schools.
            </p>
          )}
        </PageContainer>
      </div>

      <div className="flex md:hidden flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium">Platform admin requires a desktop browser.</p>
        <p className="text-xs text-muted-foreground mt-1">Please use a screen wider than 768px.</p>
      </div>

      <CreateSchoolModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); fetchSchools(); }}
      />

      <SchoolDetailSheet
        schoolId={detailSchoolId}
        onClose={() => setDetailSchoolId(null)}
        onSuspend={(s) => { setSuspendTarget(s); setSuspendConfirmValue(""); }}
        onUnsuspend={(id) => { handleUnsuspend(id); setDetailSchoolId(null); }}
        onSchoolUpdated={(updated) => setSchools((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s))}
      />

      <ConfirmModal
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        title="Suspend school"
        description={
          <span>
            Type <strong>{suspendTarget?.name}</strong> to confirm. All users at this school will be locked out immediately.
          </span>
        }
        confirmLabel="Suspend"
        confirmClassName="bg-rose-600 hover:bg-rose-700 text-white"
        disabled={suspendConfirmValue.toLowerCase() !== suspendTarget?.name.toLowerCase() || suspendLoading}
      >
        <Input
          value={suspendConfirmValue}
          onChange={(e) => setSuspendConfirmValue(e.target.value)}
          placeholder={suspendTarget?.name}
          className="mt-3"
          autoFocus
        />
      </ConfirmModal>
    </>
  );
}
