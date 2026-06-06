"use client";

import { useState } from "react";
import { useInterventions } from "@/hooks/useInterventions";
import { InterventionCard } from "./InterventionCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { Textarea } from "@/components/ui/textarea";
import { InterventionStatus } from "@/types";
import { Plus, Syringe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STRANDS = ["RL", "RI", "W", "SL", "L"];
const STRAND_LABELS: Record<string, string> = {
  RL: "Reading Lit.", RI: "Reading Info.", W: "Writing", SL: "Speaking", L: "Language",
};

interface Props {
  teacherId: string;
  schoolId: string | null;
  isHod?: boolean;
}

export function InterventionsTabContent({ teacherId, schoolId, isHod }: Props) {
  const { interventions, loading, createIntervention, updateIntervention, concludeIntervention } = useInterventions(schoolId, teacherId, !!isHod);
  const { students } = useStudents(teacherId);
  const [formOpen, setFormOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<InterventionStatus | "all">("all");
  const [filterStrand, setFilterStrand] = useState<string>("all");

  // New intervention form state
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedStrands, setSelectedStrands] = useState<string[]>([]);
  const [strategy, setStrategy] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  function toggleStudent(id: string) {
    setSelectedStudents((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }
  function toggleStrand(s: string) {
    setSelectedStrands((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleCreate() {
    if (!strategy.trim() || selectedStudents.length === 0 || selectedStrands.length === 0) return;
    setSaving(true);
    await createIntervention({ strand_codes: selectedStrands, student_ids: selectedStudents, strategy, start_date: startDate });
    setSaving(false);
    setFormOpen(false);
    setSelectedStudents([]); setSelectedStrands([]); setStrategy(""); setStartDate(new Date().toISOString().split("T")[0]);
  }

  const filtered = interventions.filter((i) => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterStrand !== "all" && !i.strand_codes.includes(filterStrand)) return false;
    return true;
  });

  const active = filtered.filter((i) => i.status !== "concluded");
  const concluded = filtered.filter((i) => i.status === "concluded");

  if (loading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Filter + New button */}
      <div className="flex items-center gap-2 flex-wrap">
        {isHod && (
          <>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus((v ?? "all") as InterventionStatus | "all")}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="concluded">Concluded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStrand} onValueChange={(v) => setFilterStrand(v ?? "all")}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All strands</SelectItem>
                {STRANDS.map((s) => <SelectItem key={s} value={s}>{STRAND_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
        {!isHod && !formOpen && (
          <Button variant="outline" size="sm" className="gap-1.5 ml-auto" onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Intervention
          </Button>
        )}
      </div>

      {/* Inline create form (teacher only) */}
      {formOpen && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
          <p className="text-sm font-medium">New Intervention</p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Strands</p>
            <div className="flex gap-2 flex-wrap">
              {STRANDS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStrand(s)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    selectedStrands.includes(s)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {STRAND_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Students</p>
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {students.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`text-left px-2.5 py-1.5 rounded text-xs border transition-colors ${
                    selectedStudents.includes(s.id)
                      ? "bg-primary/10 border-primary/30 text-foreground"
                      : "bg-background border-border/50 text-foreground/70 hover:bg-muted"
                  }`}
                >
                  {s.full_name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Strategy</label>
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="e.g. Close reading circles"
                className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving || !strategy.trim() || selectedStudents.length === 0 || selectedStrands.length === 0}>
              {saving ? "Saving…" : "Create Intervention"}
            </Button>
          </div>
        </div>
      )}

      {/* Active + monitoring */}
      {active.length > 0 ? (
        <div className="space-y-2">
          {active.map((i) => (
            <InterventionCard key={i.id} intervention={i} onUpdate={updateIntervention} onConclude={concludeIntervention} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 border border-dashed border-border rounded-lg gap-2">
          <Syringe className="h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No active interventions.</p>
          {!isHod && !formOpen && (
            <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={() => setFormOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New Intervention
            </Button>
          )}
        </div>
      )}

      {/* Concluded */}
      {concluded.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground py-2 select-none list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            Concluded ({concluded.length})
          </summary>
          <div className="mt-2 space-y-2">
            {concluded.map((i) => (
              <InterventionCard key={i.id} intervention={i} onUpdate={updateIntervention} onConclude={concludeIntervention} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
