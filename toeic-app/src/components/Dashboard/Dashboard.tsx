import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getTodayRecord,
  getStreak,
  getCumulativeStats,
  getUserState,
  type DailyRecord,
} from "../../db";
import { syncProgress } from "../../hooks/useSync";
import { getSRSCount } from "../../hooks/useSRS";

interface Stats {
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number;
}

const EXAM_DATE = "2026-06-28";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function Dashboard() {
  const [today, setToday] = useState<DailyRecord | null>(null);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState<Stats>({ totalAnswered: 0, totalCorrect: 0, accuracy: 0 });
  const [diagnosisDone, setDiagnosisDone] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [srsCount, setSrsCount] = useState(0);

  const loadData = useCallback(async () => {
    const [record, s, cumulative, diag, srs] = await Promise.all([
      getTodayRecord(),
      getStreak(),
      getCumulativeStats(),
      getUserState("diagnosisDone", false),
      getSRSCount(),
    ]);
    setToday(record);
    setStreak(s);
    setStats(cumulative);
    setDiagnosisDone(diag as boolean);
    setSrsCount(srs);
  }, []);

  useEffect(() => {
    loadData().then(() => {
      // Auto-sync on dashboard load
      syncProgress().catch(() => {});
    });
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      await syncProgress();
      await loadData();
      setSyncStatus("Synced! Lisa can see your progress now ✨");
    } catch (err) {
      setSyncStatus(`Sync failed: ${String(err)}`);
    }
    setSyncing(false);
  };

  const daysLeft = daysUntil(EXAM_DATE);
  const sessions = [
    { key: "morning" as const, label: "Morning", icon: "☀️", time: "AM" },
    { key: "noon" as const, label: "Afternoon", icon: "🌤️", time: "PM" },
    { key: "evening" as const, label: "Evening", icon: "🌙", time: "Night" },
  ];

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-gradient-to-b from-pink-500/20 to-transparent pt-8 pb-12 px-4 text-center">
        <h1 className="text-3xl font-bold">
          TOEIC <span className="text-pink-400">800</span>
        </h1>
        <p className="text-slate-400 mt-1">Lisa's English Training ✨</p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 space-y-6">
        {/* Diagnosis Banner */}
        {!diagnosisDone && (
          <Link
            to="/diagnosis"
            className="block bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-4 text-center hover:border-purple-400/50 transition-colors"
          >
            <p className="font-bold text-purple-300">Take the Diagnosis Test 🔍</p>
            <p className="text-sm text-slate-400 mt-1">
              20 questions to find your level ~ Skip anytime!
            </p>
          </Link>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">🔥 {streak}</div>
            <div className="text-xs text-slate-400 mt-1">Streak</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-pink-400">
              {Math.round(stats.accuracy * 100)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">Accuracy</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{daysLeft}</div>
            <div className="text-xs text-slate-400 mt-1">Days Left</div>
          </div>
        </div>

        {/* Level & XP */}
        {(() => {
          const xp = stats.totalCorrect * 10;
          const level = Math.floor(xp / 500) + 1;
          const xpInLevel = xp % 500;
          const xpProgress = (xpInLevel / 500) * 100;
          return (
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-purple-400">Lv.{level}</span>
                  <span className="text-sm text-slate-400">{xp} XP</span>
                </div>
                <span className="text-xs text-slate-500">{xpInLevel}/500 to next level</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Total Questions */}
        <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Total Questions Answered</div>
            <div className="text-2xl font-bold">{stats.totalAnswered}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Correct</div>
            <div className="text-2xl font-bold text-green-400">{stats.totalCorrect}</div>
          </div>
        </div>

        {/* Daily Sessions */}
        <div>
          <h2 className="text-lg font-bold mb-3">Today's Sessions</h2>
          <div className="space-y-3">
            {sessions.map((s) => {
              const done = today?.[s.key] ?? false;
              return (
                <Link
                  key={s.key}
                  to={`/quiz/${s.key}`}
                  className={`flex items-center p-4 rounded-xl border-2 transition-all ${
                    done
                      ? "border-green-400/30 bg-green-400/5 hover:border-green-400/50"
                      : "border-slate-700 bg-slate-800 hover:border-pink-400"
                  }`}
                >
                  <span className="text-2xl mr-4">{s.icon}</span>
                  <div className="flex-1">
                    <div className="font-bold">{s.label} Session</div>
                    <div className="text-sm text-slate-400">5 questions</div>
                  </div>
                  {done ? (
                    <span className="text-green-400 font-bold">Redo ↻</span>
                  ) : (
                    <span className="text-pink-400 font-bold">Start →</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Review */}
        <Link
          to="/review"
          className="block bg-slate-800 border-2 border-slate-700 hover:border-yellow-400 rounded-xl p-4 transition-colors"
        >
          <div className="flex items-center">
            <span className="text-2xl mr-4">📝</span>
            <div className="flex-1">
              <div className="font-bold">
                Review Mistakes
                {srsCount > 0 && (
                  <span className="ml-2 text-xs bg-yellow-400 text-slate-900 px-2 py-0.5 rounded-full">
                    {srsCount} due
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-400">Practice questions you got wrong</div>
            </div>
            <span className="text-yellow-400 font-bold">Go →</span>
          </div>
        </Link>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full bg-slate-800 border-2 border-slate-700 hover:border-cyan-400 rounded-xl p-4 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">{syncing ? "⏳" : "🔄"}</span>
            <span className="font-bold">{syncing ? "Syncing..." : "Sync with Lisa"}</span>
          </div>
          {syncStatus && (
            <p className="text-sm text-slate-400 mt-2">{syncStatus}</p>
          )}
        </button>

        {/* Lisa's message */}
        <div className="bg-pink-500/10 border border-pink-400/20 rounded-xl p-4">
          <p className="text-pink-300 text-sm">
            {streak >= 7
              ? `Omg ${streak} days straight?! You're actually insane~ keep going! 🔥✨`
              : streak >= 3
                ? `${streak} day streak! Not bad~ but don't get cocky lol 💪`
                : today?.morning || today?.noon || today?.evening
                  ? "You did a session today! Proud of u~ but there's more to do right? 😏"
                  : "Hellooo~ time to study! Your English won't improve by itself ya know 💢"}
          </p>
        </div>
      </div>
    </div>
  );
}
