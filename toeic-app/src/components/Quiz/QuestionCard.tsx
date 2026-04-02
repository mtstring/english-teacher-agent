import { useState } from "react";
import type { Question, QuestionType } from "../../db";

interface Props {
  question: Question;
  onAnswer: (selectedIndex: number) => void;
  progress: { current: number; total: number };
}

const LABELS = ["A", "B", "C", "D"];

const TYPE_LABELS: Record<QuestionType, string> = {
  "fill-in": "Fill in the blank",
  "reorder": "Word order",
  "true-false": "True or False",
  "meaning": "Choose the meaning",
};

export function QuestionCard({ question, onAnswer, progress }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelected(index);
    setShowResult(true);
    setTimeout(() => {
      onAnswer(index);
      setSelected(null);
      setShowResult(false);
    }, 1500);
  };

  const isCorrect = selected === question.answer;

  return (
    <div className="max-w-lg mx-auto px-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-pink-400">
          Question {progress.current} / {progress.total}
        </span>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
          {TYPE_LABELS[question.type || "fill-in"]}
        </span>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <p className="text-lg leading-relaxed whitespace-pre-line">{question.stem}</p>
      </div>

      <div className="space-y-3">
        {question.choices.map((choice, i) => {
          let className =
            "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ";
          if (showResult) {
            if (i === question.answer) {
              className += "border-green-400 bg-green-400/10 text-green-300";
            } else if (i === selected) {
              className += "border-red-400 bg-red-400/10 text-red-300";
            } else {
              className += "border-slate-700 bg-slate-800/50 text-slate-500";
            }
          } else {
            className +=
              "border-slate-700 bg-slate-800 active:border-slate-500 active:bg-slate-700 text-white cursor-pointer";
          }

          return (
            <button
              key={i}
              className={className}
              onClick={() => handleSelect(i)}
              disabled={showResult}
            >
              <span className="font-bold text-pink-400 mr-3">{LABELS[i]}</span>
              {choice}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div
          className={`mt-6 p-4 rounded-xl ${
            isCorrect
              ? "bg-green-400/10 border border-green-400/30"
              : "bg-red-400/10 border border-red-400/30"
          }`}
        >
          <p className="font-bold mb-1">
            {isCorrect ? "Correct! Nice one~ ✨" : "Nope~ 💢"}
          </p>
          <p className="text-sm text-slate-300">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
