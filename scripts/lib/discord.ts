import { readFile } from "node:fs/promises";
import { join } from "node:path";

const PROJECT_ROOT = join(import.meta.dir, "../..");
const ENV_PATH = join(PROJECT_ROOT, "discord-bot/.env");

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

/**
 * Discord REST API でチャンネルにメッセージを送信
 * 既存の DISCORD_TOKEN と DISCORD_CHANNEL_ID を使う
 */
export async function sendMessage(content: string): Promise<void> {
  const env = await loadEnv();
  const token = process.env.DISCORD_TOKEN || env.DISCORD_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID || env.DISCORD_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error("DISCORD_TOKEN and DISCORD_CHANNEL_ID are required");
  }

  const res = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API error ${res.status}: ${body}`);
  }
}
