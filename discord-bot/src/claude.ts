import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const PROJECT_ROOT = join(import.meta.dir, "../..");
const SESSION_FILE = join(import.meta.dir, "../.session-id");

interface SessionData {
  sessionId: string;
  date: string; // YYYY-MM-DD
}

function today(): string {
  return new Date().toLocaleDateString("sv-SE");
}

async function loadSessionId(): Promise<string | null> {
  try {
    const raw = (await readFile(SESSION_FILE, "utf-8")).trim();
    if (!raw.startsWith("{")) return null;
    const data: SessionData = JSON.parse(raw);
    if (data.date !== today()) {
      console.log(`[Session] 日付変更（${data.date} → ${today()}）、セッションリセット`);
      return null;
    }
    return data.sessionId;
  } catch {
    return null;
  }
}

async function saveSessionId(id: string): Promise<void> {
  const data: SessionData = { sessionId: id, date: today() };
  await writeFile(SESSION_FILE, JSON.stringify(data), "utf-8");
}

async function refreshProgress(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return;

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("progress")
      .select("data")
      .eq("user_id", "default")
      .single();

    if (error) {
      console.warn("[Progress] Supabase error:", error.message);
      return;
    }
    if (data?.data) {
      await writeFile(
        join(PROJECT_ROOT, "data/progress.json"),
        JSON.stringify(data.data, null, 2),
        "utf-8",
      );
    }
  } catch (err) {
    console.warn("[Progress] Failed to fetch from Supabase:", err);
  }
}

export async function chat(message: string, newSession = false): Promise<string> {
  // Cloud から最新の progress を取得してローカルファイルに反映
  await refreshProgress();

  const sessionId = newSession ? null : await loadSessionId();
  const isNewSession = !sessionId;

  const args = [
    "--print",
    "--dangerously-skip-permissions",
    "--output-format", "json",
    "--model", "claude-sonnet-4-6",
  ];
  if (sessionId) {
    args.push("--resume", sessionId);
  }

  // 新規セッション時は進捗チェックを促すプレフィックスを付与
  const prompt = isNewSession
    ? `[NEW SESSION] まず data/progress.json を読んで進捗に基づいた挨拶をしてから、以下のメッセージに返答して。\n\nユーザーのメッセージ: ${message}`
    : message;
  args.push(prompt);

  return new Promise((resolve, reject) => {
    const proc = spawn("claude", args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    proc.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`claude 終了コード ${code}: stderr=${stderr} stdout=${stdout.slice(0, 500)}`));
        return;
      }
      try {
        const json = JSON.parse(stdout);
        if (json.session_id) await saveSessionId(json.session_id);
        resolve(json.result ?? json.response ?? stdout.trim());
      } catch {
        resolve(stdout.trim());
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`claude 起動失敗: ${err.message}`));
    });
  });
}
