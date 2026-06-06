"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { InitiativeCard } from "@/components/initiatives/InitiativeCard";
import { InitiativeDetailSheet } from "@/components/initiatives/InitiativeDetailSheet";
import { useInitiatives } from "@/hooks/useInitiatives";
import { useCoaching } from "@/hooks/useCoaching";
import { Initiative } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGradeLevels } from "@/hooks/useGradeLevels";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, Plus } from "lucide-react";

interface Props {
  schoolId: string | null;
  userId: string;
  isHod: boolean;
  isAdmin: boolean;
}

export function InitiativesView({ schoolId, userId, isHod, isAdmin }: Props) {
  const { initiatives, loading, createInitiative, joinInitiative, leaveInitiative, addProgressEntry } =
    useInitiatives(schoolId, userId);
  const { profiles } = useCoaching(schoolId, isHod ? userId : null);
  const { gradeLevels } = useGradeLevels();
  const teachers = profiles.map((p) => ({ id: p.teacherId, name: p.teacherName }));

  const [selectedInitiative, setSelectedInitiative] = useState<Initiative | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const active = initiatives.filter((i) => i.status === "active");
  const completed = initiatives.filter((i) => i.status === "completed");

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    await createInitiative({ name, description: description || undefined, subject_ids: [], grade_level_ids: [], metric_label: metricLabel || undefined, start_date: startDate });
    setSaving(false);
    setCreateOpen(false);
    setName(""); setDescription(""); setMetricLabel("");
  }

  if (loading) {
    return (
      <PageContainer title="Initiatives">
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Initiatives"
      description="School-wide programmes and progress tracking"
      action={
        isAdmin && !createOpen ? (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Initiative
          </Button>
        ) : undefined
      }
    >
      {/* Create form */}
      {createOpen && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
          <p className="text-sm font-semibold">New Initiative</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cross-Curricular Reading Programme"
                className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Success metric label</label>
              <input type="text" value={metricLabel} onChange={(e) => setMetricLabel(e.target.value)} placeholder="e.g. % reading at grade level"
                className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[64px] text-sm resize-none" placeholder="What is this initiative about?" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? "Saving…" : "Create Initiative"}
            </Button>
          </div>
        </div>
      )}

      {/* Active */}
      {active.length === 0 && completed.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 border border-dashed border-border rounded-lg gap-3 px-8 text-center">
          <Rocket className="h-8 w-8 text-muted-foreground/40" />
          {isAdmin ? (
            <>
              <p className="text-sm text-muted-foreground">No initiatives yet.</p>
              {!createOpen && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> New Initiative
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">No initiatives have been set up yet.</p>
              <p className="text-xs text-muted-foreground/70">Ask your school admin to create one — you'll be able to join and log progress here.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-2">
              {active.map((i) => (
                <InitiativeCard key={i.id} initiative={i} onClick={() => setSelectedInitiative(i)} />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground py-2 select-none list-none flex items-center gap-1">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                Past Initiatives ({completed.length})
              </summary>
              <div className="mt-2 space-y-2">
                {completed.map((i) => (
                  <InitiativeCard key={i.id} initiative={i} onClick={() => setSelectedInitiative(i)} />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <InitiativeDetailSheet
        open={!!selectedInitiative}
        onClose={() => setSelectedInitiative(null)}
        initiative={selectedInitiative}
        teachers={teachers}
        userId={userId}
        isHod={isHod}
        isAdmin={isAdmin}
        onJoin={joinInitiative}
        onLeave={leaveInitiative}
        onAddProgress={addProgressEntry}
      />
    </PageContainer>
  );
}
