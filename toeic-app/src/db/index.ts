import Dexie, { type EntityTable } from "dexie";

export type QuestionType = "fill-in" | "reorder" | "true-false" | "meaning";

export interface Question {
  id: string;
  part: number; // TOEIC Part (5, 6, 7)
  type?: QuestionType; // 問題タイプ（省略時は fill-in）
  category: string; // e.g. "grammar", "vocabulary", "tense"
  stem: string; // 問題文
  choices: string[]; // 選択肢
  answer: number; // 正解のインデックス
  explanation: string; // 解説
  difficulty: number; // 1-5
}

export interface Answer {
  id?: number;
  questionId: string;
  correct: boolean;
  selectedIndex: number;
  answeredAt: string; // ISO date
  sessionType: "morning" | "noon" | "evening" | "review" | "diagnosis";
  timeMs: number; // 回答にかかった時間
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  morning: boolean;
  noon: boolean;
  evening: boolean;
  reviewDone: boolean;
  totalCorrect: number;
  totalAnswered: number;
}

export interface SRSItem {
  questionId: string;
  nextReview: string; // ISO date
  interval: number; // days (1, 3, 7, 14, 30)
  ease: number; // difficulty factor
  reviewCount: number;
}

export interface UserState {
  key: string;
  value: string | number | boolean | null;
}

const db = new Dexie("toeic800") as Dexie & {
  answers: EntityTable<Answer, "id">;
  dailyRecords: EntityTable<DailyRecord, "date">;
  srsItems: EntityTable<SRSItem, "questionId">;
  userState: EntityTable<UserState, "key">;
};

db.version(1).stores({
  answers: "++id, questionId, answeredAt, sessionType",
  dailyRecords: "date",
  srsItems: "questionId, nextReview",
  userState: "key",
});

export { db };

// Helper: get or set user state
export async function getUserState<T = string>(
  key: string,
  defaultValue: T,
): Promise<T> {
  const row = await db.userState.get(key);
  return row ? (row.value as T) : defaultValue;
}

export async function setUserState(
  key: string,
  value: string | number | boolean | null,
): Promise<void> {
  await db.userState.put({ key, value });
}

// Helper: today's date as YYYY-MM-DD
export function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE");
}

// Helper: get or create today's daily record
export async function getTodayRecord(): Promise<DailyRecord> {
  const date = todayStr();
  const existing = await db.dailyRecords.get(date);
  if (existing) return existing;
  const record: DailyRecord = {
    date,
    morning: false,
    noon: false,
    evening: false,
    reviewDone: false,
    totalCorrect: 0,
    totalAnswered: 0,
  };
  await db.dailyRecords.put(record);
  return record;
}

// Helper: calculate streak
export async function getStreak(): Promise<number> {
  const records = await db.dailyRecords.orderBy("date").reverse().toArray();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < records.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toLocaleDateString("sv-SE");
    if (records[i].date === expectedStr && records[i].totalAnswered > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Helper: cumulative stats
export async function getCumulativeStats() {
  const answers = await db.answers.toArray();
  const totalAnswered = answers.length;
  const totalCorrect = answers.filter((a) => a.correct).length;
  return {
    totalAnswered,
    totalCorrect,
    accuracy: totalAnswered > 0 ? totalCorrect / totalAnswered : 0,
  };
}
