"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { ObservationLogCard } from "@/components/coaching/ObservationLogCard";
import { CoachingCycleTracker } from "@/components/coaching/CoachingCycleTracker";
import { MentoringPairCard } from "@/components/coaching/MentoringPairCard";
import { PDLogTable } from "@/components/coaching/PDLogTable";
import { useCoaching } from "@/hooks/useCoaching";
import { ObservationFocusArea, CoachingStep } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap } from "lucide-react";

type Tab = "observations" | "cycle" | "mentoring" | "pd";
const TABS: { key: Tab; label: string }[] = [
  { key: "observations", label: "Observations" },
  { key: "cycle",        label: "Cycle"         },
  { key: "mentoring",    label: "Mentoring"     },
  { key: "pd",           label: "PD Log"        },
];

interface Props {
  schoolId: string | null;
  hodId: string;
}

export function CoachingView({ schoolId, hodId }: Props) {
  const { profiles, loading, createObservation, openCycle, completeStep, createMentoringPair, updateCheckIn, addPdEntry } = useCoaching(schoolId, hodId);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("observations");

  const selected = profiles.find((p) => p.teacherId === selectedTeacherId) ?? profiles[0] ?? null;

  const allTeachers = profiles.map((p) => ({ id: p.teacherId, name: p.teacherName }));

  return (
    <PageContainer title="Coaching" description="Observation log, coaching cycles, mentoring pairs, and professional development">
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 gap-3 border border-dashed border-border rounded-lg">
          <GraduationCap className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No teachers in your department yet.</p>
        </div>
      ) : (
        <div className="flex gap-6 min-h-[500px]">
          {/* Teacher list — left panel */}
          <div className="w-52 shrink-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Teachers</p>
            {profiles.map((p) => {
              const isSelected = p.teacherId === (selected?.teacherId);
              const cycleStep = p.activeCycle
                ? `Step ${p.activeCycle.steps_completed.length + 1} of 4`
                : null;
              return (
                <button
                  key={p.teacherId}
                  onClick={() => { setSelectedTeacherId(p.teacherId); setActiveTab("observations"); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary/30 bg-primary/5"
                      : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <p className={`text-sm font-medium truncate ${isSelected ? "text-foreground" : "text-foreground/80"}`}>
                    {p.teacherName}
                  </p>
                  {cycleStep && (
                    <p className="text-[11px] text-primary mt-0.5">{cycleStep}</p>
                  )}
                  {p.observations.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.observations.length} observation{p.observations.length !== 1 ? "s" : ""}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detail panel — right */}
          {selected && (
            <div className="flex-1 min-w-0 space-y-4">
              <h2 className="text-base font-semibold text-foreground">{selected.teacherName}</h2>

              {/* Tabs */}
              <div className="flex border-b border-border gap-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === tab.key
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div>
                {activeTab === "observations" && (
                  <ObservationLogCard
                    observations={selected.observations}
                    onAdd={async (data) => {
                      await createObservation({ ...data, teacher_id: selected.teacherId });
                    }}
                  />
                )}
                {activeTab === "cycle" && (
                  <CoachingCycleTracker
                    cycle={selected.activeCycle}
                    onCompleteStep={async (step: CoachingStep) => {
                      if (selected.activeCycle) await completeStep(selected.activeCycle.id, selected.teacherId, step);
                    }}
                    onOpenCycle={async () => { await openCycle(selected.teacherId); }}
                  />
                )}
                {activeTab === "mentoring" && (
                  <MentoringPairCard
                    pair={selected.mentoringPair}
                    teacherName={selected.teacherName}
                    allTeachers={allTeachers}
                    currentTeacherId={selected.teacherId}
                    onUpdateCheckIn={async (pairId) => { await updateCheckIn(pairId, selected.mentoringPair!.mentor_id, selected.mentoringPair!.mentee_id); }}
                    onCreatePair={createMentoringPair}
                  />
                )}
                {activeTab === "pd" && (
                  <PDLogTable
                    entries={selected.pdEntries}
                    teacherId={selected.teacherId}
                    onAdd={addPdEntry}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
