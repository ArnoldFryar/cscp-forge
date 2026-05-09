import type { MissedQuestion, Question, QuizResult } from "@/data/types";
import type { ActiveRecallSummary } from "@/lib/activeRecallStore";
import type { FinalExamAttempt } from "@/lib/finalExamStore";
import type { ModuleProgressSnapshot, ProgressSnapshot, TopicProgressSnapshot } from "@/lib/progressStore";

export type ReadinessLabel =
  | "Exam Ready"
  | "Close"
  | "Needs Targeted Review"
  | "Rebuild Weak Areas"
  | "Foundation Not Ready";

export type ReadinessFactorId =
  | "overall-accuracy"
  | "hard-question-accuracy"
  | "module-coverage"
  | "missed-question-recovery"
  | "active-recall-confidence"
  | "study-consistency";

export type ReadinessFactor = {
  id: ReadinessFactorId;
  label: string;
  weight: number;
  score: number;
  weightedPoints: number;
  explanation: string;
  evidence: string;
};

export type ReadinessWeakArea = {
  id: string;
  moduleId: string;
  moduleName: string;
  topic: string;
  accuracy: number;
  attempted: number;
  missedCount: number;
  riskScore: number;
  reason: string;
};

export type ModuleReadiness = {
  moduleId: string;
  moduleName: string;
  moduleNumber: number;
  score: number;
  label: ReadinessLabel;
  accuracy: number;
  coverage: number;
  activeMisses: number;
  weakestTopic: string;
  recommendedAction: string;
};

export type TopicRiskArea = ReadinessWeakArea & {
  riskLevel: "High" | "Medium" | "Low";
};

export type ReadinessTrendPoint = {
  id: string;
  label: string;
  score: number;
  quizScore: number;
  hardAccuracy: number | null;
};

export type HardQuestionAccuracy = {
  attempted: number;
  correct: number;
  accuracy: number;
};

export type HardQuestionModuleAccuracy = HardQuestionAccuracy & {
  moduleId: string;
  moduleName: string;
};

export type ReadinessRecommendedAction = {
  label: string;
  detail: string;
  href: string;
};

export type WeakestModulePenalty = {
  points: number;
  moduleName: string | null;
  moduleScore: number;
  explanation: string;
};

export type FinalExamReadinessImpact = {
  attempts: number;
  latestScore: number | null;
  points: number;
  explanation: string;
};

export type ReadinessResult = {
  score: number;
  label: ReadinessLabel;
  weightedScore: number;
  factors: ReadinessFactor[];
  weakestModulePenalty: WeakestModulePenalty;
  finalExamImpact: FinalExamReadinessImpact;
  topWeakAreas: ReadinessWeakArea[];
  recommendedNextAction: ReadinessRecommendedAction;
  moduleReadiness: ModuleReadiness[];
  topicRiskAreas: TopicRiskArea[];
  readinessTrend: ReadinessTrendPoint[];
  hardQuestionAccuracy: HardQuestionAccuracy;
  hardQuestionAccuracyByModule: HardQuestionModuleAccuracy[];
  summary: string;
};

export type ReadinessEngineInput = {
  progress: ProgressSnapshot;
  questions: Question[];
  missedQuestions: MissedQuestion[];
  activeRecallSummary: ActiveRecallSummary;
  finalExamAttempts?: FinalExamAttempt[];
  now?: Date;
};

const factorWeights: Record<ReadinessFactorId, number> = {
  "overall-accuracy": 0.3,
  "hard-question-accuracy": 0.2,
  "module-coverage": 0.15,
  "missed-question-recovery": 0.15,
  "active-recall-confidence": 0.1,
  "study-consistency": 0.1,
};

export function calculateReadiness(input: ReadinessEngineInput): ReadinessResult {
  const questionLookup = new Map(input.questions.map((question) => [question.id, question]));
  const missedQuestions = input.missedQuestions.filter((missedQuestion) => questionLookup.has(missedQuestion.questionId));
  const missedCountsByTopic = buildMissedCountsByTopic(missedQuestions, questionLookup);
  const missedCountsByModule = buildMissedCountsByModule(missedQuestions, questionLookup);
  const hardQuestionAccuracy = calculateHardQuestionAccuracy(input.progress.quizHistory, questionLookup);
  const moduleCoverageScore = calculateModuleCoverageScore(input.progress.moduleStats, input.questions.length);
  const missedRecoveryScore = calculateMissedRecoveryScore(missedQuestions);
  const activeRecallScore = clampScore(input.activeRecallSummary.score);
  const consistencyScore = calculateStudyConsistencyScore(input.progress, input.now ?? new Date());
  const moduleReadiness = buildModuleReadiness(input.progress.moduleStats, input.progress.topicStats, missedCountsByModule);
  const topicRiskAreas = buildTopicRiskAreas(input.progress.topicStats, missedCountsByTopic, questionLookup);
  const topWeakAreas = topicRiskAreas.slice(0, 3);
  const weakestModulePenalty = calculateWeakestModulePenalty(moduleReadiness);
  const finalExamImpact = calculateFinalExamImpact(input.finalExamAttempts ?? []);

  const factors: ReadinessFactor[] = [
    buildFactor(
      "overall-accuracy",
      "Overall quiz accuracy",
      input.progress.averageAccuracy,
      `${input.progress.questionsCorrect} correct from ${input.progress.questionsAnswered} answered questions.`,
      "This is the broadest signal because it reflects performance across completed quizzes.",
    ),
    buildFactor(
      "hard-question-accuracy",
      "Hard-question accuracy",
      hardQuestionAccuracy.attempted === 0 ? 0 : hardQuestionAccuracy.accuracy,
      hardQuestionAccuracy.attempted === 0
        ? "No hard-question attempts have been logged yet."
        : `${hardQuestionAccuracy.correct} correct from ${hardQuestionAccuracy.attempted} hard questions.`,
      "Hard questions are weighted heavily because they expose exam-pressure gaps.",
    ),
    buildFactor(
      "module-coverage",
      "Module coverage",
      moduleCoverageScore,
      `${getCoveredQuestionCount(input.progress.moduleStats)} capped question exposures across ${input.questions.length} available questions.`,
      "Coverage protects against scoring well in a narrow slice of the bank.",
    ),
    buildFactor(
      "missed-question-recovery",
      "Missed-question recovery",
      missedRecoveryScore,
      missedQuestions.length === 0
        ? "No active missed-question queue is currently stored."
        : `${missedQuestions.filter((item) => item.status === "reviewed" || item.status === "mastered").length} of ${missedQuestions.length} missed questions are reviewed or mastered.`,
      "Recovered misses matter because they show whether weak spots are actually closing.",
    ),
    buildFactor(
      "active-recall-confidence",
      "Active recall confidence",
      activeRecallScore,
      input.activeRecallSummary.ratedCount === 0
        ? "No active-recall prompts have been rated yet."
        : `${input.activeRecallSummary.ratedCount} prompts rated with ${input.activeRecallSummary.averageConfidence}/5 average confidence.`,
      "Confidence ratings add a recall signal beyond multiple-choice recognition.",
    ),
    buildFactor(
      "study-consistency",
      "Study consistency",
      consistencyScore,
      `${input.progress.studyDateHistory.length} tracked study day${input.progress.studyDateHistory.length === 1 ? "" : "s"}; current streak ${input.progress.studyStreak} day${input.progress.studyStreak === 1 ? "" : "s"}.`,
      "Recent repetition reduces readiness risk, especially close to exam day.",
    ),
  ];

  const weightedScore = roundScore(factors.reduce((total, factor) => total + factor.weightedPoints, 0));
  const score = clampScore(Math.round(weightedScore - weakestModulePenalty.points + finalExamImpact.points));
  const label = getReadinessLabel(score);
  const recommendedNextAction = getRecommendedNextAction({
    score,
    hardQuestionAccuracy,
    moduleCoverageScore,
    missedRecoveryScore,
    activeRecallScore,
    consistencyScore,
    weakestModule: moduleReadiness[0] ?? null,
    topWeakArea: topWeakAreas[0] ?? null,
    activeMisses: missedQuestions.filter((missedQuestion) => missedQuestion.status !== "mastered").length,
  });

  return {
    score,
    label,
    weightedScore,
    factors,
    weakestModulePenalty,
    finalExamImpact,
    topWeakAreas,
    recommendedNextAction,
    moduleReadiness,
    topicRiskAreas,
    readinessTrend: buildReadinessTrend(input.progress.quizHistory, questionLookup, moduleCoverageScore),
    hardQuestionAccuracy,
    hardQuestionAccuracyByModule: buildHardQuestionAccuracyByModule(input.progress.moduleStats, input.progress.quizHistory, questionLookup),
    summary: buildSummary(score, label, topWeakAreas[0], weakestModulePenalty, finalExamImpact),
  } satisfies ReadinessResult;
}

export function getReadinessLabel(score: number): ReadinessLabel {
  if (score >= 90) {
    return "Exam Ready";
  }
  if (score >= 80) {
    return "Close";
  }
  if (score >= 70) {
    return "Needs Targeted Review";
  }
  if (score >= 60) {
    return "Rebuild Weak Areas";
  }
  return "Foundation Not Ready";
}

function buildFactor(id: ReadinessFactorId, label: string, score: number, evidence: string, explanation: string): ReadinessFactor {
  const normalizedScore = clampScore(score);
  const weight = factorWeights[id];

  return {
    id,
    label,
    weight,
    score: normalizedScore,
    weightedPoints: roundScore(normalizedScore * weight),
    explanation,
    evidence,
  } satisfies ReadinessFactor;
}

function calculateHardQuestionAccuracy(quizHistory: QuizResult[], questionLookup: Map<string, Question>): HardQuestionAccuracy {
  return quizHistory.reduce(
    (stats, quizResult) => {
      quizResult.questionResults.forEach((questionResult) => {
        const question = questionLookup.get(questionResult.questionId);
        if (!question || question.difficulty !== "hard" || questionResult.selectedChoiceId === null) {
          return;
        }

        stats.attempted += 1;
        stats.correct += Number(questionResult.isCorrect);
      });

      stats.accuracy = stats.attempted === 0 ? 0 : Math.round((stats.correct / stats.attempted) * 100);
      return stats;
    },
    { attempted: 0, correct: 0, accuracy: 0 } satisfies HardQuestionAccuracy,
  );
}

function buildHardQuestionAccuracyByModule(
  moduleStats: ModuleProgressSnapshot[],
  quizHistory: QuizResult[],
  questionLookup: Map<string, Question>,
): HardQuestionModuleAccuracy[] {
  const statsByModule = new Map<string, HardQuestionModuleAccuracy>(
    moduleStats.map((module) => [
      module.moduleId,
      {
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        attempted: 0,
        correct: 0,
        accuracy: 0,
      },
    ]),
  );

  quizHistory.forEach((quizResult) => {
    quizResult.questionResults.forEach((questionResult) => {
      const question = questionLookup.get(questionResult.questionId);
      if (!question || question.difficulty !== "hard" || questionResult.selectedChoiceId === null) {
        return;
      }

      const stats = statsByModule.get(question.moduleId);
      if (!stats) {
        return;
      }

      stats.attempted += 1;
      stats.correct += Number(questionResult.isCorrect);
      stats.accuracy = Math.round((stats.correct / stats.attempted) * 100);
    });
  });

  return Array.from(statsByModule.values()).sort((left, right) => {
    if (left.attempted === 0 && right.attempted > 0) {
      return 1;
    }
    if (right.attempted === 0 && left.attempted > 0) {
      return -1;
    }
    return left.accuracy - right.accuracy;
  });
}

function calculateModuleCoverageScore(moduleStats: ModuleProgressSnapshot[], totalQuestions: number) {
  if (totalQuestions === 0) {
    return 0;
  }

  return clampScore(Math.round((getCoveredQuestionCount(moduleStats) / totalQuestions) * 100));
}

function getCoveredQuestionCount(moduleStats: ModuleProgressSnapshot[]) {
  return moduleStats.reduce((total, module) => total + Math.min(module.questionsAnswered, module.totalQuestions), 0);
}

function calculateMissedRecoveryScore(missedQuestions: MissedQuestion[]) {
  if (missedQuestions.length === 0) {
    return 100;
  }

  const statusPoints = missedQuestions.reduce((total, missedQuestion) => {
    if (missedQuestion.status === "mastered") {
      return total + 100;
    }
    if (missedQuestion.status === "reviewed") {
      return total + 75;
    }
    if (missedQuestion.status === "retrying") {
      return total + 35;
    }
    return total;
  }, 0);

  return clampScore(Math.round(statusPoints / missedQuestions.length));
}

function calculateStudyConsistencyScore(progress: ProgressSnapshot, now: Date) {
  const recentStudyDates = progress.studyDateHistory.filter((dateKey) => isWithinDays(dateKey, now, 14));
  const recentCadenceScore = Math.min(70, (recentStudyDates.length / 8) * 70);
  const streakScore = Math.min(30, (progress.studyStreak / 7) * 30);

  return clampScore(Math.round(recentCadenceScore + streakScore));
}

function buildModuleReadiness(
  moduleStats: ModuleProgressSnapshot[],
  topicStats: TopicProgressSnapshot[],
  missedCountsByModule: Map<string, number>,
): ModuleReadiness[] {
  return moduleStats
    .map((module) => {
      const coverage = module.totalQuestions === 0
        ? 0
        : clampScore(Math.round((Math.min(module.questionsAnswered, module.totalQuestions) / module.totalQuestions) * 100));
      const moduleTopics = topicStats.filter((topic) => topic.moduleId === module.moduleId && topic.attempted > 0);
      const weakestTopicAccuracy = moduleTopics.length === 0
        ? module.accuracy
        : Math.min(...moduleTopics.map((topic) => topic.accuracy));
      const activeMisses = missedCountsByModule.get(module.moduleId) ?? 0;
      const score = clampScore(Math.round((module.accuracy * 0.55) + (coverage * 0.35) + (weakestTopicAccuracy * 0.1) - Math.min(8, activeMisses * 1.5)));

      return {
        moduleId: module.moduleId,
        moduleName: module.moduleName,
        moduleNumber: module.moduleNumber,
        score,
        label: getReadinessLabel(score),
        accuracy: module.accuracy,
        coverage,
        activeMisses,
        weakestTopic: module.weakestTopic,
        recommendedAction: getModuleRecommendedAction(module, score, coverage, activeMisses),
      } satisfies ModuleReadiness;
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }
      return left.moduleNumber - right.moduleNumber;
    });
}

function buildTopicRiskAreas(
  topicStats: TopicProgressSnapshot[],
  missedCountsByTopic: Map<string, number>,
  questionLookup: Map<string, Question>,
): TopicRiskArea[] {
  const moduleNamesById = new Map(Array.from(questionLookup.values()).map((question) => [question.moduleId, question.moduleName]));
  const risksById = new Map<string, TopicRiskArea>();

  topicStats.forEach((topic) => {
    if (topic.attempted === 0) {
      return;
    }

    const id = buildTopicKey(topic.moduleId, topic.topic);
    const missedCount = missedCountsByTopic.get(id) ?? 0;
    const riskScore = calculateTopicRiskScore(topic, missedCount);

    risksById.set(id, {
      id,
      moduleId: topic.moduleId,
      moduleName: moduleNamesById.get(topic.moduleId) ?? topic.moduleId,
      topic: topic.topic,
      accuracy: topic.accuracy,
      attempted: topic.attempted,
      missedCount,
      riskScore,
      riskLevel: getTopicRiskLevel(riskScore),
      reason: getTopicRiskReason(topic, missedCount),
    });
  });

  missedCountsByTopic.forEach((missedCount, id) => {
    if (risksById.has(id)) {
      return;
    }

    const [moduleId, topic] = id.split("::");
    risksById.set(id, {
      id,
      moduleId,
      moduleName: moduleNamesById.get(moduleId) ?? moduleId,
      topic,
      accuracy: 0,
      attempted: 0,
      missedCount,
      riskScore: clampScore(70 + Math.min(25, missedCount * 5)),
      riskLevel: "High",
      reason: `${missedCount} active missed question${missedCount === 1 ? "" : "s"} without enough topic accuracy history.`,
    });
  });

  return Array.from(risksById.values()).sort((left, right) => {
    if (left.riskScore !== right.riskScore) {
      return right.riskScore - left.riskScore;
    }
    return left.topic.localeCompare(right.topic);
  });
}

function buildMissedCountsByTopic(missedQuestions: MissedQuestion[], questionLookup: Map<string, Question>) {
  const counts = new Map<string, number>();

  missedQuestions.forEach((missedQuestion) => {
    if (missedQuestion.status === "mastered") {
      return;
    }

    const question = questionLookup.get(missedQuestion.questionId);
    if (!question) {
      return;
    }

    const key = buildTopicKey(question.moduleId, question.topic);
    counts.set(key, (counts.get(key) ?? 0) + missedQuestion.missedCount);
  });

  return counts;
}

function buildMissedCountsByModule(missedQuestions: MissedQuestion[], questionLookup: Map<string, Question>) {
  const counts = new Map<string, number>();

  missedQuestions.forEach((missedQuestion) => {
    if (missedQuestion.status === "mastered") {
      return;
    }

    const question = questionLookup.get(missedQuestion.questionId);
    if (!question) {
      return;
    }

    counts.set(question.moduleId, (counts.get(question.moduleId) ?? 0) + missedQuestion.missedCount);
  });

  return counts;
}

function calculateTopicRiskScore(topic: TopicProgressSnapshot, missedCount: number) {
  const accuracyGap = 100 - topic.accuracy;
  const lowVolumePenalty = topic.attempted < 10 ? 8 : 0;
  const trendPenalty = topic.trend === "down" ? 8 : topic.trend === "flat" ? 3 : 0;
  const missPenalty = Math.min(20, missedCount * 4);

  return clampScore(Math.round(accuracyGap + lowVolumePenalty + trendPenalty + missPenalty));
}

function getTopicRiskLevel(riskScore: number): "High" | "Medium" | "Low" {
  if (riskScore >= 45) {
    return "High";
  }
  if (riskScore >= 25) {
    return "Medium";
  }
  return "Low";
}

function getTopicRiskReason(topic: TopicProgressSnapshot, missedCount: number) {
  const parts = [`${topic.accuracy}% accuracy`];

  if (topic.trend === "down") {
    parts.push("declining trend");
  }
  if (missedCount > 0) {
    parts.push(`${missedCount} active miss${missedCount === 1 ? "" : "es"}`);
  }
  if (topic.attempted < 10) {
    parts.push("low sample size");
  }

  return parts.join("; ");
}

function calculateWeakestModulePenalty(moduleReadiness: ModuleReadiness[]): WeakestModulePenalty {
  const weakestModule = moduleReadiness[0] ?? null;

  if (!weakestModule) {
    return {
      points: 10,
      moduleName: null,
      moduleScore: 0,
      explanation: "No module readiness data is available yet, so the score keeps a conservative penalty.",
    };
  }

  const points = weakestModule.score >= 70 ? 0 : Math.min(12, Math.round((70 - weakestModule.score) * 0.22));

  return {
    points,
    moduleName: weakestModule.moduleName,
    moduleScore: weakestModule.score,
    explanation: points === 0
      ? `${weakestModule.moduleName} is the lowest module, but it is above the penalty threshold.`
      : `${weakestModule.moduleName} is the lowest module at ${weakestModule.score}%, subtracting ${points} readiness point${points === 1 ? "" : "s"}.`,
  } satisfies WeakestModulePenalty;
}

function calculateFinalExamImpact(finalExamAttempts: FinalExamAttempt[]): FinalExamReadinessImpact {
  const sortedAttempts = [...finalExamAttempts].sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
  const latestAttempt = sortedAttempts[0] ?? null;

  if (!latestAttempt) {
    return {
      attempts: 0,
      latestScore: null,
      points: 0,
      explanation: "No final exam attempt has been saved yet, so readiness is based on quiz, recovery, recall, and consistency signals.",
    } satisfies FinalExamReadinessImpact;
  }

  const recentAttempts = sortedAttempts.slice(0, 3);
  const recentAverage = recentAttempts.reduce((total, attempt) => total + attempt.score, 0) / recentAttempts.length;
  const examSignal = Math.round((latestAttempt.score * 0.7) + (recentAverage * 0.3));
  const lengthConfidence = latestAttempt.length === 150 ? 1 : 0.65;
  const rawPoints = Math.round(((examSignal - 78) / 3) * lengthConfidence);
  const points = Math.max(-8, Math.min(8, rawPoints));
  const direction = points > 0 ? "adds" : points < 0 ? "subtracts" : "does not change";

  return {
    attempts: sortedAttempts.length,
    latestScore: latestAttempt.score,
    points,
    explanation: `Latest ${latestAttempt.length}-question final exam score was ${latestAttempt.score}%, which ${direction} ${Math.abs(points)} readiness point${Math.abs(points) === 1 ? "" : "s"}.`,
  } satisfies FinalExamReadinessImpact;
}

function buildReadinessTrend(
  quizHistory: QuizResult[],
  questionLookup: Map<string, Question>,
  moduleCoverageScore: number,
): ReadinessTrendPoint[] {
  let cumulativeAnswered = 0;
  let cumulativeCorrect = 0;
  let cumulativeHardAttempted = 0;
  let cumulativeHardCorrect = 0;

  return [...quizHistory]
    .sort((left, right) => new Date(left.completedAt).getTime() - new Date(right.completedAt).getTime())
    .slice(-8)
    .map((quizResult) => {
      cumulativeAnswered += Math.max(quizResult.totalQuestions - quizResult.unansweredCount, 0);
      cumulativeCorrect += quizResult.correctCount;

      quizResult.questionResults.forEach((questionResult) => {
        const question = questionLookup.get(questionResult.questionId);
        if (!question || question.difficulty !== "hard" || questionResult.selectedChoiceId === null) {
          return;
        }

        cumulativeHardAttempted += 1;
        cumulativeHardCorrect += Number(questionResult.isCorrect);
      });

      const overallAccuracy = cumulativeAnswered === 0 ? 0 : Math.round((cumulativeCorrect / cumulativeAnswered) * 100);
      const hardAccuracy = cumulativeHardAttempted === 0 ? null : Math.round((cumulativeHardCorrect / cumulativeHardAttempted) * 100);
      const hardSignal = hardAccuracy ?? Math.round(overallAccuracy * 0.7);
      const missedTopicPenalty = Math.min(8, quizResult.missedTopics.length * 1.5);
      const score = clampScore(Math.round((overallAccuracy * 0.6) + (hardSignal * 0.25) + (moduleCoverageScore * 0.15) - missedTopicPenalty));

      return {
        id: quizResult.id,
        label: new Date(quizResult.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        score,
        quizScore: quizResult.score,
        hardAccuracy,
      } satisfies ReadinessTrendPoint;
    });
}

function getRecommendedNextAction(input: {
  score: number;
  hardQuestionAccuracy: HardQuestionAccuracy;
  moduleCoverageScore: number;
  missedRecoveryScore: number;
  activeRecallScore: number;
  consistencyScore: number;
  weakestModule: ModuleReadiness | null;
  topWeakArea: ReadinessWeakArea | null;
  activeMisses: number;
}): ReadinessRecommendedAction {
  if (input.hardQuestionAccuracy.attempted < 20) {
    return {
      label: "Build hard-question evidence",
      detail: "Run a focused hard-question set so the readiness score has exam-pressure data.",
      href: input.weakestModule ? `/quiz?moduleId=${input.weakestModule.moduleId}&difficulty=hard&length=25&mode=exam` : "/quiz?difficulty=hard&length=25&mode=exam",
    };
  }

  if (input.hardQuestionAccuracy.accuracy < 70) {
    return {
      label: "Repair hard-question misses",
      detail: "Hard-question accuracy is pulling readiness down; use explanations before retesting.",
      href: input.weakestModule ? `/quiz?moduleId=${input.weakestModule.moduleId}&difficulty=hard&length=25&mode=study` : "/quiz?difficulty=hard&length=25&mode=study",
    };
  }

  if (input.activeMisses > 0 && input.missedRecoveryScore < 75) {
    return {
      label: "Clear the recovery queue",
      detail: "Reviewed and mastered misses are not high enough yet; close old mistakes before adding volume.",
      href: "/missed",
    };
  }

  if (input.moduleCoverageScore < 70) {
    return {
      label: "Increase module coverage",
      detail: "The score needs broader exposure across all eight modules before it can be trusted.",
      href: "/modules",
    };
  }

  if (input.topWeakArea && input.topWeakArea.accuracy < 75) {
    return {
      label: `Target ${input.topWeakArea.topic}`,
      detail: `${input.topWeakArea.moduleName} is showing the clearest topic risk right now.`,
      href: `/quiz?moduleId=${input.topWeakArea.moduleId}&topic=${encodeURIComponent(input.topWeakArea.topic)}&length=10&mode=study`,
    };
  }

  if (input.activeRecallScore < 70) {
    return {
      label: "Raise recall confidence",
      detail: "Active recall is below the level expected for durable exam readiness.",
      href: "/active-recall",
    };
  }

  if (input.consistencyScore < 70) {
    return {
      label: "Rebuild study rhythm",
      detail: "A few short sessions this week will strengthen retention and score confidence.",
      href: "/study-plan",
    };
  }

  return {
    label: input.score >= 90 ? "Take a timed readiness set" : "Pressure-test with exam mode",
    detail: input.score >= 90
      ? "Your signals are strong; protect them with timed mixed practice."
      : "You are close enough that timed mixed practice will reveal the remaining gaps.",
    href: "/quiz?mode=exam&length=50",
  };
}

function getModuleRecommendedAction(module: ModuleProgressSnapshot, score: number, coverage: number, activeMisses: number) {
  if (coverage < 50) {
    return `Add more ${module.moduleName} questions to improve coverage.`;
  }
  if (activeMisses > 0) {
    return `Review active misses in ${module.moduleName}, then retest ${module.weakestTopic}.`;
  }
  if (score < 70) {
    return `Run a focused study set on ${module.weakestTopic}.`;
  }
  if (score < 80) {
    return `Use a hard-question set to pressure-test ${module.moduleName}.`;
  }
  return `Maintain ${module.moduleName} with mixed timed practice.`;
}

function buildSummary(
  score: number,
  label: ReadinessLabel,
  topWeakArea: ReadinessWeakArea | undefined,
  penalty: WeakestModulePenalty,
  finalExamImpact: FinalExamReadinessImpact,
) {
  const weakAreaText = topWeakArea
    ? `The main drag is ${topWeakArea.topic} in ${topWeakArea.moduleName}.`
    : "No topic risk has separated from the pack yet.";
  const penaltyText = penalty.points > 0
    ? ` ${penalty.explanation}`
    : " The weakest-module check is not subtracting points right now.";
  const finalExamText = finalExamImpact.attempts > 0
    ? ` ${finalExamImpact.explanation}`
    : " Final exam attempts are not part of this score yet.";

  return `${score}% is ${label}. ${weakAreaText}${penaltyText}${finalExamText}`;
}

function buildTopicKey(moduleId: string, topic: string) {
  return `${moduleId}::${topic}`;
}

function isWithinDays(dateKey: string, now: Date, dayCount: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const current = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const delta = (current.getTime() - date.getTime()) / 86_400_000;

  return delta >= 0 && delta < dayCount;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}