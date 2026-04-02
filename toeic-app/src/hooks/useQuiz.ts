import { useState, useCallback } from "react";
import questionsData from "../data/questions.json";
import { db, getTodayRecord } from "../db";
import type { Question, Answer } from "../db";
import { syncProgress } from "./useSync";
import { addToSRS, advanceSRS } from "./useSRS";

const allQuestions = questionsData as Question[];

export type SessionType = "morning" | "noon" | "evening" | "review" | "diagnosis";

interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: { questionId: string; selectedIndex: number; correct: boolean; timeMs: number }[];
  isFinished: boolean;
}

export function useQuiz(sessionType: SessionType, questionCount = 5) {
  const [state, setState] = useState<QuizState | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const start = useCallback((customQuestions?: Question[]) => {
    let selected: Question[];
    if (customQuestions) {
      selected = customQuestions;
    } else {
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      selected = shuffled.slice(0, questionCount);
    }
    setState({
      questions: selected,
      currentIndex: 0,
      answers: [],
      isFinished: false,
    });
    setStartTime(Date.now());
  }, [questionCount]);

  const answer = useCallback(async (selectedIndex: number) => {
    if (!state || state.isFinished) return;

    const question = state.questions[state.currentIndex];
    const correct = selectedIndex === question.answer;
    const timeMs = Date.now() - startTime;

    const answerRecord: Answer = {
      questionId: question.id,
      correct,
      selectedIndex,
      answeredAt: new Date().toISOString(),
      sessionType,
      timeMs,
    };
    await db.answers.add(answerRecord);

    // SRS: add wrong answers, advance correct ones
    if (correct) {
      advanceSRS(question.id);
    } else {
      addToSRS(question.id);
    }

    const newAnswers = [
      ...state.answers,
      { questionId: question.id, selectedIndex, correct, timeMs },
    ];
    const nextIndex = state.currentIndex + 1;
    const isFinished = nextIndex >= state.questions.length;

    if (isFinished) {
      // Update daily record
      const record = await getTodayRecord();
      const correctCount = newAnswers.filter((a) => a.correct).length;
      if (sessionType === "morning" || sessionType === "noon" || sessionType === "evening") {
        record[sessionType] = true;
      }
      if (sessionType === "review") {
        record.reviewDone = true;
      }
      record.totalCorrect += correctCount;
      record.totalAnswered += newAnswers.length;
      await db.dailyRecords.put(record);

      // Sync progress to agent
      await syncProgress();
    }

    setState({
      ...state,
      currentIndex: nextIndex,
      answers: newAnswers,
      isFinished,
    });
    setStartTime(Date.now());
  }, [state, startTime, sessionType]);

  const currentQuestion = state && !state.isFinished
    ? state.questions[state.currentIndex]
    : null;

  return {
    state,
    currentQuestion,
    start,
    answer,
    progress: state
      ? { current: state.currentIndex + 1, total: state.questions.length }
      : null,
    results: state?.isFinished
      ? {
          answers: state.answers,
          questions: state.questions,
          score: state.answers.filter((a) => a.correct).length,
          total: state.answers.length,
        }
      : null,
  };
}
