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
      className="app-card app-card-hover group p-5"
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="app-pill border-[rgb(45_212_191/0.35)] bg-[rgb(45_212_191/0.1)] text-(--forge-accent)">{stat}</span>
        {Icon ? <Icon className="text-(--forge-text-muted) transition group-hover:text-(--forge-accent)" size={20} aria-hidden="true" /> : null}
      </div>
      <h2 className="app-card-title mt-5 text-lg tracking-tight">{title}</h2>
      <p className="app-body-copy mt-2 text-sm">{description}</p>
    </Link>
  );
}