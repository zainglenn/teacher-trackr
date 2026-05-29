"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BookOpen,
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Users,
  LogOut,
  UserCog,
  School,
  Grid3X3,
  Settings2,
  ShieldCheck,
  Search,
  ClipboardCheck,
  Building2,
} from "lucide-react";
import { Role } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { AppNotification } from "@/hooks/useNotifications";
import { NotificationBell } from "@/components/NotificationPanel";
import { SubjectGradeContext } from "@/components/SubjectGradeContext";
import { SidebarSeparator } from "@/components/ui/sidebar";
import type { ActiveContext } from "@/hooks/useActiveContext";
import type { ClassAssignment } from "@/types";

export type AppView =
  | "dashboard"
  | "coverage"
  | "long-term-plan"
  | "student-progress"
  | "delivery-grid"
  | "hod-review"
  | "hod-settings"
  | "manage-users"
  | "my-units"
  | "platform-settings"
  | "curriculum-audit"
  | "school-setup"
  | "schools";

type NavItem = {
  key: AppView;
  label: string;
  icon: React.ElementType;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard",        label: "Dashboard",          icon: LayoutDashboard, roles: ["hod"] },
  { key: "my-units",         label: "My Units",           icon: School,          roles: ["teacher"] },
  { key: "long-term-plan",   label: "Master Plans",       icon: ClipboardList,   roles: ["teacher", "hod"] },
  { key: "delivery-grid",    label: "Delivery Grid",      icon: Grid3X3,         roles: ["hod"] },
  { key: "hod-review",       label: "Plan Reviews",       icon: ClipboardCheck,  roles: ["hod"] },
  { key: "coverage",         label: "Standards Coverage", icon: CheckSquare,     roles: ["teacher", "hod"] },
  { key: "student-progress", label: "Student Progress",   icon: Users,           roles: ["teacher", "hod"] },
  { key: "hod-settings",     label: "HOD Settings",       icon: Settings2,       roles: ["hod"] },
  { key: "manage-users",     label: "Manage Users",       icon: UserCog,         roles: ["admin"] },
  { key: "school-setup",     label: "School Setup",       icon: Building2,       roles: ["admin"] },
  { key: "platform-settings",label: "Platform Settings",  icon: ShieldCheck,     roles: ["admin"] },
  { key: "curriculum-audit", label: "Curriculum Audit",   icon: Search,          roles: ["admin"] },
  { key: "schools",          label: "Schools",            icon: Building2,       roles: ["platform_admin"] },
];

interface AppSidebarProps {
  view: AppView;
  onViewChange: (v: AppView) => void;
  role: Role;
  username: string;
  overdueCount?: number;
  notifications?: AppNotification[];
  activeContext?: ActiveContext | null;
  contextAssignments?: ClassAssignment[];
  onContextChange?: (ctx: ActiveContext) => void;
}

export function AppSidebar({ view, onViewChange, role, username, overdueCount = 0, notifications = [], activeContext, contextAssignments, onContextChange }: AppSidebarProps) {
  const { signOut } = useAuth();

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border w-[220px]">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-3">
          <div className="bg-sidebar-primary rounded p-1">
            <BookOpen className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
          </div>
          <p className="text-sm font-semibold text-sidebar-foreground leading-tight flex-1">Curriculum Tracker</p>
          <NotificationBell notifications={notifications} onNavigate={onViewChange} />
        </div>
        {contextAssignments && contextAssignments.length > 0 && onContextChange && (
          <>
            <SidebarSeparator />
            <SubjectGradeContext
              activeContext={activeContext ?? null}
              assignments={contextAssignments}
              onContextChange={onContextChange}
            />
            <SidebarSeparator />
          </>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {items.map((item) => {
              const isActive = view === item.key;
              return (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => onViewChange(item.key)}
                    className={`cursor-pointer h-8 text-sm rounded-none border-l-2 px-3 ${
                      isActive
                        ? "border-l-primary bg-sidebar-accent/60 font-medium text-sidebar-foreground"
                        : "border-l-transparent font-normal text-sidebar-foreground/70 hover:bg-muted/50 hover:text-sidebar-foreground"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {item.key === "delivery-grid" && overdueCount > 0 && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[var(--status-overdue-text)] text-[9px] font-bold text-white">
                        {overdueCount > 9 ? "9+" : overdueCount}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{username}</p>
            <span className={`inline-flex shrink-0 items-center px-1 py-0.5 rounded text-[10px] font-semibold border ${
              role === "hod"
                ? "bg-violet-100 text-violet-700 border-violet-200"
                : role === "admin"
                ? "bg-rose-100 text-rose-700 border-rose-200"
                : role === "platform_admin"
                ? "bg-slate-800 text-slate-100 border-slate-700"
                : "bg-blue-100 text-blue-700 border-blue-200"
            }`}>
              {role === "hod" ? "HOD" : role === "admin" ? "Admin" : role === "platform_admin" ? "Platform" : "Teacher"}
            </span>
          </div>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
