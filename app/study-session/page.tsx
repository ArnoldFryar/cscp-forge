"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenText, Brain, CheckCircle2, ClipboardList, Flag, PlayCircle, RotateCcw, Sparkles, Timer, Trophy } from "lucide-react";
import { missedQuestions, quizResults, topicPerformance, userProgress } from "@/data/mockProgress";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import type { QuizLength, QuizMode } from "@/data/types";
import { filterMissedQuestionsForQuestionPool, loadMissedQuestions } from "@/lib/missedQuestionStore";
import { buildInitialProgressSnapshot, loadProgress, type ProgressSnapshot } from "@/lib/progressStore";

const STUDY_SESSION_STORAGE_KEY = "cscp-forge-study-sessions";

const initialProgress = buildInitialProgressSnapshot({
  modules,
  questions,
  userProgress,
  quizResults,
  topicPerformance,
  missedQuestions,
});
const initialMissedQueue = filterMissedQuestionsForQuestionPool(missedQuestions, questions);

const sessionLengths = [15, 30, 45, 60] as const;
const focusOptions = [
  { value: "learn", label: "Learn", description: "Start with notes, then prove the concept with a short practice set." },
  { value: "practice", label: "Practice", description: "Spend most of the block in targeted quiz reps with a short review close." },
  { value: "missed-recovery", label: "Missed recovery", description: "Prioritize misses and weak-area retry work before adding new questions." },
  { value: "active-recall", label: "Active recall", description: "Explain the topic from memory, then validate with a focused quiz." },
  { value: "final-review", label: "Final review", description: "Use review, exam-style practice, and a closeout checkpoint." },
] as const;

type FocusValue = (typeof focusOptions)[number]["value"];
type ModuleSelectionMode = "auto" | "manual";
type SessionBlockType = "notes" | "quiz" | "missed" | "recall" | "final" | "closeout";
type SessionBlock = {
  id: string;
  type: SessionBlockType;
  title: string;
  minutes: number;
  description: string;
  href: string;
  actionLabel: string;
  quizMode?: QuizMode;
};
type CompletedStudySession = {
  id: string;
  completedAt: string;
  moduleId: string;
  moduleName: string;
  focus: FocusValue;
  plannedMinutes: number;
  completedBlockIds: string[];
  completedBlockTitles: string[];
  confidence: number;
  nextAction: string;
};

function getQuizLength(minutes: number): QuizLength {
  if (minutes >= 25) return 25;
  return 10;
}

function getModuleLabel(moduleId: string) {
  const moduleItem = modules.find((module) => module.id === moduleId);
  return moduleItem ? `Module ${moduleItem.number}: ${moduleItem.name}` : "Selected module";
}

function getWeakestModuleId(progress: ProgressSnapshot) {
  return progress.weakestModuleId ?? modules[0]?.id ?? "m1";
}

function getSessionPlan(input: { focus: FocusValue; minutes: number; moduleId: string; missedCount: number }): SessionBlock[] {
  const quizLength = getQuizLength(input.minutes >= 45 ? 25 : 15);
  const practiceHref = `/quiz?moduleId=${input.moduleId}&difficulty=all&length=${quizLength}&mode=study`;
  const weakAreaHref = `/quiz?moduleId=${input.moduleId}&difficulty=all&length=${input.minutes >= 45 ? 25 : 10}&mode=weak-area`;
  const examHref = `/quiz?moduleId=${input.moduleId}&difficulty=all&length=${input.minutes >= 60 ? 50 : 25}&mode=exam`;

  const notes = (minutes: number): SessionBlock => ({
    id: "notes",
    type: "notes",
    title: "Review module notes",
    minutes,
    description: "Read the module guide, key terms, traps, and examples before doing reps.",
    href: "/study-notes",
    actionLabel: "Open Notes",
  });
  const practice = (minutes: number): SessionBlock => ({
    id: "practice",
    type: "quiz",
    title: "Run focused practice",
    minutes,
    description: "Answer a targeted set for this module and read every explanation before moving on.",
    href: practiceHref,
    actionLabel: "Start Practice",
    quizMode: "study",
  });
  const missed = (minutes: number): SessionBlock => ({
    id: "missed",
    type: "missed",
    title: input.missedCount > 0 ? "Recover missed questions" : "Check recovery queue",
    minutes,
    description: input.missedCount > 0
      ? "Use weak-area mode and the missed queue to convert recent misses into reviewed items."
      : "Review the missed queue. If it is empty, use this block for explanation review.",
    href: input.missedCount > 0 ? weakAreaHref : "/missed",
    actionLabel: input.missedCount > 0 ? "Start Weak Area Set" : "Open Missed Queue",
    quizMode: input.missedCount > 0 ? "weak-area" : undefined,
  });
  const recall = (minutes: number): SessionBlock => ({
    id: "recall",
    type: "recall",
    title: "Active recall drill",
    minutes,
    description: "Explain key concepts out loud before revealing answers. Rate confidence honestly.",
    href: "/active-recall",
    actionLabel: "Open Recall",
  });
  const finalReview = (minutes: number): SessionBlock => ({
    id: "final-review",
    type: "final",
    title: "Exam-style review",
    minutes,
    description: "Work in delayed-feedback mode and treat each answer as a final-exam decision.",
    href: input.minutes >= 60 ? "/final-exam" : examHref,
    actionLabel: input.minutes >= 60 ? "Open Final Exam" : "Start Exam Set",
    quizMode: input.minutes >= 60 ? undefined : "exam",
  });
  const closeout = (minutes: number): SessionBlock => ({
    id: "closeout",
    type: "closeout",
    title: "Closeout and next action",
    minutes,
    description: "Mark completed blocks, rate confidence, and decide the next study move.",
    href: "#closeout",
    actionLabel: "Go to Closeout",
  });

  const plans: Record<FocusValue, Record<number, SessionBlock[]>> = {
    learn: {
      15: [notes(6), practice(7), closeout(2)],
      30: [notes(10), practice(15), closeout(5)],
      45: [notes(12), practice(20), recall(8), closeout(5)],
      60: [notes(15), practice(25), missed(10), recall(5), closeout(5)],
    },
    practice: {
      15: [practice(12), closeout(3)],
      30: [notes(5), practice(20), closeout(5)],
      45: [practice(25), missed(10), recall(5), closeout(5)],
      60: [notes(5), practice(30), missed(15), closeout(10)],
    },
    "missed-recovery": {
      15: [missed(10), closeout(5)],
      30: [notes(5), missed(18), closeout(7)],
      45: [missed(25), practice(12), closeout(8)],
      60: [notes(8), missed(30), practice(15), closeout(7)],
    },
    "active-recall": {
      15: [recall(10), closeout(5)],
      30: [notes(6), recall(14), practice(6), closeout(4)],
      45: [notes(8), recall(20), practice(12), closeout(5)],
      60: [notes(10), recall(25), practice(18), closeout(7)],
    },
    "final-review": {
      15: [finalReview(12), closeout(3)],
      30: [notes(5), finalReview(20), closeout(5)],
      45: [notes(8), finalReview(25), missed(7), closeout(5)],
      60: [notes(10), finalReview(35), missed(10), closeout(5)],
    },
  };

  return plans[input.focus][input.minutes];
}

function loadCompletedStudySessions() {
  if (typeof window === "undefined") return [] as CompletedStudySession[];

  try {
    const storedSessions = window.localStorage.getItem(STUDY_SESSION_STORAGE_KEY);
    if (!storedSessions) return [];
    const parsedSessions = JSON.parse(storedSessions) as CompletedStudySession[];
    return Array.isArray(parsedSessions) ? parsedSessions : [];
  } catch {
    return [];
  }
}

function saveCompletedStudySessions(sessions: CompletedStudySession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STUDY_SESSION_STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
}

function getBlockIcon(type: SessionBlockType) {
  switch (type) {
    case "notes":
      return BookOpenText;
    case "quiz":
      return ClipboardList;
    case "missed":
      return RotateCcw;
    case "recall":
      return Brain;
    case "final":
      return Flag;
    case "closeout":
      return Trophy;
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function StudySessionPage() {
  const [progress, setProgress] = useState<ProgressSnapshot>(() => initialProgress);
  const [missedQueue, setMissedQueue] = useState(() => initialMissedQueue);
  const [moduleSelectionMode, setModuleSelectionMode] = useState<ModuleSelectionMode>("auto");
  const [manualModuleId, setManualModuleId] = useState(modules[0]?.id ?? "m1");
  const [sessionLength, setSessionLength] = useState<(typeof sessionLengths)[number]>(30);
  const [focus, setFocus] = useState<FocusValue>("practice");
  const [completedBlockIds, setCompletedBlockIds] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(3);
  const [completedSessions, setCompletedSessions] = useState<CompletedStudySession[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    const hydratedProgress = loadProgress(initialProgress);
    const hydratedMissedQueue = filterMissedQuestionsForQuestionPool(loadMissedQuestions(missedQuestions), questions);
    setProgress(hydratedProgress);
    setMissedQueue(hydratedMissedQueue);
    setManualModuleId(getWeakestModuleId(hydratedProgress));
    setCompletedSessions(loadCompletedStudySessions());
  }, []);

  const selectedModuleId = moduleSelectionMode === "auto" ? getWeakestModuleId(progress) : manualModuleId;
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0];
  const selectedModuleStats = progress.moduleStats.find((module) => module.moduleId === selectedModuleId);
  const activeMissedCount = missedQueue.filter((item) => item.status !== "mastered").length;
  const selectedModuleMissedCount = missedQueue.filter((item) => {
    const question = questions.find((questionItem) => questionItem.id === item.questionId);
    return item.status !== "mastered" && question?.moduleId === selectedModuleId;
  }).length;
  const planBlocks = useMemo(
    () => getSessionPlan({ focus, minutes: sessionLength, moduleId: selectedModuleId, missedCount: selectedModuleMissedCount }),
    [focus, selectedModuleId, selectedModuleMissedCount, sessionLength],
  );
  const completedBlocks = planBlocks.filter((block) => completedBlockIds.includes(block.id));
  const completionPercent = planBlocks.length === 0 ? 0 : Math.round((completedBlocks.length / planBlocks.length) * 100);
  const nextAction = getNextAction({ confidence, completedPercent: completionPercent, focus, missedCount: selectedModuleMissedCount, moduleName: selectedModule.name });

  useEffect(() => {
    setCompletedBlockIds([]);
    setSaveStatus("idle");
  }, [focus, selectedModuleId, sessionLength]);

  function toggleBlock(blockId: string) {
    setSaveStatus("idle");
    setCompletedBlockIds((currentBlockIds) => (
      currentBlockIds.includes(blockId)
        ? currentBlockIds.filter((currentBlockId) => currentBlockId !== blockId)
        : [...currentBlockIds, blockId]
    ));
  }

  function saveSession() {
    const session: CompletedStudySession = {
      id: `study-session-${Date.now()}`,
      completedAt: new Date().toISOString(),
      moduleId: selectedModuleId,
      moduleName: selectedModule.name,
      focus,
      plannedMinutes: sessionLength,
      completedBlockIds,
      completedBlockTitles: completedBlocks.map((block) => block.title),
      confidence,
      nextAction,
    };
    const nextSessions = [session, ...completedSessions].slice(0, 20);
    setCompletedSessions(nextSessions);
    saveCompletedStudySessions(nextSessions);
    setSaveStatus("saved");
  }

  return (
    <div className="space-y-6">
      <section className="app-card grid gap-6 p-6 sm:p-7 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="app-eyebrow">Study Session</p>
          <h1 className="app-page-title mt-3 tracking-tight">Know exactly what to do next.</h1>
          <p className="app-body-copy mt-3 max-w-3xl text-base">
            Build one focused study block from your weakest module, missed queue, and preferred session style. Mark each block complete, then close the loop with a confidence rating.
          </p>
        </div>
        <article className="app-panel p-5">
          <p className="text-sm font-black text-(--forge-text-primary)">Today&apos;s recommendation</p>
          <p className="mt-3 text-2xl font-black text-(--forge-text-primary)">{getModuleLabel(getWeakestModuleId(progress))}</p>
          <p className="app-body-copy mt-2 text-sm">Weakest topic: {selectedModuleStats?.weakestTopic ?? "No topic data yet"}</p>
          <p className="mt-4 text-sm font-bold text-(--forge-text-secondary)">{activeMissedCount} active missed-question item{activeMissedCount === 1 ? "" : "s"} on this device</p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="app-card p-5 xl:sticky xl:top-8 xl:self-start">
          <div className="flex items-center gap-2">
            <Timer size={18} aria-hidden="true" className="text-(--forge-accent)" />
            <h2 className="app-section-title tracking-tight">Session setup</h2>
          </div>

          <div className="mt-5 grid gap-5">
            <fieldset>
              <legend className="text-sm font-bold text-(--forge-text-secondary)">Module choice</legend>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["auto", "manual"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${moduleSelectionMode === mode ? "border-(--forge-accent) bg-[rgb(45_212_191/0.12)] text-(--forge-text-primary)" : "border-(--forge-border-soft) text-(--forge-text-secondary) hover:bg-(--forge-surface-elevated)"}`}
                    type="button"
                    onClick={() => setModuleSelectionMode(mode)}
                  >
                    {mode === "auto" ? "Weakest" : "Manual"}
                  </button>
                ))}
              </div>
              <select
                className="app-input mt-3"
                value={manualModuleId}
                disabled={moduleSelectionMode === "auto"}
                onChange={(event) => setManualModuleId(event.target.value)}
              >
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>Module {module.number}: {module.name}</option>
                ))}
              </select>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-bold text-(--forge-text-secondary)">Session length</legend>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {sessionLengths.map((length) => (
                  <button
                    key={length}
                    className={`rounded-lg border px-2 py-2 text-sm font-black transition ${sessionLength === length ? "border-(--forge-accent) bg-[rgb(45_212_191/0.12)] text-(--forge-text-primary)" : "border-(--forge-border-soft) text-(--forge-text-secondary) hover:bg-(--forge-surface-elevated)"}`}
                    type="button"
                    onClick={() => setSessionLength(length)}
                  >
                    {length}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-bold text-(--forge-text-secondary)">
              Focus
              <select className="app-input mt-2" value={focus} onChange={(event) => setFocus(event.target.value as FocusValue)}>
                {focusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 rounded-lg border border-(--forge-border-soft) bg-(--forge-surface-elevated) p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-(--forge-text-muted)">Current target</p>
            <p className="mt-2 text-lg font-black text-(--forge-text-primary)">{selectedModule.name}</p>
            <p className="app-body-copy mt-2 text-sm">{selectedModule.domain}</p>
            <p className="mt-3 text-sm font-bold text-(--forge-text-secondary)">{selectedModuleMissedCount} active miss{selectedModuleMissedCount === 1 ? "" : "es"} in this module</p>
          </div>
        </aside>

        <div className="space-y-5">
          <section className="app-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="app-eyebrow">Session plan</p>
                <h2 className="app-section-title mt-2 tracking-tight">{sessionLength} minutes · {focusOptions.find((option) => option.value === focus)?.label}</h2>
                <p className="app-body-copy mt-2 max-w-3xl text-sm">{focusOptions.find((option) => option.value === focus)?.description}</p>
              </div>
              <div className="rounded-lg border border-(--forge-border-soft) bg-(--forge-surface-elevated) px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-(--forge-text-muted)">Completed</p>
                <p className="mt-2 text-2xl font-black text-(--forge-text-primary)">{completionPercent}%</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {planBlocks.map((block, index) => {
                const Icon = getBlockIcon(block.type);
                const isComplete = completedBlockIds.includes(block.id);

                return (
                  <article key={block.id} className={`rounded-lg border p-4 transition ${isComplete ? "border-(--forge-accent) bg-[rgb(45_212_191/0.09)]" : "border-(--forge-border-soft) bg-(--forge-surface-elevated)"}`}>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-(--forge-border-soft) bg-(--forge-surface-card)">
                          <Icon size={18} aria-hidden="true" className="text-(--forge-accent)" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-(--forge-text-muted)">Block {index + 1} · {block.minutes} min</p>
                          <h3 className="mt-1 text-base font-black text-(--forge-text-primary)">{block.title}</h3>
                          <p className="app-body-copy mt-1 text-sm">{block.description}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link className="app-btn-secondary" href={block.href}>
                          {block.type === "closeout" ? <ArrowRight size={16} aria-hidden="true" /> : <PlayCircle size={16} aria-hidden="true" />}
                          {block.actionLabel}
                        </Link>
                        <button className={isComplete ? "app-btn-primary" : "app-btn-secondary"} type="button" onClick={() => toggleBlock(block.id)}>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          {isComplete ? "Done" : "Mark Done"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="closeout" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="app-card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Trophy size={18} aria-hidden="true" className="text-(--forge-accent)" />
                <h2 className="app-section-title tracking-tight">Session closeout</h2>
              </div>
              <p className="app-body-copy mt-2 text-sm">Rate how ready you feel on this module after the session. This saves a local record of what you completed.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    className={`rounded-lg border px-3 py-3 text-sm font-black transition ${confidence === rating ? "border-(--forge-accent) bg-[rgb(45_212_191/0.12)] text-(--forge-text-primary)" : "border-(--forge-border-soft) text-(--forge-text-secondary) hover:bg-(--forge-surface-elevated)"}`}
                    type="button"
                    onClick={() => {
                      setConfidence(rating);
                      setSaveStatus("idle");
                    }}
                  >
                    {rating}
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-(--forge-border-soft) bg-(--forge-surface-elevated) p-4">
                <p className="text-sm font-black text-(--forge-text-primary)">Completed this session</p>
                {completedBlocks.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-(--forge-text-secondary)">
                    {completedBlocks.map((block) => (
                      <li key={block.id}>{block.title}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="app-body-copy mt-3 text-sm">No blocks marked complete yet.</p>
                )}
              </div>

              <div className="mt-5 rounded-lg border border-[rgb(45_212_191/0.35)] bg-[rgb(45_212_191/0.08)] p-4">
                <p className="text-sm font-black text-(--forge-text-primary)">Suggested next action</p>
                <p className="mt-2 text-sm leading-6 text-(--forge-text-secondary)">{nextAction}</p>
              </div>

              <button className="app-btn-primary mt-5" type="button" onClick={saveSession}>
                <Sparkles size={16} aria-hidden="true" />
                {saveStatus === "saved" ? "Session Saved" : "Save Completed Session"}
              </button>
            </article>

            <article className="app-card p-5">
              <p className="app-eyebrow">Local history</p>
              <h2 className="app-section-title mt-2 tracking-tight">Recent sessions</h2>
              <div className="mt-5 space-y-3">
                {completedSessions.length > 0 ? completedSessions.slice(0, 4).map((session) => (
                  <div key={session.id} className="rounded-lg border border-(--forge-border-soft) bg-(--forge-surface-elevated) p-3">
                    <p className="text-sm font-black text-(--forge-text-primary)">{session.moduleName}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-(--forge-text-muted)">{formatDateTime(session.completedAt)}</p>
                    <p className="app-body-copy mt-2 text-sm">{session.completedBlockTitles.length} blocks · confidence {session.confidence}/5</p>
                  </div>
                )) : (
                  <p className="app-body-copy text-sm">Completed sessions will save here on this device.</p>
                )}
              </div>
            </article>
          </section>
        </div>
      </section>
    </div>
  );
}

function getNextAction(input: { confidence: number; completedPercent: number; focus: FocusValue; missedCount: number; moduleName: string }) {
  if (input.completedPercent < 50) {
    return `Finish at least one more block for ${input.moduleName} before switching topics.`;
  }

  if (input.confidence <= 2) {
    return input.missedCount > 0
      ? "Run another weak-area set and review every explanation before moving on."
      : "Open Active Recall and explain the topic without answer choices.";
  }

  if (input.focus === "final-review" || input.confidence >= 4) {
    return "Move to a timed exam-style set or schedule this module for lighter maintenance tomorrow.";
  }

  if (input.focus === "learn") {
    return "Convert the notes into active recall prompts, then run a short practice set.";
  }

  return "Keep the next session on the same module, but shift the focus to missed recovery or active recall.";
}
