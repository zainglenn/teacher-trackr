"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function SuspendedSchoolMessage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-5">
        <Ban className="h-7 w-7 text-rose-500" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">School account suspended</h1>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
        Your school&apos;s access to Curriculum Tracker has been suspended.
        Please contact your platform administrator.
      </p>
      <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
    </div>
  );
}
