"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, Role } from "@/types";

async function getFreshToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  return refreshed?.access_token ?? null;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const token = await getFreshToken();
    if (!token) return;

    let res = await fetch("/api/admin/list-users", {
      headers: { authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      const { data: { session } } = await supabase.auth.refreshSession();
      const retryToken = session?.access_token;
      if (!retryToken) return;
      res = await fetch("/api/admin/list-users", {
        headers: { authorization: `Bearer ${retryToken}` },
      });
    }

    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function createUser(email: string, password: string, full_name: string, role: Role) {
    const token = await getFreshToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, password, full_name, role }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    await fetchUsers();
  }

  async function deleteUser(userId: string) {
    const token = await getFreshToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch("/api/admin/delete-user", {
      method: "DELETE",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  return { users, loading, createUser, deleteUser };
}
