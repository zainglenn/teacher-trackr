"use client";

import { useState, useMemo } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter, ModalCancel, ConfirmModal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Search, KeyRound } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useSubjects } from "@/hooks/useSubjects";
import { Profile, Role } from "@/types";

const ROLE_CONFIG: Record<Role, { label: string; shortLabel: string; className: string }> = {
  hod:            { label: "Head of Department", shortLabel: "HOD",      className: "bg-violet-100 text-violet-700 border-violet-200" },
  teacher:        { label: "Teacher",            shortLabel: "Teacher",  className: "bg-blue-100 text-blue-700 border-blue-200" },
  admin:          { label: "Admin",              shortLabel: "Admin",    className: "bg-rose-100 text-rose-700 border-rose-200" },
  platform_admin: { label: "Platform Admin",     shortLabel: "Platform", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

const USERNAME_RE = /^[a-zA-Z0-9._]{2,30}$/;

function userInitials(name: string | null, username: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

interface Props {
  currentUserId: string;
  overrideSchoolId?: string | null;
}

export function ManageUsersView({ currentUserId, overrideSchoolId }: Props) {
  const { users, loading, createUser, updateUser, deleteUser, resetPassword } = useAdminUsers(overrideSchoolId);
  const { subjects } = useSubjects(overrideSchoolId);

  // Inline subject edit state
  const [editingSubjectFor, setEditingSubjectFor] = useState<string | null>(null);
  const [subjectEditSaving, setSubjectEditSaving] = useState(false);

  async function handleSubjectChange(userId: string, subjectId: string | null) {
    setSubjectEditSaving(true);
    try {
      await updateUser(userId, { subject_id: subjectId });
    } finally {
      setSubjectEditSaving(false);
      setEditingSubjectFor(null);
    }
  }

  // Add user dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("teacher");
  const [newNotifEmail, setNewNotifEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  // Edit user dialog
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("teacher");
  const [editNotifEmail, setEditNotifEmail] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Role promotion confirm
  const [confirmPromotion, setConfirmPromotion] = useState<{ user: Profile; newRole: Role } | null>(null);
  const [promotionSaving, setPromotionSaving] = useState(false);

  // Search / filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        (u.username ?? "").toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  function resetAdd() {
    setNewUsername(""); setNewName(""); setNewPassword(""); setNewRole("teacher");
    setNewNotifEmail(""); setAddError("");
  }

  function openEdit(user: Profile) {
    setEditUser(user);
    setEditUsername(user.username ?? "");
    setEditName(user.full_name ?? "");
    setEditRole(user.role as Role);
    setEditNotifEmail(user.notification_email ?? "");
    setEditError("");
  }

  function openResetPassword(user: Profile) {
    setResetTarget(user);
    setResetPw("");
    setResetError("");
  }

  async function handleAdd() {
    if (!newUsername || !newPassword) return;
    if (!USERNAME_RE.test(newUsername)) {
      setAddError("Username must be 2–30 chars: letters, numbers, dots or underscores.");
      return;
    }
    setAddSaving(true); setAddError("");
    try {
      await createUser(newUsername, newPassword, newName, newRole, newNotifEmail || undefined);
      setAddOpen(false); resetAdd();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to create user");
    } finally { setAddSaving(false); }
  }

  async function handleEdit() {
    if (!editUser) return;
    const roleChanged = editRole !== editUser.role;
    const isPromotion = roleChanged && (editRole === "hod" || editRole === "admin");
    if (isPromotion) {
      setConfirmPromotion({ user: editUser, newRole: editRole });
      return;
    }
    if (editUsername && !USERNAME_RE.test(editUsername)) {
      setEditError("Invalid username format."); return;
    }
    setEditSaving(true); setEditError("");
    try {
      await updateUser(editUser.id, {
        username: editUsername || undefined,
        full_name: editName || undefined,
        role: editRole,
        notification_email: editNotifEmail,
      });
      setEditUser(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update user");
    } finally { setEditSaving(false); }
  }

  async function handleConfirmPromotion() {
    if (!confirmPromotion || !editUser) return;
    if (editUsername && !USERNAME_RE.test(editUsername)) {
      setEditError("Invalid username format."); return;
    }
    setPromotionSaving(true); setEditError("");
    try {
      await updateUser(editUser.id, {
        username: editUsername || undefined,
        full_name: editName || undefined,
        role: confirmPromotion.newRole,
        notification_email: editNotifEmail,
      });
      setConfirmPromotion(null);
      setEditUser(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update user");
    } finally { setPromotionSaving(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleteSaving(true);
    try {
      await deleteUser(confirmDelete.id);
      setConfirmDelete(null);
    } finally { setDeleteSaving(false); }
  }

  async function handleResetPassword() {
    if (!resetTarget || resetPw.length < 6) return;
    setResetSaving(true); setResetError("");
    try {
      await resetPassword(resetTarget.id, resetPw);
      setResetTarget(null);
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Failed to reset password");
    } finally { setResetSaving(false); }
  }

  if (loading) return null;

  return (
    <PageContainer
      title="Manage Users"
      description={`${users.length} user${users.length !== 1 ? "s" : ""} with access to the system`}
      action={
        <Button size="sm" onClick={() => { resetAdd(); setAddOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add User
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search + role filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by username or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
            <SelectTrigger className="h-8 text-sm w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="hod">Head of Department</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} of {users.length}</span>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Username</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-36">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40 hidden lg:table-cell">Subject</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28 hidden md:table-cell">Joined</th>
                <th className="w-24 px-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No users match your search.
                  </td>
                </tr>
              ) : filtered.map((user) => {
                const config = ROLE_CONFIG[user.role as Role] ?? ROLE_CONFIG.teacher;
                const isSelf = user.id === currentUserId;
                const joined = new Date(user.created_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                });

                return (
                  <tr key={user.id} className="border-t hover:bg-muted/20 transition-colors">
                    {/* User column */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                          user.role === "hod"            ? "bg-violet-100 text-violet-700" :
                          user.role === "admin"          ? "bg-rose-100 text-rose-700" :
                          user.role === "platform_admin" ? "bg-slate-200 text-slate-700" :
                                                           "bg-blue-100 text-blue-700"
                        }`}>
                          {userInitials(user.full_name, user.username ?? "")}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{user.full_name ?? user.username}</span>
                            {isSelf && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">you</span>
                            )}
                          </div>
                          <div className="sm:hidden text-xs text-muted-foreground mt-0.5 font-mono">
                            {user.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm font-mono text-muted-foreground">{user.username}</span>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${config.className}`}>
                        {config.label}
                      </span>
                    </td>

                    {/* Subject — HOD and Teacher */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {(user.role === "hod" || user.role === "teacher") ? (
                        editingSubjectFor === user.id ? (
                          <Select
                            value={user.subject_id ?? "none"}
                            onValueChange={(v) => v && handleSubjectChange(user.id, v === "none" ? null : v)}
                            onOpenChange={(open) => { if (!open && !subjectEditSaving) setEditingSubjectFor(null); }}
                            disabled={subjectEditSaving}
                          >
                            <SelectTrigger className="h-7 text-xs w-36" autoFocus>
                              <SelectValue placeholder="No subject" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No subject</SelectItem>
                              {subjects.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            className="text-xs text-left group flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={() => setEditingSubjectFor(user.id)}
                            title="Click to assign subject"
                          >
                            {(() => {
                              const subjectId = user.subject_id;
                              const subject = subjects.find((s) => s.id === subjectId);
                              return subject
                                ? <span className="font-medium text-foreground">{subject.name}</span>
                                : <span className="text-muted-foreground italic">Assign subject</span>;
                            })()}
                            <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 shrink-0" />
                          </button>
                        )
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">—</span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                      {joined}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openResetPassword(user)}
                          title="Reset password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(user)}
                          title="Edit user"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!isSelf && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                            onClick={() => setConfirmDelete(user)}
                            title="Delete user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add user dialog */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); resetAdd(); }} title="Add User">
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Username <span className="text-rose-500">*</span></Label>
            <Input
              placeholder="e.g. jade.teacher"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoFocus
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Letters, numbers, dots, underscores — 2–30 chars.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input
              placeholder="e.g. Jade Glenn"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password <span className="text-rose-500">*</span></Label>
            <Input
              type="password"
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role <span className="text-rose-500">*</span></Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="hod">Head of Department</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notification Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="email"
              placeholder="for future alerts only"
              value={newNotifEmail}
              onChange={(e) => setNewNotifEmail(e.target.value)}
            />
          </div>
          {addError && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{addError}</p>}
        </div>
        <ModalFooter>
          <ModalCancel onClick={() => { setAddOpen(false); resetAdd(); }} />
          <Button onClick={handleAdd} disabled={addSaving || !newUsername || !newPassword}>
            {addSaving ? "Creating…" : "Create User"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit user dialog */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg mb-2">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                {userInitials(editUser.full_name, editUser.username ?? "")}
              </div>
              <div>
                <p className="text-sm font-medium">{editUser.full_name ?? editUser.username}</p>
                <p className="text-xs text-muted-foreground font-mono">{editUser.username}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                placeholder="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                autoFocus
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">Changing username also updates their login credentials.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Full name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="hod">Head of Department</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notification Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="email"
                placeholder="for future alerts only"
                value={editNotifEmail}
                onChange={(e) => setEditNotifEmail(e.target.value)}
              />
            </div>
            {editError && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{editError}</p>}
          </div>
        )}
        <ModalFooter>
          <ModalCancel onClick={() => setEditUser(null)} />
          <Button onClick={handleEdit} disabled={editSaving}>
            {editSaving ? "Saving…" : "Save Changes"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reset password dialog */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Password"
      >
        {resetTarget && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                {userInitials(resetTarget.full_name, resetTarget.username ?? "")}
              </div>
              <div>
                <p className="text-sm font-medium">{resetTarget.full_name ?? resetTarget.username}</p>
                <p className="text-xs text-muted-foreground font-mono">{resetTarget.username}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Password <span className="text-rose-500">*</span></Label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={resetPw}
                onChange={(e) => setResetPw(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The user will need to use this password on their next login.
              </p>
            </div>
            {resetError && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{resetError}</p>}
          </div>
        )}
        <ModalFooter>
          <ModalCancel onClick={() => setResetTarget(null)} />
          <Button onClick={handleResetPassword} disabled={resetSaving || resetPw.length < 6}>
            {resetSaving ? "Resetting…" : "Set Password"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove user?"
        description={
          confirmDelete
            ? `This will permanently delete ${confirmDelete.full_name ?? confirmDelete.username}'s account and all associated data. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove User"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteSaving}
      />

      {/* Role promotion confirm */}
      <ConfirmModal
        open={!!confirmPromotion}
        onClose={() => setConfirmPromotion(null)}
        title={`Promote to ${confirmPromotion ? (confirmPromotion.newRole === "hod" ? "Head of Department" : "Admin") : ""}?`}
        description={
          confirmPromotion
            ? `This gives ${confirmPromotion.user.full_name ?? confirmPromotion.user.username} ${confirmPromotion.newRole === "hod" ? "Head of Department" : "Admin"} access. They will see all curriculum data on next login. This can be reversed by editing the user again.`
            : ""
        }
        confirmLabel="Confirm Promotion"
        variant="default"
        onConfirm={handleConfirmPromotion}
        loading={promotionSaving}
      />
    </PageContainer>
  );
}
