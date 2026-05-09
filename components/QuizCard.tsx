import type { Question } from "@/data/types";

type QuizCardProps = {
  question: Question;
  moduleTitle?: string;
};

export default function QuizCard({ question, moduleTitle }: QuizCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center gap-2">
        {moduleTitle ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{moduleTitle}</span> : null}
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{question.difficulty}</span>
      </div>
      <h2 className="mt-4 text-base font-black leading-6 text-slate-950 dark:text-white">{question.questionText}</h2>
      <ol className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {question.choices.map((choice) => (
          <li key={choice.id} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">{choice.text}</li>
        ))}
      </ol>
    </article>
  );
}