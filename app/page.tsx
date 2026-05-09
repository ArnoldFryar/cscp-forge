"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import { modules } from "@/data/modules";
import { missedQuestions, quizResults, topicPerformance, userProgress } from "@/data/mockProgress";
import { questions } from "@/data/questions";
import { calculateActiveRecallSummary, generateActiveRecallPrompts, loadActiveRecallProgress, resetActiveRecallProgress } from "@/lib/activeRecallStore";
import { loadFinalExamAttempts, type FinalExamAttempt } from "@/lib/finalExamStore";
import { filterMissedQuestionsForQuestionPool, loadMissedQuestions, resetMissedQuestionStorage } from "@/lib/missedQuestionStore";
import { buildInitialProgressSnapshot, loadProgress, resetProgress, type ProgressSnapshot } from "@/lib/progressStore";
import { calculateReadiness } from "@/lib/readinessEngine";
import { generateWeeklyStudyPlan, getDefaultStudyPlanSettings, loadStudyPlanSettings, type StudyPlanSettings } from "@/lib/studyPlanGenerator";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, FileText, Gauge, PlayCircle, RotateCcw, Target, TrendingUp } from "lucide-react";

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

export default function HomePage() {
  const [progress, setProgress] = useState<ProgressSnapshot>(() => initialProgress);
  const [missedQueue, setMissedQueue] = useState(() => initialMissedQueue);
  const [studyPlanSettings, setStudyPlanSettings] = useState<StudyPlanSettings | null>(null);
  const [activeRecallSummary, setActiveRecallSummary] = useState(() => calculateActiveRecallSummary(activeRecallPrompts, {}));
  const [finalExamAttempts, setFinalExamAttempts] = useState<FinalExamAttempt[]>([]);

  useEffect(() => {
    const nextProgress = loadProgress(initialProgress);
    setProgress(nextProgress);
    setMissedQueue(filterMissedQuestionsForQuestionPool(loadMissedQuestions(missedQuestions), questions));
    setStudyPlanSettings(loadStudyPlanSettings(getDefaultStudyPlanSettings(nextProgress)));
    setActiveRecallSummary(calculateActiveRecallSummary(activeRecallPrompts, loadActiveRecallProgress()));
    setFinalExamAttempts(loadFinalExamAttempts());
  }, []);

  const weakestModule = progress.moduleStats.find((module) => module.moduleId === progress.weakestModuleId) ?? progress.moduleStats[0];
  const averageQuestionsPerSession = progress.totalStudySessions === 0 ? 0 : Math.round(progress.questionsAnswered / progress.totalStudySessions);
  const studyPlan = useMemo(() => {
    if (!studyPlanSettings) {
      return null;
    }

    return generateWeeklyStudyPlan({
      progress,
      missedQuestions: missedQueue,
      questions,
      settings: studyPlanSettings,
    });
  }, [missedQueue, progress, studyPlanSettings]);
  const readinessResult = useMemo(() => calculateReadiness({
    progress,
    questions,
    missedQuestions: missedQueue,
    activeRecallSummary,
    finalExamAttempts,
  }), [activeRecallSummary, finalExamAttempts, missedQueue, progress]);
  const todayPlan = studyPlan?.todayPlan ?? null;
  const recentQuizResults = progress.quizHistory.slice(0, 3);
  const weakestCompletion = weakestModule && weakestModule.totalQuestions > 0
    ? Math.round((weakestModule.questionsAnswered / weakestModule.totalQuestions) * 100)
    : 0;
  const recoveryActiveCount = missedQueue.filter((item) => item.status !== "mastered").length;

  function handleResetProgress() {
    if (!window.confirm("Clear local progress and missed-question data on this device?")) {
      return;
    }

    resetProgress();
    resetMissedQuestionStorage();
    resetActiveRecallProgress();
    setProgress(initialProgress);
    setMissedQueue(initialMissedQueue);
    setActiveRecallSummary(calculateActiveRecallSummary(activeRecallPrompts, {}));
  }

  return (
    <div className="space-y-5">
      <section className="app-card p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="app-eyebrow">CSCP Forge</p>
            <h1 className="app-page-title mt-3 max-w-4xl tracking-tight">Supply chain exam readiness, managed like an operation.</h1>
            <p className="app-body-copy mt-4 max-w-3xl text-base">
              Work original CSCP-style questions, keep recovery visible, and turn weak topics into a practical next action instead of another vague study session.
            </p>
          </div>
          <button
            className="app-btn-secondary"
            type="button"
            onClick={handleResetProgress}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reset local progress
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="app-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="app-eyebrow">Today&apos;s Focus</p>
              <h2 className="app-section-title mt-2 tracking-tight">{todayPlan?.focus ?? "No study plan created"}</h2>
              <p className="app-body-copy mt-3 max-w-3xl text-sm">
                {todayPlan
                  ? `Generated from your weakest modules, missed-question queue, and exam runway with ${studyPlan?.daysUntilExam} days left.`
                  : "Open the planner to set an exam date, study cadence, and preferred practice style."}
              </p>
            </div>
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-900/70 dark:bg-teal-950/40">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-200">Time block</p>
              <p className="mt-2 text-lg font-black text-teal-950 dark:text-teal-100">{todayPlan?.timeEstimate ?? "Planner not set"}</p>
              <p className="mt-1 text-sm text-teal-800 dark:text-teal-200">{todayPlan?.primaryModuleName ?? "No primary module yet"}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">What to do</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {(todayPlan?.tasks.slice(0, 4) ?? ["Open the Study Plan page to set your exam date, study cadence, and preferred style."]).map((task) => (
                  <li key={task} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">{task}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Expected outcome</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{todayPlan?.expectedOutcome ?? "A practical weekly plan with clear next actions."}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Weak topics</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{todayPlan?.weakestTopics.join(" · ") ?? studyPlan?.weakestTopics.slice(0, 3).join(" · ") ?? "Waiting for planner"}</p>
              </div>
              <Link
                href="/study-plan"
                className="app-btn-primary"
              >
                Open planner
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <article className="app-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Readiness Score</p>
                <p className="mt-3 text-5xl font-black tracking-tight text-slate-950 dark:text-white">{readinessResult.score}%</p>
              </div>
              <Gauge className="text-teal-700 dark:text-teal-300" size={26} aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm font-bold text-(--forge-text-primary)">{readinessResult.label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{readinessResult.summary}</p>
            <div className="mt-5"><ProgressBar value={readinessResult.score} label="Readiness score" /></div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70"><strong className="block text-slate-950 dark:text-white">{readinessResult.factors[0].score}%</strong>Accuracy</div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70"><strong className="block text-slate-950 dark:text-white">{readinessResult.hardQuestionAccuracy.accuracy}%</strong>Hard</div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70"><strong className="block text-slate-950 dark:text-white">{readinessResult.factors[2].score}%</strong>Coverage</div>
            </div>
            <div className="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Top weak areas</p>
              <div className="mt-3 space-y-2">
                {readinessResult.topWeakAreas.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">No topic risk has separated yet.</p>
                ) : readinessResult.topWeakAreas.map((area) => (
                  <div key={area.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{area.topic}</span>
                    <span className="shrink-0 text-slate-500 dark:text-slate-400">{area.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>
            <Link
              href={readinessResult.recommendedNextAction.href}
              className="app-btn-primary mt-5"
            >
              {readinessResult.recommendedNextAction.label}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <div className="mt-4 space-y-2">
              {readinessResult.factors.slice(0, 3).map((factor) => (
                <div key={factor.id} className="grid gap-2 text-xs sm:grid-cols-[150px_1fr_42px] sm:items-center">
                  <span className="font-bold text-slate-500 dark:text-slate-400">{factor.label}</span>
                  <ProgressBar value={factor.score} label={factor.label} />
                  <span className="font-black text-slate-700 dark:text-slate-200">{factor.weightedPoints}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="app-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Weakest Module</p>
                <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 dark:text-white">{weakestModule?.moduleName ?? "No module data yet"}</h2>
              </div>
              <BarChart3 className="text-amber-600 dark:text-amber-300" size={24} aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{weakestModule ? `${weakestModule.accuracy}% accuracy · weakest topic: ${weakestModule.weakestTopic}` : "Take a quiz to surface a real weak area."}</p>
            <div className="mt-5"><ProgressBar value={weakestCompletion} label="Weakest module coverage" /></div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={weakestModule ? `/quiz?moduleId=${weakestModule.moduleId}` : "/quiz"} className="app-btn-primary">
                Start quiz
                <PlayCircle size={16} aria-hidden="true" />
              </Link>
              <Link href="/missed" className="app-btn-secondary">
                Review notes
                <FileText size={16} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="app-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Continue Studying</p>
              <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-white">Next best action</h2>
            </div>
            <ClipboardList className="text-teal-700 dark:text-teal-300" size={22} aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3">
            <Link href="/quiz" className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm font-black text-slate-800 transition hover:border-teal-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800">
              Mixed practice set <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/active-recall" className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm font-black text-slate-800 transition hover:border-teal-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800">
              Active recall drill <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/study-plan" className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm font-black text-slate-800 transition hover:border-teal-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800">
              Weekly plan <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Average {averageQuestionsPerSession} questions per session across {progress.totalStudySessions} tracked sessions.</p>
        </article>

        <article className="app-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Recent Quiz Results</p>
              <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-white">Performance log</h2>
            </div>
            <TrendingUp className="text-teal-700 dark:text-teal-300" size={22} aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {recentQuizResults.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">No quiz attempts yet. Start a practice set to create your first performance log.</div>
            ) : recentQuizResults.map((quizResult) => (
              <div key={quizResult.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{quizResult.score}%</p>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{new Date(quizResult.completedAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{quizResult.correctCount} of {quizResult.totalQuestions} correct · {quizResult.missedTopics.slice(0, 2).join(" · ") || "No missed topics"}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="app-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Recovery Queue</p>
              <p className="mt-3 text-5xl font-black tracking-tight text-slate-950 dark:text-white">{recoveryActiveCount}</p>
            </div>
            {recoveryActiveCount === 0 ? <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" size={24} aria-hidden="true" /> : <Target className="text-amber-600 dark:text-amber-300" size={24} aria-hidden="true" />}
          </div>
          {recoveryActiveCount === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">No missed questions. When a quiz exposes a gap, it will appear here for review and retesting.</p>
          ) : (
            <>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Missed questions waiting for explanation review, status updates, and targeted retesting.</p>
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Weakest focus: {weakestModule?.moduleName ?? "No focus yet"}</p>
            </>
          )}
          <Link href="/missed" className="app-btn-primary mt-5">
            Open recovery
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </article>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {progress.moduleStats.slice(0, 4).map((module) => (
          <article key={module.moduleId} className="app-card p-4">
            <div className="flex items-center justify-between gap-3 text-sm font-bold">
              <span className="text-slate-950 dark:text-white">{module.moduleName}</span>
              <span className="text-teal-700 dark:text-teal-300">{module.accuracy}%</span>
            </div>
            <div className="mt-3"><ProgressBar value={module.accuracy} label={`${module.moduleName} accuracy`} /></div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{module.questionsAnswered} answered · weakest topic {module.weakestTopic}</p>
          </article>
        ))}
      </section>
    </div>
  );
}