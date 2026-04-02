import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ENV_PATH = join(import.meta.dir, "../../discord-bot/.env");

let _env: Record<string, string> | null = null;

async function loadEnv(): Promise<Record<string, string>> {
  if (_env) return _env;
  const content = await readFile(ENV_PATH, "utf-8").catch(() => "");
  _env = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^(\w+)=(.+)$/);
    if (match) _env[match[1]] = match[2];
  }
  return _env;
}

export async function fetchProgress(): Promise<Record<string, unknown> | null> {
  const env = await loadEnv();
  const url = process.env.SUPABASE_URL || env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[Supabase] SUPABASE_URL / SUPABASE_ANON_KEY not set");
    return null;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("progress")
    .select("data")
    .eq("user_id", "default")
    .single();

  if (error) {
    console.warn("[Supabase] fetch error:", error.message);
    return null;
  }

  return data?.data ?? null;
}
