import Link from "next/link";
import { BookOpenText, PlayCircle } from "lucide-react";
import type { CSCPModule } from "@/data/types";
import ProgressBar from "@/components/ProgressBar";
import type { ModuleProgressSnapshot } from "@/lib/progressStore";

type ModuleCardProps = {
  module: CSCPModule;
  progress: ModuleProgressSnapshot;
};

export default function ModuleCard({ module, progress }: ModuleCardProps) {
  const completion = progress.totalQuestions === 0 ? 0 : Math.round((progress.questionsAnswered / progress.totalQuestions) * 100);
  const priorityClasses = module.priority === "high"
    ? "border-amber-500/40 bg-amber-500/10 text-(--forge-warning)"
    : module.priority === "medium"
      ? "border-teal-400/40 bg-teal-400/10 text-(--forge-accent)"
      : "border-(--forge-border-soft) bg-(--forge-surface-elevated) text-(--forge-text-secondary)";

  return (
    <article className="app-card app-card-hover flex min-h-full flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="app-eyebrow">Module {module.number}</span>
          <h2 className="app-card-title mt-2 text-xl tracking-tight">{module.name}</h2>
          <p className="app-muted mt-1 text-xs font-bold uppercase tracking-[0.16em]">{module.domain}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${priorityClasses}`}>{module.priority}</span>
      </div>
      <p className="app-body-copy mt-3 text-sm">{module.description}</p>

      <div className="mt-5 grid gap-4">
        <div>
          <div className="flex items-center justify-between text-sm font-bold text-(--forge-text-secondary)">
            <span>Progress</span>
            <span>{completion}%</span>
          </div>
          <div className="mt-2"><ProgressBar value={completion} label={`${module.name} progress`} /></div>
          <p className="app-muted mt-2 text-xs font-bold uppercase tracking-[0.16em]">{progress.questionsAnswered} of {progress.totalQuestions} questions attempted</p>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm font-bold text-(--forge-text-secondary)">
            <span>Accuracy</span>
            <span>{progress.accuracy}%</span>
          </div>
          <div className="mt-2"><ProgressBar value={progress.accuracy} label={`${module.name} accuracy`} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="app-panel p-3 text-(--forge-text-secondary)"><strong className="block text-(--forge-text-primary)">{progress.confidenceLevel}</strong>Confidence</div>
          <div className="app-panel p-3 text-(--forge-text-secondary)"><strong className="block text-(--forge-text-primary)">{module.examWeight}</strong>Exam weight</div>
        </div>

        <div className="app-panel p-3">
          <p className="app-muted text-xs font-black uppercase tracking-[0.16em]">Weak topic</p>
          <p className="mt-2 text-sm font-bold text-(--forge-text-primary)">{progress.weakestTopic}</p>
        </div>

        <div className="rounded-lg border border-[rgb(45_212_191/0.38)] bg-[rgb(45_212_191/0.1)] p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-(--forge-accent)">Recommended action</p>
          <p className="mt-2 text-sm leading-6 text-(--forge-text-secondary)">{progress.suggestedNextAction}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 pt-2">
        <Link
          href="/quiz"
          className="app-btn-primary"
        >
          <PlayCircle size={16} aria-hidden="true" />
          Start quiz
        </Link>
        <Link
          href="/missed"
          className="app-btn-secondary"
        >
          <BookOpenText size={16} aria-hidden="true" />
          Review notes
        </Link>
      </div>
    </article>
  );
}