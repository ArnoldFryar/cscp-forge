import type { Difficulty, Question, QuizSession } from "@/data/types";

type QuizSessionOptions = {
  moduleId: string;
  difficulty: Difficulty;
};

export function buildQuizSession(questionPool: Question[], options: QuizSessionOptions) {
  const filteredQuestions = questionPool.filter((question) => {
    return question.moduleId === options.moduleId && question.difficulty === options.difficulty;
  });

  const questions = filteredQuestions.length > 0
    ? filteredQuestions
    : questionPool.filter((question) => question.moduleId === options.moduleId);

  return {
    id: `local-${options.moduleId}-${options.difficulty}`,
    moduleId: options.moduleId,
    difficulty: options.difficulty,
    questionIds: questions.map((question) => question.id),
    currentQuestionIndex: 0,
    startedAt: new Date(0).toISOString(),
    answeredChoiceIds: {},
    questions,
    totalQuestions: questions.length,
  } satisfies QuizSession & { questions: Question[]; totalQuestions: number };
}