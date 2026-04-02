import { Client, Events, GatewayIntentBits, type Message } from "discord.js";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { chat } from "./claude.js";

// 多重起動防止
const PID_FILE = join(import.meta.dir, "../.pid");
try {
  const existing = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
  try {
    process.kill(existing, 0);
    console.error(`[起動拒否] すでに PID ${existing} で起動中です`);
    process.exit(1);
  } catch {
    // プロセスが存在しない → 古いPIDファイルを無視
  }
} catch {
  // PIDファイルなし → 正常
}
writeFileSync(PID_FILE, String(process.pid), "utf-8");
process.on("exit", () => { try { unlinkSync(PID_FILE); } catch {} });
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.error("DISCORD_TOKEN と DISCORD_CHANNEL_ID が必要です");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on(Events.ClientReady, (c) => {
  console.log(`[Discord] りさログイン完了: ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot) return;
  if (message.channelId !== CHANNEL_ID) return;

  const content = message.content.trim();
  if (!content) return;

  // !new でセッションリセット
  const newSession = content.startsWith("!new");
  const userMessage = newSession ? content.replace(/^!new\s*/, "").trim() || "新しいセッションを開始しました" : content;

  console.log(`[受信] ${message.author.username}: ${userMessage.slice(0, 80)}`);
  await message.react("⏳").catch(() => {});

  try {
    const response = await chat(userMessage, newSession);
    await sendLongMessage(message, response);
  } catch (err) {
    console.error("[エラー]", err);
    await message.reply(`エラーが発生しました: ${String(err)}`);
  } finally {
    await message.reactions.cache.get("⏳")?.remove().catch(() => {});
  }
});

// 2000文字超のメッセージを分割して送信
async function sendLongMessage(message: Message, text: string): Promise<void> {
  const chunks = splitMessage(text);
  for (const chunk of chunks) {
    await message.reply(chunk);
  }
}

function splitMessage(text: string, maxLength = 1900): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt <= 0) splitAt = maxLength;

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

client.login(DISCORD_TOKEN);
