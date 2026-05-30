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
import { useStandardPipeline } from "@/hooks/useStandardPipeline";
import { useDepartmentPipeline } from "@/hooks/useDepartmentPipeline";
import { useTeacherNotifications, useHodNotifications } from "@/hooks/useNotifications";
import { PlatformAdminView } from "@/components/PlatformAdminView";
import { SuspendedSchoolMessage } from "@/components/SuspendedSchoolMessage";
import { useSchool } from "@/hooks/useSchool";
import { Loader2, BookOpen } from "lucide-react";

function CurriculumApp({ userId }: { userId: string }) {
  const [view, setView] = useState<AppView>("dashboard");
  const [ltpInitialPlanId, setLtpInitialPlanId] = useState<string | null>(null);
  const [ltpInitialUnitId, setLtpInitialUnitId] = useState<string | null>(null);
  const { profile, role, username, loading: profileLoading, subjectId: profileSubjectId } = useProfile(userId);

  useEffect(() => {
    if (profileLoading) return;
    if (role === "teacher") setView("my-units");
    else if (role === "admin") setView("manage-users");
    else if (role === "platform_admin") setView("schools");
  }, [role, profileLoading]);
  const isHod = role === "hod";
  const isAdmin = role === "admin";
  const isPlatformAdmin = role === "platform_admin";
  const { isActive: schoolIsActive } = useSchool(!isPlatformAdmin ? profile?.school_id : null);
  const showContext = role === "teacher" || role === "hod";
  const { activeContext, setActiveContext, assignments: contextAssignments, loading: contextLoading } = useActiveContext(
    showContext ? userId : null
  );

  const contextLabel = (() => {
    if (!activeContext || !contextAssignments.length) return null;
    const match = contextAssignments.find(
      (a) => a.subject_id === activeContext.subjectId && a.grade_level_id === activeContext.gradeLevelId
    );
    if (!match) return null;
    const grade = match.grade_level?.name ?? "";
    const subject = match.subject?.name ?? "";
    return grade && subject ? `${grade} · ${subject}` : grade || subject || null;
  })();
  const { standards, byStrand, loading: standardsLoading } = useStandards();
  const { logs: coverageLogs } = useCoverage(userId);
  const { plans: ltps, assignUnit } = useLongTermPlans(userId, isHod, {
    schoolId: profile?.school_id ?? null,
    subjectId: activeContext?.subjectId,
    gradeLevelId: activeContext?.gradeLevelId,
  });
  const { teachers } = useTeachers();
  const { students } = useStudents(userId);
  const { progress: classProgress } = useClassProgress(userId);

  // Notifications — skipped for platform_admin (no curriculum data)
  const notifSubjectId = activeContext?.subjectId ?? profileSubjectId ?? null;
  const notifGradeId = activeContext?.gradeLevelId ?? null;
  const { entries: teacherPipelineEntries } = useStandardPipeline(
    role === "teacher" ? userId : null, notifSubjectId, notifGradeId, standards
  );
  const { results: deptPipelineResults } = useDepartmentPipeline(
    isHod ? notifSubjectId : null, isHod ? notifGradeId : null, standards
  );
  const teacherNotifs = useTeacherNotifications(role === "teacher" ? ltps : [], teacherPipelineEntries);
  const hodNotifs = useHodNotifications(isHod ? ltps : [], deptPipelineResults, standards.length);
  const notifications = isPlatformAdmin ? [] : (isHod ? hodNotifs : teacherNotifs);
  const overdueCount = notifications.filter((n) => n.severity === "urgent").length;

  // HODs are scoped by subject_id on their profile — they don't need class assignments
  const noContextAssigned = role === "teacher" && !contextLoading && contextAssignments.length === 0;

  const NoAssignmentState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BookOpen className="h-8 w-8 text-muted-foreground/25 mb-3" />
      <p className="text-sm font-medium text-foreground">No classes assigned</p>
      <p className="text-xs text-muted-foreground mt-1">Contact your administrator to be assigned to a class.</p>
    </div>
  );

  // Suspended school guard
  if (schoolIsActive === false) return <SuspendedSchoolMessage />;

  // Platform admin — skip all curriculum loading, render directly
  if (isPlatformAdmin) {
    return (
      <SidebarProvider>
        <AppSidebar view={view} onViewChange={setView} role={role} username={username} notifications={[]} />
        <SidebarInset className="flex flex-col min-h-svh bg-slate-50/60">
          <header className="flex items-center h-10 px-3 border-b border-border/40 shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="h-7 w-7 text-muted-foreground hover:text-foreground md:hidden" />
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <PlatformAdminView />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

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
        notifications={notifications}
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
              teacherId={userId}
              subjectId={activeContext?.subjectId ?? profileSubjectId ?? null}
              gradeLevelId={activeContext?.gradeLevelId ?? null}
            />
          )}
          {view === "coverage" && (
            noContextAssigned ? <NoAssignmentState /> : <CoverageView standards={standards} byStrand={byStrand} teacherId={userId} isHod={isHod} contextLabel={contextLabel} subjectId={activeContext?.subjectId ?? null} gradeLevelId={activeContext?.gradeLevelId ?? null} />
          )}
          {view === "long-term-plan" && (
            noContextAssigned ? <NoAssignmentState /> : <LongTermPlanView
              teacherId={userId}
              isHod={isHod}
              standards={standards}
              initialPlanId={ltpInitialPlanId}
              initialUnitId={ltpInitialUnitId}
              onInitialConsumed={() => { setLtpInitialPlanId(null); setLtpInitialUnitId(null); }}
              contextLabel={contextLabel}
              subjectId={activeContext?.subjectId ?? null}
              gradeLevelId={activeContext?.gradeLevelId ?? null}
            />
          )}
          {view === "student-progress" && (
            noContextAssigned ? <NoAssignmentState /> : <StudentProgressView teacherId={userId} standards={standards} byStrand={byStrand} isHod={isHod} contextLabel={contextLabel} />
          )}
          {view === "delivery-grid" && isHod && (
            <DeliveryGridView
              teacherId={userId}
              subjectId={activeContext?.subjectId ?? profileSubjectId ?? null}
              gradeLevelId={activeContext?.gradeLevelId ?? null}
              onNavigate={setView}
            />
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
