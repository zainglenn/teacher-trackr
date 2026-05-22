"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BookOpen, LayoutDashboard, CheckSquare, ClipboardList, Users, ClipboardCheck, LogOut, UserCog, BookMarked, GraduationCap } from "lucide-react";
import { Role } from "@/types";
import { useAuth } from "@/hooks/useAuth";

export type AppView = "dashboard" | "coverage" | "long-term-plan" | "student-progress" | "hod-review" | "manage-users" | "manage-classes" | "my-units" | "unit-assignments";

const NAV_ITEMS: { key: AppView; label: string; icon: React.ElementType; hodOnly?: boolean; teacherOnly?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "coverage", label: "Standards Coverage", icon: CheckSquare },
  { key: "long-term-plan", label: "Long Term Plan", icon: ClipboardList },
  { key: "my-units", label: "My Units", icon: BookMarked, teacherOnly: true },
  { key: "student-progress", label: "Student Progress", icon: Users },
  { key: "hod-review", label: "HOD Review", icon: ClipboardCheck, hodOnly: true },
  { key: "unit-assignments", label: "Unit Assignments", icon: BookMarked, hodOnly: true },
  { key: "manage-classes", label: "Manage Classes", icon: GraduationCap, hodOnly: true },
  { key: "manage-users", label: "Manage Users", icon: UserCog, hodOnly: true },
];

interface AppSidebarProps {
  view: AppView;
  onViewChange: (v: AppView) => void;
  role: Role;
  email: string;
  resubmittedCount?: number;
}

export function AppSidebar({ view, onViewChange, role, email, resubmittedCount = 0 }: AppSidebarProps) {
  const { signOut } = useAuth();

  const items = NAV_ITEMS.filter((item) =>
    (!item.hodOnly || role === "hod") && (!item.teacherOnly || role === "teacher")
  );

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary rounded-lg p-1.5">
            <BookOpen className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground leading-tight">Curriculum Tracker</p>
            <p className="text-xs text-sidebar-foreground/60 leading-tight">Grade 6 English</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={view === item.key}
                    onClick={() => onViewChange(item.key)}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.key === "hod-review" && resubmittedCount > 0 && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                        {resubmittedCount > 9 ? "9+" : resubmittedCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{email}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role === "hod" ? "Head of Department" : "Teacher"}</p>
          </div>
          <button
            onClick={signOut}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
