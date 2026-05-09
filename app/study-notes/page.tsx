"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpenText, Download, FileText, Layers3, Lightbulb, ListChecks, PlayCircle } from "lucide-react";
import { moduleNotes } from "@/data/moduleNotes";
import { modules } from "@/data/modules";

const generatedAtLabel = new Date().toLocaleDateString();

export default function StudyNotesPage() {
  const [selectedModuleId, setSelectedModuleId] = useState(moduleNotes[0]?.moduleId ?? "m1");

  const selectedNote = useMemo(
    () => moduleNotes.find((note) => note.moduleId === selectedModuleId) ?? moduleNotes[0],
    [selectedModuleId],
  );
  const selectedModuleMeta = modules.find((module) => module.id === selectedNote.moduleId);
  const suggestedQuizHref = `/quiz?moduleId=${selectedNote.suggestedPracticeQuiz.moduleId}&difficulty=${selectedNote.suggestedPracticeQuiz.difficulty}&length=${selectedNote.suggestedPracticeQuiz.length}&mode=${selectedNote.suggestedPracticeQuiz.mode}`;

  return (
    <div className="space-y-6">
      <section className="app-card p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="app-eyebrow">Study Notes</p>
            <h1 className="app-page-title mt-3 max-w-4xl tracking-tight">Use CSCP Forge as a study hub, not only a quiz engine.</h1>
            <p className="app-body-copy mt-4 max-w-3xl text-base">
              Review module overviews, terms, frameworks, exam traps, examples, and quick recall prompts before you start another set.
            </p>
          </div>
          <div className="app-panel p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Notes snapshot</p>
            <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{moduleNotes.length}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Modules curated as of {generatedAtLabel}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[300px_1fr]">
        <aside className="app-card p-5 xl:sticky xl:top-8 xl:self-start">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Module selector</p>
          <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="study-notes-module-select">Choose module</label>
          <select
            id="study-notes-module-select"
            className="app-input mt-2"
            value={selectedModuleId}
            onChange={(event) => setSelectedModuleId(event.target.value)}
          >
            {moduleNotes.map((note) => (
              <option key={note.moduleId} value={note.moduleId}>Module {modules.find((module) => module.id === note.moduleId)?.number}: {note.moduleName}</option>
            ))}
          </select>

          <div className="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Suggested practice quiz</p>
            <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{selectedNote.suggestedPracticeQuiz.label}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedNote.suggestedPracticeQuiz.length} questions · {selectedNote.suggestedPracticeQuiz.difficulty} · {selectedNote.suggestedPracticeQuiz.mode}</p>
          </div>

          <div className="mt-5 rounded-lg border border-slate-100 p-4 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Recommended quiz focus</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {selectedNote.recommendedQuizFocus.map((focus) => (
                <li key={focus}>{focus}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid gap-3">
            <Link
              href={suggestedQuizHref}
              className="app-btn-primary"
            >
              <PlayCircle size={16} aria-hidden="true" />
              Start Quiz From This Module
            </Link>
            <button
              className="app-btn-secondary"
              type="button"
              onClick={() => downloadModuleNotesMarkdown(selectedNote)}
            >
              <Download size={16} aria-hidden="true" />
              Export Notes to Markdown
            </button>
          </div>
        </aside>

        <article className="space-y-5">
          <section className="app-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">Module {selectedModuleMeta?.number ?? "-"}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{selectedNote.moduleName}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedModuleMeta?.domain}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Exam weight</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{selectedModuleMeta?.examWeight ?? "--"}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.6fr_0.4fr]">
            <article className="app-card p-5">
              <div className="flex items-center gap-2">
                <BookOpenText className="text-cyan-700 dark:text-cyan-300" size={18} aria-hidden="true" />
                <h3 className="app-section-title tracking-tight">Overview</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">{selectedNote.overview}</p>
              <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4 dark:border-teal-900/70 dark:bg-teal-950/40">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Why this matters</p>
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">{selectedNote.whyItMatters}</p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {selectedNote.keyConcepts.map((concept) => (
                  <div key={concept} className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">{concept}</div>
                ))}
              </div>
            </article>

            <article className="app-card p-5">
              <div className="flex items-center gap-2">
                <FileText className="text-cyan-700 dark:text-cyan-300" size={18} aria-hidden="true" />
                <h3 className="app-section-title tracking-tight">Key Terms</h3>
              </div>
              <div className="mt-4 space-y-3">
                {selectedNote.keyTerms.map((term) => (
                  <div key={term.term} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                    <p className="text-sm font-black text-slate-950 dark:text-white">{term.term}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{term.definition}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.58fr_0.42fr]">
            <article className="app-card p-5">
              <div className="flex items-center gap-2">
                <Layers3 className="text-cyan-700 dark:text-cyan-300" size={18} aria-hidden="true" />
                <h3 className="app-section-title tracking-tight">Frameworks</h3>
              </div>
              <div className="mt-4 grid gap-4">
                {selectedNote.frameworks.map((framework) => (
                  <div key={framework.title} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                    <p className="text-base font-black text-slate-950 dark:text-white">{framework.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{framework.summary}</p>
                    <ol className="mt-4 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {framework.steps.map((step, index) => (
                        <li key={step} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">{index + 1}. {step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </article>

            <article className="space-y-5">
              <section className="app-card p-5">
                <div className="flex items-center gap-2">
                  <Lightbulb className="text-amber-600 dark:text-amber-300" size={18} aria-hidden="true" />
                  <h3 className="app-section-title tracking-tight">Exam Traps</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedNote.commonExamTraps.map((trap) => (
                    <div key={trap} className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{trap}</div>
                  ))}
                </div>
              </section>

              <section className="app-card p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Manufacturing example</p>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">{selectedNote.manufacturingExample}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Planning example</p>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">{selectedNote.planningExample}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Logistics or supplier example</p>
                <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">{selectedNote.logisticsOrSupplierExample}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Explain it to a plant manager</p>
                <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">{selectedNote.plantManagerSummary}</p>
              </section>
            </article>
          </section>

          <section className="app-card p-5">
            <div className="flex items-center gap-2">
              <ListChecks className="text-cyan-700 dark:text-cyan-300" size={18} aria-hidden="true" />
              <h3 className="app-section-title tracking-tight">Recall Prompts</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {selectedNote.quickRecallPrompts.map((prompt) => (
                <div key={prompt} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{prompt}</p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </section>
    </div>
  );
}

function downloadModuleNotesMarkdown(note: (typeof moduleNotes)[number]) {
  const markdown = buildModuleNotesMarkdown(note);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cscp-forge-${note.moduleId}-study-notes.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildModuleNotesMarkdown(note: (typeof moduleNotes)[number]) {
  return [
    `# ${note.moduleName} Study Notes`,
    `Generated: ${generatedAtLabel}`,
    "",
    "## Overview",
    note.overview,
    "",
    "## Why This Module Matters",
    note.whyItMatters,
    "",
    "## Key Concepts",
    ...note.keyConcepts.map((concept) => `- ${concept}`),
    "",
    "## Key Terms",
    ...note.keyTerms.map((term) => `- **${term.term}:** ${term.definition}`),
    "",
    "## Frameworks",
    ...note.frameworks.flatMap((framework) => [
      `### ${framework.title}`,
      framework.summary,
      ...framework.steps.map((step, index) => `${index + 1}. ${step}`),
      "",
    ]),
    "## Exam Traps",
    ...note.commonExamTraps.map((trap) => `- ${trap}`),
    "",
    "## Manufacturing Example",
    note.manufacturingExample,
    "",
    "## Planning Example",
    note.planningExample,
    "",
    "## Logistics or Supplier Example",
    note.logisticsOrSupplierExample,
    "",
    "## Explain It to a Plant Manager",
    note.plantManagerSummary,
    "",
    "## Recall Prompts",
    ...note.quickRecallPrompts.map((prompt) => `- ${prompt}`),
    "",
    "## Recommended Quiz Focus",
    ...note.recommendedQuizFocus.map((focus) => `- ${focus}`),
    "",
    "## Suggested Practice Quiz",
    `- ${note.suggestedPracticeQuiz.label}`,
    `- Module: ${note.suggestedPracticeQuiz.moduleId}`,
    `- Length: ${note.suggestedPracticeQuiz.length}`,
    `- Difficulty: ${note.suggestedPracticeQuiz.difficulty}`,
    `- Mode: ${note.suggestedPracticeQuiz.mode}`,
    "",
  ].join("\n");
}