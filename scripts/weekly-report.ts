#!/usr/bin/env bun
/**
 * 週次レポート生成スクリプト
 * launchd で日曜21時に実行
 * 今週の学習データを集計して Discord に Lisa の口調でレポート送信
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { sendMessage } from "./lib/discord.ts";
import { fetchProgress } from "./lib/supabase.ts";

const PROJECT_ROOT = join(import.meta.dir, "..");
const PROGRESS_FILE = join(PROJECT_ROOT, "data/progress.json");
const STATS_DIR = join(PROJECT_ROOT, "data/stats");

interface Progress {
  lastSync: string | null;
  streak: number;
  cumulative: {
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
    level: number;
    xp: number;
  };
  weakPoints: string[];
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
    console.warn("[Weekly] Supabase fetch failed, falling back to local file:", err);
  }
  // フォールバック: ローカルファイル
  try {
    const raw = await readFile(PROGRESS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildWeeklyReport(progress: Progress): string {
  const { cumulative, streak, exam, weakPoints } = progress;
  const accuracy = Math.round(cumulative.accuracy * 100);

  let grade: string;
  let comment: string;

  if (accuracy >= 90) {
    grade = "S";
    comment = "You're literally on fire this week~ Keep this up and 800 is EASY 🔥✨";
  } else if (accuracy >= 80) {
    grade = "A";
    comment = "Pretty solid week! You're getting better~ but don't slack off now 💪";
  } else if (accuracy >= 70) {
    grade = "B";
    comment = "Not bad~ but I know you can do better right? Let's push harder next week 😏";
  } else if (accuracy >= 60) {
    grade = "C";
    comment = "Hmm... this could be better 💢 More practice needed! Don't give up tho~";
  } else {
    grade = "D";
    comment = "Okay we REALLY need to step it up 💢💢 More sessions, more reviews!!";
  }

  const weakStr = weakPoints.length > 0
    ? `\n**Weak spots:** ${weakPoints.join(", ")}`
    : "";

  return [
    "# 📊 Weekly Report by Lisa 🎀",
    "",
    `**Grade: ${grade}**`,
    "",
    `| Stat | Value |`,
    `|------|-------|`,
    `| Total Questions | ${cumulative.totalAnswered} |`,
    `| Correct | ${cumulative.totalCorrect} |`,
    `| Accuracy | ${accuracy}% |`,
    `| Streak | 🔥 ${streak} days |`,
    `| Level | ${cumulative.level} |`,
    `| XP | ${cumulative.xp} |`,
    `| Days until exam | ${exam.daysRemaining} |`,
    weakStr,
    "",
    comment,
  ].join("\n");
}

async function saveWeeklyStats(progress: Progress) {
  await mkdir(STATS_DIR, { recursive: true });
  const date = new Date().toLocaleDateString("sv-SE");
  const statsFile = join(STATS_DIR, `${date}.json`);
  await writeFile(statsFile, JSON.stringify({
    date,
    ...progress.cumulative,
    streak: progress.streak,
  }, null, 2), "utf-8");
  console.log(`[Weekly] Stats saved to ${statsFile}`);
}

// Main
const progress = await loadProgress();
if (!progress || !progress.lastSync) {
  console.log("[Weekly] No progress data — skipping");
  process.exit(0);
}

const report = buildWeeklyReport(progress);
await sendMessage(report);
console.log("[Weekly] Report sent!");
await saveWeeklyStats(progress);
