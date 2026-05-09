"use client";

import { useEffect, useMemo, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import { modules } from "@/data/modules";
import { missedQuestions, quizResults, topicPerformance, userProgress } from "@/data/mockProgress";
import { questions } from "@/data/questions";
import { calculateActiveRecallSummary, generateActiveRecallPrompts, loadActiveRecallProgress } from "@/lib/activeRecallStore";
import { loadFinalExamAttempts, type FinalExamAttempt } from "@/lib/finalExamStore";
import { filterMissedQuestionsForQuestionPool, loadMissedQuestions } from "@/lib/missedQuestionStore";
import { buildInitialProgressSnapshot, loadProgress, type ProgressSnapshot } from "@/lib/progressStore";
import { calculateReadiness } from "@/lib/readinessEngine";

const initialProgress = buildInitialProgressSnapshot({
  modules,
  questions,
  userProgress,
  quizResults,
  topicPerformance,
  missedQuestions,
});
const activeRecallPrompts = generateActiveRecallPrompts(questions);
const initialMissedQueue = filterMissedQuestionsForQuestionPool(missedQuestions, questions);

export default function AnalyticsPage() {
  const [progress, setProgress] = useState<ProgressSnapshot>(() => initialProgress);
  const [missedQueue, setMissedQueue] = useState(() => initialMissedQueue);
  const [activeRecallSummary, setActiveRecallSummary] = useState(() => calculateActiveRecallSummary(activeRecallPrompts, {}));
  const [finalExamAttempts, setFinalExamAttempts] = useState<FinalExamAttempt[]>([]);

  useEffect(() => {
    setProgress(loadProgress(initialProgress));
    setMissedQueue(filterMissedQuestionsForQuestionPool(loadMissedQuestions(missedQuestions), questions));
    setActiveRecallSummary(calculateActiveRecallSummary(activeRecallPrompts, loadActiveRecallProgress()));
    setFinalExamAttempts(loadFinalExamAttempts());
  }, []);

  const readinessResult = useMemo(() => calculateReadiness({
    progress,
    questions,
    missedQuestions: missedQueue,
    activeRecallSummary,
    finalExamAttempts,
  }), [activeRecallSummary, finalExamAttempts, missedQueue, progress]);
  const averageQuestionsPerSession = progress.totalStudySessions === 0 ? 0 : Math.round(progress.questionsAnswered / progress.totalStudySessions);

  return (
    <div className="space-y-6">
      <section className="app-card p-6 sm:p-7">
        <p className="app-eyebrow">Analytics</p>
        <h1 className="app-page-title mt-3 tracking-tight">Readiness analytics</h1>
        <p className="app-body-copy mt-3 max-w-3xl text-base">
          Local analytics now update from your completed quizzes so weak modules, weak topics, and study momentum stay personalized.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <article className="app-card p-5">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Readiness</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{readinessResult.score}%</p>
          <p className="mt-1 text-sm font-bold text-cyan-700 dark:text-cyan-300">{readinessResult.label}</p>
        </article>
        <article className="app-card p-5">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Average accuracy</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{progress.averageAccuracy}%</p>
        </article>
        <article className="app-card p-5">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Quiz attempts</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{progress.quizAttempts}</p>
        </article>
        <article className="app-card p-5">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Hard accuracy</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{readinessResult.hardQuestionAccuracy.accuracy}%</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{readinessResult.hardQuestionAccuracy.attempted} attempted</p>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.58fr_0.42fr]">
        <article className="app-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="app-section-title tracking-tight">Readiness trend</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Recent quiz attempts converted into a readiness signal.</p>
            </div>
            <span className="rounded-lg bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-100">{readinessResult.readinessTrend.at(-1)?.score ?? readinessResult.score}% latest</span>
          </div>
          <div className="mt-6 grid min-h-52 items-end gap-3 sm:grid-cols-8">
            {readinessResult.readinessTrend.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:col-span-8">Complete a quiz to start the readiness trend.</div>
            ) : readinessResult.readinessTrend.map((point) => (
              <div key={point.id} className="flex h-52 flex-col justify-end gap-2">
                <div className="flex flex-1 items-end rounded-lg bg-slate-50 p-1 dark:bg-slate-800/70">
                  <div className="w-full rounded-md bg-cyan-600 dark:bg-cyan-300" style={{ height: `${Math.max(point.score, 4)}%` }} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-slate-950 dark:text-white">{point.score}%</p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{point.label}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="app-card p-5">
          <h2 className="app-section-title tracking-tight">Why this score</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{readinessResult.summary}</p>
          <div className="mt-5 space-y-4">
            {readinessResult.factors.map((factor) => (
              <div key={factor.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{factor.label}</p>
                  <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">{factor.weightedPoints} pts</span>
                </div>
                <div className="mt-2"><ProgressBar value={factor.score} label={factor.label} /></div>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{factor.evidence}</p>
              </div>
            ))}
            {readinessResult.weakestModulePenalty.points > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                -{readinessResult.weakestModulePenalty.points} pts: {readinessResult.weakestModulePenalty.explanation}
              </div>
            )}
            <div className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
              {readinessResult.finalExamImpact.points > 0 ? "+" : ""}{readinessResult.finalExamImpact.points} pts: {readinessResult.finalExamImpact.explanation}
            </div>
          </div>
        </article>
      </section>

      <section className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="app-section-title tracking-tight">Module readiness</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Module score blends accuracy, coverage, weak topics, and active misses.</p>
          </div>
        </div>
        <div className="mt-6 space-y-5">
        {readinessResult.moduleReadiness.map((module) => (
          <div key={module.moduleId} className="grid gap-3 rounded-lg border border-slate-100 p-4 dark:border-slate-800 md:grid-cols-[260px_1fr_70px] md:items-center">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">{module.moduleName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{module.accuracy}% accuracy · {module.coverage}% coverage · {module.activeMisses} active misses</p>
            </div>
            <div>
              <ProgressBar value={module.score} label={`${module.moduleName} readiness`} />
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{module.recommendedAction}</p>
            </div>
            <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">{module.score}%</span>
          </div>
        ))}
        </div>
      </section>

      <section className="app-card p-5">
        <h2 className="app-section-title tracking-tight">Topic risk areas</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {readinessResult.topicRiskAreas.map((topic) => (
            <div key={topic.id} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-950 dark:text-white">{topic.topic}</p>
                <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">{topic.riskLevel}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{topic.moduleName} · {topic.reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.4fr_0.3fr_0.3fr]">
        <article className="app-card p-5">
          <h2 className="app-section-title tracking-tight">Missed questions by difficulty</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {progress.missedByDifficulty.map((item) => (
              <div key={item.difficulty} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.difficulty}</p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{item.missedCount}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Logged misses in {item.difficulty}-difficulty questions.</p>
              </div>
            ))}
          </div>
        </article>

        <article className="app-card p-5">
          <h2 className="app-section-title tracking-tight">Hard-question accuracy</h2>
          <p className="mt-4 text-4xl font-black text-slate-950 dark:text-white">{readinessResult.hardQuestionAccuracy.accuracy}%</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{readinessResult.hardQuestionAccuracy.correct} correct from {readinessResult.hardQuestionAccuracy.attempted} hard questions.</p>
          <div className="mt-5 space-y-3">
            {readinessResult.hardQuestionAccuracyByModule.slice(0, 4).map((item) => (
              <div key={item.moduleId} className="grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{item.moduleName}</span>
                  <span className="font-black text-cyan-700 dark:text-cyan-300">{item.attempted === 0 ? "--" : `${item.accuracy}%`}</span>
                </div>
                <ProgressBar value={item.accuracy} label={`${item.moduleName} hard accuracy`} />
              </div>
            ))}
          </div>
        </article>

        <article className="app-card p-5">
          <h2 className="app-section-title tracking-tight">Study activity summary</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Questions answered</span>
              <strong className="text-slate-950 dark:text-white">{progress.questionsAnswered}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Questions missed</span>
              <strong className="text-slate-950 dark:text-white">{progress.questionsMissed}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Total study sessions</span>
              <strong className="text-slate-950 dark:text-white">{progress.totalStudySessions}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Average questions per session</span>
              <strong className="text-slate-950 dark:text-white">{averageQuestionsPerSession}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Last study date</span>
              <strong className="text-slate-950 dark:text-white">{progress.lastStudyDate ? new Date(progress.lastStudyDate).toLocaleDateString() : "No study yet"}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}