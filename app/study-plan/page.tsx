"use client";

import { useEffect, useMemo, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import { missedQuestions, quizResults, topicPerformance, userProgress } from "@/data/mockProgress";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import { filterMissedQuestionsForQuestionPool, loadMissedQuestions } from "@/lib/missedQuestionStore";
import { buildInitialProgressSnapshot, loadProgress, type ProgressSnapshot } from "@/lib/progressStore";
import {
  generateWeeklyStudyPlan,
  getConfidenceLabel,
  getDefaultStudyPlanSettings,
  getStudyStyleLabel,
  loadStudyPlanSettings,
  saveStudyPlanSettings,
  type StudyConfidenceLevel,
  type StudyPlanSettings,
  type StudyStyle,
} from "@/lib/studyPlanGenerator";

const initialProgress = buildInitialProgressSnapshot({
  modules,
  questions,
  userProgress,
  quizResults,
  topicPerformance,
  missedQuestions,
});
const initialMissedQueue = filterMissedQuestionsForQuestionPool(missedQuestions, questions);

export default function StudyPlanPage() {
  const [progress, setProgress] = useState<ProgressSnapshot>(() => initialProgress);
  const [missedQueue, setMissedQueue] = useState(() => initialMissedQueue);
  const [settings, setSettings] = useState<StudyPlanSettings | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const nextProgress = loadProgress(initialProgress);
    const nextMissedQueue = filterMissedQuestionsForQuestionPool(loadMissedQuestions(missedQuestions), questions);
    const defaultSettings = getDefaultStudyPlanSettings(nextProgress);

    setProgress(nextProgress);
    setMissedQueue(nextMissedQueue);
    setSettings(loadStudyPlanSettings(defaultSettings));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || !settings) {
      return;
    }

    saveStudyPlanSettings(settings);
  }, [isHydrated, settings]);

  const plan = useMemo(() => {
    if (!settings) {
      return null;
    }

    return generateWeeklyStudyPlan({
      progress,
      missedQuestions: missedQueue,
      questions,
      settings,
    });
  }, [missedQueue, progress, settings]);

  const scheduleDensity = settings ? Math.round((settings.studyDaysPerWeek / 7) * 100) : 0;

  function updateSetting<K extends keyof StudyPlanSettings>(key: K, value: StudyPlanSettings[K]) {
    setSettings((currentSettings) => {
      if (!currentSettings) {
        return currentSettings;
      }

      return {
        ...currentSettings,
        [key]: value,
      };
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="app-eyebrow">Study Plan</p>
          <h1 className="app-page-title mt-3 tracking-tight">Weekly execution plan</h1>
          <p className="app-body-copy mt-3 max-w-3xl text-base">
            Set your exam window and available time, then let the planner turn real progress, misses, and weak topics into the next seven days of work.
          </p>
        </div>
        <article className="app-card p-5">
          <p className="app-card-title text-sm">Plan summary</p>
          <p className="mt-3 text-3xl font-black text-(--forge-text-primary)">{plan ? `${plan.daysUntilExam} days` : "Loading"}</p>
          <p className="app-body-copy mt-1 text-sm">until your target exam date</p>
          <div className="mt-5"><ProgressBar value={scheduleDensity} label="Weekly schedule density" /></div>
          <p className="mt-5 text-sm font-bold text-(--forge-text-secondary)">Focus modules: {plan ? plan.focusModules.join(" · ") : "Preparing plan..."}</p>
          <p className="app-muted mt-2 text-sm">Settings save automatically on this device.</p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="app-card p-5">
          <p className="app-eyebrow">Planner Inputs</p>
          <h2 className="app-section-title mt-3 tracking-tight">Personalize this week</h2>
          <p className="app-body-copy mt-2 text-sm">
            The planner uses module accuracy, weak topics, missed questions, exam runway, and available time to shape the next session sequence.
          </p>

          <div className="mt-6 grid gap-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Target exam date
              <input
                className="app-input mt-2"
                type="date"
                value={settings?.targetExamDate ?? ""}
                onChange={(event) => updateSetting("targetExamDate", event.target.value)}
              />
            </label>

            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Study days per week
              <select
                className="app-input mt-2"
                value={settings?.studyDaysPerWeek ?? 5}
                onChange={(event) => updateSetting("studyDaysPerWeek", Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                  <option key={value} value={value}>{value} day{value === 1 ? "" : "s"}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Minutes available per session
              <input
                className="app-input mt-2"
                type="number"
                min={20}
                max={180}
                step={5}
                value={settings?.minutesPerSession ?? 50}
                onChange={(event) => updateSetting("minutesPerSession", Number(event.target.value))}
              />
            </label>

            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Current confidence level
              <select
                className="app-input mt-2"
                value={settings?.confidenceLevel ?? "moderate"}
                onChange={(event) => updateSetting("confidenceLevel", event.target.value as StudyConfidenceLevel)}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
              Preferred study style
              <select
                className="app-input mt-2"
                value={settings?.preferredStudyStyle ?? "balanced"}
                onChange={(event) => updateSetting("preferredStudyStyle", event.target.value as StudyStyle)}
              >
                <option value="reading">Reading</option>
                <option value="quiz-heavy">Quiz-heavy</option>
                <option value="balanced">Balanced</option>
                <option value="weak-area-focused">Weak-area focused</option>
              </select>
            </label>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="app-card p-4">
              <p className="app-muted text-xs font-bold uppercase tracking-[0.16em]">Weekly minutes</p>
              <p className="mt-3 text-2xl font-black text-(--forge-text-primary)">{plan?.weeklyAvailableMinutes ?? 0}</p>
              <p className="app-body-copy mt-2 text-sm">Planned deep-work minutes.</p>
            </article>
            <article className="app-card p-4">
              <p className="app-muted text-xs font-bold uppercase tracking-[0.16em]">Missed queue</p>
              <p className="mt-3 text-2xl font-black text-(--forge-text-primary)">{plan?.totalMissedQuestions ?? 0}</p>
              <p className="app-body-copy mt-2 text-sm">Active recovery items.</p>
            </article>
            <article className="app-card p-4">
              <p className="app-muted text-xs font-bold uppercase tracking-[0.16em]">Confidence</p>
              <p className="mt-3 text-2xl font-black text-(--forge-text-primary)">{settings ? getConfidenceLabel(settings.confidenceLevel) : "-"}</p>
              <p className="app-body-copy mt-2 text-sm">Sets review depth.</p>
            </article>
            <article className="app-card p-4">
              <p className="app-muted text-xs font-bold uppercase tracking-[0.16em]">Study style</p>
              <p className="mt-3 text-xl font-black leading-7 text-(--forge-text-primary)">{settings ? getStudyStyleLabel(settings.preferredStudyStyle) : "-"}</p>
              <p className="app-body-copy mt-2 text-sm">Balances time blocks.</p>
            </article>
          </section>

          <article className="app-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Weekly Priority</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{plan?.weakestModuleName ?? "Preparing plan"}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  This week emphasizes {plan?.focusModules.join(", ") ?? "your weakest modules"} with extra pressure on {plan?.weakestTopics.slice(0, 3).join(", ") ?? "weak topics"}.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 dark:border-cyan-900/70 dark:bg-cyan-950/40">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-800 dark:text-cyan-200">Today</p>
                <p className="mt-2 text-sm font-black text-cyan-950 dark:text-cyan-100">{plan?.todayPlan.focus ?? "Loading today’s plan"}</p>
                <p className="mt-1 text-sm text-cyan-800 dark:text-cyan-200">{plan?.todayPlan.timeEstimate ?? ""}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plan?.dailyPlans.map((day) => (
          <article
            key={day.id}
            className={`rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900/70 ${day.isToday ? "border-cyan-400 ring-2 ring-cyan-500/10 dark:border-cyan-700" : "border-slate-200 dark:border-slate-800"}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">{day.dayLabel}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{day.dateLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {day.isToday ? <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">Today</span> : null}
                <span className={`rounded-full px-3 py-1 text-xs font-black ${day.isStudyDay ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-100"}`}>{day.timeEstimate}</span>
              </div>
            </div>
            <p className="mt-4 text-base font-black leading-7 text-slate-950 dark:text-white">{day.focus}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Primary module: {day.primaryModuleName}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {day.tasks.map((task) => (
                <li key={task} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">{task}</li>
              ))}
            </ul>
            <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm leading-6 text-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100">Expected outcome: {day.expectedOutcome}</p>
          </article>
        ))}
      </section>
    </div>
  );
}