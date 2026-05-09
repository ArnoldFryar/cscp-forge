import type { MissedQuestion, QuizResult, TopicPerformance, UserProgress } from "./types";

export const userProgress: UserProgress = {
  readinessScore: 76,
  questionsCompleted: 462,
  averageAccuracy: 75,
  weakestModuleId: "m7",
  currentStudyStreak: 9,
  weeklyGoalMinutes: 360,
  minutesStudiedThisWeek: 235,
};

export const quizResults: QuizResult[] = [
  {
    id: "result-001",
    sessionId: "session-001",
    moduleId: "m2",
    score: 70,
    correctCount: 7,
    totalQuestions: 10,
    incorrectCount: 3,
    unansweredCount: 0,
    completedAt: "2026-05-05",
    questionResults: [
      { questionId: "q011", topic: "S&OP purpose", selectedChoiceId: "q011-b", correctChoiceId: "q011-b", isCorrect: true },
      { questionId: "q012", topic: "Forecast bias", selectedChoiceId: "q012-a", correctChoiceId: "q012-b", isCorrect: false },
    ],
    missedQuestionIds: ["q012"],
    missedTopics: ["Forecast bias"],
    topicPerformance: [
      { id: "topic-result-001", moduleId: "m2", topic: "S&OP purpose", accuracy: 100, attempted: 1, correct: 1, trend: "up" },
      { id: "topic-result-002", moduleId: "m2", topic: "Forecast bias", accuracy: 0, attempted: 1, correct: 0, trend: "down" },
    ],
  },
  {
    id: "result-002",
    sessionId: "session-002",
    moduleId: "m7",
    score: 60,
    correctCount: 6,
    totalQuestions: 10,
    incorrectCount: 4,
    unansweredCount: 0,
    completedAt: "2026-05-06",
    questionResults: [
      { questionId: "q061", topic: "Risk governance", selectedChoiceId: "q061-a", correctChoiceId: "q061-b", isCorrect: false },
      { questionId: "q066", topic: "Risk response", selectedChoiceId: "q066-a", correctChoiceId: "q066-a", isCorrect: true },
    ],
    missedQuestionIds: ["q061"],
    missedTopics: ["Risk governance"],
    topicPerformance: [
      { id: "topic-result-003", moduleId: "m7", topic: "Risk governance", accuracy: 0, attempted: 1, correct: 0, trend: "down" },
      { id: "topic-result-004", moduleId: "m7", topic: "Risk response", accuracy: 100, attempted: 1, correct: 1, trend: "up" },
    ],
  },
  {
    id: "result-003",
    sessionId: "session-003",
    moduleId: "m8",
    score: 80,
    correctCount: 8,
    totalQuestions: 10,
    incorrectCount: 2,
    unansweredCount: 0,
    completedAt: "2026-05-07",
    questionResults: [
      { questionId: "q072", topic: "Metric design", selectedChoiceId: "q072-a", correctChoiceId: "q072-a", isCorrect: true },
      { questionId: "q076", topic: "Automation fit", selectedChoiceId: "q076-b", correctChoiceId: "q076-a", isCorrect: false },
      { questionId: "q079", topic: "Process improvement", selectedChoiceId: "q079-b", correctChoiceId: "q079-a", isCorrect: false },
      { questionId: "q080", topic: "Decision support", selectedChoiceId: "q080-a", correctChoiceId: "q080-a", isCorrect: true },
    ],
    missedQuestionIds: ["q076", "q079"],
    missedTopics: ["Automation fit", "Process improvement"],
    topicPerformance: [
      { id: "topic-result-005", moduleId: "m8", topic: "Metric design", accuracy: 100, attempted: 1, correct: 1, trend: "up" },
      { id: "topic-result-006", moduleId: "m8", topic: "Automation fit", accuracy: 0, attempted: 1, correct: 0, trend: "down" },
      { id: "topic-result-007", moduleId: "m8", topic: "Process improvement", accuracy: 0, attempted: 1, correct: 0, trend: "down" },
      { id: "topic-result-008", moduleId: "m8", topic: "Decision support", accuracy: 100, attempted: 1, correct: 1, trend: "up" },
    ],
  },
];

export const missedQuestions: MissedQuestion[] = [
  { questionId: "q012", missedCount: 2, lastMissedAt: "2026-05-05", status: "reviewed", userSelectedChoiceId: "q012-a" },
  { questionId: "q061", missedCount: 1, lastMissedAt: "2026-05-06", status: "new", userSelectedChoiceId: "q061-a" },
  { questionId: "q025", missedCount: 3, lastMissedAt: "2026-05-03", status: "retrying", userSelectedChoiceId: "q025-b" },
  { questionId: "q043", missedCount: 4, lastMissedAt: "2026-05-02", status: "mastered", userSelectedChoiceId: "q043-a" },
  { questionId: "q075", missedCount: 2, lastMissedAt: "2026-05-01", status: "reviewed", userSelectedChoiceId: "q075-c" },
];

export const topicPerformance: TopicPerformance[] = [
  { id: "topic-001", moduleId: "m1", topic: "Strategic alignment", accuracy: 82, attempted: 34, correct: 28, trend: "up" },
  { id: "topic-002", moduleId: "m2", topic: "Forecast bias", accuracy: 68, attempted: 31, correct: 21, trend: "down" },
  { id: "topic-003", moduleId: "m3", topic: "Network optimization", accuracy: 69, attempted: 26, correct: 18, trend: "flat" },
  { id: "topic-004", moduleId: "m4", topic: "Total cost of ownership", accuracy: 79, attempted: 29, correct: 23, trend: "up" },
  { id: "topic-005", moduleId: "m5", topic: "Constraint management", accuracy: 71, attempted: 35, correct: 25, trend: "flat" },
  { id: "topic-006", moduleId: "m6", topic: "Transportation mode selection", accuracy: 86, attempted: 28, correct: 24, trend: "up" },
  { id: "topic-007", moduleId: "m7", topic: "Continuity planning", accuracy: 63, attempted: 30, correct: 19, trend: "down" },
  { id: "topic-008", moduleId: "m8", topic: "Data governance", accuracy: 76, attempted: 25, correct: 19, trend: "up" },
];