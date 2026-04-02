import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../../db";
import type { Question } from "../../db";
import { useQuiz } from "../../hooks/useQuiz";
import { QuestionCard } from "../Quiz/QuestionCard";
import { getDueQuestionIds } from "../../hooks/useSRS";
import questionsData from "../../data/questions.json";

const allQuestions = questionsData as Question[];

export function ReviewSession() {
  const [reviewQuestions, setReviewQuestions] = useState<Question[] | null>(null);
  const { state, currentQuestion, start, answer, progress, results } = useQuiz("review", 5);

  useEffect(() => {
    (async () => {
      // First try SRS due items
      const dueIds = await getDueQuestionIds();
      let questions: Question[] = [];

      if (dueIds.length > 0) {
        questions = dueIds
          .map((id) => allQuestions.find((q) => q.id === id))
          .filter((q): q is Question => q !== undefined)
          .slice(0, 10);
      }

      // Fallback: recent wrong answers not in SRS
      if (questions.length === 0) {
        const wrongAnswers = await db.answers
          .where("sessionType")
          .notEqual("diagnosis")
          .filter((a) => !a.correct)
          .toArray();

        const seen = new Set<string>();
        const wrongIds: string[] = [];
        for (const a of wrongAnswers.reverse()) {
          if (!seen.has(a.questionId)) {
            seen.add(a.questionId);
            wrongIds.push(a.questionId);
          }
        }

        questions = wrongIds
          .map((id) => allQuestions.find((q) => q.id === id))
          .filter((q): q is Question => q !== undefined)
          .slice(0, 10);
      }

      setReviewQuestions(questions);
    })();
  }, []);

  // Start quiz when review questions are loaded
  useEffect(() => {
    if (reviewQuestions && reviewQuestions.length > 0 && !state) {
      start(reviewQuestions);
    }
  }, [reviewQuestions, state, start]);

  if (reviewQuestions === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (reviewQuestions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <p className="text-4xl mb-4">🎉</p>
        <h1 className="text-xl font-bold mb-2">No mistakes to review!</h1>
        <p className="text-slate-400 mb-8 text-center">
          You haven't gotten anything wrong yet~ Are you secretly a genius? 😏✨
        </p>
        <Link
          to="/"
          className="px-8 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl font-bold transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (results) {
    const pct = Math.round((results.score / results.total) * 100);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-2">Review Complete 📝</h1>
        <div className="text-6xl font-bold my-6">
          <span className={pct >= 80 ? "text-green-400" : "text-yellow-400"}>
            {results.score}
          </span>
          <span className="text-slate-500">/{results.total}</span>
        </div>
        <p className="text-pink-300 mb-8">
          {pct === 100
            ? "You remembered everything! Okay I'm impressed~ 🎉"
            : pct >= 80
              ? "Getting better! You're actually learning huh~ ✨"
              : "Still struggling with these... We're gonna keep practicing okay? 💢"}
        </p>
        <Link
          to="/"
          className="px-8 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl font-bold transition-colors"
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
        <Link to="/" className="text-slate-500 hover:text-white text-sm mb-2 inline-block">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-yellow-400">Review Session 📝</h1>
      </div>

      <div className="w-full max-w-lg mx-auto mb-6 px-4">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all duration-300"
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
