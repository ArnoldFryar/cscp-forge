import type { CSCPModule } from "@/data/types";
import ProgressBar from "@/components/ProgressBar";

type ModuleCardProps = {
  module: CSCPModule;
};

export default function ModuleCard({ module }: ModuleCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">Module {module.number}</span>
          <h2 className="mt-2 text-lg font-black tracking-tight text-slate-950 dark:text-white">{module.name}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{module.priority}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{module.description}</p>
      <div className="mt-5 grid gap-3">
        <div className="flex items-center justify-between text-sm font-bold text-slate-600 dark:text-slate-300">
          <span>Progress</span>
          <span>{module.progress}%</span>
        </div>
        <ProgressBar value={module.progress} label={`${module.name} progress`} />
        <div className="grid grid-cols-3 gap-3 pt-2 text-sm">
          <span><strong className="block text-slate-950 dark:text-white">{module.accuracy}%</strong>Accuracy</span>
          <span><strong className="block text-slate-950 dark:text-white">{module.completedQuestions}</strong>Done</span>
          <span><strong className="block text-slate-950 dark:text-white">{module.examWeight}</strong>Weight</span>
        </div>
      </div>
    </article>
  );
}