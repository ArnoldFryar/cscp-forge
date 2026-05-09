import type { CSCPModule, Difficulty, MissedQuestion, Question, QuizResult, TopicPerformance, UserProgress } from "@/data/types";

const PROGRESS_STORAGE_KEY = "cscp-forge-progress";
const PROGRESS_VERSION = 1;

export type ConfidenceLevel = "Low" | "Building" | "Strong";

export type ModuleProgressSnapshot = {
  moduleId: string;
  moduleName: string;
  moduleNumber: number;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsMissed: number;
  accuracy: number;
  totalQuestions: number;
  confidenceLevel: ConfidenceLevel;
  weakestTopic: string;
  suggestedNextAction: string;
};

export type TopicProgressSnapshot = {
  id: string;
  moduleId: string;
  topic: string;
  attempted: number;
  correct: number;
  accuracy: number;
  trend: "up" | "flat" | "down";
};

export type DifficultyMissSnapshot = {
  difficulty: Difficulty;
  missedCount: number;
};

export type ProgressSnapshot = {
  version: number;
  quizHistory: QuizResult[];
  questionsAnswered: number;
  questionsCorrect: number;
  questionsMissed: number;
  averageAccuracy: number;
  quizAttempts: number;
  studyStreak: number;
  lastStudyDate: string | null;
  totalStudySessions: number;
  lastQuizScore: number | null;
  readinessScore: number;
  weakestModuleId: string | null;
  strongestModuleId: string | null;
  moduleStats: ModuleProgressSnapshot[];
  topicStats: TopicProgressSnapshot[];
  missedByDifficulty: DifficultyMissSnapshot[];
  studyDateHistory: string[];
};

export type ProgressSeed = {
  modules: CSCPModule[];
  questions: Question[];
  userProgress: UserProgress;
  quizResults: QuizResult[];
  topicPerformance: TopicPerformance[];
  missedQuestions: MissedQuestion[];
};

type MutableModuleStats = {
  moduleId: string;
  moduleName: string;
  moduleNumber: number;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsMissed: number;
  totalQuestions: number;
};

type MutableTopicStats = {
  id: string;
  moduleId: string;
  topic: string;
  attempted: number;
  correct: number;
  accuracy: number;
  trend: "up" | "flat" | "down";
};

export function buildInitialProgressSnapshot(seed: ProgressSeed): ProgressSnapshot {
  const questionTotalsByModule = new Map<string, number>();
  seed.questions.forEach((question) => {
    questionTotalsByModule.set(question.moduleId, (questionTotalsByModule.get(question.moduleId) ?? 0) + 1);
  });

  const topicStats = seed.topicPerformance
    .map((topic, index) => ({
      id: topic.id || `topic-seed-${index + 1}`,
      moduleId: topic.moduleId,
      topic: topic.topic,
      attempted: topic.attempted,
      correct: topic.correct,
      accuracy: topic.accuracy,
      trend: topic.trend,
    }))
    .sort((left, right) => left.topic.localeCompare(right.topic));

  const moduleStats = seed.modules
    .map((module) => {
      const totalQuestions = questionTotalsByModule.get(module.id) ?? module.totalQuestions;
      const questionsAnswered = module.completedQuestions;
      const questionsCorrect = Math.round((module.accuracy / 100) * questionsAnswered);
      const questionsMissed = Math.max(questionsAnswered - questionsCorrect, 0);
      const weakestTopic = getWeakestTopic(topicStats, module.id);
      const accuracy = questionsAnswered === 0 ? 0 : Math.round((questionsCorrect / questionsAnswered) * 100);

      return {
        moduleId: module.id,
        moduleName: module.name,
        moduleNumber: module.number,
        questionsAnswered,
        questionsCorrect,
        questionsMissed,
        accuracy,
        totalQuestions,
        confidenceLevel: getConfidenceLevel(questionsAnswered, accuracy),
        weakestTopic,
        suggestedNextAction: getSuggestedModuleAction(module.name, accuracy, questionsAnswered, weakestTopic),
      } satisfies ModuleProgressSnapshot;
    })
    .sort((left, right) => left.moduleNumber - right.moduleNumber);

  const questionsAnswered = moduleStats.reduce((total, module) => total + module.questionsAnswered, 0);
  const questionsCorrect = moduleStats.reduce((total, module) => total + module.questionsCorrect, 0);
  const questionsMissed = Math.max(questionsAnswered - questionsCorrect, 0);
  const averageAccuracy = questionsAnswered === 0 ? 0 : Math.round((questionsCorrect / questionsAnswered) * 100);
  const lastQuiz = sortQuizHistory(seed.quizResults)[0] ?? null;
  const lastStudyDate = lastQuiz?.completedAt ?? null;
  const studyDateHistory = buildStudyDateHistory(lastStudyDate, seed.userProgress.currentStudyStreak);
  const totalStudySessions = Math.max(seed.quizResults.length, Math.ceil(questionsAnswered / 10));
  const missedByDifficulty = buildMissedByDifficulty(seed.missedQuestions, seed.questions);
  const readinessScore = estimateReadinessScore({
    averageAccuracy,
    moduleStats,
    totalQuestionPool: seed.modules.reduce((total, module) => total + module.totalQuestions, 0),
    studyStreak: seed.userProgress.currentStudyStreak,
    totalStudySessions,
  });
  const { weakestModuleId, strongestModuleId } = rankModules(moduleStats);

  return {
    version: PROGRESS_VERSION,
    quizHistory: sortQuizHistory(seed.quizResults),
    questionsAnswered,
    questionsCorrect,
    questionsMissed,
    averageAccuracy,
    quizAttempts: seed.quizResults.length,
    studyStreak: seed.userProgress.currentStudyStreak,
    lastStudyDate,
    totalStudySessions,
    lastQuizScore: lastQuiz?.score ?? null,
    readinessScore,
    weakestModuleId,
    strongestModuleId,
    moduleStats,
    topicStats,
    missedByDifficulty,
    studyDateHistory,
  };
}

export function loadProgress(initialSnapshot: ProgressSnapshot) {
  if (typeof window === "undefined") {
    return initialSnapshot;
  }

  const storedProgress = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!storedProgress) {
    saveProgress(initialSnapshot);
    return initialSnapshot;
  }

  try {
    const parsedProgress = JSON.parse(storedProgress) as ProgressSnapshot;
    if (!isProgressSnapshot(parsedProgress)) {
      saveProgress(initialSnapshot);
      return initialSnapshot;
    }

    return parsedProgress;
  } catch {
    saveProgress(initialSnapshot);
    return initialSnapshot;
  }
}

export function saveProgress(progress: ProgressSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function resetProgress() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
}

export function updateProgressWithQuizResult(
  progress: ProgressSnapshot,
  quizResult: QuizResult,
  questions: Question[],
  modules: CSCPModule[],
) {
  if (progress.quizHistory.some((attempt) => attempt.id === quizResult.id)) {
    return progress;
  }

  const questionLookup = new Map(questions.map((question) => [question.id, question]));
  const moduleLookup = new Map(modules.map((module) => [module.id, module]));
  const moduleStatsById = new Map<string, MutableModuleStats>(
    progress.moduleStats.map((module) => [
      module.moduleId,
      {
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        moduleNumber: module.moduleNumber,
        questionsAnswered: module.questionsAnswered,
        questionsCorrect: module.questionsCorrect,
        questionsMissed: module.questionsMissed,
        totalQuestions: module.totalQuestions,
      },
    ]),
  );
  const topicStatsByKey = new Map<string, MutableTopicStats>(
    progress.topicStats.map((topic) => [
      buildTopicKey(topic.moduleId, topic.topic),
      {
        id: topic.id,
        moduleId: topic.moduleId,
        topic: topic.topic,
        attempted: topic.attempted,
        correct: topic.correct,
        accuracy: topic.accuracy,
        trend: topic.trend,
      },
    ]),
  );
  const missedByDifficulty = new Map<Difficulty, number>(
    progress.missedByDifficulty.map((item) => [item.difficulty, item.missedCount]),
  );

  quizResult.questionResults.forEach((questionResult) => {
    if (questionResult.selectedChoiceId === null) {
      return;
    }

    const question = questionLookup.get(questionResult.questionId);
    if (!question) {
      return;
    }

    const moduleMeta = moduleLookup.get(question.moduleId);
    const moduleStats = moduleStatsById.get(question.moduleId) ?? {
      moduleId: question.moduleId,
      moduleName: question.moduleName,
      moduleNumber: moduleMeta?.number ?? 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      questionsMissed: 0,
      totalQuestions: moduleMeta?.totalQuestions ?? 0,
    };

    moduleStats.questionsAnswered += 1;
    moduleStats.questionsCorrect += Number(questionResult.isCorrect);
    moduleStats.questionsMissed += Number(!questionResult.isCorrect);
    moduleStatsById.set(question.moduleId, moduleStats);

    const topicKey = buildTopicKey(question.moduleId, question.topic);
    const previousTopic = topicStatsByKey.get(topicKey);
    const nextAttempted = (previousTopic?.attempted ?? 0) + 1;
    const nextCorrect = (previousTopic?.correct ?? 0) + Number(questionResult.isCorrect);
    const nextAccuracy = nextAttempted === 0 ? 0 : Math.round((nextCorrect / nextAttempted) * 100);

    topicStatsByKey.set(topicKey, {
      id: previousTopic?.id ?? `topic-${topicKey}`,
      moduleId: question.moduleId,
      topic: question.topic,
      attempted: nextAttempted,
      correct: nextCorrect,
      accuracy: nextAccuracy,
      trend: getTrend(previousTopic?.accuracy, nextAccuracy),
    });

    if (!questionResult.isCorrect) {
      missedByDifficulty.set(question.difficulty, (missedByDifficulty.get(question.difficulty) ?? 0) + 1);
    }
  });

  const nextTopicStats = Array.from(topicStatsByKey.values())
    .sort((left, right) => {
      if (left.moduleId !== right.moduleId) {
        return left.moduleId.localeCompare(right.moduleId);
      }

      return left.topic.localeCompare(right.topic);
    })
    .map((topic) => ({
      id: topic.id,
      moduleId: topic.moduleId,
      topic: topic.topic,
      attempted: topic.attempted,
      correct: topic.correct,
      accuracy: topic.accuracy,
      trend: topic.trend,
    } satisfies TopicProgressSnapshot));

  const nextModuleStats = Array.from(moduleStatsById.values())
    .map((module) => {
      const accuracy = module.questionsAnswered === 0 ? 0 : Math.round((module.questionsCorrect / module.questionsAnswered) * 100);
      const weakestTopic = getWeakestTopic(nextTopicStats, module.moduleId);

      return {
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        moduleNumber: module.moduleNumber,
        questionsAnswered: module.questionsAnswered,
        questionsCorrect: module.questionsCorrect,
        questionsMissed: module.questionsMissed,
        accuracy,
        totalQuestions: module.totalQuestions,
        confidenceLevel: getConfidenceLevel(module.questionsAnswered, accuracy),
        weakestTopic,
        suggestedNextAction: getSuggestedModuleAction(module.moduleName, accuracy, module.questionsAnswered, weakestTopic),
      } satisfies ModuleProgressSnapshot;
    })
    .sort((left, right) => left.moduleNumber - right.moduleNumber);

  const questionsAnswered = progress.questionsAnswered + (quizResult.totalQuestions - quizResult.unansweredCount);
  const questionsCorrect = progress.questionsCorrect + quizResult.correctCount;
  const questionsMissed = progress.questionsMissed + quizResult.incorrectCount;
  const quizHistory = sortQuizHistory([quizResult, ...progress.quizHistory]);
  const studyDateHistory = appendStudyDate(progress.studyDateHistory, quizResult.completedAt);
  const totalStudySessions = progress.totalStudySessions + 1;
  const averageAccuracy = questionsAnswered === 0 ? 0 : Math.round((questionsCorrect / questionsAnswered) * 100);
  const readinessScore = estimateReadinessScore({
    averageAccuracy,
    moduleStats: nextModuleStats,
    totalQuestionPool: modules.reduce((total, module) => total + module.totalQuestions, 0),
    studyStreak: calculateStudyStreak(studyDateHistory),
    totalStudySessions,
  });
  const { weakestModuleId, strongestModuleId } = rankModules(nextModuleStats);

  return {
    version: PROGRESS_VERSION,
    quizHistory,
    questionsAnswered,
    questionsCorrect,
    questionsMissed,
    averageAccuracy,
    quizAttempts: progress.quizAttempts + 1,
    studyStreak: calculateStudyStreak(studyDateHistory),
    lastStudyDate: quizResult.completedAt,
    totalStudySessions,
    lastQuizScore: quizResult.score,
    readinessScore,
    weakestModuleId,
    strongestModuleId,
    moduleStats: nextModuleStats,
    topicStats: nextTopicStats,
    missedByDifficulty: toDifficultySnapshots(missedByDifficulty),
    studyDateHistory,
  } satisfies ProgressSnapshot;
}

function buildMissedByDifficulty(missedQuestions: MissedQuestion[], questions: Question[]) {
  const questionLookup = new Map(questions.map((question) => [question.id, question]));
  const missedByDifficulty = new Map<Difficulty, number>([
    ["easy", 0],
    ["medium", 0],
    ["hard", 0],
  ]);

  missedQuestions.forEach((missedQuestion) => {
    const question = questionLookup.get(missedQuestion.questionId);
    if (!question) {
      return;
    }

    missedByDifficulty.set(question.difficulty, (missedByDifficulty.get(question.difficulty) ?? 0) + missedQuestion.missedCount);
  });

  return toDifficultySnapshots(missedByDifficulty);
}

function toDifficultySnapshots(missedByDifficulty: Map<Difficulty, number>) {
  return (["easy", "medium", "hard"] as Difficulty[]).map((difficulty) => ({
    difficulty,
    missedCount: missedByDifficulty.get(difficulty) ?? 0,
  } satisfies DifficultyMissSnapshot));
}

function buildStudyDateHistory(lastStudyDate: string | null, studyStreak: number) {
  if (!lastStudyDate || studyStreak <= 0) {
    return [];
  }

  const anchor = new Date(lastStudyDate);
  if (Number.isNaN(anchor.getTime())) {
    return [];
  }

  const history: string[] = [];
  for (let index = studyStreak - 1; index >= 0; index -= 1) {
    const nextDate = new Date(anchor);
    nextDate.setUTCDate(anchor.getUTCDate() - index);
    const nextDateKey = toDateKey(nextDate.toISOString());
    if (nextDateKey) {
      history.push(nextDateKey);
    }
  }

  return history;
}

function appendStudyDate(studyDateHistory: string[], completedAt: string) {
  const nextDateKey = toDateKey(completedAt);
  if (!nextDateKey) {
    return studyDateHistory;
  }

  return Array.from(new Set([...studyDateHistory, nextDateKey])).sort();
}

function calculateStudyStreak(studyDateHistory: string[]) {
  if (studyDateHistory.length === 0) {
    return 0;
  }

  let streak = 1;
  for (let index = studyDateHistory.length - 1; index > 0; index -= 1) {
    const currentDate = new Date(`${studyDateHistory[index]}T00:00:00.000Z`);
    const previousDate = new Date(`${studyDateHistory[index - 1]}T00:00:00.000Z`);
    const delta = (currentDate.getTime() - previousDate.getTime()) / 86_400_000;

    if (delta !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function estimateReadinessScore(input: {
  averageAccuracy: number;
  moduleStats: ModuleProgressSnapshot[];
  totalQuestionPool: number;
  studyStreak: number;
  totalStudySessions: number;
}) {
  const coveredQuestions = input.moduleStats.reduce((total, module) => total + Math.min(module.questionsAnswered, module.totalQuestions), 0);
  const coverageScore = input.totalQuestionPool === 0 ? 0 : Math.round((coveredQuestions / input.totalQuestionPool) * 100);
  const streakScore = Math.min(8, input.studyStreak * 0.6);
  const sessionScore = Math.min(8, input.totalStudySessions / 6);
  const readiness = (input.averageAccuracy * 0.62) + (coverageScore * 0.23) + streakScore + sessionScore;

  return Math.max(0, Math.min(100, Math.round(readiness)));
}

function rankModules(moduleStats: ModuleProgressSnapshot[]) {
  const rankedModules = [...moduleStats]
    .filter((module) => module.questionsAnswered > 0)
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }

      return left.moduleNumber - right.moduleNumber;
    });

  return {
    weakestModuleId: rankedModules[0]?.moduleId ?? null,
    strongestModuleId: rankedModules[rankedModules.length - 1]?.moduleId ?? null,
  };
}

function getWeakestTopic(topicStats: Array<Pick<TopicProgressSnapshot, "moduleId" | "topic" | "accuracy" | "attempted">>, moduleId: string) {
  const weakestTopic = topicStats
    .filter((topic) => topic.moduleId === moduleId)
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }

      return left.topic.localeCompare(right.topic);
    })[0];

  return weakestTopic?.topic ?? "No topic data yet";
}

function getConfidenceLevel(questionsAnswered: number, accuracy: number): ConfidenceLevel {
  if (accuracy >= 82 && questionsAnswered >= 30) {
    return "Strong";
  }
  if (accuracy >= 70 && questionsAnswered >= 15) {
    return "Building";
  }
  return "Low";
}

function getSuggestedModuleAction(moduleName: string, accuracy: number, questionsAnswered: number, weakestTopic: string) {
  if (questionsAnswered < 15) {
    return `Build a short study set in ${moduleName} to increase exposure.`;
  }
  if (accuracy < 70) {
    return `Retry ${weakestTopic} in Weak Area mode before another mixed quiz.`;
  }
  if (accuracy < 82) {
    return `Run a medium-difficulty set and review ${weakestTopic}.`;
  }
  return `Pressure-test ${moduleName} in Exam mode to hold your edge.`;
}

function buildTopicKey(moduleId: string, topic: string) {
  return `${moduleId}::${topic}`;
}

function getTrend(previousAccuracy: number | undefined, nextAccuracy: number): "up" | "flat" | "down" {
  if (previousAccuracy == null) {
    return nextAccuracy >= 80 ? "up" : nextAccuracy >= 65 ? "flat" : "down";
  }
  if (nextAccuracy >= previousAccuracy + 3) {
    return "up";
  }
  if (nextAccuracy <= previousAccuracy - 3) {
    return "down";
  }
  return "flat";
}

function sortQuizHistory(quizHistory: QuizResult[]) {
  return [...quizHistory].sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
}

function toDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function isProgressSnapshot(value: unknown): value is ProgressSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<ProgressSnapshot>;
  return (
    snapshot.version === PROGRESS_VERSION &&
    typeof snapshot.questionsAnswered === "number" &&
    typeof snapshot.questionsCorrect === "number" &&
    typeof snapshot.questionsMissed === "number" &&
    typeof snapshot.averageAccuracy === "number" &&
    typeof snapshot.quizAttempts === "number" &&
    typeof snapshot.studyStreak === "number" &&
    typeof snapshot.totalStudySessions === "number" &&
    typeof snapshot.readinessScore === "number" &&
    Array.isArray(snapshot.quizHistory) &&
    Array.isArray(snapshot.moduleStats) &&
    Array.isArray(snapshot.topicStats) &&
    Array.isArray(snapshot.missedByDifficulty) &&
    Array.isArray(snapshot.studyDateHistory)
  );
}