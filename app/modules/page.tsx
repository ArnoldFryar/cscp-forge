import ModuleCard from "@/components/ModuleCard";
import { modules } from "@/data/modules";

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Modules</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">8-module CSCP roadmap</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Each card shows progress, accuracy, exam emphasis, and priority so study time stays tied to readiness.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </section>
    </div>
  );
}