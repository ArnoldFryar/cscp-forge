"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSCPModule, Difficulty, MissedQuestion, Question, QuizLength, QuizMode, QuizResult, TopicPerformance } from "@/data/types";
import { consumeQuizLaunchIntent, filterMissedQuestionsForQuestionPool, loadMissedQuestions, saveMissedQuestions, syncMissedQuestionsWithQuizResult, upsertMissedQuestion } from "@/lib/missedQuestionStore";
import { loadProgress, saveProgress, type ProgressSnapshot, updateProgressWithQuizResult } from "@/lib/progressStore";
import { buildQuizSession, calculateQuizResult, getAvailableTopics, getPassReadinessLabel, getSuggestedNextAction, type BuiltQuizSession } from "@/lib/quizEngine";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, FileText, Lightbulb, ListChecks, RotateCcw, ShieldAlert, Target, TimerReset, XCircle } from "lucide-react";

type QuizInterfaceProps = {
  modules: CSCPModule[];
  questions: Question[];
  missedQuestions: MissedQuestion[];
  topicPerformance: TopicPerformance[];
  initialProgress: ProgressSnapshot;
};

type SetupState = {
  moduleId: string | "all";
  difficulty: Difficulty | "all";
  topic: string | "all";
  length: QuizLength;
  mode: QuizMode;
};

const modeOptions: Array<{ value: QuizMode; label: string; description: string }> = [
  { value: "study", label: "Study", description: "Immediate coaching after every answer." },
  { value: "exam", label: "Exam", description: "Hold feedback until you submit the full set." },
  { value: "weak-area", label: "Weak Area", description: "Pull from missed questions and low-accuracy topics." },
];

const difficultyOptions: Array<{ value: Difficulty | "all"; label: string }> = [
  { value: "all", label: "All difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const lengthOptions: Array<{ value: QuizLength; label: string }> = [
  { value: 10, label: "10 questions" },
  { value: 25, label: "25 questions" },
  { value: 50, label: "50 questions" },
  { value: "all", label: "All available" },
];

function getDefaultSetup(): SetupState {
  return {
    moduleId: "all",
    difficulty: "all",
    topic: "all",
    length: 10,
    mode: "study",
  };
}

function parseQuizLength(value: string): QuizLength {
  return value === "all" ? "all" : (Number(value) as Exclude<QuizLength, "all">);
}

function parseOptionalQuizLength(value: string | null): QuizLength | undefined {
  if (value === "all") {
    return "all";
  }

  if (value === "10" || value === "25" || value === "50") {
    return Number(value) as Exclude<QuizLength, "all">;
  }

  return undefined;
}

function parseOptionalDifficulty(value: string | null): Difficulty | "all" | undefined {
  if (value === "all" || value === "easy" || value === "medium" || value === "hard") {
    return value;
  }

  return undefined;
}

function getModuleLabel(moduleId: string | "all", modules: CSCPModule[]) {
  if (moduleId === "all") {
    return "All modules";
  }

  const moduleItem = modules.find((item) => item.id === moduleId);
  return moduleItem ? `Module ${moduleItem.number}: ${moduleItem.name}` : "Selected module";
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function buildEmptyQuizSession(setup: SetupState): BuiltQuizSession {
  return {
    id: `session-${setup.mode}-${setup.moduleId}-${setup.difficulty}-${setup.topic}-${setup.length}-pending`,
    moduleId: setup.moduleId,
    difficulty: setup.difficulty,
    topic: setup.topic,
    mode: setup.mode,
    length: setup.length,
    questionIds: [],
    currentQuestionIndex: 0,
    startedAt: "",
    answeredChoiceIds: {},
    questionOrder: [],
    questions: [],
    totalQuestions: 0,
  } satisfies BuiltQuizSession;
}

function sanitizeSetup(nextSetup: SetupState, questions: Question[]) {
  const moduleId = nextSetup.moduleId === "all" || questions.some((question) => question.moduleId === nextSetup.moduleId)
    ? nextSetup.moduleId
    : "all";
  const topicOptions = getAvailableTopics(questions, moduleId);
  const topic = nextSetup.topic === "all" || topicOptions.includes(nextSetup.topic)
    ? nextSetup.topic
    : "all";

  return {
    ...nextSetup,
    moduleId,
    topic,
  } satisfies SetupState;
}

function buildSetupFromLaunchIntent(questions: Question[], searchParams: URLSearchParams) {
  const launchIntent = consumeQuizLaunchIntent();
  const defaultSetup = getDefaultSetup();
  const moduleIdParam = searchParams.get("moduleId");
  const difficultyParam = parseOptionalDifficulty(searchParams.get("difficulty"));
  const topicParam = searchParams.get("topic");
  const lengthParam = parseOptionalQuizLength(searchParams.get("length"));
  const modeParam = searchParams.get("mode");

  return sanitizeSetup(
    {
      ...defaultSetup,
      ...launchIntent,
      moduleId: moduleIdParam ?? launchIntent?.moduleId ?? defaultSetup.moduleId,
      difficulty: difficultyParam ?? launchIntent?.difficulty ?? defaultSetup.difficulty,
      topic: topicParam ?? launchIntent?.topic ?? defaultSetup.topic,
      length: lengthParam ?? launchIntent?.length ?? defaultSetup.length,
      mode: modeParam === "weak-area" || modeParam === "exam" || modeParam === "study" ? modeParam : launchIntent?.mode ?? defaultSetup.mode,
    },
    questions,
  );
}

export default function QuizInterface({ modules, questions, missedQuestions, topicPerformance, initialProgress }: QuizInterfaceProps) {
  const [setup, setSetup] = useState<SetupState>(() => getDefaultSetup());
  const [activeSetup, setActiveSetup] = useState<SetupState>(() => getDefaultSetup());
  const [missedQueue, setMissedQueue] = useState<MissedQuestion[]>(() => filterMissedQuestionsForQuestionPool(missedQuestions, questions));
  const [activeSession, setActiveSession] = useState<BuiltQuizSession>(() => buildEmptyQuizSession(getDefaultSetup()));
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const questionLookup = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const availableTopics = useMemo(() => getAvailableTopics(questions, setup.moduleId), [questions, setup.moduleId]);

  const previewSession = useMemo(
    () => buildQuizSession(questions, setup, { missedQuestions: missedQueue, topicPerformance }),
    [missedQueue, questions, setup, topicPerformance],
  );

  useEffect(() => {
    if (isHydrated) {
      return;
    }

    const hydratedMissedQuestions = filterMissedQuestionsForQuestionPool(loadMissedQuestions(missedQuestions), questions);
    const searchParams = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const nextSetup = buildSetupFromLaunchIntent(questions, searchParams);

    setMissedQueue(hydratedMissedQuestions);
    saveMissedQuestions(hydratedMissedQuestions);
    setSetup(nextSetup);
    setActiveSetup(nextSetup);
    setActiveSession(buildQuizSession(questions, nextSetup, { missedQuestions: hydratedMissedQuestions, topicPerformance }));
    setAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
    setIsHydrated(true);
  }, [isHydrated, missedQuestions, questions, topicPerformance]);

  const currentQuestion = activeSession.questions[currentQuestionIndex] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null;
  const answeredCount = activeSession.questionOrder.filter((questionId) => answers[questionId] != null).length;
  const unansweredCount = Math.max(activeSession.totalQuestions - answeredCount, 0);
  const correctCount = activeSession.questions.filter((question) => {
    const selectedChoiceId = answers[question.id];
    return selectedChoiceId != null && selectedChoiceId === question.correctChoiceId;
  }).length;
  const progress = activeSession.totalQuestions === 0 ? 0 : Math.round((answeredCount / activeSession.totalQuestions) * 100);
  const studyLikeMode = activeSetup.mode !== "exam";
  const setupChanged =
    setup.moduleId !== activeSetup.moduleId ||
    setup.difficulty !== activeSetup.difficulty ||
    setup.topic !== activeSetup.topic ||
    setup.length !== activeSetup.length ||
    setup.mode !== activeSetup.mode;

  const missedReviews = useMemo(() => {
    if (!result) {
      return [];
    }

    return result.questionResults
      .filter((questionResult) => !questionResult.isCorrect)
      .map((questionResult) => {
        const question = questionLookup.get(questionResult.questionId);
        if (!question) {
          return null;
        }

        return {
          question,
          selectedChoiceText: questionResult.selectedChoiceId
            ? question.choices.find((choice) => choice.id === questionResult.selectedChoiceId)?.text ?? "Selected answer unavailable"
            : "Unanswered",
          correctChoiceText: question.choices.find((choice) => choice.id === question.correctChoiceId)?.text ?? "Correct answer unavailable",
          selectedChoiceId: questionResult.selectedChoiceId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [questionLookup, result]);

  const sortedTopicPerformance = useMemo(() => {
    if (!result) {
      return [];
    }

    return [...result.topicPerformance].sort((left, right) => left.accuracy - right.accuracy);
  }, [result]);

  function buildSession(nextSetup: SetupState, nextMissedQueue: MissedQuestion[] = missedQueue) {
    return buildQuizSession(questions, nextSetup, { missedQuestions: nextMissedQueue, topicPerformance });
  }

  function applySetup(nextSetup: SetupState = setup, nextMissedQueue: MissedQuestion[] = missedQueue) {
    const sanitizedSetup = sanitizeSetup(nextSetup, questions);
    setActiveSetup({ ...sanitizedSetup });
    setActiveSession(buildSession(sanitizedSetup, nextMissedQueue));
    setAnswers({});
    setCurrentQuestionIndex(0);
    setResult(null);
  }

  function handleModuleChange(moduleId: string | "all") {
    setSetup((currentSetup) => sanitizeSetup({
      ...currentSetup,
      moduleId,
      topic: "all",
    }, questions));
  }

  function handleAnswer(choiceId: string) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((currentAnswers) => {
      if (studyLikeMode && currentAnswers[currentQuestion.id] != null) {
        return currentAnswers;
      }

      return {
        ...currentAnswers,
        [currentQuestion.id]: choiceId,
      };
    });

    if (studyLikeMode && choiceId !== currentQuestion.correctChoiceId) {
      setMissedQueue((currentMissedQuestions) => {
        const nextMissedQuestions = upsertMissedQuestion(currentMissedQuestions, {
          questionId: currentQuestion.id,
          userSelectedChoiceId: choiceId,
        });
        saveMissedQuestions(nextMissedQuestions);
        return nextMissedQuestions;
      });
    }
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

  function handleSubmit() {
    if (activeSession.totalQuestions === 0) {
      return;
    }

    const nextResult = calculateQuizResult({ session: activeSession, questionPool: questions, answers });
    setResult(nextResult);
    saveProgress(updateProgressWithQuizResult(loadProgress(initialProgress), nextResult, questions, modules));
    setMissedQueue((currentMissedQuestions) => {
      const nextMissedQuestions = syncMissedQuestionsWithQuizResult(currentMissedQuestions, nextResult, activeSetup.mode, {
        recordIncorrectAnswers: activeSetup.mode === "exam",
      });
      saveMissedQuestions(nextMissedQuestions);
      return nextMissedQuestions;
    });
  }

  function resetAll() {
    const defaultSetup = getDefaultSetup();
    setSetup(defaultSetup);
    applySetup(defaultSetup);
  }

  function startWeakAreaRetake() {
    const nextSetup: SetupState = {
      ...activeSetup,
      mode: "weak-area",
      topic: "all",
    };
    setSetup(nextSetup);
    applySetup(nextSetup);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <aside className="app-card p-5 xl:sticky xl:top-8 xl:self-start">
        <p className="app-eyebrow">Session builder</p>
        <h2 className="app-section-title mt-3 tracking-tight">Build a real practice set</h2>
        <p className="app-body-copy mt-2 text-sm">
          Mix modules, tune difficulty, then switch between coaching mode and exam pressure without leaving the page.
        </p>

        <div className="mt-6 grid gap-3">
          {modeOptions.map((option) => {
            const isActive = setup.mode === option.value;
            return (
              <button
                key={option.value}
                className={classNames(
                  "rounded-lg border px-4 py-3 text-left transition",
                  isActive
                    ? "border-[rgb(45_212_191/0.55)] bg-[rgb(45_212_191/0.12)] shadow-sm"
                    : "border-(--forge-border-soft) bg-(--forge-surface-primary) hover:border-[rgb(45_212_191/0.4)] hover:bg-(--forge-surface-elevated)",
                )}
                type="button"
                onClick={() => setSetup((currentSetup) => ({ ...currentSetup, mode: option.value }))}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-950 dark:text-white">{option.label}</span>
                  {isActive ? <Target className="text-teal-700 dark:text-teal-300" size={16} aria-hidden="true" /> : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.description}</p>
              </button>
            );
          })}
        </div>

        <label className="mt-6 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="module-select">Module</label>
        <select
          id="module-select"
          className="app-input mt-2"
          value={setup.moduleId}
          onChange={(event) => handleModuleChange(event.target.value as string | "all")}
        >
          <option value="all">All modules</option>
          {modules.map((module) => (
            <option key={module.id} value={module.id}>Module {module.number}: {module.name}</option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="difficulty-select">Difficulty</label>
        <select
          id="difficulty-select"
          className="app-input mt-2"
          value={setup.difficulty}
          onChange={(event) => setSetup((currentSetup) => ({ ...currentSetup, difficulty: event.target.value as Difficulty | "all" }))}
        >
          {difficultyOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="topic-select">Topic</label>
        <select
          id="topic-select"
          className="app-input mt-2"
          value={setup.topic}
          onChange={(event) => setSetup((currentSetup) => ({ ...currentSetup, topic: event.target.value as string | "all" }))}
        >
          <option value="all">All topics</option>
          {availableTopics.map((topic) => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>

        <label className="mt-5 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="length-select">Set length</label>
        <select
          id="length-select"
          className="app-input mt-2"
          value={String(setup.length)}
          onChange={(event) => setSetup((currentSetup) => ({ ...currentSetup, length: parseQuizLength(event.target.value) }))}
        >
          {lengthOptions.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
          ))}
        </select>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Preview</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{previewSession.totalQuestions}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Answered</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{answeredCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Correct</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{correctCount}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Open</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{unansweredCount}</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/70 dark:bg-teal-950/40">
          <p className="text-sm font-black text-teal-950 dark:text-teal-100">{getModuleLabel(setup.moduleId, modules)}</p>
          <p className="mt-1 text-sm leading-6 text-teal-800 dark:text-teal-200">
            {setup.mode === "exam"
              ? "Exam mode hides explanations until you submit the full set."
              : setup.mode === "weak-area"
                ? "Weak Area mode prioritizes missed questions and your lowest-scoring topics."
                : "Study mode reveals why each answer is right or wrong before you move on."}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="app-btn-primary disabled:opacity-50"
            type="button"
            onClick={() => applySetup()}
            disabled={previewSession.totalQuestions === 0}
          >
            {setupChanged ? "Apply setup" : "Regenerate set"}
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          <button
            className="app-btn-secondary"
            type="button"
            onClick={resetAll}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Reset
          </button>
        </div>
      </aside>

      <article className="app-card p-5 sm:p-6">
        {result ? (
          <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Score</p>
                <p className="mt-3 text-6xl font-black tracking-tight text-slate-950 dark:text-white">{result.score}%</p>
                <p className="mt-3 text-sm font-black text-slate-800 dark:text-slate-100">{getPassReadinessLabel(result.score)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{result.correctCount} correct out of {result.totalQuestions}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Results</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Session debrief</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{getSuggestedNextAction(result)}</p>
                <div className="app-panel mt-5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Session</p>
                  <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{getModuleLabel(activeSetup.moduleId, modules)}</p>
                  <p className="mt-1 text-sm capitalize text-slate-600 dark:text-slate-300">{activeSetup.mode} mode · {activeSetup.length === "all" ? "all available" : `${activeSetup.length} questions`}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Correct</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{result.correctCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Incorrect</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{result.incorrectCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Unanswered</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{result.unansweredCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Coverage</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{result.totalQuestions}</p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">Missed-question review</h3>
                  {missedReviews.length === 0 ? (
                    <div className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                      Clean run. You cleared every question in this set.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4">
                      {missedReviews.map(({ question, selectedChoiceText, correctChoiceText, selectedChoiceId }) => (
                        <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{question.topic}</span>
                            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">Needs review</span>
                          </div>
                          <p className="mt-3 text-base font-black leading-7 text-slate-950 dark:text-white">{question.questionText}</p>
                          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                            <span className="font-black">Your answer:</span> {selectedChoiceText}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                            <span className="font-black">Correct answer:</span> {correctChoiceText}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{question.explanation}</p>
                          {selectedChoiceId ? (
                            <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                              {question.whyWrong[selectedChoiceId]}
                            </p>
                          ) : null}
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"><span className="font-black">Exam trap:</span> {question.examTrap}</p>
                            <p className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-900 dark:border-teal-900/70 dark:bg-teal-950/40 dark:text-teal-100"><span className="font-black">Study tip:</span> {question.studyTip}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">Topic pressure points</h3>
                  <div className="mt-4 grid gap-3">
                    {sortedTopicPerformance.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">No topic breakdown is available for this attempt.</div>
                    ) : sortedTopicPerformance.map((topic) => (
                      <div key={topic.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/60">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-950 dark:text-white">{topic.topic}</p>
                          <span className="text-sm font-black text-slate-700 dark:text-slate-200">{topic.accuracy}%</span>
                        </div>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{topic.correct} of {topic.attempted} correct</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${topic.accuracy}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">Missed topics</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.missedTopics.length > 0 ? result.missedTopics.map((topic) => (
                      <span key={topic} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/40 dark:text-amber-100">{topic}</span>
                    )) : (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">No misses</span>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ListChecks className="text-teal-700 dark:text-teal-300" size={18} aria-hidden="true" />
                    <h3 className="text-lg font-black text-slate-950 dark:text-white">Recommended next steps</h3>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    <li className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/60">Review every missed explanation before retaking the same set.</li>
                    <li className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/60">Run Weak Area mode on missed topics until accuracy clears 80%.</li>
                    <li className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950/60">Move to Exam mode once the recovery queue is stable.</li>
                  </ul>
                </section>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="app-btn-primary"
                    type="button"
                    onClick={() => applySetup(activeSetup)}
                  >
                    <TimerReset size={16} aria-hidden="true" />
                    Retake set
                  </button>
                  <button
                    className="app-btn-secondary"
                    type="button"
                    onClick={startWeakAreaRetake}
                  >
                    <Target size={16} aria-hidden="true" />
                    Target weak areas
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : !isHydrated ? (
          <div className="flex min-h-105 items-center justify-center">
            <div className="max-w-lg rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-950/70">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">Preparing practice set</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Loading local progress, missed questions, and launch settings for this session.
              </p>
            </div>
          </div>
        ) : activeSession.totalQuestions === 0 || !currentQuestion ? (
          <div className="flex min-h-105 items-center justify-center">
            <div className="max-w-lg rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <AlertTriangle className="mx-auto text-amber-500" size={32} aria-hidden="true" />
              <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">No questions match this setup</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Widen the filters or switch to a different module. Weak Area mode can also run out of questions if the current filters are too narrow.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Question {currentQuestionIndex + 1} of {activeSession.totalQuestions}</span>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black capitalize text-teal-700 dark:bg-teal-950 dark:text-teal-200">{activeSetup.mode}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{currentQuestion.difficulty}</span>
              </div>
              <button
                className="app-btn-secondary px-3 py-2"
                type="button"
                onClick={handleSubmit}
              >
                Finish set
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <span>{getModuleLabel(activeSetup.moduleId, modules)}</span>
                <span>{progress}% answered</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {activeSession.questions.map((question, index) => {
                const selectedChoiceId = answers[question.id] ?? null;
                const isCurrent = index === currentQuestionIndex;
                const isAnswered = selectedChoiceId !== null;
                const isCorrect = isAnswered && selectedChoiceId === question.correctChoiceId;

                return (
                  <button
                    key={question.id}
                    className={classNames(
                      "rounded-lg border px-0 py-2 text-sm font-black transition",
                      isCurrent && "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950",
                      !isCurrent && !isAnswered && "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900",
                      !isCurrent && isAnswered && activeSetup.mode === "exam" && "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-200",
                      !isCurrent && isAnswered && studyLikeMode && isCorrect && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
                      !isCurrent && isAnswered && studyLikeMode && !isCorrect && "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200",
                    )}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">{currentQuestion.topic}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-slate-700 dark:bg-slate-900 dark:text-slate-200">{currentQuestion.questionType}</span>
              <span className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {studyLikeMode ? "Immediate coaching is on for this set." : "Exam mode is live. You can change answers until you submit."}
              </span>
            </div>

            <div className="app-card p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                <FileText size={17} aria-hidden="true" />
                Question {currentQuestionIndex + 1}
              </div>
              <h2 className="mt-4 text-xl font-black leading-8 text-slate-950 dark:text-white sm:text-2xl">{currentQuestion.questionText}</h2>
              <div className="mt-6 grid gap-3">
                {currentQuestion.choices.map((choice, choiceIndex) => {
                  const isSelected = currentAnswer === choice.id;
                  const isCorrectChoice = currentQuestion.correctChoiceId === choice.id;
                  const choiceLabel = String.fromCharCode(65 + choiceIndex);
                  const choiceClassName = studyLikeMode && currentAnswer !== null
                    ? isCorrectChoice
                      ? "border-[rgb(34_197_94/0.65)] bg-[rgb(34_197_94/0.13)] text-(--forge-text-primary)"
                      : isSelected
                        ? "border-[rgb(239_68_68/0.65)] bg-[rgb(239_68_68/0.13)] text-(--forge-text-primary)"
                        : "border-(--forge-border-soft) bg-(--forge-surface-primary) text-(--forge-text-muted)"
                    : isSelected
                      ? "border-[rgb(45_212_191/0.7)] bg-[rgb(45_212_191/0.13)] text-(--forge-text-primary)"
                      : "border-(--forge-border-soft) bg-(--forge-surface-primary) text-(--forge-text-secondary) hover:border-[rgb(45_212_191/0.55)] hover:bg-(--forge-surface-elevated)";

                  return (
                    <button
                      key={choice.id}
                      className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${choiceClassName}`}
                      type="button"
                      onClick={() => handleAnswer(choice.id)}
                      disabled={studyLikeMode && currentAnswer !== null}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{choiceLabel}</span>
                        <span>{choice.text}</span>
                      </span>
                      {studyLikeMode && currentAnswer !== null && isCorrectChoice ? <CheckCircle2 className="shrink-0" size={19} aria-hidden="true" /> : null}
                      {studyLikeMode && currentAnswer !== null && isSelected && !isCorrectChoice ? <XCircle className="shrink-0" size={19} aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {studyLikeMode && currentAnswer !== null ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                <p className={classNames(
                  "text-sm font-black",
                  currentAnswer === currentQuestion.correctChoiceId ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300",
                )}>
                  {currentAnswer === currentQuestion.correctChoiceId ? "Correct" : "Not quite"}
                </p>
                <div className="mt-3 rounded-lg bg-white p-4 dark:bg-slate-900">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Explanation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{currentQuestion.explanation}</p>
                </div>
                {currentAnswer !== currentQuestion.correctChoiceId ? (
                  <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                    {currentQuestion.whyWrong[currentAnswer]}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
                    <div className="mb-1 flex items-center gap-2 font-black"><ShieldAlert size={16} aria-hidden="true" />Exam trap</div>
                    {currentQuestion.examTrap}
                  </div>
                  <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-900 dark:border-teal-900/70 dark:bg-teal-950/40 dark:text-teal-100">
                    <div className="mb-1 flex items-center gap-2 font-black"><Lightbulb size={16} aria-hidden="true" />Study tip</div>
                    {currentQuestion.studyTip}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                {studyLikeMode
                  ? "Select an answer to unlock explanation, trap analysis, and a study tip before moving on."
                  : "Feedback is intentionally hidden in Exam mode. Use the navigation strip to review questions, then submit for full scoring."}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-3">
                <button
                  className="app-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => setCurrentQuestionIndex((index) => Math.max(index - 1, 0))}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>
                <button
                  className="app-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={clearCurrentAnswer}
                  disabled={studyLikeMode && currentAnswer !== null}
                >
                  Clear answer
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="app-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => setCurrentQuestionIndex((index) => Math.min(index + 1, activeSession.totalQuestions - 1))}
                  disabled={currentQuestionIndex === activeSession.totalQuestions - 1}
                >
                  Skip for now
                </button>
                <button
                  className="app-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => {
                    if (currentQuestionIndex === activeSession.totalQuestions - 1) {
                      handleSubmit();
                      return;
                    }
                    setCurrentQuestionIndex((index) => Math.min(index + 1, activeSession.totalQuestions - 1));
                  }}
                  disabled={studyLikeMode && currentAnswer === null}
                >
                  {currentQuestionIndex === activeSession.totalQuestions - 1 ? "See results" : "Next question"}
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}