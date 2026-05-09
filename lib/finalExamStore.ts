import type { Difficulty, Question } from "@/data/types";

const FINAL_EXAM_ATTEMPTS_STORAGE_KEY = "cscp-forge-final-exam-attempts";

export type FinalExamLength = 75 | 150;

export type FinalExamTimingMode = "timed" | "untimed";

export type FinalExamSetup = {
  length: FinalExamLength;
  timingMode: FinalExamTimingMode;
};

export type FinalExamSession = {
  id: string;
  setup: FinalExamSetup;
  questionIds: string[];
  startedAt: string;
  timeLimitSeconds: number | null;
};

export type FinalExamQuestionResult = {
  questionId: string;
  moduleId: string;
  moduleName: string;
  topic: string;
  difficulty: Difficulty;
  selectedChoiceId: string | null;
  correctChoiceId: string;
  isCorrect: boolean;
};

export type FinalExamBreakdown = {
  id: string;
  label: string;
  attempted: number;
  correct: number;
  total: number;
  accuracy: number;
};

export type FinalExamAttempt = {
  id: string;
  sessionId: string;
  length: FinalExamLength;
  timingMode: FinalExamTimingMode;
  startedAt: string;
  completedAt: string;
  elapsedSeconds: number;
  score: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  questionResults: FinalExamQuestionResult[];
  moduleBreakdown: FinalExamBreakdown[];
  topicBreakdown: FinalExamBreakdown[];
  difficultyBreakdown: FinalExamBreakdown[];
  missedQuestionIds: string[];
};

export type FinalExamReviewPlan = {
  headline: string;
  tasks: string[];
  weakModuleIds: string[];
  weakTopics: string[];
};

type ScoreFinalExamInput = {
  session: FinalExamSession;
  questionPool: Question[];
  answers: Record<string, string | null>;
  elapsedSeconds: number;
};

const difficultyMix: Record<Difficulty, number> = {
  easy: 0.16,
  medium: 0.44,
  hard: 0.4,
};

export function buildFinalExamSession(questionPool: Question[], setup: FinalExamSetup): FinalExamSession {
  const questionIds = buildBalancedFinalExamQuestionIds(questionPool, setup.length);

  return {
    id: `final-exam-${setup.length}-${setup.timingMode}-${Date.now()}`,
    setup,
    questionIds,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: setup.timingMode === "timed" ? getFinalExamTimeLimitSeconds(setup.length) : null,
  } satisfies FinalExamSession;
}

export function scoreFinalExamAttempt({ session, questionPool, answers, elapsedSeconds }: ScoreFinalExamInput): FinalExamAttempt {
  const questionLookup = new Map(questionPool.map((question) => [question.id, question]));
  const questionResults = session.questionIds.map((questionId) => {
    const question = questionLookup.get(questionId);
    if (!question) {
      throw new Error(`Question not found while scoring final exam: ${questionId}`);
    }

    const selectedChoiceId = answers[questionId] ?? null;
    const isCorrect = selectedChoiceId === question.correctChoiceId;

    return {
      questionId,
      moduleId: question.moduleId,
      moduleName: question.moduleName,
      topic: question.topic,
      difficulty: question.difficulty,
      selectedChoiceId,
      correctChoiceId: question.correctChoiceId,
      isCorrect,
    } satisfies FinalExamQuestionResult;
  });
  const correctCount = questionResults.filter((result) => result.isCorrect).length;
  const unansweredCount = questionResults.filter((result) => result.selectedChoiceId === null).length;
  const incorrectCount = questionResults.length - correctCount - unansweredCount;
  const score = questionResults.length === 0 ? 0 : Math.round((correctCount / questionResults.length) * 100);

  return {
    id: `final-attempt-${session.id}`,
    sessionId: session.id,
    length: session.setup.length,
    timingMode: session.setup.timingMode,
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
    elapsedSeconds,
    score,
    correctCount,
    incorrectCount,
    unansweredCount,
    totalQuestions: questionResults.length,
    questionResults,
    moduleBreakdown: buildBreakdown(questionResults, (result) => result.moduleId, (result) => result.moduleName),
    topicBreakdown: buildBreakdown(questionResults, (result) => `${result.moduleId}::${result.topic}`, (result) => result.topic),
    difficultyBreakdown: buildBreakdown(questionResults, (result) => result.difficulty, (result) => result.difficulty),
    missedQuestionIds: questionResults.filter((result) => !result.isCorrect).map((result) => result.questionId),
  } satisfies FinalExamAttempt;
}

export function loadFinalExamAttempts() {
  if (typeof window === "undefined") {
    return [] satisfies FinalExamAttempt[];
  }

  const storedAttempts = window.localStorage.getItem(FINAL_EXAM_ATTEMPTS_STORAGE_KEY);
  if (!storedAttempts) {
    return [] satisfies FinalExamAttempt[];
  }

  try {
    const parsedAttempts = JSON.parse(storedAttempts) as unknown;
    if (!Array.isArray(parsedAttempts)) {
      return [] satisfies FinalExamAttempt[];
    }

    return parsedAttempts.filter(isFinalExamAttempt).sort(sortAttemptsByCompletedAt);
  } catch {
    return [] satisfies FinalExamAttempt[];
  }
}

export function saveFinalExamAttempt(attempt: FinalExamAttempt) {
  if (typeof window === "undefined") {
    return;
  }

  const nextAttempts = [attempt, ...loadFinalExamAttempts().filter((item) => item.id !== attempt.id)].slice(0, 20);
  window.localStorage.setItem(FINAL_EXAM_ATTEMPTS_STORAGE_KEY, JSON.stringify(nextAttempts));
}

export function resetFinalExamAttempts() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(FINAL_EXAM_ATTEMPTS_STORAGE_KEY);
}

export function getFinalExamTimeLimitSeconds(length: FinalExamLength) {
  return length === 150 ? 12_600 : 6_300;
}

export function getFinalExamPassReadiness(score: number) {
  if (score >= 90) {
    return "Exam Ready";
  }
  if (score >= 80) {
    return "Likely Passing, Keep Pressure-Testing";
  }
  if (score >= 70) {
    return "Borderline, Review Before Retake";
  }
  return "Not Ready for Full Exam Pressure";
}

export function buildFinalExamReviewPlan(attempt: FinalExamAttempt): FinalExamReviewPlan {
  const weakModules = attempt.moduleBreakdown
    .filter((item) => item.accuracy < 75 || item.attempted < Math.ceil(item.total * 0.9))
    .sort((left, right) => left.accuracy - right.accuracy)
    .slice(0, 3);
  const weakTopics = attempt.topicBreakdown
    .filter((item) => item.accuracy < 75)
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }
      return right.total - left.total;
    })
    .slice(0, 5);

  const tasks = [
    weakTopics[0]
      ? `Review ${weakTopics[0].label} explanations, traps, and wrong-answer patterns.`
      : "Review any flagged explanations from the final exam attempt.",
    weakModules[0]
      ? `Run a 25-question hard set in ${weakModules[0].label}.`
      : "Run a 25-question hard mixed set to keep pressure high.",
    attempt.missedQuestionIds.length > 0
      ? `Retake ${Math.min(25, attempt.missedQuestionIds.length)} missed-question recovery items before another final exam.`
      : "Schedule another timed final exam to confirm the score holds.",
  ];

  return {
    headline: weakModules[0]
      ? `Start with ${weakModules[0].label}, then retest the weakest topics.`
      : "Maintain momentum with timed mixed practice.",
    tasks,
    weakModuleIds: weakModules.map((module) => module.id),
    weakTopics: weakTopics.map((topic) => topic.label),
  } satisfies FinalExamReviewPlan;
}

export function formatExamTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function buildBalancedFinalExamQuestionIds(questionPool: Question[], length: FinalExamLength) {
  const moduleIds = Array.from(new Set(questionPool.map((question) => question.moduleId))).sort();
  const moduleQuotas = distributeTotal(length, moduleIds.length);
  const selectedQuestions: Question[] = [];
  const selectedIds = new Set<string>();

  moduleIds.forEach((moduleId, index) => {
    const moduleQuestions = questionPool.filter((question) => question.moduleId === moduleId);
    const quota = moduleQuotas[index] ?? 0;
    const difficultyQuotas = buildDifficultyQuotas(quota);
    const moduleSelection: Question[] = [];

    (["hard", "medium", "easy"] as Difficulty[]).forEach((difficulty) => {
      const difficultyQuestions = randomizeQuestions(moduleQuestions.filter((question) => question.difficulty === difficulty));
      const needed = difficultyQuotas[difficulty] ?? 0;
      moduleSelection.push(...difficultyQuestions.slice(0, needed));
    });

    if (moduleSelection.length < quota) {
      const overflow = randomizeQuestions(moduleQuestions.filter((question) => !moduleSelection.some((selectedQuestion) => selectedQuestion.id === question.id)));
      moduleSelection.push(...overflow.slice(0, quota - moduleSelection.length));
    }

    moduleSelection.slice(0, quota).forEach((question) => {
      selectedQuestions.push(question);
      selectedIds.add(question.id);
    });
  });

  if (selectedQuestions.length < length) {
    const overflowQuestions = randomizeQuestions(questionPool.filter((question) => !selectedIds.has(question.id)));
    selectedQuestions.push(...overflowQuestions.slice(0, length - selectedQuestions.length));
  }

  return interleaveModules(randomizeQuestions(selectedQuestions.slice(0, length))).map((question) => question.id);
}

function buildDifficultyQuotas(total: number) {
  const hard = Math.round(total * difficultyMix.hard);
  const medium = Math.round(total * difficultyMix.medium);
  const easy = Math.max(total - hard - medium, 0);

  return { easy, medium, hard } satisfies Record<Difficulty, number>;
}

function distributeTotal(total: number, bucketCount: number) {
  const base = Math.floor(total / bucketCount);
  const remainder = total % bucketCount;

  return Array.from({ length: bucketCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function interleaveModules(questions: Question[]) {
  const byModule = new Map<string, Question[]>();
  questions.forEach((question) => {
    byModule.set(question.moduleId, [...(byModule.get(question.moduleId) ?? []), question]);
  });

  const moduleQueues = Array.from(byModule.entries()).sort(([leftModuleId], [rightModuleId]) => leftModuleId.localeCompare(rightModuleId));
  const orderedQuestions: Question[] = [];
  let hasQuestions = true;

  while (hasQuestions) {
    hasQuestions = false;
    moduleQueues.forEach(([, queue]) => {
      const nextQuestion = queue.shift();
      if (nextQuestion) {
        orderedQuestions.push(nextQuestion);
        hasQuestions = true;
      }
    });
  }

  return orderedQuestions;
}

function buildBreakdown(
  questionResults: FinalExamQuestionResult[],
  getId: (result: FinalExamQuestionResult) => string,
  getLabel: (result: FinalExamQuestionResult) => string,
) {
  const buckets = new Map<string, { label: string; attempted: number; correct: number; total: number }>();

  questionResults.forEach((result) => {
    const id = getId(result);
    const bucket = buckets.get(id) ?? { label: getLabel(result), attempted: 0, correct: 0, total: 0 };
    bucket.total += 1;
    bucket.attempted += Number(result.selectedChoiceId !== null);
    bucket.correct += Number(result.isCorrect);
    buckets.set(id, bucket);
  });

  return Array.from(buckets.entries())
    .map(([id, bucket]) => ({
      id,
      label: bucket.label,
      attempted: bucket.attempted,
      correct: bucket.correct,
      total: bucket.total,
      accuracy: bucket.total === 0 ? 0 : Math.round((bucket.correct / bucket.total) * 100),
    } satisfies FinalExamBreakdown))
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }
      return left.label.localeCompare(right.label);
    });
}

function randomizeQuestions(questionPool: Question[]) {
  const randomized = [...questionPool];
  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [randomized[index], randomized[swapIndex]] = [randomized[swapIndex], randomized[index]];
  }
  return randomized;
}

function isFinalExamAttempt(value: unknown): value is FinalExamAttempt {
  if (!value || typeof value !== "object") {
    return false;
  }

  const attempt = value as Partial<FinalExamAttempt>;
  return (
    typeof attempt.id === "string" &&
    typeof attempt.sessionId === "string" &&
    (attempt.length === 75 || attempt.length === 150) &&
    (attempt.timingMode === "timed" || attempt.timingMode === "untimed") &&
    typeof attempt.score === "number" &&
    typeof attempt.completedAt === "string" &&
    Array.isArray(attempt.questionResults) &&
    Array.isArray(attempt.moduleBreakdown) &&
    Array.isArray(attempt.topicBreakdown)
  );
}

function sortAttemptsByCompletedAt(left: FinalExamAttempt, right: FinalExamAttempt) {
  return new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime();
}