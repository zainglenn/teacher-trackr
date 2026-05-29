"use client";

import { useState } from "react";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, X } from "lucide-react";
import { AppNotification, NotificationSeverity } from "@/hooks/useNotifications";
import { AppView } from "@/components/AppSidebar";

interface NotificationPanelProps {
  notifications: AppNotification[];
  onNavigate: (view: AppView) => void;
}

const SEVERITY_CONFIG: Record<NotificationSeverity, {
  icon: React.ElementType;
  iconClass: string;
  rowClass: string;
  dotClass: string;
}> = {
  urgent: {
    icon: AlertCircle,
    iconClass: "text-rose-500",
    rowClass: "border-rose-100 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/20",
    dotClass: "bg-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    rowClass: "border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20",
    dotClass: "bg-amber-500",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-500",
    rowClass: "border-blue-100 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-950/10",
    dotClass: "bg-blue-400",
  },
};

export function NotificationBell({
  notifications,
  onNavigate,
}: NotificationPanelProps) {
  const [open, setOpen] = useState(false);
  const count = notifications.length;
  const urgentCount = notifications.filter((n) => n.severity === "urgent").length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label={`${count} notification${count !== 1 ? "s" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white leading-none ${
              urgentCount > 0 ? "bg-rose-500" : "bg-amber-500"
            }`}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="absolute left-full top-0 ml-2 z-50 w-80 rounded-xl border bg-background shadow-lg overflow-hidden"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">Notifications</p>
              <div className="flex items-center gap-2">
                {count === 0 && (
                  <span className="text-xs text-muted-foreground">All clear</span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {count === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
              </div>
            ) : (
              <ul className="max-h-96 overflow-y-auto divide-y">
                {notifications.map((n) => {
                  const cfg = SEVERITY_CONFIG[n.severity];
                  const Icon = cfg.icon;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (n.actionView) onNavigate(n.actionView as AppView);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/30 transition-colors ${n.actionView ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.iconClass}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground leading-snug">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
