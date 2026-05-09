import QuizInterface from "@/components/QuizInterface";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";

export default function QuizPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Practice Quiz</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Module-based practice</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Choose a module and difficulty, answer one question at a time, then review the explanation before moving on.
        </p>
      </section>
      <QuizInterface modules={modules} questions={questions} />
    </div>
  );
}