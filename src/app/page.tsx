"use client";

import { useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, AppView } from "@/components/AppSidebar";
import { AuthGate } from "@/components/AuthGate";
import { DashboardView } from "@/components/DashboardView";
import { CoverageView } from "@/components/CoverageView";
import { LongTermPlanView } from "@/components/LongTermPlanView";
import { StudentProgressView } from "@/components/StudentProgressView";
import { HODReviewView } from "@/components/HODReviewView";
import { ManageUsersView } from "@/components/ManageUsersView";
import { ManageClassesView } from "@/components/ManageClassesView";
import { MyUnitsView } from "@/components/MyUnitsView";
import { UnitAssignmentsView } from "@/components/UnitAssignmentsView";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useStandards } from "@/hooks/useStandards";
import { useCoverage } from "@/hooks/useCoverage";
import { useLongTermPlans } from "@/hooks/useLongTermPlans";
import { useTeachers } from "@/hooks/useTeachers";
import { useStudents } from "@/hooks/useStudents";
import { useClassProgress } from "@/hooks/useClassProgress";
import { Loader2 } from "lucide-react";

function CurriculumApp({ userId, email }: { userId: string; email: string }) {
  const [view, setView] = useState<AppView>("dashboard");
  const { role } = useProfile(userId);
  const isHod = role === "hod";
  const { standards, byStrand, loading: standardsLoading } = useStandards();
  const { logs: coverageLogs } = useCoverage(userId);
  const { plans: ltps, assignUnit } = useLongTermPlans(userId, isHod);
  const { teachers } = useTeachers();
  const { students } = useStudents(userId);
  const { progress: classProgress } = useClassProgress(userId);

  const resubmittedCount = isHod
    ? ltps.flatMap((p) => p.units ?? []).filter(
        (u) => u.status === "submitted" && u.reviewed_at && u.submitted_at && u.submitted_at > u.reviewed_at
      ).length
    : 0;

  if (standardsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar view={view} onViewChange={setView} role={role} email={email} resubmittedCount={resubmittedCount} />
      <SidebarInset className="flex flex-col min-h-svh bg-muted/30">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {view === "dashboard" && (
            <DashboardView
              standards={standards}
              coverageLogs={coverageLogs}
              ltps={ltps}
              students={students}
              isHod={isHod}
              classProgress={classProgress}
              onNavigate={setView}
            />
          )}
          {view === "coverage" && (
            <CoverageView standards={standards} byStrand={byStrand} teacherId={userId} isHod={isHod} />
          )}
          {view === "long-term-plan" && (
            <LongTermPlanView teacherId={userId} isHod={isHod} standards={standards} />
          )}
          {view === "student-progress" && (
            <StudentProgressView teacherId={userId} standards={standards} byStrand={byStrand} isHod={isHod} />
          )}
          {view === "hod-review" && isHod && (
            <HODReviewView teacherId={userId} standards={standards} />
          )}
          {view === "manage-users" && isHod && (
            <ManageUsersView currentUserId={userId} />
          )}
          {view === "manage-classes" && isHod && (
            <ManageClassesView />
          )}
          {view === "my-units" && !isHod && (
            <MyUnitsView teacherId={userId} standards={standards} />
          )}
          {view === "unit-assignments" && isHod && (
            <UnitAssignmentsView plans={ltps} teachers={teachers} assignUnit={assignUnit} />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <AuthGate />;
  return <CurriculumApp userId={user.id} email={user.email ?? ""} />;
}
