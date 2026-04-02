import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuiz } from "../../hooks/useQuiz";
import { QuestionCard } from "../Quiz/QuestionCard";
import { setUserState } from "../../db";
import questionsData from "../../data/questions.json";
import type { Question } from "../../db";

const allQuestions = questionsData as Question[];

// Pick 20 questions spread across difficulties
function selectDiagnosisQuestions(): Question[] {
  const byDifficulty: Record<number, Question[]> = {};
  for (const q of allQuestions) {
    (byDifficulty[q.difficulty] ??= []).push(q);
  }
  const selected: Question[] = [];
  // Try to get 4 questions per difficulty level (1-5)
  for (let d = 1; d <= 5; d++) {
    const pool = byDifficulty[d] || [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, 4));
  }
  // If less than 20, fill from remaining
  if (selected.length < 20) {
    const usedIds = new Set(selected.map((q) => q.id));
    const remaining = allQuestions
      .filter((q) => !usedIds.has(q.id))
      .sort(() => Math.random() - 0.5);
    selected.push(...remaining.slice(0, 20 - selected.length));
  }
  return selected.slice(0, 20);
}

function estimateScore(correctRate: number): number {
  // Rough TOEIC score estimate: 10 (min) to 990 (max)
  // Linear mapping: 0% → 200, 100% → 900
  return Math.round(200 + correctRate * 700);
}

export function DiagnosisTest() {
  const navigate = useNavigate();
  const { state, currentQuestion, start, answer, progress, results } =
    useQuiz("diagnosis", 20);

  useEffect(() => {
    if (!state) {
      start(selectDiagnosisQuestions());
    }
  }, [state, start]);

  // Save diagnosis result
  useEffect(() => {
    if (results) {
      const rate = results.score / results.total;
      const estimated = estimateScore(rate);
      setUserState("diagnosisDone", true);
      setUserState("estimatedScore", estimated);
      setUserState("diagnosisAccuracy", Math.round(rate * 100));
    }
  }, [results]);

  if (!state) return null;

  if (results) {
    const rate = results.score / results.total;
    const estimated = estimateScore(rate);
    const pct = Math.round(rate * 100);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-2">Diagnosis Complete! 🔍</h1>

        <div className="bg-slate-800 rounded-xl p-6 my-6 text-center w-full max-w-sm">
          <div className="text-sm text-slate-400 mb-1">Estimated TOEIC Score</div>
          <div className="text-5xl font-bold text-pink-400">{estimated}</div>
          <div className="text-sm text-slate-400 mt-2">
            {pct}% correct ({results.score}/{results.total})
          </div>
        </div>

        <p className="text-pink-300 mb-8 text-center max-w-sm">
          {estimated >= 800
            ? "Wait what?! You're already pretty good! But let's make it consistent~ ✨"
            : estimated >= 600
              ? "Not bad! You've got a solid base. Let's push for 800 together! 💪"
              : estimated >= 400
                ? "Okay we've got work to do lol. But that's why I'm here right? 😏"
                : "Omg... we're starting from scratch huh 💢 Don't worry I'll whip you into shape!"}
        </p>

        <Link
          to="/"
          className="px-8 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl font-bold transition-colors"
        >
          Start Training! →
        </Link>
      </div>
    );
  }

  if (!currentQuestion || !progress) return null;

  return (
    <div className="min-h-screen py-8">
      <div className="text-center mb-8">
        <button
          onClick={() => navigate("/")}
          className="text-slate-500 hover:text-white text-sm mb-2 inline-block"
        >
          ← Skip Diagnosis
        </button>
        <h1 className="text-xl font-bold text-purple-400">Diagnosis Test 🔍</h1>
        <p className="text-sm text-slate-400 mt-1">Let me see your level~</p>
      </div>

      <div className="w-full max-w-lg mx-auto mb-6 px-4">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${((progress.current - 1) / progress.total) * 100}%` }}
          />
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        onAnswer={answer}
        progress={progress}
      />
    </div>
  );
}
