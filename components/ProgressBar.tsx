type ProgressBarProps = {
  value: number;
  label?: string;
};

export default function ProgressBar({ value, label = "Progress" }: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      aria-label={`${label} ${normalizedValue}%`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={normalizedValue}
      className="h-2.5 overflow-hidden rounded-full border border-[rgb(36_48_68/0.9)] bg-(--forge-surface-primary)"
      role="progressbar"
    >
      <span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--forge-accent-deep),var(--forge-accent))] transition-all" style={{ width: `${normalizedValue}%` }} />
    </div>
  );
}