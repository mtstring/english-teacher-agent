import { db, getStreak, getCumulativeStats, getTodayRecord } from "../db";
import { supabase } from "../lib/supabase";

export async function syncProgress(): Promise<void> {
  try {
    const [today, streak, stats] = await Promise.all([
      getTodayRecord(),
      getStreak(),
      getCumulativeStats(),
    ]);

    // Get weak points from recent wrong answers
    const recentWrong = await db.answers
      .where("correct")
      .equals(0)
      .reverse()
      .limit(50)
      .toArray();

    const categoryCounts: Record<string, number> = {};
    for (const a of recentWrong) {
      const cat = a.questionId.split("-")[0];
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const srsQueue = await db.srsItems
      .where("nextReview")
      .belowOrEqual(new Date().toISOString())
      .count();

    const payload = {
      lastSync: new Date().toISOString(),
      streak,
      today: {
        morning: { completed: today.morning },
        noon: { completed: today.noon },
        evening: { completed: today.evening },
        review: { completed: today.reviewDone, pending: srsQueue },
      },
      cumulative: {
        totalAnswered: stats.totalAnswered,
        totalCorrect: stats.totalCorrect,
        accuracy: stats.accuracy,
        level: Math.floor(stats.totalAnswered / 50) + 1,
        xp: stats.totalCorrect * 10,
      },
      weakPoints: Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat]) => cat),
      srsQueue,
      estimatedScore: null,
      exam: {
        date: "2026-06-28",
        daysRemaining: Math.ceil(
          (new Date("2026-06-28").getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
        registrationDeadline: "2026-05-14",
      },
    };

    const { error } = await supabase
      .from("progress")
      .upsert({ user_id: "default", data: payload }, { onConflict: "user_id" });

    if (error) console.warn("[Sync] Supabase error:", error.message);
  } catch (err) {
    console.warn("[Sync] Failed to sync progress:", err);
  }
}
