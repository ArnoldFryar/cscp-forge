"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, Brain, ClipboardList, Download, FileText, NotebookText, PenLine, RotateCcw } from "lucide-react";
import ProgressBar from "@/components/ProgressBar";
import { missedQuestions, quizResults, topicPerformance, userProgress } from "@/data/mockProgress";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import type { MissedQuestion, Question } from "@/data/types";
import { generateActiveRecallPrompts, loadActiveRecallProgress } from "@/lib/activeRecallStore";
import { filterMissedQuestionsForQuestionPool, loadMissedQuestions } from "@/lib/missedQuestionStore";
import { buildInitialProgressSnapshot, loadProgress, type ProgressSnapshot, type TopicProgressSnapshot } from "@/lib/progressStore";
import { generateWeeklyStudyPlan, getDefaultStudyPlanSettings, loadStudyPlanSettings, type GeneratedStudyPlan, type StudyPlanSettings } from "@/lib/studyPlanGenerator";

type EnrichedMissedQuestion = {
  missedQuestion: MissedQuestion;
  question: Question;
  selectedChoiceText: string;
  correctChoiceText: string;
};

const initialProgress = buildInitialProgressSnapshot({
  modules,
  questions,
  userProgress,
  quizResults,
  topicPerformance,
  missedQuestions,
});
const initialMissedQueue = filterMissedQuestionsForQuestionPool(missedQuestions, questions);

const generatedAtLabel = new Date().toLocaleDateString();

export default function ExportPage() {
  const [progress, setProgress] = useState<ProgressSnapshot>(() => initialProgress);
  const [missedQueue, setMissedQueue] = useState<MissedQuestion[]>(() => initialMissedQueue);
  const [studyPlanSettings, setStudyPlanSettings] = useState<StudyPlanSettings | null>(null);
  const [activeRecallProgress, setActiveRecallProgress] = useState(() => loadActiveRecallProgress());

  useEffect(() => {
    const nextProgress = loadProgress(initialProgress);
    setProgress(nextProgress);
    setMissedQueue(filterMissedQuestionsForQuestionPool(loadMissedQuestions(missedQuestions), questions));
    setStudyPlanSettings(loadStudyPlanSettings(getDefaultStudyPlanSettings(nextProgress)));
    setActiveRecallProgress(loadActiveRecallProgress());
  }, []);

  const activeRecallPrompts = useMemo(() => generateActiveRecallPrompts(questions), []);
  const questionLookup = useMemo(() => new Map(questions.map((question) => [question.id, question])), []);
  const studyPlan = useMemo(() => {
    if (!studyPlanSettings) {
      return null;
    }

    return generateWeeklyStudyPlan({
      progress,
      missedQuestions: missedQueue,
      questions,
      settings: studyPlanSettings,
    });
  }, [missedQueue, progress, studyPlanSettings]);

  const enrichedMissedQuestions = useMemo(() => {
    return missedQueue
      .map((missedQuestion) => {
        const question = questionLookup.get(missedQuestion.questionId);
        if (!question) {
          return null;
        }

        return {
          missedQuestion,
          question,
          selectedChoiceText: question.choices.find((choice) => choice.id === missedQuestion.userSelectedChoiceId)?.text ?? "Selected answer unavailable",
          correctChoiceText: question.choices.find((choice) => choice.id === question.correctChoiceId)?.text ?? "Correct answer unavailable",
        } satisfies EnrichedMissedQuestion;
      })
      .filter((item): item is EnrichedMissedQuestion => item !== null);
  }, [missedQueue, questionLookup]);

  const weakTopics = useMemo(() => getWeakTopics(progress.topicStats), [progress.topicStats]);
  const exportCards = [
    {
      title: "Missed Questions Review PDF",
      detail: `${enrichedMissedQuestions.length} missed question${enrichedMissedQuestions.length === 1 ? "" : "s"} in a print-ready HTML packet.`,
      icon: RotateCcw,
      actionLabel: "Download HTML",
      onClick: () => downloadMissedQuestionsHtml(enrichedMissedQuestions),
    },
    {
      title: "Weak Topics Summary",
      detail: `${weakTopics.length} low-confidence topic${weakTopics.length === 1 ? "" : "s"} ranked by accuracy and volume.`,
      icon: BarChart3,
      actionLabel: "Download Markdown",
      onClick: () => downloadWeakTopicsMarkdown(weakTopics, progress),
    },
    {
      title: "Study Plan PDF",
      detail: studyPlan ? `${studyPlan.dailyPlans.length} day plan with focus modules and recovery tasks.` : "Generate a plan from current settings.",
      icon: ClipboardList,
      actionLabel: "Download HTML",
      onClick: () => downloadStudyPlanHtml(studyPlan),
    },
    {
      title: "Module Progress Summary",
      detail: `${progress.moduleStats.length} modules with coverage, accuracy, weak topic, and next action.`,
      icon: BookOpen,
      actionLabel: "Download Markdown",
      onClick: () => downloadModuleProgressMarkdown(progress),
    },
    {
      title: "Active Recall Prompts",
      detail: `${activeRecallPrompts.length} Kindle Scribe-friendly prompts with blank answer space and confidence rating.`,
      icon: PenLine,
      actionLabel: "Download Markdown",
      onClick: () => downloadActiveRecallMarkdown(activeRecallPrompts, activeRecallProgress),
    },
    {
      title: "NotebookLM Study Source Markdown",
      detail: `${questions.length} source questions structured for NotebookLM import and citation-friendly review.`,
      icon: NotebookText,
      actionLabel: "Download Markdown",
      onClick: () => downloadNotebookLmMarkdown(questions),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="app-card p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="app-eyebrow">Exports</p>
            <h1 className="app-page-title mt-3 max-w-4xl tracking-tight">Take your study system outside the app.</h1>
            <p className="app-body-copy mt-4 max-w-3xl text-base">
              Generate structured packets for NotebookLM, Kindle Scribe, PDF notes, or a plain Markdown study archive.
            </p>
          </div>
          <div className="app-panel p-4">
            <p className="app-muted text-xs font-black uppercase tracking-[0.18em]">Export snapshot</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{progress.readinessScore}%</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Readiness score as of {generatedAtLabel}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <button
          className="app-card app-card-hover p-5 text-left"
          type="button"
          onClick={() => downloadMissedQuestionsHtml(enrichedMissedQuestions)}
        >
          <Download className="text-teal-700 dark:text-teal-300" size={22} aria-hidden="true" />
          <span className="mt-4 block text-lg font-black text-slate-950 dark:text-white">Export All Missed Questions</span>
          <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-300">HTML review packet with answers, explanations, traps, and study tips.</span>
        </button>
        <button
          className="app-card app-card-hover p-5 text-left"
          type="button"
          onClick={() => downloadWeakTopicsMarkdown(weakTopics, progress)}
        >
          <Download className="text-teal-700 dark:text-teal-300" size={22} aria-hidden="true" />
          <span className="mt-4 block text-lg font-black text-slate-950 dark:text-white">Export Weak Topics</span>
          <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-300">Markdown summary ranked by accuracy, attempts, trend, and next action.</span>
        </button>
        <button
          className="app-card app-card-hover p-5 text-left"
          type="button"
          onClick={() => downloadStudyPlanHtml(studyPlan)}
        >
          <Download className="text-teal-700 dark:text-teal-300" size={22} aria-hidden="true" />
          <span className="mt-4 block text-lg font-black text-slate-950 dark:text-white">Export Study Plan</span>
          <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-300">Print-ready weekly plan with daily focus, tasks, and expected outcomes.</span>
        </button>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.68fr_0.32fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {exportCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="app-card app-card-hover p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{card.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.detail}</p>
                  </div>
                  <Icon className="shrink-0 text-teal-700 dark:text-teal-300" size={22} aria-hidden="true" />
                </div>
                <button
                  className="app-btn-primary mt-5"
                  type="button"
                  onClick={card.onClick}
                >
                  <Download size={16} aria-hidden="true" />
                  {card.actionLabel}
                </button>
              </article>
            );
          })}
        </div>

        <aside className="space-y-5">
          <article className="app-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-950 dark:text-white">Export coverage</p>
              <FileText className="text-teal-700 dark:text-teal-300" size={20} aria-hidden="true" />
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300">
                  <span>Question bank</span>
                  <span>{questions.length}</span>
                </div>
                <div className="mt-2"><ProgressBar value={100} label="Question bank export coverage" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300">
                  <span>Missed queue</span>
                  <span>{enrichedMissedQuestions.length}</span>
                </div>
                <div className="mt-2"><ProgressBar value={enrichedMissedQuestions.length > 0 ? 100 : 0} label="Missed export coverage" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300">
                  <span>Active recall</span>
                  <span>{activeRecallPrompts.length}</span>
                </div>
                <div className="mt-2"><ProgressBar value={100} label="Active recall export coverage" /></div>
              </div>
            </div>
          </article>

          <article className="app-card p-5">
            <div className="flex items-center gap-2">
              <Brain className="text-teal-700 dark:text-teal-300" size={20} aria-hidden="true" />
              <h2 className="text-sm font-black text-slate-950 dark:text-white">Kindle Scribe format</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Active recall exports include a prompt, blank answer space, reflection prompt, and a five-point confidence rating area.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}

function downloadMissedQuestionsHtml(missedItems: EnrichedMissedQuestion[]) {
  downloadTextFile("cscp-forge-missed-questions-review.html", buildMissedQuestionsHtml(missedItems), "text/html;charset=utf-8");
}

function downloadWeakTopicsMarkdown(weakTopics: TopicProgressSnapshot[], progress: ProgressSnapshot) {
  downloadTextFile("cscp-forge-weak-topics-summary.md", buildWeakTopicsMarkdown(weakTopics, progress), "text/markdown;charset=utf-8");
}

function downloadStudyPlanHtml(studyPlan: GeneratedStudyPlan | null) {
  downloadTextFile("cscp-forge-study-plan.html", buildStudyPlanHtml(studyPlan), "text/html;charset=utf-8");
}

function downloadModuleProgressMarkdown(progress: ProgressSnapshot) {
  downloadTextFile("cscp-forge-module-progress-summary.md", buildModuleProgressMarkdown(progress), "text/markdown;charset=utf-8");
}

function downloadActiveRecallMarkdown(prompts: ReturnType<typeof generateActiveRecallPrompts>, progressStore: ReturnType<typeof loadActiveRecallProgress>) {
  downloadTextFile("cscp-forge-kindle-scribe-active-recall.md", buildActiveRecallMarkdown(prompts, progressStore), "text/markdown;charset=utf-8");
}

function downloadNotebookLmMarkdown(questionPool: Question[]) {
  downloadTextFile("cscp-forge-notebooklm-study-source.md", buildNotebookLmMarkdown(questionPool), "text/markdown;charset=utf-8");
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildMissedQuestionsHtml(missedItems: EnrichedMissedQuestion[]) {
  const body = missedItems.length === 0
    ? "<section><h2>No missed questions</h2><p>Your recovery queue is currently clear.</p></section>"
    : missedItems.map((item, index) => `
      <section class="card">
        <p class="eyebrow">Missed Question ${index + 1} · ${escapeHtml(item.question.moduleName)} · ${escapeHtml(item.question.topic)}</p>
        <h2>${escapeHtml(item.question.questionText)}</h2>
        <p><strong>Your answer:</strong> ${escapeHtml(item.selectedChoiceText)}</p>
        <p><strong>Correct answer:</strong> ${escapeHtml(item.correctChoiceText)}</p>
        <p><strong>Explanation:</strong> ${escapeHtml(item.question.explanation)}</p>
        <p><strong>Exam trap:</strong> ${escapeHtml(item.question.examTrap)}</p>
        <p><strong>Study tip:</strong> ${escapeHtml(item.question.studyTip)}</p>
        <p><strong>Status:</strong> ${escapeHtml(item.missedQuestion.status)} · <strong>Missed count:</strong> ${item.missedQuestion.missedCount}</p>
      </section>
    `).join("\n");

  return buildPrintHtml("CSCP Forge - Missed Questions Review", body);
}

function buildStudyPlanHtml(studyPlan: GeneratedStudyPlan | null) {
  const body = !studyPlan
    ? "<section><h2>No study plan created</h2><p>Open CSCP Forge and create a study plan before exporting.</p></section>"
    : `
      <section class="summary">
        <p><strong>Days until exam:</strong> ${studyPlan.daysUntilExam}</p>
        <p><strong>Weekly minutes:</strong> ${studyPlan.weeklyAvailableMinutes}</p>
        <p><strong>Focus modules:</strong> ${escapeHtml(studyPlan.focusModules.join(", "))}</p>
        <p><strong>Weakest topics:</strong> ${escapeHtml(studyPlan.weakestTopics.join(", "))}</p>
      </section>
      ${studyPlan.dailyPlans.map((day) => `
        <section class="card">
          <p class="eyebrow">${escapeHtml(day.dayLabel)} · ${escapeHtml(day.dateLabel)} · ${escapeHtml(day.timeEstimate)}</p>
          <h2>${escapeHtml(day.focus)}</h2>
          <p><strong>Primary module:</strong> ${escapeHtml(day.primaryModuleName)}</p>
          <ul>${day.tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ul>
          <p><strong>Expected outcome:</strong> ${escapeHtml(day.expectedOutcome)}</p>
        </section>
      `).join("\n")}
    `;

  return buildPrintHtml("CSCP Forge - Study Plan", body);
}

function buildWeakTopicsMarkdown(weakTopics: TopicProgressSnapshot[], progress: ProgressSnapshot) {
  const topicSections = weakTopics.length === 0
    ? "No weak topics are available yet. Complete a quiz to build a topic profile."
    : weakTopics.map((topic, index) => [
      `## ${index + 1}. ${topic.topic}`,
      `- Module: ${getModuleNameById(topic.moduleId)}`,
      `- Accuracy: ${topic.accuracy}%`,
      `- Attempts: ${topic.attempted}`,
      `- Correct: ${topic.correct}`,
      `- Trend: ${topic.trend}`,
      `- Recommended action: Review the core concept, write the exam trap in one sentence, then run a focused quiz block on this topic.`,
    ].join("\n")).join("\n\n");

  return [
    "# CSCP Forge Weak Topics Summary",
    `Generated: ${generatedAtLabel}`,
    "",
    `Readiness score: ${progress.readinessScore}%`,
    `Average accuracy: ${progress.averageAccuracy}%`,
    `Questions answered: ${progress.questionsAnswered}`,
    "",
    topicSections,
    "",
  ].join("\n");
}

function buildModuleProgressMarkdown(progress: ProgressSnapshot) {
  return [
    "# CSCP Forge Module Progress Summary",
    `Generated: ${generatedAtLabel}`,
    "",
    `Readiness score: ${progress.readinessScore}%`,
    `Study streak: ${progress.studyStreak} days`,
    "",
    ...progress.moduleStats.map((module) => [
      `## Module ${module.moduleNumber}: ${module.moduleName}`,
      `- Questions answered: ${module.questionsAnswered} of ${module.totalQuestions}`,
      `- Accuracy: ${module.accuracy}%`,
      `- Confidence: ${module.confidenceLevel}`,
      `- Weak topic: ${module.weakestTopic}`,
      `- Recommended action: ${module.suggestedNextAction}`,
    ].join("\n")),
    "",
  ].join("\n\n");
}

function buildActiveRecallMarkdown(prompts: ReturnType<typeof generateActiveRecallPrompts>, progressStore: ReturnType<typeof loadActiveRecallProgress>) {
  return [
    "# CSCP Forge Active Recall Prompts for Kindle Scribe",
    `Generated: ${generatedAtLabel}`,
    "",
    ...prompts.map((prompt, index) => {
      const progress = progressStore[prompt.id];
      return [
        `## ${index + 1}. ${prompt.topic}`,
        `- Module: ${prompt.moduleName}`,
        `- Prompt type: ${prompt.promptTypeLabel}`,
        `- Current confidence: ${progress?.confidence ?? "Not rated"}`,
        "",
        `Question: ${prompt.prompt}`,
        "",
        "Blank answer space:",
        "",
        "________________________________________________________________________________",
        "",
        "________________________________________________________________________________",
        "",
        "________________________________________________________________________________",
        "",
        "Reflection prompt: What made this answer difficult, and what exam trap would you watch for next time?",
        "",
        "Confidence rating area: [ ] 1  [ ] 2  [ ] 3  [ ] 4  [ ] 5",
        "",
        `<details><summary>Model answer</summary>\n\n${prompt.modelAnswer}\n\n</details>`,
      ].join("\n");
    }),
    "",
  ].join("\n\n");
}

function buildNotebookLmMarkdown(questionPool: Question[]) {
  return [
    "# CSCP Forge NotebookLM Study Source",
    `Generated: ${generatedAtLabel}`,
    "",
    "This source contains original CSCP-style study questions and explanations structured for NotebookLM.",
    "",
    ...questionPool.map((question, index) => {
      const correctAnswer = question.choices.find((choice) => choice.id === question.correctChoiceId)?.text ?? "Correct answer unavailable";
      return [
        `## Question ${index + 1}`,
        `Module: ${question.moduleName}`,
        `Topic: ${question.topic}`,
        `Question: ${question.questionText}`,
        `Correct answer: ${correctAnswer}`,
        `Explanation: ${question.explanation}`,
        `Exam trap: ${question.examTrap}`,
        `Study tip: ${question.studyTip}`,
      ].join("\n");
    }),
    "",
  ].join("\n\n");
}

function buildPrintHtml(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { color: #0f172a; font-family: Arial, sans-serif; line-height: 1.55; margin: 40px; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 18px; margin: 8px 0 12px; }
    .meta, .eyebrow { color: #475569; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .summary, .card { border: 1px solid #cbd5e1; border-radius: 8px; margin: 18px 0; padding: 18px; page-break-inside: avoid; }
    ul { padding-left: 20px; }
    @media print { body { margin: 24px; } .card { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated by CSCP Forge on ${escapeHtml(generatedAtLabel)}</p>
  ${body}
</body>
</html>`;
}

function getWeakTopics(topicStats: TopicProgressSnapshot[]) {
  return [...topicStats]
    .filter((topic) => topic.attempted > 0)
    .sort((left, right) => {
      if (left.accuracy !== right.accuracy) {
        return left.accuracy - right.accuracy;
      }
      return right.attempted - left.attempted;
    })
    .slice(0, 12);
}

function getModuleNameById(moduleId: string) {
  return modules.find((module) => module.id === moduleId)?.name ?? moduleId;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}