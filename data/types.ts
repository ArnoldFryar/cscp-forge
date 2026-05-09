export type Difficulty = "easy" | "medium" | "hard";

export type QuestionType = "concept" | "scenario" | "calculation" | "definition" | "process" | "risk" | "strategy";

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
  moduleId: string;
  difficulty: Difficulty;
  questionIds: string[];
  currentQuestionIndex: number;
  startedAt: string;
  answeredChoiceIds: Record<string, string>;
}

export interface QuizResult {
  id: string;
  sessionId: string;
  moduleId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
  questionResults: Array<{
    questionId: string;
    selectedChoiceId: string;
    correctChoiceId: string;
    isCorrect: boolean;
  }>;
}

export interface MissedQuestion {
  id: string;
  questionId: string;
  selectedChoiceId: string;
  missedAt: string;
  reviewCount: number;
  status: "new" | "reviewing" | "mastered";
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