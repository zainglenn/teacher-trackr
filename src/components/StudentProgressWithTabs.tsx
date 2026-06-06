"use client";

import { useState } from "react";
import { StudentProgressView } from "@/components/StudentProgressView";
import { InterventionsTabContent } from "@/components/interventions/InterventionsTabContent";
import { Standard } from "@/types";

type Tab = "progress" | "interventions";

interface Props {
  teacherId: string;
  standards: Standard[];
  byStrand: Record<string, Standard[]>;
  isHod?: boolean;
  contextLabel?: string | null;
  schoolId?: string | null;
}

export function StudentProgressWithTabs({ teacherId, standards, byStrand, isHod, contextLabel, schoolId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("progress");

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex border-b border-border mb-4 gap-0">
        {(["progress", "interventions"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "progress" ? "Progress" : "Interventions"}
          </button>
        ))}
      </div>

      {activeTab === "progress" && (
        <StudentProgressView
          teacherId={teacherId}
          standards={standards}
          byStrand={byStrand}
          isHod={isHod}
          contextLabel={contextLabel}
        />
      )}
      {activeTab === "interventions" && (
        <InterventionsTabContent teacherId={teacherId} schoolId={schoolId ?? null} isHod={isHod} />
      )}
    </div>
  );
}
