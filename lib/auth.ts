// Auth stub. Margin is client-only (boards live in this browser's IndexedDB), so there is no account server yet.
// Each function validates nothing beyond what the form already checked and resolves immediately; the signed-in name
// is kept in localStorage only so a future screen can greet the user.
// TODO: replace with a real provider (e.g. Auth.js / Supabase) before storing anything account-related on a server.

export interface AuthResult {
  ok: true;
  name: string;
}

const KEY = "margin:user";

function remember(name: string): AuthResult {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name }));
  } catch {
    // Storage can be blocked (private windows); signing in still works for this visit.
  }
  return { ok: true, name };
}

export async function signIn(email: string, _password: string): Promise<AuthResult> {
  void _password;
  return remember(email.split("@")[0] || "friend");
}

export async function signUp(name: string, _email: string, _password: string): Promise<AuthResult> {
  void _email;
  void _password;
  return remember(name.trim());
}

export async function signInWithGoogle(): Promise<AuthResult> {
  return remember("friend");
}

/** Pretends to send a reset link. Nothing is sent. */
export async function sendReset(_email: string): Promise<void> {
  void _email;
}
