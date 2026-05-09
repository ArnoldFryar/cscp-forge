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
    completedAt: "2026-05-05",
    questionResults: [
      { questionId: "q011", selectedChoiceId: "q011-b", correctChoiceId: "q011-b", isCorrect: true },
      { questionId: "q012", selectedChoiceId: "q012-a", correctChoiceId: "q012-b", isCorrect: false },
    ],
  },
  {
    id: "result-002",
    sessionId: "session-002",
    moduleId: "m7",
    score: 60,
    correctCount: 6,
    totalQuestions: 10,
    completedAt: "2026-05-06",
    questionResults: [
      { questionId: "q061", selectedChoiceId: "q061-a", correctChoiceId: "q061-b", isCorrect: false },
      { questionId: "q066", selectedChoiceId: "q066-a", correctChoiceId: "q066-a", isCorrect: true },
    ],
  },
  {
    id: "result-003",
    sessionId: "session-003",
    moduleId: "m8",
    score: 80,
    correctCount: 8,
    totalQuestions: 10,
    completedAt: "2026-05-07",
    questionResults: [
      { questionId: "q072", selectedChoiceId: "q072-a", correctChoiceId: "q072-a", isCorrect: true },
      { questionId: "q080", selectedChoiceId: "q080-a", correctChoiceId: "q080-a", isCorrect: true },
    ],
  },
];

export const missedQuestions: MissedQuestion[] = [
  { id: "missed-001", questionId: "q012", selectedChoiceId: "q012-a", missedAt: "2026-05-05", reviewCount: 1, status: "reviewing" },
  { id: "missed-002", questionId: "q061", selectedChoiceId: "q061-a", missedAt: "2026-05-06", reviewCount: 0, status: "new" },
  { id: "missed-003", questionId: "q025", selectedChoiceId: "q025-b", missedAt: "2026-05-03", reviewCount: 2, status: "reviewing" },
  { id: "missed-004", questionId: "q043", selectedChoiceId: "q043-a", missedAt: "2026-05-02", reviewCount: 3, status: "mastered" },
  { id: "missed-005", questionId: "q075", selectedChoiceId: "q075-c", missedAt: "2026-05-01", reviewCount: 1, status: "reviewing" },
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