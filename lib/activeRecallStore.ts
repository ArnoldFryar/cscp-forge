import type { Question } from "@/data/types";

const ACTIVE_RECALL_STORAGE_KEY = "cscp-forge-active-recall";

export type ActiveRecallPromptType =
  | "explain-own-words"
  | "compare-concepts"
  | "process-flow"
  | "key-drivers"
  | "formula"
  | "manufacturing-example"
  | "teach-plant-manager"
  | "exam-traps";

export type ActiveRecallPrompt = {
  id: string;
  moduleId: string;
  moduleName: string;
  topic: string;
  promptType: ActiveRecallPromptType;
  promptTypeLabel: string;
  prompt: string;
  modelAnswer: string;
  sourceQuestionId: string;
};

export type ActiveRecallProgress = {
  promptId: string;
  confidence: 1 | 2 | 3 | 4 | 5 | null;
  markedForReview: boolean;
  updatedAt: string | null;
};

export type ActiveRecallProgressStore = Record<string, ActiveRecallProgress>;

export type ActiveRecallSummary = {
  score: number;
  ratedCount: number;
  lowConfidenceCount: number;
  reviewCount: number;
  totalPrompts: number;
  averageConfidence: number;
};

type TopicSeed = {
  topicKey: string;
  moduleId: string;
  moduleName: string;
  topic: string;
  question: Question;
  relatedQuestion: Question | null;
};

const promptTypeLabels: Record<ActiveRecallPromptType, string> = {
  "explain-own-words": "Explain in your own words",
  "compare-concepts": "Compare two concepts",
  "process-flow": "Draw or describe a process flow",
  "key-drivers": "List key drivers",
  formula: "Explain a formula",
  "manufacturing-example": "Give a manufacturing example",
  "teach-plant-manager": "Teach it to a plant manager",
  "exam-traps": "Identify common exam traps",
};

export function generateActiveRecallPrompts(questionPool: Question[]) {
  const topicSeeds = buildTopicSeeds(questionPool);

  return topicSeeds.flatMap((seed, index) => {
    const primaryType = getPrimaryPromptType(seed.question);
    const secondaryType = getSecondaryPromptType(seed.question, index, primaryType);

    return [
      buildPrompt(seed, primaryType),
      buildPrompt(seed, secondaryType),
    ];
  });
}

export function loadActiveRecallProgress() {
  if (typeof window === "undefined") {
    return {} satisfies ActiveRecallProgressStore;
  }

  const storedProgress = window.localStorage.getItem(ACTIVE_RECALL_STORAGE_KEY);
  if (!storedProgress) {
    return {} satisfies ActiveRecallProgressStore;
  }

  try {
    const parsedProgress = JSON.parse(storedProgress) as Record<string, Partial<ActiveRecallProgress>>;
    return normalizeProgressStore(parsedProgress);
  } catch {
    return {} satisfies ActiveRecallProgressStore;
  }
}

export function saveActiveRecallProgress(progress: ActiveRecallProgressStore) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVE_RECALL_STORAGE_KEY, JSON.stringify(normalizeProgressStore(progress)));
}

export function resetActiveRecallProgress() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_RECALL_STORAGE_KEY);
}

export function updateActiveRecallConfidence(
  progress: ActiveRecallProgressStore,
  promptId: string,
  confidence: 1 | 2 | 3 | 4 | 5,
) {
  return {
    ...progress,
    [promptId]: {
      ...getPromptProgress(progress, promptId),
      promptId,
      confidence,
      updatedAt: new Date().toISOString(),
    },
  } satisfies ActiveRecallProgressStore;
}

export function toggleActiveRecallReview(progress: ActiveRecallProgressStore, promptId: string) {
  const currentProgress = getPromptProgress(progress, promptId);

  return {
    ...progress,
    [promptId]: {
      ...currentProgress,
      promptId,
      markedForReview: !currentProgress.markedForReview,
      updatedAt: new Date().toISOString(),
    },
  } satisfies ActiveRecallProgressStore;
}

export function getPromptProgress(progress: ActiveRecallProgressStore, promptId: string): ActiveRecallProgress {
  const promptProgress = progress[promptId];

  if (!promptProgress) {
    return {
      promptId,
      confidence: null,
      markedForReview: false,
      updatedAt: null,
    } satisfies ActiveRecallProgress;
  }

  return normalizeProgressEntry(promptId, promptProgress) ?? {
    promptId,
    confidence: null,
    markedForReview: false,
    updatedAt: null,
  };
}

export function calculateActiveRecallSummary(prompts: ActiveRecallPrompt[], progress: ActiveRecallProgressStore): ActiveRecallSummary {
  const ratedPrompts = prompts
    .map((prompt) => getPromptProgress(progress, prompt.id))
    .filter((promptProgress) => promptProgress.confidence !== null);

  const reviewCount = prompts.filter((prompt) => getPromptProgress(progress, prompt.id).markedForReview).length;
  const lowConfidenceCount = prompts.filter((prompt) => {
    const confidence = getPromptProgress(progress, prompt.id).confidence;
    return confidence !== null && confidence <= 2;
  }).length;
  const ratedCount = ratedPrompts.length;
  const averageConfidence = ratedCount === 0
    ? 0
    : ratedPrompts.reduce((total, prompt) => total + (prompt.confidence ?? 0), 0) / ratedCount;

  return {
    score: ratedCount === 0 ? 0 : Math.round((averageConfidence / 5) * 100),
    ratedCount,
    lowConfidenceCount,
    reviewCount,
    totalPrompts: prompts.length,
    averageConfidence: Number(averageConfidence.toFixed(1)),
  } satisfies ActiveRecallSummary;
}

function buildTopicSeeds(questionPool: Question[]) {
  const topicMap = new Map<string, Question>();
  const moduleTopics = new Map<string, Question[]>();

  questionPool.forEach((question) => {
    const topicKey = `${question.moduleId}::${question.topic}`;
    if (!topicMap.has(topicKey)) {
      topicMap.set(topicKey, question);
    }

    const questionsForModule = moduleTopics.get(question.moduleId) ?? [];
    if (!questionsForModule.some((existingQuestion) => existingQuestion.topic === question.topic)) {
      moduleTopics.set(question.moduleId, [...questionsForModule, question]);
    }
  });

  return Array.from(topicMap.entries()).map(([topicKey, question]) => {
    const questionsForModule = moduleTopics.get(question.moduleId) ?? [question];
    const questionIndex = questionsForModule.findIndex((candidate) => candidate.topic === question.topic);
    const relatedQuestion = questionsForModule.length > 1
      ? questionsForModule[(questionIndex + 1) % questionsForModule.length]
      : null;

    return {
      topicKey,
      moduleId: question.moduleId,
      moduleName: question.moduleName,
      topic: question.topic,
      question,
      relatedQuestion,
    } satisfies TopicSeed;
  });
}

function getPrimaryPromptType(question: Question): ActiveRecallPromptType {
  if (question.questionType === "calculation") {
    return "formula";
  }
  if (question.questionType === "process") {
    return "process-flow";
  }
  if (question.questionType === "scenario") {
    return "manufacturing-example";
  }
  if (question.questionType === "risk") {
    return "exam-traps";
  }
  if (question.questionType === "strategy") {
    return "key-drivers";
  }
  return "explain-own-words";
}

function getSecondaryPromptType(question: Question, index: number, primaryType: ActiveRecallPromptType): ActiveRecallPromptType {
  const candidateTypes: ActiveRecallPromptType[] = [
    "compare-concepts",
    "teach-plant-manager",
    "key-drivers",
    "manufacturing-example",
    "exam-traps",
    "explain-own-words",
    "process-flow",
    "formula",
  ];

  for (let offset = 0; offset < candidateTypes.length; offset += 1) {
    const candidateType = candidateTypes[(index + offset) % candidateTypes.length];
    if (candidateType === primaryType) {
      continue;
    }
    if (candidateType === "formula" && question.questionType !== "calculation") {
      continue;
    }
    return candidateType;
  }

  return "teach-plant-manager";
}

function buildPrompt(seed: TopicSeed, promptType: ActiveRecallPromptType): ActiveRecallPrompt {
  const correctChoiceText = seed.question.choices.find((choice) => choice.id === seed.question.correctChoiceId)?.text ?? "the correct decision";
  const relatedTopic = seed.relatedQuestion?.topic ?? "a related CSCP concept";
  const relatedExplanation = seed.relatedQuestion?.explanation ?? "A related concept changes the decision when the tradeoff or flow is different.";

  const prompt = getPromptText(seed, promptType, relatedTopic);
  const modelAnswer = getModelAnswer(seed, promptType, correctChoiceText, relatedTopic, relatedExplanation);

  return {
    id: `${seed.topicKey}::${promptType}`,
    moduleId: seed.moduleId,
    moduleName: seed.moduleName,
    topic: seed.topic,
    promptType,
    promptTypeLabel: promptTypeLabels[promptType],
    prompt,
    modelAnswer,
    sourceQuestionId: seed.question.id,
  } satisfies ActiveRecallPrompt;
}

function getPromptText(seed: TopicSeed, promptType: ActiveRecallPromptType, relatedTopic: string) {
  if (promptType === "explain-own-words") {
    return `Explain ${seed.topic} in your own words. What problem does it solve, and why does it matter in a CSCP decision?`;
  }
  if (promptType === "compare-concepts") {
    return `Compare ${seed.topic} with ${relatedTopic}. When would a supply chain leader emphasize one over the other?`;
  }
  if (promptType === "process-flow") {
    return `Draw or describe the process flow for ${seed.topic} from the first signal to the decision and operational outcome.`;
  }
  if (promptType === "key-drivers") {
    return `List the key drivers behind ${seed.topic}. Which levers or tradeoffs would you watch first?`;
  }
  if (promptType === "formula") {
    return `Explain the formula or metric logic behind ${seed.topic}. What are the inputs, and how does each input change the result?`;
  }
  if (promptType === "manufacturing-example") {
    return `Give a manufacturing example where ${seed.topic} changes a plant, planning, sourcing, or logistics decision.`;
  }
  if (promptType === "teach-plant-manager") {
    return `Teach ${seed.topic} to a plant manager in under 60 seconds. What should they remember and act on?`;
  }
  return `Identify the common exam traps around ${seed.topic}. What wrong answer pattern is the exam trying to lure you into?`;
}

function getModelAnswer(
  seed: TopicSeed,
  promptType: ActiveRecallPromptType,
  correctChoiceText: string,
  relatedTopic: string,
  relatedExplanation: string,
) {
  const explanation = seed.question.explanation;
  const examTrap = seed.question.examTrap;
  const studyTip = seed.question.studyTip;

  if (promptType === "explain-own-words") {
    return `Core idea: ${explanation} In plain language, the better answer is usually "${correctChoiceText}" because it reflects the real ${seed.topic.toLowerCase()} decision instead of a surface detail. ${studyTip}`;
  }
  if (promptType === "compare-concepts") {
    return `A strong comparison starts with ${seed.topic}: ${explanation} Then contrast it with ${relatedTopic}: ${relatedExplanation} Explain which tradeoff, timing, or decision trigger makes one concept more important than the other.`;
  }
  if (promptType === "process-flow") {
    return `A complete process answer should name the trigger, the decision point, and the operational result. For ${seed.topic}, start with the situation in the question, explain the key step with "${correctChoiceText}", and end with the service, cost, or risk effect. ${studyTip}`;
  }
  if (promptType === "key-drivers") {
    return `Key drivers include the demand, supply, cost, service, or risk factors described here: ${explanation} The best answer, "${correctChoiceText}", works because it addresses those drivers directly instead of chasing a symptom.`;
  }
  if (promptType === "formula") {
    return seed.question.questionType === "calculation"
      ? `Formula logic: ${explanation} State the variables, numerator, denominator, and units clearly, then explain how a change in each input moves the result. Common trap: ${examTrap}`
      : `Even when a formula is not explicit, explain the metric logic behind ${seed.topic}: ${explanation} Show what variable matters most and why "${correctChoiceText}" fits that logic.`;
  }
  if (promptType === "manufacturing-example") {
    return `Manufacturing example: translate the question into a plant or network decision. ${explanation} In practice, a team would choose "${correctChoiceText}" when the same service, cost, capacity, or continuity tradeoff appears on the shop floor or in operations planning. ${studyTip}`;
  }
  if (promptType === "teach-plant-manager") {
    return `Teach it fast: start with the decision that matters, then the tradeoff, then the action. ${explanation} Close with one line the plant manager can act on immediately: ${studyTip}`;
  }
  return `Common traps: ${examTrap} The exam often offers answers that sound efficient or familiar but miss the real issue. In this topic, "${correctChoiceText}" is stronger because ${explanation.toLowerCase()}`;
}

function normalizeProgressStore(progress: Record<string, Partial<ActiveRecallProgress>>) {
  return Object.fromEntries(
    Object.entries(progress)
      .map(([promptId, promptProgress]) => [promptId, normalizeProgressEntry(promptId, promptProgress)])
      .filter((entry): entry is [string, ActiveRecallProgress] => entry[1] !== null),
  ) satisfies ActiveRecallProgressStore;
}

function normalizeProgressEntry(promptId: string, promptProgress: Partial<ActiveRecallProgress>) {
  const confidence = normalizeConfidence(promptProgress.confidence);

  return {
    promptId,
    confidence,
    markedForReview: Boolean(promptProgress.markedForReview),
    updatedAt: typeof promptProgress.updatedAt === "string" ? promptProgress.updatedAt : null,
  } satisfies ActiveRecallProgress;
}

function normalizeConfidence(value: number | null | undefined): ActiveRecallProgress["confidence"] {
  if (value == null) {
    return null;
  }

  return value >= 1 && value <= 5 ? (value as ActiveRecallProgress["confidence"]) : null;
}