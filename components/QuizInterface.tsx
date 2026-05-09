"use client";

import { useMemo, useState } from "react";
import type { CSCPModule, Difficulty, Question } from "@/data/types";
import { buildQuizSession } from "@/lib/quizEngine";
import { CheckCircle2, ChevronRight, XCircle } from "lucide-react";

type QuizInterfaceProps = {
  modules: CSCPModule[];
  questions: Question[];
};

const difficulties: Difficulty[] = ["easy", "medium", "hard"];

export default function QuizInterface({ modules, questions }: QuizInterfaceProps) {
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const session = useMemo(() => buildQuizSession(questions, { moduleId, difficulty }), [difficulty, moduleId, questions]);
  const currentQuestion = session.questions[questionIndex] ?? session.questions[0];
  const currentModule = modules.find((module) => module.id === moduleId) ?? modules[0];
  const hasAnswered = selectedChoiceId !== null;
  const isCorrect = hasAnswered && selectedChoiceId === currentQuestion.correctChoiceId;
  const score = answeredQuestions === 0 ? 0 : Math.round((correctAnswers / answeredQuestions) * 100);

  function resetQuestionState(nextModuleId = moduleId, nextDifficulty = difficulty) {
    setModuleId(nextModuleId);
    setDifficulty(nextDifficulty);
    setQuestionIndex(0);
    setSelectedChoiceId(null);
  }

  function handleAnswer(choiceId: string) {
    if (hasAnswered) {
      return;
    }

    setSelectedChoiceId(choiceId);
    setAnsweredQuestions((total) => total + 1);
    if (choiceId === currentQuestion.correctChoiceId) {
      setCorrectAnswers((total) => total + 1);
    }
  }

  function handleNextQuestion() {
    setSelectedChoiceId(null);
    setQuestionIndex((index) => (index + 1) % session.questions.length);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Session setup</h2>
        <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="module-select">Module</label>
        <select
          id="module-select"
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          value={moduleId}
          onChange={(event) => resetQuestionState(event.target.value, difficulty)}
        >
          {modules.map((module) => (
            <option key={module.id} value={module.id}>Module {module.number}: {module.name}</option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="difficulty-select">Difficulty</label>
        <select
          id="difficulty-select"
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          value={difficulty}
          onChange={(event) => resetQuestionState(moduleId, event.target.value as Difficulty)}
        >
          {difficulties.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Answered</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{answeredQuestions}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Score</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{score}%</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900/70 dark:bg-cyan-950/40">
          <p className="text-sm font-black text-cyan-950 dark:text-cyan-100">{currentModule.name}</p>
          <p className="mt-1 text-sm leading-6 text-cyan-800 dark:text-cyan-200">{session.questions.length} question(s) match this setup.</p>
        </div>
      </aside>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Question {questionIndex + 1} of {session.questions.length}</span>
            <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black capitalize text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{currentQuestion.difficulty}</span>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{currentQuestion.topic}</span>
        </div>

        <h2 className="mt-6 text-xl font-black leading-8 text-slate-950 dark:text-white sm:text-2xl">{currentQuestion.questionText}</h2>

        <div className="mt-6 grid gap-3">
          {currentQuestion.choices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id;
            const isCorrectOption = currentQuestion.correctChoiceId === choice.id;
            const feedbackClass = hasAnswered && isCorrectOption
              ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
              : hasAnswered && isSelected
                ? "border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100"
                : "border-slate-200 bg-white text-slate-800 hover:border-cyan-400 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/30";

            return (
              <button
                key={choice.id}
                className={`flex min-h-14 w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-bold transition ${feedbackClass}`}
                type="button"
                onClick={() => handleAnswer(choice.id)}
                disabled={hasAnswered}
              >
                <span>{choice.text}</span>
                {hasAnswered && isCorrectOption ? <CheckCircle2 size={19} aria-hidden="true" /> : null}
                {hasAnswered && isSelected && !isCorrectOption ? <XCircle size={19} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        {hasAnswered ? (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/70">
            <p className={`text-sm font-black ${isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
              {isCorrect ? "Correct" : "Not quite"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{currentQuestion.explanation}</p>
            {!isCorrect && selectedChoiceId ? (
              <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                {currentQuestion.whyWrong[selectedChoiceId]}
              </p>
            ) : null}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Trap: {currentQuestion.examTrap}</p>
              <p className="rounded-lg bg-cyan-50 p-3 text-sm leading-6 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100">Tip: {currentQuestion.studyTip}</p>
            </div>
            <button
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-cyan-700 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
              type="button"
              onClick={handleNextQuestion}
            >
              Next question
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </article>
    </section>
  );
}