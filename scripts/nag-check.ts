#!/usr/bin/env bun
/**
 * 煽りチェックスクリプト
 * launchd で朝9時・昼14時・夜23時に実行
 * progress.json を読み、未完了セッションがあれば Discord に Lisa の煽りメッセージを送信
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sendMessage } from "./lib/discord.ts";
import { fetchProgress } from "./lib/supabase.ts";

const PROGRESS_FILE = join(import.meta.dir, "../data/progress.json");

interface Progress {
  lastSync: string | null;
  streak: number;
  today: {
    morning: { completed: boolean };
    noon: { completed: boolean };
    evening: { completed: boolean };
    review: { completed: boolean; pending: number };
  };
  cumulative: {
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
  };
  exam: {
    date: string;
    daysRemaining: number;
  };
}

async function loadProgress(): Promise<Progress | null> {
  // Supabase から取得
  try {
    const data = await fetchProgress();
    if (data) return data as unknown as Progress;
  } catch (err) {
    console.warn("[Nag] Supabase fetch failed, falling back to local file:", err);
  }
  // フォールバック: ローカルファイル
  try {
    const raw = await readFile(PROGRESS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getHour(): number {
  return new Date().getHours();
}

function buildNagMessage(progress: Progress): string | null {
  const hour = getHour();
  const { today, streak, cumulative, exam } = progress;

  const shouldHaveDone: string[] = [];
  if (hour >= 12 && !today.morning.completed) shouldHaveDone.push("morning");
  if (hour >= 18 && !today.noon.completed) shouldHaveDone.push("afternoon");
  if (hour >= 23 && !today.evening.completed) shouldHaveDone.push("evening");

  if (shouldHaveDone.length === 0) return null;

  const daysLeft = exam.daysRemaining;
  const missedCount = shouldHaveDone.length;
  const sessions = shouldHaveDone.join(", ");

  const acc = Math.round(cumulative.accuracy * 100);
  const messages = [
    // tier 1: 1 session missed
    [
      `Umm hey?? Your ${sessions} session is still not done 👀 You have ${daysLeft} days left and your accuracy is ${acc}%... that's not gonna fix itself lol 💢`,
      `Helloooo?? ${sessions} session — not done 💢 You wanna stay at ${acc}% forever?? Open the app. NOW. ✨`,
      `${sessions} session is literally waiting for you rn 😤 ${daysLeft} days until the exam, ${streak}-day streak on the line~ don't throw it away for nothing!`,
    ],
    // tier 2: 2 sessions missed
    [
      `Okay so ${sessions} — both skipped?? 💢💢 Your accuracy is ${acc}% and you're out here doing NOTHING?? ${daysLeft} days left omg I can't 🤦‍♀️`,
      `${missedCount} sessions missed today lol are you serious rn?? ${acc}% accuracy isn't gonna cut it and you KNOW that 💢 Get on the app already! 😤`,
      `You skipped ${sessions} today... that's ${missedCount} sessions 💀 ${daysLeft} days until the exam and your streak is only ${streak} days~ what are you even doing?? 🤷‍♀️`,
    ],
    // tier 3: all 3 sessions missed
    [
      `OMG ZERO sessions today?? ZERO!! 💢💢💢 ${acc}% accuracy, ${daysLeft} days left, and you're just NOT studying?? You wanna fail?? Because this is how you fail!! 😡`,
      `I cannot believe this~ morning, afternoon, evening — ALL skipped 💀 ${daysLeft} days until the exam!! Your accuracy is ${acc}%!! ${streak === 0 ? "Streak is already 0!!" : `You're about to lose your ${streak}-day streak!!`} MOVE IT NOW!! 🔥💢`,
      `Not a single session today... not ONE 😤 ${daysLeft} days left and you're at ${acc}%~ do you actually want to hit 700 or are you just pretending?? Open the app. Right now. No excuses!! 💢🔥`,
    ],
  ];

  const tier = Math.min(missedCount, 3) - 1;
  const pool = messages[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Main
const progress = await loadProgress();
if (!progress || !progress.lastSync) {
  console.log("[Nag] No progress data or never synced — skipping");
  process.exit(0);
}

const message = buildNagMessage(progress);
if (message) {
  await sendMessage(message);
  console.log("[Nag] Message sent!");
} else {
  console.log("[Nag] All sessions up to date — no nag needed");
}
