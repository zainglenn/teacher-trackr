"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { StrandAttainmentGrid } from "@/components/analytics/StrandAttainmentGrid";
import { AttainmentDrillDown } from "@/components/analytics/AttainmentDrillDown";
import { BenchmarkComparisonPanel } from "@/components/analytics/BenchmarkComparisonPanel";
import { useAttainmentGrid, StudentAttainmentRow } from "@/hooks/useAttainmentGrid";
import { useBenchmarkSnapshots } from "@/hooks/useBenchmarkSnapshots";
import { Standard } from "@/types";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";

interface Props {
  standards: Standard[];
  subjectId: string | null;
  gradeLevelId: string | null;
  schoolId: string | null;
  hodId: string;
  contextLabel: string | null;
}

export function DepartmentAnalyticsView({ standards, subjectId, gradeLevelId, schoolId, hodId, contextLabel }: Props) {
  const { grid, classNames, studentRows, loading } = useAttainmentGrid(subjectId, gradeLevelId, standards, schoolId);
  const { snapshots, saving, takeSnapshot } = useBenchmarkSnapshots(schoolId, subjectId, gradeLevelId, hodId);

  const [drillOpen, setDrillOpen] = useState(false);
  const [drillClassId, setDrillClassId] = useState<string | null>(null);
  const [drillStrand, setDrillStrand] = useState<string | null>(null);

  function handleCellClick(classId: string, strand: string) {
    setDrillClassId(classId);
    setDrillStrand(strand);
    setDrillOpen(true);
  }

  // Compute current strand averages for snapshot
  function currentStrandAverages(): Record<string, number> {
    const avgs: Record<string, number> = {};
    const STRANDS = ["RL", "RI", "W", "SL", "L"];
    for (const strand of STRANDS) {
      let total = 0, sum = 0;
      for (const strandMap of grid.values()) {
        const s = strandMap.get(strand);
        if (s && s.total > 0) { sum += s.pct; total++; }
      }
      avgs[strand] = total > 0 ? Math.round(sum / total) : 0;
    }
    return avgs;
  }

  // Filter drill-down rows: for a given classId × strand we need student rows
  // student_progress is per standard, so we need to map strand back to students
  // The hook returns rows tagged by classId; for drill-down we group by attainment
  // (rows may repeat per student per standard — deduplicate to most-recent attainment per student)
  const drillRows: StudentAttainmentRow[] = (() => {
    if (!drillClassId || !drillStrand) return [];
    // Filter rows to this class, then pick the "worst" attainment per student
    // (showing any below-standard performance is more useful than cherry-picking)
    const classRows = studentRows.filter((r) => r.classId === drillClassId);
    // We don't have strand info on rows (they come from student_progress × standards join)
    // The hook doesn't tag rows with strandCode directly — we'd need that info
    // For now, return all class rows (shows all attainment data for the class)
    // TODO: pass strandCode through useAttainmentGrid studentRows when refining
    const seen = new Map<string, StudentAttainmentRow>();
    for (const r of classRows) {
      const existing = seen.get(r.studentId);
      if (!existing) { seen.set(r.studentId, r); continue; }
      // Keep worst attainment for the summary
      const order = ["exceeding", "meeting", "approaching", "below", "not_assessed"];
      if (order.indexOf(r.attainment) > order.indexOf(existing.attainment)) {
        seen.set(r.studentId, r);
      }
    }
    return [...seen.values()];
  })();

  const drillClassName = drillClassId ? (classNames.get(drillClassId) ?? "Class") : "";

  return (
    <PageContainer
      title="Analytics"
      description={contextLabel ? `${contextLabel} — strand attainment by class` : "Strand attainment by class"}
      action={
        grid.size > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => takeSnapshot(currentStrandAverages())}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Take Snapshot
          </Button>
        ) : undefined
      }
    >
      <StrandAttainmentGrid
        grid={grid}
        classNames={classNames}
        loading={loading}
        onCellClick={handleCellClick}
      />

      <BenchmarkComparisonPanel snapshots={snapshots} currentGrid={grid} />

      <AttainmentDrillDown
        open={drillOpen}
        onClose={() => setDrillOpen(false)}
        classId={drillClassId}
        strand={drillStrand}
        className={drillClassName}
        rows={drillRows}
      />
    </PageContainer>
  );
}
