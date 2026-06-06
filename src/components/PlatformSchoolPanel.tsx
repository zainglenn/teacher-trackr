"use client";

import { useState } from "react";
import { ManageUsersView } from "@/components/ManageUsersView";
import { SchoolSetupView } from "@/components/SchoolSetupView";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Users, Settings } from "lucide-react";

type Tab = "users" | "setup";

interface School {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  is_active: boolean;
}

interface Props {
  school: School;
  platformAdminId: string;
  onBack: () => void;
}

export function PlatformSchoolPanel({ school, platformAdminId, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("users");

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "users", label: "Users",       icon: Users    },
    { key: "setup", label: "School Setup", icon: Settings },
  ];

  return (
    <div className="space-y-4">
      {/* Back button + school header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
          All Schools
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{school.name}</h1>
          {(school.city || school.country) && (
            <p className="text-sm text-muted-foreground">
              {[school.city, school.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        {!school.is_active && (
          <span className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 border border-rose-200 font-medium">
            Suspended
          </span>
        )}
      </div>

      {/* Tab strip */}
      <div className="flex border-b border-border gap-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "users" && (
        <ManageUsersView
          currentUserId={platformAdminId}
          overrideSchoolId={school.id}
        />
      )}
      {tab === "setup" && (
        <SchoolSetupView overrideSchoolId={school.id} />
      )}
    </div>
  );
}
