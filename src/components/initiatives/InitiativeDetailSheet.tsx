"use client";

import { useState } from "react";
import { Initiative } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, TrendingUp } from "lucide-react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface TeacherOption { id: string; name: string }
interface ClassOption { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  initiative: Initiative | null;
  teachers: TeacherOption[];
  userId: string;
  isHod: boolean;
  isAdmin: boolean;
  onJoin: (initiativeId: string) => Promise<void>;
  onLeave: (initiativeId: string) => Promise<void>;
  onAddProgress: (initiativeId: string, value: number, notes?: string) => Promise<void>;
}

export function InitiativeDetailSheet({ open, onClose, initiative, teachers, userId, isHod, isAdmin, onJoin, onLeave, onAddProgress }: Props) {
  const [progressValue, setProgressValue] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open || !initiative) return null;

  const participants = initiative.participants ?? [];
  const progress = [...(initiative.progress ?? [])].sort((a, b) =>
    new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  const isParticipant = participants.some((p) => p.teacher_id === userId);
  const canManage = isHod || isAdmin;

  async function handleAddProgress() {
    const val = parseFloat(progressValue);
    if (isNaN(val)) return;
    setSaving(true);
    await onAddProgress(initiative!.id, val, progressNotes || undefined);
    setSaving(false);
    setProgressValue(""); setProgressNotes("");
  }

  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[520px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-base">{initiative.name}</SheetTitle>
          {initiative.description && (
            <p className="text-sm text-muted-foreground">{initiative.description}</p>
          )}
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {/* Participants */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Participants ({participants.length})
              </h3>
              {isHod && !isParticipant && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onJoin(initiative.id)}>
                  Join Initiative
                </Button>
              )}
              {isHod && isParticipant && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onLeave(initiative.id)}>
                  Leave
                </Button>
              )}
            </div>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants yet.</p>
            ) : (
              <div className="space-y-1">
                {participants.map((p) => (
                  <div key={p.id} className="text-sm text-foreground py-1 px-3 rounded bg-muted/40">
                    {teacherMap.get(p.teacher_id) ?? p.teacher_id}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Progress */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Progress
              {initiative.metric_label && <span className="font-normal normal-case tracking-normal">— {initiative.metric_label}</span>}
            </h3>
            {progress.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Value</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progress.map((p) => (
                      <tr key={p.id} className="border-t border-border/50">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(p.recorded_at)}</td>
                        <td className="px-3 py-2 text-sm font-semibold">{p.metric_value}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No progress entries yet.</p>
            )}

            {/* Add progress (HOD/Admin) */}
            {canManage && initiative.status === "active" && (
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">Add Progress Entry</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={progressValue}
                    onChange={(e) => setProgressValue(e.target.value)}
                    placeholder={initiative.metric_label ?? "Value"}
                    className="w-28 h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <input
                    type="text"
                    value={progressNotes}
                    onChange={(e) => setProgressNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="flex-1 h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <Button size="sm" className="h-8" onClick={handleAddProgress} disabled={saving || !progressValue}>
                    {saving ? "…" : "Add"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
