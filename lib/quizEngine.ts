import type { Difficulty, MissedQuestion, Question, QuizLength, QuizMode, QuizResult, QuizSession, TopicPerformance } from "@/data/types";

export type QuizEngineFilters = {
  moduleId: string | "all";
  difficulty: Difficulty | "all";
  topic: string | "all";
  length: QuizLength;
  mode: QuizMode;
};

export type BuiltQuizSession = QuizSession & {
  questions: Question[];
  totalQuestions: number;
};

export type TopicPerformanceSeed = Pick<TopicPerformance, "moduleId" | "topic" | "accuracy" | "attempted" | "correct">;

type ResultInput = {
  session: BuiltQuizSession;
  questionPool: Question[];
  answers: Record<string, string | null>;
};

export function getAvailableTopics(questionPool: Question[], moduleId: string | "all") {
  return Array.from(
    new Set(
      questionPool
        .filter((question) => moduleId === "all" || question.moduleId === moduleId)
        .map((question) => question.topic),
    ),
  ).sort();
}

export function buildQuizSession(questionPool: Question[], filters: QuizEngineFilters, options?: { missedQuestions?: MissedQuestion[]; topicPerformance?: TopicPerformanceSeed[] }) {
  const filteredQuestions = filterQuestions(questionPool, filters, options?.missedQuestions, options?.topicPerformance);
  const randomizedQuestions = randomizeQuestions(filteredQuestions);
  const selectedQuestions = selectQuizLength(randomizedQuestions, filters.length);
  const questionOrder = selectedQuestions.map((question) => question.id);

  return {
    id: `session-${filters.mode}-${filters.moduleId}-${filters.difficulty}-${filters.topic}-${filters.length}`,
    moduleId: filters.moduleId,
    difficulty: filters.difficulty,
    topic: filters.topic,
    mode: filters.mode,
    length: filters.length,
    questionIds: questionOrder,
    currentQuestionIndex: 0,
    startedAt: new Date().toISOString(),
    answeredChoiceIds: {},
    questionOrder,
    questions: selectedQuestions,
    totalQuestions: selectedQuestions.length,
  } satisfies BuiltQuizSession;
}

export function calculateQuizResult({ session, questionPool, answers }: ResultInput): QuizResult {
  const questionLookup = new Map(questionPool.map((question) => [question.id, question]));
  const topicBuckets = new Map<string, { moduleId: string; attempted: number; correct: number }>();

  const questionResults = session.questionOrder.map((questionId) => {
    const question = questionLookup.get(questionId);
    if (!question) {
      throw new Error(`Question not found while scoring quiz: ${questionId}`);
    }

    const selectedChoiceId = answers[questionId] ?? null;
    const isCorrect = selectedChoiceId !== null && selectedChoiceId === question.correctChoiceId;
    const bucket = topicBuckets.get(question.topic) ?? { moduleId: question.moduleId, attempted: 0, correct: 0 };

    if (selectedChoiceId !== null) {
      bucket.attempted += 1;
      bucket.correct += Number(isCorrect);
      topicBuckets.set(question.topic, bucket);
    } else {
      topicBuckets.set(question.topic, bucket);
    }

    return {
      questionId,
      topic: question.topic,
      selectedChoiceId,
      correctChoiceId: question.correctChoiceId,
      isCorrect,
    };
  });

  const correctCount = questionResults.filter((result) => result.isCorrect).length;
  const unansweredCount = questionResults.filter((result) => result.selectedChoiceId === null).length;
  const incorrectCount = questionResults.length - correctCount - unansweredCount;
  const score = questionResults.length === 0 ? 0 : Math.round((correctCount / questionResults.length) * 100);
  const missedQuestionIds = questionResults.filter((result) => !result.isCorrect).map((result) => result.questionId);
  const missedTopics = Array.from(new Set(questionResults.filter((result) => !result.isCorrect).map((result) => result.topic)));
  const topicPerformance = Array.from(topicBuckets.entries()).map(([topic, bucket], index) => {
    const accuracy = bucket.attempted === 0 ? 0 : Math.round((bucket.correct / bucket.attempted) * 100);
    return {
      id: `topic-result-${index + 1}`,
      moduleId: bucket.moduleId,
      topic,
      accuracy,
      attempted: bucket.attempted,
      correct: bucket.correct,
      trend: accuracy >= 80 ? "up" : accuracy >= 65 ? "flat" : "down",
    } satisfies TopicPerformance;
  });

  return {
    id: `result-${session.id}`,
    sessionId: session.id,
    moduleId: session.moduleId,
    score,
    correctCount,
    totalQuestions: session.questionOrder.length,
    incorrectCount,
    unansweredCount,
    completedAt: new Date().toISOString(),
    questionResults,
    missedQuestionIds,
    missedTopics,
    topicPerformance,
  };
}

export function getPassReadinessLabel(score: number) {
  if (score >= 90) {
    return "Exam Ready";
  }
  if (score >= 80) {
    return "Close";
  }
  if (score >= 70) {
    return "Needs Review";
  }
  return "Rebuild Foundation";
}

export function getSuggestedNextAction(result: QuizResult) {
  if (result.score >= 90) {
    return "Switch to Exam Mode and keep pressure-testing mixed sets.";
  }
  if (result.score >= 80) {
    return "Review missed topics, then rerun a 25-question exam set.";
  }
  if (result.score >= 70) {
    return "Use Study Mode on the missed topics before taking another timed set.";
  }
  return "Reset with Weak Area Mode and rebuild your lowest-scoring topics first.";
}

function filterQuestions(questionPool: Question[], filters: QuizEngineFilters, missedQuestions: MissedQuestion[] = [], topicPerformance: TopicPerformanceSeed[] = []) {
  let filteredQuestions = questionPool.filter((question) => {
    const matchesModule = filters.moduleId === "all" || question.moduleId === filters.moduleId;
    const matchesDifficulty = filters.difficulty === "all" || question.difficulty === filters.difficulty;
    const matchesTopic = filters.topic === "all" || question.topic === filters.topic;

    return matchesModule && matchesDifficulty && matchesTopic;
  });

  if (filters.mode === "weak-area") {
    const weakAreaQuestions = getWeakAreaQuestions(filteredQuestions, missedQuestions, topicPerformance);
    if (weakAreaQuestions.length > 0) {
      filteredQuestions = weakAreaQuestions;
    }
  }

  return filteredQuestions;
}

function getWeakAreaQuestions(questionPool: Question[], missedQuestions: MissedQuestion[], topicPerformance: TopicPerformanceSeed[]) {
  const eligibleTopics = new Set(questionPool.map((question) => question.topic));
  const activeMissedQuestions = missedQuestions.filter((question) => question.status !== "mastered");
  const weakTopics = topicPerformance
    .filter((topic) => eligibleTopics.has(topic.topic))
    .slice()
    .sort((left, right) => left.accuracy - right.accuracy)
    .slice(0, 3)
    .map((topic) => topic.topic);

  const missedQuestionIds = new Set(activeMissedQuestions.map((question) => question.questionId));
  const missedPool = questionPool.filter((question) => missedQuestionIds.has(question.id));
  const weakTopicPool = questionPool.filter((question) => weakTopics.includes(question.topic));
  const combined = [...missedPool, ...weakTopicPool];

  return Array.from(new Map(combined.map((question) => [question.id, question])).values());
}

function randomizeQuestions(questionPool: Question[]) {
  const randomized = [...questionPool];
  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [randomized[index], randomized[swapIndex]] = [randomized[swapIndex], randomized[index]];
  }
  return randomized;
}

function selectQuizLength(questionPool: Question[], length: QuizLength) {
  if (length === "all") {
    return questionPool;
  }
  return questionPool.slice(0, Math.min(length, questionPool.length));
}