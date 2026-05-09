import { getModuleName } from "../data/modules";
import type { Difficulty, Question, QuestionType } from "../data/types";

type CanonicalColumnName =
  | "id"
  | "module_id"
  | "module_name"
  | "topic"
  | "difficulty"
  | "question_type"
  | "question_text"
  | "option_a"
  | "option_b"
  | "option_c"
  | "option_d"
  | "correct_answer"
  | "answer_text"
  | "explanation"
  | "wrong_answer_notes"
  | "exam_trap"
  | "study_tip";

type CanonicalCsvRow = Record<CanonicalColumnName, string>;

export type ImportQuestionErrorCode =
  | "missing-question-text"
  | "missing-correct-answer"
  | "invalid-difficulty"
  | "duplicate-question-id"
  | "missing-module-id"
  | "missing-answer-choices"
  | "missing-question-id"
  | "invalid-question-type";

export type ImportQuestionError = {
  rowNumber: number;
  code: ImportQuestionErrorCode;
  field: string;
  message: string;
  questionId?: string;
};

export type ImportQuestionsResult = {
  questions: Question[];
  errors: ImportQuestionError[];
};

const canonicalColumns: Record<CanonicalColumnName, string[]> = {
  id: ["id"],
  module_id: ["module_id", "module", "moduleid"],
  module_name: ["module_name", "module_name_text", "module_title", "modulename"],
  topic: ["topic"],
  difficulty: ["difficulty"],
  question_type: ["question_type", "type", "questiontype"],
  question_text: ["question_text", "question", "questiontext"],
  option_a: ["option_a", "a", "choice_a", "answer_a"],
  option_b: ["option_b", "b", "choice_b", "answer_b"],
  option_c: ["option_c", "c", "choice_c", "answer_c"],
  option_d: ["option_d", "d", "choice_d", "answer_d"],
  correct_answer: ["correct_answer", "answer", "correctanswer"],
  answer_text: ["answer_text", "correct_answer_text", "answertext"],
  explanation: ["explanation"],
  wrong_answer_notes: ["wrong_answer_notes", "wrong_answer_note", "wrong_notes", "whynotes"],
  exam_trap: ["exam_trap", "examtrap", "trap_note", "trap"],
  study_tip: ["study_tip", "studytip", "memory_tip", "tip"],
};

const questionTypeMap: Record<string, QuestionType> = {
  concept: "concept",
  scenario: "scenario",
  calculation: "calculation",
  definition: "definition",
  process: "process",
  risk: "risk",
  strategy: "strategy",
  "best_action": "process",
  "best action": "process",
  metric: "calculation",
  trap: "risk",
  "exam trap": "risk",
};

const difficultyMap: Record<string, Difficulty> = {
  easy: "easy",
  foundation: "easy",
  foundational: "easy",
  basic: "easy",
  medium: "medium",
  applied: "medium",
  intermediate: "medium",
  hard: "hard",
  advanced: "hard",
  challenging: "hard",
  scenario: "hard",
  trap: "hard",
  "exam trap": "hard",
};

export function importQuestionsFromCsv(csvText: string): ImportQuestionsResult {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { questions: [], errors: [] };
  }

  const headerIndexes = mapHeaders(rows[0]);
  const errors: ImportQuestionError[] = [];
  const questions: Question[] = [];
  const seenQuestionIds = new Set<string>();

  rows.slice(1).forEach((row, index) => {
    if (row.every((cell) => cell.trim().length === 0)) {
      return;
    }

    const rowNumber = index + 2;
    const csvRow = buildCanonicalRow(row, headerIndexes);
    const rawQuestionId = csvRow.id.trim();

    if (!rawQuestionId) {
      errors.push({
        rowNumber,
        code: "missing-question-id",
        field: "id",
        message: "Question row is missing an id.",
      });
      return;
    }

    if (seenQuestionIds.has(rawQuestionId)) {
      errors.push({
        rowNumber,
        code: "duplicate-question-id",
        field: "id",
        questionId: rawQuestionId,
        message: `Duplicate question id \"${rawQuestionId}\" found in CSV.`,
      });
      return;
    }

    const moduleId = normalizeModuleId(csvRow.module_id);
    if (!moduleId) {
      errors.push({
        rowNumber,
        code: "missing-module-id",
        field: "module_id",
        questionId: rawQuestionId,
        message: `Question \"${rawQuestionId}\" is missing a module id.`,
      });
      return;
    }

    const questionText = csvRow.question_text.trim();
    if (!questionText) {
      errors.push({
        rowNumber,
        code: "missing-question-text",
        field: "question_text",
        questionId: rawQuestionId,
        message: `Question \"${rawQuestionId}\" is missing question text.`,
      });
      return;
    }

    const difficulty = normalizeDifficulty(csvRow.difficulty);
    if (!difficulty) {
      errors.push({
        rowNumber,
        code: "invalid-difficulty",
        field: "difficulty",
        questionId: rawQuestionId,
        message: `Question \"${rawQuestionId}\" has invalid difficulty \"${csvRow.difficulty}\".`,
      });
      return;
    }

    const questionType = normalizeQuestionType(csvRow.question_type);
    if (!questionType) {
      errors.push({
        rowNumber,
        code: "invalid-question-type",
        field: "question_type",
        questionId: rawQuestionId,
        message: `Question \"${rawQuestionId}\" has unsupported question type \"${csvRow.question_type}\".`,
      });
      return;
    }

    const optionTexts = [csvRow.option_a, csvRow.option_b, csvRow.option_c, csvRow.option_d].map((option) => option.trim());
    if (optionTexts.some((option) => option.length === 0)) {
      errors.push({
        rowNumber,
        code: "missing-answer-choices",
        field: "option_a|option_b|option_c|option_d",
        questionId: rawQuestionId,
        message: `Question \"${rawQuestionId}\" is missing one or more answer choices.`,
      });
      return;
    }

    const correctAnswerIndex = normalizeCorrectAnswer(csvRow.correct_answer, csvRow.answer_text, optionTexts);
    if (correctAnswerIndex === null) {
      errors.push({
        rowNumber,
        code: "missing-correct-answer",
        field: "correct_answer",
        questionId: rawQuestionId,
        message: `Question \"${rawQuestionId}\" is missing a valid correct answer.`,
      });
      return;
    }

    const question = buildQuestion({
      row: csvRow,
      moduleId,
      questionId: rawQuestionId,
      questionText,
      difficulty,
      questionType,
      optionTexts: optionTexts as [string, string, string, string],
      correctAnswerIndex,
    });

    seenQuestionIds.add(rawQuestionId);
    questions.push(question);
  });

  return {
    questions,
    errors,
  };
}

export function buildGeneratedQuestionsModule(questions: Question[], sourceLabel = "import-data/questions.csv") {
  return [
    'import type { Question } from "./types";',
    "",
    `// Generated by npm run import:questions from ${sourceLabel}`,
    "// Place your original CSCP-style CSV in cscp-study-app/import-data/questions.csv, or pass a custom --input path to the import script.",
    "// The app automatically falls back to the mock bank in data/questions.ts when this generated array is empty.",
    `export const generatedQuestions: Question[] = ${JSON.stringify(questions, null, 2)};`,
    "",
  ].join("\n");
}

export function buildQuestionsJson(questions: Question[]) {
  return `${JSON.stringify(questions, null, 2)}\n`;
}

function buildQuestion(input: {
  row: CanonicalCsvRow;
  moduleId: string;
  questionId: string;
  questionText: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  optionTexts: [string, string, string, string];
  correctAnswerIndex: number;
}) {
  const moduleName = getCanonicalModuleName(input.moduleId, input.row.module_name);
  const topic = input.row.topic.trim() || "General CSCP concept";
  const choices = input.optionTexts.map((text, index) => ({
    id: `${input.questionId}-${String.fromCharCode(97 + index)}`,
    text,
  }));
  const correctChoiceId = choices[input.correctAnswerIndex].id;
  const explanationParts = deriveExplanationParts(input.row.explanation, input.row.study_tip, input.row.exam_trap, topic);
  const whyWrong = buildWrongAnswerNotes(input.row.wrong_answer_notes, topic, choices.map((choice) => choice.id), correctChoiceId);

  return {
    id: input.questionId,
    moduleId: input.moduleId,
    moduleName,
    topic,
    difficulty: input.difficulty,
    questionType: input.questionType,
    questionText: input.questionText,
    choices,
    correctChoiceId,
    explanation: explanationParts.explanation,
    whyWrong,
    examTrap: explanationParts.examTrap,
    studyTip: explanationParts.studyTip,
  } satisfies Question;
}

function buildWrongAnswerNotes(
  rawNotes: string,
  topic: string,
  choiceIds: string[],
  correctChoiceId: string,
) {
  const parsedNotes = parseWrongAnswerNotes(rawNotes);
  const optionKeys = ["a", "b", "c", "d"];

  return Object.fromEntries(
    choiceIds
      .filter((choiceId) => choiceId !== correctChoiceId)
      .map((choiceId) => {
        const optionKey = optionKeys[choiceIds.indexOf(choiceId)] ?? "a";
        return [
          choiceId,
          parsedNotes[optionKey] ?? `This choice does not address the core ${topic.toLowerCase()} principle tested by the question.`,
        ];
      }),
  );
}

function parseWrongAnswerNotes(rawNotes: string) {
  const notes = rawNotes.trim();
  if (!notes) {
    return {} as Record<string, string>;
  }

  try {
    const parsed = JSON.parse(notes) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key.trim().toLowerCase().replace("option_", "").replace("choice_", ""), value.trim()]),
    );
  } catch {
    const matches = Array.from(notes.matchAll(/(?:^|\|\||\n|;)\s*([ABCD])\s*[:=-]\s*(.+?)(?=(?:\|\||\n|;|$))/gi));
    if (matches.length > 0) {
      return Object.fromEntries(matches.map((match) => [match[1].toLowerCase(), match[2].trim()]));
    }

    return {
      a: notes,
      b: notes,
      c: notes,
      d: notes,
    } satisfies Record<string, string>;
  }
}

function deriveExplanationParts(rawExplanation: string, rawStudyTip: string, rawExamTrap: string, topic: string) {
  const explanationText = rawExplanation.trim();
  const studyTip = rawStudyTip.trim() || extractStudyTip(explanationText) || `Study the decision logic behind ${topic.toLowerCase()} and connect it to service, cost, and risk tradeoffs.`;
  const examTrap = rawExamTrap.trim() || extractExamTrap(explanationText) || `Do not pick the answer that sounds busy or familiar but misses the actual ${topic.toLowerCase()} decision.`;

  const mainExplanation = explanationText
    .replace(/\s*For .*?remember:\s*.*$/i, "")
    .replace(/\s*Remember:\s*.*$/i, "")
    .replace(/\s*Watch for the trap of\s*.*$/i, "")
    .trim();

  return {
    explanation: mainExplanation || explanationText || `Review why the correct answer best addresses ${topic.toLowerCase()}.`,
    studyTip,
    examTrap,
  };
}

function extractStudyTip(explanationText: string) {
  const rememberMatch = explanationText.match(/remember:\s*(.*?)(?:watch for the trap of|$)/i);
  return rememberMatch?.[1]?.trim().replace(/[.\s]+$/, "") + (rememberMatch ? "." : "") || "";
}

function extractExamTrap(explanationText: string) {
  const trapMatch = explanationText.match(/watch for the trap of\s*(.*)$/i);
  return trapMatch?.[1]?.trim().replace(/[.\s]+$/, "") + (trapMatch ? "." : "") || "";
}

function buildCanonicalRow(row: string[], headerIndexes: Map<CanonicalColumnName, number>) {
  return Object.fromEntries(
    (Object.keys(canonicalColumns) as CanonicalColumnName[]).map((columnName) => [columnName, getCell(row, headerIndexes.get(columnName))]),
  ) as CanonicalCsvRow;
}

function mapHeaders(headerRow: string[]) {
  const normalizedHeaderRow = headerRow.map((header) => normalizeHeaderName(header));
  const headerIndexes = new Map<CanonicalColumnName, number>();

  (Object.entries(canonicalColumns) as Array<[CanonicalColumnName, string[]]>).forEach(([columnName, aliases]) => {
    const matchIndex = normalizedHeaderRow.findIndex((header) => aliases.includes(header));
    if (matchIndex !== -1) {
      headerIndexes.set(columnName, matchIndex);
    }
  });

  return headerIndexes;
}

function getCell(row: string[], index: number | undefined) {
  if (index == null) {
    return "";
  }

  return row[index]?.trim() ?? "";
}

function normalizeHeaderName(header: string) {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeModuleId(rawModuleId: string) {
  const trimmedModuleId = rawModuleId.trim();
  if (!trimmedModuleId) {
    return "";
  }

  if (/^m\d+$/i.test(trimmedModuleId)) {
    return trimmedModuleId.toLowerCase();
  }

  if (/^\d+$/.test(trimmedModuleId)) {
    return `m${trimmedModuleId}`;
  }

  return trimmedModuleId.toLowerCase();
}

function getCanonicalModuleName(moduleId: string, rawModuleName: string) {
  const knownModuleName = getModuleName(moduleId);
  if (knownModuleName !== "Unknown module") {
    return knownModuleName;
  }

  return rawModuleName.trim() || "Unknown module";
}

function normalizeQuestionType(rawQuestionType: string) {
  return questionTypeMap[rawQuestionType.trim().toLowerCase().replace(/-/g, "_")] ?? null;
}

function normalizeDifficulty(rawDifficulty: string) {
  return difficultyMap[rawDifficulty.trim().toLowerCase()] ?? null;
}

function normalizeCorrectAnswer(rawCorrectAnswer: string, answerText: string, optionTexts: string[]) {
  const normalizedCorrectAnswer = rawCorrectAnswer.trim().toLowerCase();
  if (normalizedCorrectAnswer) {
    if (["a", "b", "c", "d"].includes(normalizedCorrectAnswer)) {
      return ["a", "b", "c", "d"].indexOf(normalizedCorrectAnswer);
    }
    if (["1", "2", "3", "4"].includes(normalizedCorrectAnswer)) {
      return Number(normalizedCorrectAnswer) - 1;
    }
  }

  const textMatch = (answerText || rawCorrectAnswer).trim();
  if (!textMatch) {
    return null;
  }

  const answerIndex = optionTexts.findIndex((optionText) => optionText.trim().toLowerCase() === textMatch.toLowerCase());
  return answerIndex === -1 ? null : answerIndex;
}

function parseCsv(csvText: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}