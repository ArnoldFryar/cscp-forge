import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type DashboardCardProps = {
  title: string;
  description: string;
  href: string;
  stat: string;
  icon?: LucideIcon;
};

export default function DashboardCard({ title, description, href, stat, icon: Icon }: DashboardCardProps) {
  return (
    <Link
      className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-800"
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{stat}</span>
        {Icon ? <Icon className="text-slate-400 transition group-hover:text-cyan-600" size={20} aria-hidden="true" /> : null}
      </div>
      <h2 className="mt-5 text-lg font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </Link>
  );
}