import { readFileSync } from "node:fs";
import { generatedQuestions } from "../data/generatedQuestions";
import type { Question } from "../data/types";
import { importQuestionsFromCsv } from "../lib/importQuestions";

const validDifficulties = new Set(["easy", "medium", "hard"]);
const validTypes = new Set(["concept", "scenario", "calculation", "definition", "process", "risk", "strategy"]);
const expectedModules = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"];

const obviousDistractorPatterns = [
  /logo/i,
  /paint color/i,
  /cafeteria/i,
  /coffee/i,
  /calendar preferences/i,
  /office seating/i,
  /font/i,
  /uniform/i,
  /brochures/i,
  /gift list/i,
  /lunch menu/i,
  /expired calendar/i,
  /supplier org chart/i,
  /warehouse paint/i,
  /meeting room/i,
  /page length/i,
  /delete the audit record/i,
  /stop measuring/i,
  /ignore it/i,
  /do nothing/i,
  /random/i,
];

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim().replace(/\s+/g, " ");
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function tokenSet(text: string) {
  return new Set(normalize(text).split(" ").filter(Boolean));
}

function jaccard(first: Set<string>, second: Set<string>) {
  const intersection = [...first].filter((token) => second.has(token)).length;
  const union = new Set([...first, ...second]).size;
  return union === 0 ? 0 : intersection / union;
}

function toTemplate(question: Question) {
  return normalize(
    question.questionText
      .replace(new RegExp(escapeRegExp(question.topic), "gi"), "<topic>")
      .replace(/A team is struggling with .*?\. What response best reflects CSCP thinking\?/i, "A team is struggling with <topic>. What response best reflects CSCP thinking?")
      .replace(/A supply chain leader is reviewing .*?\. What is the best next action\?/i, "A supply chain leader is reviewing <topic>. What is the best next action?")
      .replace(/What is the most important CSCP takeaway about .*?\?/i, "What is the most important CSCP takeaway about <topic>?")
      .replace(/Which statement best describes .*? in a CSCP context\?/i, "Which statement best describes <topic> in a CSCP context?"),
  );
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const questions = generatedQuestions as Question[];
const fieldIssues: Record<string, string[]> = {
  id: [],
  moduleId: [],
  moduleName: [],
  topic: [],
  difficulty: [],
  questionType: [],
  questionText: [],
  choices: [],
  correctAnswer: [],
  explanation: [],
};

const seenIds = new Set<string>();
const duplicateIds: string[] = [];
const duplicateChoiceIds: string[] = [];
const duplicateChoiceText: string[] = [];
const missingWhyWrong: string[] = [];
const formattingIssues: Array<{ id: string; issue: string }> = [];
const weakExplanations: string[] = [];
const vagueQuestions: string[] = [];
const obviousDistractorQuestions = new Set<string>();
const difficultyMismatch: Array<{ id: string; issue: string }> = [];
const exactTextMap = new Map<string, string[]>();
const templateMap = new Map<string, string[]>();
const topicCounts: Record<string, Record<string, number>> = {};

for (const question of questions) {
  const id = question.id || "<missing>";

  if (!question.id?.trim()) {
    fieldIssues.id.push(id);
  } else if (seenIds.has(question.id)) {
    duplicateIds.push(question.id);
  } else {
    seenIds.add(question.id);
  }

  if (!question.moduleId?.trim() || !expectedModules.includes(question.moduleId)) fieldIssues.moduleId.push(id);
  if (!question.moduleName?.trim()) fieldIssues.moduleName.push(id);
  if (!question.topic?.trim()) fieldIssues.topic.push(id);
  if (!validDifficulties.has(question.difficulty)) fieldIssues.difficulty.push(id);
  if (!validTypes.has(question.questionType)) fieldIssues.questionType.push(id);
  if (!question.questionText?.trim()) fieldIssues.questionText.push(id);
  if (!question.explanation?.trim()) fieldIssues.explanation.push(id);

  const choices = question.choices ?? [];
  const choiceIds = choices.map((choice) => choice.id);
  const choiceTexts = choices.map((choice) => choice.text);

  if (choices.length !== 4 || choices.some((choice) => !choice.id?.trim() || !choice.text?.trim())) fieldIssues.choices.push(id);
  if (new Set(choiceIds).size !== choiceIds.length) duplicateChoiceIds.push(id);
  if (!question.correctChoiceId?.trim() || !choiceIds.includes(question.correctChoiceId)) fieldIssues.correctAnswer.push(id);
  if (new Set(choiceTexts.map(normalize)).size !== choiceTexts.length) duplicateChoiceText.push(id);

  const wrongChoiceIds = choiceIds.filter((choiceId) => choiceId !== question.correctChoiceId);
  if (wrongChoiceIds.length !== 3 || wrongChoiceIds.some((choiceId) => !question.whyWrong?.[choiceId]?.trim())) {
    missingWhyWrong.push(id);
  }

  for (const choice of choices) {
    if (choice.text !== choice.text.trim()) formattingIssues.push({ id, issue: "choice has leading/trailing whitespace" });
    if (/^[a-z]/.test(choice.text)) formattingIssues.push({ id, issue: "choice starts lowercase" });
    if (obviousDistractorPatterns.some((pattern) => pattern.test(choice.text))) obviousDistractorQuestions.add(id);
  }

  if (question.questionText !== question.questionText.trim()) formattingIssues.push({ id, issue: "questionText has leading/trailing whitespace" });
  if (question.questionText.trim() && !/[?.]$/.test(question.questionText.trim())) formattingIssues.push({ id, issue: "questionText missing terminal punctuation" });
  if (/^[a-z]/.test(question.examTrap ?? "")) formattingIssues.push({ id, issue: "examTrap starts lowercase" });
  if (/^[a-z]/.test(question.studyTip ?? "")) formattingIssues.push({ id, issue: "studyTip starts lowercase" });

  if (question.explanation.length < 70 || /^The correct answer (defines|starts|addresses|treats|applies|recognizes)/.test(question.explanation)) {
    weakExplanations.push(id);
  }

  if (/^(Which statement best describes|A .* is reviewing .* What is the best next action\?|What is the most important CSCP takeaway about|A team is struggling with .* What response best reflects CSCP thinking\?)/i.test(question.questionText)) {
    vagueQuestions.push(id);
  }

  if (question.difficulty === "hard" && question.questionType === "definition") {
    difficultyMismatch.push({ id, issue: "hard definition item may be overstated" });
  }
  if (question.difficulty === "easy" && question.questionType === "scenario") {
    difficultyMismatch.push({ id, issue: "easy scenario item may be understated" });
  }
  if (question.questionType === "calculation" && !/[0-9]/.test(`${question.questionText} ${choiceTexts.join(" ")}`)) {
    difficultyMismatch.push({ id, issue: "calculation type has no numeric work" });
  }

  const exactKey = normalize(question.questionText);
  exactTextMap.set(exactKey, [...(exactTextMap.get(exactKey) ?? []), id]);

  const templateKey = toTemplate(question);
  templateMap.set(templateKey, [...(templateMap.get(templateKey) ?? []), id]);

  topicCounts[question.moduleId] ??= {};
  topicCounts[question.moduleId][question.topic] = (topicCounts[question.moduleId][question.topic] ?? 0) + 1;
}

const tokenSets = questions.map((question) => ({ question, tokens: tokenSet(question.questionText) }));
const nearDuplicates: Array<{ firstId: string; secondId: string; score: number; firstText: string; secondText: string }> = [];

for (let firstIndex = 0; firstIndex < tokenSets.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < tokenSets.length; secondIndex += 1) {
    const first = tokenSets[firstIndex];
    const second = tokenSets[secondIndex];

    if (first.question.moduleId !== second.question.moduleId) continue;
    if (normalize(first.question.questionText) === normalize(second.question.questionText)) continue;

    const score = jaccard(first.tokens, second.tokens);
    if (score >= 0.82) {
      nearDuplicates.push({
        firstId: first.question.id,
        secondId: second.question.id,
        score: Number(score.toFixed(2)),
        firstText: first.question.questionText,
        secondText: second.question.questionText,
      });
    }
  }
}

const csvText = readFileSync("import-data/questions.csv", "utf8");
const importedCsv = importQuestionsFromCsv(csvText);
const exactDuplicates = [...exactTextMap.entries()]
  .filter(([, ids]) => ids.length > 1)
  .map(([text, ids]) => ({ text, ids }));
const repeatedTemplates = [...templateMap.entries()]
  .filter(([, ids]) => ids.length >= 20)
  .sort((first, second) => second[1].length - first[1].length)
  .map(([template, ids]) => ({ template, count: ids.length, sampleIds: ids.slice(0, 12) }));

console.log(JSON.stringify({
  total: questions.length,
  csvImported: importedCsv.questions.length,
  importErrorCount: importedCsv.errors.length,
  importErrorSamples: importedCsv.errors.slice(0, 10),
  byModule: countBy(questions.map((question) => question.moduleId)),
  byDifficulty: countBy(questions.map((question) => question.difficulty)),
  byQuestionType: countBy(questions.map((question) => question.questionType)),
  fieldIssueCounts: Object.fromEntries(Object.entries(fieldIssues).map(([field, ids]) => [field, ids.length])),
  fieldIssueSamples: Object.fromEntries(Object.entries(fieldIssues).map(([field, ids]) => [field, ids.slice(0, 20)])),
  duplicateIds,
  duplicateChoiceIds,
  duplicateChoiceTextCount: duplicateChoiceText.length,
  duplicateChoiceTextSamples: duplicateChoiceText.slice(0, 20),
  missingWhyWrongCount: missingWhyWrong.length,
  missingWhyWrongSamples: missingWhyWrong.slice(0, 20),
  formattingIssueCount: formattingIssues.length,
  formattingIssueSamples: formattingIssues.slice(0, 40),
  exactDuplicateQuestionTextCount: exactDuplicates.length,
  exactDuplicateQuestionTextSamples: exactDuplicates.slice(0, 10),
  nearDuplicatePairCount: nearDuplicates.length,
  nearDuplicateSamples: nearDuplicates.slice(0, 20),
  repeatedTemplates,
  weakExplanationCount: weakExplanations.length,
  weakExplanationSamples: weakExplanations.slice(0, 40),
  obviousDistractorQuestionCount: obviousDistractorQuestions.size,
  obviousDistractorSamples: [...obviousDistractorQuestions].slice(0, 40),
  vagueQuestionCount: vagueQuestions.length,
  vagueQuestionSamples: vagueQuestions.slice(0, 40),
  difficultyMismatchCount: difficultyMismatch.length,
  difficultyMismatchSamples: difficultyMismatch.slice(0, 40),
  topicCounts,
}, null, 2));
