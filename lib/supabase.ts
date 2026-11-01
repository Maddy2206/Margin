import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** The browser client, or null when the env vars are missing (the app then runs guest-only). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
