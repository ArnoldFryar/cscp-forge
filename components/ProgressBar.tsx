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
      className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      role="progressbar"
    >
      <span className="block h-full rounded-full bg-cyan-500" style={{ width: `${normalizedValue}%` }} />
    </div>
  );
}