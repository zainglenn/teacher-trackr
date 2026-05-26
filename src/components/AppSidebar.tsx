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
  ShieldAlert,
} from "lucide-react";
import { Role } from "@/types";
import { useAuth } from "@/hooks/useAuth";

export type AppView =
  | "dashboard"
  | "coverage"
  | "long-term-plan"
  | "student-progress"
  | "delivery-grid"
  | "hod-admin"
  | "manage-users"
  | "my-class"
  | "admin";

type NavItem = {
  key: AppView;
  label: string;
  icon: React.ElementType;
  hodOnly?: boolean;
  teacherOnly?: boolean;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard",       label: "Dashboard",          icon: LayoutDashboard },
  { key: "my-class",        label: "My Class",           icon: School,       teacherOnly: true },
  { key: "coverage",        label: "Standards Coverage", icon: CheckSquare },
  { key: "long-term-plan",  label: "Master Plans",       icon: ClipboardList },
  { key: "student-progress",label: "Student Progress",   icon: Users },
  { key: "delivery-grid",   label: "Delivery Grid",      icon: Grid3X3,      hodOnly: true },
  { key: "hod-admin",       label: "Admin Panel",        icon: Settings2,    hodOnly: true },
  { key: "manage-users",    label: "Manage Users",       icon: UserCog,      hodOnly: true },
  { key: "admin",           label: "Admin Panel",        icon: ShieldAlert,  adminOnly: true },
];

interface AppSidebarProps {
  view: AppView;
  onViewChange: (v: AppView) => void;
  role: Role;
  email: string;
  overdueCount?: number;
}

export function AppSidebar({ view, onViewChange, role, email, overdueCount = 0 }: AppSidebarProps) {
  const { signOut } = useAuth();

  const items = NAV_ITEMS.filter(
    (item) =>
      (!item.hodOnly || role === "hod") &&
      (!item.teacherOnly || role === "teacher") &&
      (!item.adminOnly || role === "admin")
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
            <p className="text-xs text-sidebar-foreground/60 leading-tight">Dubai Schools</p>
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
                    {item.key === "delivery-grid" && overdueCount > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[var(--status-overdue-text)] text-[10px] font-bold text-white">
                        {overdueCount > 9 ? "9+" : overdueCount}
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
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {role === "hod" ? "Head of Department" : role === "admin" ? "Administrator" : "Teacher"}
            </p>
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
