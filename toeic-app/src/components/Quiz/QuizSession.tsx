import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import confetti from "canvas-confetti";
import { useQuiz, type SessionType } from "../../hooks/useQuiz";
import { QuestionCard } from "./QuestionCard";

const SESSION_LABELS: Record<string, string> = {
  morning: "Morning Session ☀️",
  noon: "Afternoon Session 🌤️",
  evening: "Evening Session 🌙",
};

export function QuizSession() {
  const { session } = useParams<{ session: string }>();
  const navigate = useNavigate();
  const sessionType = (session || "morning") as SessionType;
  const { state, currentQuestion, start, answer, progress, results } =
    useQuiz(sessionType, 5);

  useEffect(() => {
    if (!state) start();
  }, [state, start]);

  // Fire confetti on session complete
  useEffect(() => {
    if (results) {
      const pct = Math.round((results.score / results.total) * 100);
      if (pct === 100) {
        // Perfect score: big celebration
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 } }), 300);
      } else if (pct >= 60) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      }
    }
  }, [results]);

  if (!state) return null;

  if (results) {
    const pct = Math.round((results.score / results.total) * 100);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-2">
          {SESSION_LABELS[sessionType] || "Session Complete"}
        </h1>
        <div className="text-6xl font-bold my-6">
          <span className={pct >= 80 ? "text-green-400" : pct >= 60 ? "text-yellow-400" : "text-red-400"}>
            {results.score}
          </span>
          <span className="text-slate-500">/{results.total}</span>
        </div>
        <p className="text-slate-400 mb-2">{pct}% correct</p>
        <p className="text-pink-300 mb-8">
          {pct === 100
            ? "OMG perfect score! You're literally a genius 🎉"
            : pct >= 80
              ? "Yesss slay~ You're getting so good! ✨"
              : pct >= 60
                ? "Not bad~ but you can do better, right? 💪"
                : "Umm... we need to talk lol 💢 Review time!"}
        </p>

        <div className="space-y-4 w-full max-w-sm">
          {results.answers.map((a, i) => {
            const q = results.questions[i];
            return (
              <div
                key={q.id}
                className={`p-4 rounded-lg text-sm ${
                  a.correct
                    ? "bg-green-400/10 border border-green-400/20"
                    : "bg-red-400/10 border border-red-400/20"
                }`}
              >
                <p className="text-slate-300 mb-2">{q.stem}</p>
                {!a.correct && (
                  <p className="text-xs text-red-300 mb-2">
                    Your answer: {q.choices[a.selectedIndex]} → Correct: {q.choices[q.answer]}
                  </p>
                )}
                {a.correct && (
                  <p className="text-xs text-green-300 mb-2">
                    ✓ {q.choices[q.answer]}
                  </p>
                )}
                <p className="text-xs text-slate-400 border-t border-slate-700 pt-2">
                  {q.explanation}
                </p>
              </div>
            );
          })}
        </div>

        <Link
          to="/"
          className="mt-8 px-8 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl font-bold transition-colors"
        >
          Back to Dashboard
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
          ← Back
        </button>
        <h1 className="text-xl font-bold text-pink-400">
          {SESSION_LABELS[sessionType] || sessionType}
        </h1>
      </div>

      <div className="w-full max-w-lg mx-auto mb-6 px-4">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-500 rounded-full transition-all duration-300"
            style={{ width: `${((progress.current - 1) / progress.total) * 100}%` }}
          />
        </div>
      </div>

      <QuestionCard
        key={currentQuestion.id}
        question={currentQuestion}
        onAnswer={answer}
        progress={progress}
      />
    </div>
  );
}
