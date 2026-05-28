"use client";

import { useState, useEffect } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, AppView } from "@/components/AppSidebar";
import { AuthGate } from "@/components/AuthGate";
import { DashboardView } from "@/components/DashboardView";
import { CoverageView } from "@/components/CoverageView";
import { LongTermPlanView } from "@/components/LongTermPlanView";
import { StudentProgressView } from "@/components/StudentProgressView";
import { ManageUsersView } from "@/components/ManageUsersView";
import { SchoolSetupView } from "@/components/SchoolSetupView";
import { AdminView } from "@/components/AdminView";
import { DeliveryGridView } from "@/components/DeliveryGridView";
import { HODAdminPanel } from "@/components/HODAdminPanel";
import { MyUnitsView } from "@/components/MyUnitsView";
import { HODReviewView } from "@/components/HODReviewView";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useStandards } from "@/hooks/useStandards";
import { useCoverage } from "@/hooks/useCoverage";
import { useLongTermPlans } from "@/hooks/useLongTermPlans";
import { useTeachers } from "@/hooks/useTeachers";
import { useStudents } from "@/hooks/useStudents";
import { useClassProgress } from "@/hooks/useClassProgress";
import { useActiveContext } from "@/hooks/useActiveContext";
import { Loader2 } from "lucide-react";

function CurriculumApp({ userId }: { userId: string }) {
  const [view, setView] = useState<AppView>("dashboard");
  const [ltpInitialPlanId, setLtpInitialPlanId] = useState<string | null>(null);
  const [ltpInitialUnitId, setLtpInitialUnitId] = useState<string | null>(null);
  const { role, username, loading: profileLoading } = useProfile(userId);

  useEffect(() => {
    if (profileLoading) return;
    if (role === "teacher") setView("my-units");
    else if (role === "admin") setView("manage-users");
  }, [role, profileLoading]);
  const isHod = role === "hod";
  const isAdmin = role === "admin";
  const showContext = role === "teacher" || role === "hod";
  const { activeContext, setActiveContext, assignments: contextAssignments } = useActiveContext(
    showContext ? userId : null
  );
  const { standards, byStrand, loading: standardsLoading } = useStandards();
  const { logs: coverageLogs } = useCoverage(userId);
  const { plans: ltps, assignUnit } = useLongTermPlans(userId, isHod, {
    subjectId: activeContext?.subjectId,
    gradeLevelId: activeContext?.gradeLevelId,
  });
  const { teachers } = useTeachers();
  const { students } = useStudents(userId);
  const { progress: classProgress } = useClassProgress(userId);

  const overdueCount = 0; // will be computed from class_lesson_deliveries once DB migration is applied

  if (standardsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        view={view}
        onViewChange={setView}
        role={role}
        username={username}
        overdueCount={overdueCount}
        activeContext={activeContext}
        contextAssignments={showContext ? contextAssignments : []}
        onContextChange={setActiveContext}
      />
      <SidebarInset className="flex flex-col min-h-svh bg-slate-50/60">
        <header className="flex items-center h-10 px-3 border-b border-border/40 shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <SidebarTrigger className="h-7 w-7 text-muted-foreground hover:text-foreground md:hidden" />
        </header>
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
            <LongTermPlanView
              teacherId={userId}
              isHod={isHod}
              standards={standards}
              initialPlanId={ltpInitialPlanId}
              initialUnitId={ltpInitialUnitId}
              onInitialConsumed={() => { setLtpInitialPlanId(null); setLtpInitialUnitId(null); }}
            />
          )}
          {view === "student-progress" && (
            <StudentProgressView teacherId={userId} standards={standards} byStrand={byStrand} isHod={isHod} />
          )}
          {view === "delivery-grid" && isHod && (
            <DeliveryGridView teacherId={userId} onNavigate={setView} />
          )}
          {view === "hod-review" && isHod && (
            <HODReviewView teacherId={userId} standards={standards} />
          )}
          {view === "hod-settings" && isHod && (
            <HODAdminPanel
              teachers={teachers}
              plans={ltps}
              assignUnit={assignUnit}
            />
          )}
          {view === "manage-users" && isAdmin && (
            <ManageUsersView currentUserId={userId} />
          )}
          {view === "school-setup" && isAdmin && (
            <SchoolSetupView />
          )}
          {view === "my-units" && role === "teacher" && (
            <MyUnitsView
              teacherId={userId}
              standards={standards}
            />
          )}
          {view === "platform-settings" && isAdmin && (
            <AdminView userId={userId} tab="platform" />
          )}
          {view === "curriculum-audit" && isAdmin && (
            <AdminView userId={userId} tab="audit" />
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
  return <CurriculumApp userId={user.id} />;
}
