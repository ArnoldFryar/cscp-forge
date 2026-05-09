import type { Difficulty, MissedQuestion, MissedQuestionStatus, Question, QuizLength, QuizMode, QuizResult } from "@/data/types";

const MISSED_QUESTIONS_STORAGE_KEY = "cscp-forge-missed-questions";
const QUIZ_LAUNCH_INTENT_STORAGE_KEY = "cscp-forge-quiz-launch-intent";

export type QuizLaunchIntent = {
  mode: QuizMode;
  moduleId?: string | "all";
  difficulty?: Difficulty | "all";
  topic?: string | "all";
  length?: QuizLength;
};

type MissedQuestionUpsert = {
  questionId: string;
  userSelectedChoiceId: string;
  status?: MissedQuestionStatus;
  missedAt?: string;
};

export function loadMissedQuestions(seedQuestions: MissedQuestion[] = []) {
  if (typeof window === "undefined") {
    return normalizeMissedQuestions(seedQuestions);
  }

  const storedQuestions = readStoredMissedQuestions();
  const mergedQuestions = mergeMissedQuestionLists(seedQuestions, storedQuestions);

  if (storedQuestions.length === 0 || JSON.stringify(storedQuestions) !== JSON.stringify(mergedQuestions)) {
    saveMissedQuestions(mergedQuestions);
  }

  return mergedQuestions;
}

export function saveMissedQuestions(missedQuestions: MissedQuestion[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MISSED_QUESTIONS_STORAGE_KEY, JSON.stringify(normalizeMissedQuestions(missedQuestions)));
}

export function mergeMissedQuestionLists(baseQuestions: MissedQuestion[], overrideQuestions: MissedQuestion[]) {
  const mergedByQuestionId = new Map<string, MissedQuestion>();

  normalizeMissedQuestions(baseQuestions).forEach((missedQuestion) => {
    mergedByQuestionId.set(missedQuestion.questionId, missedQuestion);
  });

  normalizeMissedQuestions(overrideQuestions).forEach((missedQuestion) => {
    mergedByQuestionId.set(missedQuestion.questionId, missedQuestion);
  });

  return Array.from(mergedByQuestionId.values()).sort((left, right) => {
    return new Date(right.lastMissedAt).getTime() - new Date(left.lastMissedAt).getTime();
  });
}

export function upsertMissedQuestion(missedQuestions: MissedQuestion[], payload: MissedQuestionUpsert) {
  const normalizedQuestions = normalizeMissedQuestions(missedQuestions);
  const existingQuestion = normalizedQuestions.find((missedQuestion) => missedQuestion.questionId === payload.questionId);
  const missedAt = payload.missedAt ?? new Date().toISOString();

  if (!existingQuestion) {
    return mergeMissedQuestionLists(normalizedQuestions, [
      {
        questionId: payload.questionId,
        missedCount: 1,
        lastMissedAt: missedAt,
        status: payload.status ?? "new",
        userSelectedChoiceId: payload.userSelectedChoiceId,
      },
    ]);
  }

  return normalizedQuestions
    .map((missedQuestion) => {
      if (missedQuestion.questionId !== payload.questionId) {
        return missedQuestion;
      }

      return {
        ...missedQuestion,
        missedCount: missedQuestion.missedCount + 1,
        lastMissedAt: missedAt,
        status: payload.status ?? getRepeatMissStatus(missedQuestion.status),
        userSelectedChoiceId: payload.userSelectedChoiceId,
      };
    })
    .sort((left, right) => new Date(right.lastMissedAt).getTime() - new Date(left.lastMissedAt).getTime());
}

export function updateMissedQuestionStatus(missedQuestions: MissedQuestion[], questionId: string, status: MissedQuestionStatus): MissedQuestion[] {
  return normalizeMissedQuestions(missedQuestions).map((missedQuestion): MissedQuestion => {
    if (missedQuestion.questionId !== questionId) {
      return missedQuestion;
    }

    return {
      ...missedQuestion,
      status,
    };
  });
}

export function markQuestionsRetrying(missedQuestions: MissedQuestion[], questionIds: string[]): MissedQuestion[] {
  const questionIdSet = new Set(questionIds);

  return normalizeMissedQuestions(missedQuestions).map((missedQuestion): MissedQuestion => {
    if (!questionIdSet.has(missedQuestion.questionId) || missedQuestion.status === "mastered") {
      return missedQuestion;
    }

    return {
      ...missedQuestion,
      status: "retrying",
    };
  });
}

export function syncMissedQuestionsWithQuizResult(
  missedQuestions: MissedQuestion[],
  quizResult: QuizResult,
  mode: QuizMode,
  options?: { recordIncorrectAnswers?: boolean },
) {
  let nextQuestions = normalizeMissedQuestions(missedQuestions);
  const recordIncorrectAnswers = options?.recordIncorrectAnswers ?? true;

  quizResult.questionResults.forEach((questionResult) => {
    const existingQuestion = nextQuestions.find((missedQuestion) => missedQuestion.questionId === questionResult.questionId);

    if (!questionResult.isCorrect && questionResult.selectedChoiceId && recordIncorrectAnswers) {
      nextQuestions = upsertMissedQuestion(nextQuestions, {
        questionId: questionResult.questionId,
        userSelectedChoiceId: questionResult.selectedChoiceId,
        status: existingQuestion ? "retrying" : "new",
        missedAt: quizResult.completedAt,
      });
      return;
    }

    if (questionResult.isCorrect && existingQuestion && mode === "weak-area" && existingQuestion.status !== "mastered") {
      nextQuestions = updateMissedQuestionStatus(nextQuestions, questionResult.questionId, "reviewed");
    }
  });

  return nextQuestions;
}

export function storeQuizLaunchIntent(intent: QuizLaunchIntent) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(QUIZ_LAUNCH_INTENT_STORAGE_KEY, JSON.stringify(intent));
}

export function consumeQuizLaunchIntent() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedIntent = window.localStorage.getItem(QUIZ_LAUNCH_INTENT_STORAGE_KEY);
  if (!storedIntent) {
    return null;
  }

  window.localStorage.removeItem(QUIZ_LAUNCH_INTENT_STORAGE_KEY);

  try {
    return JSON.parse(storedIntent) as QuizLaunchIntent;
  } catch {
    return null;
  }
}

export function resetMissedQuestionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(MISSED_QUESTIONS_STORAGE_KEY);
  window.localStorage.removeItem(QUIZ_LAUNCH_INTENT_STORAGE_KEY);
}

function readStoredMissedQuestions() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedQuestions = window.localStorage.getItem(MISSED_QUESTIONS_STORAGE_KEY);
  if (!storedQuestions) {
    return [];
  }

  try {
    const parsedQuestions = JSON.parse(storedQuestions) as unknown;
    if (!Array.isArray(parsedQuestions)) {
      return [];
    }

    return normalizeMissedQuestions(parsedQuestions);
  } catch {
    return [];
  }
}

function normalizeMissedQuestions(missedQuestions: MissedQuestion[]) {
  return missedQuestions
    .map((missedQuestion) => normalizeMissedQuestion(missedQuestion))
    .filter((missedQuestion): missedQuestion is MissedQuestion => missedQuestion !== null);
}

function normalizeMissedQuestion(missedQuestion: Partial<MissedQuestion>) {
  if (!missedQuestion.questionId || !missedQuestion.userSelectedChoiceId || !missedQuestion.lastMissedAt) {
    return null;
  }

  return {
    questionId: missedQuestion.questionId,
    missedCount: Math.max(missedQuestion.missedCount ?? 1, 1),
    lastMissedAt: missedQuestion.lastMissedAt,
    status: isMissedQuestionStatus(missedQuestion.status) ? missedQuestion.status : "new",
    userSelectedChoiceId: missedQuestion.userSelectedChoiceId,
  } satisfies MissedQuestion;
}

function isMissedQuestionStatus(status: string | undefined): status is MissedQuestionStatus {
  return status === "new" || status === "reviewed" || status === "retrying" || status === "mastered";
}

function getRepeatMissStatus(status: MissedQuestionStatus) {
  if (status === "mastered") {
    return "retrying";
  }

  return status === "new" ? "retrying" : status;
}

export function filterMissedQuestionsForQuestionPool(missedQuestions: MissedQuestion[], questionPool: Question[]) {
  const validQuestionIds = new Set(questionPool.map((question) => question.id));
  return normalizeMissedQuestions(missedQuestions).filter((missedQuestion) => validQuestionIds.has(missedQuestion.questionId));
}