"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePassword, useUser } from "@/lib/auth";

// Reached from the link in the reset email: Supabase signs the user in with a recovery session first.
export default function ResetPassword() {
  const router = useRouter();
  const user = useUser();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 6) return setMsg("password needs 6+ characters");
    setBusy(true);
    setMsg("");
    const r = await updatePassword(pw).catch(() => null);
    if (!r?.ok) {
      setBusy(false);
      return setMsg(r ? r.error : "couldn't reach the server, try again");
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center gap-6 px-6">
      <Link href="/" className="font-[family-name:var(--font-heading)] text-[1.625rem] font-semibold !text-[var(--color-text)] no-underline">
        Margin
      </Link>
      <h1 className="m-0 font-[family-name:var(--font-heading)] text-[2.5rem] font-normal leading-none">Choose a new password</h1>
      {user === null ? (
        <p>
          This reset link has expired or was already used. <Link href="/login">Back to sign in</Link>, then tap Forgot it? for a new one.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            New password
            <input
              type="password"
              className="input"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setMsg(""); }}
              placeholder="at least 6 characters"
              autoComplete="new-password"
            />
          </label>
          <p role="status" className="m-0 min-h-[1.5em] font-[family-name:var(--font-caveat)] text-xl text-[var(--pen-red)]">{msg}</p>
          <button type="submit" className="btn btn-primary" disabled={busy || user === undefined}>
            {busy ? "Saving..." : "Save password"}
          </button>
        </form>
      )}
    </main>
  );
}
