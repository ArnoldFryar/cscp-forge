export type Difficulty = "easy" | "medium" | "hard";

export type QuestionType = "concept" | "scenario" | "calculation" | "definition" | "process" | "risk" | "strategy";

export type QuizMode = "study" | "exam" | "weak-area";

export type QuizLength = 10 | 25 | 50 | "all";

export type MissedQuestionStatus = "new" | "reviewed" | "retrying" | "mastered";

export interface CSCPModule {
  id: string;
  number: number;
  name: string;
  domain: string;
  description: string;
  examWeight: string;
  progress: number;
  accuracy: number;
  completedQuestions: number;
  totalQuestions: number;
  priority: "low" | "medium" | "high";
}

export interface AnswerChoice {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  moduleId: string;
  moduleName: string;
  topic: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  questionText: string;
  choices: AnswerChoice[];
  correctChoiceId: string;
  explanation: string;
  whyWrong: Record<string, string>;
  examTrap: string;
  studyTip: string;
}

export interface QuizSession {
  id: string;
  moduleId: string | "all";
  difficulty: Difficulty | "all";
  topic: string | "all";
  mode: QuizMode;
  length: QuizLength;
  questionIds: string[];
  currentQuestionIndex: number;
  startedAt: string;
  answeredChoiceIds: Record<string, string>;
  questionOrder: string[];
}

export interface QuizResult {
  id: string;
  sessionId: string;
  moduleId: string | "all";
  score: number;
  correctCount: number;
  totalQuestions: number;
  incorrectCount: number;
  unansweredCount: number;
  completedAt: string;
  questionResults: Array<{
    questionId: string;
    topic: string;
    selectedChoiceId: string | null;
    correctChoiceId: string;
    isCorrect: boolean;
  }>;
  missedQuestionIds: string[];
  missedTopics: string[];
  topicPerformance: TopicPerformance[];
}

export interface MissedQuestion {
  questionId: string;
  missedCount: number;
  lastMissedAt: string;
  status: MissedQuestionStatus;
  userSelectedChoiceId: string;
}

export interface StudyPlanItem {
  id: string;
  day: string;
  moduleId: string;
  focus: string;
  tasks: string[];
  minutes: number;
  status: "planned" | "in-progress" | "complete";
}

export interface TopicPerformance {
  id: string;
  moduleId: string;
  topic: string;
  accuracy: number;
  attempted: number;
  correct: number;
  trend: "up" | "flat" | "down";
}

export interface UserProgress {
  readinessScore: number;
  questionsCompleted: number;
  averageAccuracy: number;
  weakestModuleId: string;
  currentStudyStreak: number;
  weeklyGoalMinutes: number;
  minutesStudiedThisWeek: number;
}