import type { MissedQuestion, Question } from "@/data/types";
import type { ModuleProgressSnapshot, ProgressSnapshot, TopicProgressSnapshot } from "@/lib/progressStore";

const STUDY_PLAN_SETTINGS_STORAGE_KEY = "cscp-forge-study-plan-settings";
const DAY_IN_MS = 86_400_000;

export type StudyConfidenceLevel = "low" | "moderate" | "high";

export type StudyStyle = "reading" | "quiz-heavy" | "balanced" | "weak-area-focused";

export type StudyPlanSettings = {
  targetExamDate: string;
  studyDaysPerWeek: number;
  minutesPerSession: number;
  confidenceLevel: StudyConfidenceLevel;
  preferredStudyStyle: StudyStyle;
};

export type GeneratedStudyDay = {
  id: string;
  date: string;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
  isStudyDay: boolean;
  focus: string;
  timeEstimate: string;
  tasks: string[];
  expectedOutcome: string;
  primaryModuleId: string | null;
  primaryModuleName: string;
  weakestTopics: string[];
};

export type GeneratedStudyPlan = {
  settings: StudyPlanSettings;
  daysUntilExam: number;
  weeklyAvailableMinutes: number;
  totalMissedQuestions: number;
  totalMissedEvents: number;
  weakestModuleName: string;
  focusModules: string[];
  weakestTopics: string[];
  dailyPlans: GeneratedStudyDay[];
  todayPlan: GeneratedStudyDay;
  nextFocusedSession: GeneratedStudyDay;
};

type GenerateStudyPlanOptions = {
  progress: ProgressSnapshot;
  missedQuestions: MissedQuestion[];
  questions: Question[];
  settings: StudyPlanSettings;
  now?: Date;
};

type RankedTopic = TopicProgressSnapshot & {
  missedCount: number;
};

const studyStyleLabels: Record<StudyStyle, string> = {
  reading: "Reading",
  "quiz-heavy": "Quiz-heavy",
  balanced: "Balanced",
  "weak-area-focused": "Weak-area focused",
};

const confidenceLabels: Record<StudyConfidenceLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

export function getDefaultStudyPlanSettings(progress?: ProgressSnapshot, now: Date = new Date()): StudyPlanSettings {
  const targetExamDate = addDays(now, 56).toISOString().slice(0, 10);
  const readinessScore = progress?.readinessScore ?? 70;

  return {
    targetExamDate,
    studyDaysPerWeek: readinessScore >= 82 ? 4 : 5,
    minutesPerSession: readinessScore >= 82 ? 40 : readinessScore >= 70 ? 50 : 60,
    confidenceLevel: getDefaultConfidenceLevel(progress),
    preferredStudyStyle: readinessScore >= 78 ? "balanced" : "weak-area-focused",
  };
}

export function loadStudyPlanSettings(defaultSettings: StudyPlanSettings) {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  const storedSettings = window.localStorage.getItem(STUDY_PLAN_SETTINGS_STORAGE_KEY);
  if (!storedSettings) {
    return defaultSettings;
  }

  try {
    const parsedSettings = JSON.parse(storedSettings) as Partial<StudyPlanSettings>;
    return normalizeStudyPlanSettings(parsedSettings, defaultSettings);
  } catch {
    return defaultSettings;
  }
}

export function saveStudyPlanSettings(settings: StudyPlanSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STUDY_PLAN_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function getStudyStyleLabel(style: StudyStyle) {
  return studyStyleLabels[style];
}

export function getConfidenceLabel(level: StudyConfidenceLevel) {
  return confidenceLabels[level];
}

export function generateWeeklyStudyPlan({ progress, missedQuestions, questions, settings, now = new Date() }: GenerateStudyPlanOptions): GeneratedStudyPlan {
  const today = startOfDay(now);
  const examDate = parseExamDate(settings.targetExamDate, today);
  const daysUntilExam = Math.max(1, Math.ceil((examDate.getTime() - today.getTime()) / DAY_IN_MS));
  const weeklyAvailableMinutes = settings.studyDaysPerWeek * settings.minutesPerSession;
  const questionLookup = new Map(questions.map((question) => [question.id, question]));
  const totalMissedQuestions = missedQuestions.length;
  const totalMissedEvents = missedQuestions.reduce((total, question) => total + question.missedCount, 0);
  const missedByModule = buildMissedByModule(missedQuestions, questionLookup);
  const missedByTopic = buildMissedByTopic(missedQuestions, questionLookup);
  const rankedTopics = rankTopics(progress.topicStats, missedByTopic);
  const prioritizedModules = rankModules(progress.moduleStats, missedByModule, daysUntilExam, settings.confidenceLevel);
  const scheduledDayIndices = getScheduledDayIndices(settings.studyDaysPerWeek);
  const weakestTopics = rankedTopics.slice(0, 4).map((topic) => topic.topic);
  const weakestModuleName = prioritizedModules[0]?.moduleName ?? "Readiness review";
  const dailyPlans: GeneratedStudyDay[] = [];
  let scheduledSessionIndex = 0;

  for (let offset = 0; offset < 7; offset += 1) {
    const currentDate = addDays(today, offset);
    const isStudyDay = scheduledDayIndices.includes(offset);

    if (isStudyDay) {
      const primaryModule = pickPrimaryModule(prioritizedModules, scheduledSessionIndex, daysUntilExam);
      const weakestModuleTopics = rankedTopics.filter((topic) => topic.moduleId === primaryModule?.moduleId).slice(0, 2);
      const focusTopics = weakestModuleTopics.length > 0
        ? weakestModuleTopics.map((topic) => topic.topic)
        : weakestTopics.slice(0, 2);
      const isFinalReviewDay = scheduledSessionIndex === scheduledDayIndices.length - 1 || daysUntilExam <= 10;

      dailyPlans.push(buildDeepStudyDay({
        currentDate,
        offset,
        settings,
        primaryModule,
        focusTopics,
        rankedTopics,
        totalMissedQuestions,
        totalMissedEvents,
        isFinalReviewDay,
        scheduledSessionIndex,
      }));
      scheduledSessionIndex += 1;
      continue;
    }

    dailyPlans.push(buildRecoveryDay({
      currentDate,
      offset,
      settings,
      primaryModule: prioritizedModules[0] ?? null,
      weakestTopics,
      daysUntilExam,
      totalMissedQuestions,
    }));
  }

  const todayPlan = dailyPlans[0] ?? buildEmptyPlan(today);
  const nextFocusedSession = dailyPlans.find((plan) => plan.isStudyDay) ?? todayPlan;

  return {
    settings,
    daysUntilExam,
    weeklyAvailableMinutes,
    totalMissedQuestions,
    totalMissedEvents,
    weakestModuleName,
    focusModules: prioritizedModules.slice(0, 3).map((module) => module.moduleName),
    weakestTopics,
    dailyPlans,
    todayPlan,
    nextFocusedSession,
  };
}

function buildDeepStudyDay(input: {
  currentDate: Date;
  offset: number;
  settings: StudyPlanSettings;
  primaryModule: ModuleProgressSnapshot | null;
  focusTopics: string[];
  rankedTopics: RankedTopic[];
  totalMissedQuestions: number;
  totalMissedEvents: number;
  isFinalReviewDay: boolean;
  scheduledSessionIndex: number;
}) {
  const primaryModuleName = input.primaryModule?.moduleName ?? "Mixed readiness review";
  const primaryModuleId = input.primaryModule?.moduleId ?? null;
  const focusTopics = input.focusTopics.length > 0 ? input.focusTopics : input.rankedTopics.slice(0, 2).map((topic) => topic.topic);
  const weakestTopicLabel = focusTopics[0] ?? "high-impact CSCP concepts";
  const stylePlan = getStylePlan(input.settings.preferredStudyStyle, input.settings.confidenceLevel, input.settings.minutesPerSession, input.isFinalReviewDay);
  const quizQuestionCount = Math.max(8, Math.round(stylePlan.quizMinutes / 2));
  const missedQuestionTarget = Math.max(3, Math.min(input.totalMissedQuestions, Math.round(stylePlan.recoveryMinutes / 4)));
  const recallPromptCount = Math.max(3, Math.round(stylePlan.recallMinutes / 4));
  const focus = getFocusLabel(input.settings.preferredStudyStyle, primaryModuleName, weakestTopicLabel, input.isFinalReviewDay);
  const taskList = [
    `Module review (${stylePlan.reviewMinutes} min): revisit ${primaryModuleName} concepts with extra attention on ${weakestTopicLabel}.`,
    `Practice quiz block (${stylePlan.quizMinutes} min): run a ${quizQuestionCount}-question set to test this module under pressure.`,
    `Missed-question recovery (${stylePlan.recoveryMinutes} min): retake ${missedQuestionTarget} missed questions and rewrite the trap behind each miss.`,
    `Active recall prompts (${stylePlan.recallMinutes} min): answer ${recallPromptCount} prompts on ${focusTopics.join(" and ")}.`,
  ];

  if (stylePlan.finalReviewMinutes > 0) {
    taskList.push(`Final review block (${stylePlan.finalReviewMinutes} min): run a mixed recap across ${primaryModuleName} and your weakest topics.`);
  }

  return {
    id: `study-day-${input.offset}`,
    date: input.currentDate.toISOString(),
    dayLabel: formatDayLabel(input.currentDate),
    dateLabel: formatDateLabel(input.currentDate),
    isToday: input.offset === 0,
    isStudyDay: true,
    focus,
    timeEstimate: `${input.settings.minutesPerSession} min`,
    tasks: taskList,
    expectedOutcome: `Lift confidence in ${primaryModuleName}, close at least ${Math.min(missedQuestionTarget, input.totalMissedEvents || missedQuestionTarget)} open misses, and leave with a cleaner read on ${weakestTopicLabel}.`,
    primaryModuleId,
    primaryModuleName,
    weakestTopics: focusTopics,
  } satisfies GeneratedStudyDay;
}

function buildRecoveryDay(input: {
  currentDate: Date;
  offset: number;
  settings: StudyPlanSettings;
  primaryModule: ModuleProgressSnapshot | null;
  weakestTopics: string[];
  daysUntilExam: number;
  totalMissedQuestions: number;
}) {
  const lightMinutes = Math.max(10, roundToFive(input.settings.minutesPerSession * 0.25));
  const emphasisTopics = input.weakestTopics.slice(0, 2);
  const moduleName = input.primaryModule?.moduleName ?? "mixed review";
  const reviewText = input.daysUntilExam <= 10 ? "Final review refresh" : "Light recall and recovery";
  const tasks = [
    `Read one explanation from your ${moduleName} missed-question queue and note the exam trap in one sentence.`,
    `Run 3 active recall prompts on ${emphasisTopics.join(" and ") || "your weakest topics"}.`,
    `Preview the next deep session so you know the first quiz block and module review task before you sit down.`,
  ];

  if (input.daysUntilExam <= 7) {
    tasks.push("Finish with a 5-question final review check to keep exam readiness active.");
  }

  return {
    id: `study-day-${input.offset}`,
    date: input.currentDate.toISOString(),
    dayLabel: formatDayLabel(input.currentDate),
    dateLabel: formatDateLabel(input.currentDate),
    isToday: input.offset === 0,
    isStudyDay: false,
    focus: reviewText,
    timeEstimate: `${lightMinutes} min optional`,
    tasks,
    expectedOutcome: `Stay close to ${Math.max(input.totalMissedQuestions, 1)} active misses without burning a full study block.`,
    primaryModuleId: input.primaryModule?.moduleId ?? null,
    primaryModuleName: input.primaryModule?.moduleName ?? "Mixed review",
    weakestTopics: emphasisTopics,
  } satisfies GeneratedStudyDay;
}

function buildEmptyPlan(today: Date): GeneratedStudyDay {
  return {
    id: "study-day-empty",
    date: today.toISOString(),
    dayLabel: formatDayLabel(today),
    dateLabel: formatDateLabel(today),
    isToday: true,
    isStudyDay: false,
    focus: "Build your first weekly plan",
    timeEstimate: "15 min",
    tasks: ["Set an exam date, choose study days, and let the planner prioritize your weakest modules."],
    expectedOutcome: "A personalized weekly study path with immediate next steps.",
    primaryModuleId: null,
    primaryModuleName: "Not set",
    weakestTopics: [],
  };
}

function getDefaultConfidenceLevel(progress?: ProgressSnapshot): StudyConfidenceLevel {
  const readinessScore = progress?.readinessScore ?? 70;

  if (readinessScore >= 82) {
    return "high";
  }
  if (readinessScore >= 68) {
    return "moderate";
  }
  return "low";
}

function normalizeStudyPlanSettings(settings: Partial<StudyPlanSettings>, defaults: StudyPlanSettings): StudyPlanSettings {
  return {
    targetExamDate: typeof settings.targetExamDate === "string" && settings.targetExamDate.length >= 10 ? settings.targetExamDate : defaults.targetExamDate,
    studyDaysPerWeek: clampNumber(settings.studyDaysPerWeek, 1, 7, defaults.studyDaysPerWeek),
    minutesPerSession: clampNumber(settings.minutesPerSession, 20, 180, defaults.minutesPerSession),
    confidenceLevel: isStudyConfidenceLevel(settings.confidenceLevel) ? settings.confidenceLevel : defaults.confidenceLevel,
    preferredStudyStyle: isStudyStyle(settings.preferredStudyStyle) ? settings.preferredStudyStyle : defaults.preferredStudyStyle,
  };
}

function rankModules(
  moduleStats: ModuleProgressSnapshot[],
  missedByModule: Map<string, number>,
  daysUntilExam: number,
  confidenceLevel: StudyConfidenceLevel,
) {
  const confidenceBoost = confidenceLevel === "low" ? 8 : confidenceLevel === "moderate" ? 4 : 0;

  return [...moduleStats].sort((left, right) => {
    const leftScore = getModulePriorityScore(left, missedByModule.get(left.moduleId) ?? 0, daysUntilExam, confidenceBoost);
    const rightScore = getModulePriorityScore(right, missedByModule.get(right.moduleId) ?? 0, daysUntilExam, confidenceBoost);
    return rightScore - leftScore;
  });
}

function getModulePriorityScore(module: ModuleProgressSnapshot, missedCount: number, daysUntilExam: number, confidenceBoost: number) {
  const urgencyBoost = daysUntilExam <= 14 ? (module.accuracy < 78 ? 10 : 4) : daysUntilExam <= 30 ? 6 : 0;
  const lowConfidenceBoost = module.confidenceLevel === "Low" ? 10 : module.confidenceLevel === "Building" ? 4 : 0;

  return ((100 - module.accuracy) * 1.1) + (module.questionsMissed * 0.8) + (missedCount * 3.4) + lowConfidenceBoost + urgencyBoost + confidenceBoost;
}

function rankTopics(topicStats: TopicProgressSnapshot[], missedByTopic: Map<string, number>) {
  return [...topicStats]
    .map((topic) => ({
      ...topic,
      missedCount: missedByTopic.get(buildTopicKey(topic.moduleId, topic.topic)) ?? 0,
    }))
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }
      if (left.missedCount !== right.missedCount) {
        return right.missedCount - left.missedCount;
      }
      return right.attempted - left.attempted;
    });
}

function buildMissedByModule(missedQuestions: MissedQuestion[], questionLookup: Map<string, Question>) {
  const missedByModule = new Map<string, number>();

  missedQuestions.forEach((missedQuestion) => {
    const question = questionLookup.get(missedQuestion.questionId);
    if (!question) {
      return;
    }

    missedByModule.set(question.moduleId, (missedByModule.get(question.moduleId) ?? 0) + missedQuestion.missedCount);
  });

  return missedByModule;
}

function buildMissedByTopic(missedQuestions: MissedQuestion[], questionLookup: Map<string, Question>) {
  const missedByTopic = new Map<string, number>();

  missedQuestions.forEach((missedQuestion) => {
    const question = questionLookup.get(missedQuestion.questionId);
    if (!question) {
      return;
    }

    const topicKey = buildTopicKey(question.moduleId, question.topic);
    missedByTopic.set(topicKey, (missedByTopic.get(topicKey) ?? 0) + missedQuestion.missedCount);
  });

  return missedByTopic;
}

function getScheduledDayIndices(studyDaysPerWeek: number) {
  const clampedDays = Math.max(1, Math.min(7, studyDaysPerWeek));

  if (clampedDays === 7) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  if (clampedDays === 1) {
    return [0];
  }

  const step = 6 / (clampedDays - 1);
  const dayIndices = new Set<number>([0]);

  for (let index = 0; index < clampedDays; index += 1) {
    dayIndices.add(Math.round(index * step));
  }

  for (let index = 0; dayIndices.size < clampedDays && index < 7; index += 1) {
    dayIndices.add(index);
  }

  return Array.from(dayIndices).sort((left, right) => left - right).slice(0, clampedDays);
}

function pickPrimaryModule(modules: ModuleProgressSnapshot[], scheduledSessionIndex: number, daysUntilExam: number) {
  if (modules.length === 0) {
    return null;
  }

  if (scheduledSessionIndex === 0) {
    return modules[0];
  }

  if (daysUntilExam <= 14) {
    return modules[Math.min(scheduledSessionIndex % Math.min(modules.length, 2), modules.length - 1)];
  }

  return modules[Math.min(scheduledSessionIndex, modules.length - 1)];
}

function getStylePlan(style: StudyStyle, confidenceLevel: StudyConfidenceLevel, minutesPerSession: number, includeFinalReview: boolean) {
  const baseShares: Record<StudyStyle, { review: number; quiz: number; recovery: number; recall: number }> = {
    reading: { review: 0.42, quiz: 0.2, recovery: 0.18, recall: 0.2 },
    "quiz-heavy": { review: 0.2, quiz: 0.42, recovery: 0.2, recall: 0.18 },
    balanced: { review: 0.3, quiz: 0.3, recovery: 0.2, recall: 0.2 },
    "weak-area-focused": { review: 0.18, quiz: 0.22, recovery: 0.38, recall: 0.22 },
  };

  const shares = { ...baseShares[style] };

  if (confidenceLevel === "low") {
    shares.review += 0.05;
    shares.quiz -= 0.03;
    shares.recall += 0.02;
  }

  if (confidenceLevel === "high") {
    shares.quiz += 0.04;
    shares.review -= 0.02;
    shares.recovery -= 0.02;
  }

  const finalReviewMinutes = includeFinalReview ? Math.max(10, roundToFive(minutesPerSession * 0.18)) : 0;
  const coreMinutes = minutesPerSession - finalReviewMinutes;
  const reviewMinutes = roundToFive(coreMinutes * shares.review);
  const quizMinutes = roundToFive(coreMinutes * shares.quiz);
  const recoveryMinutes = roundToFive(coreMinutes * shares.recovery);
  const recallMinutes = Math.max(10, coreMinutes - reviewMinutes - quizMinutes - recoveryMinutes);

  return {
    reviewMinutes,
    quizMinutes,
    recoveryMinutes,
    recallMinutes,
    finalReviewMinutes,
  };
}

function getFocusLabel(style: StudyStyle, moduleName: string, weakestTopic: string, isFinalReviewDay: boolean) {
  if (isFinalReviewDay) {
    return `Final review sweep in ${moduleName}`;
  }

  if (style === "reading") {
    return `${moduleName} concept rebuild on ${weakestTopic}`;
  }
  if (style === "quiz-heavy") {
    return `${moduleName} pressure test on ${weakestTopic}`;
  }
  if (style === "weak-area-focused") {
    return `${moduleName} missed-question recovery`;
  }
  return `${moduleName} mixed review and practice`;
}

function parseExamDate(value: string, fallback: Date) {
  const examDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(examDate.getTime())) {
    return fallback;
  }

  return examDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function roundToFive(value: number) {
  return Math.max(5, Math.round(value / 5) * 5);
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function isStudyStyle(value: string | undefined): value is StudyStyle {
  return value === "reading" || value === "quiz-heavy" || value === "balanced" || value === "weak-area-focused";
}

function isStudyConfidenceLevel(value: string | undefined): value is StudyConfidenceLevel {
  return value === "low" || value === "moderate" || value === "high";
}

function buildTopicKey(moduleId: string, topic: string) {
  return `${moduleId}::${topic}`;
}