import { supabase } from "@/lib/supabase";

export async function getFreshToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  return refreshed?.access_token ?? null;
}

export async function adminFetch(
  path: string,
  options: RequestInit = {},
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const token = await getFreshToken();
  if (!token) throw new Error("Not authenticated");
  return fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(extraHeaders ?? {}),
      ...(options.headers ?? {}),
    },
  });
}
