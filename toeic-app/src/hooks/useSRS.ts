import { db } from "../db";

// SRS intervals in days
const INTERVALS = [1, 3, 7, 14, 30];

/**
 * 間違えた問題をSRSキューに追加（または既存のアイテムをリセット）
 */
export async function addToSRS(questionId: string): Promise<void> {
  const existing = await db.srsItems.get(questionId);
  if (existing) {
    // Reset interval on re-failure
    await db.srsItems.update(questionId, {
      interval: INTERVALS[0],
      nextReview: getNextDate(INTERVALS[0]),
      ease: Math.max(1, existing.ease - 1),
    });
  } else {
    await db.srsItems.put({
      questionId,
      nextReview: getNextDate(INTERVALS[0]),
      interval: INTERVALS[0],
      ease: 3,
      reviewCount: 0,
    });
  }
}

/**
 * SRS復習で正解した場合、次のインターバルに進める
 */
export async function advanceSRS(questionId: string): Promise<void> {
  const item = await db.srsItems.get(questionId);
  if (!item) return;

  const currentIdx = INTERVALS.indexOf(item.interval);
  const nextIdx = Math.min(currentIdx + 1, INTERVALS.length - 1);

  if (currentIdx >= INTERVALS.length - 1) {
    // Max interval reached, remove from SRS
    await db.srsItems.delete(questionId);
  } else {
    await db.srsItems.update(questionId, {
      interval: INTERVALS[nextIdx],
      nextReview: getNextDate(INTERVALS[nextIdx]),
      reviewCount: item.reviewCount + 1,
    });
  }
}

/**
 * 今日復習すべき問題のIDリストを取得
 */
export async function getDueQuestionIds(): Promise<string[]> {
  const now = new Date().toISOString();
  const dueItems = await db.srsItems
    .where("nextReview")
    .belowOrEqual(now)
    .toArray();
  return dueItems.map((item) => item.questionId);
}

/**
 * SRSキューの件数を取得
 */
export async function getSRSCount(): Promise<number> {
  const now = new Date().toISOString();
  return db.srsItems.where("nextReview").belowOrEqual(now).count();
}

function getNextDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
