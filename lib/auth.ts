"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AuthResult =
  | { ok: true; name: string; needsConfirm?: boolean }
  | { ok: false; error: string };

const NOT_SET_UP = "Accounts aren't set up on this copy yet. You can continue without an account.";

export function authEnabled(): boolean {
  return supabase !== null;
}

export function displayName(user: User): string {
  const meta = user.user_metadata as { name?: string } | undefined;
  return meta?.name?.trim() || user.email?.split("@")[0] || "friend";
}

function fail(message: string): AuthResult {
  return { ok: false, error: message };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return fail(NOT_SET_UP);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(error.message);
  return { ok: true, name: displayName(data.user) };
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  if (!supabase) return fail(NOT_SET_UP);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim() }, emailRedirectTo: `${location.origin}/dashboard` },
  });
  if (error) return fail(error.message);
  // With email confirmation on, there is no session until the link in the inbox is opened.
  return { ok: true, name: name.trim(), needsConfirm: !data.session };
}

/** Redirects away to Google; the page is left, so this only returns on failure. */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return fail(NOT_SET_UP);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}/dashboard` },
  });
  return error ? fail(error.message) : { ok: true, name: "" };
}

export async function sendReset(email: string): Promise<AuthResult> {
  if (!supabase) return fail(NOT_SET_UP);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/reset-password`,
  });
  return error ? fail(error.message) : { ok: true, name: "" };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  if (!supabase) return fail(NOT_SET_UP);
  const { data, error } = await supabase.auth.updateUser({ password });
  return error ? fail(error.message) : { ok: true, name: displayName(data.user) };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** The signed-in user: undefined while loading, null for a guest. */
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(supabase ? undefined : null);
  useEffect(() => {
    if (!supabase) return;
    let live = true;
    supabase.auth.getSession().then(({ data }) => live && setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return user;
}
