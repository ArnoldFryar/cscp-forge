import { modules } from "@/data/modules";
import { missedQuestions } from "@/data/mockProgress";
import { questions } from "@/data/questions";
import { getModuleById, getQuestionById } from "@/lib/scoring";

export default function MissedPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Missed Questions</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Targeted review queue</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Mock missed-question records keep explanations, selected answers, and review status visible.
        </p>
      </section>

      <section className="grid gap-4">
        {missedQuestions.map((missedQuestion) => {
          const question = getQuestionById(questions, missedQuestion.questionId);
          const module = getModuleById(modules, question.moduleId);

          return (
          <article key={missedQuestion.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{module.name}</span>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black capitalize text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{question.difficulty}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black capitalize text-amber-700 dark:bg-amber-950/50 dark:text-amber-100">{missedQuestion.status}</span>
            </div>
            <h2 className="mt-4 text-lg font-black leading-7 text-slate-950 dark:text-white">{question.questionText}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                Selected: {question.choices.find((choice) => choice.id === missedQuestion.selectedChoiceId)?.text}
              </p>
              <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                Correct: {question.choices.find((choice) => choice.id === question.correctChoiceId)?.text}
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{question.explanation}</p>
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Trap: {question.examTrap}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Reviewed {missedQuestion.reviewCount} time(s)</p>
          </article>
        );
        })}
      </section>
    </div>
  );
}