"use client";

import { useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, UserCog, ShieldCheck } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Role } from "@/types";

const ROLE_CONFIG: Record<Role, { label: string; className: string; icon: React.ElementType }> = {
  hod: { label: "Head of Department", className: "bg-violet-100 text-violet-700", icon: ShieldCheck },
  teacher: { label: "Teacher", className: "bg-blue-100 text-blue-700", icon: UserCog },
};

export function ManageUsersView({ currentUserId }: { currentUserId: string }) {
  const { users, loading, createUser, deleteUser } = useAdminUsers();
  const [addDialog, setAddDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function resetForm() {
    setEmail(""); setFullName(""); setPassword(""); setRole("teacher"); setError("");
  }

  async function handleAdd() {
    if (!email || !password) return;
    setSaving(true);
    setError("");
    try {
      await createUser(email, password, fullName, role);
      setAddDialog(false);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <PageContainer
      title="Manage Users"
      description={`${users.length} user${users.length !== 1 ? "s" : ""} with access`}
      action={
        <Button size="sm" onClick={() => { resetForm(); setAddDialog(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          Add User
        </Button>
      }
    >
      <div className="space-y-2">
        {users.map((user) => {
          const config = ROLE_CONFIG[user.role as Role] ?? ROLE_CONFIG.teacher;
          const Icon = config.icon;
          const isSelf = user.id === currentUserId;

          return (
            <Card key={user.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-muted rounded-full p-2 shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {user.full_name ?? user.email}
                        </p>
                        {isSelf && (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        )}
                        <Badge className={`text-xs ${config.className}`}>{config.label}</Badge>
                      </div>
                      {user.full_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                      )}
                    </div>
                  </div>
                  {!isSelf && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 shrink-0"
                      onClick={() => setConfirmDelete(user.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addDialog} onOpenChange={(o) => { if (!o) { setAddDialog(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. Sarah Al Mansoori"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="teacher@dubaischools.ae"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input
                type="password"
                placeholder="They can change this after login"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="hod">Head of Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !email || !password}>
              {saving ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove user?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete their account and all associated data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteUser(confirmDelete!);
                setConfirmDelete(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
