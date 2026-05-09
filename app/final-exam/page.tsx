"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import { questions } from "@/data/questions";
import type { Question } from "@/data/types";
import {
  buildFinalExamReviewPlan,
  buildFinalExamSession,
  formatExamTime,
  getFinalExamPassReadiness,
  loadFinalExamAttempts,
  saveFinalExamAttempt,
  scoreFinalExamAttempt,
  type FinalExamAttempt,
  type FinalExamLength,
  type FinalExamSession,
  type FinalExamSetup,
  type FinalExamTimingMode,
} from "@/lib/finalExamStore";
import { loadMissedQuestions, saveMissedQuestions, storeQuizLaunchIntent, upsertMissedQuestion } from "@/lib/missedQuestionStore";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Flag, ListChecks, PlayCircle, RotateCcw, Target, TimerReset } from "lucide-react";

type ExamStatus = "setup" | "in-progress" | "results";

const examLengthOptions: Array<{ value: FinalExamLength; label: string; description: string }> = [
  { value: 150, label: "150-question full exam", description: "Full simulated exam coverage across all eight modules." },
  { value: 75, label: "75-question half exam", description: "Shorter pressure test with the same balanced module logic." },
];

const timingOptions: Array<{ value: FinalExamTimingMode; label: string; description: string }> = [
  { value: "timed", label: "Timed", description: "Use the simulated CSCP exam pace." },
  { value: "untimed", label: "Untimed", description: "Practice final-exam coverage without clock pressure." },
];

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function FinalExamPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<FinalExamSetup>({ length: 150, timingMode: "timed" });
  const [session, setSession] = useState<FinalExamSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState<ExamStatus>("setup");
  const [attempt, setAttempt] = useState<FinalExamAttempt | null>(null);
  const [attemptHistory, setAttemptHistory] = useState<FinalExamAttempt[]>([]);

  const questionLookup = useMemo(() => new Map(questions.map((question) => [question.id, question])), []);
  const activeQuestions = useMemo(() => {
    if (!session) {
      return [];
    }

    return session.questionIds
      .map((questionId) => questionLookup.get(questionId))
      .filter((question): question is Question => question !== undefined);
  }, [questionLookup, session]);
  const currentQuestion = activeQuestions[currentQuestionIndex] ?? null;
  const answeredCount = session ? session.questionIds.filter((questionId) => answers[questionId] != null).length : 0;
  const unansweredCount = session ? Math.max(session.questionIds.length - answeredCount, 0) : 0;
  const progress = session && session.questionIds.length > 0 ? Math.round((answeredCount / session.questionIds.length) * 100) : 0;
  const remainingSeconds = session?.timeLimitSeconds == null ? null : Math.max(session.timeLimitSeconds - elapsedSeconds, 0);
  const reviewPlan = attempt ? buildFinalExamReviewPlan(attempt) : null;
  const missedReviews = useMemo(() => {
    if (!attempt) {
      return [];
    }

    return attempt.questionResults
      .filter((result) => !result.isCorrect)
      .map((result) => {
        const question = questionLookup.get(result.questionId);
        if (!question) {
          return null;
        }

        return {
          result,
          question,
          selectedChoiceText: result.selectedChoiceId
            ? question.choices.find((choice) => choice.id === result.selectedChoiceId)?.text ?? "Selected answer unavailable"
            : "Unanswered",
          correctChoiceText: question.choices.find((choice) => choice.id === question.correctChoiceId)?.text ?? "Correct answer unavailable",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [attempt, questionLookup]);

  const saveFinalExamMisses = useCallback((nextAttempt: FinalExamAttempt) => {
    let nextMissedQuestions = loadMissedQuestions();
    nextAttempt.questionResults.forEach((result) => {
      if (result.isCorrect || result.selectedChoiceId === null) {
        return;
      }

      nextMissedQuestions = upsertMissedQuestion(nextMissedQuestions, {
        questionId: result.questionId,
        userSelectedChoiceId: result.selectedChoiceId,
        status: "new",
        missedAt: nextAttempt.completedAt,
      });
    });
    saveMissedQuestions(nextMissedQuestions);
  }, []);

  const submitExam = useCallback(() => {
    if (!session || status !== "in-progress") {
      return;
    }

    const nextAttempt = scoreFinalExamAttempt({
      session,
      questionPool: questions,
      answers,
      elapsedSeconds: session.timeLimitSeconds == null ? elapsedSeconds : Math.min(elapsedSeconds, session.timeLimitSeconds),
    });
    saveFinalExamAttempt(nextAttempt);
    saveFinalExamMisses(nextAttempt);
    setAttempt(nextAttempt);
    setAttemptHistory(loadFinalExamAttempts());
    setStatus("results");
  }, [answers, elapsedSeconds, saveFinalExamMisses, session, status]);

  useEffect(() => {
    setAttemptHistory(loadFinalExamAttempts());
  }, []);

  useEffect(() => {
    if (!session || status !== "in-progress" || session.timeLimitSeconds == null) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session, status]);

  useEffect(() => {
    if (!session || status !== "in-progress" || session.timeLimitSeconds == null) {
      return;
    }

    if (elapsedSeconds >= session.timeLimitSeconds) {
      submitExam();
    }
  }, [elapsedSeconds, session, status, submitExam]);

  function startExam(nextSetup: FinalExamSetup = setup) {
    const nextSession = buildFinalExamSession(questions, nextSetup);
    setSetup(nextSetup);
    setSession(nextSession);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setElapsedSeconds(0);
    setAttempt(null);
    setStatus("in-progress");
  }

  function selectAnswer(choiceId: string) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: choiceId,
    }));
  }

  function clearCurrentAnswer() {
    if (!currentQuestion) {
      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: null,
    }));
  }

  function restartSetup() {
    setSession(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setElapsedSeconds(0);
    setAttempt(null);
    setStatus("setup");
  }

  function retakeWeakAreas() {
    if (!reviewPlan) {
      return;
    }

    storeQuizLaunchIntent({
      mode: "weak-area",
      moduleId: reviewPlan.weakModuleIds[0] ?? "all",
      topic: reviewPlan.weakTopics[0] ?? "all",
      difficulty: "hard",
      length: 25,
    });
    router.push("/quiz?mode=weak-area&difficulty=hard&length=25");
  }

  return (
    <div className="space-y-6">
      <section className="app-card p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="app-eyebrow">Final Exam</p>
            <h1 className="app-page-title mt-3 max-w-4xl tracking-tight">Simulated CSCP exam practice.</h1>
            <p className="app-body-copy mt-4 max-w-3xl text-base">
              Run a balanced final exam from the original local question bank with mixed difficulty, no coaching during the attempt, and a full debrief after submission.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Saved attempts</p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{attemptHistory.length}</p>
          </div>
        </div>
      </section>

      {status === "setup" ? (
        <section className="grid gap-5 lg:grid-cols-[0.72fr_0.28fr]">
          <article className="app-card p-5 sm:p-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Build final exam</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Coverage is balanced across all eight modules. Medium and hard questions are prioritized, with some easy questions included for foundation checks.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {examLengthOptions.map((option) => {
                const isActive = setup.length === option.value;
                return (
                  <button
                    key={option.value}
                    className={classNames(
                      "rounded-lg border p-4 text-left transition",
                      isActive
                        ? "border-[rgb(45_212_191/0.55)] bg-[rgb(45_212_191/0.12)] shadow-sm"
                        : "border-(--forge-border-soft) bg-(--forge-surface-primary) hover:border-[rgb(45_212_191/0.4)] hover:bg-(--forge-surface-elevated)",
                    )}
                    type="button"
                    onClick={() => setSetup((currentSetup) => ({ ...currentSetup, length: option.value }))}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-black text-slate-950 dark:text-white">{option.label}</span>
                      {isActive ? <CheckCircle2 className="text-cyan-700 dark:text-cyan-300" size={18} aria-hidden="true" /> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {timingOptions.map((option) => {
                const isActive = setup.timingMode === option.value;
                return (
                  <button
                    key={option.value}
                    className={classNames(
                      "rounded-lg border p-4 text-left transition",
                      isActive
                        ? "border-[rgb(45_212_191/0.55)] bg-[rgb(45_212_191/0.12)] shadow-sm"
                        : "border-(--forge-border-soft) bg-(--forge-surface-primary) hover:border-[rgb(45_212_191/0.4)] hover:bg-(--forge-surface-elevated)",
                    )}
                    type="button"
                    onClick={() => setSetup((currentSetup) => ({ ...currentSetup, timingMode: option.value }))}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-base font-black text-slate-950 dark:text-white">{option.label}</span>
                      <Clock3 className={isActive ? "text-teal-700 dark:text-teal-300" : "text-slate-400"} size={18} aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70 md:grid-cols-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Modules</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">8</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Questions</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{setup.length}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Difficulty</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Mixed</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Clock</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{setup.timingMode === "timed" ? formatExamTime(setup.length === 150 ? 12_600 : 6_300) : "Off"}</p>
              </div>
            </div>

            <button
              className="app-btn-primary mt-6 px-5 py-3"
              type="button"
              onClick={() => startExam()}
            >
              <PlayCircle size={18} aria-hidden="true" />
              Start final exam
            </button>
          </article>

          <aside className="app-card p-5">
            <div className="flex items-center gap-2">
              <Flag className="text-cyan-700 dark:text-cyan-300" size={18} aria-hidden="true" />
              <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Recent attempts</h2>
            </div>
            <div className="mt-5 space-y-3">
              {attemptHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">No final exam attempts yet.</div>
              ) : attemptHistory.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950 dark:text-white">{item.score}%</p>
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{item.length}Q</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{getFinalExamPassReadiness(item.score)}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      ) : null}

      {status === "in-progress" && session && currentQuestion ? (
        <section className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <aside className="app-card p-5 xl:sticky xl:top-8 xl:self-start">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Exam cockpit</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Answered</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{answeredCount}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Open</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{unansweredCount}</p>
              </div>
            </div>
            <div className="mt-5">
              <ProgressBar value={progress} label="Final exam progress" />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{progress}% answered</p>
            </div>
            <div className="mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900/70 dark:bg-cyan-950/40">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-800 dark:text-cyan-200">Time</p>
              <p className="mt-2 text-3xl font-black text-cyan-950 dark:text-cyan-100">{remainingSeconds == null ? formatExamTime(elapsedSeconds) : formatExamTime(remainingSeconds)}</p>
              <p className="mt-1 text-sm text-cyan-800 dark:text-cyan-200">{setup.timingMode === "timed" ? "Remaining" : "Elapsed"}</p>
            </div>
            <button
              className="app-btn-primary mt-5 w-full"
              type="button"
              onClick={submitExam}
            >
              Submit final exam
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </aside>

          <article className="app-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">Question {currentQuestionIndex + 1} of {session.questionIds.length}</span>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black capitalize text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{currentQuestion.difficulty}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{currentQuestion.moduleName}</span>
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Feedback hidden until submission</p>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-15">
              {activeQuestions.map((question, index) => {
                const isCurrent = currentQuestionIndex === index;
                const isAnswered = answers[question.id] != null;
                return (
                  <button
                    key={question.id}
                    className={classNames(
                      "rounded-lg border px-0 py-2 text-sm font-black transition",
                      isCurrent && "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950",
                      !isCurrent && isAnswered && "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-200",
                      !isCurrent && !isAnswered && "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900",
                    )}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{currentQuestion.topic}</p>
              <h2 className="mt-3 text-xl font-black leading-8 text-slate-950 dark:text-white sm:text-2xl">{currentQuestion.questionText}</h2>
            </div>

            <div className="mt-5 grid gap-3">
              {currentQuestion.choices.map((choice, choiceIndex) => {
                const isSelected = answers[currentQuestion.id] === choice.id;
                const choiceLabel = String.fromCharCode(65 + choiceIndex);
                return (
                  <button
                    key={choice.id}
                    className={classNames(
                      "flex min-h-14 w-full items-center gap-4 rounded-lg border px-4 py-3 text-left text-sm font-bold transition",
                      isSelected
                        ? "border-[rgb(45_212_191/0.7)] bg-[rgb(45_212_191/0.13)] text-(--forge-text-primary)"
                        : "border-(--forge-border-soft) bg-(--forge-surface-primary) text-(--forge-text-secondary) hover:border-[rgb(45_212_191/0.55)] hover:bg-(--forge-surface-elevated)",
                    )}
                    type="button"
                    onClick={() => selectAnswer(choice.id)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{choiceLabel}</span>
                    <span>{choice.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3">
                <button
                  className="app-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => setCurrentQuestionIndex((index) => Math.max(index - 1, 0))}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </button>
                <button
                  className="app-btn-secondary"
                  type="button"
                  onClick={clearCurrentAnswer}
                >
                  Clear answer
                </button>
              </div>
              <button
                className="app-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => setCurrentQuestionIndex((index) => Math.min(index + 1, activeQuestions.length - 1))}
                disabled={currentQuestionIndex === activeQuestions.length - 1}
              >
                Next question
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {status === "results" && attempt && reviewPlan ? (
        <section className="space-y-5">
          <article className="app-card p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <div className="rounded-lg bg-slate-50 p-5 dark:bg-slate-800/70">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Overall score</p>
                <p className="mt-3 text-6xl font-black tracking-tight text-slate-950 dark:text-white">{attempt.score}%</p>
                <p className="mt-3 text-sm font-black text-slate-800 dark:text-slate-100">{getFinalExamPassReadiness(attempt.score)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{attempt.correctCount} correct out of {attempt.totalQuestions}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Final exam debrief</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{reviewPlan.headline}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Completed as a {attempt.length}-question {attempt.timingMode} exam in {formatExamTime(attempt.elapsedSeconds)}. Results are saved locally and now contribute to readiness scoring.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className="app-btn-primary"
                    type="button"
                    onClick={retakeWeakAreas}
                  >
                    <Target size={16} aria-hidden="true" />
                    Retake weak areas
                  </button>
                  <button
                    className="app-btn-secondary"
                    type="button"
                    onClick={() => startExam(setup)}
                  >
                    <TimerReset size={16} aria-hidden="true" />
                    Retake exam
                  </button>
                  <button
                    className="app-btn-secondary"
                    type="button"
                    onClick={restartSetup}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    New setup
                  </button>
                </div>
              </div>
            </div>
          </article>

          <section className="grid gap-5 xl:grid-cols-[0.62fr_0.38fr]">
            <article className="app-card p-5">
              <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Module breakdown</h3>
              <div className="mt-5 space-y-4">
                {attempt.moduleBreakdown.map((module) => (
                  <div key={module.id} className="grid gap-2 md:grid-cols-[260px_1fr_58px] md:items-center">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">{module.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{module.correct}/{module.total} correct · {module.attempted} answered</p>
                    </div>
                    <ProgressBar value={module.accuracy} label={`${module.label} final exam accuracy`} />
                    <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">{module.accuracy}%</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="app-card p-5">
              <div className="flex items-center gap-2">
                <ListChecks className="text-cyan-700 dark:text-cyan-300" size={18} aria-hidden="true" />
                <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Recommended review plan</h3>
              </div>
              <ul className="mt-5 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {reviewPlan.tasks.map((task) => (
                  <li key={task} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">{task}</li>
                ))}
              </ul>
              <Link href="/analytics" className="app-btn-secondary mt-5">
                Open analytics
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.45fr_0.55fr]">
            <article className="app-card p-5">
              <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Topic breakdown</h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                {attempt.topicBreakdown.slice(0, 12).map((topic) => (
                  <div key={topic.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-950 dark:text-white">{topic.label}</p>
                      <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">{topic.accuracy}%</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{topic.correct}/{topic.total} correct</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="app-card p-5">
              <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Missed questions</h3>
              {missedReviews.length === 0 ? (
                <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">Clean run. No missed questions in this attempt.</div>
              ) : (
                <div className="mt-5 max-h-180 space-y-4 overflow-y-auto pr-2">
                  {missedReviews.map(({ result, question, selectedChoiceText, correctChoiceText }) => (
                    <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{question.moduleName}</span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/40 dark:text-amber-100">{question.topic}</span>
                      </div>
                      <p className="mt-3 text-sm font-black leading-6 text-slate-950 dark:text-white">{question.questionText}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200"><span className="font-black">Your answer:</span> {selectedChoiceText}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200"><span className="font-black">Correct answer:</span> {correctChoiceText}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{question.explanation}</p>
                      {result.selectedChoiceId ? (
                        <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">{question.whyWrong[result.selectedChoiceId]}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </section>
      ) : null}

      {status === "in-progress" && (!session || !currentQuestion) ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900/80">
          <AlertTriangle className="mx-auto text-amber-500" size={32} aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">Unable to build final exam</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">The question bank does not have enough usable questions for this setup.</p>
          <button className="app-btn-primary mt-5" type="button" onClick={restartSetup}>Back to setup</button>
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite">
        {status === "in-progress" ? `Question ${currentQuestionIndex + 1}, ${answeredCount} answered.` : null}
      </div>
    </div>
  );
}