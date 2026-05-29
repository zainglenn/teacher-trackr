"use client";

import { useState, useEffect } from "react";
import { Ban, CheckCircle, Users, ClipboardList, Clock, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { SchoolRow } from "@/components/PlatformAdminView";

interface SchoolDetail {
  school: { id: string; name: string; is_active: boolean; city: string; country: string; curriculum: string; created_at: string };
  profiles: { id: string; full_name: string | null; username: string; role: string }[];
  stats: { userCount: number; planCount: number; lastActivity: string | null };
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", hod: "HOD", teacher: "Teacher", platform_admin: "Platform",
};
const ROLE_COLORS: Record<string, string> = {
  admin:   "bg-rose-50 text-rose-700 border-rose-200",
  hod:     "bg-violet-50 text-violet-700 border-violet-200",
  teacher: "bg-blue-50 text-blue-700 border-blue-200",
};

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface SchoolDetailSheetProps {
  schoolId: string | null;
  onClose: () => void;
  onSuspend: (school: SchoolRow) => void;
  onUnsuspend: (schoolId: string) => void;
  onSchoolUpdated: (updated: Partial<SchoolRow> & { id: string }) => void;
}

export function SchoolDetailSheet({ schoolId, onClose, onSuspend, onUnsuspend, onSchoolUpdated }: SchoolDetailSheetProps) {
  const [detail, setDetail] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) { setDetail(null); return; }
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) =>
      fetch(`/api/platform/get-school-detail?schoolId=${schoolId}`, {
        headers: { authorization: `Bearer ${session?.access_token}` },
      })
      .then((r) => r.json())
      .then((json) => { setDetail(json); setLoading(false); })
    );
  }, [schoolId]);

  const school = detail?.school;

  return (
    <Sheet open={!!schoolId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto flex flex-col">
        <SheetHeader className="pb-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {loading || !school ? (
                <Skeleton className="h-6 w-48 mb-2" />
              ) : (
                <SheetTitle className="text-lg font-semibold leading-tight">{school.name}</SheetTitle>
              )}
              {school && (
                <p className="text-xs text-muted-foreground mt-0.5">{school.city}{school.country ? `, ${school.country}` : ""}</p>
              )}
            </div>
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
              <X className="h-4 w-4" />
            </button>
          </div>
          {school && (
            <div className="flex items-center gap-2 mt-2">
              {school.is_active ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  <CheckCircle className="h-3 w-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                  <Ban className="h-3 w-3" /> Suspended
                </span>
              )}
              {school.curriculum && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">
                  {school.curriculum}
                </span>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 py-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Users", value: detail?.stats.userCount ?? "—", icon: Users },
              { label: "Plans", value: detail?.stats.planCount ?? "—", icon: ClipboardList },
              { label: "Last Activity", value: detail ? formatDate(detail.stats.lastActivity) : "—", icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border bg-muted/20 px-3 py-2.5 text-center">
                <Icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-semibold tabular-nums">{loading ? <Skeleton className="h-5 w-8 mx-auto" /> : value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Users table */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Users</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">User</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Username</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-20">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-3 py-2.5"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-3 py-2.5"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))
                  ) : !detail?.profiles.length ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-xs text-muted-foreground">No users yet</td>
                    </tr>
                  ) : (
                    detail.profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                              {(p.full_name ?? p.username).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                            <span className="font-medium text-xs">{p.full_name ?? p.username}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.username}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ROLE_COLORS[p.role] ?? "bg-muted text-muted-foreground border-border"}`}>
                            {ROLE_LABELS[p.role] ?? p.role}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        {school && (
          <div className="border-t pt-4 shrink-0">
            {school.is_active ? (
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 w-full"
                onClick={() => onSuspend({ ...school, user_count: detail?.stats.userCount ?? 0 } as SchoolRow)}
              >
                <Ban className="h-3.5 w-3.5 mr-1.5" /> Suspend School
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => { onUnsuspend(school.id); onSchoolUpdated({ id: school.id, is_active: true }); }}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Unsuspend School
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
