"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, GraduationCap } from "lucide-react";
import { Standard } from "@/types";
import { useSkillCoverage } from "@/hooks/useSkillCoverage";
import { useAllSkills } from "@/hooks/useAllSkills";
import { useClasses } from "@/hooks/useClasses";
import { StandardDetailView } from "@/components/StandardDetailView";

interface CoverageViewProps {
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  teacherId: string;
  isHod?: boolean;
}

export function CoverageView({ standards, byStrand, teacherId, isHod }: CoverageViewProps) {
  const { classes, loading: classesLoading } = useClasses(teacherId);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  if (classesLoading) return null;

  return (
    <PageContainer title="Standards Coverage" description="Track skill coverage by class">
    <div className="space-y-4">
      {/* Class selector bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedClassId(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            selectedClassId === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted"
          }`}
        >
          All Classes
        </button>
        {classes.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              selectedClassId === cls.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            {cls.name}
          </button>
        ))}
        {isHod && (
          <span className="text-xs text-muted-foreground italic ml-1">Manage classes in HOD settings</span>
        )}
      </div>

      <CoverageGrid
        key={selectedClassId ?? "all"}
        standards={standards}
        byStrand={byStrand}
        teacherId={teacherId}
        classId={selectedClassId}
        className={selectedClassId ? (classes.find((c) => c.id === selectedClassId)?.name ?? "") : "All Classes"}
      />

    </div>
    </PageContainer>
  );
}

function CoverageGrid({
  standards,
  byStrand,
  teacherId,
  classId,
  className: classLabel,
}: {
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  teacherId: string;
  classId: string | null;
  className: string;
}) {
  const { coveredSkillIds } = useSkillCoverage(teacherId, classId);
  const { byStandardId, loading: skillsLoading } = useAllSkills();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedStandard, setSelectedStandard] = useState<(typeof standards)[0] | null>(null);

  if (selectedStandard) {
    return (
      <StandardDetailView
        standard={selectedStandard}
        teacherId={teacherId}
        classId={classId}
        onBack={() => setSelectedStandard(null)}
        preloadedSkills={byStandardId[selectedStandard.id] ?? []}
        coveredSkillIds={coveredSkillIds}
      />
    );
  }

  const totalSkills = standards.reduce((sum, s) => sum + (byStandardId[s.id]?.length ?? 0), 0);
  const totalCovered = standards.reduce((sum, s) => {
    const skills = byStandardId[s.id] ?? [];
    return sum + skills.filter((sk) => coveredSkillIds.has(sk.id)).length;
  }, 0);
  const overallPct = totalSkills > 0 ? Math.round((totalCovered / totalSkills) * 100) : 0;

  function toggleStrand(strand: string) {
    setCollapsed((prev) => ({ ...prev, [strand]: !prev[strand] }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{classLabel}</span>
          <span className="text-sm text-muted-foreground">— {totalCovered} of {totalSkills} skills covered ({overallPct}%)</span>
        </div>
      </div>

      <Progress value={overallPct} className="h-2" />

      {Object.entries(byStrand).map(([strand, items]) => {
        const isOpen = !collapsed[strand];
        const strandSkills = items.flatMap((s) => byStandardId[s.id] ?? []);
        const strandCovered = strandSkills.filter((sk) => coveredSkillIds.has(sk.id)).length;
        const strandPct = strandSkills.length > 0
          ? Math.round((strandCovered / strandSkills.length) * 100)
          : 0;

        return (
          <Card key={strand}>
            <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => toggleStrand(strand)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isOpen
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <CardTitle className="text-sm font-semibold">{strand}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{strandCovered}/{strandSkills.length} skills</span>
                  <Progress value={strandPct} className="h-1.5 w-20" />
                </div>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="pt-0 space-y-2">
                {skillsLoading ? (
                  <p className="text-sm text-muted-foreground py-2">Loading skills...</p>
                ) : (
                  items.map((standard) => {
                    const skills = byStandardId[standard.id] ?? [];
                    const covered = skills.filter((sk) => coveredSkillIds.has(sk.id)).length;
                    const total = skills.length;
                    const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
                    const done = total > 0 && covered === total;

                    return (
                      <button
                        key={standard.id}
                        onClick={() => setSelectedStandard(standard)}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-sm hover:border-primary/40 group ${
                          done ? "bg-emerald-50 border-emerald-200" : "bg-background border-border"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {done
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <Circle className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">{standard.code}</Badge>
                            {total > 0 && (
                              <span className={`text-xs ${done ? "text-emerald-600" : "text-muted-foreground"}`}>
                                {covered}/{total} skills
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 line-clamp-2">{standard.description}</p>
                          {total > 0 && <Progress value={pct} className="h-1" />}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
